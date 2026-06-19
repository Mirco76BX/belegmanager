import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// ─────────────────────────────────────────────────────────────────────
// Stripe-Product-ID → Tier-Mapping (Sandbox-IDs; werden in Sub-Step 8
// beim Live-Switch durch Live-Product-IDs ersetzt)
// ─────────────────────────────────────────────────────────────────────
const STRIPE_PRODUCT_TIER_MAP: Record<string, "basic" | "pro" | "business" | "cfo"> = {
  "prod_UdRow3yNW8hP20": "basic",     // BelegManager BASIC
  "prod_UdRo7Q2vuXLGnB": "pro",       // BelegManager PRO
  "prod_UdRqYozsiuaiFS": "business",  // BelegManager BUSINESS
  "prod_UdRrHLUUtrAEU4": "cfo",       // BelegManager CFO
  // BUSINESS Add-on User und Scan-Pack 50 sind KEINE eigenen Tiers
  // — separate Logik weiter unten.
};

const BUSINESS_ADDON_USER_PRODUCT_ID = "prod_UdRqbEso4okAzf";
const SCAN_PACK_PRODUCT_ID = "prod_UdRsyk6KmmwUyO";

const TRIAL_DURATION_DAYS = 30;
const TRIAL_GRACE_PERIOD_DAYS = 28;

// Legacy-Coupon-Mapping: alte RELAX/MASTER-Coupons werden fair gemappt
// (kein Tier-Geschenk-Upgrade).
const LEGACY_COUPON_TIER_MAP: Record<string, string> = {
  relax: "basic",
  master: "pro",
};

