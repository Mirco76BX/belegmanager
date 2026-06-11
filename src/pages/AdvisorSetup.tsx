// ─────────────────────────────────────────────────────────────────────────
//   AdvisorSetup — Public-Route /advisor-setup/:token
// ─────────────────────────────────────────────────────────────────────────
//
//   Standalone-Page für Steuerberater. Keine Auth nötig — der Token in der
//   URL ist die Authentifizierung. Nach erfolgreichem Submit wird der
//   Token als consumed markiert und der Steuerberater sieht einen
//   Success-Screen.
//
//   Flow:
//   1) Komponente mountet, ruft consume-advisor-setup-token mit mode=lookup
//   2) Bei Erfolg: Form mit Company-Info + DATEV-Feldern
//   3) Submit ruft mode=consume → speichert + markiert consumed
//   4) Success-Screen
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Mail, Building2 } from "lucide-react";

interface LookupResponse {
  ok: true;
  companyName: string;
  orgType: string;
  invitationNote: string | null;
  inviterDisplay: string;
  advisorEmail: string;
  existingConfig: {
    datev_berater_nr: string | null;
    datev_mandanten_nr: string | null;
    datev_kontenrahmen: string | null;
    datev_konto_gegenkonto: string | null;
    datev_sachkontenlaenge: number | null;
    datev_wj_beginn: string | null;
    datev_bezeichnung: string | null;
    datev_diktatkuerzel: string | null;
  };
  expiresAt: string;
}

type State =
  | { phase: "loading" }
  | { phase: "error"; code: string }
  | { phase: "form"; data: LookupResponse }
  | { phase: "submitting"; data: LookupResponse }
  | { phase: "success"; companyName: string };

const errorMessages: Record<string, { title: string; detail: string }> = {
  ERR_NOT_FOUND: {
    title: "Link nicht gültig",
    detail: "Der Einladungs-Link ist ungültig oder wurde widerrufen. Bitte fordern Sie eine neue Einladung an.",
  },
  ERR_EXPIRED: {
    title: "Link abgelaufen",
    detail: "Der Einladungs-Link ist abgelaufen (Gültigkeit 7 Tage). Bitte bitten Sie um eine neue Einladung.",
  },
  ERR_ALREADY_CONSUMED: {
    title: "Bereits eingelöst",
    detail: "Diese Einladung wurde bereits eingelöst. Falls die DATEV-Stammdaten angepasst werden sollen, lassen Sie sich bitte eine neue Einladung schicken.",
  },
  ERR_VALIDATION: {
    title: "Eingabe ungültig",
    detail: "Bitte prüfen Sie Ihre Eingaben — eine der Pflichtangaben ist nicht im erwarteten Format.",
  },
  ERR_INTERNAL: {
    title: "Technischer Fehler",
    detail: "Beim Speichern ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder antworten Sie auf die Einladungs-Mail.",
  },
};

