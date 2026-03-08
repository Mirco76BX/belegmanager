import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, TIERS } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, Loader2, Check, SkipForward, ArrowRight, Plus, AlertTriangle } from "lucide-react";

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

interface ScanResult {
  date: string | null;
  amount: number | null;
  description: string | null;
  vendor: string | null;
  tax_amount: number | null;
  items: string[];
  is_fuel_receipt?: boolean;
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

const ScanWizard = ({ open, onClose, onSaved, companies, defaultCompanyId, onCompaniesChanged }: ScanWizardProps) => {
  const { user, subscription } = useAuth();
  const { lang, tt } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [scanCount, setScanCount] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const [step, setStep] = useState<"upload" | "scanning" | "company" | "details">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [isFuelReceipt, setIsFuelReceipt] = useState(false);

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId || "");
  const [personMet, setPersonMet] = useState("");
  const [organization, setOrganization] = useState("");
  const [meetingPurpose, setMeetingPurpose] = useState("");
  const [showCustomPurpose, setShowCustomPurpose] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");

  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [localCompanies, setLocalCompanies] = useState<Company[]>(companies);

  useEffect(() => { setLocalCompanies(companies); }, [companies]);

  useEffect(() => {
    if (open && user) {
      setStep("upload"); setFile(null); setPreview(null); setScanResult(null);
      setDate(""); setAmount(""); setDescription("");
      setCompanyId(defaultCompanyId || "");
      setPersonMet(""); setOrganization(""); setMeetingPurpose("");
      setShowCustomPurpose(false); setShowNewCompany(false); setNewCompanyName("");
      setLimitReached(false); setIsFuelReceipt(false);
      setLicensePlate(""); setMileage("");

      const maxScans = subscription.tier === "master" ? Infinity
        : subscription.tier === "relax" ? TIERS.relax.maxScans : TIERS.free.maxScans;

      if (maxScans !== Infinity) {
        supabase.from("receipts").select("id", { count: "exact", head: true })
          .then(({ count }) => { const c = count ?? 0; setScanCount(c); if (c >= maxScans) setLimitReached(true); });
      } else { setScanCount(null); setLimitReached(false); }
    }
  }, [open, defaultCompanyId, user, subscription.tier]);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
    setStep("scanning");

    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke("scan-receipt", { body: { imageBase64: base64 } });
      if (error) throw error;

