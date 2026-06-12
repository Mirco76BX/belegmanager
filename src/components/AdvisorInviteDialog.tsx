import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdvisorInviteDialog = ({ companyId, companyName, open, onOpenChange }: Props) => {
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorName, setAdvisorName] = useState("");
  const [invitationNote, setInvitationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successExpires, setSuccessExpires] = useState<string | null>(null);

  const reset = () => {
    setAdvisorEmail(""); setAdvisorName(""); setInvitationNote("");
    setError(null); setSuccessExpires(null); setSubmitting(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
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
              Gültig bis: {new Date(successExpires).toLocaleString("de-DE")}
            </p>
            <Button onClick={() => handleClose(false)} className="w-full">Schließen</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
