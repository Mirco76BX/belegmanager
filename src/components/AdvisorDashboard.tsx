import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Receipt, FileText, TrendingUp, Eye, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ClientSummary {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  receiptCount: number;
  newCount: number;
  totalAmount: number;
  lastActivity: string | null;
}

const AdvisorDashboard = () => {
  const { user } = useAuth();
  const { tt, lang } = useLanguage();
  const locale = getLocale(lang);
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [newReceipts, setNewReceipts] = useState(0);
  const [checkedReceipts, setCheckedReceipts] = useState(0);
  const [bookedReceipts, setBookedReceipts] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Get client links
    const { data: links } = await supabase
      .from("advisor_clients")
      .select("client_id")
      .eq("advisor_id", user.id);

    if (!links || links.length === 0) {
      setLoading(false);
      return;
    }

    const clientIds = links.map((l) => l.client_id);

    // Get profiles and receipts in parallel
    const [profilesRes, receiptsRes] = await Promise.all([
      supabase.from("profiles").select("id, email, display_name, first_name, last_name").in("id", clientIds),
      supabase.from("receipts").select("id, user_id, amount, amount_eur, accounting_status, date, created_at").in("user_id", clientIds),
    ]);

    const profiles = profilesRes.data || [];
    const receipts = (receiptsRes.data || []) as any[];

    let totalNew = 0, totalChecked = 0, totalBooked = 0;

    const summaries: ClientSummary[] = profiles.map((p) => {
      const clientReceipts = receipts.filter((r) => r.user_id === p.id);
      const newCount = clientReceipts.filter((r) => r.accounting_status === "neu").length;
      const checkedCount = clientReceipts.filter((r) => r.accounting_status === "geprüft").length;
      const bookedCount = clientReceipts.filter((r) => r.accounting_status === "verbucht").length;
      totalNew += newCount;
      totalChecked += checkedCount;
      totalBooked += bookedCount;

      const totalAmount = clientReceipts.reduce((s, r) => s + (r.amount_eur ?? r.amount ?? 0), 0);
      const lastActivity = clientReceipts.length > 0
        ? clientReceipts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;

      return {
        ...p,
        receiptCount: clientReceipts.length,
        newCount,
        totalAmount,
        lastActivity,
      };
    });

    // Sort by recent activity
    summaries.sort((a, b) => {
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    setClients(summaries);
    setTotalReceipts(receipts.length);
    setNewReceipts(totalNew);
    setCheckedReceipts(totalChecked);
    setBookedReceipts(totalBooked);
    setLoading(false);
  };

  const clientName = (c: ClientSummary) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || c.display_name || c.email;

  const stats = [
    {
      label: tt({ de: "Mandanten", en: "Clients", tr: "Müşteriler", ar: "العملاء", ru: "Клиенты" }),
      value: clients.length,
      icon: Users,
      color: "text-primary",
    },
    {
      label: tt({ de: "Belege gesamt", en: "Total Receipts", tr: "Toplam Fiş", ar: "إجمالي الإيصالات", ru: "Всего чеков" }),
      value: totalReceipts,
      icon: Receipt,
      color: "text-accent",
    },
    {
      label: tt({ de: "Neue Belege", en: "New Receipts", tr: "Yeni Fişler", ar: "إيصالات جديدة", ru: "Новые чеки" }),
      value: newReceipts,
      icon: TrendingUp,
      color: "text-warning",
    },
    {
      label: tt({ de: "Verbucht", en: "Booked", tr: "Kaydedildi", ar: "تم الحجز", ru: "Проведено" }),
      value: bookedReceipts,
      icon: FileText,
      color: "text-success",
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">{tt({ de: "Laden...", en: "Loading...", tr: "Yükleniyor...", ar: "جارٍ التحميل...", ru: "Загрузка..." })}</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
            {tt({ de: "Steuerberater-Sicht", en: "Tax Advisor View" })}
          </p>
          <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">
            {tt({ de: "Kanzlei-Übersicht", en: "Firm Overview" })}
          </h1>
        </div>
        <Button
          variant="outline"
          className="h-11 px-4 text-body gap-2 shrink-0"
          onClick={() => navigate("/clients")}
        >
          <Users className="h-5 w-5" />
          <span className="hidden sm:inline">{tt({ de: "Mandanten verwalten", en: "Manage Clients" })}</span>
        </Button>
      </div>

      {/* Hero-Stat-Cards — Revolut-Pattern */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-footnote text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl md:text-title-1 font-bold font-mono tabular-nums whitespace-nowrap overflow-hidden">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Belegfluss — Visual Pipeline */}
      {totalReceipts > 0 && (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <h2 className="text-headline">
            {tt({ de: "Belegfluss", en: "Receipt Flow" })}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex-1 min-w-[140px]">
              <div className="text-title-2 font-bold text-amber-700 font-mono tabular-nums">{newReceipts}</div>
              <span className="text-subhead text-amber-800">{tt({ de: "Neu", en: "New" })}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex-1 min-w-[140px]">
              <div className="text-title-2 font-bold text-blue-700 font-mono tabular-nums">{checkedReceipts}</div>
              <span className="text-subhead text-blue-800">{tt({ de: "Geprüft", en: "Checked" })}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex-1 min-w-[140px]">
              <div className="text-title-2 font-bold text-emerald-700 font-mono tabular-nums">{bookedReceipts}</div>
              <span className="text-subhead text-emerald-800">{tt({ de: "Verbucht", en: "Booked" })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mandanten-Aktivität als Revolut-Listen-Pattern */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-headline">
            {tt({ de: "Mandanten-Aktivität", en: "Client Activity" })}
          </h2>
          {clients.length > 0 && (
            <button onClick={() => navigate("/clients")} className="text-footnote text-primary font-medium">
              {tt({ de: "Alle anzeigen", en: "See all" })} →
            </button>
          )}
        </div>
        {clients.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-title-3 font-semibold">{tt({ de: "Noch keine Mandanten verknüpft", en: "No clients linked yet" })}</p>
              <p className="text-subhead text-muted-foreground">
                {tt({ de: "Lade deine ersten Mandanten ein, um loszulegen.", en: "Invite your first clients to get started." })}
              </p>
            </div>
            <Button
              className="h-13 px-6 text-body font-semibold text-primary-foreground"
              onClick={() => navigate("/clients")}
            >
              {tt({ de: "Mandant einladen", en: "Invite Client" })}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate("/clients")}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted text-left"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-headline text-primary">
                    {(clientName(c)[0] || "?").toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-medium truncate">{clientName(c)}</p>
                    {c.newCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-caption-2 font-medium bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        {c.newCount} {tt({ de: "neu", en: "new" })}
                      </span>
                    )}
                  </div>
                  <p className="text-footnote text-muted-foreground truncate mt-0.5">
                    {c.receiptCount} {tt({ de: "Belege", en: "receipts" })} · {c.email}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-body font-semibold font-mono tabular-nums whitespace-nowrap">
                    {c.totalAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorDashboard;
