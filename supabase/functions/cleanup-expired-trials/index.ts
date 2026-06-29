import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResp = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Sicherheits-Limit: pro Run nicht mehr als 100 User löschen,
// damit ein vergessener Cron nicht plötzlich 10k User auf einmal killt.
const MAX_DELETIONS_PER_RUN = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp(405, { error: "method_not_allowed" });

  const cronSecret = Deno.env.get("CLEANUP_CRON_SECRET");
  if (!cronSecret) {
    console.error("[cleanup] CLEANUP_CRON_SECRET not configured");
    return jsonResp(500, { error: "not_configured" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const providedSecret = authHeader.replace("Bearer ", "");
  if (providedSecret !== cronSecret) {
    console.error("[cleanup] Invalid cron secret");
    return jsonResp(401, { error: "unauthorized" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const nowIso = new Date().toISOString();

    const { data: candidates, error: candErr } = await supabase
      .from("profiles")
      .select("id, trial_blocked_at, scheduled_deletion_at")
      .lt("scheduled_deletion_at", nowIso)
      .not("trial_blocked_at", "is", null)
      .limit(MAX_DELETIONS_PER_RUN);

    if (candErr) {
      console.error("[cleanup] failed to load candidates", candErr);
      return jsonResp(500, { error: "internal_error" });
    }

    if (!candidates || candidates.length === 0) {
      console.log("[cleanup] no candidates");
      return jsonResp(200, { deleted_count: 0, candidates: 0 });
    }

    console.log(`[cleanup] processing ${candidates.length} candidates`);

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const candidate of candidates) {
      try {
        const { error: delErr } = await supabase.auth.admin.deleteUser(
          candidate.id,
          true
        );

        if (delErr) {
          console.error(`[cleanup] failed to delete user ${candidate.id}`, delErr);
          failed.push({ id: candidate.id, error: delErr.message });
        } else {
          deleted.push(candidate.id);
          console.log(`[cleanup] deleted user ${candidate.id}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[cleanup] exception deleting ${candidate.id}`, msg);
        failed.push({ id: candidate.id, error: msg });
      }
    }

    return jsonResp(200, {
      deleted_count: deleted.length,
      failed_count: failed.length,
      candidates: candidates.length,
      deleted_ids: deleted,
      failures: failed,
    });
  } catch (error) {
    console.error("[cleanup] uncaught", error);
    return jsonResp(500, { error: "internal_error" });
  }
});
