// ─────────────────────────────────────────────────────────────────────────
//   request-advisor-setup
// ─────────────────────────────────────────────────────────────────────────
//
//   Erzeugt einen Magic-Link-Token für die Steuerberater-DATEV-Einrichtung
//   einer Company und sendet eine Einladungs-Mail via Postmark.
//
//   Aufruf:
//     POST /functions/v1/request-advisor-setup
//     Authorization: Bearer <user-jwt>
//     {
//       "companyId": "uuid",
//       "advisorEmail": "stb@kanzlei.de",
//       "advisorName": "Tim Färber",            // optional, für Anrede
//       "invitationNote": "Hallo Tim, ..."      // optional
//     }
//
//   Response (200):
//     {
//       "ok": true,
//       "tokenId": "uuid",
//       "expiresAt": "2026-06-18T10:00:00Z"
//     }
//
//   Sicherheit:
//   - Token-Klartext (64 hex chars) existiert nur in der versendeten Mail
//   - In der DB liegt nur SHA-256-Hex-Hash des Tokens
//   - User muss authentifiziert sein und Owner der Company
//   - Rate-Limit: max 5 aktive Tokens pro Company (anti spam/brute force)
//   - Token-TTL: 7 Tage
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ERR = {
  AUTH: "ERR_AUTH",
  VALIDATION: "ERR_VALIDATION",
  NOT_FOUND: "ERR_NOT_FOUND",
  RATE_LIMIT: "ERR_RATE_LIMIT",
  INTERNAL: "ERR_INTERNAL",
} as const;

