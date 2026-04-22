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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {tt({ de: "Kanzlei-Übersicht", en: "Firm Overview", tr: "Büro Genel Bakışı", ar: "نظرة عامة على المكتب", ru: "Обзор фирмы" })}
        </h1>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/clients")}>
          <Users className="h-4 w-4" />
          {tt({ de: "Mandanten verwalten", en: "Manage Clients", tr: "Müşterileri Yönet", ar: "إدارة العملاء", ru: "Управление клиентами" })}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Receipt flow overview */}
      {totalReceipts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {tt({ de: "Belegfluss", en: "Receipt Flow", tr: "Belge Akışı", ar: "تدفق المستندات", ru: "Документооборот" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-4 py-3 flex-1 min-w-[120px]">
                <div className="text-2xl font-bold text-warning">{newReceipts}</div>
                <span className="text-sm text-muted-foreground">{tt({ de: "Neu", en: "New", tr: "Yeni", ar: "جديد", ru: "Новые" })}</span>
              </div>
              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 flex-1 min-w-[120px]">
                <div className="text-2xl font-bold text-primary">{checkedReceipts}</div>
                <span className="text-sm text-muted-foreground">{tt({ de: "Geprüft", en: "Checked", tr: "Kontrol Edildi", ar: "تم الفحص", ru: "Проверено" })}</span>
              </div>
              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-4 py-3 flex-1 min-w-[120px]">
                <div className="text-2xl font-bold text-success">{bookedReceipts}</div>
                <span className="text-sm text-muted-foreground">{tt({ de: "Verbucht", en: "Booked", tr: "Kaydedildi", ar: "تم الحجز", ru: "Проведено" })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client activity list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {tt({ de: "Mandanten-Aktivität", en: "Client Activity", tr: "Müşteri Etkinliği", ar: "نشاط العملاء", ru: "Активность клиентов" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p>{tt({ de: "Noch keine Mandanten verknüpft", en: "No clients linked yet", tr: "Henüz müşteri bağlanmadı", ar: "لم يتم ربط عملاء بعد", ru: "Клиенты ещё не связаны" })}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/clients")}>
                {tt({ de: "Mandant einladen", en: "Invite Client", tr: "Müşteri Davet Et", ar: "دعوة عميل", ru: "Пригласить клиента" })}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/clients")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{clientName(c)}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.newCount > 0 && (
                      <Badge variant="outline" className="border-warning/50 text-warning text-xs">
                        {c.newCount} {tt({ de: "neu", en: "new", tr: "yeni", ar: "جديد", ru: "нов." })}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {c.receiptCount} {tt({ de: "Belege", en: "receipts", tr: "fiş", ar: "إيصال", ru: "чеков" })}
                    </span>
                    <span className="text-sm font-mono font-medium">
                      {c.totalAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvisorDashboard;
