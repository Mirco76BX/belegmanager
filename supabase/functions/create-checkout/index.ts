import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { priceId, couponCode } = await req.json();
    if (!priceId) throw new Error("priceId is required");

    const ALLOWED_PRICE_IDS = new Set([
      "price_1T8dZK2OSLlEeYaUvGn20UPk", // relax yearly
      "price_1T8dd52OSLlEeYaUnkzNTDZd", // relax monthly
      "price_1T8dgW2OSLlEeYaUifi4Z36n", // master yearly
      "price_1T8l4i2OSLlEeYaU3OzHyBBP", // master monthly
    ]);
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Resolve coupon if provided
    const discounts: { coupon: string }[] = [];
    if (couponCode) {
      // List coupons and find by name match
      const coupons = await stripe.coupons.list({ limit: 100 });
      const match = coupons.data.find(
        (c) => c.name?.toLowerCase() === couponCode.toLowerCase() && c.valid
      );
      if (!match) throw new Error("Ungültiger Gutscheincode / Invalid coupon code");
      discounts.push({ coupon: match.id });
    }

    // Whitelist origin to prevent phishing via attacker-controlled Origin header
    const ALLOWED_ORIGINS = [
      "https://belegmanager.online",
      "https://www.belegmanager.online",
      "https://belegmanager.lovable.app",
      "https://id-preview--5196d375-f0b6-42d1-b73c-097cbd42414c.lovable.app",
      "http://localhost:8080",
      "http://localhost:3000",
    ];
    const requestOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : "https://belegmanager.online";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      ...(discounts.length > 0 ? { discounts } : {}),
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
