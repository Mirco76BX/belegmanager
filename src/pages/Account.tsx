import { useAuth, TIERS, effectiveScanQuota } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, CreditCard, ScanLine, Loader2, Ticket, AlertTriangle, Shield, CheckCircle2, XCircle, Clock, Tag } from "lucide-react";
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

interface AdvisorInvitation {
  id: string;
  advisor_id: string;
  status: string;
  created_at: string;
  advisor_email?: string;
  advisor_name?: string;
  advisor_kanzlei?: string;
}

interface ActiveAdvisor {
  link_id: string;
  advisor_id: string;
  advisor_email: string;
  advisor_name: string;
  advisor_kanzlei: string | null;
}

const Account = () => {
  const { user, subscription, checkSubscription } = useAuth();
  const { lang, tt } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const scanCount = subscription.scansUsedThisMonth;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Advisor access management
  const [pendingInvitations, setPendingInvitations] = useState<AdvisorInvitation[]>([]);
  const [activeAdvisors, setActiveAdvisors] = useState<ActiveAdvisor[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

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
    // Scan-Count kommt jetzt aus subscription.scansUsedThisMonth (check-subscription),
    // nicht mehr aus receipts.count — Belege löschen umgeht die Quota nicht mehr.
    fetchAdvisorData();
  }, [user]);

  const fetchAdvisorData = async () => {
    if (!user) return;

    // Fetch pending invitations for this user
    const { data: invitations } = await supabase
      .from("advisor_invitations")
      .select("id, advisor_id, status, created_at")
      .eq("status", "pending");

    if (invitations && invitations.length > 0) {
      // Fetch advisor profiles
      const advisorIds = invitations.map(i => i.advisor_id);
      const { data: advisorProfiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, kanzlei")
        .in("id", advisorIds);

      const enriched = invitations.map(inv => {
        const ap = advisorProfiles?.find(p => p.id === inv.advisor_id);
        return {
          ...inv,
          advisor_email: ap?.email || "",
          advisor_name: [ap?.first_name, ap?.last_name].filter(Boolean).join(" ") || ap?.email || "",
          advisor_kanzlei: ap?.kanzlei || undefined,
        };
      });
      setPendingInvitations(enriched as AdvisorInvitation[]);
    } else {
      setPendingInvitations([]);
    }

    // Fetch active advisor links
    const { data: links } = await supabase
      .from("advisor_clients")
      .select("id, advisor_id")
      .eq("client_id", user.id);

    if (links && links.length > 0) {
      const advisorIds = links.map(l => l.advisor_id);
      const { data: advisorProfiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, kanzlei")
        .in("id", advisorIds);

      setActiveAdvisors(links.map(l => {
        const ap = advisorProfiles?.find(p => p.id === l.advisor_id);
        return {
          link_id: l.id,
          advisor_id: l.advisor_id,
          advisor_email: ap?.email || "",
          advisor_name: [ap?.first_name, ap?.last_name].filter(Boolean).join(" ") || ap?.email || "",
          advisor_kanzlei: ap?.kanzlei || null,
        };
      }));
    } else {
      setActiveAdvisors([]);
    }
  };

  const handleRespondInvitation = async (invId: string, action: "accept" | "decline") => {
    setRespondingId(invId);
    try {
      const { data, error } = await supabase.functions.invoke("respond-invitation", {
        body: { invitationId: invId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        action === "accept"
          ? tt({ de: "Einladung angenommen", en: "Invitation accepted", tr: "Davet kabul edildi", ar: "تم قبول الدعوة", ru: "Приглашение принято" })
          : tt({ de: "Einladung abgelehnt", en: "Invitation declined", tr: "Davet reddedildi", ar: "تم رفض الدعوة", ru: "Приглашение отклонено" })
      );
      fetchAdvisorData();
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setRespondingId(null);
    }
  };

  const handleRevokeAccess = async (linkId: string) => {
    const { error } = await supabase.from("advisor_clients").delete().eq("id", linkId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(tt({ de: "Zugriff widerrufen", en: "Access revoked", tr: "Erişim iptal edildi", ar: "تم إلغاء الوصول", ru: "Доступ отозван" }));
      fetchAdvisorData();
    }
  };

  const profileIncomplete = !firstName.trim() || !lastName.trim();
  const tierConfig = TIERS[subscription.tier] || TIERS.free;
  const effectiveMax = effectiveScanQuota(
    subscription.tier,
    subscription.scanQuotaTopup,
    subscription.addonUserSeats
  );
  const maxScans = Number.isFinite(effectiveMax) ? effectiveMax : null;
  const progress = maxScans ? Math.min((scanCount / maxScans) * 100, 100) : 0;

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(tt({ de: "Vorname und Nachname sind erforderlich.", en: "First and last name are required.", tr: "Ad ve soyad gereklidir.", ar: "الاسم الأول واسم العائلة مطلوبان.", ru: "Имя и фамилия обязательны." }));
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
      toast.success(tt({ de: "Profil gespeichert", en: "Profile saved", tr: "Profil kaydedildi", ar: "تم حفظ الملف", ru: "Профиль сохранён" }));
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
    ? tt({ de: "Steuerberater (kostenlos)", en: "Tax Advisor (free)", tr: "Mali Müşavir (ücretsiz)", ar: "مستشار ضريبي (مجاني)", ru: "Налоговый консультант (бесплатно)" })
    : tierConfig.name;

  const hasAdvisorSection = pendingInvitations.length > 0 || activeAdvisors.length > 0;

  return (
    <div className="animate-fade-in space-y-6 pb-24 md:pb-8">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">
        {tt({ de: "Mein Konto", en: "My Account", tr: "Hesabım", ar: "حسابي", ru: "Мой аккаунт" })}
      </h1>

      {profileIncomplete && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {tt({ de: "Bitte vervollständige dein Profil: Vorname und Nachname sind erforderlich.", en: "Please complete your profile: first and last name are required.", tr: "Lütfen profilinizi tamamlayın: ad ve soyad gereklidir.", ar: "يرجى إكمال ملفك الشخصي: الاسم الأول واسم العائلة مطلوبان.", ru: "Пожалуйста, заполните профиль: имя и фамилия обязательны." })}
          </p>
        </div>
      )}

      {/* Pending invitations from advisors */}
      {pendingInvitations.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-warning" />
              {tt({ de: "Offene Steuerberater-Einladungen", en: "Pending Advisor Invitations", tr: "Bekleyen Danışman Davetleri", ar: "دعوات المستشار المعلقة", ru: "Ожидающие приглашения" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {tt({ de: "Folgende Steuerberater möchten auf Ihre Belege zugreifen:", en: "The following tax advisors would like to access your receipts:", tr: "Aşağıdaki mali müşavirler fişlerinize erişmek istiyor:", ar: "المستشارون الضريبيون التاليون يرغبون في الوصول إلى إيصالاتك:", ru: "Следующие налоговые консультанты хотят получить доступ к вашим чекам:" })}
            </p>
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{inv.advisor_name}</p>
                  {inv.advisor_kanzlei && <p className="text-xs text-muted-foreground">🏛️ {inv.advisor_kanzlei}</p>}
                  <p className="text-xs text-muted-foreground">{inv.advisor_email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleRespondInvitation(inv.id, "accept")}
                    disabled={respondingId === inv.id}
                    className="gap-1"
                  >
                    {respondingId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    {tt({ de: "Annehmen", en: "Accept", tr: "Kabul", ar: "قبول", ru: "Принять" })}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespondInvitation(inv.id, "decline")}
                    disabled={respondingId === inv.id}
                    className="gap-1"
                  >
                    <XCircle className="h-3 w-3" />
                    {tt({ de: "Ablehnen", en: "Decline", tr: "Reddet", ar: "رفض", ru: "Отклонить" })}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active advisor connections */}
      {activeAdvisors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              {tt({ de: "Steuerberater-Zugriff", en: "Advisor Access", tr: "Danışman Erişimi", ar: "وصول المستشار", ru: "Доступ консультанта" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {tt({ de: "Diese Steuerberater haben Lesezugriff auf Ihre Belege. Sie können den Zugriff jederzeit widerrufen.", en: "These tax advisors have read access to your receipts. You can revoke access at any time.", tr: "Bu mali müşavirler fişlerinize okuma erişimine sahiptir. Erişimi istediğiniz zaman iptal edebilirsiniz.", ar: "هؤلاء المستشارون الضريبيون لديهم حق الوصول للقراءة إلى إيصالاتك. يمكنك إلغاء الوصول في أي وقت.", ru: "Эти налоговые консультанты имеют доступ к вашим чекам. Вы можете отозвать доступ в любое время." })}
            </p>
            {activeAdvisors.map((adv) => (
              <div key={adv.link_id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{adv.advisor_name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {tt({ de: "Aktiv", en: "Active", tr: "Aktif", ar: "نشط", ru: "Активен" })}
                    </Badge>
                  </div>
                  {adv.advisor_kanzlei && <p className="text-xs text-muted-foreground">🏛️ {adv.advisor_kanzlei}</p>}
                  <p className="text-xs text-muted-foreground">{adv.advisor_email}</p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRevokeAccess(adv.link_id)}
                  className="gap-1 shrink-0"
                >
                  <XCircle className="h-3 w-3" />
                  {tt({ de: "Widerrufen", en: "Revoke", tr: "İptal", ar: "إلغاء", ru: "Отозвать" })}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {tt({ de: "Profil", en: "Profile", tr: "Profil", ar: "الملف الشخصي", ru: "Профиль" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({ de: "E-Mail", en: "Email", tr: "E-posta", ar: "البريد الإلكتروني", ru: "Эл. почта" })}</Label>
              <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
            </div>
            {profile?.is_tax_advisor && profile.kanzlei && (
              <div className="space-y-1.5">
                <Label className="text-sm">{tt({ de: "Kanzlei", en: "Firm", tr: "Büro", ar: "المكتب", ru: "Фирма" })}</Label>
                <p className="text-sm text-muted-foreground">{profile.kanzlei}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  {tt({ de: "Vorname", en: "First name", tr: "Ad", ar: "الاسم الأول", ru: "Имя" })} <span className="text-destructive">*</span>
                </Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={tt({ de: "Max", en: "John", tr: "Ahmet", ar: "أحمد", ru: "Иван" })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  {tt({ de: "Nachname", en: "Last name", tr: "Soyad", ar: "اسم العائلة", ru: "Фамилия" })} <span className="text-destructive">*</span>
                </Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={tt({ de: "Mustermann", en: "Doe", tr: "Yılmaz", ar: "محمد", ru: "Иванов" })} className="h-9" />
              </div>
            </div>
            <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {tt({ de: "Profil speichern", en: "Save profile", tr: "Profili kaydet", ar: "حفظ الملف", ru: "Сохранить профиль" })}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              {tt({ de: "Abo & Verbrauch", en: "Plan & Usage", tr: "Plan & Kullanım", ar: "الخطة والاستخدام", ru: "План и использование" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{tt({ de: "Aktueller Plan", en: "Current plan", tr: "Mevcut plan", ar: "الخطة الحالية", ru: "Текущий план" })}</Label>
              <p className="text-sm font-semibold text-foreground">{tierLabel}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ScanLine className="h-3.5 w-3.5" />
                  {tt({ de: "Scans verbraucht", en: "Scans used", tr: "Kullanılan taramalar", ar: "المسح المستخدم", ru: "Использовано сканов" })}
                </span>
                <span className="font-medium text-foreground">{scanCount}{maxScans ? ` / ${maxScans}` : ""}</span>
              </div>
              {maxScans && <Progress value={progress} className="h-2" />}
              {!maxScans && <p className="text-xs text-muted-foreground">{tt({ de: "Unbegrenzt", en: "Unlimited", tr: "Sınırsız", ar: "غير محدود", ru: "Безлимит" })}</p>}
              {subscription.scanQuotaTopup > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-accent/10 border border-accent/30 px-2.5 py-1.5 text-xs">
                  <span className="text-base leading-none">🎁</span>
                  <span className="text-foreground">
                    {tt({
                      de: `Scan-Pack-Top-up: ${subscription.scanQuotaTopup} verfügbar (kumulativ, läuft nie ab)`,
                      en: `Scan-Pack top-up: ${subscription.scanQuotaTopup} available (cumulative, never expires)`,
                    })}
                  </span>
                </div>
              )}
            </div>
            {subscription.subscriptionEnd && (
              <div className="space-y-1.5">
                <Label className="text-sm">{tt({ de: "Verlängert sich am", en: "Renews on", tr: "Yenileme tarihi", ar: "يتجدد في", ru: "Продление" })}</Label>
                <p className="text-sm text-muted-foreground">{new Date(subscription.subscriptionEnd).toLocaleDateString(getLocale(lang))}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              {(() => {
                const PAID_TIERS = new Set(["basic", "pro", "business", "cfo"]);
                const isPaid = PAID_TIERS.has(subscription.tier);
                return (
                  <>
                    {isPaid ? (
                      <Button variant="outline" size="sm" onClick={handleManage} disabled={portalLoading}>
                        {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {tt({ de: "Abo verwalten", en: "Manage subscription", tr: "Aboneliği yönet", ar: "إدارة الاشتراك", ru: "Управление подпиской" })}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => navigate("/pricing")}>
                        {tt({ de: "Plan upgraden", en: "Upgrade plan", tr: "Planı yükselt", ar: "ترقية الخطة", ru: "Обновить план" })}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="justify-start">
                      <Tag className="h-3.5 w-3.5 mr-2" />
                      {tt({ de: "Plan ändern oder Scan-Pack kaufen", en: "Change plan or buy scan pack" })}
                    </Button>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" />
              {tt({ de: "Gutscheincode einlösen", en: "Redeem Coupon", tr: "Kupon Kullan", ar: "استرداد القسيمة", ru: "Погасить купон" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {tt({ de: "Haben Sie einen Gutscheincode? Geben Sie ihn hier ein, um Ihren Zugang freizuschalten.", en: "Have a coupon code? Enter it here to unlock your access.", tr: "Kupon kodunuz var mı? Erişiminizi açmak için buraya girin.", ar: "هل لديك رمز قسيمة؟ أدخله هنا لفتح وصولك.", ru: "Есть купон? Введите его здесь для активации доступа." })}
            </p>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={tt({ de: "Gutscheincode", en: "Coupon code", tr: "Kupon kodu", ar: "رمز القسيمة", ru: "Код купона" })}
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
                      toast.success(tt({ de: "Gutschein erfolgreich eingelöst!", en: "Coupon redeemed successfully!", tr: "Kupon başarıyla kullanıldı!", ar: "تم استرداد القسيمة بنجاح!", ru: "Купон успешно погашен!" }));
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
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt({ de: "Einlösen", en: "Redeem", tr: "Kullan", ar: "استرداد", ru: "Погасить" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
