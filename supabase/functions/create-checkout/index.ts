import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────────────────────────────
// Whitelist: Produkte die via Self-Service-Checkout buchbar sind.
// Sandbox-Product-IDs — werden in Sub-Step 8 beim Live-Switch durch
// Live-IDs ersetzt.
// ─────────────────────────────────────────────────────────────────────
const ALLOWED_PRODUCT_IDS = new Set<string>([
  "prod_UdRow3yNW8hP20",  // BelegManager BASIC
  "prod_UdRo7Q2vuXLGnB",  // BelegManager PRO
  "prod_UdRqYozsiuaiFS",  // BelegManager BUSINESS
  "prod_UdRqbEso4okAzf",  // BelegManager BUSINESS Add-on User
  "prod_UdRrHLUUtrAEU4",  // BelegManager CFO
  "prod_UdRsyk6KmmwUyO",  // BelegManager Scan-Pack 50 (one-time)
]);

// One-time-Purchases (Stripe-Mode "payment" statt "subscription")
const ONE_TIME_PRODUCT_IDS = new Set<string>([
  "prod_UdRsyk6KmmwUyO",  // Scan-Pack 50
]);

// Sanity-Check gegen Tippfehler bei BUSINESS Add-on User Multi-Seat-Buchung
const MAX_QUANTITY = 50;

const ALLOWED_ORIGINS = [
  "https://belegmanager.online",
  "https://www.belegmanager.online",
  "https://belegmanager.lovable.app",
  "https://id-preview--5196d375-f0b6-42d1-b73c-097cbd42414c.lovable.app",
  "http://localhost:8080",
  "http://localhost:3000",
];

const jsonResp = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    if (!authHeader) return jsonResp(401, { error: "unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) return jsonResp(401, { error: "unauthorized" });

    const body = await req.json().catch(() => null) as
      | { priceId?: string; couponCode?: string; quantity?: number }
      | null;
    if (!body?.priceId) return jsonResp(400, { error: "priceId is required" });

    const priceId = body.priceId;
    const quantity =
      body.quantity && Number.isInteger(body.quantity)
        ? Math.max(1, Math.min(MAX_QUANTITY, body.quantity))
        : 1;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return jsonResp(500, { error: "internal_error" });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ─── Server-seitige Validierung: priceId → zugehöriges Product ───
    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch {
      return jsonResp(400, { error: "Invalid price" });
    }
    if (!price.active) return jsonResp(400, { error: "Price not active" });

    const productId =
      typeof price.product === "string" ? price.product : price.product.id;
    if (!ALLOWED_PRODUCT_IDS.has(productId)) {
      return jsonResp(400, { error: "Product not allowed" });
    }

    // ─── Mode-Auswahl: Subscription vs. One-time ─────────────────────
    const mode: "subscription" | "payment" = ONE_TIME_PRODUCT_IDS.has(productId)
      ? "payment"
      : "subscription";

    // ─── Customer ────────────────────────────────────────────────────
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // ─── Coupon (nur bei Subscription-Mode; Stripe lehnt Coupon in payment-mode ab) ───
    const discounts: { coupon: string }[] = [];
    if (body.couponCode && mode === "subscription") {
      const coupons = await stripe.coupons.list({ limit: 100 });
      const match = coupons.data.find(
        (c) => c.name?.toLowerCase() === body.couponCode!.toLowerCase() && c.valid
      );
      if (!match) return jsonResp(400, { error: "Ungültiger Gutscheincode" });
      discounts.push({ coupon: match.id });
    }

    // ─── Origin-Whitelist gegen Open-Redirect/Phishing ───────────────
    const requestOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : "https://belegmanager.online";

    // ─── Checkout-Session erstellen ──────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity }],
      mode,
      ...(discounts.length > 0 && mode === "subscription" ? { discounts } : {}),
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
    });

    return jsonResp(200, { url: session.url });
  } catch (error) {
    console.error("create-checkout error:", error);
    return jsonResp(500, { error: "internal_error" });
  }
});
