import { TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Check, Crown, Zap, Gem } from "lucide-react";
import { useState } from "react";

type BillingCycle = "monthly" | "yearly";

interface PricingPlansProps {
  currentTier?: "free" | "relax" | "master" | "tax_advisor";
  renderAction?: (plan: { id: "free" | "relax" | "master"; priceId: string | null }) => React.ReactNode;
  compact?: boolean;
}

const PricingPlans = ({ currentTier, renderAction, compact }: PricingPlansProps) => {
  const { tt } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  const relaxPrice = billingCycle === "yearly"
    ? { amount: "12 €", period: tt({de:"/ Jahr", en:"/ year", tr:"/ yıl", ar:"/ سنة", ru:"/ год"}), hint: tt({de:"1 €/Monat", en:"1 €/month", tr:"1 €/ay", ar:"1 €/شهر", ru:"1 €/мес"}) }
    : { amount: "3 €", period: tt({de:"/ Monat", en:"/ month", tr:"/ ay", ar:"/ شهر", ru:"/ мес"}), hint: tt({de:"36 €/Jahr", en:"36 €/year", tr:"36 €/yıl", ar:"36 €/سنة", ru:"36 €/год"}) };

  const plans = [
    {
      id: "free" as const, icon: Zap, name: "FREE", price: "0 €",
      period: tt({de:"/ für immer", en:"/ forever", tr:"/ sonsuza dek", ar:"/ للأبد", ru:"/ навсегда"}),
      hint: null,
      features: [
        "10 Scans",
        tt({de:"Belegverwaltung", en:"Receipt management", tr:"Fiş yönetimi", ar:"إدارة الإيصالات", ru:"Управление чеками"}),
      ],
      priceId: null,
    },
    {
      id: "relax" as const, icon: Crown, name: "RELAX",
      price: relaxPrice.amount, period: relaxPrice.period, hint: relaxPrice.hint,
      features: [
        tt({de:"150 Scans / Jahr", en:"150 Scans / year", tr:"150 Tarama / yıl", ar:"150 مسح / سنة", ru:"150 сканов / год"}),
        tt({de:"Belegverwaltung", en:"Receipt management", tr:"Fiş yönetimi", ar:"إدارة الإيصالات", ru:"Управление чеками"}),
        tt({de:"Reisekosten\u00ADabrechnung", en:"Expense reports", tr:"Masraf raporu", ar:"تقرير المصاريف", ru:"Отчёт о расходах"}),
      ],
      priceId: billingCycle === "yearly" ? TIERS.relax.yearly.price_id : TIERS.relax.monthly.price_id,
    },
    {
      id: "master" as const, icon: Gem, name: "MASTER",
      price: billingCycle === "yearly" ? "49 €" : "6 €",
      period: billingCycle === "yearly"
        ? tt({de:"/ Jahr", en:"/ year", tr:"/ yıl", ar:"/ سنة", ru:"/ год"})
        : tt({de:"/ Monat", en:"/ month", tr:"/ ay", ar:"/ شهر", ru:"/ мес"}),
      hint: billingCycle === "yearly"
        ? tt({de:"~4 €/Monat", en:"~4 €/month", tr:"~4 €/ay", ar:"~4 €/شهر", ru:"~4 €/мес"})
        : tt({de:"72 €/Jahr", en:"72 €/year", tr:"72 €/yıl", ar:"72 €/سنة", ru:"72 €/год"}),
      features: [
        tt({de:"Unbegrenzte Scans", en:"Unlimited Scans", tr:"Sınırsız Tarama", ar:"مسح غير محدود", ru:"Безлимитные сканы"}),
        tt({de:"Belegverwaltung", en:"Receipt management", tr:"Fiş yönetimi", ar:"إدارة الإيصالات", ru:"Управление чеками"}),
        tt({de:"Reisekosten\u00ADabrechnung", en:"Expense reports", tr:"Masraf raporu", ar:"تقرير المصاريف", ru:"Отчёт о расходах"}),
        tt({de:"Prioritäts\u00ADSupport", en:"Priority support", tr:"Öncelikli destek", ar:"دعم ذو أولوية", ru:"Приоритетная поддержка"}),
      ],
      priceId: billingCycle === "yearly" ? TIERS.master.yearly.price_id : TIERS.master.monthly.price_id,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 w-fit mx-auto">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {tt({de:"Monatlich", en:"Monthly", tr:"Aylık", ar:"شهري", ru:"Ежемесячно"})}
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${billingCycle === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {tt({de:"Jährlich", en:"Yearly", tr:"Yıllık", ar:"سنوي", ru:"Ежегодно"})}
          <span className="ml-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {tt({de:"bis 67% sparen", en:"save up to 67%", tr:"%67'e kadar tasarruf", ar:"وفّر حتى 67%", ru:"скидка до 67%"})}
          </span>
        </button>
      </div>

      <div className={`grid gap-6 ${compact ? "md:grid-cols-3" : "md:grid-cols-3 max-w-4xl mx-auto"} items-stretch`}>
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          return (
            <div key={plan.id} className={`relative rounded-xl border-2 p-5 transition-shadow flex flex-col ${isCurrent ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border hover:shadow-md"}`}>
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  {tt({de:"Dein Plan", en:"Your Plan", tr:"Planınız", ar:"خطتك", ru:"Ваш план"})}
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
              {renderAction && <div className="mt-4">{renderAction(plan)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPlans;
