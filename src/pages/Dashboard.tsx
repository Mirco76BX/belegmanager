import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, FileSpreadsheet, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AdvisorDashboard from "@/components/AdvisorDashboard";

interface MonthlyData {
  month: string;
  amount: number;
}

const Dashboard = () => {
  const { t, tt, lang } = useLanguage();
  const { user, subscription } = useAuth();
  const locale = getLocale(lang);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [monthReceipts, setMonthReceipts] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  const isTaxAdvisor = subscription.tier === "tax_advisor";

  useEffect(() => {
    if (!user || isTaxAdvisor) return;
    const now = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    const sixMonthsAgo = fmt(new Date(now.getFullYear(), now.getMonth() - 5, 1));

    Promise.all([
      supabase.from("receipts").select("id, date, amount, amount_eur, description", { count: "exact" }),
      supabase.from("receipts").select("id").gte("date", monthStart),
      supabase.from("companies").select("id", { count: "exact" }),
      supabase.from("receipts").select("id, date, amount, amount_eur, currency, description").order("created_at", { ascending: false }).limit(5),
      supabase.from("receipts").select("date, amount, amount_eur").gte("date", sixMonthsAgo),
    ]).then(([allRes, monthRes, compRes, recentRes, chartRes]) => {
      setTotalReceipts(allRes.count || 0);
      setTotalAmount(allRes.data?.reduce((s, r) => s + ((r as any).amount_eur ?? r.amount ?? 0), 0) || 0);
      setMonthReceipts(monthRes.data?.length || 0);
      setCompanyCount(compRes.count || 0);
      if (recentRes.data) setRecentReceipts(recentRes.data);

      const grouped: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        grouped[key] = 0;
      }
      chartRes.data?.forEach((r: any) => {
        const key = r.date?.substring(0, 7);
        if (key && key in grouped) grouped[key] += (r.amount_eur ?? r.amount ?? 0);
      });
      setMonthlyData(
        Object.entries(grouped).map(([key, amount]) => {
          const [y, m] = key.split("-");
          const d = new Date(+y, +m - 1);
          return { month: d.toLocaleDateString(locale, { month: "short" }), amount: Math.round(amount * 100) / 100 };
        })
      );
    });
  }, [user, isTaxAdvisor]);

  if (isTaxAdvisor) {
    return <AdvisorDashboard />;
  }

  // Hero-Stat-Cards Revolut-Style — tappbar, Hero-Numbers, klare Hierarchie
  const stats = [
    {
      key: "dashboard.totalReceipts" as const,
      value: String(totalReceipts),
      hint: tt({ de: "gesamt", en: "total" }),
      icon: Receipt,
      target: "/receipts",
    },
    {
      key: "dashboard.thisMonth" as const,
      value: String(monthReceipts),
      hint: tt({ de: "diesen Monat", en: "this month" }),
      icon: TrendingUp,
      target: "/receipts",
    },
    {
      key: "dashboard.totalAmount" as const,
      labelSuffix: " (in €)",
      value: totalAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      hint: tt({ de: "Summe gesamt", en: "total amount" }),
      icon: FileSpreadsheet,
      target: "/expense-report",
    },
    {
      key: "dashboard.companies" as const,
      value: String(companyCount),
      hint: tt({ de: "Mandanten", en: "mandants" }),
      icon: Building2,
      target: "/companies",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
          {tt({ de: "Willkommen zurück", en: "Welcome back" })}
        </p>
        <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">{t("dashboard.title")}</h1>
      </div>

      {/* Hero-Stat-Cards — Revolut-Pattern, tappbar */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <a
            key={stat.key}
            href={stat.target}
            className="rounded-2xl border bg-card p-4 text-left active:bg-muted/50 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-footnote text-muted-foreground">
                {t(stat.key)}
                {(stat as any).labelSuffix && (
                  <span className="text-caption-1 text-muted-foreground/60">{(stat as any).labelSuffix}</span>
                )}
              </span>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl md:text-title-1 font-bold font-mono tabular-nums whitespace-nowrap overflow-hidden">{stat.value}</p>
            <p className="text-caption-1 text-muted-foreground mt-1">{stat.hint}</p>
          </a>
        ))}
      </div>

      {/* Chart-Card */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-headline mb-4">
          {tt({ de: "Ausgaben der letzten 6 Monate", en: "Expenses – Last 6 Months" })}
        </h2>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v} €`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value.toLocaleString(locale, { minimumFractionDigits: 2 })} €`, tt({ de: "Betrag", en: "Amount" })]}
              />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-body text-muted-foreground">{tt({ de: "Keine Daten vorhanden", en: "No data available" })}</p>
        )}
      </div>

      {/* Letzte Belege — Revolut-Listen-Pattern */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-headline">{t("dashboard.recentReceipts")}</h2>
          <a href="/receipts" className="text-footnote text-primary font-medium">
            {tt({ de: "Alle anzeigen", en: "See all" })} →
          </a>
        </div>
        {recentReceipts.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <p className="text-body text-muted-foreground">{t("receipts.noReceipts")}</p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {recentReceipts.map((r) => {
              const eur = r.amount_eur != null
                ? Number(r.amount_eur)
                : (r.currency === "EUR" || r.currency == null ? Number(r.amount ?? 0) : null);
              const eurStr = eur != null
                ? `${eur.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                : "–";
              const isForex = r.currency && r.currency !== "EUR" && r.amount_eur != null;
              const forexLine = isForex && r.amount != null
                ? `${Number(r.amount).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${r.currency}`
                : null;
              return (
                <a
                  key={r.id}
                  href="/receipts"
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium truncate">
                      {r.description || tt({ de: "Ohne Beschreibung", en: "No description" })}
                    </p>
                    <p className="text-footnote text-muted-foreground mt-0.5">
                      {new Date(r.date).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                    <span className="text-body font-semibold font-mono tabular-nums whitespace-nowrap">{eurStr}</span>
                    {forexLine && (
                      <span className="text-caption-1 text-muted-foreground font-mono whitespace-nowrap">{forexLine}</span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
