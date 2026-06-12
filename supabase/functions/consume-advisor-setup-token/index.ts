import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function validateConfig(c: Record<string, any>): string | null {
  if (c.datev_berater_nr && !/^\d{4,7}$/.test(String(c.datev_berater_nr))) return "Berater-Nr. muss 4–7 Ziffern haben.";
  if (c.datev_mandanten_nr && !/^\d{1,5}$/.test(String(c.datev_mandanten_nr))) return "Mandanten-Nr. muss 1–5 Ziffern haben.";
  if (c.datev_kontenrahmen && !["SKR03", "SKR04"].includes(String(c.datev_kontenrahmen))) return "Ungültiger Kontenrahmen.";
  if (c.datev_konto_gegenkonto && !/^\d{3,8}$/.test(String(c.datev_konto_gegenkonto))) return "Gegenkonto muss 3–8 Ziffern haben.";
  if (c.datev_sachkontenlaenge != null) {
    const n = Number(c.datev_sachkontenlaenge);
    if (!Number.isInteger(n) || n < 4 || n > 8) return "Sachkontenlänge muss 4–8 sein.";
  }
  if (c.datev_bezeichnung && String(c.datev_bezeichnung).length > 100) return "Bezeichnung zu lang.";
  if (c.datev_diktatkuerzel && String(c.datev_diktatkuerzel).length > 10) return "Diktatkürzel zu lang.";
  if (c.datev_wj_beginn && !/^\d{4}-\d{2}-\d{2}$/.test(String(c.datev_wj_beginn))) return "Ungültiges Datum.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = await req.json().catch(() => null) as
      | { token?: string; mode?: "lookup" | "consume"; config?: Record<string, any> }
      | null;
    if (!body?.token || !body.mode) {
      return json(400, { error_code: "VALIDATION", message: "Token oder Modus fehlt." });
    }

    const tokenHash = await sha256Hex(body.token);
    const { data: tok, error: tokErr } = await admin
      .from("advisor_setup_tokens")
      .select("id, company_id, user_id, advisor_email, invitation_note, expires_at, consumed_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (tokErr) {
      console.error("[consume] token lookup", tokErr);
      return json(500, { error_code: "INTERNAL", message: "Interner Fehler." });
    }
    if (!tok) return json(404, { error_code: "NOT_FOUND", message: "Link ungültig." });
    if (tok.consumed_at) return json(410, { error_code: "ALREADY_CONSUMED", message: "Link wurde bereits verwendet." });
    if (new Date(tok.expires_at).getTime() < Date.now()) {
      return json(410, { error_code: "EXPIRED", message: "Link ist abgelaufen." });
    }

    const { data: company, error: compErr } = await admin
      .from("companies")
      .select("id, name, datev_berater_nr, datev_mandanten_nr, datev_kontenrahmen, datev_konto_gegenkonto, datev_wj_beginn, datev_sachkontenlaenge, datev_bezeichnung, datev_diktatkuerzel")
      .eq("id", tok.company_id)
      .maybeSingle();
    if (compErr || !company) {
      console.error("[consume] company", compErr);
      return json(404, { error_code: "NOT_FOUND", message: "Organisation nicht gefunden." });
    }

    const { data: inviter } = await admin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", tok.user_id)
      .maybeSingle();
    const inviterDisplay = inviter
      ? ([inviter.first_name, inviter.last_name].filter(Boolean).join(" ").trim() || inviter.email || "Mandant")
      : "Mandant";

    if (body.mode === "lookup") {
      const { datev_berater_nr, datev_mandanten_nr, datev_kontenrahmen, datev_konto_gegenkonto, datev_wj_beginn, datev_sachkontenlaenge, datev_bezeichnung, datev_diktatkuerzel } = company;
      return json(200, {
        companyName: company.name,
        inviterDisplay,
        advisorEmail: tok.advisor_email,
        invitationNote: tok.invitation_note,
        expiresAt: tok.expires_at,
        existingConfig: {
          datev_berater_nr, datev_mandanten_nr, datev_kontenrahmen, datev_konto_gegenkonto,
          datev_wj_beginn, datev_sachkontenlaenge, datev_bezeichnung, datev_diktatkuerzel,
        },
      });
    }

    // consume
    const cfg = body.config ?? {};
    const validationErr = validateConfig(cfg);
    if (validationErr) return json(400, { error_code: "VALIDATION", message: validationErr });

    const update: Record<string, any> = {};
    for (const k of ["datev_berater_nr","datev_mandanten_nr","datev_kontenrahmen","datev_konto_gegenkonto","datev_wj_beginn","datev_sachkontenlaenge","datev_bezeichnung","datev_diktatkuerzel"]) {
      if (k in cfg) {
        const v = cfg[k];
        update[k] = v === "" || v == null ? null : (k === "datev_sachkontenlaenge" ? Number(v) : v);
      }
    }

    const { error: upErr } = await admin.from("companies").update(update).eq("id", company.id);
    if (upErr) {
      console.error("[consume] company update", upErr);
      return json(500, { error_code: "INTERNAL", message: "Speichern fehlgeschlagen." });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
    const ua = req.headers.get("user-agent") || null;
    const { error: tokUpErr } = await admin
      .from("advisor_setup_tokens")
      .update({ consumed_at: new Date().toISOString(), consumed_ip: ip, consumed_user_agent: ua })
      .eq("id", tok.id)
      .is("consumed_at", null);
    if (tokUpErr) {
      console.error("[consume] token update", tokUpErr);
      return json(500, { error_code: "INTERNAL", message: "Interner Fehler." });
    }

    return json(200, { ok: true, companyName: company.name });
  } catch (e) {
    console.error("[consume] uncaught", e);
    return json(500, { error_code: "INTERNAL", message: "Interner Fehler." });
  }
});
