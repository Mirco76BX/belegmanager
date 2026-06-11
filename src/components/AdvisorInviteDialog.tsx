// ─────────────────────────────────────────────────────────────────────────
//   AdvisorInviteDialog
// ─────────────────────────────────────────────────────────────────────────
//
//   Modal-Dialog im Company-Edit, mit dem der Mandant seinen Steuerberater
//   per Magic-Link einlädt, die DATEV-Stammdaten der Company einzurichten.
//
//   Ruft die Edge Function request-advisor-setup. Bei Erfolg zeigt Success-
//   Screen mit "Mail wurde an <stb@kanzlei.de> versendet, läuft am <Datum>
//   ab".
// ─────────────────────────────────────────────────────────────────────────

import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, CheckCircle2, AlertTriangle, Loader2, Info } from "lucide-react";

interface Props {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "success"; advisorEmail: string; expiresAt: string }
  | { phase: "error"; message: string };

const errorByCode: Record<string, string> = {
  ERR_AUTH: "Sitzung abgelaufen — bitte neu einloggen.",
  ERR_VALIDATION: "Bitte prüfe die Eingaben — E-Mail-Adresse oder Notiz haben ein ungültiges Format.",
  ERR_NOT_FOUND: "Diese Organisation wurde nicht gefunden.",
  ERR_RATE_LIMIT: "Es sind bereits 5 aktive Einladungen für diese Organisation offen. Bitte warte, bis eine davon eingelöst oder abgelaufen ist.",
  ERR_INTERNAL: "Beim Versand der Einladung ist ein Fehler aufgetreten. Bitte versuche es in einer Minute erneut.",
};

export function AdvisorInviteDialog({ companyId, companyName, open, onOpenChange }: Props) {
  const { tt } = useLanguage();
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorName, setAdvisorName] = useState("");
  const [invitationNote, setInvitationNote] = useState("");
  const [state, setState] = useState<SubmitState>({ phase: "idle" });

  const reset = () => {
    setAdvisorEmail("");
    setAdvisorName("");
    setInvitationNote("");
    setState({ phase: "idle" });
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(advisorEmail)) {
      setState({ phase: "error", message: errorByCode.ERR_VALIDATION });
      return;
    }
    setState({ phase: "submitting" });

    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: true;
        tokenId: string;
        expiresAt: string;
      }>("request-advisor-setup", {
        body: {
          companyId,
          advisorEmail: advisorEmail.toLowerCase().trim(),
          advisorName: advisorName.trim() || undefined,
          invitationNote: invitationNote.trim() || undefined,
        },
      });

      if (error || !(data as any)?.ok) {
        const code = (error as any)?.context?.error_code ?? "ERR_INTERNAL";
        setState({
          phase: "error",
          message: errorByCode[code] ?? errorByCode.ERR_INTERNAL,
        });
        return;
      }
      setState({
        phase: "success",
        advisorEmail: advisorEmail.toLowerCase().trim(),
        expiresAt: (data as any).expiresAt,
      });
    } catch (e) {
      setState({ phase: "error", message: errorByCode.ERR_INTERNAL });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            {tt({
              de: "Steuerberater einladen",
              en: "Invite tax advisor",
            })}
          </DialogTitle>
        </DialogHeader>

        {state.phase === "success" ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-emerald-900">
                  {tt({
                    de: "Einladung versendet",
                    en: "Invitation sent",
                  })}
                </p>
                <p className="text-sm text-emerald-800 mt-1">
                  {tt({
                    de: `Die Mail mit dem Einrichtungs-Link wurde an ${state.advisorEmail} versendet. Gültig bis ${new Date(state.expiresAt).toLocaleString("de-DE", { dateStyle: "long", timeStyle: "short" })}.`,
                    en: `The setup link has been sent to ${state.advisorEmail}. Valid until ${new Date(state.expiresAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}.`,
                  })}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {tt({
                de: "Sobald der Steuerberater die Daten gespeichert hat, siehst du die Konfiguration direkt hier in den Stammdaten.",
                en: "Once your tax advisor saves the data, you'll see the configuration here in the master data.",
              })}
            </p>
            <Button onClick={() => handleClose(false)} className="w-full">
              {tt({ de: "Schließen", en: "Close" })}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-indigo-600" />
              <p>
                {tt({
                  de: "Dein Steuerberater bekommt eine Mail mit einem einmaligen Link. Er kann damit die DATEV-Stammdaten für ",
                  en: "Your tax advisor receives an email with a one-time link. They can enter the DATEV master data for ",
                })}
                <strong>{companyName}</strong>
                {tt({
                  de: " direkt selbst eintragen — ohne Account, ohne Beleg-Zugriff.",
                  en: " directly — no account, no receipt access.",
                })}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advisor_email" className="text-sm font-medium">
                {tt({
                  de: "E-Mail des Steuerberaters",
                  en: "Tax advisor's email",
                })}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="advisor_email"
                type="email"
                placeholder="stb@kanzlei.de"
                value={advisorEmail}
                onChange={(e) => setAdvisorEmail(e.target.value)}
                required
                disabled={state.phase === "submitting"}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advisor_name" className="text-sm font-medium">
                {tt({
                  de: "Name des Steuerberaters (optional)",
                  en: "Tax advisor's name (optional)",
                })}
              </Label>
              <Input
                id="advisor_name"
                placeholder="z. B. Tim Färber"
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value.slice(0, 100))}
                disabled={state.phase === "submitting"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invitation_note" className="text-sm font-medium">
                {tt({
                  de: "Persönliche Notiz (optional)",
                  en: "Personal note (optional)",
                })}
              </Label>
              <textarea
                id="invitation_note"
                placeholder={tt({
                  de: "Hallo Tim, hier mein BelegManager-Setup für die Bakerix — Konfiguration wie besprochen.",
                  en: "Hi Tim, here's my BelegManager setup for Bakerix — config as discussed.",
                })}
                value={invitationNote}
                onChange={(e) => setInvitationNote(e.target.value.slice(0, 500))}
                disabled={state.phase === "submitting"}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {invitationNote.length}/500
              </p>
            </div>

            {state.phase === "error" && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
                disabled={state.phase === "submitting"}
              >
                {tt({ de: "Abbrechen", en: "Cancel" })}
              </Button>
              <Button type="submit" className="flex-1" disabled={state.phase === "submitting"}>
                {state.phase === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tt({ de: "Wird versendet…", en: "Sending…" })}
                  </>
                ) : (
                  tt({ de: "Einladung senden", en: "Send invitation" })
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
