import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for active coupon redemption FIRST — independent of Stripe.
    // Defense in depth: join coupons and verify tier matches; reject mismatches.
    const { data: redemptions } = await supabaseClient
      .from("coupon_redemptions")
      .select("id, tier, expires_at, coupon_id, coupons:coupon_id(id, tier, is_active)")
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false });

    const validRedemption = (redemptions ?? []).find((r: any) => {
      const c = r.coupons;
      if (!c) {
        console.warn(`[CHECK-SUBSCRIPTION] Orphan redemption ${r.id} (coupon ${r.coupon_id} missing) — ignored`);
        return false;
      }
      if (c.tier !== r.tier) {
        console.warn(`[CHECK-SUBSCRIPTION] Tier mismatch on redemption ${r.id}: redemption.tier=${r.tier} coupon.tier=${c.tier} — ignored`);
        return false;
      }
      return true;
    });

    if (validRedemption) {
      logStep("Active coupon redemption found", { tier: validRedemption.tier, expires_at: validRedemption.expires_at });

      const tierProductMap: Record<string, string> = {
        relax: "coupon_relax",
        master: "coupon_master",
      };

      return new Response(JSON.stringify({
        subscribed: true,
        product_id: tierProductMap[validRedemption.tier] || "coupon_relax",
        subscription_end: validRedemption.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }


    // Stripe check only needed if no active coupon
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY not set — returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      logStep("Active subscription found", { productId, subscriptionEnd });
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    const isAuthError = errorMessage.toLowerCase().includes("auth") || errorMessage.includes("authorization");
    return new Response(JSON.stringify({ error: isAuthError ? "unauthorized" : "internal_error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isAuthError ? 401 : 500,
    });
  }
});
