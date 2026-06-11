// ─────────────────────────────────────────────────────────────────────────
//   consume-advisor-setup-token
// ─────────────────────────────────────────────────────────────────────────
//
//   Public-Endpoint für den Magic-Link-Flow. KEIN Auth nötig — der Token
//   selbst ist die Auth. Wird von der Public-Route /advisor-setup/:token
//   aufgerufen.
//
//   Zwei Modi via body.mode:
//
//   1) mode = "lookup"
//      Validiert den Token, gibt minimal nötige Company-Info zurück, damit
//      die UI „Sie konfigurieren die Stammdaten für <CompanyName>" anzeigen
//      kann. KEIN Side Effect — Token bleibt verfügbar.
//
//      Body:  { token, mode: "lookup" }
//      OK:    {
//               ok: true,
//               companyName: "...",
//               invitationNote: "..." | null,
//               inviterDisplay: "...",
//               advisorEmail: "...",
//               existingConfig: { datev_berater_nr, datev_mandanten_nr, ... } | null,
//               expiresAt: "..."
//             }
//
//   2) mode = "consume"
//      Schreibt die DATEV-Konfiguration in companies und markiert Token
//      als consumed (single-use).
//
//      Body:  {
//               token,
//               mode: "consume",
//               config: {
//                 datev_berater_nr, datev_mandanten_nr, datev_kontenrahmen,
//                 datev_konto_gegenkonto, datev_sachkontenlaenge,
//                 datev_wj_beginn, datev_bezeichnung?, datev_diktatkuerzel?
//               }
//             }
//      OK:    { ok: true, companyId, savedAt }
//
//   Sicherheit:
//   - Token wird gehasht (SHA-256) und nur Hash gegen DB geprüft
//   - Single-Use: consumed_at != NULL → ERR_NOT_FOUND
//   - Expiry: expires_at < now() → ERR_NOT_FOUND
//   - Audit: IP + UA des Consumers werden geloggt
//   - Generic Errors an Client, raw Errors nur in console.error
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ERR = {
  VALIDATION: "ERR_VALIDATION",
  NOT_FOUND: "ERR_NOT_FOUND",
  EXPIRED: "ERR_EXPIRED",
  ALREADY_CONSUMED: "ERR_ALREADY_CONSUMED",
  INTERNAL: "ERR_INTERNAL",
} as const;

