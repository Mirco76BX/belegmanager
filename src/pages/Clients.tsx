import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, Eye, ArrowLeft, Clock, XCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

interface ClientProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

interface ClientReceipt {
  id: string;
  date: string;
  amount: number | null;
  amount_eur: number | null;
  description: string | null;
  organization: string | null;
  receipt_type: string;
  accounting_status: string;
  currency: string;
  vat_amount: number | null;
}

interface Invitation {
  id: string;
  client_email: string;
  status: string;
  created_at: string;
}

type AccountingStatus = "neu" | "geprüft" | "verbucht";

const STATUS_OPTIONS: {
  value: AccountingStatus;
  labelKey: { de: string; en: string };
  pill: string;
}[] = [
  {
    value: "neu",
    labelKey: { de: "Neu", en: "New" },
    pill: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    value: "geprüft",
    labelKey: { de: "Geprüft", en: "Checked" },
    pill: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    value: "verbucht",
    labelKey: { de: "Verbucht", en: "Booked" },
    pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
];

const Clients = () => {
  const { tt, lang } = useLanguage();
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const locale = getLocale(lang);

  const [clients, setClients] = useState<(ClientProfile & { advisor_client_id: string })[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const [viewingClient, setViewingClient] = useState<ClientProfile | null>(null);
  const [clientReceipts, setClientReceipts] = useState<ClientReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isTaxAdvisor = subscription.tier === "tax_advisor";

  const fetchClients = async () => {
    if (!user) return;
    const [linksRes, invRes] = await Promise.all([
      supabase.from("advisor_clients").select("id, client_id").eq("advisor_id", user.id),
      supabase
        .from("advisor_invitations")
        .select("id, client_email, status, created_at")
        .eq("advisor_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    setInvitations((invRes.data || []) as Invitation[]);

    const links = linksRes.data;
    if (!links || links.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    const clientIds = links.map((l) => l.client_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, display_name")
      .in("id", clientIds);

    if (profiles) {
      setClients(
        profiles.map((p) => ({
          ...p,
          advisor_client_id: links.find((l) => l.client_id === p.id)?.id || "",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAdding(true);

    const trimmedEmail = email.toLowerCase().trim();

    if (trimmedEmail === user.email) {
      toast({
        title: tt({ de: "Nicht möglich", en: "Not allowed" }),
        description: tt({ de: "Du kannst dich nicht selbst einladen.", en: "You cannot invite yourself." }),
        variant: "destructive",
      });
      setAdding(false);
      return;
    }

    const existing = invitations.find((i) => i.client_email === trimmedEmail && i.status === "pending");
    if (existing) {
      toast({
        title: tt({ de: "Bereits eingeladen", en: "Already invited" }),
        variant: "destructive",
      });
      setAdding(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    const { error } = await supabase.from("advisor_invitations").insert({
      advisor_id: user.id,
      client_email: trimmedEmail,
      client_id: profile?.id || null,
    } as any);

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({
        title: tt({ de: "Einladung gesendet", en: "Invitation sent" }),
        description: tt({
          de: "Der Mandant muss die Einladung in seinem Konto annehmen.",
          en: "The client must accept the invitation in their account.",
        }),
      });
      setEmail("");
      setAddOpen(false);
      fetchClients();
    }
    setAdding(false);
  };

  const handleRemove = async (linkId: string) => {
    await supabase.from("advisor_clients").delete().eq("id", linkId);
    fetchClients();
    if (viewingClient) setViewingClient(null);
  };

  const handleCancelInvitation = async (invId: string) => {
    await supabase.from("advisor_invitations").delete().eq("id", invId);
    fetchClients();
  };

  const viewReceipts = async (client: ClientProfile) => {
    setViewingClient(client);
    setReceiptsLoading(true);
    setStatusFilter("all");
    const { data } = await supabase
      .from("receipts")
      .select("id, date, amount, amount_eur, description, organization, receipt_type, accounting_status, currency, vat_amount")
      .eq("user_id", client.id)
      .order("date", { ascending: false });
    setClientReceipts((data as ClientReceipt[]) || []);
    setReceiptsLoading(false);
  };

  const handleStatusChange = async (receiptId: string, newStatus: AccountingStatus) => {
    const { error } = await supabase.rpc("update_receipt_accounting_status", {
      _receipt_id: receiptId,
      _status: newStatus,
    });
    if (error) {
      sonnerToast.error(error.message);
    } else {
      setClientReceipts((prev) =>
        prev.map((r) => (r.id === receiptId ? { ...r, accounting_status: newStatus } : r))
      );
    }
  };

  const filteredReceipts =
    statusFilter === "all" ? clientReceipts : clientReceipts.filter((r) => r.accounting_status === statusFilter);

  const clientName = (c: ClientProfile) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || c.display_name || c.email;

  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) return;
    const headers = ["Datum", "Beschreibung", "Organisation", "Betrag", "Betrag EUR", "MwSt.", "Währung", "Typ", "Status"];
    const rows = filteredReceipts.map((r) => [
      r.date,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      `"${(r.organization || "").replace(/"/g, '""')}"`,
      r.amount?.toString() || "",
      r.amount_eur?.toString() || "",
      r.vat_amount?.toString() || "",
      r.currency,
      r.receipt_type,
      r.accounting_status,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `belege_${clientName(viewingClient!)}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    sonnerToast.success(tt({ de: "Export erstellt", en: "Export created" }));
  };

  /* ---------- Gating: nur für Steuerberater ---------- */
  if (!isTaxAdvisor) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-title-3 font-semibold">{tt({ de: "Mandanten", en: "Clients" })}</p>
            <p className="text-subhead text-muted-foreground">
              {tt({
                de: "Diese Funktion ist nur für Steuerberater verfügbar.",
                en: "This feature is only available for tax advisors.",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Detail-View: Belege eines Mandanten ---------- */
  if (viewingClient) {
    const initial = (clientName(viewingClient)[0] || "?").toUpperCase();

    return (
      <div className="animate-fade-in space-y-5 pb-12">
        {/* Back + Header */}
        <button
          onClick={() => setViewingClient(null)}
          className="inline-flex items-center gap-1.5 text-footnote text-primary font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {tt({ de: "Zurück zu Mandanten", en: "Back to clients" })}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-title-2 text-primary font-bold">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
              {tt({ de: "Mandant", en: "Client" })}
            </p>
            <h1 className="text-title-1 md:text-title-1 font-bold tracking-tight truncate">
              {clientName(viewingClient)}
            </h1>
            <p className="text-footnote text-muted-foreground truncate">{viewingClient.email}</p>
          </div>
        </div>

        {/* Status-Filter-Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter("all")}
            className={`shrink-0 rounded-full border px-4 py-2 text-footnote font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted/30"
            }`}
          >
            {tt({ de: "Alle", en: "All" })}{" "}
            <span className="text-caption-1 opacity-70 ml-1">{clientReceipts.length}</span>
          </button>
          {STATUS_OPTIONS.map((s) => {
            const count = clientReceipts.filter((r) => r.accounting_status === s.value).length;
            const active = statusFilter === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(active ? "all" : s.value)}
                className={`shrink-0 rounded-full border px-4 py-2 text-footnote font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground border-primary" : `${s.pill} hover:opacity-80`
                }`}
              >
                {tt(s.labelKey as any)} <span className="text-caption-1 opacity-70 ml-1">{count}</span>
              </button>
            );
          })}
          <div className="ml-auto shrink-0">
            <Button
              variant="outline"
              className="h-11 px-4 text-footnote gap-1.5"
              onClick={handleExportCSV}
              disabled={filteredReceipts.length === 0}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {/* Belege-Liste — Revolut-Pattern */}
        {receiptsLoading ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground text-body">
            {tt({ de: "Laden...", en: "Loading..." })}
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center space-y-2">
            <p className="text-body text-muted-foreground">
              {tt({ de: "Keine Belege vorhanden", en: "No receipts found" })}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {filteredReceipts.map((r) => {
              const eur =
                r.amount_eur != null
                  ? Number(r.amount_eur)
                  : r.currency === "EUR" || r.currency == null
                    ? Number(r.amount ?? 0)
                    : null;
              const eurStr =
                eur != null ? `${eur.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–";
              return (
                <div key={r.id} className="px-4 py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium truncate">
                        {r.description || tt({ de: "Ohne Beschreibung", en: "No description" })}
                      </p>
                      <p className="text-footnote text-muted-foreground truncate">
                        {new Date(r.date).toLocaleDateString(locale)}
                        {r.organization ? ` · ${r.organization}` : ""}
                      </p>
                    </div>
                    <span className="text-body font-mono font-semibold tabular-nums whitespace-nowrap shrink-0">
                      {eurStr}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <Select
                      value={r.accounting_status}
                      onValueChange={(v) => handleStatusChange(r.id, v as AccountingStatus)}
                    >
                      <SelectTrigger className="h-9 w-[150px] text-footnote">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {tt(s.labelKey as any)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Main-View: Mandanten-Liste ---------- */
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="animate-fade-in space-y-6 pb-12 max-w-3xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
            {tt({ de: "Steuerberater", en: "Tax Advisor" })}
          </p>
          <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">
            {tt({ de: "Mandanten", en: "Clients" })}
          </h1>
        </div>
        <Button
          className="h-13 px-5 text-body font-semibold text-primary-foreground gap-2 shrink-0"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">{tt({ de: "Mandant einladen", en: "Invite Client" })}</span>
        </Button>
      </div>

      {/* Sektion: Offene Einladungen */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <div className="px-1">
            <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
              {tt({ de: "Offene Einladungen", en: "Pending Invitations" })}
            </p>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium truncate">{inv.client_email}</p>
                  <p className="text-footnote text-muted-foreground">
                    {tt({ de: "Wartet auf Annahme", en: "Awaiting acceptance" })} ·{" "}
                    {new Date(inv.created_at).toLocaleDateString(locale)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="h-11 w-11 p-0 text-destructive hover:text-destructive hover:bg-destructive/5 shrink-0"
                  onClick={() => handleCancelInvitation(inv.id)}
                  aria-label={tt({ de: "Einladung zurückziehen", en: "Cancel invitation" })}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sektion: Aktive Mandanten */}
      {loading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground text-body">
          {tt({ de: "Laden...", en: "Loading..." })}
        </div>
      ) : clients.length === 0 && pendingInvitations.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-title-3 font-semibold">
              {tt({ de: "Noch keine Mandanten", en: "No clients yet" })}
            </p>
            <p className="text-subhead text-muted-foreground">
              {tt({
                de: "Lade deinen ersten Mandanten ein, um auf seine Belege zugreifen zu können.",
                en: "Invite your first client to access their receipts.",
              })}
            </p>
          </div>
          <Button
            className="h-13 px-6 text-body font-semibold text-primary-foreground gap-2"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-5 w-5" />
            {tt({ de: "Mandant einladen", en: "Invite Client" })}
          </Button>
        </div>
      ) : clients.length > 0 ? (
        <div className="space-y-2">
          <div className="px-1">
            <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
              {tt({ de: "Aktive Mandanten", en: "Active Clients" })}
            </p>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {clients.map((c) => {
              const initial = (clientName(c)[0] || "?").toUpperCase();
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                  <button
                    onClick={() => viewReceipts(c)}
                    className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/15"
                    aria-label={tt({ de: "Belege ansehen", en: "View receipts" })}
                  >
                    <span className="text-headline text-primary font-bold">{initial}</span>
                  </button>
                  <button
                    onClick={() => viewReceipts(c)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body font-medium truncate">{clientName(c)}</p>
                      <span className="px-2 py-0.5 rounded-full text-caption-2 font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {tt({ de: "Aktiv", en: "Active" })}
                      </span>
                    </div>
                    <p className="text-footnote text-muted-foreground truncate">{c.email}</p>
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0"
                      onClick={() => viewReceipts(c)}
                      aria-label={tt({ de: "Belege ansehen", en: "View receipts" })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0 text-destructive hover:text-destructive hover:bg-destructive/5"
                      onClick={() => handleRemove(c.advisor_client_id)}
                      aria-label={tt({ de: "Zugriff entfernen", en: "Remove access" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Add-Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-title-2 font-bold">
              {tt({ de: "Mandant einladen", en: "Invite Client" })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-footnote font-medium">
                {tt({ de: "E-Mail des Mandanten", en: "Client's Email" })}
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mandant@beispiel.de"
                required
                className="h-12 text-body"
              />
              <p className="text-caption-1 text-muted-foreground leading-relaxed">
                {tt({
                  de: "Der Mandant erhält die Einladung in seinem BelegManager-Konto und muss sie annehmen, um dir Lesezugriff auf seine Belege zu geben.",
                  en: "The client will receive the invitation in their BelegManager account and must accept it to grant you read access to their receipts.",
                })}
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-13 text-body font-semibold text-primary-foreground"
              disabled={adding}
            >
              {adding
                ? tt({ de: "Wird gesendet...", en: "Sending..." })
                : tt({ de: "Einladung senden", en: "Send Invitation" })}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