export default function AdvisorSetup() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ phase: "loading" });

  // Form-State
  const [beraterNr, setBeraterNr] = useState("");
  const [mandantenNr, setMandantenNr] = useState("");
  const [kontenrahmen, setKontenrahmen] = useState<"SKR03" | "SKR04">("SKR04");
  const [gegenkonto, setGegenkonto] = useState("3300");
  const [sachkontenlaenge, setSachkontenlaenge] = useState(4);
  const [wjBeginn, setWjBeginn] = useState(`${new Date().getFullYear()}-01-01`);
  const [bezeichnung, setBezeichnung] = useState("");
  const [diktatkuerzel, setDiktatkuerzel] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lookup beim Mount
  useEffect(() => {
    let cancelled = false;
    const fetchLookup = async () => {
      if (!token || token.length !== 64 || !/^[a-f0-9]+$/.test(token)) {
        if (!cancelled) setState({ phase: "error", code: "ERR_NOT_FOUND" });
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke<LookupResponse>(
          "consume-advisor-setup-token",
          { body: { token, mode: "lookup" } },
        );
        if (cancelled) return;
        if (error || !data?.ok) {
          const code = (error as any)?.context?.error_code ?? "ERR_INTERNAL";
          setState({ phase: "error", code });
          return;
        }
        // Pre-Fill Form mit existingConfig falls vorhanden
        const ec = data.existingConfig;
        if (ec.datev_berater_nr) setBeraterNr(ec.datev_berater_nr);
        if (ec.datev_mandanten_nr) setMandantenNr(ec.datev_mandanten_nr);
        if (ec.datev_kontenrahmen === "SKR03" || ec.datev_kontenrahmen === "SKR04") {
          setKontenrahmen(ec.datev_kontenrahmen);
        }
        if (ec.datev_konto_gegenkonto) setGegenkonto(ec.datev_konto_gegenkonto);
        if (ec.datev_sachkontenlaenge) setSachkontenlaenge(ec.datev_sachkontenlaenge);
        if (ec.datev_wj_beginn) setWjBeginn(ec.datev_wj_beginn);
        if (ec.datev_bezeichnung) setBezeichnung(ec.datev_bezeichnung);
        if (ec.datev_diktatkuerzel) setDiktatkuerzel(ec.datev_diktatkuerzel);
        setState({ phase: "form", data });
      } catch (e) {
        if (!cancelled) setState({ phase: "error", code: "ERR_INTERNAL" });
      }
    };
    fetchLookup();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (state.phase !== "form") return;
    setSubmitError(null);

    // Client-seitige Validierung
    if (!/^\d{4,7}$/.test(beraterNr)) {
      setSubmitError("Berater-Nr muss 4 bis 7 Ziffern haben.");
      return;
    }
    if (!/^\d{1,5}$/.test(mandantenNr)) {
      setSubmitError("Mandanten-Nr muss 1 bis 5 Ziffern haben.");
      return;
    }
    if (!/^\d{4,8}$/.test(gegenkonto)) {
      setSubmitError("Gegenkonto muss 4 bis 8 Ziffern haben.");
      return;
    }
    if (sachkontenlaenge < 4 || sachkontenlaenge > 8) {
      setSubmitError("Sachkontenlänge muss zwischen 4 und 8 liegen.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wjBeginn)) {
      setSubmitError("Wirtschaftsjahr-Beginn muss ein gültiges Datum sein.");
      return;
    }

    const lookupData = state.data;
    setState({ phase: "submitting", data: lookupData });

    try {
      const { data, error } = await supabase.functions.invoke(
        "consume-advisor-setup-token",
        {
          body: {
            token,
            mode: "consume",
            config: {
              datev_berater_nr: beraterNr,
              datev_mandanten_nr: mandantenNr,
              datev_kontenrahmen: kontenrahmen,
              datev_konto_gegenkonto: gegenkonto,
              datev_sachkontenlaenge: sachkontenlaenge,
              datev_wj_beginn: wjBeginn,
              datev_bezeichnung: bezeichnung || undefined,
              datev_diktatkuerzel: diktatkuerzel || undefined,
            },
          },
        },
      );
      if (error || !(data as any)?.ok) {
        const code = (error as any)?.context?.error_code ?? "ERR_INTERNAL";
        setSubmitError(errorMessages[code]?.detail ?? errorMessages.ERR_INTERNAL.detail);
        setState({ phase: "form", data: lookupData });
        return;
      }
      setState({ phase: "success", companyName: lookupData.companyName });
    } catch (e) {
      setSubmitError(errorMessages.ERR_INTERNAL.detail);
      setState({ phase: "form", data: lookupData });
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────

  if (state.phase === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Einladung wird geprüft…</p>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    const msg = errorMessages[state.code] ?? errorMessages.ERR_INTERNAL;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">{msg.title}</h1>
          <p className="text-sm text-slate-600 leading-relaxed">{msg.detail}</p>
        </div>
      </div>
    );
  }

  if (state.phase === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-emerald-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">DATEV-Stammdaten gespeichert</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Die Konfiguration für <strong>{state.companyName}</strong> ist live. Sie können diese Seite schließen.
          </p>
          <p className="text-xs text-slate-500">
            Eine Bestätigung wurde im System hinterlegt. Bei Fragen wenden Sie sich an den Mandanten oder antworten Sie auf die Einladungs-Mail.
          </p>
        </div>
      </div>
    );
  }

  // phase === "form" oder "submitting"
  const data = state.data;
  const submitting = state.phase === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-slate-900">DATEV-Einrichtung</h1>
              <p className="text-sm text-slate-600 mt-1">
                Sie konfigurieren die DATEV-Stammdaten für{" "}
                <strong>{data.companyName}</strong>.
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                Eingeladen von {data.inviterDisplay} · Mail an {data.advisorEmail}
              </div>
            </div>
          </div>
          {data.invitationNote && (
            <div className="mt-4 p-3 bg-slate-50 border-l-4 border-indigo-400 rounded text-sm text-slate-700">
              <span className="font-medium text-slate-900">Nachricht: </span>
              {data.invitationNote}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="berater_nr" className="text-sm font-medium">
                DATEV-Beraternummer <span className="text-red-500">*</span>
              </Label>
              <Input
                id="berater_nr"
                inputMode="numeric"
                placeholder="z. B. 1190123"
                value={beraterNr}
                onChange={(e) => setBeraterNr(e.target.value.replace(/\D/g, "").slice(0, 7))}
                required
                disabled={submitting}
              />
              <p className="text-xs text-slate-500">4–7 Ziffern</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mandanten_nr" className="text-sm font-medium">
                Mandantennummer <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mandanten_nr"
                inputMode="numeric"
                placeholder="z. B. 50001"
                value={mandantenNr}
                onChange={(e) => setMandantenNr(e.target.value.replace(/\D/g, "").slice(0, 5))}
                required
                disabled={submitting}
              />
              <p className="text-xs text-slate-500">1–5 Ziffern</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kontenrahmen" className="text-sm font-medium">
                Kontenrahmen <span className="text-red-500">*</span>
              </Label>
              <Select
                value={kontenrahmen}
                onValueChange={(v) => {
                  setKontenrahmen(v as "SKR03" | "SKR04");
                  // Default-Gegenkonto bei SKR-Wechsel anpassen, wenn noch auf altem Default
                  if (gegenkonto === "1600" || gegenkonto === "3300") {
                    setGegenkonto(v === "SKR04" ? "3300" : "1600");
                  }
                }}
                disabled={submitting}
              >
                <SelectTrigger id="kontenrahmen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SKR03">SKR 03</SelectItem>
                  <SelectItem value="SKR04">SKR 04</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gegenkonto" className="text-sm font-medium">
                Gegenkonto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gegenkonto"
                inputMode="numeric"
                placeholder={kontenrahmen === "SKR04" ? "3300" : "1600"}
                value={gegenkonto}
                onChange={(e) => setGegenkonto(e.target.value.replace(/\D/g, "").slice(0, 8))}
                required
                disabled={submitting}
              />
              <p className="text-xs text-slate-500">
                Verrechnungs-/Verbindlichkeitskonto, <strong>nicht</strong> Bank
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sachkontenlaenge" className="text-sm font-medium">
                Sachkontenlänge <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(sachkontenlaenge)}
                onValueChange={(v) => setSachkontenlaenge(Number(v))}
                disabled={submitting}
              >
                <SelectTrigger id="sachkontenlaenge">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} Stellen
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wj_beginn" className="text-sm font-medium">
                Wirtschaftsjahr-Beginn <span className="text-red-500">*</span>
              </Label>
              <Input
                id="wj_beginn"
                type="date"
                value={wjBeginn}
                onChange={(e) => setWjBeginn(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label htmlFor="bezeichnung" className="text-sm font-medium">
                Stapel-Bezeichnung (optional)
              </Label>
              <Input
                id="bezeichnung"
                placeholder="z. B. Belege"
                value={bezeichnung}
                onChange={(e) => setBezeichnung(e.target.value.slice(0, 30))}
                disabled={submitting}
              />
              <p className="text-xs text-slate-500">Max. 30 Zeichen</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="diktatkuerzel" className="text-sm font-medium">
                Diktatkürzel (optional)
              </Label>
              <Input
                id="diktatkuerzel"
                placeholder="z. B. MG"
                value={diktatkuerzel}
                onChange={(e) => setDiktatkuerzel(e.target.value.slice(0, 2))}
                disabled={submitting}
              />
              <p className="text-xs text-slate-500">Max. 2 Zeichen</p>
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-12" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gespeichert…
              </>
            ) : (
              "Stammdaten speichern"
            )}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Mit dem Speichern bestätigen Sie, dass Sie zur Konfiguration dieser Mandantenstammdaten autorisiert sind. Die Einladung kann anschließend nicht erneut verwendet werden.
          </p>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          BelegManager · Anno 76 GmbH · Hansastr. 30 · 44137 Dortmund
        </p>
      </div>
    </div>
  );
}