      setScanResult(data);
      if (data.date) setDate(data.date);
      if (data.amount) setAmount(String(data.amount));
      if (data.description || data.vendor) setDescription([data.vendor, data.description].filter(Boolean).join(" – "));
      if (data.is_fuel_receipt) {
        setIsFuelReceipt(true);
        setMeetingPurpose("Tanken");
      }
      setStep("company");
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({ title: tt({de:"Scan fehlgeschlagen. Daten manuell eingeben.", en:"Scan failed. Enter data manually.", tr:"Tarama başarısız. Verileri manuel girin.", ar:"فشل المسح. أدخل البيانات يدوياً.", ru:"Сканирование не удалось. Введите данные вручную."}), variant: "destructive" });
      setDate(new Date().toISOString().split("T")[0]);
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
      toast({ title: tt({de:"Organisation erstellt!", en:"Organization created!", tr:"Kuruluş oluşturuldu!", ar:"تم إنشاء المنظمة!", ru:"Организация создана!"}) });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    finally { setCreatingCompany(false); }
  };

  const handleSave = async (skipDetails = false) => {
    if (!user || !file) return;
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadError) throw uploadError;

      const insertData: any = {
        user_id: user.id, date: date || new Date().toISOString().split("T")[0],
        amount: amount ? parseFloat(amount) : null, description: description || null,
        company_id: companyId || null, file_path: path,
        receipt_type: isFuelReceipt ? "fuel" : "general",
        status: skipDetails ? "pending" : "complete",
      };

      if (isFuelReceipt) {
        insertData.license_plate = skipDetails ? null : licensePlate || null;
        insertData.mileage = skipDetails ? null : (mileage ? parseFloat(mileage) : null);
        insertData.meeting_purpose = "Tanken";
      } else {
        insertData.person_met = skipDetails ? null : personMet || null;
        insertData.organization = skipDetails ? null : organization || null;
        insertData.meeting_purpose = skipDetails ? null : meetingPurpose || null;
      }

      const { error } = await supabase.from("receipts").insert(insertData);
      if (error) throw error;

      toast({ title: tt({de:"Beleg gespeichert!", en:"Receipt saved!", tr:"Fiş kaydedildi!", ar:"تم حفظ الإيصال!", ru:"Чек сохранён!"}) });
      onSaved(); onClose();
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && tt({de:"Beleg scannen", en:"Scan Receipt", tr:"Fiş Tara", ar:"مسح الإيصال", ru:"Сканировать чек"})}
            {step === "scanning" && tt({de:"Wird gescannt...", en:"Scanning...", tr:"Taranıyor...", ar:"جارٍ المسح...", ru:"Сканирование..."})}
            {step === "company" && tt({de:"Zuordnung", en:"Assignment", tr:"Atama", ar:"التعيين", ru:"Назначение"})}
            {step === "details" && tt({de:"Weitere Details", en:"Additional Details", tr:"Ek Detaylar", ar:"تفاصيل إضافية", ru:"Дополнительные данные"})}
          </DialogTitle>
        </DialogHeader>

        {limitReached && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold text-foreground">
              {tt({de:"Scan-Limit erreicht", en:"Scan limit reached", tr:"Tarama limiti doldu", ar:"تم الوصول لحد المسح", ru:"Лимит сканирований достигнут"})}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {tt({
                de:`Du hast ${scanCount} von ${subscription.tier === "relax" ? TIERS.relax.maxScans : TIERS.free.maxScans} Scans verwendet. Upgrade deinen Plan für mehr Scans.`,
                en:`You've used ${scanCount} of ${subscription.tier === "relax" ? TIERS.relax.maxScans : TIERS.free.maxScans} scans. Upgrade your plan for more scans.`,
                tr:`${subscription.tier === "relax" ? TIERS.relax.maxScans : TIERS.free.maxScans} taramadan ${scanCount} tanesini kullandınız. Daha fazlası için planınızı yükseltin.`,
                ar:`لقد استخدمت ${scanCount} من ${subscription.tier === "relax" ? TIERS.relax.maxScans : TIERS.free.maxScans} عملية مسح. قم بترقية خطتك للمزيد.`,
                ru:`Вы использовали ${scanCount} из ${subscription.tier === "relax" ? TIERS.relax.maxScans : TIERS.free.maxScans} сканирований. Обновите план для большего.`,
              })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {tt({de:"Schließen", en:"Close", tr:"Kapat", ar:"إغلاق", ru:"Закрыть"})}
              </Button>
              <Button onClick={() => { onClose(); navigate("/pricing"); }}>
                {tt({de:"Jetzt upgraden", en:"Upgrade Now", tr:"Şimdi Yükselt", ar:"ترقية الآن", ru:"Обновить сейчас"})}
              </Button>
            </div>
          </div>
        )}

        {step === "upload" && !limitReached && (
          <div className="space-y-4">
            {scanCount !== null && !limitReached && (
              <p className="text-xs text-muted-foreground text-right">
                {scanCount} / {subscription.tier === "relax" ? TIERS.relax.maxScans : TIERS.free.maxScans} Scans
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {tt({de:"Fotografiere deinen Beleg oder lade ein Bild/PDF hoch.", en:"Take a photo of your receipt or upload an image/PDF.", tr:"Fişinizin fotoğrafını çekin veya bir görüntü/PDF yükleyin.", ar:"التقط صورة لإيصالك أو ارفع صورة/ملف PDF.", ru:"Сфотографируйте чек или загрузите изображение/PDF."})}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-28 flex-col gap-2" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-sm">{tt({de:"Kamera", en:"Camera", tr:"Kamera", ar:"الكاميرا", ru:"Камера"})}</span>
              </Button>
              <Button variant="outline" className="h-28 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-8 w-8 text-primary" />
                <span className="text-sm">{tt({de:"Datei wählen", en:"Choose File", tr:"Dosya seç", ar:"اختر ملف", ru:"Выбрать файл"})}</span>
              </Button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }} />
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }} />
          </div>
        )}

        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-8">
            {preview && <img src={preview} alt="Receipt" className="max-h-40 rounded-lg border object-contain" />}
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {tt({de:"KI liest Beleg aus...", en:"AI reading receipt...", tr:"Yapay zeka fişi okuyor...", ar:"الذكاء الاصطناعي يقرأ الإيصال...", ru:"ИИ считывает чек..."})}
            </p>
          </div>
        )}

        {step === "company" && (
          <div className="space-y-3">
            {preview && <img src={preview} alt="Receipt" className="max-h-24 w-full rounded-lg border object-contain" />}
            {scanResult && (
              <div className="rounded-md bg-muted/50 p-2.5 text-sm space-y-0.5">
                <p className="font-medium text-foreground text-xs">
                  {tt({de:"Erkannte Daten:", en:"Detected data:", tr:"Algılanan veriler:", ar:"البيانات المكتشفة:", ru:"Обнаруженные данные:"})}
                </p>
                {scanResult.vendor && <p className="text-muted-foreground text-xs">📍 {scanResult.vendor}</p>}
                {scanResult.amount && <p className="text-muted-foreground text-xs">💰 {scanResult.amount.toFixed(2)} €</p>}
                {scanResult.date && <p className="text-muted-foreground text-xs">📅 {scanResult.date}</p>}
                {isFuelReceipt && <p className="text-muted-foreground text-xs">⛽ {tt({de:"Tankquittung erkannt", en:"Fuel receipt detected", tr:"Yakıt fişi algılandı", ar:"تم اكتشاف إيصال وقود", ru:"Обнаружен чек на топливо"})}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">{tt({de:"Datum", en:"Date", tr:"Tarih", ar:"التاريخ", ru:"Дата"})}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{tt({de:"Betrag (€)", en:"Amount (€)", tr:"Tutar (€)", ar:"المبلغ (€)", ru:"Сумма (€)"})}</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-11 text-base" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Beschreibung", en:"Description", tr:"Açıklama", ar:"الوصف", ru:"Описание"})}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11 text-base" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{tt({de:"Organisation zuordnen", en:"Assign Organization", tr:"Kuruluş Ata", ar:"تعيين المنظمة", ru:"Назначить организацию"})}</Label>
              {!showNewCompany ? (
                <div className="flex items-end gap-2">
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-11 flex-1 text-base">
                      <SelectValue placeholder={tt({de:"Organisation wählen...", en:"Select organization...", tr:"Kuruluş seçin...", ar:"اختر المنظمة...", ru:"Выберите организацию..."})} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="max-h-48">
                      {localCompanies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => setShowNewCompany(true)}
                    title={tt({de:"Neue Organisation", en:"New organization", tr:"Yeni kuruluş", ar:"منظمة جديدة", ru:"Новая организация"})}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder={tt({de:"Name der Organisation...", en:"Organization name...", tr:"Kuruluş adı...", ar:"اسم المنظمة...", ru:"Название организации..."})}
                    className="h-11 flex-1 text-base" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCompany(); } }} />
                  <Button type="button" size="icon" className="h-11 w-11 shrink-0" onClick={handleCreateCompany} disabled={creatingCompany || !newCompanyName.trim()}>
                    {creatingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="ghost" className="h-11 px-3 text-sm text-muted-foreground" onClick={() => { setShowNewCompany(false); setNewCompanyName(""); }}>
                    {tt({de:"Abbrechen", en:"Cancel", tr:"İptal", ar:"إلغاء", ru:"Отмена"})}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 gap-2 h-11" onClick={() => handleSave(true)} disabled={saving}>
                <SkipForward className="h-4 w-4" />
                {tt({de:"Speichern & Skip", en:"Save & Skip", tr:"Kaydet & Atla", ar:"حفظ وتخطي", ru:"Сохранить и пропустить"})}
              </Button>
              <Button className="flex-1 gap-2 h-11" onClick={() => setStep("details")}>
                <ArrowRight className="h-4 w-4" />
                {tt({de:"Weiter", en:"Next", tr:"İleri", ar:"التالي", ru:"Далее"})}
              </Button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            {isFuelReceipt ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Kennzeichen", en:"License Plate", tr:"Plaka", ar:"لوحة الترخيص", ru:"Номерной знак"})}</Label>
                  <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder={tt({de:"z.B. B-AB 1234", en:"e.g. B-AB 1234", tr:"ör. 34 ABC 123", ar:"مثال: B-AB 1234", ru:"напр. B-AB 1234"})} className="h-11 text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Kilometerstand", en:"Mileage", tr:"Kilometre", ar:"عداد المسافات", ru:"Пробег"})}</Label>
                  <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder={tt({de:"z.B. 45230", en:"e.g. 45230", tr:"ör. 45230", ar:"مثال: 45230", ru:"напр. 45230"})} className="h-11 text-base" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Getroffene Person", en:"Person Met", tr:"Görüşülen Kişi", ar:"الشخص الملتقى", ru:"Встреча с"})}</Label>
                  <Input value={personMet} onChange={(e) => setPersonMet(e.target.value)} className="h-11 text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Unternehmung/Organisation", en:"Organization", tr:"İşletme/Kuruluş", ar:"المؤسسة/المنظمة", ru:"Предприятие/Организация"})}</Label>
                  <Input value={organization} onChange={(e) => setOrganization(e.target.value)} className="h-11 text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{tt({de:"Zweck", en:"Purpose", tr:"Amaç", ar:"الغرض", ru:"Цель"})}</Label>
                  <Select
                    value={PURPOSE_PRESETS.some(p => p.value === meetingPurpose) ? meetingPurpose : (meetingPurpose ? "custom" : "")}
                    onValueChange={(val) => {
                      if (val === "custom") { setMeetingPurpose(""); setShowCustomPurpose(true); }
                      else { setMeetingPurpose(val); setShowCustomPurpose(false); }
                    }}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder={tt({de:"Zweck wählen...", en:"Select purpose...", tr:"Amaç seçin...", ar:"اختر الغرض...", ru:"Выберите цель..."})} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="max-h-56">
                      {PURPOSE_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {tt({de: p.de, en: p.en, tr: p.tr, ar: p.ar, ru: p.ru})}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        {tt({de:"✏️ Eigener Zweck...", en:"✏️ Custom purpose...", tr:"✏️ Özel amaç...", ar:"✏️ غرض مخصص...", ru:"✏️ Своя цель..."})}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {(showCustomPurpose || (!PURPOSE_PRESETS.some(p => p.value === meetingPurpose) && meetingPurpose !== "")) && (
                    <Input value={meetingPurpose} onChange={(e) => setMeetingPurpose(e.target.value)}
                      placeholder={tt({de:"Zweck eingeben...", en:"Enter purpose...", tr:"Amaç girin...", ar:"أدخل الغرض...", ru:"Введите цель..."})}
                      className="h-11 text-base mt-2" autoFocus />
                  )}
                </div>
              </>
            )}

            <Button className="w-full gap-2" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving
                ? tt({de:"Speichern...", en:"Saving...", tr:"Kaydediliyor...", ar:"جارٍ الحفظ...", ru:"Сохранение..."})
                : tt({de:"Beleg speichern", en:"Save Receipt", tr:"Fişi kaydet", ar:"حفظ الإيصال", ru:"Сохранить чек"})}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScanWizard;
