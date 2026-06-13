import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const jsonResp = (body: unknown, status: number) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) return jsonResp({ error: "unauthorized" }, 401);

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    const { invitationId, action } = await req.json();

    if (!invitationId || !["accept", "decline"].includes(action)) {
      return jsonResp({ error: "invalid_request" }, 400);
    }

    const { data: invitation, error: invErr } = await supabaseClient
      .from("advisor_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (invErr || !invitation) return jsonResp({ error: "not_found" }, 404);
    if (invitation.status !== "pending") return jsonResp({ error: "already_responded" }, 409);

    if (invitation.client_id && invitation.client_id !== userId) {
      return jsonResp({ error: "forbidden" }, 403);
    }
    if (!invitation.client_id && invitation.client_email !== userEmail) {
      return jsonResp({ error: "forbidden" }, 403);
    }

    if (action === "accept") {
      const { error: linkErr } = await supabaseClient
        .from("advisor_clients")
        .insert({ advisor_id: invitation.advisor_id, client_id: userId });

      if (linkErr && linkErr.code !== "23505") {
        console.error("respond-invitation link error:", linkErr);
        return jsonResp({ error: "internal_error" }, 500);
      }

      await supabaseClient
        .from("advisor_invitations")
        .update({ status: "accepted", client_id: userId, responded_at: new Date().toISOString() })
        .eq("id", invitationId);

      return jsonResp({ success: true, action: "accepted" }, 200);
    } else {
      await supabaseClient
        .from("advisor_invitations")
        .update({ status: "declined", client_id: userId, responded_at: new Date().toISOString() })
        .eq("id", invitationId);

      return jsonResp({ success: true, action: "declined" }, 200);
    }
  } catch (error) {
    console.error("respond-invitation error:", error);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