function errorResponse(code: string, status: number) {
  return new Response(JSON.stringify({ error_code: code }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Generiert einen URL-safen Token: 32 zufällige Bytes als Hex (64 chars) */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256-Hex-Hash eines Strings (für DB-Lookup ohne Klartext-Speicherung) */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Rudimentäre E-Mail-Validierung (kein RFC-konform, aber catcht Tippfehler) */
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Escaped HTML-Sonderzeichen, damit user-input nicht das Template kaputt macht */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Email-Template ──────────────────────────────────────────────────────

function buildMailHtml(opts: {
  advisorName?: string;
  inviterDisplay: string;
  companyName: string;
  magicLink: string;
  invitationNote?: string;
  expiresAtIso: string;
}): string {
  const greeting = opts.advisorName
    ? `Sehr geehrte/r ${escapeHtml(opts.advisorName)},`
    : `Sehr geehrte Damen und Herren,`;
  const noteBlock = opts.invitationNote
    ? `<p style="margin: 16px 0; padding: 12px 16px; background: #f4f6f8; border-left: 3px solid #6366f1; border-radius: 4px;"><em>${escapeHtml(opts.invitationNote)}</em></p>`
    : "";
  const expiresDate = new Date(opts.expiresAtIso).toLocaleString("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BelegManager — DATEV-Einrichtung</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.6;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">BelegManager — DATEV-Einrichtung</h1>
  <p>${greeting}</p>
  <p><strong>${escapeHtml(opts.inviterDisplay)}</strong> hat Sie eingeladen, die DATEV-Stammdaten für <strong>${escapeHtml(opts.companyName)}</strong> in BelegManager einzurichten.</p>
  ${noteBlock}
  <p>BelegManager ist eine mobile Anwendung zur Belegerfassung mit DATEV-Stapel-Export. Damit der Export für Ihren Mandanten korrekt funktioniert, benötigen wir einmalig Ihre Konfiguration: Berater-Nr, Mandanten-Nr, Kontenrahmen, Gegenkonto, Sachkontenlänge und Wirtschaftsjahr-Beginn.</p>
  <p style="margin: 24px 0;">
    <a href="${opts.magicLink}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">DATEV-Stammdaten einrichten</a>
  </p>
  <p style="font-size: 13px; color: #666;">Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br><span style="word-break: break-all;">${opts.magicLink}</span></p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #6b7280;">
    Der Link ist <strong>einmalig nutzbar</strong> und gültig bis <strong>${expiresDate}</strong>. Es wird kein Konto bei BelegManager angelegt, und Sie sehen keine Belege Ihres Mandanten — nur das Konfigurations-Formular.
  </p>
  <p style="font-size: 12px; color: #6b7280;">
    Bei Fragen wenden Sie sich an ${escapeHtml(opts.inviterDisplay)} oder antworten Sie auf diese Mail.
  </p>
  <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">
    Anno 76 GmbH · Hansastr. 30 · 44137 Dortmund · Geschäftsführer: Mirco Michael Grübel · HRB 31615
  </p>
</body>
</html>`;
}

function buildMailText(opts: {
  advisorName?: string;
  inviterDisplay: string;
  companyName: string;
  magicLink: string;
  invitationNote?: string;
  expiresAtIso: string;
}): string {
  const greeting = opts.advisorName
    ? `Sehr geehrte/r ${opts.advisorName},`
    : `Sehr geehrte Damen und Herren,`;
  const noteBlock = opts.invitationNote ? `\n\n"${opts.invitationNote}"\n` : "";
  const expiresDate = new Date(opts.expiresAtIso).toLocaleString("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  });
  return `BelegManager — DATEV-Einrichtung

${greeting}

${opts.inviterDisplay} hat Sie eingeladen, die DATEV-Stammdaten fuer ${opts.companyName} in BelegManager einzurichten.${noteBlock}

BelegManager ist eine mobile Anwendung zur Belegerfassung mit DATEV-Stapel-Export. Damit der Export fuer Ihren Mandanten korrekt funktioniert, benoetigen wir einmalig Ihre Konfiguration: Berater-Nr, Mandanten-Nr, Kontenrahmen, Gegenkonto, Sachkontenlaenge und Wirtschaftsjahr-Beginn.

Bitte klicken Sie auf folgenden Link:
${opts.magicLink}

Der Link ist einmalig nutzbar und gueltig bis ${expiresDate}. Es wird kein Konto bei BelegManager angelegt, und Sie sehen keine Belege Ihres Mandanten — nur das Konfigurations-Formular.

Bei Fragen wenden Sie sich an ${opts.inviterDisplay} oder antworten Sie auf diese Mail.

---
Anno 76 GmbH · Hansastr. 30 · 44137 Dortmund · Geschaeftsfuehrer: Mirco Michael Gruebel · HRB 31615
`;
}

// ── Main Handler ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse(ERR.VALIDATION, 405);
  }

  try {
    // 1) Authentifizierung
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("request-advisor-setup: missing Authorization header");
      return errorResponse(ERR.AUTH, 401);
    }
    const userJwt = authHeader.replace("Bearer ", "");

    // 2) Eingaben parsen + validieren
    const body = await req.json().catch(() => null);
    if (!body) {
      console.error("request-advisor-setup: invalid JSON body");
      return errorResponse(ERR.VALIDATION, 400);
    }

    const { companyId, advisorEmail, advisorName, invitationNote } = body as {
      companyId?: string;
      advisorEmail?: string;
      advisorName?: string;
      invitationNote?: string;
    };

    if (!companyId || typeof companyId !== "string") {
      console.error("request-advisor-setup: companyId missing or invalid");
      return errorResponse(ERR.VALIDATION, 400);
    }
    if (!advisorEmail || typeof advisorEmail !== "string" || !isValidEmail(advisorEmail)) {
      console.error("request-advisor-setup: advisorEmail invalid", { advisorEmail });
      return errorResponse(ERR.VALIDATION, 400);
    }
    if (advisorName && (typeof advisorName !== "string" || advisorName.length > 100)) {
      return errorResponse(ERR.VALIDATION, 400);
    }
    if (invitationNote && (typeof invitationNote !== "string" || invitationNote.length > 500)) {
      return errorResponse(ERR.VALIDATION, 400);
    }

    // 3) Supabase-Clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client mit User-JWT (für Auth-Check und RLS-Filter auf companies)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });

    // 4) User-Identität abrufen
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      console.error("request-advisor-setup: getUser failed", userErr);
      return errorResponse(ERR.AUTH, 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    // 5) Company laden + Ownership prüfen (RLS filtert auf user_id = auth.uid())
    const { data: company, error: companyErr } = await userClient
      .from("companies")
      .select("id, name, user_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyErr) {
      console.error("request-advisor-setup: company query failed", companyErr);
      return errorResponse(ERR.INTERNAL, 500);
    }
    if (!company) {
      console.error("request-advisor-setup: company not found or not owned", { companyId, userId });
      return errorResponse(ERR.NOT_FOUND, 404);
    }

    // 6) Inviter-Display-Name (für Mail)
    const { data: profile } = await userClient
      .from("profiles")
      .select("first_name, last_name, display_name, email")
      .eq("id", userId)
      .maybeSingle();

    const inviterDisplay =
      profile?.display_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      profile?.email ||
      userEmail ||
      "Ein BelegManager-Nutzer";

    // 7) Service-Role-Client für Inserts (umgeht RLS)
    const adminClient = createClient(supabaseUrl, serviceKey);

    // 8) Rate-Limit: max 5 aktive Tokens pro Company
    const { count: activeCount } = await adminClient
      .from("advisor_setup_tokens")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString());

    if ((activeCount ?? 0) >= 5) {
      console.error("request-advisor-setup: rate limit exceeded", { companyId, activeCount });
      return errorResponse(ERR.RATE_LIMIT, 429);
    }

    // 9) Token generieren + hashen
    const token = generateToken();
    const tokenHash = await sha256Hex(token);

    // 10) Token in DB speichern
    const { data: tokenRow, error: insertErr } = await adminClient
      .from("advisor_setup_tokens")
      .insert({
        company_id: companyId,
        user_id: userId,
        token_hash: tokenHash,
        advisor_email: advisorEmail.toLowerCase().trim(),
        invitation_note: invitationNote?.trim() || null,
      })
      .select("id, expires_at")
      .single();

    if (insertErr || !tokenRow) {
      console.error("request-advisor-setup: token insert failed", insertErr);
      return errorResponse(ERR.INTERNAL, 500);
    }

    // 11) Magic-Link bauen
    const origin = req.headers.get("origin") || "https://belegmanager.online";
    const magicLink = `${origin}/advisor-setup/${token}`;

    // 12) Email via Postmark senden
    const postmarkToken = Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "";
    const fromEmail = Deno.env.get("POSTMARK_FROM_EMAIL") ?? "noreply@belegmanager.online";

    if (!postmarkToken) {
      console.error("request-advisor-setup: POSTMARK_SERVER_TOKEN missing");
      return errorResponse(ERR.INTERNAL, 500);
    }

    const mailHtml = buildMailHtml({
      advisorName,
      inviterDisplay,
      companyName: company.name,
      magicLink,
      invitationNote,
      expiresAtIso: tokenRow.expires_at,
    });
    const mailText = buildMailText({
      advisorName,
      inviterDisplay,
      companyName: company.name,
      magicLink,
      invitationNote,
      expiresAtIso: tokenRow.expires_at,
    });

    const postmarkResp = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken,
      },
      body: JSON.stringify({
        From: `BelegManager <${fromEmail}>`,
        To: advisorEmail.trim(),
        ReplyTo: userEmail,
        Subject: `BelegManager — DATEV-Einrichtung für ${company.name}`,
        HtmlBody: mailHtml,
        TextBody: mailText,
        MessageStream: "outbound",
        Metadata: {
          token_id: tokenRow.id,
          company_id: companyId,
          purpose: "advisor_setup",
        },
      }),
    });

    if (!postmarkResp.ok) {
      const errBody = await postmarkResp.text();
      console.error("request-advisor-setup: postmark send failed", { status: postmarkResp.status, errBody });
      // Token wieder löschen, damit kein Dangling-Token in DB bleibt
      await adminClient.from("advisor_setup_tokens").delete().eq("id", tokenRow.id);
      return errorResponse(ERR.INTERNAL, 500);
    }

    // 13) Erfolg
    return new Response(
      JSON.stringify({
        ok: true,
        tokenId: tokenRow.id,
        expiresAt: tokenRow.expires_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("request-advisor-setup: internal error", error);
    return errorResponse(ERR.INTERNAL, 500);
  }
});
