import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, CreditCard, ScanLine, Loader2, Ticket, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string;
  is_tax_advisor: boolean;
  kanzlei: string | null;
}

const Account = () => {
  const { user, subscription, checkSubscription } = useAuth();
  const { lang, tt } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_name, last_name, display_name, email, is_tax_advisor, kanzlei").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data as Profile);
        setFirstName((data as any).first_name || "");
        setLastName((data as any).last_name || "");
        setDisplayName(data.display_name || "");
      }
    });
    supabase.from("receipts").select("id", { count: "exact", head: true }).then(({ count }) => { setScanCount(count ?? 0); });
  }, [user]);

  const profileIncomplete = !firstName.trim() || !lastName.trim();

  const tierConfig = TIERS[subscription.tier] || TIERS.free;
  const maxScans = tierConfig.maxScans === Infinity ? null : tierConfig.maxScans;
  const progress = maxScans ? Math.min((scanCount / maxScans) * 100, 100) : 0;

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(tt({de:"Vorname und Nachname sind erforderlich.", en:"First and last name are required.", tr:"Ad ve soyad gereklidir.", ar:"الاسم الأول واسم العائلة مطلوبان.", ru:"Имя и фамилия обязательны."}));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name: displayName.trim() || null,
    } as any).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success(tt({de:"Profil gespeichert", en:"Profile saved", tr:"Profil kaydedildi", ar:"تم حفظ الملف", ru:"Профиль сохранён"}));
      setProfile(prev => prev ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), display_name: displayName.trim() || null } : prev);
    }
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

      {profileIncomplete && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {tt({
              de: "Bitte vervollständige dein Profil: Vorname und Nachname sind erforderlich.",
              en: "Please complete your profile: first and last name are required.",
              tr: "Lütfen profilinizi tamamlayın: ad ve soyad gereklidir.",
              ar: "يرجى إكمال ملفك الشخصي: الاسم الأول واسم العائلة مطلوبان.",
              ru: "Пожалуйста, заполните профиль: имя и фамилия обязательны.",
            })}
          </p>
        </div>
      )}

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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  {tt({de:"Vorname", en:"First name", tr:"Ad", ar:"الاسم الأول", ru:"Имя"})} <span className="text-destructive">*</span>
                </Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={tt({de:"Max", en:"John", tr:"Ahmet", ar:"أحمد", ru:"Иван"})} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  {tt({de:"Nachname", en:"Last name", tr:"Soyad", ar:"اسم العائلة", ru:"Фамилия"})} <span className="text-destructive">*</span>
                </Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={tt({de:"Mustermann", en:"Doe", tr:"Yılmaz", ar:"محمد", ru:"Иванов"})} className="h-9" />
              </div>
            </div>


            <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {tt({de:"Profil speichern", en:"Save profile", tr:"Profili kaydet", ar:"حفظ الملف", ru:"Сохранить профиль"})}
            </Button>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" />
              {tt({de:"Gutscheincode einlösen", en:"Redeem Coupon", tr:"Kupon Kullan", ar:"استرداد القسيمة", ru:"Погасить купон"})}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {tt({de:"Haben Sie einen Gutscheincode? Geben Sie ihn hier ein, um Ihren Zugang freizuschalten.", en:"Have a coupon code? Enter it here to unlock your access.", tr:"Kupon kodunuz var mı? Erişiminizi açmak için buraya girin.", ar:"هل لديك رمز قسيمة؟ أدخله هنا لفتح وصولك.", ru:"Есть купон? Введите его здесь для активации доступа."})}
            </p>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={tt({de:"Gutscheincode", en:"Coupon code", tr:"Kupon kodu", ar:"رمز القسيمة", ru:"Код купона"})}
                className="h-9 uppercase"
              />
              <Button
                size="sm"
                disabled={couponLoading || !couponCode.trim()}
                onClick={async () => {
                  setCouponLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("redeem-coupon", {
                      body: { code: couponCode.trim() },
                    });
                    if (error) throw error;
                    if (data?.error) {
                      toast.error(data.error);
                    } else {
                      toast.success(tt({de:"Gutschein erfolgreich eingelöst!", en:"Coupon redeemed successfully!", tr:"Kupon başarıyla kullanıldı!", ar:"تم استرداد القسيمة بنجاح!", ru:"Купон успешно погашен!"}));
                      setCouponCode("");
                      await checkSubscription();
                    }
                  } catch (e: any) {
                    toast.error(e.message || "Error");
                  } finally {
                    setCouponLoading(false);
                  }
                }}
              >
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt({de:"Einlösen", en:"Redeem", tr:"Kullan", ar:"استرداد", ru:"Погасить"})}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
