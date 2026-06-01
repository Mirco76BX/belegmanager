import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const roundEurAmount = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 && value > 0 ? value : rounded;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Defense-in-depth: require Authorization header (platform also enforces verify_jwt=true)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { amount, currency, date } = await req.json();

    // Validate inputs to prevent URL/parameter injection against third-party APIs
    const amountNum = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > 1e12) {
      return new Response(
        JSON.stringify({ error: "amount must be a positive finite number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
      return new Response(
        JSON.stringify({ error: "currency must be a 3-letter ISO 4217 code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (date !== undefined && date !== null && date !== "latest") {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(
          JSON.stringify({ error: "date must be 'latest' or YYYY-MM-DD" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (currency === "EUR") {
      return new Response(
        JSON.stringify({ amount_eur: amountNum, rate: 1, source: "identity" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dateParam: string = date || "latest";
    const qs = (path: string) => {
      const u = new URL(`https://api.frankfurter.dev/v1/${path}`);
      u.searchParams.set("from", currency);
      u.searchParams.set("to", "EUR");
      u.searchParams.set("amount", String(amountNum));
      return u.toString();
    };
    let amountEur: number | null = null;
    let rate: number | null = null;
    let source = "";

    // Try Frankfurter API first (ECB data, ~30 currencies)
    try {
      const url = dateParam === "latest" ? qs("latest") : qs(dateParam);
      console.log("Trying Frankfurter:", url);
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.rates?.EUR != null) {
          amountEur = roundEurAmount(data.rates.EUR);
          rate = data.rates.EUR / amountNum;
          source = dateParam === "latest" ? "frankfurter_latest" : "frankfurter_historical";
        }
      } else if (dateParam !== "latest") {
        const fallbackUrl = qs("latest");
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.rates?.EUR != null) {
            amountEur = roundEurAmount(fallbackData.rates.EUR);
            rate = fallbackData.rates.EUR / amountNum;
            source = "frankfurter_latest_fallback";
          }

        }
      }
    } catch (e) {
      console.warn("Frankfurter API failed:", e);
    }

    // Fallback: open.er-api.com (supports 150+ currencies including IDR, THB, VND, etc.)
    if (amountEur === null) {
      try {
        const erUrl = `https://open.er-api.com/v6/latest/${encodeURIComponent(currency)}`;
        console.log("Trying ExchangeRate fallback:", erUrl);
        const erRes = await fetch(erUrl);
        if (erRes.ok) {
          const erData = await erRes.json();
          if (erData.rates?.EUR) {
            const eurRate = erData.rates.EUR;
            amountEur = roundEurAmount(amountNum * eurRate);
            rate = eurRate;
            source = "exchangerate_api_fallback";
          }
        }
      } catch (e) {
        console.warn("ExchangeRate API also failed:", e);
      }
    }

    if (amountEur === null) {
      throw new Error(`Could not convert ${currency} to EUR – no API returned a rate`);
    }

    return new Response(
      JSON.stringify({ amount_eur: amountEur, rate, source }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("convert-currency error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
