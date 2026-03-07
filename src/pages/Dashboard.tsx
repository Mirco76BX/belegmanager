import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, FileSpreadsheet, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { t } = useLanguage();

  const stats = [
    { key: "dashboard.totalReceipts" as const, value: "0", icon: Receipt, color: "text-primary" },
    { key: "dashboard.thisMonth" as const, value: "0", icon: TrendingUp, color: "text-accent" },
    { key: "dashboard.totalAmount" as const, value: "0,00 €", icon: FileSpreadsheet, color: "text-success" },
    { key: "dashboard.companies" as const, value: "0", icon: Building2, color: "text-warning" },
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
          <p className="text-sm text-muted-foreground">{t("receipts.noReceipts")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
