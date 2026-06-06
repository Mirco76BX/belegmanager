import { TIERS, SCAN_PACKS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Check, Zap, Sparkles, Building2, Users, Crown, Briefcase, Package } from "lucide-react";
import { useState } from "react";

type BillingCycle = "monthly" | "yearly";

type PlanId = "free" | "basic" | "pro" | "business" | "cfo";

interface PricingPlansProps {
  currentTier?: "free" | "basic" | "pro" | "business" | "cfo" | "tax_advisor";
  renderAction?: (plan: { id: PlanId; priceId: string | null }) => React.ReactNode;
  renderPackAction?: (pack: { id: keyof typeof SCAN_PACKS; priceId: string }) => React.ReactNode;
  compact?: boolean;
}

const PricingPlans = ({ currentTier, renderAction, renderPackAction, compact }: PricingPlansProps) => {
  const { tt } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  const yearLabel = tt({ de: "/ Jahr", en: "/ year" });
  const monthLabel = tt({ de: "/ Monat", en: "/ month" });
  const period = billingCycle === "yearly" ? yearLabel : monthLabel;

  // Helper für Yearly-Hint (Preis pro Monat im Yearly-Abo)
  const yearlyMonthlyEquivalent = (yearlyPrice: number) => (yearlyPrice / 12).toFixed(2).replace(".", ",");

  const plans: {
    id: PlanId;
    name: string;
    icon: typeof Zap;
    price: string;
    period: string;
    hint: string | null;
    features: string[];
    priceId: string | null;
    highlight?: boolean;
  }[] = [
    {
      id: "free",
      name: "FREE",
      icon: Zap,
      price: "0 €",
      period: tt({ de: "/ für immer", en: "/ forever" }),
      hint: null,
      features: [
        tt({ de: "20 Scans / Jahr", en: "20 scans / year" }),
        tt({ de: "Belegverwaltung", en: "Receipt management" }),
        tt({ de: "Multi-Mandant (read-only)", en: "Multi-tenant (read-only)" }),
      ],
      priceId: null,
    },
    {
      id: "basic",
      name: "BASIC",
      icon: Sparkles,
      price: billingCycle === "yearly" ? `${TIERS.basic.yearly.price} €` : `${TIERS.basic.monthly.price.toString().replace(".", ",")} €`,
      period,
      hint:
        billingCycle === "yearly"
          ? tt({ de: `${yearlyMonthlyEquivalent(TIERS.basic.yearly.price)} €/Monat`, en: `${yearlyMonthlyEquivalent(TIERS.basic.yearly.price)} €/month` })
          : tt({ de: `${(TIERS.basic.monthly.price * 12).toFixed(2).replace(".", ",")} €/Jahr`, en: `${(TIERS.basic.monthly.price * 12).toFixed(2)} €/year` }),
      features: [
        tt({ de: "50 Scans / Monat", en: "50 scans / month" }),
        tt({ de: "Belegverwaltung & PDF-Report", en: "Receipts & PDF report" }),
        tt({ de: "Reisekosten-Abrechnung", en: "Travel expenses" }),
      ],
      priceId: billingCycle === "yearly" ? TIERS.basic.yearly.price_id : TIERS.basic.monthly.price_id,
    },
    {
      id: "pro",
      name: "PRO",
      icon: Crown,
      highlight: true,
      price: billingCycle === "yearly" ? `${TIERS.pro.yearly.price} €` : `${TIERS.pro.monthly.price.toString().replace(".", ",")} €`,
      period,
      hint:
        billingCycle === "yearly"
          ? tt({ de: `${yearlyMonthlyEquivalent(TIERS.pro.yearly.price)} €/Monat`, en: `${yearlyMonthlyEquivalent(TIERS.pro.yearly.price)} €/month` })
          : tt({ de: `${(TIERS.pro.monthly.price * 12).toFixed(2).replace(".", ",")} €/Jahr`, en: `${(TIERS.pro.monthly.price * 12).toFixed(2)} €/year` }),
      features: [
        tt({ de: "200 Scans / Monat", en: "200 scans / month" }),
        tt({ de: "DATEV-Export (Format 7)", en: "DATEV export (Format 7)" }),
        tt({ de: "GoBD-Festschreibung & Audit-Log", en: "GoBD lock & audit log" }),
        tt({ de: "Multi-Mandant-Verwaltung", en: "Multi-tenant management" }),
        tt({ de: "Prioritäts-Support", en: "Priority support" }),
      ],
      priceId: billingCycle === "yearly" ? TIERS.pro.yearly.price_id : TIERS.pro.monthly.price_id,
    },
    {
      id: "business",
      name: "BUSINESS",
      icon: Building2,
      price: billingCycle === "yearly" ? `${TIERS.business.yearly.price} €` : `${TIERS.business.monthly.price.toString().replace(".", ",")} €`,
      period,
      hint:
        billingCycle === "yearly"
          ? tt({ de: `${yearlyMonthlyEquivalent(TIERS.business.yearly.price)} €/Monat`, en: `${yearlyMonthlyEquivalent(TIERS.business.yearly.price)} €/month` })
          : tt({ de: `${(TIERS.business.monthly.price * 12).toFixed(2).replace(".", ",")} €/Jahr`, en: `${(TIERS.business.monthly.price * 12).toFixed(2)} €/year` }),
      features: [
        tt({ de: "1.000 Scans / Monat (Pool)", en: "1,000 scans / month (pool)" }),
        tt({ de: "5 User inklusive", en: "5 users included" }),
        tt({
          de: `Weitere User: ${TIERS.business.addonUser.monthly.price.toString().replace(".", ",")} €/Monat (+200 Scans)`,
          en: `Additional users: ${TIERS.business.addonUser.monthly.price} €/month (+200 scans)`,
        }),
        tt({ de: "Alle PRO-Features", en: "All PRO features" }),
        tt({ de: "API-Zugang", en: "API access" }),
      ],
      priceId: billingCycle === "yearly" ? TIERS.business.yearly.price_id : TIERS.business.monthly.price_id,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Billing-Cycle-Switch */}
      <div className="flex items-center justify-center gap-1 rounded-2xl bg-muted p-1 w-fit mx-auto">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`rounded-xl px-5 py-2 text-footnote font-medium transition-colors ${
            billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tt({ de: "Monatlich", en: "Monthly" })}
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`rounded-xl px-5 py-2 text-footnote font-medium transition-colors ${
            billingCycle === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tt({ de: "Jährlich", en: "Yearly" })}
          <span className="ml-1.5 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-caption-2 font-semibold">
            {tt({ de: "−33%", en: "−33%" })}
          </span>
        </button>
      </div>

      {/* 4-Tier-Grid */}
      <div className={`grid gap-4 ${compact ? "md:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto"} items-stretch`}>
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-5 transition-shadow flex flex-col ${
                plan.highlight
                  ? "border-primary shadow-lg"
                  : isCurrent
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:shadow-md"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-caption-2 font-semibold">
                  {tt({ de: "Beliebt", en: "Popular" })}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-3 rounded-full bg-emerald-500 text-white px-3 py-0.5 text-caption-2 font-medium">
                  {tt({ de: "Dein Plan", en: "Your Plan" })}
                </span>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.highlight ? "bg-primary/10" : "bg-muted"}`}>
                  <plan.icon className={`h-5 w-5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-headline font-bold">{plan.name}</h3>
              </div>
              <div className="mb-1">
                <span className="text-title-1 font-bold font-mono tabular-nums whitespace-nowrap">{plan.price}</span>
                <span className="text-muted-foreground ml-1 text-footnote">{plan.period}</span>
              </div>
              <p className="text-caption-1 text-muted-foreground h-4 mb-3">{plan.hint || ""}</p>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-footnote text-foreground">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {renderAction && <div className="mt-4">{renderAction(plan)}</div>}
            </div>
          );
        })}
      </div>

      {/* CFO-Plan für Steuerberater — separate Hervorhebung */}
      <div className="max-w-4xl mx-auto rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Briefcase className="h-6 w-6 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap mb-1">
              <h3 className="text-headline font-bold">CFO</h3>
              <span className="text-title-2 font-bold font-mono tabular-nums whitespace-nowrap">
                {TIERS.cfo.monthly.price}{" "}€
              </span>
              <span className="text-footnote text-muted-foreground">/ Monat</span>
            </div>
            <p className="text-subhead text-muted-foreground mb-3 leading-relaxed">
              {tt({
                de: `Für Steuerberater & CFOs ab dem 6. Mandanten. Unbegrenzte eigene Scans, Read-Access auf alle Mandanten-Belege, Bulk-DATEV-Export.`,
                en: `For tax advisors & CFOs from the 6th client. Unlimited own scans, read access to all client receipts, bulk DATEV export.`,
              })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                tt({ de: "Bis zu 5 Mandanten kostenlos", en: "Up to 5 clients free" }),
                tt({ de: "Read-Access auf Mandanten-Belege", en: "Read access to client receipts" }),
                tt({ de: "Bulk-DATEV-Export aller Mandanten", en: "Bulk DATEV export across clients" }),
                tt({ de: "White-Label-Option (auf Anfrage)", en: "White-label option (on request)" }),
              ].map((f) => (
                <div key={f} className="flex items-start gap-1.5 text-footnote">
                  <Check className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
          {renderAction && (
            <div className="shrink-0 w-full sm:w-auto">
              {renderAction({ id: "cfo", priceId: TIERS.cfo.monthly.price_id })}
            </div>
          )}
        </div>
      </div>

      {/* Scan-Packs — One-Time-Purchase */}
      <div className="max-w-4xl mx-auto rounded-2xl border-2 border-dashed border-border bg-muted/30 p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap mb-1">
              <h3 className="text-headline font-bold">{tt({ de: "Scan-Pack 50", en: "Scan Pack 50" })}</h3>
              <span className="text-title-2 font-bold font-mono tabular-nums whitespace-nowrap">
                {SCAN_PACKS.pack_50.price.toString().replace(".", ",")}{" "}€
              </span>
              <span className="text-footnote text-muted-foreground">{tt({ de: "einmalig", en: "one-time" })}</span>
            </div>
            <p className="text-subhead text-muted-foreground leading-relaxed">
              {tt({
                de: "50 zusätzliche Scans, gültig 12 Monate. Ideal für Saison-User (Steuererklärung, Jahresende). Kein Abo, keine Verlängerung.",
                en: "50 extra scans, valid 12 months. Perfect for seasonal users (tax filing, year-end). No subscription, no renewal.",
              })}
            </p>
          </div>
          {renderPackAction && (
            <div className="shrink-0 w-full sm:w-auto">
              {renderPackAction({ id: "pack_50", priceId: SCAN_PACKS.pack_50.price_id })}
            </div>
          )}
        </div>
      </div>

      {/* Compliance-Hinweis */}
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-caption-1 text-muted-foreground leading-relaxed">
          {tt({
            de: "Alle Preise zzgl. gesetzlicher MwSt. B2B-Service für Selbstständige, Unternehmen und Steuerberater. Zahlung über Stripe.",
            en: "All prices excl. VAT. B2B service for freelancers, businesses and tax advisors. Payments via Stripe.",
          })}
        </p>
      </div>
    </div>
  );
};

export default PricingPlans;
