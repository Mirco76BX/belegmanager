import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Loader2, Tag, Gem, Building2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

type BillingCycle = "monthly" | "yearly";

const Pricing = () => {
  const { subscription, checkSubscription } = useAuth();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
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

  const relaxPrice = billingCycle === "yearly"
    ? { amount: "12 €", period: lang === "de" ? "/ Jahr" : "/ year", hint: lang === "de" ? "1 €/Monat" : "1 €/month" }
    : { amount: "3 €", period: lang === "de" ? "/ Monat" : "/ month", hint: lang === "de" ? "36 €/Jahr" : "36 €/year" };

  const plans = [
    {
      id: "free" as const,
      icon: Zap,
      name: "FREE",
      price: "0 €",
      period: lang === "de" ? "/ für immer" : "/ forever",
      hint: null,
      features: lang === "de"
        ? ["10 Scans", "Belegverwaltung"]
        : ["10 Scans", "Receipt management"],
      current: subscription.tier === "free",
      priceId: null,
    },
    {
      id: "relax" as const,
      icon: Crown,
      name: "RELAX",
      price: relaxPrice.amount,
      period: relaxPrice.period,
      hint: relaxPrice.hint,
      features: lang === "de"
        ? ["150 Scans / Jahr", "Belegverwaltung", "Reisekosten\u00ADabrechnung"]
        : ["150 Scans / year", "Receipt management", "Expense reports"],
      current: isRelax,
      priceId: billingCycle === "yearly" ? TIERS.relax.yearly.price_id : TIERS.relax.monthly.price_id,
    },
    {
      id: "master" as const,
      icon: Gem,
      name: "MASTER",
      price: "49 €",
      period: lang === "de" ? "/ Jahr" : "/ year",
      hint: lang === "de" ? "~4 €/Monat" : "~4 €/month",
      features: lang === "de"
        ? ["Unbegrenzte Scans", "Belegverwaltung", "Reisekosten\u00ADabrechnung", "Prioritäts\u00ADSupport"]
        : ["Unlimited Scans", "Receipt management", "Expense reports", "Priority support"],
      current: isMaster,
      priceId: TIERS.master.yearly.price_id,
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

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 w-fit mx-auto">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            billingCycle === "monthly"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {lang === "de" ? "Monatlich" : "Monthly"}
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            billingCycle === "yearly"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {lang === "de" ? "Jährlich" : "Yearly"}
          <span className="ml-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {lang === "de" ? "spare 67%" : "save 67%"}
          </span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border-2 p-6 transition-shadow flex flex-col ${
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
                plan.id === "relax" ? "bg-accent" : plan.id === "master" ? "bg-accent" : "bg-secondary"
              }`}>
                <plan.icon className={`h-5 w-5 ${
                  plan.id === "free" ? "text-secondary-foreground" : "text-accent-foreground"
                }`} />
              </div>
              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground ml-1">{plan.period}</span>
            </div>
            <div className="h-5 mb-4">
              {plan.hint && (
                <p className="text-xs text-muted-foreground">({plan.hint})</p>
              )}
            </div>

            <ul className="space-y-3 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">

            {/* Upgrade button for non-current paid plans */}
            {plan.priceId && !plan.current && !isPaid && (
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
            )}

            {/* Manage button for current paid plan */}
            {plan.current && isPaid && (
              <Button variant="outline" className="w-full" onClick={handleManage} disabled={portalLoading}>
                {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {lang === "de" ? "Abo verwalten" : "Manage Subscription"}
              </Button>
            )}

            {/* Current free plan */}
            {plan.id === "free" && plan.current && (
              <Button variant="outline" className="w-full" disabled>
                {lang === "de" ? "Aktiver Plan" : "Current Plan"}
              </Button>
            )}
            </div>
          </div>
        ))}
      </div>

      {isRelax && subscription.subscriptionEnd && (
        <p className="text-center text-sm text-muted-foreground">
          {lang === "de" ? "Verlängert sich am" : "Renews on"}{" "}
          {new Date(subscription.subscriptionEnd).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
        </p>
      )}
      {/* Corporate / Partner Contact Section */}
      <div className="max-w-2xl mx-auto mt-12 rounded-xl border-2 border-border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <Building2 className="h-5 w-5 text-secondary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {lang === "de" ? "Für Firmen, Vereine & Steuerberater" : "For Companies, Associations & Tax Advisors"}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "de"
            ? "Individuelle Konditionen für Ihr Team oder Ihre Organisation. Kontaktieren Sie uns für ein maßgeschneidertes Angebot."
            : "Custom pricing for your team or organization. Contact us for a tailored offer."}
        </p>

        {contactSent ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Check className="h-10 w-10 text-accent" />
            <p className="font-medium text-foreground">
              {lang === "de" ? "Vielen Dank! Wir melden uns bei Ihnen." : "Thank you! We'll get back to you."}
            </p>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setContactSending(true);
              const { error } = await supabase.from("contact_requests").insert({
                name: contactForm.name.trim(),
                organization: contactForm.organization.trim(),
                email: contactForm.email.trim(),
                phone: contactForm.phone.trim() || null,
                org_type: contactForm.orgType,
                message: contactForm.message.trim() || null,
              });
              if (error) {
                toast.error(error.message);
              } else {
                setContactSent(true);
              }
              setContactSending(false);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{lang === "de" ? "Name *" : "Name *"}</Label>
                <Input
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{lang === "de" ? "Organisation *" : "Organization *"}</Label>
                <Input
                  required
                  value={contactForm.organization}
                  onChange={(e) => setContactForm(f => ({ ...f, organization: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{lang === "de" ? "E-Mail *" : "Email *"}</Label>
                <Input
                  required
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(f => ({ ...f, email: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{lang === "de" ? "Telefon" : "Phone"}</Label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Typ *" : "Type *"}</Label>
              <Select value={contactForm.orgType} onValueChange={(v) => setContactForm(f => ({ ...f, orgType: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">{lang === "de" ? "Firma" : "Company"}</SelectItem>
                  <SelectItem value="association">{lang === "de" ? "Verein" : "Association"}</SelectItem>
                  <SelectItem value="tax_advisor">{lang === "de" ? "Steuerberater" : "Tax Advisor"}</SelectItem>
                  <SelectItem value="other">{lang === "de" ? "Sonstiges" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Nachricht (optional)" : "Message (optional)"}</Label>
              <Textarea
                value={contactForm.message}
                onChange={(e) => setContactForm(f => ({ ...f, message: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <Button type="submit" className="w-full sm:w-auto gap-2" disabled={contactSending}>
              {contactSending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              {lang === "de" ? "Anfrage senden" : "Send Request"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Pricing;
