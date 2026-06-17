import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScanLine, ArrowDown, X } from "lucide-react";

const OnboardingOverlay = () => {
  const { user } = useAuth();
  const { tt } = useLanguage();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profileRes, countRes] = await Promise.all([
        supabase.from("profiles").select("onboarding_seen").eq("id", user.id).maybeSingle(),
        supabase.from("receipts").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      const hasReceipts = (countRes.count ?? 0) > 0;
      const profile = profileRes.data;
      if (profile && !profile.onboarding_seen && !hasReceipts) {
        setTimeout(() => setVisible(true), 600);
      } else if (profile && !profile.onboarding_seen && hasReceipts) {
        // User hat schon Belege – Onboarding still abhaken
        supabase.from("profiles").update({ onboarding_seen: true }).eq("id", user.id).then(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const dismiss = async () => {
    setVisible(false);
    if (user) {
      await supabase.from("profiles").update({ onboarding_seen: true }).eq("id", user.id);
    }
  };

  const handleScan = () => {
    dismiss();
    navigate("/receipts");
    setTimeout(() => window.dispatchEvent(new CustomEvent("open-scan")), 200);
  };

  if (!visible) return null;

  const welcomeTitle = tt({de:"Willkommen! 👋", en:"Welcome! 👋", tr:"Hoş geldiniz! 👋", ar:"أهلاً! 👋", ru:"Добро пожаловать! 👋"});
  const scanBtn = tt({de:"Ersten Beleg scannen", en:"Scan first receipt", tr:"İlk fişi tara", ar:"مسح أول إيصال", ru:"Сканировать первый чек"});

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={dismiss} />
      {/* Desktop */}
      <div className="hidden md:flex absolute left-72 top-[50%] -translate-y-1/2 flex-col items-start gap-3 animate-fade-in">
        <div className="relative rounded-xl border-2 border-primary bg-background p-5 shadow-2xl max-w-xs">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-primary" />
          <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><ScanLine className="h-5 w-5" /></div>
            <h3 className="font-semibold text-foreground">{welcomeTitle}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {tt({de:"Beginne mit deinem ersten Beleg. Hier scannst du Belege ein und die KI erkennt automatisch alle Daten.", en:"Start with your first receipt. Scan receipts here and the AI will automatically detect all data.", tr:"İlk fişinizle başlayın. Fişleri tarayın, yapay zeka tüm verileri otomatik algılar.", ar:"ابدأ بأول إيصال. امسح الإيصالات وسيكتشف الذكاء الاصطناعي البيانات تلقائياً.", ru:"Начните с первого чека. Сканируйте чеки, и ИИ автоматически распознает все данные."})}
          </p>
          <Button className="w-full gap-2" onClick={handleScan}><ScanLine className="h-4 w-4" />{scanBtn}</Button>
        </div>
      </div>
      {/* Mobile */}
      <div className="md:hidden absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in">
        <div className="relative rounded-xl border-2 border-primary bg-background p-5 shadow-2xl max-w-[280px]">
          <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><ScanLine className="h-5 w-5" /></div>
            <h3 className="font-semibold text-foreground text-sm">{welcomeTitle}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {tt({de:"Beginne mit deinem ersten Beleg. Tippe hier, um zu scannen!", en:"Start with your first receipt. Tap here to scan!", tr:"İlk fişinizle başlayın. Taramak için dokunun!", ar:"ابدأ بأول إيصال. اضغط هنا للمسح!", ru:"Начните с первого чека. Нажмите для сканирования!"})}
          </p>
          <Button className="w-full gap-2" size="sm" onClick={handleScan}><ScanLine className="h-4 w-4" />{scanBtn}</Button>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-0 w-0 border-x-[10px] border-x-transparent border-t-[12px] border-t-primary" />
        </div>
        <ArrowDown className="h-6 w-6 text-primary animate-bounce mt-1" />
      </div>
    </div>
  );
};

export default OnboardingOverlay;
