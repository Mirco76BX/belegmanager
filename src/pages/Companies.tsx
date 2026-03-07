import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

const Companies = () => {
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("companies.title")}</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("companies.add")}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t("companies.noCompanies")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Companies;
