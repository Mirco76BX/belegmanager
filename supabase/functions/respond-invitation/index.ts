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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    const { invitationId, action } = await req.json();

    if (!invitationId || !["accept", "decline"].includes(action)) {
      throw new Error("invitationId and action (accept/decline) required");
    }

    // Fetch invitation - check it belongs to this user
    const { data: invitation, error: invErr } = await supabaseClient
      .from("advisor_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (invErr || !invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") throw new Error("Invitation already responded to");

    // Verify this user is the intended client
    if (invitation.client_id && invitation.client_id !== userId) {
      throw new Error("This invitation is not for you");
    }
    if (!invitation.client_id && invitation.client_email !== userEmail) {
      throw new Error("This invitation is not for you");
    }

    if (action === "accept") {
      // Create advisor_clients link
      const { error: linkErr } = await supabaseClient
        .from("advisor_clients")
        .insert({ advisor_id: invitation.advisor_id, client_id: userId });

      if (linkErr && linkErr.code !== "23505") throw linkErr; // ignore duplicate

      // Update invitation status
      await supabaseClient
        .from("advisor_invitations")
        .update({ status: "accepted", client_id: userId, responded_at: new Date().toISOString() })
        .eq("id", invitationId);

      return new Response(JSON.stringify({ success: true, action: "accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Decline
      await supabaseClient
        .from("advisor_invitations")
        .update({ status: "declined", client_id: userId, responded_at: new Date().toISOString() })
        .eq("id", invitationId);

      return new Response(JSON.stringify({ success: true, action: "declined" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    // Security: Generic error code an Client, raw message nur server-seitig loggen
    console.error("respond-invitation error:", error);
    return new Response(
      JSON.stringify({ error_code: "ERR_INTERNAL" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
