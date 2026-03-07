import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

const ExpenseReport = () => {
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("expense.title")}</h1>
        <Button className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          {t("expense.generate")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("expense.period")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("receipts.noReceipts")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseReport;
