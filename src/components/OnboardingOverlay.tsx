import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScanLine, ArrowDown, X } from "lucide-react";

const ONBOARDING_KEY = "onboarding_seen";

const OnboardingOverlay = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
    if (!seen) {
      // Small delay so the layout is fully rendered
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismiss = () => {
    if (user) localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    setVisible(false);
  };

  const handleScan = () => {
    dismiss();
    navigate("/receipts");
    setTimeout(() => window.dispatchEvent(new CustomEvent("open-scan")), 200);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Desktop: Tooltip near sidebar upload button */}
      <div className="hidden md:flex absolute left-72 top-[50%] -translate-y-1/2 flex-col items-start gap-3 animate-fade-in">
        <div className="relative rounded-xl border-2 border-primary bg-background p-5 shadow-2xl max-w-xs">
          {/* Arrow pointing left */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-primary" />
          <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ScanLine className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground">
              {lang === "de" ? "Willkommen! 👋" : "Welcome! 👋"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === "de"
              ? "Beginne mit deinem ersten Beleg. Hier scannst du Belege ein und die KI erkennt automatisch alle Daten."
              : "Start with your first receipt. Scan receipts here and the AI will automatically detect all data."}
          </p>
          <Button className="w-full gap-2" onClick={handleScan}>
            <ScanLine className="h-4 w-4" />
            {lang === "de" ? "Ersten Beleg scannen" : "Scan first receipt"}
          </Button>
        </div>
      </div>

      {/* Mobile: Tooltip above the central scan button */}
      <div className="md:hidden absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in">
        <div className="relative rounded-xl border-2 border-primary bg-background p-5 shadow-2xl max-w-[280px]">
          <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ScanLine className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">
              {lang === "de" ? "Willkommen! 👋" : "Welcome! 👋"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === "de"
              ? "Beginne mit deinem ersten Beleg. Tippe hier, um zu scannen!"
              : "Start with your first receipt. Tap here to scan!"}
          </p>
          <Button className="w-full gap-2" size="sm" onClick={handleScan}>
            <ScanLine className="h-4 w-4" />
            {lang === "de" ? "Ersten Beleg scannen" : "Scan first receipt"}
          </Button>
          {/* Arrow pointing down to scan button */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-0 w-0 border-x-[10px] border-x-transparent border-t-[12px] border-t-primary" />
        </div>
        <ArrowDown className="h-6 w-6 text-primary animate-bounce mt-1" />
      </div>
    </div>
  );
};

export default OnboardingOverlay;
