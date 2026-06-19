import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { autoCropImage, dataUrlToFile, compressImage } from "@/lib/autoCropImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Camera, Upload, Loader2, Check, SkipForward, ArrowRight, Plus, AlertTriangle, Info, X } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { TAX_CATEGORIES, getSmartGuessVat, getRequiredFields, guessTaxCategoryFromScan } from "@/lib/taxCategories";

const PURPOSE_PRESETS = [
  { value: "Geschäftsessen", de: "🍽️ Geschäftsessen", en: "🍽️ Business meal", tr: "🍽️ İş yemeği", ar: "🍽️ وجبة عمل", ru: "🍽️ Деловой обед" },
  { value: "Tanken", de: "⛽ Tanken", en: "⛽ Fuel", tr: "⛽ Yakıt", ar: "⛽ وقود", ru: "⛽ Топливо" },
  { value: "Akquise", de: "🤝 Akquise", en: "🤝 Acquisition", tr: "🤝 Müşteri edinme", ar: "🤝 استحواذ", ru: "🤝 Привлечение" },
  { value: "Büromaterial", de: "📎 Büromaterial", en: "📎 Office supplies", tr: "📎 Ofis malzemeleri", ar: "📎 لوازم مكتبية", ru: "📎 Канцтовары" },
  { value: "Reisekosten", de: "✈️ Reisekosten", en: "✈️ Travel expenses", tr: "✈️ Seyahat masrafları", ar: "✈️ مصاريف السفر", ru: "✈️ Командировочные" },
  { value: "Fortbildung", de: "📚 Fortbildung", en: "📚 Training", tr: "📚 Eğitim", ar: "📚 تدريب", ru: "📚 Обучение" },
  { value: "Bewirtung", de: "🥂 Bewirtung", en: "🥂 Hospitality", tr: "🥂 Ağırlama", ar: "🥂 ضيافة", ru: "🥂 Представительские" },
  { value: "Telefon/Internet", de: "📱 Telefon/Internet", en: "📱 Phone/Internet", tr: "📱 Telefon/İnternet", ar: "📱 هاتف/إنترنت", ru: "📱 Телефон/Интернет" },
];

interface ConfidenceScores {
  date?: string;
  amount?: string;
  tax_amount?: string;
  tax_rate?: string;
  vendor?: string;
}

interface VatItem {
  label: string;
  net_amount: number | null;
  vat_rate: number;
  vat_amount: number;
}

interface ScanResult {
  date: string | null;
  amount: number | null;
  currency?: string;
  description: string | null;
  vendor: string | null;
  tax_amount: number | null;
  tax_rate: number | null;
  vat_items?: VatItem[];
  items: string[];
  is_fuel_receipt?: boolean;
  suggested_tax_category?: string | null;
  confidence?: ConfidenceScores;
  is_handwritten?: boolean;
  multiple_receipts_detected?: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface ScanWizardProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companies: Company[];
  defaultCompanyId: string | null;
  onCompaniesChanged?: () => void;
}

const confidenceColor = (level?: string) => {
  if (!level || level === "high") return "";
  if (level === "medium") return "ring-2 ring-warning/50 bg-warning/5";
  return "ring-2 ring-destructive/50 bg-destructive/5";
};

