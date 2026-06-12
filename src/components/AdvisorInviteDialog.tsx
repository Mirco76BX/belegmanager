import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, CheckCircle2, Loader2, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TokenRow {
  id: string;
  advisor_email: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

const AdvisorInviteDialog = ({ companyId, companyName, open, onOpenChange }: Props) => {
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorName, setAdvisorName] = useState("");
  const [invitationNote, setInvitationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successExpires, setSuccessExpires] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadTokens = async () => {
    const { data } = await supabase
      .from("advisor_setup_tokens")
      .select("id, advisor_email, expires_at, consumed_at, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5);
    setTokens((data as TokenRow[]) || []);
  };

  useEffect(() => {
    if (open) loadTokens();
  }, [open, companyId]);

  const now = Date.now();
  const pending = tokens.find(t => !t.consumed_at && new Date(t.expires_at).getTime() > now);
  const lastConsumed = tokens.find(t => !!t.consumed_at);

  const reset = () => {
    setAdvisorEmail(""); setAdvisorName(""); setInvitationNote("");
    setError(null); setSuccessExpires(null); setSubmitting(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    const { error: delErr } = await supabase.from("advisor_setup_tokens").delete().eq("id", id);
    setRevoking(null);
    if (delErr) {
      setError("Widerruf fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }
    await loadTokens();
  };

  const errorMessageFor = (code?: string, fallback?: string) => {
    switch (code) {
      case "ERR_AUTH": return "Sitzung abgelaufen. Bitte neu anmelden.";
      case "ERR_VALIDATION": return fallback || "Bitte Eingaben prüfen.";
      case "ERR_NOT_FOUND": return "Organisation nicht gefunden.";
      case "ERR_RATE_LIMIT": return "Zu viele offene Einladungen. Bitte warten Sie, bis welche ablaufen.";
      case "ERR_INTERNAL":
      default: return fallback || "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(advisorEmail)) {
      setError("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("request-advisor-setup", {
        body: {
          companyId,
          advisorEmail: advisorEmail.trim(),
          advisorName: advisorName.trim() || undefined,
          invitationNote: invitationNote.trim() || undefined,
        },
      });
      if (invokeErr) {
        const ctx: any = (invokeErr as any).context;
        let body: any = null;
        try { body = ctx && typeof ctx.json === "function" ? await ctx.json() : null; } catch {}
        setError(errorMessageFor(body?.error_code, body?.message));
        return;
      }
      if (data?.expiresAt) setSuccessExpires(data.expiresAt);
      else setSuccessExpires(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString());
      loadTokens();
    } catch (err) {
      console.error(err);
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Steuerberater einladen
          </DialogTitle>
          <DialogDescription>
            Für <strong>{companyName}</strong> – der Berater erhält einen einmaligen Link (7 Tage gültig), ohne Account und ohne Beleg-Zugriff.
          </DialogDescription>
        </DialogHeader>

        {successExpires ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="font-medium">Einladung versendet.</p>
            <p className="text-sm text-muted-foreground">
              Gültig bis: {fmt(successExpires)}
            </p>
            <Button onClick={() => handleClose(false)} className="w-full">Schließen</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(pending || lastConsumed) && (
              <div className="space-y-2">
                {pending && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-amber-700 dark:text-amber-200">
                          Du hast bereits <strong>1 aktive Einladung</strong> an{" "}
                          <span className="break-all font-medium">{pending.advisor_email}</span>, gültig bis{" "}
                          <strong>{fmt(pending.expires_at)}</strong>. Eine erneute Einladung erstellt einen neuen Link — der alte bleibt aber gültig, bis er eingelöst oder widerrufen wird.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleRevoke(pending.id)}
                          disabled={revoking === pending.id}
                        >
                          {revoking === pending.id ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Widerrufen…</>
                          ) : (
                            <><XCircle className="h-3 w-3" /> Widerrufen</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {lastConsumed && (
                  <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                      <p className="text-emerald-700 dark:text-emerald-200">
                        Letzte Einladung wurde am <strong>{fmt(lastConsumed.consumed_at!)}</strong> eingelöst und die DATEV-Stammdaten gespeichert.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>E-Mail des Steuerberaters <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={advisorEmail}
                onChange={(e) => setAdvisorEmail(e.target.value)}
                placeholder="berater@kanzlei.de"
                required
                maxLength={254}
              />
            </div>
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                placeholder="Herr/Frau Muster"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Persönliche Notiz (optional)</Label>
              <Textarea
                value={invitationNote}
                onChange={(e) => setInvitationNote(e.target.value)}
                placeholder="z.B. Bitte SKR04 verwenden, Gegenkonto ist 3641."
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{invitationNote.length}/500</p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…</>
              ) : (
                <><Mail className="h-4 w-4" /> Einladung senden</>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdvisorInviteDialog;
