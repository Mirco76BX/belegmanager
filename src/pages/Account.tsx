import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, CreditCard, ScanLine, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Account = () => {
  const { user, subscription } = useAuth();
  const { lang, tt } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; email: string; is_tax_advisor: boolean; kanzlei: string | null } | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, email, is_tax_advisor, kanzlei").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setProfile(data); setDisplayName(data.display_name || ""); }
    });
    supabase.from("receipts").select("id", { count: "exact", head: true }).then(({ count }) => { setScanCount(count ?? 0); });
  }, [user]);

  const tierConfig = TIERS[subscription.tier] || TIERS.free;
  const maxScans = tierConfig.maxScans === Infinity ? null : tierConfig.maxScans;
  const progress = maxScans ? Math.min((scanCount / maxScans) * 100, 100) : 0;

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() || null }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success(tt({de:"Profil gespeichert", en:"Profile saved", tr:"Profil kaydedildi", ar:"تم حفظ الملف", ru:"Профиль сохранён"}));
    setSaving(false);
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) { toast.error(e.message || "Portal failed"); } finally { setPortalLoading(false); }
  };

  const tierLabel = subscription.tier === "tax_advisor"
    ? tt({de:"Steuerberater (kostenlos)", en:"Tax Advisor (free)", tr:"Mali Müşavir (ücretsiz)", ar:"مستشار ضريبي (مجاني)", ru:"Налоговый консультант (бесплатно)"})
    : tierConfig.name;

  return (
    <div className="animate-fade-in space-y-6 pb-24 md:pb-8">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">
        {tt({de:"Mein Konto", en:"My Account", tr:"Hesabım", ar:"حسابي", ru:"Мой аккаунт"})}
      </h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {tt({de:"Profil", en:"Profile", tr:"Profil", ar:"الملف الشخصي", ru:"Профиль"})}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"E-Mail", en:"Email", tr:"E-posta", ar:"البريد الإلكتروني", ru:"Эл. почта"})}</Label>
              <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
            </div>
            {profile?.is_tax_advisor && profile.kanzlei && (
              <div className="space-y-1.5">
                <Label className="text-sm">{tt({de:"Kanzlei", en:"Firm", tr:"Büro", ar:"المكتب", ru:"Фирма"})}</Label>
                <p className="text-sm text-muted-foreground">{profile.kanzlei}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Anzeigename", en:"Display name", tr:"Görünen ad", ar:"الاسم المعروض", ru:"Отображаемое имя"})}</Label>
              <div className="flex gap-2">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={tt({de:"Ihr Name", en:"Your name", tr:"Adınız", ar:"اسمك", ru:"Ваше имя"})} className="h-9" />
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tt({de:"Speichern", en:"Save", tr:"Kaydet", ar:"حفظ", ru:"Сохранить"})}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              {tt({de:"Abo & Verbrauch", en:"Plan & Usage", tr:"Plan & Kullanım", ar:"الخطة والاستخدام", ru:"План и использование"})}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Aktueller Plan", en:"Current plan", tr:"Mevcut plan", ar:"الخطة الحالية", ru:"Текущий план"})}</Label>
              <p className="text-sm font-semibold text-foreground">{tierLabel}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ScanLine className="h-3.5 w-3.5" />
                  {tt({de:"Scans verbraucht", en:"Scans used", tr:"Kullanılan taramalar", ar:"المسح المستخدم", ru:"Использовано сканов"})}
                </span>
                <span className="font-medium text-foreground">{scanCount}{maxScans ? ` / ${maxScans}` : ""}</span>
              </div>
              {maxScans && <Progress value={progress} className="h-2" />}
              {!maxScans && <p className="text-xs text-muted-foreground">{tt({de:"Unbegrenzt", en:"Unlimited", tr:"Sınırsız", ar:"غير محدود", ru:"Безлимит"})}</p>}
            </div>
            {subscription.subscriptionEnd && (
              <div className="space-y-1.5">
                <Label className="text-sm">{tt({de:"Verlängert sich am", en:"Renews on", tr:"Yenileme tarihi", ar:"يتجدد في", ru:"Продление"})}</Label>
                <p className="text-sm text-muted-foreground">{new Date(subscription.subscriptionEnd).toLocaleDateString(getLocale(lang))}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              {(subscription.tier === "relax" || subscription.tier === "master") && (
                <Button variant="outline" size="sm" onClick={handleManage} disabled={portalLoading}>
                  {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tt({de:"Abo verwalten", en:"Manage subscription", tr:"Aboneliği yönet", ar:"إدارة الاشتراك", ru:"Управление подпиской"})}
                </Button>
              )}
              {(subscription.tier === "free" || subscription.tier === "tax_advisor") && (
                <Button size="sm" onClick={() => navigate("/pricing")}>
                  {tt({de:"Plan upgraden", en:"Upgrade plan", tr:"Planı yükselt", ar:"ترقية الخطة", ru:"Обновить план"})}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
