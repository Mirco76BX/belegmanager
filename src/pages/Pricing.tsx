import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const Pricing = () => {
  const { subscription, checkSubscription, user } = useAuth();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
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

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: TIERS.relax.price_id },
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

  const plans = [
    {
      id: "free" as const,
      icon: Zap,
      name: "FREE",
      price: "0 €",
      period: lang === "de" ? "/ für immer" : "/ forever",
      features: lang === "de"
        ? ["10 Scans", "Belegverwaltung", "Reisekostenabrechnung"]
        : ["10 Scans", "Receipt management", "Travel expense reports"],
      current: !isRelax,
    },
    {
      id: "relax" as const,
      icon: Crown,
      name: "RELAX",
      price: "12 €",
      period: lang === "de" ? "/ Jahr" : "/ year",
      features: lang === "de"
        ? ["150 Scans / Jahr", "Belegverwaltung", "Reisekostenabrechnung", "Prioritäts-Support"]
        : ["150 Scans / year", "Receipt management", "Travel expense reports", "Priority support"],
      current: isRelax,
    },
  ];

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {lang === "de" ? "Preise" : "Pricing"}
        </h1>
        <p className="text-muted-foreground">
          {lang === "de"
            ? "Wähle den passenden Plan für dich."
            : "Choose the right plan for you."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border-2 p-6 transition-shadow ${
              plan.current
                ? "border-primary shadow-lg ring-2 ring-primary/20"
                : "border-border hover:shadow-md"
            }`}
          >
            {plan.current && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                {lang === "de" ? "Dein Plan" : "Your Plan"}
              </span>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                plan.id === "relax" ? "bg-accent" : "bg-secondary"
              }`}>
                <plan.icon className={`h-5 w-5 ${
                  plan.id === "relax" ? "text-accent-foreground" : "text-secondary-foreground"
                }`} />
              </div>
              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground ml-1">{plan.period}</span>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {plan.id === "relax" && !isRelax && (
              <Button className="w-full" onClick={handleCheckout} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {lang === "de" ? "Jetzt upgraden" : "Upgrade Now"}
              </Button>
            )}

            {plan.id === "relax" && isRelax && (
              <Button variant="outline" className="w-full" onClick={handleManage} disabled={portalLoading}>
                {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {lang === "de" ? "Abo verwalten" : "Manage Subscription"}
              </Button>
            )}

            {plan.id === "free" && !isRelax && (
              <Button variant="outline" className="w-full" disabled>
                {lang === "de" ? "Aktiver Plan" : "Current Plan"}
              </Button>
            )}
          </div>
        ))}
      </div>

      {isRelax && subscription.subscriptionEnd && (
        <p className="text-center text-sm text-muted-foreground">
          {lang === "de" ? "Verlängert sich am" : "Renews on"}{" "}
          {new Date(subscription.subscriptionEnd).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
        </p>
      )}
    </div>
  );
};

export default Pricing;
