import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Tag, Ticket } from "lucide-react";
import PricingPlans from "@/components/PricingPlans";
import ContactSection from "@/components/ContactSection";
import ReferralManager from "@/pages/ReferralManager";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const Pricing = () => {
  const { subscription, checkSubscription } = useAuth();
  const { lang, tt } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success(tt({de:"Abo erfolgreich abgeschlossen!", en:"Subscription successful!", tr:"Abonelik başarılı!", ar:"تم الاشتراك بنجاح!", ru:"Подписка оформлена!"}));
      checkSubscription();
    }
    if (searchParams.get("canceled") === "true") {
      toast.info(tt({de:"Checkout abgebrochen.", en:"Checkout canceled.", tr:"Ödeme iptal edildi.", ar:"تم إلغاء الدفع.", ru:"Оплата отменена."}));
    }
  }, [searchParams]);

  if (subscription.tier === "tax_advisor") return <ReferralManager />;

  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) { toast.error(e.message || "Checkout failed"); } finally { setLoading(false); }
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
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
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) { toast.error(e.message || "Portal failed"); } finally { setPortalLoading(false); }
  };

  const isRelax = subscription.tier === "relax";
  const isMaster = subscription.tier === "master";
  const isPaid = isRelax || isMaster;

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{tt({de:"Preise", en:"Pricing", tr:"Fiyatlar", ar:"الأسعار", ru:"Тарифы"})}</h1>
        <p className="text-muted-foreground">{tt({de:"Wähle den passenden Plan für dich.", en:"Choose the right plan for you.", tr:"Sana uygun planı seç.", ar:"اختر الخطة المناسبة لك.", ru:"Выберите подходящий план."})}</p>
      </div>

      {/* Coupon code section - only show for free users */}
      {!isPaid && (
        <div className="mx-auto max-w-md rounded-xl border-2 border-dashed border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-foreground">
              {tt({de:"Gutscheincode einlösen", en:"Redeem coupon code", tr:"Kupon kodu kullan", ar:"استرداد رمز القسيمة", ru:"Погасить промокод"})}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder={tt({de:"Code eingeben", en:"Enter code", tr:"Kodu girin", ar:"أدخل الرمز", ru:"Введите код"})}
              className="h-9 text-sm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={(e) => e.key === "Enter" && handleRedeemCoupon()}
            />
            <Button size="sm" onClick={handleRedeemCoupon} disabled={couponLoading || !couponCode.trim()}>
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt({de:"Einlösen", en:"Redeem", tr:"Kullan", ar:"استرداد", ru:"Погасить"})}
            </Button>
          </div>
        </div>
      )}

      <PricingPlans
        currentTier={subscription.tier}
        renderAction={(plan) => {
          if (plan.priceId && !isPaid && subscription.tier !== plan.id) {
            return (
              <Button className="w-full" onClick={() => handleCheckout(plan.priceId!)} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tt({de:"Jetzt upgraden", en:"Upgrade Now", tr:"Şimdi Yükselt", ar:"ترقية الآن", ru:"Обновить сейчас"})}
              </Button>
            );
          }
          if (subscription.tier === plan.id && isPaid) {
            return (
              <Button variant="outline" className="w-full" onClick={handleManage} disabled={portalLoading}>
                {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tt({de:"Abo verwalten", en:"Manage Subscription", tr:"Aboneliği Yönet", ar:"إدارة الاشتراك", ru:"Управление подпиской"})}
              </Button>
            );
          }
          if (plan.id === "free" && subscription.tier === "free") {
            return <Button variant="outline" className="w-full" disabled>{tt({de:"Aktiver Plan", en:"Current Plan", tr:"Mevcut Plan", ar:"الخطة الحالية", ru:"Текущий план"})}</Button>;
          }
          return null;
        }}
      />
      {isPaid && subscription.subscriptionEnd && (
        <p className="text-center text-sm text-muted-foreground">
          {tt({de:"Verlängert sich am", en:"Renews on", tr:"Yenileme tarihi", ar:"يتجدد في", ru:"Продление"})}{" "}
          {new Date(subscription.subscriptionEnd).toLocaleDateString(getLocale(lang))}
        </p>
      )}
      <div className="mt-12"><ContactSection /></div>
    </div>
  );
};

export default Pricing;