const TIER_PRIORITY: Record<string, number> = {
  free: 0,
  tax_advisor: 1,
  basic: 2,
  pro: 3,
  business: 4,
  cfo: 5,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const unixSecondsToIso = (value: unknown): string | null => {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const nowIso = new Date().toISOString();

    // ─── parallele DB-Reads ────────────────────────────────────────────
    const [
      founderOverrideRes,
      profileRes,
      couponRes,
    ] = await Promise.all([
      supabase
        .from("founder_overrides")
        .select("tier, expires_at, reason")
        .eq("user_id", user.id)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("is_tax_advisor, scan_quota_topup, trial_started_at, trial_blocked_at, scheduled_deletion_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("coupon_redemptions")
        .select("id, tier, expires_at, coupon_id, coupons:coupon_id(id, tier, is_active)")
        .eq("user_id", user.id)
        .gte("expires_at", nowIso)
        .order("expires_at", { ascending: false }),
    ]);

    const founderOverride = founderOverrideRes.data;
    const profile = profileRes.data;
    const redemptions = couponRes.data ?? [];
    const scanQuotaTopup = profile?.scan_quota_topup ?? 0;

    // Defense-in-depth: Coupon nur gültig wenn coupon.tier === redemption.tier
    const validRedemption = redemptions.find((r: any) => {
      const c = r.coupons;
      if (!c) {
        console.warn(`[CHECK-SUBSCRIPTION] Orphan redemption ${r.id} — ignored`);
        return false;
      }
      if (c.tier !== r.tier) {
        console.warn(`[CHECK-SUBSCRIPTION] Tier mismatch ${r.id}: ${r.tier} vs ${c.tier} — ignored`);
        return false;
      }
      return true;
    });

    // ─── Stripe-Subscription prüfen ────────────────────────────────────
    let stripeTier: "basic" | "pro" | "business" | "cfo" | null = null;
    let stripeProductId: string | null = null;
    let stripeSubEnd: string | null = null;
    let addonUserSeats = 0;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 10,
        });

        for (const sub of subs.data) {
          for (const item of sub.items.data) {
            const productId = item.price.product as string;
            const quantity = item.quantity ?? 1;

            if (productId === BUSINESS_ADDON_USER_PRODUCT_ID) {
              addonUserSeats += quantity;
              continue;
            }

            const tier = STRIPE_PRODUCT_TIER_MAP[productId];
            if (tier) {
              // Höchstes Tier gewinnt (z.B. wenn jemand BASIC + CFO parallel hätte)
              if (!stripeTier || TIER_PRIORITY[tier] > TIER_PRIORITY[stripeTier]) {
                stripeTier = tier;
                stripeProductId = productId;
                stripeSubEnd = unixSecondsToIso((sub as any).current_period_end)
                  ?? unixSecondsToIso((item as any).current_period_end);
              }
            }
          }
        }
      }
    }

    // ─── Trial-State-Resolution ────────────────────────────────────────
    let trialState:
      | {
          tier: "trial_active" | "trial_blocked";
          ends_at?: string;
          blocked_at?: string;
          deletion_at?: string;
        }
      | null = null;

    if (profile?.trial_started_at) {
      const startedAt = new Date(profile.trial_started_at).getTime();
      const trialEndsAt = startedAt + TRIAL_DURATION_DAYS * 24 * 3600 * 1000;
      const now = Date.now();

      if (now < trialEndsAt) {
        trialState = {
          tier: "trial_active",
          ends_at: new Date(trialEndsAt).toISOString(),
        };
      } else {
        let blockedAt = profile.trial_blocked_at as string | null;
        let deletionAt = profile.scheduled_deletion_at as string | null;

        if (!blockedAt) {
          blockedAt = new Date(now).toISOString();
          deletionAt = new Date(
            now + TRIAL_GRACE_PERIOD_DAYS * 24 * 3600 * 1000
          ).toISOString();
          const { error: blockErr } = await supabase
            .from("profiles")
            .update({
              trial_blocked_at: blockedAt,
              scheduled_deletion_at: deletionAt,
            })
            .eq("id", user.id);
          if (blockErr) {
            logStep("Failed to set trial_blocked_at", blockErr);
          } else {
            logStep("Trial expired, account blocked", {
              userId: user.id,
              blockedAt,
              deletionAt,
            });
          }
        }

        trialState = {
          tier: "trial_blocked",
          blocked_at: blockedAt ?? undefined,
          deletion_at: deletionAt ?? undefined,
        };
      }
    }

    // ─── Tier-Resolution: höchste Priorität gewinnt ───────────────────
    type Candidate = {
      tier: string;
      source: "founder_override" | "stripe" | "coupon" | "tax_advisor" | "trial";
      productId: string | null;
      subEnd: string | null;
    };
    const candidates: Candidate[] = [];

    if (founderOverride?.tier) {
      candidates.push({
        tier: founderOverride.tier,
        source: "founder_override",
        productId: null,
        subEnd: founderOverride.expires_at ?? null,
      });
    }
    if (stripeTier) {
      candidates.push({
        tier: stripeTier,
        source: "stripe",
        productId: stripeProductId,
        subEnd: stripeSubEnd,
      });
    }
    if (validRedemption?.tier) {
      const mappedTier =
        LEGACY_COUPON_TIER_MAP[validRedemption.tier] ?? validRedemption.tier;
      candidates.push({
        tier: mappedTier,
        source: "coupon",
        productId: `coupon_${validRedemption.tier}`,
        subEnd: validRedemption.expires_at,
      });
    }
    if (profile?.is_tax_advisor) {
      candidates.push({
        tier: "tax_advisor",
        source: "tax_advisor",
        productId: null,
        subEnd: null,
      });
    }

    let finalTier = "free";
    let source: Candidate["source"] | "free" = "free";
    let subscribed = false;
    let resolvedProductId: string | null = null;
    let resolvedSubEnd: string | null = null;

    if (candidates.length > 0) {
      const winner = candidates.reduce((best, c) =>
        TIER_PRIORITY[c.tier] > TIER_PRIORITY[best.tier] ? c : best
      );
      finalTier = winner.tier;
      source = winner.source;
      subscribed = winner.tier !== "free";
      resolvedProductId = winner.productId;
      resolvedSubEnd = winner.subEnd;
    } else if (trialState) {
      finalTier = trialState.tier;
      source = "trial";
      subscribed = trialState.tier === "trial_active";
      resolvedSubEnd = trialState.ends_at ?? null;
    }

    logStep("Tier resolved", {
      tier: finalTier,
      source,
      scanQuotaTopup,
      addonUserSeats,
      trial: trialState?.tier ?? null,
    });

    return new Response(
      JSON.stringify({
        subscribed,
        tier: finalTier,
        product_id: resolvedProductId,
        subscription_end: resolvedSubEnd,
        source,
        scan_quota_topup: scanQuotaTopup,
        addon_user_seats: addonUserSeats,
        trial: trialState
          ? {
              active: trialState.tier === "trial_active",
              blocked: trialState.tier === "trial_blocked",
              ends_at: trialState.ends_at ?? null,
              blocked_at: trialState.blocked_at ?? null,
              deletion_at: trialState.deletion_at ?? null,
            }
          : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", {
      message: msg,
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    const isAuthError =
      msg.toLowerCase().includes("auth") || msg.includes("authorization");
    return new Response(
      JSON.stringify({ error: isAuthError ? "unauthorized" : "internal_error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isAuthError ? 401 : 500,
      }
    );
  }
});
