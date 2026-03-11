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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this receipt image and extract the following information. Return ONLY valid JSON with these fields:
{
  "date": "YYYY-MM-DD format or null if not found",
  "amount": number or null (total amount paid including VAT),
  "currency": "EUR" or detected currency code,
  "description": "brief description of what was purchased/service",
  "vendor": "name of the store/restaurant/vendor",
  "tax_amount": number or null (VAT/MwSt amount if visible on the receipt),
  "tax_rate": number or null (VAT/MwSt percentage rate, e.g. 19 or 7, if visible on the receipt),
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
If the receipt is handwritten or hard to read, set confidence to "low" for affected fields.
Do not include any other text, just the JSON object.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON from the AI response
    let extracted;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      extracted = {
        date: null,
        amount: null,
        currency: "EUR",
        description: content.slice(0, 200),
        vendor: null,
        tax_amount: null,
        tax_rate: null,
        items: [],
        is_fuel_receipt: false,
        suggested_tax_category: null,
        confidence: { date: "low", amount: "low", tax_amount: "low", tax_rate: "low", vendor: "low" },
        is_handwritten: false,
        multiple_receipts_detected: false,
      };
    }

    // Ensure confidence object exists
    if (!extracted.confidence) {
      extracted.confidence = { date: "high", amount: "high", tax_amount: "high", tax_rate: "high", vendor: "high" };
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scan-receipt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
