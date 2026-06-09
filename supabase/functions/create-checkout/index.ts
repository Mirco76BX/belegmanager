import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Whitelist erlaubter Stripe Price-IDs.
 *
 * Sicherheits-Maßnahme gegen Subscription-Bypass: ohne Whitelist könnte ein
 * Angreifer beliebige Price-IDs aus unserem Stripe-Account unterschieben
 * (z. B. alte Test-Prices mit 0,01 EUR). Diese Liste muss im Gleichlauf zu
 * src/contexts/AuthContext.tsx TIERS gepflegt werden.
 *
 * Wenn eine neue Stripe-Price angelegt wird (z. B. Discount-Tier, Trial-Price),
 * MUSS sie hier ergänzt werden — sonst verweigert der Checkout sie.
 */
const ALLOWED_PRICE_IDS = new Set<string>([
  // BASIC (1,99 EUR/Mo, 15 EUR/Jahr)
  "price_1TeAum2OSLlEeYaU0fwftxL5", // monthly
  "price_1TeAum2OSLlEeYaUNjPgClz9", // yearly
  // PRO (9,99 EUR/Mo, 79 EUR/Jahr)
  "price_1TeAvC2OSLlEeYaU3M2hR3H6", // monthly
  "price_1TeAve2OSLlEeYaUUoM91rwc", // yearly
  // BUSINESS (19,99 EUR/Mo, 159 EUR/Jahr)
  "price_1TeAwT2OSLlEeYaUQGKFGKV3", // monthly
  "price_1TeAwm2OSLlEeYaUQUxexiO6", // yearly
  // BUSINESS Additional User (4,99 EUR/Mo, 39 EUR/Jahr)
  "price_1TeAx62OSLlEeYaU067gNLCC", // monthly
  "price_1TeAxN2OSLlEeYaUWIncLoLo", // yearly
  // CFO (39 EUR/Mo)
  "price_1TeAxn2OSLlEeYaU3ji6Hu4R", // monthly only
  // Scan-Pack 50 (4,99 EUR einmalig)
  "price_1TeAyW2OSLlEeYaU9bZEoeZ9", // one-time
]);

/**
 * Generic Error Codes — keine raw exception messages an den Client.
 * Server-seitig wird die echte Fehlermeldung via console.error geloggt.
 */
const ERR = {
  AUTH: "ERR_AUTH",
  VALIDATION: "ERR_VALIDATION",
  INTERNAL: "ERR_INTERNAL",
} as const;

function errorResponse(code: string, status: number) {
  return new Response(JSON.stringify({ error_code: code }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("create-checkout: missing Authorization header");
      return errorResponse(ERR.AUTH, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      console.error("create-checkout: user not authenticated or email missing");
      return errorResponse(ERR.AUTH, 401);
    }

    const { priceId, couponCode } = await req.json();
    if (!priceId || typeof priceId !== "string") {
      console.error("create-checkout: priceId missing or invalid type");
      return errorResponse(ERR.VALIDATION, 400);
    }

    // Whitelist-Check: nur die in ALLOWED_PRICE_IDS gelisteten Prices sind erlaubt.
    if (!ALLOWED_PRICE_IDS.has(priceId)) {
      console.error("create-checkout: priceId not whitelisted", { priceId, userId: user.id });
      return errorResponse(ERR.VALIDATION, 400);
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
      const coupons = await stripe.coupons.list({ limit: 100 });
      const match = coupons.data.find(
        (c) => c.name?.toLowerCase() === couponCode.toLowerCase() && c.valid
      );
      if (!match) {
        console.error("create-checkout: invalid coupon code", { couponCode });
        return errorResponse(ERR.VALIDATION, 400);
      }
      discounts.push({ coupon: match.id });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
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
    console.error("create-checkout: internal error", error);
    return errorResponse(ERR.INTERNAL, 500);
  }
});
