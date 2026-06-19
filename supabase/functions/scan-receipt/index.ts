import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RECEIPT_PROMPT = `Analyze this receipt image carefully and extract the following information. Return ONLY valid JSON with these fields:
{
  "date": "YYYY-MM-DD format or null if not found. READ THE DATE EXACTLY AS PRINTED on the receipt. Do NOT use today's date. Look for date patterns like DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, or written-out month names. Convert to YYYY-MM-DD.",
  "amount": number or null (total amount paid including VAT),
  "currency": "EUR" or detected currency code (e.g. "IDR", "USD", "THB", "GBP"),
  "country": "two-letter ISO country code where this receipt was issued (e.g. ID, DE, US, TH, GB)",
  "description": "brief description of what was purchased/service",
  "vendor": "name of the store/restaurant/vendor",
  "tax_amount": number or null (TOTAL VAT/MwSt/PPN/tax amount across all rates, if visible on the receipt),
  "tax_rate": number or null (VAT rate IF there is only ONE rate on the receipt, e.g. 19 or 7. Set to null if MULTIPLE rates apply.),
  "vat_items": [
    {
      "label": "description of this VAT line, e.g. 'Übernachtung', 'Speisen', 'Getränke', 'Allgemein'",
      "net_amount": number (net amount for this line),
      "vat_rate": number (VAT percentage, e.g. 7 or 19),
      "vat_amount": number (VAT amount for this line)
    }
  ],
  "items": ["list of individual items if visible"] or [],
  "is_fuel_receipt": true or false (set to true if this is a gas station / fuel / petrol receipt),
  "suggested_tax_category": one of ["reisekosten_uebernachtung","reisekosten_fahrt","reisekosten_nebenkosten","bewirtung","tankkosten","bueromaterial","telekommunikation","fortbildung","versicherung","sonstiges"] based on what the receipt is for,
  "confidence": {
    "date": "high" or "medium" or "low",
    "amount": "high" or "medium" or "low",
    "tax_amount": "high" or "medium" or "low",
    "tax_rate": "high" or "medium" or "low",
    "vendor": "high" or "medium" or "low"
  },
  "is_handwritten": true or false (set to true if the receipt appears to be handwritten, e.g. a taxi receipt or manual Quittung),
  "multiple_receipts_detected": true or false (set to true if you see more than one receipt/document in the image)
}

IMPORTANT FOR VAT ITEMS:
- ALWAYS populate "vat_items" array. Even if there is only ONE VAT rate, create one entry.
- For hotel receipts: Look for separate lines like "Übernachtung" (7% in Germany), "Frühstück"/"Speisen" (19%), "Parkgebühr" (19%), etc.
- For restaurant receipts: Look for "Speisen" (19%) vs "Getränke" (19%) or reduced rate items (7%).
- If only one VAT rate is found, create a single vat_items entry with that rate.
- The sum of all vat_items.vat_amount should equal the total tax_amount.
- If you cannot determine individual lines, create ONE entry with the total values.

CRITICAL RULES FOR ACCURATE READING:
0. DATE: Read the date EXACTLY as printed on the receipt. The date is on the receipt itself, NOT today's date. Look carefully for day, month, and year. Common formats: "20.03.2020" means March 20, 2020 → "2020-03-20". "Mar 20, 2020" → "2020-03-20". NEVER guess or fabricate a date. If you cannot find a date, return null.
1. AMOUNTS: Read EVERY digit carefully. Pay close attention to thousand separators (dots or commas) vs decimal separators.
2. TOTAL AMOUNT: Always look for the GRAND TOTAL / TOTAL / Jumlah / Gesamt line — this is the "amount" field.
3. TAX/VAT: Look for lines labeled "Tax", "VAT", "MwSt", "PPN", "Pajak", "Steuer", or a percentage. If you find a tax rate but no tax amount, calculate: tax_amount = amount - (amount / (1 + tax_rate/100)). If you find a tax amount but no rate, calculate: tax_rate = round((tax_amount / (amount - tax_amount)) * 100).
4. CURRENCY: Detect from symbols (Rp, €, $, £, ¥, ฿) or text (IDR, EUR, USD).
5. COUNTRY-BASED VAT FALLBACK: If you CANNOT clearly read the tax rate from the receipt, determine the country and apply the standard VAT rate (DE 19/7, AT 20/10, CH 8.1/2.6, FR 20/10, IT 22/10, ES 21/10, NL 21/9, BE 21/6, PL 23/8, GB 20/5, US null, ID 11, TH 7, MY 8, SG 9, JP 10/8, KR 10, AU 10, NZ 15, IN 18, AE 5, SA 15, TR 20/10, ZA 15, MX 16, CA 5, SE 25, DK 25, NO 25, FI 25.5). When using a country fallback rate, set confidence to "medium".
6. If the receipt is blurry, set confidence to "low" for affected fields.
Do not include any other text, just the JSON object.`;

