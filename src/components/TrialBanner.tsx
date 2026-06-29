import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

const DISMISS_KEY = "trial_banner_dismissed";

const TrialBanner = () => {
  const { subscription } = useAuth();
  const { tt } = useLanguage();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const trial = subscription.trial;
  if (!trial) return null;

  const now = Date.now();

  const dayWord = (n: number) =>
    n === 1
      ? tt({ de: "Tag", en: "day", tr: "gün", ar: "يوم", ru: "день" })
      : tt({ de: "Tage", en: "days", tr: "gün", ar: "أيام", ru: "дней" });

  const goPricing = () => navigate("/pricing");

  // BLOCKED — höchste Priorität
  if (trial.blocked && trial.deletionAt) {
    const daysUntilDeletion = Math.max(
      0,
      Math.ceil((new Date(trial.deletionAt).getTime() - now) / (24 * 3600 * 1000))
    );

    const msg =
      daysUntilDeletion === 0
        ? tt({
            de: "Daten werden heute gelöscht. LETZTE CHANCE.",
            en: "Data will be deleted today. LAST CHANCE.",
            tr: "Veriler bugün silinecek. SON ŞANS.",
            ar: "سيتم حذف البيانات اليوم. الفرصة الأخيرة.",
            ru: "Данные будут удалены сегодня. ПОСЛЕДНИЙ ШАНС.",
          })
        : tt({
            de: `Account gesperrt. Daten werden in ${daysUntilDeletion} ${dayWord(daysUntilDeletion)} gelöscht.`,
            en: `Account locked. Data will be deleted in ${daysUntilDeletion} ${dayWord(daysUntilDeletion)}.`,
            tr: `Hesap kilitli. Veriler ${daysUntilDeletion} ${dayWord(daysUntilDeletion)} içinde silinecek.`,
            ar: `الحساب مقفل. سيتم حذف البيانات خلال ${daysUntilDeletion} ${dayWord(daysUntilDeletion)}.`,
            ru: `Аккаунт заблокирован. Данные будут удалены через ${daysUntilDeletion} ${dayWord(daysUntilDeletion)}.`,
          });

    return (
      <div className="w-full bg-destructive text-destructive-foreground border-b border-destructive/50">
        <div className="mx-auto max-w-6xl flex items-center gap-3 px-4 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate font-medium">
            {tt({ de: "Trial abgelaufen.", en: "Trial expired.", tr: "Deneme süresi doldu.", ar: "انتهت الفترة التجريبية.", ru: "Пробный период истёк." })}{" "}
            <span className="hidden sm:inline">{msg}</span>
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={goPricing}
            className="shrink-0"
          >
            {tt({ de: "Plan wählen", en: "Choose plan", tr: "Plan seç", ar: "اختر خطة", ru: "Выбрать план" })}
          </Button>
        </div>
      </div>
    );
  }

  // ACTIVE
  if (trial.active && trial.endsAt) {
    const daysRemaining = Math.max(
      0,
      Math.ceil((new Date(trial.endsAt).getTime() - now) / (24 * 3600 * 1000))
    );

    if (daysRemaining > 5) return null;

    const isUrgent = daysRemaining <= 2;

    if (!isUrgent && dismissed) return null;

    const text = isUrgent
      ? tt({
          de: `Dein Trial endet in ${daysRemaining} ${dayWord(daysRemaining)}! Danach ist dein Account gesperrt.`,
          en: `Your trial ends in ${daysRemaining} ${dayWord(daysRemaining)}! After that your account will be locked.`,
          tr: `Deneme süren ${daysRemaining} ${dayWord(daysRemaining)} içinde sona eriyor!`,
          ar: `تنتهي فترتك التجريبية خلال ${daysRemaining} ${dayWord(daysRemaining)}!`,
          ru: `Пробный период заканчивается через ${daysRemaining} ${dayWord(daysRemaining)}!`,
        })
      : tt({
          de: `Dein Trial endet in ${daysRemaining} ${dayWord(daysRemaining)}. Schon einen Plan ausgesucht?`,
          en: `Your trial ends in ${daysRemaining} ${dayWord(daysRemaining)}. Picked a plan yet?`,
          tr: `Deneme süren ${daysRemaining} ${dayWord(daysRemaining)} içinde sona eriyor.`,
          ar: `تنتهي فترتك التجريبية خلال ${daysRemaining} ${dayWord(daysRemaining)}.`,
          ru: `Пробный период заканчивается через ${daysRemaining} ${dayWord(daysRemaining)}.`,
        });

    const cta = isUrgent
      ? tt({ de: "Jetzt Plan wählen", en: "Choose plan now", tr: "Şimdi plan seç", ar: "اختر خطة الآن", ru: "Выбрать план" })
      : tt({ de: "Pläne ansehen", en: "View plans", tr: "Planları gör", ar: "عرض الخطط", ru: "Посмотреть планы" });

    const bg = isUrgent
      ? "bg-destructive/10 border-destructive/30"
      : "bg-accent/10 border-accent/30";

    return (
      <div className={`w-full border-b ${bg}`}>
        <div className="mx-auto max-w-6xl flex items-center gap-3 px-4 py-2 text-sm">
          {isUrgent && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
          <span className="flex-1 truncate">{text}</span>
          <Button size="sm" variant={isUrgent ? "destructive" : "default"} onClick={goPricing} className="shrink-0">
            {cta}
          </Button>
          {!isUrgent && (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                try {
                  sessionStorage.setItem(DISMISS_KEY, "1");
                } catch {}
                setDismissed(true);
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default TrialBanner;
