import { TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Check, Crown, Zap, Gem } from "lucide-react";
import { useState } from "react";

type BillingCycle = "monthly" | "yearly";

interface PricingPlansProps {
  /** If provided, highlights the current plan */
  currentTier?: "free" | "relax" | "master" | "tax_advisor";
  /** Optional action rendered below each plan */
  renderAction?: (plan: { id: "free" | "relax" | "master"; priceId: string | null }) => React.ReactNode;
  compact?: boolean;
}

const PricingPlans = ({ currentTier, renderAction, compact }: PricingPlansProps) => {
  const { lang } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

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
      features: lang === "de" ? ["10 Scans", "Belegverwaltung"] : ["10 Scans", "Receipt management"],
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
      priceId: TIERS.master.yearly.price_id,
    },
  ];

  return (
    <div className="space-y-6">
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

      <div className={`grid gap-6 ${compact ? "md:grid-cols-3" : "md:grid-cols-3 max-w-4xl mx-auto"} items-stretch`}>
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-5 transition-shadow flex flex-col ${
                isCurrent
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "border-border hover:shadow-md"
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  {lang === "de" ? "Dein Plan" : "Your Plan"}
                </span>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  plan.id === "free" ? "bg-secondary" : "bg-accent"
                }`}>
                  <plan.icon className={`h-4 w-4 ${
                    plan.id === "free" ? "text-secondary-foreground" : "text-accent-foreground"
                  }`} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              </div>

              <div className="mb-1">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground ml-1 text-sm">{plan.period}</span>
              </div>
              <div className="h-4 mb-3">
                {plan.hint && <p className="text-xs text-muted-foreground">({plan.hint})</p>}
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {renderAction && <div className="mt-4">{renderAction(plan)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPlans;