const confidenceBadge = (level?: string, lang?: string) => {
  if (!level || level === "high") return null;
  const labels = {
    medium: { de: "Unsicher", en: "Uncertain" },
    low: { de: "Prüfen!", en: "Check!" },
  };
  const l = labels[level as keyof typeof labels];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
      level === "medium" ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"
    }`}>
      ⚠️ {lang === "de" ? l?.de : l?.en}
    </span>
  );
};

const RATE_SAMPLE_AMOUNT = 1000000;

const roundCurrencyAmount = (value: number) => Math.round(value * 100) / 100;

const ScanWizard = ({ open, onClose, onSaved, companies, defaultCompanyId, onCompaniesChanged }: ScanWizardProps) => {
  const { user, subscription } = useAuth();
  const { lang, tt } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [scanCount, setScanCount] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const [step, setStep] = useState<"upload" | "pages" | "scanning" | "company" | "details">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pages, setPages] = useState<{ file: File; preview: string }[]>([]);
  const addPageInputRef = useRef<HTMLInputElement>(null);
  const addPageCameraRef = useRef<HTMLInputElement>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [isFuelReceipt, setIsFuelReceipt] = useState(false);

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId || "");
  const [personMet, setPersonMet] = useState("");
  const [organization, setOrganization] = useState("");
  const [meetingPurpose, setMeetingPurpose] = useState("");
  const [showCustomPurpose, setShowCustomPurpose] = useState(false);
  const [customPurposes, setCustomPurposes] = useState<{ id: string; label: string }[]>([]);
  const [showSavePurposePrompt, setShowSavePurposePrompt] = useState(false);
  const [pendingCustomPurpose, setPendingCustomPurpose] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [mileageWarning, setMileageWarning] = useState<string | null>(null);
  const [taxCategory, setTaxCategory] = useState<string>("");
  const [vatRate, setVatRate] = useState<string>("");
  const [vatAmount, setVatAmount] = useState<string>("");
  const [vatItems, setVatItems] = useState<VatItem[]>([]);

  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [localCompanies, setLocalCompanies] = useState<Company[]>(companies);
  const [savedVehicles, setSavedVehicles] = useState<{ license_plate: string; name: string | null }[]>([]);
  const [pendingReceiptId, setPendingReceiptId] = useState<string | null>(null);
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null);

  useEffect(() => { setLocalCompanies(companies); }, [companies]);

  useEffect(() => {
    if (open && user) {
      setStep("upload"); setFile(null); setPreview(null); setScanResult(null);
      setPages([]);
      setDate(""); setAmount(""); setOriginalAmount(""); setDescription("");
      setCompanyId(defaultCompanyId || "");
      setPersonMet(""); setOrganization(""); setMeetingPurpose("");
      setShowCustomPurpose(false); setShowNewCompany(false); setNewCompanyName("");
      setLimitReached(false); setIsFuelReceipt(false);
      setLicensePlate(""); setMileage(""); setMileageWarning(null);
      setTaxCategory(""); setVatRate(""); setVatAmount(""); setVatItems([]);
      setPendingReceiptId(null); setPendingFilePath(null);

      supabase.from("vehicles").select("license_plate, name").order("license_plate")
        .then(({ data }) => { if (data) setSavedVehicles(data); });
      supabase.from("custom_purposes").select("id, label").order("label")
        .then(({ data }) => { if (data) setCustomPurposes(data as any); });

      const tierConfig = TIERS[subscription.tier] || TIERS.free;
      const maxScans = tierConfig.maxScans;

      if (maxScans !== Infinity) {
        supabase.from("receipts").select("id", { count: "exact", head: true })
          .then(({ count }) => { const c = count ?? 0; setScanCount(c); if (c >= maxScans) setLimitReached(true); });
      } else { setScanCount(null); setLimitReached(false); }
    }
  }, [open, defaultCompanyId, user, subscription.tier]);

  const convertToEur = async (value: number | null, detectedCurrency?: string, receiptDate?: string | null) => {
    if (value == null) return null;
    if (!detectedCurrency || detectedCurrency === "EUR") return value;

    try {
      const { data, error } = await supabase.functions.invoke("convert-currency", {
        body: { amount: value, currency: detectedCurrency, date: receiptDate || undefined },
      });

      if (!error && data?.rate != null) {
        const rate = Number(data.rate);
        if (Number.isFinite(rate) && rate > 0) {
          return roundCurrencyAmount(value * rate);
        }
      }
      if (!error && data?.amount_eur != null) {
        return Number(data.amount_eur);
      }
    } catch (error) {
      console.warn("Currency conversion preview failed", error);
    }

    return value;
  };

  /**
   * Fetches the EUR exchange rate ONCE per scan and converts every value locally.
   * Avoids firing N parallel convert-currency calls (1x amount + 1x VAT + N x VAT items).
   */
  const fetchEurRate = async (currency?: string, receiptDate?: string | null): Promise<number | null> => {
    if (!currency || currency === "EUR") return 1;
    try {
      const { data, error } = await supabase.functions.invoke("convert-currency", {
        body: { amount: RATE_SAMPLE_AMOUNT, currency, date: receiptDate || undefined },
      });
      if (!error && data?.rate != null) {
        const rate = Number(data.rate);
        return Number.isFinite(rate) && rate > 0 ? rate : null;
      }
      if (!error && data?.amount_eur != null) {
        const amountEur = Number(data.amount_eur);
        const rate = amountEur / RATE_SAMPLE_AMOUNT;
        return Number.isFinite(rate) && rate > 0 ? rate : null;
      }
    } catch (error) {
      console.warn("Currency rate lookup failed", error);
    }
    return null;
  };

  // When tax category changes, apply Smart Guess VAT if no OCR value
  useEffect(() => {
    if (taxCategory && !scanResult?.tax_rate) {
      const guessedRate = getSmartGuessVat(taxCategory);
      if (guessedRate !== null) {
        setVatRate(String(guessedRate));
        const amt = parseFloat(amount);
        if (!isNaN(amt) && guessedRate > 0) {
          const estimated = amt - (amt / (1 + guessedRate / 100));
          setVatAmount(estimated.toFixed(2));
        }
      }
    }
  }, [taxCategory, scanResult?.tax_rate, amount]);

  const handlePageAdded = async (selectedFile: File) => {
    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(selectedFile);
      });

      const croppedBase64 = await autoCropImage(base64);
      // Downscale + JPEG-compress so uploads & AI calls are fast even with phone cameras
      const compressedBase64 = await compressImage(croppedBase64);
      const baseName = selectedFile.name.replace(/\.[^.]+$/, "");
      const compressedFile = dataUrlToFile(compressedBase64, `${baseName}.jpg`);

      setPages((prev) => [...prev, { file: compressedFile, preview: compressedBase64 }]);
      setStep("pages");
    } catch (err) {
      console.error("Error processing page:", err);
      toast({ title: tt({ de: "Seite konnte nicht verarbeitet werden.", en: "Could not process page." }), variant: "destructive" });
    }
  };

  const handleRemovePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const isTrialBlocked = subscription.tier === "trial_blocked";

  const handleStartScan = async () => {
    if (pages.length === 0) return;
    if (isTrialBlocked) {
      toast({
        title: tt({ de: "Account gesperrt", en: "Account locked" }),
        description: tt({
          de: "Trial abgelaufen. Bitte wähle einen Plan.",
          en: "Trial expired. Please choose a plan.",
        }),
        variant: "destructive",
      });
      return;
    }
    setStep("scanning");

    // Use first page as main preview/file
    setFile(pages[0].file);
    setPreview(pages[0].preview);

    try {
      const imageArray = pages.map((p) => p.preview);

      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: pages.length > 1 ? { images: imageArray } : { imageBase64: imageArray[0] },
      });
      if (error) {
        // Try to extract structured body from FunctionsHttpError for limit/rate responses
        let parsed: any = null;
        const ctx: any = (error as any)?.context;
        try {
          if (ctx && typeof ctx.json === "function") parsed = await ctx.json();
          else if (ctx && typeof ctx.text === "function") parsed = JSON.parse(await ctx.text());
        } catch { /* ignore */ }
        const status = ctx?.status ?? (error as any)?.status;
        const code = parsed?.error;
        const msg = parsed?.message;

        if (status === 402 || code === "limit_reached") {
          toast({
            title: tt({ de: "Monatslimit erreicht", en: "Monthly limit reached" }),
            description: msg || tt({ de: "Bitte upgrade dein Paket.", en: "Please upgrade your plan." }),
            variant: "destructive",
            action: (
              <ToastAction altText="Upgrade" onClick={() => navigate("/pricing")}>
                {tt({ de: "Jetzt upgraden", en: "Upgrade now" })}
              </ToastAction>
            ),
          });
          setStep("upload"); setPages([]); setFile(null); setPreview(null);
          return;
        }
        if (status === 429 || code === "rate_limit" || code === "ai_rate_limit") {
          toast({
            title: tt({ de: "Kurze Pause", en: "Short pause" }),
            description: msg || tt({ de: "Bitte einen Moment warten — kurze Pause vor dem nächsten Scan.", en: "Please wait a moment before the next scan." }),
          });
          setStep("upload"); setFile(null); setPreview(null);
          return;
        }
        if (code === "ai_timeout" || code === "ai_unavailable" || status === 503 || status === 504) {
          toast({
            title: tt({ de: "KI vorübergehend nicht erreichbar", en: "AI temporarily unavailable" }),
            description: tt({ de: "AI-Service kurz nicht erreichbar. Bitte erneut versuchen.", en: "AI service briefly unavailable. Please try again." }),
            variant: "destructive",
          });
          setStep("upload"); setFile(null); setPreview(null);
          return;
        }
        if (status === 403 || code === "trial_blocked") {
          toast({
            title: tt({ de: "Account gesperrt", en: "Account locked" }),
            description: tt({
              de: "Trial abgelaufen. Bitte wähle einen Plan.",
              en: "Trial expired. Please choose a plan.",
            }),
            variant: "destructive",
            action: (
              <ToastAction altText="Upgrade" onClick={() => navigate("/pricing")}>
                {tt({ de: "Plan wählen", en: "Choose plan" })}
              </ToastAction>
            ),
          });
          setStep("upload"); setFile(null); setPreview(null);
          return;
        }
        if (status === 401) {
          toast({
            title: tt({ de: "Sitzung abgelaufen", en: "Session expired" }),
            description: tt({ de: "Bitte erneut einloggen.", en: "Please sign in again." }),
            variant: "destructive",
          });
          setStep("upload");
          return;
        }
        throw error;
      }

      setScanResult(data);
      const detectedDate = data.date || "";
      const detectedCurrency = data.currency || "EUR";

      if (detectedDate) setDate(detectedDate);

      // Fetch EUR rate ONCE per scan; convert every value locally afterwards.
      const eurRate = await fetchEurRate(detectedCurrency, detectedDate);
      const toEur = (v: number | null | undefined): number | null => {
        if (v == null) return null;
        if (!eurRate) return Number(v);
        return roundCurrencyAmount(Number(v) * eurRate);
      };

      const convertedAmount = data.amount != null ? toEur(data.amount) : null;
      const convertedVatAmount = data.tax_amount != null ? toEur(data.tax_amount) : null;
      const convertedItems: VatItem[] = Array.isArray(data.vat_items) && data.vat_items.length > 0
        ? data.vat_items.map((item: VatItem) => ({
            label: item.label || "Allgemein",
            net_amount: toEur(item.net_amount) ?? item.net_amount,
            vat_rate: item.vat_rate,
            vat_amount: toEur(item.vat_amount) ?? item.vat_amount,
          }))
        : [];

      if (data.amount != null) {
        setOriginalAmount(String(data.amount));
        setAmount(convertedAmount != null ? String(convertedAmount) : String(data.amount));
      }
      if (data.description || data.vendor) setDescription([data.vendor, data.description].filter(Boolean).join(" – "));
      if (data.tax_amount != null) {
        setVatAmount(convertedVatAmount != null ? String(convertedVatAmount) : String(data.tax_amount));
      }
      if (data.tax_rate != null) setVatRate(String(data.tax_rate));
      if (convertedItems.length > 0) setVatItems(convertedItems);

      // Auto-detect tax category
      const suggestedCat = data.suggested_tax_category || guessTaxCategoryFromScan(data.vendor, data.description, !!data.is_fuel_receipt);
      if (suggestedCat) setTaxCategory(suggestedCat);

      const detectedIsFuel = !!data.is_fuel_receipt;
      if (detectedIsFuel) {
        setIsFuelReceipt(true);
        setMeetingPurpose("Tanken");
        if (!suggestedCat) setTaxCategory("tankkosten");
      }

      // === AUTO-SAVE as pending — runs in background, does NOT block UI ===
      (async () => {
        try {
          // Upload ALL pages in parallel
          const uploadedPaths = await Promise.all(
            pages.map(async (p) => {
              const ext = p.file.name.split(".").pop() || "jpg";
              const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
              await supabase.storage.from("receipts").upload(path, p.file);
              return path;
            })
          );
          const filePath = uploadedPaths[0];
          setPendingFilePath(filePath);

          const parsedAmount = data.amount != null ? data.amount : null;
          const pendingVatAmount = detectedCurrency === "EUR" ? data.tax_amount ?? null : convertedVatAmount;

          const { data: receiptRow, error: insertErr } = await supabase.from("receipts").insert({
            user_id: user!.id,
            date: detectedDate || new Date().toISOString().slice(0, 10),
            amount: parsedAmount,
            amount_eur: convertedAmount,
            description: [data.vendor, data.description].filter(Boolean).join(" – ") || null,
            file_path: filePath,
            receipt_type: detectedIsFuel ? "fuel" : "general",
            status: "pending",
            vat_amount: pendingVatAmount,
            vat_rate: data.tax_rate ?? null,
            currency: detectedCurrency,
            tax_category: suggestedCat || null,
            meeting_purpose: detectedIsFuel ? "Tanken" : null,
          }).select("id").single();

          if (!insertErr && receiptRow) {
            setPendingReceiptId(receiptRow.id);

            if (convertedItems.length > 0) {
              const vatInserts = convertedItems.map((item: VatItem) => ({
                receipt_id: receiptRow.id,
                label: item.label,
                net_amount: item.net_amount,
                vat_rate: item.vat_rate,
                vat_amount: item.vat_amount,
              }));
              await supabase.from("receipt_vat_items").insert(vatInserts);
            }
          }
        } catch (autoSaveErr) {
          console.warn("Auto-save pending receipt failed:", autoSaveErr);
        }
      })();

      // Notify about multiple receipts
      if (data.multiple_receipts_detected) {
        toast({
          title: tt({ de: "Mehrere Belege erkannt!", en: "Multiple receipts detected!" }),
          description: tt({
            de: "Es wurden möglicherweise mehrere Belege im Bild erkannt. Bitte prüfe die erkannten Daten.",
            en: "Multiple receipts may have been detected in the image. Please verify the extracted data.",
          }),
          variant: "destructive",
        });
      }

      // Notify about handwritten receipt
      if (data.is_handwritten) {
        toast({
          title: tt({ de: "Handschriftlicher Beleg", en: "Handwritten receipt" }),
          description: tt({
            de: "Dieser Beleg scheint handschriftlich zu sein. Bitte überprüfe die rot markierten Felder besonders sorgfältig.",
            en: "This receipt appears to be handwritten. Please carefully check fields marked in red.",
          }),
        });
      }

      setStep("company");
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({ title: tt({de:"Scan fehlgeschlagen. Daten manuell eingeben.", en:"Scan failed. Enter data manually."}), variant: "destructive" });
      const now = new Date(); setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
      setStep("company");
    }
  };

  const handleCreateCompany = async () => {
    if (!user || !newCompanyName.trim()) return;
    setCreatingCompany(true);
    try {
      const { data, error } = await supabase.from("companies").insert({ name: newCompanyName.trim(), user_id: user.id }).select("id, name").single();
      if (error) throw error;
      setLocalCompanies((prev) => [...prev, data]);
      setCompanyId(data.id);
      setShowNewCompany(false); setNewCompanyName("");
      onCompaniesChanged?.();
      toast({ title: tt({de:"Organisation erstellt!", en:"Organization created!"}) });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    finally { setCreatingCompany(false); }
  };

  const checkMileage = async (plate: string, km: string) => {
    setMileageWarning(null);
    if (!plate.trim() || !km || !user) return;
    const kmVal = parseFloat(km);
    if (isNaN(kmVal)) return;
    const { data } = await supabase
      .from("receipts")
      .select("mileage, date")
      .eq("user_id", user.id)
      .eq("receipt_type", "fuel")
      .eq("license_plate", plate.trim())
      .not("mileage", "is", null)
      .order("mileage", { ascending: false })
      .limit(1);
    if (data && data.length > 0 && data[0].mileage != null && kmVal < data[0].mileage) {
      setMileageWarning(
        tt({
          de: `Achtung: Der km-Stand (${kmVal.toLocaleString()}) ist niedriger als der letzte erfasste Stand (${data[0].mileage.toLocaleString()} km) für ${plate.trim()}.`,
          en: `Warning: Mileage (${kmVal.toLocaleString()}) is lower than the last recorded value (${data[0].mileage.toLocaleString()} km) for ${plate.trim()}.`,
        })
      );
    }
  };

  const requiredFields = getRequiredFields(taxCategory);
  const isBewirtung = taxCategory === "bewirtung";

  const validateRequiredFields = (): boolean => {
    if (!isBewirtung) return true;
    const missing: string[] = [];
    if (requiredFields.includes("person_met") && !personMet.trim()) {
      missing.push(tt({ de: "Teilnehmer", en: "Participants" }));
    }
    if (requiredFields.includes("meeting_purpose") && !meetingPurpose.trim()) {
      missing.push(tt({ de: "Anlass der Bewirtung", en: "Purpose of entertainment" }));
    }
    if (missing.length > 0) {
      toast({
        title: tt({ de: "Pflichtfelder fehlen", en: "Required fields missing" }),
        description: tt({
          de: `Gemäß § 4 Abs. 5 EStG sind folgende Angaben Pflicht: ${missing.join(", ")}`,
          en: `According to § 4 Abs. 5 EStG, the following fields are required: ${missing.join(", ")}`,
        }),
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSave = async (skipDetails = false) => {
    if (!user || (!file && pages.length === 0)) return;

    // Validate required fields for Bewirtung (only when not skipping)
    if (!skipDetails && !validateRequiredFields()) return;

    setSaving(true);
    try {
      // Upload file only if not already uploaded during auto-save
      let filePath = pendingFilePath;
      if (!filePath) {
        const ext = file.name.split(".").pop() || "jpg";
        filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, file);
        if (uploadError) throw uploadError;
      }

      const parsedAmountEur = amount ? parseFloat(amount) : null;
      const currency = scanResult?.currency || "EUR";
      const parsedOriginalAmount = currency === "EUR"
        ? parsedAmountEur
        : (originalAmount ? parseFloat(originalAmount) : (scanResult?.amount ?? null));

      const finalVatRate = vatRate ? parseFloat(vatRate) : (scanResult?.tax_rate ?? null);
      const finalVatAmount = vatAmount ? parseFloat(vatAmount) : null;

      const receiptData: any = {
        user_id: user.id, date: date || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; })(),
        amount: parsedOriginalAmount, description: description || null,
        company_id: companyId || null, file_path: filePath,
        receipt_type: isFuelReceipt ? "fuel" : "general",
        status: skipDetails ? "pending" : "complete",
        vat_amount: finalVatAmount,
        vat_rate: finalVatRate,
        currency,
        amount_eur: parsedAmountEur,
        tax_category: taxCategory || null,
      };

      if (isFuelReceipt) {
        receiptData.license_plate = skipDetails ? null : licensePlate || null;
        receiptData.mileage = skipDetails ? null : (mileage ? parseFloat(mileage) : null);
        receiptData.meeting_purpose = "Tanken";
      } else {
        receiptData.person_met = skipDetails ? null : personMet || null;
        receiptData.organization = skipDetails ? null : organization || null;
        receiptData.meeting_purpose = skipDetails ? null : meetingPurpose || null;
      }

      let receiptId: string;

      if (pendingReceiptId) {
        // Update the auto-saved pending receipt
        const { error } = await supabase.from("receipts").update(receiptData).eq("id", pendingReceiptId);
        if (error) throw error;
        receiptId = pendingReceiptId;

        // Delete old VAT items and re-insert
        await supabase.from("receipt_vat_items").delete().eq("receipt_id", receiptId);
      } else {
        // Insert new receipt (fallback if auto-save failed)
        const { data: newReceipt, error } = await supabase.from("receipts").insert(receiptData).select("id").single();
        if (error) throw error;
        receiptId = newReceipt.id;
      }

      // Insert VAT items
      if (vatItems.length > 0) {
        const vatInserts = vatItems.map((item) => ({
          receipt_id: receiptId,
          label: item.label,
          net_amount: item.net_amount,
          vat_rate: item.vat_rate,
          vat_amount: item.vat_amount,
        }));
        const { error: vatError } = await supabase.from("receipt_vat_items").insert(vatInserts);
        if (vatError) console.error("Failed to save VAT items:", vatError);
      }

      toast({ title: tt({de:"Beleg gespeichert!", en:"Receipt saved!"}) });

      // Check if custom purpose should be saved
      const isCustom = !skipDetails && meetingPurpose.trim() &&
        !PURPOSE_PRESETS.some(p => p.value === meetingPurpose) &&
        !customPurposes.some(cp => cp.label === meetingPurpose.trim());
      if (isCustom) {
        setPendingCustomPurpose(meetingPurpose.trim());
        setShowSavePurposePrompt(true);
      }

      onSaved(); onClose();
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const conf = scanResult?.confidence;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && tt({de:"Beleg scannen", en:"Scan Receipt"})}
            {step === "pages" && tt({de:"Seiten erfassen", en:"Capture Pages"})}
            {step === "scanning" && tt({de:"Wird gescannt...", en:"Scanning..."})}
            {step === "company" && tt({de:"Zuordnung", en:"Assignment"})}
            {step === "details" && tt({de:"Weitere Details", en:"Additional Details"})}
          </DialogTitle>
        </DialogHeader>

        {isTrialBlocked && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold text-foreground">
              {tt({ de: "Account gesperrt — Trial abgelaufen", en: "Account locked — trial expired" })}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {tt({
                de: "Dein 30-Tage-Trial ist abgelaufen. Um wieder Belege scannen zu können, wähle bitte einen Plan. Deine bestehenden Daten bleiben weiterhin lesbar.",
                en: "Your 30-day trial has expired. To scan receipts again, please choose a plan. Your existing data remains readable.",
              })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {tt({ de: "Später", en: "Later" })}
              </Button>
              <Button onClick={() => { onClose(); navigate("/pricing"); }}>
                {tt({ de: "Jetzt Plan wählen", en: "Choose plan now" })}
              </Button>
            </div>
          </div>
        )}

        {!isTrialBlocked && limitReached && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold text-foreground">
              {tt({de:"Scan-Limit erreicht", en:"Scan limit reached"})}
            </h3>
             <p className="text-sm text-muted-foreground max-w-xs">
               {tt({
                 de:`Du hast ${scanCount} von ${(TIERS[subscription.tier] || TIERS.free).maxScans} Scans verwendet. Upgrade deinen Plan für mehr Scans.`,
                 en:`You've used ${scanCount} of ${(TIERS[subscription.tier] || TIERS.free).maxScans} scans. Upgrade your plan for more scans.`,
               })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {tt({de:"Schließen", en:"Close"})}
              </Button>
              <Button onClick={() => { onClose(); navigate("/pricing"); }}>
                {tt({de:"Jetzt upgraden", en:"Upgrade Now"})}
              </Button>
            </div>
          </div>
        )}

        {step === "upload" && !limitReached && !isTrialBlocked && (
          <div className="space-y-4">
            {scanCount !== null && !limitReached && (
              <p className="text-xs text-muted-foreground text-right">
                {scanCount} / {(TIERS[subscription.tier] || TIERS.free).maxScans} Scans
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {tt({de:"Fotografiere deinen Beleg oder lade ein Bild/PDF hoch. Bei mehrseitigen Belegen (z.B. Hotelrechnungen) kannst du im nächsten Schritt weitere Seiten hinzufügen.", en:"Take a photo of your receipt or upload an image/PDF. For multi-page receipts (e.g. hotel invoices) you can add more pages in the next step."})}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-28 flex-col gap-2" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-sm">{tt({de:"Kamera", en:"Camera"})}</span>
              </Button>
              <Button variant="outline" className="h-28 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-8 w-8 text-primary" />
                <span className="text-sm">{tt({de:"Datei wählen", en:"Choose File"})}</span>
              </Button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePageAdded(f); e.target.value = ""; }} />
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePageAdded(f); e.target.value = ""; }} />
          </div>
        )}

        {step === "pages" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {tt({de:`${pages.length} Seite(n) erfasst. Weitere Seiten hinzufügen oder Scan starten.`, en:`${pages.length} page(s) captured. Add more pages or start scanning.`})}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {pages.map((page, i) => (
                <div key={i} className="relative group">
                  <img src={page.preview} alt={`Page ${i + 1}`} className="h-24 w-full rounded-md border object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 text-[10px] bg-background/80 rounded px-1 font-medium">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePage(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                className="h-24 flex-col gap-1 border-dashed"
                onClick={() => addPageInputRef.current?.click()}
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{tt({de:"Seite", en:"Page"})}</span>
              </Button>
            </div>
            <input ref={addPageInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePageAdded(f); e.target.value = ""; }} />
            <input ref={addPageCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePageAdded(f); e.target.value = ""; }} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => addPageCameraRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" />
                {tt({de:"Foto", en:"Photo"})}
              </Button>
              <Button className="flex-1" onClick={handleStartScan} disabled={pages.length === 0}>
                <ArrowRight className="h-4 w-4 mr-2" />
                {tt({de:`Scannen (${pages.length} ${pages.length === 1 ? "Seite" : "Seiten"})`, en:`Scan (${pages.length} ${pages.length === 1 ? "page" : "pages"})`})}
              </Button>
            </div>
          </div>
        )}

        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-8">
            {pages.length > 1 ? (
              <div className="flex gap-1 justify-center">
                {pages.slice(0, 4).map((page, i) => (
                  <img key={i} src={page.preview} alt={`Page ${i + 1}`} className="h-20 rounded border object-cover" />
                ))}
                {pages.length > 4 && <span className="text-xs text-muted-foreground self-center">+{pages.length - 4}</span>}
              </div>
            ) : (
              preview && <img src={preview} alt="Receipt" className="max-h-40 rounded-lg border object-contain" />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {pages.length > 1
                ? tt({de:`KI liest ${pages.length} Seiten aus...`, en:`AI reading ${pages.length} pages...`})
                : tt({de:"KI liest Beleg aus...", en:"AI reading receipt..."})}
            </p>
          </div>
        )}

        {step === "company" && (
          <div className="space-y-3">
            {preview && <img src={preview} alt="Receipt" className="max-h-24 w-full rounded-lg border object-contain" />}

            {/* Handwritten / multi-receipt warnings */}
            {scanResult?.is_handwritten && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/30 p-2.5">
                <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning">
                  {tt({ de: "Handschriftlicher Beleg erkannt – bitte Daten sorgfältig prüfen.", en: "Handwritten receipt detected – please verify data carefully." })}
                </p>
              </div>
            )}
            {scanResult?.multiple_receipts_detected && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  {tt({ de: "Mehrere Belege im Bild erkannt! Bitte nur einen Beleg pro Scan hochladen.", en: "Multiple receipts detected! Please upload only one receipt per scan." })}
                </p>
              </div>
            )}

            {scanResult && (
              <div className="rounded-md bg-muted/50 p-2.5 text-sm space-y-0.5">
                <p className="font-medium text-foreground text-xs">
                  {tt({de:"Erkannte Daten:", en:"Detected data:"})}
                </p>
                {scanResult.vendor && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>📍 {scanResult.vendor}</span>
                    {confidenceBadge(conf?.vendor, lang)}
                  </div>
                )}
                {scanResult.amount && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">💰 {scanResult.amount.toFixed(2)} {scanResult.currency || "EUR"} inkl. MwSt.</span>
                    {confidenceBadge(conf?.amount, lang)}
                    {scanResult.currency && scanResult.currency !== "EUR" && amount && (
                      <span>≈ {Number(amount).toFixed(2)} €</span>
                    )}
                    {vatItems.length > 1 ? (
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {vatItems.map((item, idx) => (
                          <span key={idx} className="text-xs text-muted-foreground">
                            📊 {item.label}: {item.vat_amount.toFixed(2)} € ({item.vat_rate}%)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <>
                        {scanResult.tax_amount != null && (
                          <span className="flex items-center gap-1">
                            MwSt: {scanResult.tax_amount.toFixed(2)} {scanResult.currency || "EUR"}
                            {confidenceBadge(conf?.tax_amount, lang)}
                          </span>
                        )}
                        {scanResult.tax_amount != null && scanResult.currency && scanResult.currency !== "EUR" && vatAmount && (
                          <span>≈ {Number(vatAmount).toFixed(2)} €</span>
                        )}
                        {scanResult.tax_rate != null && (
                          <span className="flex items-center gap-1">
                            Satz: {scanResult.tax_rate}%
                            {confidenceBadge(conf?.tax_rate, lang)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
                {scanResult.date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>📅 {scanResult.date}</span>
                    {confidenceBadge(conf?.date, lang)}
                  </div>
                )}
                {isFuelReceipt && <p className="text-muted-foreground text-xs">⛽ {tt({de:"Tankquittung erkannt", en:"Fuel receipt detected"})}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm">{tt({de:"Datum", en:"Date"})}</Label>
                  {confidenceBadge(conf?.date, lang)}
                </div>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`h-11 text-base ${confidenceColor(conf?.date)}`} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm">{tt({de:"Betrag inkl. MwSt. (€)", en:"Amount incl. VAT (€)"})}</Label>
                  {confidenceBadge(conf?.amount, lang)}
                </div>
                {scanResult?.currency && scanResult.currency !== "EUR" && originalAmount && (
                  <p className="text-xs text-muted-foreground">
                    {tt({ de: "Original", en: "Original" })}: {Number(originalAmount).toFixed(2)} {scanResult.currency}
                  </p>
                )}
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if ((scanResult?.currency || "EUR") === "EUR") {
                      setOriginalAmount(e.target.value);
                    }
                  }}
                  placeholder="0.00"
                  className={`h-11 text-base ${confidenceColor(conf?.amount)}`}
                />
              </div>
            </div>

            {/* VAT items - multiple rates support */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{tt({de:"MwSt.-Positionen", en:"VAT Items"})}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setVatItems(prev => [...prev, { label: "", net_amount: null, vat_rate: 19, vat_amount: 0 }])}
                >
                  <Plus className="h-3 w-3" />
                  {tt({de:"Position", en:"Item"})}
                </Button>
              </div>
              {vatItems.length > 0 ? (
                <div className="space-y-2">
                  {vatItems.map((item, idx) => (
                    <div key={idx} className="rounded-md border bg-muted/30 p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <Input
                          value={item.label}
                          onChange={(e) => {
                            const updated = [...vatItems];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setVatItems(updated);
                          }}
                          placeholder={tt({de:"z.B. Übernachtung, Speisen...", en:"e.g. Accommodation, Food..."})}
                          className="h-8 text-sm flex-1 mr-2"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setVatItems(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">{tt({de:"Netto (€)", en:"Net (€)"})}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.net_amount ?? ""}
                            onChange={(e) => {
                              const updated = [...vatItems];
                              updated[idx] = { ...updated[idx], net_amount: e.target.value ? parseFloat(e.target.value) : null };
                              setVatItems(updated);
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">{tt({de:"MwSt. %", en:"VAT %"})}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.vat_rate}
                            onChange={(e) => {
                              const updated = [...vatItems];
                              updated[idx] = { ...updated[idx], vat_rate: parseFloat(e.target.value) || 0 };
                              setVatItems(updated);
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">{tt({de:"MwSt. (€)", en:"VAT (€)"})}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.vat_amount}
                            onChange={(e) => {
                              const updated = [...vatItems];
                              updated[idx] = { ...updated[idx], vat_amount: parseFloat(e.target.value) || 0 };
                              setVatItems(updated);
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>{tt({de:"Gesamt MwSt.", en:"Total VAT"})}</span>
                    <span className="font-mono font-medium">{vatItems.reduce((s, i) => s + (i.vat_amount || 0), 0).toFixed(2)} €</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm">{tt({de:"MwSt.-Satz (%)", en:"VAT Rate (%)"})}</Label>
                      {confidenceBadge(conf?.tax_rate, lang)}
                      {taxCategory && !scanResult?.tax_rate && vatRate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          {tt({de:"Smart Guess", en:"Smart Guess"})}
                        </span>
                      )}
                    </div>
                    <Input type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} placeholder="19" className={`h-11 text-base ${confidenceColor(conf?.tax_rate)}`} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm">{tt({de:"MwSt.-Betrag (€)", en:"VAT Amount (€)"})}</Label>
                      {confidenceBadge(conf?.tax_amount, lang)}
                    </div>
                    <Input type="number" step="0.01" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} placeholder="0.00" className={`h-11 text-base ${confidenceColor(conf?.tax_amount)}`} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Beschreibung", en:"Description"})}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11 text-base" />
            </div>

            {/* Tax Category Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{tt({de:"Steuerliche Kategorie", en:"Tax Category"})}</Label>
              <Select value={taxCategory} onValueChange={setTaxCategory}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder={tt({de:"Kategorie wählen...", en:"Select category..."})} />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="max-h-56">
                  {TAX_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {lang === "de" ? cat.label.de : cat.label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isBewirtung && (
                <div className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/20 p-2 mt-1">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary">
                    {tt({
                      de: "Bei Bewirtungskosten sind gemäß § 4 Abs. 5 EStG Angaben zu Teilnehmern und Anlass der Bewirtung Pflicht.",
                      en: "For entertainment expenses, German tax law (§ 4 Abs. 5 EStG) requires details about participants and purpose.",
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Organisation zuordnen", en:"Assign Organization"})}</Label>
              {!showNewCompany ? (
                <div className="flex items-end gap-2">
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-11 flex-1 text-base">
                      <SelectValue placeholder={tt({de:"Organisation wählen...", en:"Select organization..."})} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="max-h-48">
                      {localCompanies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => setShowNewCompany(true)}
                    title={tt({de:"Neue Organisation", en:"New organization"})}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder={tt({de:"Name der Organisation...", en:"Organization name..."})}
                    className="h-11 flex-1 text-base" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCompany(); } }} />
                  <Button type="button" size="icon" className="h-11 w-11 shrink-0" onClick={handleCreateCompany} disabled={creatingCompany || !newCompanyName.trim()}>
                    {creatingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="ghost" className="h-11 px-3 text-sm text-muted-foreground" onClick={() => { setShowNewCompany(false); setNewCompanyName(""); }}>
                    {tt({de:"Abbrechen", en:"Cancel"})}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 gap-2 h-11" onClick={() => handleSave(true)} disabled={saving}>
                <SkipForward className="h-4 w-4" />
                {tt({de:"Speichern & Skip", en:"Save & Skip"})}
              </Button>
              <Button className="flex-1 gap-2 h-11" onClick={() => setStep("details")}>
                <ArrowRight className="h-4 w-4" />
                {tt({de:"Weiter", en:"Next"})}
              </Button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            {isFuelReceipt ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Kennzeichen", en:"License Plate"})}</Label>
                  {savedVehicles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {savedVehicles.map((v) => (
                        <button
                          key={v.license_plate}
                          type="button"
                          onClick={() => { setLicensePlate(v.license_plate); if (mileage) checkMileage(v.license_plate, mileage); }}
                          className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-colors ${
                            licensePlate === v.license_plate
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          🚗 {v.license_plate}{v.name ? ` · ${v.name}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input value={licensePlate} onChange={(e) => { setLicensePlate(e.target.value); if (mileage) checkMileage(e.target.value, mileage); }} placeholder={tt({de:"z.B. B-AB 1234", en:"e.g. B-AB 1234"})} className="h-11 text-base uppercase font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Kilometerstand", en:"Mileage"})}</Label>
                  <Input type="number" value={mileage} onChange={(e) => { setMileage(e.target.value); checkMileage(licensePlate, e.target.value); }} placeholder={tt({de:"z.B. 45230", en:"e.g. 45230"})} className="h-11 text-base" />
                  {mileageWarning && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2.5 mt-1.5">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{mileageWarning}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className={`text-sm ${isBewirtung ? "font-semibold text-foreground" : ""}`}>
                    {tt({de:"Getroffene Person / Teilnehmer", en:"Person Met / Participants"})}
                    {isBewirtung && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    value={personMet}
                    onChange={(e) => setPersonMet(e.target.value)}
                    className={`h-11 text-base ${isBewirtung && !personMet.trim() ? "ring-2 ring-destructive/50" : ""}`}
                    placeholder={isBewirtung ? tt({de:"Pflichtfeld bei Bewirtung", en:"Required for entertainment"}) : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Unternehmung/Organisation", en:"Organization"})}</Label>
                  <Input value={organization} onChange={(e) => setOrganization(e.target.value)} className="h-11 text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className={`text-sm ${isBewirtung ? "font-semibold text-foreground" : ""}`}>
                    {isBewirtung ? tt({de:"Anlass der Bewirtung", en:"Purpose of Entertainment"}) : tt({de:"Zweck", en:"Purpose"})}
                    {isBewirtung && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Select
                    value={PURPOSE_PRESETS.some(p => p.value === meetingPurpose) || customPurposes.some(cp => cp.label === meetingPurpose)
                      ? meetingPurpose : (meetingPurpose ? "custom" : "")}
                    onValueChange={(val) => {
                      if (val === "custom") { setMeetingPurpose(""); setShowCustomPurpose(true); }
                      else { setMeetingPurpose(val); setShowCustomPurpose(false); }
                    }}
                  >
                    <SelectTrigger className={`h-11 text-base ${isBewirtung && !meetingPurpose.trim() ? "ring-2 ring-destructive/50" : ""}`}>
                      <SelectValue placeholder={tt({de:"Zweck wählen...", en:"Select purpose..."})} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="max-h-56">
                      {PURPOSE_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {tt({de: p.de, en: p.en, tr: p.tr, ar: p.ar, ru: p.ru})}
                        </SelectItem>
                      ))}
                      {customPurposes.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-t mt-1 pt-2">
                            {tt({de:"Eigene Zwecke", en:"Custom purposes", tr:"Özel amaçlar", ar:"أغراض مخصصة", ru:"Свои цели"})}
                          </div>
                          {customPurposes.map((cp) => (
                            <SelectItem key={cp.id} value={cp.label}>
                              ⭐ {cp.label}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      <SelectItem value="custom">
                        {tt({de:"✏️ Eigener Zweck...", en:"✏️ Custom purpose..."})}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {(showCustomPurpose || (!PURPOSE_PRESETS.some(p => p.value === meetingPurpose) && meetingPurpose !== "")) && (
                    <Input value={meetingPurpose} onChange={(e) => setMeetingPurpose(e.target.value)}
                      placeholder={isBewirtung ? tt({de:"Anlass eingeben (Pflicht)...", en:"Enter purpose (required)..."}) : tt({de:"Zweck eingeben...", en:"Enter purpose..."})}
                      className={`h-11 text-base mt-2 ${isBewirtung && !meetingPurpose.trim() ? "ring-2 ring-destructive/50" : ""}`} autoFocus />
                  )}
                </div>
              </>
            )}

            <Button className="w-full gap-2" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving
                ? tt({de:"Speichern...", en:"Saving..."})
                : tt({de:"Beleg speichern", en:"Save Receipt"})}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={showSavePurposePrompt} onOpenChange={setShowSavePurposePrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {tt({de:"Zweck speichern?", en:"Save purpose?", tr:"Amaç kaydedilsin mi?", ar:"حفظ الغرض؟", ru:"Сохранить цель?"})}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tt({
              de:`Möchten Sie "${pendingCustomPurpose}" dauerhaft als Auswahl im Dropdown speichern?`,
              en:`Would you like to permanently save "${pendingCustomPurpose}" as a dropdown option?`,
              tr:`"${pendingCustomPurpose}" kalıcı olarak açılır menüye kaydedilsin mi?`,
              ar:`هل تريد حفظ "${pendingCustomPurpose}" بشكل دائم كخيار في القائمة؟`,
              ru:`Сохранить "${pendingCustomPurpose}" как постоянный вариант в выпадающем списке?`
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setShowSavePurposePrompt(false); setPendingCustomPurpose(""); }}>
            {tt({de:"Nein", en:"No", tr:"Hayır", ar:"لا", ru:"Нет"})}
          </AlertDialogCancel>
          <AlertDialogAction onClick={async () => {
            if (user && pendingCustomPurpose) {
              await supabase.from("custom_purposes").insert({ user_id: user.id, label: pendingCustomPurpose } as any);
              setCustomPurposes(prev => [...prev, { id: crypto.randomUUID(), label: pendingCustomPurpose }]);
              toast({ title: tt({de:"Zweck gespeichert!", en:"Purpose saved!"}) });
            }
            setShowSavePurposePrompt(false);
            setPendingCustomPurpose("");
          }}>
            {tt({de:"Ja, speichern", en:"Yes, save", tr:"Evet, kaydet", ar:"نعم، حفظ", ru:"Да, сохранить"})}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default ScanWizard;