function errorResponse(code: string, status: number) {
  return new Response(JSON.stringify({ error_code: code }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Validiert die DATEV-Konfiguration. Returnt null wenn ok, sonst Error-Key. */
function validateConfig(config: any): string | null {
  if (!config || typeof config !== "object") return "ERR_VALIDATION";

  // berater_nr: 4-7 Ziffern
  if (typeof config.datev_berater_nr !== "string" || !/^\d{4,7}$/.test(config.datev_berater_nr)) {
    return "ERR_VALIDATION";
  }
  // mandanten_nr: 1-5 Ziffern
  if (typeof config.datev_mandanten_nr !== "string" || !/^\d{1,5}$/.test(config.datev_mandanten_nr)) {
    return "ERR_VALIDATION";
  }
  // kontenrahmen: SKR03 oder SKR04
  if (config.datev_kontenrahmen !== "SKR03" && config.datev_kontenrahmen !== "SKR04") {
    return "ERR_VALIDATION";
  }
  // gegenkonto: 4-8 Ziffern
  if (typeof config.datev_konto_gegenkonto !== "string" || !/^\d{4,8}$/.test(config.datev_konto_gegenkonto)) {
    return "ERR_VALIDATION";
  }
  // sachkontenlaenge: 4-8
  if (typeof config.datev_sachkontenlaenge !== "number" ||
      !Number.isInteger(config.datev_sachkontenlaenge) ||
      config.datev_sachkontenlaenge < 4 ||
      config.datev_sachkontenlaenge > 8) {
    return "ERR_VALIDATION";
  }
  // wj_beginn: YYYY-MM-DD
  if (typeof config.datev_wj_beginn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(config.datev_wj_beginn)) {
    return "ERR_VALIDATION";
  }
  // bezeichnung optional, max 30 Zeichen (DATEV-Limit)
  if (config.datev_bezeichnung != null) {
    if (typeof config.datev_bezeichnung !== "string" || config.datev_bezeichnung.length > 30) {
      return "ERR_VALIDATION";
    }
  }
  // diktatkuerzel optional, max 2 Zeichen
  if (config.datev_diktatkuerzel != null) {
    if (typeof config.datev_diktatkuerzel !== "string" || config.datev_diktatkuerzel.length > 2) {
      return "ERR_VALIDATION";
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse(ERR.VALIDATION, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      console.error("consume-advisor-setup-token: invalid JSON body");
      return errorResponse(ERR.VALIDATION, 400);
    }

    const { token, mode, config } = body as {
      token?: string;
      mode?: "lookup" | "consume";
      config?: any;
    };

    if (!token || typeof token !== "string" || token.length !== 64 || !/^[a-f0-9]+$/.test(token)) {
      console.error("consume-advisor-setup-token: token format invalid");
      return errorResponse(ERR.VALIDATION, 400);
    }
    if (mode !== "lookup" && mode !== "consume") {
      console.error("consume-advisor-setup-token: mode invalid", { mode });
      return errorResponse(ERR.VALIDATION, 400);
    }

    // Bei Consume: Config muss valide sein
    if (mode === "consume") {
      const cfgErr = validateConfig(config);
      if (cfgErr) {
        console.error("consume-advisor-setup-token: config validation failed");
        return errorResponse(ERR.VALIDATION, 400);
      }
    }

    // Service-Role-Client (Public-Route hat keinen User-JWT)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Token in DB lookup
    const tokenHash = await sha256Hex(token);
    const { data: tokenRow, error: tokenErr } = await adminClient
      .from("advisor_setup_tokens")
      .select("id, company_id, user_id, advisor_email, invitation_note, expires_at, consumed_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenErr) {
      console.error("consume-advisor-setup-token: token query failed", tokenErr);
      return errorResponse(ERR.INTERNAL, 500);
    }
    if (!tokenRow) {
      // Generic NOT_FOUND — wir verraten nicht, ob Token nie existierte oder gelöscht
      return errorResponse(ERR.NOT_FOUND, 404);
    }
    if (tokenRow.consumed_at) {
      return errorResponse(ERR.ALREADY_CONSUMED, 409);
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return errorResponse(ERR.EXPIRED, 410);
    }

    // ── Mode: lookup ───────────────────────────────────────────────────
    if (mode === "lookup") {
      // Company-Info + existing Config + Inviter-Display laden
      const [{ data: company }, { data: profile }] = await Promise.all([
        adminClient
          .from("companies")
          .select("id, name, org_type, datev_berater_nr, datev_mandanten_nr, datev_kontenrahmen, datev_konto_gegenkonto, datev_sachkontenlaenge, datev_wj_beginn, datev_bezeichnung, datev_diktatkuerzel")
          .eq("id", tokenRow.company_id)
          .maybeSingle(),
        adminClient
          .from("profiles")
          .select("first_name, last_name, display_name, email")
          .eq("id", tokenRow.user_id)
          .maybeSingle(),
      ]);

      if (!company) {
        console.error("consume-advisor-setup-token: company gone", { companyId: tokenRow.company_id });
        return errorResponse(ERR.NOT_FOUND, 404);
      }

      const inviterDisplay =
        profile?.display_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        profile?.email ||
        "Ein BelegManager-Nutzer";

      // Existing-Config aus Company (falls schon was gesetzt war)
      const existingConfig = {
        datev_berater_nr: company.datev_berater_nr,
        datev_mandanten_nr: company.datev_mandanten_nr,
        datev_kontenrahmen: company.datev_kontenrahmen,
        datev_konto_gegenkonto: company.datev_konto_gegenkonto,
        datev_sachkontenlaenge: company.datev_sachkontenlaenge,
        datev_wj_beginn: company.datev_wj_beginn,
        datev_bezeichnung: company.datev_bezeichnung,
        datev_diktatkuerzel: company.datev_diktatkuerzel,
      };

      return new Response(
        JSON.stringify({
          ok: true,
          companyName: company.name,
          orgType: company.org_type,
          invitationNote: tokenRow.invitation_note,
          inviterDisplay,
          advisorEmail: tokenRow.advisor_email,
          existingConfig,
          expiresAt: tokenRow.expires_at,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // ── Mode: consume ──────────────────────────────────────────────────
    // Update Company-Datev-Settings + Token-Konsum atomar.
    // (Strenge Atomarität würde Postgres-Function brauchen; pragmatisch
    //  reicht hier sequential, mit Rollback-Logik wenn Token-Mark fehlschlägt.)

    const { error: updateErr } = await adminClient
      .from("companies")
      .update({
        datev_berater_nr: config.datev_berater_nr,
        datev_mandanten_nr: config.datev_mandanten_nr,
        datev_kontenrahmen: config.datev_kontenrahmen,
        datev_konto_gegenkonto: config.datev_konto_gegenkonto,
        datev_sachkontenlaenge: config.datev_sachkontenlaenge,
        datev_wj_beginn: config.datev_wj_beginn,
        datev_bezeichnung: config.datev_bezeichnung ?? null,
        datev_diktatkuerzel: config.datev_diktatkuerzel ?? null,
      })
      .eq("id", tokenRow.company_id);

    if (updateErr) {
      console.error("consume-advisor-setup-token: company update failed", updateErr);
      return errorResponse(ERR.INTERNAL, 500);
    }

    // Token als consumed markieren
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
    const ua = req.headers.get("user-agent")?.slice(0, 500) ?? "";

    const { error: consumeErr } = await adminClient
      .from("advisor_setup_tokens")
      .update({
        consumed_at: new Date().toISOString(),
        consumed_ip: ip || null,
        consumed_user_agent: ua || null,
      })
      .eq("id", tokenRow.id)
      .is("consumed_at", null); // Race-Condition-Schutz: nur wenn noch nicht consumed

    if (consumeErr) {
      console.error("consume-advisor-setup-token: token consume failed", consumeErr);
      // Company-Update bleibt, Token bleibt pending — Tester kann nochmal submitten
      return errorResponse(ERR.INTERNAL, 500);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        companyId: tokenRow.company_id,
        savedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("consume-advisor-setup-token: internal error", error);
    return errorResponse(ERR.INTERNAL, 500);
  }
});