const MULTI_PAGE_PREFIX = `You are analyzing a MULTI-PAGE receipt/invoice. All images below belong to the SAME document. Combine the information from ALL pages into a single result. The total amount should come from the final summary/total on the last page.\n\n`;

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  tax_advisor: 50,
  relax: 150,
  master: Number.POSITIVE_INFINITY,
};

function buildImageContent(images: string[]) {
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  if (images.length > 1) {
    parts.push({ type: "text", text: MULTI_PAGE_PREFIX + RECEIPT_PROMPT });
    for (let i = 0; i < images.length; i++) {
      parts.push({ type: "text", text: `--- Page ${i + 1} of ${images.length} ---` });
      parts.push({ type: "image_url", image_url: { url: images[i] } });
    }
  } else {
    parts.push({ type: "text", text: RECEIPT_PROMPT });
    parts.push({ type: "image_url", image_url: { url: images[0] } });
  }
  return parts;
}

function postProcess(extracted: any): any {
  if (!extracted.confidence) {
    extracted.confidence = { date: "high", amount: "high", tax_amount: "high", tax_rate: "high", vendor: "high" };
  }
  if (!Array.isArray(extracted.vat_items)) extracted.vat_items = [];
  if (extracted.amount != null && extracted.amount > 0) {
    if (extracted.tax_rate != null && extracted.tax_rate > 0 && extracted.tax_amount == null) {
      extracted.tax_amount = Math.round((extracted.amount - (extracted.amount / (1 + extracted.tax_rate / 100))) * 100) / 100;
      extracted.confidence.tax_amount = "medium";
    }
    if (extracted.tax_amount != null && extracted.tax_amount > 0 && extracted.tax_rate == null) {
      const netAmount = extracted.amount - extracted.tax_amount;
      if (netAmount > 0) {
        extracted.tax_rate = Math.round((extracted.tax_amount / netAmount) * 100);
        extracted.confidence.tax_rate = "medium";
      }
    }
  }
  if (extracted.vat_items.length === 0 && extracted.tax_rate != null && extracted.tax_amount != null) {
    const netAmount = extracted.amount != null ? extracted.amount - extracted.tax_amount : null;
    extracted.vat_items.push({
      label: "Gesamt",
      net_amount: netAmount,
      vat_rate: extracted.tax_rate,
      vat_amount: extracted.tax_amount,
    });
  }
  return extracted;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function deriveTier(admin: ReturnType<typeof createClient>, userId: string): Promise<"free" | "relax" | "master" | "tax_advisor"> {
  // 1. Active coupon redemption (with tier-match defensive check, mirrors check-subscription)
  const { data: redemptions } = await admin
    .from("coupon_redemptions")
    .select("tier, expires_at, coupons:coupon_id (tier)")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);
  const red = redemptions?.[0] as any;
  if (red?.coupons && red.tier === red.coupons.tier) {
    if (red.tier === "master") return "master";
    if (red.tier === "relax") return "relax";
  }

  // 2. Tax advisor
  const { data: profile } = await admin
    .from("profiles")
    .select("is_tax_advisor")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.is_tax_advisor) return "tax_advisor";

  return "free";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- 1. JWT validation (defense in depth; verify_jwt=true also enforced at platform) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "unauthorized", message: "Bitte einloggen, um Belege zu scannen." }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return jsonResponse({ error: "unauthorized", message: "Sitzung ungültig oder abgelaufen. Bitte erneut einloggen." }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();

    // Warmup pings (still require auth, but skip rate/plan checks)
    if (body.warmup === true) {
      return jsonResponse({ ok: true, warm: true, ts: new Date().toISOString() });
    }

    // Health-check: real mini AI call for uptime monitoring
    if (body.health === true) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return jsonResponse({ ok: true, ai_ok: false, error: "missing_key" }, 200);
      const started = Date.now();
      try {
        const ctrl = new AbortController();
        const tId = setTimeout(() => ctrl.abort(), 10_000);
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(tId);
        return jsonResponse({ ok: true, ai_ok: r.ok, latency_ms: Date.now() - started, status: r.status });
      } catch (e) {
        return jsonResponse({ ok: true, ai_ok: false, latency_ms: Date.now() - started, error: String((e as Error).message || e) });
      }
    }

    const MAX_PAGES = 10;
    const MAX_IMAGE_BYTES = 5_000_000; // ~5MB per image (base64 string length)
    const MAX_TOTAL_BYTES = 25_000_000; // ~25MB total payload

    let images: string[] = [];
    if (Array.isArray(body.images) && body.images.length > 0) images = body.images;
    else if (body.imageBase64) images = [body.imageBase64];
    if (images.length === 0) {
      return jsonResponse({ error: "no_image", message: "Kein Bild übermittelt." }, 400);
    }
    if (images.length > MAX_PAGES) {
      return jsonResponse({
        error: "too_many_pages",
        message: `Zu viele Seiten (${images.length}). Maximal ${MAX_PAGES} Seiten pro Scan.`,
      }, 400);
    }
    let totalBytes = 0;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (typeof img !== "string" || img.length === 0) {
        return jsonResponse({ error: "invalid_image", message: `Seite ${i + 1} ist ungültig.` }, 400);
      }
      if (img.length > MAX_IMAGE_BYTES) {
        return jsonResponse({
          error: "image_too_large",
          message: `Seite ${i + 1} ist zu groß (max. ${Math.round(MAX_IMAGE_BYTES / 1_000_000)}MB).`,
        }, 413);
      }
      totalBytes += img.length;
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return jsonResponse({
        error: "payload_too_large",
        message: `Gesamtgröße zu groß (max. ${Math.round(MAX_TOTAL_BYTES / 1_000_000)}MB).`,
      }, 413);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // --- 2. Rate limit: max 5 scans / 60s per user ---
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentCount, error: rlError } = await admin
      .from("scan_rate_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneMinAgo);
    if (rlError) console.warn("scan_rate_log read error:", rlError.message);
    if ((recentCount ?? 0) >= 5) {
      return jsonResponse({
        error: "rate_limit",
        message: "Bitte einen Moment warten — kurze Pause vor dem nächsten Scan.",
      }, 429);
    }

    // --- 2b. Trial-Blocked check (hard block) ---
    {
      const { data: trialProfile } = await admin
        .from("profiles")
        .select("trial_started_at, trial_blocked_at")
        .eq("id", userId)
        .maybeSingle();
      const TRIAL_DURATION_MS = 30 * 24 * 3600 * 1000;
      const startedAt = trialProfile?.trial_started_at
        ? new Date(trialProfile.trial_started_at).getTime()
        : null;
      const isExpired = startedAt !== null && Date.now() >= startedAt + TRIAL_DURATION_MS;
      if (trialProfile?.trial_blocked_at || isExpired) {
        // Allow if user has an alternate non-trial entitlement (coupon/tax_advisor).
        // Stripe entitlements are checked in check-subscription; here we rely on
        // the same deriveTier signal — if it returns non-free, user has access.
        const altTier = await deriveTier(admin, userId);
        if (altTier === "free") {
          return jsonResponse({
            error: "trial_blocked",
            message: "Trial abgelaufen — Account gesperrt. Bitte Plan wählen.",
            retry_after: null,
          }, 403);
        }
      }
    }

    // --- 3. Plan check (monthly scans) ---
    // Quota is tracked on profiles.scans_used_this_month (append-only counter
    // incremented AFTER each successful AI call). Decoupled from receipts.count
    // to prevent bypass via receipt deletion.
    const tier = await deriveTier(admin, userId);
    const baseLimit = TIER_LIMITS[tier];
    const { data: quotaProfile } = await admin
      .from("profiles")
      .select("scans_used_this_month, scan_quota_topup")
      .eq("id", userId)
      .maybeSingle();
    const usedThisMonth = quotaProfile?.scans_used_this_month ?? 0;
    const topup = quotaProfile?.scan_quota_topup ?? 0;
    if (Number.isFinite(baseLimit)) {
      const effectiveLimit = baseLimit + topup;
      if (usedThisMonth >= effectiveLimit) {
        const tierLabel = tier === "free" ? "FREE" : tier === "tax_advisor" ? "STEUERBERATER" : "RELAX";
        const upgrade = tier === "relax" ? " Upgrade auf MASTER für unbegrenzte Scans." : " Upgrade auf RELAX für 150 Scans pro Monat.";
        return jsonResponse({
          error: "limit_reached",
          tier,
          limit: effectiveLimit,
          message: `Monatslimit erreicht (${usedThisMonth}/${effectiveLimit} im ${tierLabel}-Tarif).${upgrade}`,
        }, 402);
      }
    }

    // --- 4. AI call with 45s timeout + 1× retry on 5xx/network error ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiPayload = JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: buildImageContent(images) }],
    });

    async function callAi(): Promise<{ response?: Response; networkError?: unknown; timedOut?: boolean }> {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 45_000);
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: aiPayload,
          signal: ctrl.signal,
        });
        return { response: r };
      } catch (e) {
        const timedOut = (e as Error)?.name === "AbortError";
        return { networkError: e, timedOut };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    let attempt = await callAi();

    // Decide whether to retry: 5xx OR network error (NOT timeout, NOT 4xx)
    const firstStatus = attempt.response?.status;
    const isServerError = !!firstStatus && firstStatus >= 500 && firstStatus < 600;
    const isNetworkError = !!attempt.networkError && !attempt.timedOut;

    if (isServerError || isNetworkError) {
      console.log(`[scan-receipt] retry after first failure status=${firstStatus ?? "network"}`);
      await new Promise((r) => setTimeout(r, 500));
      attempt = await callAi();
    }

    if (attempt.timedOut) {
      return jsonResponse({ error: "ai_timeout", message: "KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen." }, 504);
    }

    if (!attempt.response) {
      // network error after retry
      return jsonResponse({ error: "ai_unavailable", message: "KI-Service kurz nicht erreichbar.", retry_after: 30 }, 503);
    }

    const response = attempt.response;

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse({ error: "ai_rate_limit", message: "KI-Dienst ist gerade ausgelastet, bitte gleich nochmal versuchen." }, 429);
      }
      if (response.status === 402) {
        return jsonResponse({ error: "ai_credits", message: "KI-Guthaben aufgebraucht. Bitte Admin informieren." }, 402);
      }
      if (response.status >= 500) {
        const errorText = await response.text().catch(() => "");
        console.error("AI gateway 5xx after retry:", response.status, errorText);
        return jsonResponse({ error: "ai_unavailable", message: "KI-Service kurz nicht erreichbar.", retry_after: 30 }, 503);
      }
      const errorText = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let extracted: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      extracted = {
        date: null, amount: null, currency: "EUR", description: content.slice(0, 200),
        vendor: null, tax_amount: null, tax_rate: null, vat_items: [], items: [],
        is_fuel_receipt: false, suggested_tax_category: null,
        confidence: { date: "low", amount: "low", tax_amount: "low", tax_rate: "low", vendor: "low" },
        is_handwritten: false, multiple_receipts_detected: false,
      };
    }

    extracted = postProcess(extracted);

    // --- 5. Log successful scan for rate limiting + increment monthly quota ---
    await admin.from("scan_rate_log").insert({ user_id: userId });
    // Atomic increment AFTER a successful AI call. Failures above return early
    // and never reach this point, so the counter stays in sync with real usage.
    const { error: incErr } = await admin.rpc("increment_scan_usage", { _user_id: userId });
    if (incErr) console.warn("increment_scan_usage error:", incErr.message);
    // Opportunistic cleanup (5% of requests)
    if (Math.random() < 0.05) {
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
      await admin.from("scan_rate_log").delete().lt("created_at", oneHourAgo);
    }

    return jsonResponse(extracted);
  } catch (error) {
    console.error("scan-receipt error:", error);
    return jsonResponse({ error: "internal", message: "Ein interner Fehler ist aufgetreten. Bitte später erneut versuchen." }, 500);
  }
});
