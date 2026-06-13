import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertCircle, Building2 } from "lucide-react";

type LookupData = {
  companyName: string;
  inviterDisplay: string;
  advisorEmail: string;
  invitationNote: string | null;
  expiresAt: string;
  existingConfig: {
    datev_berater_nr: string | null;
    datev_mandanten_nr: string | null;
    datev_kontenrahmen: string | null;
    datev_konto_gegenkonto: string | null;
    datev_wj_beginn: string | null;
    datev_sachkontenlaenge: number | null;
    datev_bezeichnung: string | null;
    datev_diktatkuerzel: string | null;
  };
};

const errorTitleFor: Record<string, string> = {
  NOT_FOUND: "Link ungültig",
  EXPIRED: "Link abgelaufen",
  ALREADY_CONSUMED: "Link bereits verwendet",
  VALIDATION: "Eingabefehler",
  INTERNAL: "Etwas ist schiefgelaufen",
};

const AdvisorSetup = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LookupData | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // form state
  const [beraterNr, setBeraterNr] = useState("");
  const [mandantenNr, setMandantenNr] = useState("");
  const [kontenrahmen, setKontenrahmen] = useState<string>("SKR04");
  const [gegenkonto, setGegenkonto] = useState("");
  const [wjBeginn, setWjBeginn] = useState("");
  const [sachkontenlaenge, setSachkontenlaenge] = useState("4");
  const [bezeichnung, setBezeichnung] = useState("");
  const [diktatkuerzel, setDiktatkuerzel] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setErrorCode("NOT_FOUND"); setLoading(false); return; }
      try {
        const { data: res, error } = await supabase.functions.invoke("consume-advisor-setup-token", {
          body: { token, mode: "lookup" },
        });
        if (error) {
          const ctx: any = (error as any).context;
          let body: any = null;
          try { body = ctx && typeof ctx.json === "function" ? await ctx.json() : null; } catch {}
          setErrorCode(body?.error_code || "INTERNAL");
          setErrorMessage(body?.message || null);
        } else {
          const d = res as LookupData;
          setData(d);
          const c = d.existingConfig || {} as any;
          setBeraterNr(c.datev_berater_nr || "");
          setMandantenNr(c.datev_mandanten_nr || "");
          setKontenrahmen(c.datev_kontenrahmen || "SKR04");
          setGegenkonto(c.datev_konto_gegenkonto || "");
          setWjBeginn(c.datev_wj_beginn || "");
          setSachkontenlaenge(c.datev_sachkontenlaenge ? String(c.datev_sachkontenlaenge) : "4");
          setBezeichnung(c.datev_bezeichnung || "");
          setDiktatkuerzel(c.datev_diktatkuerzel || "");
        }
      } catch (e) {
        console.error(e);
        setErrorCode("INTERNAL");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("consume-advisor-setup-token", {
        body: {
          token,
          mode: "consume",
          config: {
            datev_berater_nr: beraterNr.trim() || null,
            datev_mandanten_nr: mandantenNr.trim() || null,
            datev_kontenrahmen: kontenrahmen || null,
            datev_konto_gegenkonto: gegenkonto.trim() || null,
            datev_wj_beginn: wjBeginn || null,
            datev_sachkontenlaenge: parseInt(sachkontenlaenge, 10),
            datev_bezeichnung: bezeichnung.trim() || null,
            datev_diktatkuerzel: diktatkuerzel.trim() || null,
          },
        },
      });
      if (error) {
        const ctx: any = (error as any).context;
        let body: any = null;
        try { body = ctx && typeof ctx.json === "function" ? await ctx.json() : null; } catch {}
        setErrorCode(body?.error_code === "VALIDATION" ? null : body?.error_code || "INTERNAL");
        setErrorMessage(body?.message || "Speichern fehlgeschlagen.");
      } else {
        setSuccess(true);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Netzwerkfehler.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const terminal = errorCode && ["NOT_FOUND", "EXPIRED", "ALREADY_CONSUMED"].includes(errorCode);
  if (terminal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> {errorTitleFor[errorCode]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {errorMessage || "Bitte kontaktieren Sie Ihren Mandanten für einen neuen Link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" /> DATEV-Stammdaten gespeichert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Vielen Dank. Die Daten für <strong>{data?.companyName}</strong> wurden hinterlegt.</p>
            <p className="text-muted-foreground">Dieses Fenster kann nun geschlossen werden.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> DATEV-Stammdaten einrichten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Sie konfigurieren DATEV-Stammdaten für <strong>{data?.companyName}</strong>
              {data?.inviterDisplay && <> – eingeladen von <strong>{data.inviterDisplay}</strong></>}.
            </p>
            {data?.invitationNote && (
              <div className="rounded-md bg-muted p-3 border-l-2 border-primary">
                <p className="text-xs text-muted-foreground mb-1">Notiz vom Mandanten:</p>
                <p className="italic">{data.invitationNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Konfiguration</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Berater-Nr. (4–7 Ziffern)</Label>
                  <Input value={beraterNr} onChange={(e) => setBeraterNr(e.target.value)} placeholder="1234567" inputMode="numeric" />
                </div>
                <div className="space-y-2">
                  <Label>Mandanten-Nr. (1–5 Ziffern)</Label>
                  <Input value={mandantenNr} onChange={(e) => setMandantenNr(e.target.value)} placeholder="12345" inputMode="numeric" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kontenrahmen</Label>
                  <Select value={kontenrahmen} onValueChange={(v) => {
                    setKontenrahmen(v);
                    if (!gegenkonto) setGegenkonto(v === "SKR03" ? "1600" : "3300");
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SKR03">SKR03</SelectItem>
                      <SelectItem value="SKR04">SKR04</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gegenkonto</Label>
                  <Input value={gegenkonto} onChange={(e) => setGegenkonto(e.target.value)} placeholder={kontenrahmen === "SKR03" ? "1600" : "3300"} inputMode="numeric" />
                </div>
              </div>

              <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
                <strong>Wichtig:</strong> Das Gegenkonto ist mandantenspezifisch und sollte mit dem Steuerberater abgestimmt werden.
                Beispiel: <em>3641</em> (Gesellschafter-Verrechnung). <strong>Nicht das Bankkonto wählen</strong> – sonst entstehen
                doppelte Buchungen beim späteren Kontoauszug-Import.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Sachkontenlänge</Label>
                  <Select value={sachkontenlaenge} onValueChange={setSachkontenlaenge}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>WJ-Beginn</Label>
                  <Input type="date" value={wjBeginn} onChange={(e) => setWjBeginn(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bezeichnung</Label>
                  <Input value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Diktatkürzel</Label>
                  <Input value={diktatkuerzel} onChange={(e) => setDiktatkuerzel(e.target.value)} maxLength={10} />
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</> : "Speichern"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvisorSetup;
