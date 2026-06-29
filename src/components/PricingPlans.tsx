import { useLanguage } from "@/i18n/LanguageContext";
import { Check, Crown, Zap, Gem, Briefcase, Sparkles } from "lucide-react";
import { useState } from "react";

type BillingCycle = "monthly" | "yearly";
export type PricingPlanId = "free" | "basic" | "pro" | "business" | "cfo";

// Stripe Sandbox Price-IDs (Sub-Step 8: durch Live-IDs ersetzen)
export const PRICE_IDS = {
  basic: {
    monthly: "price_1TjeMu2MxelQLIKMrfmQ12yU",
    yearly:  "price_1TjeMv2MxelQLIKMOYBv5vGR",
  },
  pro: {
    monthly: "price_1TjeMv2MxelQLIKMlRPGKUvJ",
    yearly:  "price_1TjeMu2MxelQLIKMq8A2R9aO",
  },
  business: {
    monthly: "price_1TjeMw2MxelQLIKMXl3bmMnh",
    yearly:  "price_1TjeMv2MxelQLIKMEf5tjGzd",
  },
  cfo: {
    monthly: "price_1TjeMu2MxelQLIKMZWRwuPOR",
    yearly: null as string | null,
  },
  business_addon_user: {
    monthly: "price_1TjeMv2MxelQLIKMGCF3vtMQ",
    yearly:  "price_1TjeMv2MxelQLIKMkZtPVjrE",
  },
  scan_pack_50: "price_1TjeMv2MxelQLIKMliIzW9Od",
} as const;

interface PricingPlansProps {
  currentTier?: PricingPlanId | "tax_advisor";
  renderAction?: (plan: { id: PricingPlanId; priceId: string | null }) => React.ReactNode;
  renderScanPackAction?: (priceId: string) => React.ReactNode;
}

const PricingPlans = ({ currentTier, renderAction, renderScanPackAction }: PricingPlansProps) => {
  const { tt } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const yearly = billingCycle === "yearly";

  const periodLabel = yearly
    ? tt({ de: "/ Jahr", en: "/ year" })
    : tt({ de: "/ Monat", en: "/ month" });

  const plans = [
    {
      id: "free" as const, icon: Zap, name: "FREE",
      price: "0 €",
      period: tt({ de: "/ für immer", en: "/ forever" }),
      hint: null as string | null,
      features: [
        tt({ de: "7 Scans/Monat", en: "7 scans/month" }),
        tt({ de: "Belegverwaltung", en: "Receipt management" }),
      ],
      priceId: null as string | null,
    },
    {
      id: "basic" as const, icon: Zap, name: "BASIC",
      price: yearly ? "15 €" : "1,99 €",
      period: periodLabel,
      hint: yearly
        ? tt({ de: "~1,25 €/Monat — 37 % sparen", en: "~1.25 €/month — save 37 %" })
        : tt({ de: "23,88 €/Jahr", en: "23.88 €/year" }),
      features: [
        tt({ de: "50 Scans/Monat", en: "50 scans/month" }),
        tt({ de: "Belegverwaltung", en: "Receipt management" }),
        tt({ de: "Reisekosten", en: "Travel expenses" }),
        tt({ de: "PDF-Report", en: "PDF report" }),
      ],
      priceId: yearly ? PRICE_IDS.basic.yearly : PRICE_IDS.basic.monthly,
    },
    {
      id: "pro" as const, icon: Crown, name: "PRO",
      price: yearly ? "79 €" : "9,99 €",
      period: periodLabel,
      hint: yearly
        ? tt({ de: "~6,58 €/Monat — 34 % sparen", en: "~6.58 €/month — save 34 %" })
        : tt({ de: "119,88 €/Jahr", en: "119.88 €/year" }),
      features: [
        tt({ de: "Alles aus BASIC", en: "Everything from BASIC" }),
        tt({ de: "200 Scans/Monat", en: "200 scans/month" }),
        tt({ de: "DATEV-Export", en: "DATEV export" }),
        tt({ de: "GoBD-Festschreibung", en: "GoBD lock" }),
        tt({ de: "Multi-Mandant", en: "Multi-client" }),
      ],
      priceId: yearly ? PRICE_IDS.pro.yearly : PRICE_IDS.pro.monthly,
    },
    {
      id: "business" as const, icon: Briefcase, name: "BUSINESS",
      price: yearly ? "159 €" : "19,99 €",
      period: periodLabel,
      hint: yearly
        ? tt({ de: "~13,25 €/Monat — 34 % sparen", en: "~13.25 €/month — save 34 %" })
        : tt({ de: "239,88 €/Jahr", en: "239.88 €/year" }),
      features: [
        tt({ de: "Alles aus PRO", en: "Everything from PRO" }),
        tt({ de: "1.000 Scans/Monat (Team-Pool)", en: "1,000 scans/month (team pool)" }),
        tt({ de: "5 User inkl.", en: "5 seats included" }),
        tt({ de: "API-Zugang", en: "API access" }),
      ],
      priceId: yearly ? PRICE_IDS.business.yearly : PRICE_IDS.business.monthly,
    },
    {
      id: "cfo" as const, icon: Gem, name: "CFO",
      price: "39 €",
      period: tt({ de: "/ Monat", en: "/ month" }),
      hint: tt({ de: "Nur monatlich verfügbar", en: "Monthly only" }),
      features: [
        tt({ de: "Alles aus BUSINESS", en: "Everything from BUSINESS" }),
        tt({ de: "Unlimited Scans", en: "Unlimited scans" }),
      ],
      priceId: PRICE_IDS.cfo.monthly,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 w-fit mx-auto">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${!yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {tt({ de: "Monatlich", en: "Monthly" })}
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {tt({ de: "Jährlich", en: "Yearly" })}
          <span className="ml-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {tt({ de: "bis 37 % sparen", en: "save up to 37 %" })}
          </span>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 xl:grid-cols-5 items-stretch">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-5 transition-shadow flex flex-col ${isCurrent ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border hover:shadow-md"}`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  {tt({ de: "Dein Plan", en: "Your Plan" })}
                </span>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${plan.id === "free" ? "bg-secondary" : "bg-accent"}`}>
                  <plan.icon className={`h-4 w-4 ${plan.id === "free" ? "text-secondary-foreground" : "text-accent-foreground"}`} />
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
              {renderAction && <div className="mt-4">{renderAction({ id: plan.id, priceId: plan.priceId })}</div>}
            </div>
          );
        })}
      </div>

      {/* Scan-Pack Top-up */}
      <div className="max-w-2xl mx-auto rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shrink-0">
            <Sparkles className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-base font-bold text-foreground">
              {tt({ de: "Scan-Pack 50 — Top-up", en: "Scan-Pack 50 — Top-up" })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tt({
                de: "Mehr Scans als dein Tarif erlaubt? Kauf einmalig 50 zusätzliche Scans.",
                en: "Need more scans than your tier allows? Buy 50 extra scans as a one-time top-up.",
              })}
            </p>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">4,99 €</span>
                <span className="text-xs text-muted-foreground">
                  {tt({ de: "einmalig", en: "one-time" })}
                </span>
              </div>
              {renderScanPackAction && renderScanPackAction(PRICE_IDS.scan_pack_50)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
