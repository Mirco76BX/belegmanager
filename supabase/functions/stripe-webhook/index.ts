import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Scan-Pack 50 (Sandbox). Wird in Sub-Step 8 beim Live-Switch durch Live-ID ersetzt.
const SCAN_PACK_PRODUCT_ID = "prod_UdRsyk6KmmwUyO";
const SCAN_PACK_TOPUP_AMOUNT = 50;

serve(async (req) => {
  // Webhooks sind Server-to-Server (kein CORS nötig)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Einziges relevantes Event: checkout.session.completed (für Scan-Pack-Käufe)
    if (event.type !== "checkout.session.completed") {
      return new Response("ok (event ignored)", { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // Subscription-Sessions ignorieren — die werden via check-subscription Polling abgedeckt
    if (session.mode !== "payment") {
      return new Response("ok (subscription session)", { status: 200 });
    }

    // Customer-Email ermitteln
    let customerEmail: string | null = session.customer_email ?? null;
    if (!customerEmail && session.customer) {
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        customerEmail = customer.email ?? null;
      }
    }
    if (!customerEmail) {
      console.error("[stripe-webhook] No customer email for session", session.id);
      return new Response("No customer email", { status: 400 });
    }

    // Line items holen (sind nicht im Default-Session-Payload)
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 10,
      expand: ["data.price.product"],
    });

    // Scan-Pack-Topup berechnen
    let totalTopup = 0;
    for (const item of lineItems.data) {
      const product = item.price?.product;
      const productId = typeof product === "string" ? product : product?.id;
      if (productId === SCAN_PACK_PRODUCT_ID) {
        totalTopup += (item.quantity ?? 1) * SCAN_PACK_TOPUP_AMOUNT;
      }
    }

    if (totalTopup === 0) {
      return new Response("ok (no scan-pack in session)", { status: 200 });
    }

    // User per Email finden (F&F-Pragmatismus: listUsers ist bei <100 Usern instant.
    // Public-Launch: RPC user_id_by_email)
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const matchedUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === customerEmail!.toLowerCase()
    );
    if (!matchedUser) {
      console.error("[stripe-webhook] No user for email", customerEmail);
      return new Response("User not found", { status: 404 });
    }

    // Read-modify-write (F&F-Pragmatismus; Race-Risk klein, weil Scan-Pack-Käufe selten.
    // Public-Launch: RPC apply_scan_pack_topup mit atomic SQL increment).
    // KNOWN-ISSUE: keine Stripe-Event-Idempotency — Doppel-Webhook → Doppel-Topup.
    // Stripe sendet Events i.d.R. genau einmal; akzeptabel für F&F.
    const { data: profile } = await supabase
      .from("profiles")
      .select("scan_quota_topup")
      .eq("id", matchedUser.id)
      .maybeSingle();
    const newTopup = (profile?.scan_quota_topup ?? 0) + totalTopup;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ scan_quota_topup: newTopup })
      .eq("id", matchedUser.id);
    if (updateErr) {
      console.error("[stripe-webhook] Update failed:", updateErr);
      return new Response("Update failed", { status: 500 });
    }

    console.log(
      `[stripe-webhook] Scan-pack topup applied: user=${matchedUser.id} email=${customerEmail} +${totalTopup} (total now: ${newTopup}, session=${session.id})`
    );
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[stripe-webhook] Handler error:", error);
    return new Response("Handler error", { status: 500 });
  }
});
