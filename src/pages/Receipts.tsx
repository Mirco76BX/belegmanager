import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Receipt as ReceiptIcon, Trash2, Pencil, ScanLine } from "lucide-react";
import ScanWizard from "@/components/ScanWizard";
import ReceiptsInlineTable from "@/components/ReceiptsInlineTable";

interface VatItem {
  id: string;
  label: string | null;
  net_amount: number | null;
  vat_rate: number;
  vat_amount: number;
}

interface Receipt {
  id: string;
  date: string;
  amount: number | null;
  currency?: string;
  description: string | null;
  person_met: string | null;
  organization: string | null;
  meeting_purpose: string | null;
  file_path: string | null;
  status: string;
  company_id: string | null;
  created_at: string;
  receipt_type?: string;
  license_plate?: string | null;
  mileage?: number | null;
  vat_amount?: number | null;
  vat_rate?: number | null;
  amount_eur?: number | null;
}

interface Company {
  id: string;
  name: string;
}

const Receipts = () => {
  const { t, lang, tt } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const locale = getLocale(lang);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState<string | null>(null);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReceipt, setDetailReceipt] = useState<Receipt | null>(null);
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editPersonMet, setEditPersonMet] = useState("");
  const [editOrganization, setEditOrganization] = useState("");
  const [editMeetingPurpose, setEditMeetingPurpose] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "fuel">("general");

  const fetchData = async () => {
    if (!user) return;
    const [receiptsRes, companiesRes, profileRes] = await Promise.all([
      supabase.from("receipts").select("*").order("date", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("profiles").select("default_company_id").eq("id", user.id).single(),
    ]);
    if (receiptsRes.data) setReceipts(receiptsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (profileRes.data?.default_company_id) setDefaultCompanyId(profileRes.data.default_company_id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    const handler = () => setScanOpen(true);
    window.addEventListener("open-scan", handler);
    return () => window.removeEventListener("open-scan", handler);
  }, []);

  const openDetail = async (r: Receipt) => {
    setDetailReceipt(r);
    setIsEditing(false);
    setDetailImageUrl(null);
    setDetailOpen(true);
    if (r.file_path) {
      const { data } = await supabase.storage.from("receipts").createSignedUrl(r.file_path, 300);
      if (data?.signedUrl) setDetailImageUrl(data.signedUrl);
    }
  };

  const startEditing = () => {
    if (!detailReceipt) return;
    setEditPersonMet(detailReceipt.person_met || "");
    setEditOrganization(detailReceipt.organization || "");
    setEditMeetingPurpose(detailReceipt.meeting_purpose || "");
    setEditCompanyId(detailReceipt.company_id || "");
    setEditLicensePlate(detailReceipt.license_plate || "");
    setEditMileage(detailReceipt.mileage?.toString() || "");
    setIsEditing(true);
  };

  const isFuel = (r: Receipt | null) => r?.receipt_type === "fuel";

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailReceipt) return;
    setEditSaving(true);

    const updateData: any = {
      company_id: editCompanyId || null,
      status: "complete",
    };

    if (isFuel(detailReceipt)) {
      updateData.license_plate = editLicensePlate || null;
      updateData.mileage = editMileage ? parseFloat(editMileage) : null;
    } else {
      updateData.person_met = editPersonMet || null;
      updateData.organization = editOrganization || null;
      updateData.meeting_purpose = editMeetingPurpose || null;
    }

    const { error } = await supabase.from("receipts").update(updateData).eq("id", detailReceipt.id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: tt({de:"Gespeichert", en:"Saved", tr:"Kaydedildi", ar:"تم الحفظ", ru:"Сохранено"}) });
      setDetailOpen(false);
      fetchData();
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (filePath) await supabase.storage.from("receipts").remove([filePath]);
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (!error) { setDetailOpen(false); fetchData(); }
  };

  const formatAmount = (a: number | null, currency?: string, amountEur?: number | null) => {
    if (a == null) return "–";
    if (currency && currency !== "EUR") {
      const eurStr = amountEur != null ? `${amountEur.toFixed(2)} €` : "–";
      return `${eurStr}`;
    }
    return `${a.toFixed(2)} €`;
  };
  const formatAmountFull = (r: Receipt) => {
    if (r.amount == null) return "–";
    if (r.currency && r.currency !== "EUR") {
      const eurStr = r.amount_eur != null ? `${r.amount_eur.toFixed(2)} €` : "–";
      return `${eurStr} (${r.amount.toFixed(2)} ${r.currency})`;
    }
    return `${r.amount.toFixed(2)} €`;
  };
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "–";

  const filteredByCompany = filterCompanyId === "all" ? receipts
    : filterCompanyId === "none" ? receipts.filter(r => !r.company_id)
    : receipts.filter(r => r.company_id === filterCompanyId);
  const filtered = filterMonth === "all" ? filteredByCompany
    : filteredByCompany.filter(r => r.date.substring(0, 7) === filterMonth);
  const generalReceipts = filtered.filter(r => r.receipt_type !== "fuel");
  const fuelReceipts = filtered.filter(r => r.receipt_type === "fuel");

  // Build unique months from receipts for filter
  const availableMonths = Array.from(new Set(receipts.map(r => r.date.substring(0, 7)))).sort().reverse();

  const renderMobileCards = (list: Receipt[]) => (
    <div className="md:hidden space-y-2">
      {list.map((r) => (
        <Card key={r.id} className={`cursor-pointer active:bg-muted/50 transition-colors ${r.status === "pending" ? "border-warning/50" : ""}`} onClick={() => openDetail(r)}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-sm font-semibold whitespace-nowrap">{formatAmount(r.amount, r.currency, r.amount_eur)}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(r.date).toLocaleDateString(locale)}
                </span>
                {r.status === "pending" && (
                  <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded whitespace-nowrap">
                    {tt({de:"Offen", en:"Pending", tr:"Beklemede", ar:"معلق", ru:"Ожидает"})}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(r.id, r.file_path); }}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {r.description && <p className="text-sm text-foreground truncate mt-0.5">{r.description}</p>}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {r.company_id && (
                <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                  🏢 {companyName(r.company_id)}
                </span>
              )}
              {r.receipt_type === "fuel" && r.license_plate && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap">
                  🚗 {r.license_plate}{r.mileage != null ? ` · ${r.mileage.toLocaleString()} km` : ""}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">{t("receipts.title")}</h1>
        <Button className="gap-2" onClick={() => setScanOpen(true)}>
          <ScanLine className="h-4 w-4" />
          {t("receipts.scan")}
        </Button>
      </div>

      {receipts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterCompanyId} onValueChange={setFilterCompanyId}>
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue placeholder={tt({de:"Alle Organisationen", en:"All organizations", tr:"Tüm kuruluşlar", ar:"جميع المنظمات", ru:"Все организации"})} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="max-h-56">
              <SelectItem value="all">{tt({de:"Alle Organisationen", en:"All organizations", tr:"Tüm kuruluşlar", ar:"جميع المنظمات", ru:"Все организации"})}</SelectItem>
              <SelectItem value="none">{tt({de:"Ohne Organisation", en:"No organization", tr:"Kuruluşsuz", ar:"بدون منظمة", ru:"Без организации"})}</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder={tt({de:"Alle Monate", en:"All months", tr:"Tüm aylar", ar:"جميع الأشهر", ru:"Все месяцы"})} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="max-h-56">
              <SelectItem value="all">{tt({de:"Alle Monate", en:"All months", tr:"Tüm aylar", ar:"جميع الأشهر", ru:"Все месяцы"})}</SelectItem>
              {availableMonths.map((m) => {
                const [y, mo] = m.split("-");
                const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString(locale, { year: "numeric", month: "long" });
                return <SelectItem key={m} value={m}>{label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ReceiptIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("receipts.noReceipts")}</p>
            <p className="mt-1 text-sm text-muted-foreground/60">{t("receipts.scanHint")}</p>
            <Button className="mt-4 gap-2" onClick={() => setScanOpen(true)}>
              <Camera className="h-4 w-4" />
              {tt({de:"Ersten Beleg scannen", en:"Scan first receipt", tr:"İlk fişi tara", ar:"مسح أول إيصال", ru:"Сканировать первый чек"})}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "general" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🧾 {tt({de:"Belege", en:"Receipts", tr:"Fişler", ar:"الإيصالات", ru:"Чеки"})}
              <span className="text-xs text-muted-foreground">({generalReceipts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("fuel")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "fuel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ⛽ {tt({de:"Tankquittungen", en:"Fuel Receipts", tr:"Yakıt Fişleri", ar:"إيصالات الوقود", ru:"Чеки на топливо"})}
              <span className="text-xs text-muted-foreground">({fuelReceipts.length})</span>
            </button>
          </div>

          {/* Active tab content */}
          {activeTab === "general" ? (
            generalReceipts.length > 0 ? (
              <>
                <Card className="hidden md:block">
                  <CardContent className="p-0">
                    <ReceiptsInlineTable
                      receipts={generalReceipts}
                      companies={companies}
                      onDelete={handleDelete}
                      onOpenDetail={openDetail}
                      onSaved={fetchData}
                    />
                  </CardContent>
                </Card>
                {renderMobileCards(generalReceipts)}
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{tt({de:"Keine Belege vorhanden", en:"No receipts", tr:"Fiş yok", ar:"لا إيصالات", ru:"Нет чеков"})}</CardContent></Card>
            )
          ) : (
            fuelReceipts.length > 0 ? (
              <>
                <Card className="hidden md:block">
                  <CardContent className="p-0">
                    <ReceiptsInlineTable
                      receipts={fuelReceipts}
                      companies={companies}
                      onDelete={handleDelete}
                      onOpenDetail={openDetail}
                      onSaved={fetchData}
                    />
                  </CardContent>
                </Card>
                {renderMobileCards(fuelReceipts)}
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{tt({de:"Keine Tankquittungen vorhanden", en:"No fuel receipts", tr:"Yakıt fişi yok", ar:"لا إيصالات وقود", ru:"Нет чеков на топливо"})}</CardContent></Card>
            )
          )}
        </div>
      )}

      <ScanWizard
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onSaved={fetchData}
        companies={companies}
        defaultCompanyId={defaultCompanyId}
        onCompaniesChanged={fetchData}
      />

      <Dialog open={detailOpen} onOpenChange={(o) => { if (!o) { setDetailOpen(false); setIsEditing(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? tt({de:"Beleg bearbeiten", en:"Edit Receipt", tr:"Fişi düzenle", ar:"تعديل الإيصال", ru:"Редактировать чек"})
                : tt({de:"Beleg-Details", en:"Receipt Details", tr:"Fiş detayları", ar:"تفاصيل الإيصال", ru:"Детали чека"})}
            </DialogTitle>
          </DialogHeader>

          {!isEditing && detailReceipt && (
            <div className="space-y-4">
              {detailImageUrl && (
                <img src={detailImageUrl} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg border bg-muted" />
              )}

              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("receipts.date")}</span>
                  <span className="font-medium">{new Date(detailReceipt.date).toLocaleDateString(locale)}</span>
                </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">{t("receipts.amount")}</span>
                   <span className="font-mono font-semibold">{formatAmountFull(detailReceipt)}</span>
                 </div>
                 {(detailReceipt.vat_amount != null || detailReceipt.vat_rate != null) && (
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">MwSt.</span>
                     <span className="font-mono">
                       {detailReceipt.vat_amount != null ? `${detailReceipt.vat_amount.toFixed(2)} ${detailReceipt.currency && detailReceipt.currency !== "EUR" ? detailReceipt.currency : "€"}` : "–"}
                       {detailReceipt.vat_rate != null ? ` (${detailReceipt.vat_rate}%)` : ""}
                     </span>
                   </div>
                 )}
                {detailReceipt.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("receipts.description")}</span>
                    <span className="text-right max-w-[60%]">{detailReceipt.description}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("receipts.company")}</span>
                  <span>{companyName(detailReceipt.company_id)}</span>
                </div>

                {isFuel(detailReceipt) ? (
                  <>
                    {detailReceipt.license_plate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{tt({de:"Kennzeichen", en:"License Plate", tr:"Plaka", ar:"لوحة الترخيص", ru:"Номерной знак"})}</span>
                        <span>{detailReceipt.license_plate}</span>
                      </div>
                    )}
                    {detailReceipt.mileage != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{tt({de:"Kilometerstand", en:"Mileage", tr:"Kilometre", ar:"عداد المسافات", ru:"Пробег"})}</span>
                        <span>{detailReceipt.mileage.toLocaleString()} km</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {detailReceipt.person_met && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("receipts.person")}</span>
                        <span>{detailReceipt.person_met}</span>
                      </div>
                    )}
                    {detailReceipt.organization && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("receipts.organization")}</span>
                        <span>{detailReceipt.organization}</span>
                      </div>
                    )}
                    {detailReceipt.meeting_purpose && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("receipts.meetingPurpose")}</span>
                        <span className="text-right max-w-[60%]">{detailReceipt.meeting_purpose}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={detailReceipt.status === "pending" ? "text-warning" : "text-green-600"}>
                    {detailReceipt.status === "pending"
                      ? tt({de:"Offen", en:"Pending", tr:"Beklemede", ar:"معلق", ru:"Ожидает"})
                      : tt({de:"Vollständig", en:"Complete", tr:"Tamamlandı", ar:"مكتمل", ru:"Завершено"})}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={startEditing}>
                  <Pencil className="h-4 w-4" />
                  {t("general.edit")}
                </Button>
                <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => handleDelete(detailReceipt.id, detailReceipt.file_path)}>
                  <Trash2 className="h-4 w-4" />
                  {t("general.delete")}
                </Button>
              </div>
            </div>
          )}

          {isEditing && detailReceipt && (
            <form onSubmit={handleEditSave} className="space-y-3">
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">{tt({de:"KI-erkannte Daten (nicht änderbar)", en:"AI-detected data (read-only)", tr:"Yapay zeka ile algılanan veriler (salt okunur)", ar:"بيانات تم اكتشافها بالذكاء الاصطناعي (للقراءة فقط)", ru:"Данные ИИ (только чтение)"})}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("receipts.date")}</Label>
                    <p className="text-sm font-medium">{new Date(detailReceipt.date).toLocaleDateString(locale)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t("receipts.amount")}</Label>
                    <p className="text-sm font-mono font-semibold">{detailReceipt.amount != null ? `${detailReceipt.amount.toFixed(2)} €` : "–"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("receipts.description")}</Label>
                  <p className="text-sm">{detailReceipt.description || "–"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("receipts.assignCompany")}</Label>
                <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="–" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="max-h-48">
                    {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {isFuel(detailReceipt) ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{tt({de:"Kennzeichen", en:"License Plate", tr:"Plaka", ar:"لوحة الترخيص", ru:"Номерной знак"})}</Label>
                    <Input value={editLicensePlate} onChange={(e) => setEditLicensePlate(e.target.value)} placeholder={tt({de:"z.B. B-AB 1234", en:"e.g. B-AB 1234", tr:"ör. 34 ABC 123", ar:"مثال: B-AB 1234", ru:"напр. B-AB 1234"})} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{tt({de:"Kilometerstand", en:"Mileage", tr:"Kilometre", ar:"عداد المسافات", ru:"Пробег"})}</Label>
                    <Input type="number" value={editMileage} onChange={(e) => setEditMileage(e.target.value)} placeholder={tt({de:"z.B. 45230", en:"e.g. 45230", tr:"ör. 45230", ar:"مثال: 45230", ru:"напр. 45230"})} className="h-10" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("receipts.person")}</Label>
                    <Input value={editPersonMet} onChange={(e) => setEditPersonMet(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("receipts.organization")}</Label>
                    <Input value={editOrganization} onChange={(e) => setEditOrganization(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("receipts.meetingPurpose")}</Label>
                    <Input value={editMeetingPurpose} onChange={(e) => setEditMeetingPurpose(e.target.value)} className="h-10" />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  {t("general.cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={editSaving}>
                  {editSaving ? t("general.loading") : t("general.save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{tt({de:"Beleg-Vorschau", en:"Receipt Preview", tr:"Fiş önizleme", ar:"معاينة الإيصال", ru:"Предпросмотр чека"})}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            previewUrl.includes(".pdf") ? (
              <iframe src={previewUrl} className="h-[70vh] w-full rounded" />
            ) : (
              <img src={previewUrl} alt="Receipt" className="max-h-[70vh] w-full object-contain rounded" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Receipts;
