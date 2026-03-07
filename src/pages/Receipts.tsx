import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Receipt } from "lucide-react";

const Receipts = () => {
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("receipts.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            {t("receipts.upload")}
          </Button>
          <Button className="gap-2">
            <Camera className="h-4 w-4" />
            {t("receipts.camera")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Receipt className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t("receipts.noReceipts")}</p>
          <p className="mt-1 text-sm text-muted-foreground/60">{t("receipts.scanHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Receipts;
