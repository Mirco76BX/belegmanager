import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency, date } = await req.json();

    if (!amount || !currency) {
      return new Response(
        JSON.stringify({ error: "amount and currency are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already EUR, return as-is
    if (currency === "EUR") {
      return new Response(
        JSON.stringify({ amount_eur: amount, rate: 1, source: "identity" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Frankfurter API (free, based on ECB data)
    // Try historical rate for the receipt date, fallback to latest
    const dateParam = date || "latest";
    const url = dateParam === "latest"
      ? `https://api.frankfurter.dev/v1/latest?from=${currency}&to=EUR&amount=${amount}`
      : `https://api.frankfurter.dev/v1/${dateParam}?from=${currency}&to=EUR&amount=${amount}`;

    console.log("Fetching exchange rate:", url);
    const response = await fetch(url);

    if (!response.ok) {
      // Fallback to latest if historical date fails
      if (dateParam !== "latest") {
        const fallbackUrl = `https://api.frankfurter.dev/v1/latest?from=${currency}&to=EUR&amount=${amount}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          return new Response(
            JSON.stringify({
              amount_eur: Math.round(fallbackData.rates.EUR * 100) / 100,
              rate: fallbackData.rates.EUR / amount,
              source: "frankfurter_latest_fallback",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json();
    const amountEur = Math.round(data.rates.EUR * 100) / 100;

    return new Response(
      JSON.stringify({
        amount_eur: amountEur,
        rate: data.rates.EUR / amount,
        source: dateParam === "latest" ? "frankfurter_latest" : "frankfurter_historical",
      }),
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
