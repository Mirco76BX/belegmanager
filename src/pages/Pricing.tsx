import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Tag } from "lucide-react";
import PricingPlans from "@/components/PricingPlans";
import ContactSection from "@/components/ContactSection";
import ReferralManager from "@/pages/ReferralManager";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const Pricing = () => {
  const { subscription, checkSubscription } = useAuth();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success(lang === "de" ? "Abo erfolgreich abgeschlossen!" : "Subscription successful!");
      checkSubscription();
    }
    if (searchParams.get("canceled") === "true") {
      toast.info(lang === "de" ? "Checkout abgebrochen." : "Checkout canceled.");
    }
  }, [searchParams]);

  // Tax advisors see the referral manager instead of pricing
  if (subscription.tier === "tax_advisor") {
    return <ReferralManager />;
  }

  const handleCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, couponCode: couponCode.trim() || undefined },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Portal failed");
    } finally {
      setPortalLoading(false);
    }
  };

  const isRelax = subscription.tier === "relax";
  const isMaster = subscription.tier === "master";
  const isPaid = isRelax || isMaster;

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {lang === "de" ? "Preise" : "Pricing"}
        </h1>
        <p className="text-muted-foreground">
          {lang === "de" ? "Wähle den passenden Plan für dich." : "Choose the right plan for you."}
        </p>
      </div>

      <PricingPlans
        currentTier={subscription.tier}
        renderAction={(plan) => {
          if (plan.priceId && !isPaid && subscription.tier !== plan.id) {
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={lang === "de" ? "Gutscheincode" : "Coupon code"}
                    className="h-9 text-sm"
                  />
                </div>
                <Button className="w-full" onClick={() => handleCheckout(plan.priceId!)} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {lang === "de" ? "Jetzt upgraden" : "Upgrade Now"}
                </Button>
              </div>
            );
          }
          if (subscription.tier === plan.id && isPaid) {
            return (
              <Button variant="outline" className="w-full" onClick={handleManage} disabled={portalLoading}>
                {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {lang === "de" ? "Abo verwalten" : "Manage Subscription"}
              </Button>
            );
          }
          if (plan.id === "free" && subscription.tier === "free") {
            return (
              <Button variant="outline" className="w-full" disabled>
                {lang === "de" ? "Aktiver Plan" : "Current Plan"}
              </Button>
            );
          }
          return null;
        }}
      />

      {isRelax && subscription.subscriptionEnd && (
        <p className="text-center text-sm text-muted-foreground">
          {lang === "de" ? "Verlängert sich am" : "Renews on"}{" "}
          {new Date(subscription.subscriptionEnd).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
        </p>
      )}

      <div className="mt-12">
        <ContactSection />
      </div>
    </div>
  );
};

export default Pricing;
