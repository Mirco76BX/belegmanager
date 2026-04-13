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
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this receipt image carefully and extract the following information. Return ONLY valid JSON with these fields:
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
1. AMOUNTS: Read EVERY digit carefully. Pay close attention to thousand separators (dots or commas) vs decimal separators. For example in Indonesian receipts (IDR), amounts like "176.617" or "513.172" use dots as thousand separators — do NOT misread as decimal points. A typical Indonesian restaurant bill is 50,000-500,000 IDR, NOT 1,000-5,000 IDR.
2. TOTAL AMOUNT: Always look for the GRAND TOTAL / TOTAL / Jumlah / Gesamt line — this is the "amount" field. Do NOT use a subtotal or single item price. Cross-check: the total should be >= sum of visible line items.
3. TAX/VAT: Look for lines labeled "Tax", "VAT", "MwSt", "PPN", "Pajak", "Steuer", or a percentage (e.g. "11%", "19%"). If you find a tax rate but no tax amount, calculate: tax_amount = amount - (amount / (1 + tax_rate/100)). If you find a tax amount but no rate, calculate: tax_rate = round((tax_amount / (amount - tax_amount)) * 100).
4. CURRENCY: Detect from symbols (Rp, €, $, £, ¥, ฿) or text (IDR, EUR, USD). Indonesian receipts use "Rp" or "IDR".
5. COUNTRY-BASED VAT FALLBACK: If you CANNOT clearly read the tax rate from the receipt, determine the country from the vendor address, language, or currency and apply the standard VAT rate for that country. Use these standard rates:
   - DE (Germany): 19% standard, 7% reduced (food, books, hotels)
   - AT (Austria): 20% standard, 10% reduced
   - CH (Switzerland): 8.1% standard, 2.6% reduced
   - FR (France): 20% standard, 10% reduced
   - IT (Italy): 22% standard, 10% reduced
   - ES (Spain): 21% standard, 10% reduced
   - NL (Netherlands): 21% standard, 9% reduced
   - BE (Belgium): 21% standard, 6% reduced
   - PL (Poland): 23% standard, 8% reduced
   - CZ (Czech Republic): 21% standard, 12% reduced
   - GB (UK): 20% standard, 5% reduced
   - US (USA): 0% (no federal VAT; state sales tax varies, set tax_rate to null)
   - ID (Indonesia): 11% PPN
   - TH (Thailand): 7% VAT
   - MY (Malaysia): 8% SST
   - SG (Singapore): 9% GST
   - JP (Japan): 10% standard, 8% reduced (food)
   - KR (South Korea): 10% VAT
   - AU (Australia): 10% GST
   - NZ (New Zealand): 15% GST
   - IN (India): 18% standard GST, 5%/12%/28% for other categories
   - BR (Brazil): varies, use null if unsure
   - AE (UAE): 5% VAT
   - SA (Saudi Arabia): 15% VAT
   - TR (Turkey): 20% standard, 10%/1% reduced
   - ZA (South Africa): 15% VAT
   - MX (Mexico): 16% IVA
   - CA (Canada): 5% GST (+ provincial, use 5% as base)
   - SE (Sweden): 25% standard, 12%/6% reduced
   - DK (Denmark): 25% standard
   - NO (Norway): 25% standard, 15%/12% reduced
   - FI (Finland): 25.5% standard, 14%/10% reduced
   When using a country fallback rate, set the corresponding confidence to "medium" (not "low") since we know the legal rate.
6. If the receipt is blurry or hard to read, set confidence to "low" for affected fields.
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
        vat_items: [],
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

    // Auto-calculate missing tax fields
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
