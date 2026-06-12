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

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomTokenHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("[request-advisor-setup] invoked", {
      hasPostmarkToken: !!Deno.env.get("POSTMARK_SERVER_TOKEN"),
      hasPostmarkFrom: !!Deno.env.get("POSTMARK_FROM_EMAIL"),
      postmarkFromPreview: (Deno.env.get("POSTMARK_FROM_EMAIL") || "").slice(0, 4) + "***",
    });
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      console.error("[request-advisor-setup] no bearer header");
      return json(401, { error_code: "ERR_AUTH", message: "Nicht authentifiziert." });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return json(401, { error_code: "ERR_AUTH", message: "Ungültige Sitzung." });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string | undefined) ?? "";

    const body = await req.json().catch(() => null) as
      | { companyId?: string; advisorEmail?: string; advisorName?: string; invitationNote?: string }
      | null;
    if (!body) return json(400, { error_code: "ERR_VALIDATION", message: "Ungültiger Body." });

    const { companyId, advisorEmail, advisorName, invitationNote } = body;
    if (!companyId || typeof companyId !== "string") {
      return json(400, { error_code: "ERR_VALIDATION", message: "companyId fehlt." });
    }
    if (!advisorEmail || !isEmail(advisorEmail)) {
      return json(400, { error_code: "ERR_VALIDATION", message: "Ungültige E-Mail-Adresse." });
    }
    if (advisorName && advisorName.length > 100) {
      return json(400, { error_code: "ERR_VALIDATION", message: "Name zu lang." });
    }
    if (invitationNote && invitationNote.length > 500) {
      return json(400, { error_code: "ERR_VALIDATION", message: "Notiz zu lang." });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: company, error: compErr } = await admin
      .from("companies")
      .select("id, name, user_id")
      .eq("id", companyId)
      .maybeSingle();
    if (compErr) {
      console.error("[request-advisor-setup] company lookup", compErr);
      return json(500, { error_code: "ERR_INTERNAL", message: "Interner Fehler." });
    }
    if (!company || company.user_id !== userId) {
      return json(404, { error_code: "ERR_NOT_FOUND", message: "Organisation nicht gefunden." });
    }

    const { count: activeCount, error: cntErr } = await admin
      .from("advisor_setup_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString());
    if (cntErr) {
      console.error("[request-advisor-setup] count", cntErr);
      return json(500, { error_code: "ERR_INTERNAL", message: "Interner Fehler." });
    }
    if ((activeCount ?? 0) >= 5) {
      return json(429, {
        error_code: "ERR_RATE_LIMIT",
        message: "Zu viele offene Einladungen. Bitte warten Sie, bis bestehende ablaufen.",
      });
    }

    const token = randomTokenHex(32);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    const { error: insErr } = await admin.from("advisor_setup_tokens").insert({
      company_id: companyId,
      user_id: userId,
      token_hash: tokenHash,
      advisor_email: advisorEmail.toLowerCase(),
      invitation_note: invitationNote?.trim() || null,
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("[request-advisor-setup] insert", insErr);
      return json(500, { error_code: "ERR_INTERNAL", message: "Interner Fehler." });
    }

    const origin = req.headers.get("origin") || "https://belegmanager.online";
    const link = `${origin}/advisor-setup/${token}`;
    const greeting = advisorName ? `Hallo ${advisorName},` : "Hallo,";
    const fromName = userEmail || "Ihr Mandant";
    const noteBlock = invitationNote?.trim()
      ? `<p style="margin:16px 0;padding:12px;background:#f5f5f5;border-left:3px solid #4f46e5;"><em>${invitationNote.trim()}</em></p>`
      : "";

    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
<h2 style="color:#4f46e5;">DATEV-Einrichtung für ${company.name}</h2>
<p>${greeting}</p>
<p>${fromName} bittet Sie, die DATEV-Stammdaten für <strong>${company.name}</strong> einmalig einzurichten – kein Account, kein Login nötig.</p>
${noteBlock}
<p style="margin:24px 0;"><a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">DATEV-Stammdaten einrichten</a></p>
<p style="font-size:12px;color:#666;">Der Link ist 7 Tage gültig und kann nur einmal verwendet werden. Falls Sie diese E-Mail nicht erwartet haben, ignorieren Sie sie bitte.</p>
<p style="font-size:11px;color:#999;word-break:break-all;">${link}</p>
</body></html>`;

    const text = `${greeting}

${fromName} bittet Sie, die DATEV-Stammdaten für ${company.name} einzurichten.
${invitationNote?.trim() ? `\nNotiz: ${invitationNote.trim()}\n` : ""}
Link (7 Tage gültig, einmalig nutzbar):
${link}
`;

    const postmarkToken = Deno.env.get("POSTMARK_SERVER_TOKEN");
    const postmarkFrom = Deno.env.get("POSTMARK_FROM_EMAIL");
    if (!postmarkToken || !postmarkFrom) {
      console.error("[request-advisor-setup] Postmark secrets missing");
      return json(500, { error_code: "ERR_INTERNAL", message: "E-Mail-Versand nicht konfiguriert." });
    }

    const pmRes = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken,
      },
      body: JSON.stringify({
        From: postmarkFrom,
        To: advisorEmail,
        Subject: `DATEV-Einrichtung für ${company.name}`,
        HtmlBody: html,
        TextBody: text,
        MessageStream: "outbound",
      }),
    });
    if (!pmRes.ok) {
      const errText = await pmRes.text();
      console.error("[request-advisor-setup] postmark", pmRes.status, errText);
      return json(500, { error_code: "ERR_INTERNAL", message: "E-Mail konnte nicht gesendet werden." });
    }

    return json(200, { ok: true, expiresAt });
  } catch (e) {
    console.error("[request-advisor-setup] uncaught", e);
    return json(500, { error_code: "ERR_INTERNAL", message: "Interner Fehler." });
  }
});
