import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, FileSpreadsheet, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface MonthlyData {
  month: string;
  amount: number;
}

const Dashboard = () => {
  const { t, tt, lang } = useLanguage();
  const { user } = useAuth();
  const locale = getLocale(lang);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [monthReceipts, setMonthReceipts] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));

    // 6 months ago
    const sixMonthsAgo = fmt(new Date(now.getFullYear(), now.getMonth() - 5, 1));

    Promise.all([
      supabase.from("receipts").select("id, date, amount, description", { count: "exact" }),
      supabase.from("receipts").select("id").gte("date", monthStart),
      supabase.from("companies").select("id", { count: "exact" }),
      supabase.from("receipts").select("id, date, amount, description").order("created_at", { ascending: false }).limit(5),
      supabase.from("receipts").select("date, amount, amount_eur").gte("date", sixMonthsAgo),
    ]).then(([allRes, monthRes, compRes, recentRes, chartRes]) => {
      setTotalReceipts(allRes.count || 0);
      setTotalAmount(allRes.data?.reduce((s, r) => s + ((r as any).amount_eur ?? r.amount ?? 0), 0) || 0);
      setMonthReceipts(monthRes.data?.length || 0);
      setCompanyCount(compRes.count || 0);
      if (recentRes.data) setRecentReceipts(recentRes.data);

      // Aggregate by month
      const grouped: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        grouped[key] = 0;
      }
      chartRes.data?.forEach((r) => {
        const key = r.date?.substring(0, 7);
        if (key && key in grouped) grouped[key] += (r.amount || 0);
      });
      setMonthlyData(
        Object.entries(grouped).map(([key, amount]) => {
          const [y, m] = key.split("-");
          const d = new Date(+y, +m - 1);
          return { month: d.toLocaleDateString(locale, { month: "short" }), amount: Math.round(amount * 100) / 100 };
        })
      );
    });
  }, [user]);

  const stats = [
    { key: "dashboard.totalReceipts" as const, value: String(totalReceipts), icon: Receipt, color: "text-primary" },
    { key: "dashboard.thisMonth" as const, value: String(monthReceipts), icon: TrendingUp, color: "text-accent" },
    { key: "dashboard.totalAmount" as const, value: totalAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €", icon: FileSpreadsheet, color: "text-success" },
    { key: "dashboard.companies" as const, value: String(companyCount), icon: Building2, color: "text-warning" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t(stat.key)}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly expenses chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {tt({ de: "Ausgaben der letzten 6 Monate", en: "Expenses – Last 6 Months", tr: "Son 6 Ay Harcamalar", ar: "المصاريف – آخر 6 أشهر", ru: "Расходы за 6 месяцев" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v} €`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value.toLocaleString(locale, { minimumFractionDigits: 2 })} €`, tt({ de: "Betrag", en: "Amount", tr: "Tutar", ar: "المبلغ", ru: "Сумма" })]}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">{tt({ de: "Keine Daten vorhanden", en: "No data available", tr: "Veri yok", ar: "لا توجد بيانات", ru: "Нет данных" })}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("dashboard.recentReceipts")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("receipts.noReceipts")}</p>
          ) : (
            <div className="space-y-3">
              {recentReceipts.map((r) => (
                <div key={r.id} className="flex items-center gap-4 border-b border-border pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.description || tt({de:"Ohne Beschreibung", en:"No description", tr:"Açıklama yok", ar:"بدون وصف", ru:"Без описания"})}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-medium whitespace-nowrap shrink-0">
                    {r.amount != null ? `${Number(r.amount).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
