// Admin-only: hard-delete an auth.users row (CASCADE removes profile, receipts, etc.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "missing_token" });

  // 1) Identify caller from their JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "invalid_token" });
  const callerId = userData.user.id;

  // 2) Admin gate via has_role
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: callerId,
    _role: "admin",
  });
  if (roleErr) return json(500, { error: "role_check_failed", detail: roleErr.message });
  if (!isAdmin) return json(403, { error: "forbidden" });

  // 3) Parse target
  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const targetId = body.user_id;
  if (!targetId || typeof targetId !== "string") {
    return json(400, { error: "missing_user_id" });
  }
  if (targetId === callerId) {
    return json(400, { error: "cannot_delete_self" });
  }

  // 4) Hard-delete auth user — CASCADE removes profile + receipts + companies + ...
  const { error: delErr } = await admin.auth.admin.deleteUser(targetId, false);
  if (delErr) return json(500, { error: "delete_failed", detail: delErr.message });

  console.log(`[admin-delete-user] caller=${callerId} deleted=${targetId}`);
  return json(200, { ok: true, deleted_user_id: targetId });
});
