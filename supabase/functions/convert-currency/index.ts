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


    if (!amount || !currency) {
      return new Response(
        JSON.stringify({ error: "amount and currency are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currency === "EUR") {
      return new Response(
        JSON.stringify({ amount_eur: amount, rate: 1, source: "identity" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dateParam = date || "latest";
    let amountEur: number | null = null;
    let rate: number | null = null;
    let source = "";

    // Try Frankfurter API first (ECB data, ~30 currencies)
    try {
      const url = dateParam === "latest"
        ? `https://api.frankfurter.dev/v1/latest?from=${currency}&to=EUR&amount=${amount}`
        : `https://api.frankfurter.dev/v1/${dateParam}?from=${currency}&to=EUR&amount=${amount}`;
      console.log("Trying Frankfurter:", url);
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.rates?.EUR != null) {
          amountEur = roundEurAmount(data.rates.EUR);
          rate = data.rates.EUR / amount;
          source = dateParam === "latest" ? "frankfurter_latest" : "frankfurter_historical";
        }
      } else if (dateParam !== "latest") {
        const fallbackUrl = `https://api.frankfurter.dev/v1/latest?from=${currency}&to=EUR&amount=${amount}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.rates?.EUR != null) {
            amountEur = roundEurAmount(fallbackData.rates.EUR);
            rate = fallbackData.rates.EUR / amount;
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
        const erUrl = `https://open.er-api.com/v6/latest/${currency}`;
        console.log("Trying ExchangeRate fallback:", erUrl);
        const erRes = await fetch(erUrl);
        if (erRes.ok) {
          const erData = await erRes.json();
          if (erData.rates?.EUR) {
            const eurRate = erData.rates.EUR;
            amountEur = roundEurAmount(amount * eurRate);
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
