import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const userId = userData.user.id;

    // Fetch receipts that have a file but no vat_amount yet
    const { data: receipts, error: fetchErr } = await supabase
      .from("receipts")
      .select("id, file_path")
      .eq("user_id", userId)
      .is("vat_amount", null)
      .not("file_path", "is", null);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!receipts || receipts.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No receipts to reprocess" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let processed = 0;
    let errors = 0;

    for (const receipt of receipts) {
      try {
        if (!receipt.file_path) continue;

        // Get signed URL for the image
        const { data: urlData } = await supabase.storage
          .from("receipts")
          .createSignedUrl(receipt.file_path, 120);

        if (!urlData?.signedUrl) continue;

        // Download image and convert to base64
        const imgResponse = await fetch(urlData.signedUrl);
        const blob = await imgResponse.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = blob.type || "image/jpeg";
        const imageBase64 = `data:${mimeType};base64,${base64}`;

        // Call AI to extract VAT info
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                    text: `Look at this receipt image and extract ONLY the VAT/MwSt information. Return ONLY valid JSON:
{
  "vat_amount": number or null (the VAT/MwSt amount in EUR),
  "vat_rate": number or null (the VAT/MwSt percentage, e.g. 19 or 7)
}
Do not include any other text, just the JSON object.`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageBase64 },
                  },
                ],
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for receipt ${receipt.id}: ${aiResponse.status}`);
          errors++;
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        let extracted;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        } catch {
          console.error(`Failed to parse AI response for receipt ${receipt.id}`);
          errors++;
          continue;
        }

        // Update receipt with VAT data
        const updateData: any = {};
        if (extracted.vat_amount != null) updateData.vat_amount = extracted.vat_amount;
        if (extracted.vat_rate != null) updateData.vat_rate = extracted.vat_rate;

        if (Object.keys(updateData).length > 0) {
          await supabase.from("receipts").update(updateData).eq("id", receipt.id);
          processed++;
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error processing receipt ${receipt.id}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ processed, errors, total: receipts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
