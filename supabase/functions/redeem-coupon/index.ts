import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const user = userData.user;

    const { code } = await req.json();
    if (!code || typeof code !== "string") throw new Error("No coupon code provided");

    const normalizedCode = code.trim().toUpperCase();

    // Find coupon
    const { data: coupon, error: couponErr } = await supabase
      .from("coupons")
      .select("*")
      .ilike("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (couponErr || !coupon) {
      return new Response(JSON.stringify({ error: "Ungültiger Gutscheincode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return new Response(JSON.stringify({ error: "Gutscheincode bereits ausgeschöpft" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already redeemed this coupon
    const { data: existing } = await supabase
      .from("coupon_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("coupon_id", coupon.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Gutschein bereits eingelöst" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + coupon.duration_days);

    // Create redemption
    const { error: insertErr } = await supabase.from("coupon_redemptions").insert({
      user_id: user.id,
      coupon_id: coupon.id,
      tier: coupon.tier,
      expires_at: expiresAt.toISOString(),
    });

    if (insertErr) throw new Error(insertErr.message);

    // Increment used_count
    await supabase
      .from("coupons")
      .update({ used_count: coupon.used_count + 1 })
      .eq("id", coupon.id);

    return new Response(JSON.stringify({
      success: true,
      tier: coupon.tier,
      expires_at: expiresAt.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Security: Generic error code an Client, raw message nur server-seitig loggen
    console.error("redeem-coupon: internal error", error);
    return new Response(JSON.stringify({ error_code: "ERR_INTERNAL" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
