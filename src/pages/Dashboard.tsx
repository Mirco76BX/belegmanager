import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, FileSpreadsheet, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { t, tt, lang } = useLanguage();
  const { user } = useAuth();
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [monthReceipts, setMonthReceipts] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    Promise.all([
      supabase.from("receipts").select("id, date, amount, description", { count: "exact" }),
      supabase.from("receipts").select("id").gte("date", monthStart),
      supabase.from("companies").select("id", { count: "exact" }),
      supabase.from("receipts").select("id, date, amount, description").order("created_at", { ascending: false }).limit(5),
    ]).then(([allRes, monthRes, compRes, recentRes]) => {
      setTotalReceipts(allRes.count || 0);
      setTotalAmount(allRes.data?.reduce((s, r) => s + (r.amount || 0), 0) || 0);
      setMonthReceipts(monthRes.data?.length || 0);
      setCompanyCount(compRes.count || 0);
      if (recentRes.data) setRecentReceipts(recentRes.data);
    });
  }, [user]);

  const stats = [
    { key: "dashboard.totalReceipts" as const, value: String(totalReceipts), icon: Receipt, color: "text-primary" },
    { key: "dashboard.thisMonth" as const, value: String(monthReceipts), icon: TrendingUp, color: "text-accent" },
    { key: "dashboard.totalAmount" as const, value: `${totalAmount.toFixed(2)} €`, icon: FileSpreadsheet, color: "text-success" },
    { key: "dashboard.companies" as const, value: String(companyCount), icon: Building2, color: "text-warning" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.description || tt({de:"Ohne Beschreibung", en:"No description", tr:"Açıklama yok", ar:"بدون وصف", ru:"Без описания"})}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString(getLocale(lang))}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-medium">
                    {r.amount != null ? `${Number(r.amount).toFixed(2)} €` : "–"}
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
