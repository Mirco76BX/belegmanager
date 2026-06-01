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
import { Camera, Receipt as ReceiptIcon, Trash2, Pencil, ScanLine, Search } from "lucide-react";
import ScanWizard from "@/components/ScanWizard";
import ImageLightbox from "@/components/ImageLightbox";
import VatItemsEditor from "@/components/VatItemsEditor";
import ReceiptsInlineTable from "@/components/ReceiptsInlineTable";
import { TAX_CATEGORIES, getRequiredFields } from "@/lib/taxCategories";

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
  tax_category?: string | null;
  accounting_status?: "open" | "ready" | "exported" | "verbucht" | null;
  export_batch_id?: string | null;
  exported_at?: string | null;
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [vatEditorOpen, setVatEditorOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReceipt, setDetailReceipt] = useState<Receipt | null>(null);
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(null);
  const [detailImageError, setDetailImageError] = useState(false);
  const [detailVatItems, setDetailVatItems] = useState<VatItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [editPersonMet, setEditPersonMet] = useState("");
  const [editOrganization, setEditOrganization] = useState("");
  const [editMeetingPurpose, setEditMeetingPurpose] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editTaxCategory, setEditTaxCategory] = useState("");
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
    setDetailImageError(false);
    setDetailVatItems([]);
    setDetailOpen(true);
    if (r.file_path) {
      const { data } = await supabase.storage.from("receipts").createSignedUrl(r.file_path, 300);
      if (data?.signedUrl) setDetailImageUrl(data.signedUrl);
    }
    // Fetch VAT items
    const { data: vatData } = await supabase
      .from("receipt_vat_items")
      .select("*")
      .eq("receipt_id", r.id)
      .order("vat_rate");
    if (vatData && vatData.length > 0) setDetailVatItems(vatData);
  };

  const startEditing = () => {
    if (!detailReceipt) return;
    setEditPersonMet(detailReceipt.person_met || "");
    setEditOrganization(detailReceipt.organization || "");
    setEditMeetingPurpose(detailReceipt.meeting_purpose || "");
    setEditCompanyId(detailReceipt.company_id || "");
    setEditLicensePlate(detailReceipt.license_plate || "");
    setEditMileage(detailReceipt.mileage?.toString() || "");
    setEditTaxCategory(detailReceipt.tax_category || "");
    setIsEditing(true);
  };

  const isFuel = (r: Receipt | null) => r?.receipt_type === "fuel";

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailReceipt || !user) return;

    // Pflichtfeld-Check je Steuerkategorie (§ 4 Abs. 5 EStG für Bewirtung u.a.)
    // Ohne Teilnehmer + Anlass fehlt der GoBD-relevante Nachweis,
    // den Michael bei der Bilanzierung verlangt.
    const reqFields = getRequiredFields(editTaxCategory);
    const missing: string[] = [];
    if (reqFields.includes("person_met") && !editPersonMet.trim()) missing.push("Teilnehmer/Person");
    if (reqFields.includes("meeting_purpose") && !editMeetingPurpose.trim()) missing.push("Anlass");
    if (missing.length > 0) {
      toast({
        title: tt({ de: "Pflichtfelder fehlen", en: "Required fields missing" }),
        description: tt({
          de: `Für die Kategorie ist Folgendes erforderlich: ${missing.join(", ")}. Bitte ergänzen.`,
          en: `For this category the following is required: ${missing.join(", ")}. Please fill in.`,
        }),
        variant: "destructive",
      });
      return;
    }

    // GoBD-Schicht B: Festgeschriebene Belege dürfen nicht geändert werden.
    // (Datenbank-Trigger blockt es ohnehin, hier nur User-freundliche Warnung.)
    if (detailReceipt.accounting_status === "exported" || detailReceipt.accounting_status === "verbucht") {
      toast({
        title: tt({ de: "Beleg ist festgeschrieben", en: "Receipt is locked" }),
        description: tt({
          de: "Dieser Beleg wurde bereits in einem DATEV-Stapel exportiert. Änderungen sind nach GoBD nicht erlaubt.",
          en: "This receipt was already exported in a DATEV stapel. Changes are not allowed per GoBD.",
        }),
        variant: "destructive",
      });
      return;
    }

    setEditSaving(true);

    // GoBD-Schicht C: Vorher/Nachher-Diff für Audit-Log berechnen.
    const auditFields: Array<{ field: string; oldVal: string | null; newVal: string | null }> = [];
    const pushIfChanged = (field: string, oldRaw: unknown, newRaw: unknown) => {
      const oldStr = oldRaw == null || oldRaw === "" ? null : String(oldRaw);
      const newStr = newRaw == null || newRaw === "" ? null : String(newRaw);
      if (oldStr !== newStr) auditFields.push({ field, oldVal: oldStr, newVal: newStr });
    };
    pushIfChanged("company_id", detailReceipt.company_id, editCompanyId || null);
    pushIfChanged("tax_category", detailReceipt.tax_category, editTaxCategory || null);
    if (isFuel(detailReceipt)) {
      pushIfChanged("license_plate", detailReceipt.license_plate, editLicensePlate || null);
      pushIfChanged("mileage", detailReceipt.mileage, editMileage ? parseFloat(editMileage) : null);
    } else {
      pushIfChanged("person_met", detailReceipt.person_met, editPersonMet || null);
      pushIfChanged("organization", detailReceipt.organization, editOrganization || null);
      pushIfChanged("meeting_purpose", detailReceipt.meeting_purpose, editMeetingPurpose || null);
    }

    const updateData: any = {
      company_id: editCompanyId || null,
      tax_category: editTaxCategory || null,
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
      setEditSaving(false);
      return;
    }

    // GoBD-Schicht C: Audit-Einträge schreiben (nur wenn etwas geändert wurde)
    if (auditFields.length > 0) {
      const auditRows = auditFields.map((f) => ({
        receipt_id: detailReceipt.id,
        user_id: user.id,
        field_name: f.field,
        old_value: f.oldVal,
        new_value: f.newVal,
        change_type: "edit",
      }));
      const { error: auditErr } = await supabase.from("receipt_changes").insert(auditRows);
      if (auditErr) {
        // Audit-Fehler nicht silent fressen — User soll wissen, dass die
        // Änderung zwar gespeichert, aber nicht GoBD-protokolliert ist.
        console.warn("[GoBD] Audit-Log fehlgeschlagen:", auditErr);
        toast({
          title: tt({ de: "Gespeichert, aber Audit-Log fehlgeschlagen", en: "Saved, but audit log failed" }),
          description: auditErr.message,
          variant: "destructive",
        });
      }
    }

    toast({ title: tt({de:"Gespeichert", en:"Saved", tr:"Kaydedildi", ar:"تم الحفظ", ru:"Сохранено"}) });
    setDetailOpen(false);
    fetchData();
    setEditSaving(false);
  };

  /**
   * GoBD-konformes Zurücksetzen der MwSt-Positionen:
   * Wenn der OCR-Scanner inkonsistente MwSt-Positionen erfasst hat (Summe der vat_items
   * weicht vom Brutto ab), kann der User sie hier zurücksetzen. Der DATEV-Export
   * fällt dann auf den Default-MwSt-Satz aus der Tax-Category zurück.
   * Audit-Log wird geschrieben (jede gelöschte Position).
   */
  const handleResetVatItems = async () => {
    if (!detailReceipt || !user || detailVatItems.length === 0) return;
    if (detailReceipt.accounting_status === "exported" || detailReceipt.accounting_status === "verbucht") {
      toast({
        title: tt({ de: "Beleg ist festgeschrieben", en: "Receipt is locked" }),
        description: tt({
          de: "MwSt-Positionen festgeschriebener Belege können nicht geändert werden.",
          en: "VAT items of locked receipts cannot be changed.",
        }),
        variant: "destructive",
      });
      return;
    }
    const confirmMsg = tt({
      de: `${detailVatItems.length} MwSt-Position(en) entfernen? Der DATEV-Export verwendet danach den Default-MwSt-Satz aus der Steuer-Kategorie.`,
      en: `Remove ${detailVatItems.length} VAT item(s)? The DATEV export will fall back to the default VAT rate from the tax category.`,
    });
    if (!window.confirm(confirmMsg)) return;

    // Audit-Log VOR dem Löschen schreiben — wir loggen die Werte der gelöschten Positionen.
    const auditRows = detailVatItems.map((vi) => ({
      receipt_id: detailReceipt.id,
      user_id: user.id,
      field_name: `vat_item:${vi.vat_rate}%`,
      old_value: `${vi.vat_amount.toFixed(2)}€ (label: ${vi.label || "–"}, netto: ${vi.net_amount ?? "–"})`,
      new_value: null,
      change_type: "delete",
    }));
    const { error: auditErr } = await supabase.from("receipt_changes").insert(auditRows);
    if (auditErr) {
      console.warn("[GoBD] Audit-Log vor vat_items-Reset fehlgeschlagen:", auditErr);
      toast({
        title: tt({ de: "Audit-Log fehlgeschlagen", en: "Audit log failed" }),
        description: auditErr.message,
        variant: "destructive",
      });
      return; // Ohne Audit-Log NICHT löschen — GoBD-Konformität
    }

    const { error: delErr } = await supabase
      .from("receipt_vat_items")
      .delete()
      .eq("receipt_id", detailReceipt.id);
    if (delErr) {
      toast({ title: delErr.message, variant: "destructive" });
      return;
    }

    setDetailVatItems([]);
    toast({
      title: tt({ de: "MwSt-Positionen entfernt", en: "VAT items removed" }),
      description: tt({
        de: "DATEV-Export verwendet jetzt den Default-Satz der Steuer-Kategorie.",
        en: "DATEV export will now use the default rate from the tax category.",
      }),
    });
    fetchData();
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (filePath) await supabase.storage.from("receipts").remove([filePath]);
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (!error) { setDetailOpen(false); fetchData(); }
  };

  /**
   * Trinkgeld-Position automatisch anlegen.
   * Wenn Brutto-Beleg höher als Summe(vat_items), kann die Differenz Trinkgeld sein
   * (typisch bei Bewirtungs-Belegen wo Service-Personal Trinkgeld auf Rechnung notiert).
   *
   * Steuer-Behandlung:
   * - Trinkgeld an Personal = KEIN MwSt-pflichtiger Umsatz (kein Leistungsaustausch)
   * - Bei Bewirtungs-Kontext: Trinkgeld ist anerkannte Betriebsausgabe
   *   und wird auf Bewirtungs-Konto (6640 SKR04 / 4650 SKR03) gebucht (70% abziehbar)
   * - DATEV-Export: 0%-MwSt-Position
   *
   * GoBD: Audit-Log wird wie bei anderen vat_item-Inserts geschrieben.
   */
  const handleAddTrinkgeld = async (diff: number) => {
    if (!detailReceipt || !user || diff <= 0) return;
    if (detailReceipt.accounting_status === "exported" || detailReceipt.accounting_status === "verbucht") {
      toast({
        title: tt({ de: "Beleg ist festgeschrieben", en: "Receipt is locked" }),
        description: tt({
          de: "MwSt-Positionen festgeschriebener Belege können nicht geändert werden.",
          en: "VAT items of locked receipts cannot be changed.",
        }),
        variant: "destructive",
      });
      return;
    }

    // Audit-Log VOR dem Insert
    const { error: auditErr } = await supabase.from("receipt_changes").insert({
      receipt_id: detailReceipt.id,
      user_id: user.id,
      field_name: "vat_item:trinkgeld",
      old_value: null,
      new_value: `Trinkgeld ${diff.toFixed(2)}€ (0% MwSt)`,
      change_type: "insert",
    });
    if (auditErr) {
      console.warn("[GoBD] Audit-Log vor Trinkgeld-Insert fehlgeschlagen:", auditErr);
      toast({
        title: tt({ de: "Audit-Log fehlgeschlagen", en: "Audit log failed" }),
        description: auditErr.message,
        variant: "destructive",
      });
      return;
    }

    // receipt_vat_items hat KEIN user_id-Feld (RLS prüft Ownership via JOIN auf receipts.user_id)
    const { data, error: insErr } = await supabase
      .from("receipt_vat_items")
      .insert({
        receipt_id: detailReceipt.id,
        label: "Trinkgeld",
        net_amount: Math.round(diff * 100) / 100,
        vat_rate: 0,
        vat_amount: 0,
      })
      .select()
      .single();

    if (insErr) {
      toast({ title: insErr.message, variant: "destructive" });
      return;
    }

    setDetailVatItems((prev) => [...prev, data as any]);
    toast({
      title: tt({ de: "Trinkgeld erfasst", en: "Tip recorded" }),
      description: tt({
        de: `Trinkgeld-Position über ${diff.toFixed(2).replace(".", ",")} € angelegt. MwSt-Bilanz stimmt jetzt.`,
        en: `Tip line for ${diff.toFixed(2)} € created. VAT balance is now correct.`,
      }),
    });
    fetchData();
  };

  const formatAmount = (a: number | null, currency?: string, amountEur?: number | null) => {
    if (a == null) return "–";
    if (currency && currency !== "EUR") {
      const eurStr = amountEur != null ? `${amountEur.toFixed(2)} €` : "–";
      return `${eurStr}`;
    }
    return `${a.toFixed(2)} €`;
  };
  const formatAmountFull = (r: Receipt) => {
    if (r.amount == null) return "–";
    if (r.currency && r.currency !== "EUR") {
      const eurStr = r.amount_eur != null ? `${r.amount_eur.toFixed(2)} €` : "–";
      return `${eurStr} (${r.amount.toFixed(2)} ${r.currency})`;
    }
    return `${r.amount.toFixed(2)} €`;
  };
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "–";

  const filteredByCompany = filterCompanyId === "all" ? receipts
    : filterCompanyId === "none" ? receipts.filter(r => !r.company_id)
    : receipts.filter(r => r.company_id === filterCompanyId);
  const filteredByMonth = filterMonth === "all" ? filteredByCompany
    : filteredByCompany.filter(r => r.date.substring(0, 7) === filterMonth);
  // Volltext-Suche: durchsucht Description, Lieferant, Person, Anlass, Organisation, Kennzeichen
  const q = searchQuery.trim().toLowerCase();
  const filtered = q === "" ? filteredByMonth : filteredByMonth.filter(r => {
    const hay = [
      r.description,
      r.supplier_name,
      r.person_met,
      r.meeting_purpose,
      r.organization,
      r.license_plate,
      companies.find(c => c.id === r.company_id)?.name,
      r.amount?.toString(),
      r.amount_eur?.toString(),
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
  const generalReceipts = filtered.filter(r => r.receipt_type !== "fuel");
  const fuelReceipts = filtered.filter(r => r.receipt_type === "fuel");

  // Build unique months from receipts for filter
  const availableMonths = Array.from(new Set(receipts.map(r => r.date.substring(0, 7)))).sort().reverse();

  // Status-Mapping für die Pills im neuen Belege-Listen-Pattern (Revolut-Style)
  const getStatusPill = (r: Receipt) => {
    if (r.accounting_status === "exported" || r.accounting_status === "verbucht") {
      return { label: tt({ de: "Festgeschrieben", en: "Locked" }), classes: "bg-slate-100 text-slate-700 border border-slate-200" };
    }
    if (r.status === "pending") {
      return { label: tt({ de: "Unvollständig", en: "Incomplete" }), classes: "bg-amber-50 text-amber-800 border border-amber-200" };
    }
    return { label: tt({ de: "Bereit", en: "Ready" }), classes: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  };

  const renderMobileCards = (list: Receipt[]) => (
    <div>
      <div className="rounded-2xl border bg-card overflow-hidden divide-y">
        {list.map((r) => {
          const pill = getStatusPill(r);
          const isForex = r.currency && r.currency !== "EUR";
          const eurStr = r.amount_eur != null
            ? `${r.amount_eur.toFixed(2).replace(".", ",")} €`
            : r.amount != null
              ? (isForex ? `${r.amount.toFixed(2)} ${r.currency}` : `${r.amount.toFixed(2).replace(".", ",")} €`)
              : "–";
          const forexLine = isForex && r.amount != null
            ? `${r.amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${r.currency}`
            : null;
          return (
            <button
              key={r.id}
              onClick={() => openDetail(r)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted text-left"
            >
              {/* Icon-Container links */}
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {r.receipt_type === "fuel"
                  ? <span className="text-xl" aria-hidden="true">⛽</span>
                  : <ReceiptIcon className="h-6 w-6 text-primary" />}
              </div>
              {/* Mitte: Beschreibung + Meta */}
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium truncate">
                  {r.description || tt({ de: "Ohne Beschreibung", en: "No description" })}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-footnote text-muted-foreground">
                  {r.company_id && <><span className="truncate">{companyName(r.company_id)}</span><span aria-hidden="true">·</span></>}
                  <span className="whitespace-nowrap">{new Date(r.date).toLocaleDateString(locale)}</span>
                  {r.receipt_type === "fuel" && r.license_plate && (
                    <><span aria-hidden="true">·</span><span className="whitespace-nowrap">{r.license_plate}</span></>
                  )}
                </div>
              </div>
              {/* Rechts: Hero-Betrag + Status-Pill */}
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span className="text-body font-semibold font-mono tabular-nums whitespace-nowrap">{eurStr}</span>
                {forexLine && <span className="text-caption-1 text-muted-foreground font-mono whitespace-nowrap">{forexLine}</span>}
                <span className={`px-2 py-0.5 rounded-full text-caption-2 font-medium ${pill.classes}`}>{pill.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header: Large-Title + Primary CTA */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">{t("receipts.title")}</h1>
        <Button className="h-13 px-5 text-body font-semibold text-primary-foreground gap-2" onClick={() => setScanOpen(true)}>
          <ScanLine className="h-5 w-5" />
          <span className="hidden sm:inline">{t("receipts.scan")}</span>
        </Button>
      </div>

      {/* Filter-Chips für Mandanten (Revolut-Pattern, statt Dropdown) */}
      {receipts.length > 0 && companies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
          {[{ id: "all", name: tt({ de: "Alle", en: "All" }), count: receipts.length }, ...companies.map(c => ({ id: c.id, name: c.name, count: receipts.filter(r => r.company_id === c.id).length })), { id: "none", name: tt({ de: "Ohne", en: "None" }), count: receipts.filter(r => !r.company_id).length }].map((m) => {
            const active = filterCompanyId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setFilterCompanyId(m.id)}
                className={`h-11 px-4 rounded-full text-callout font-medium flex items-center gap-2 border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
              >
                <span>{m.name}</span>
                <span className={`text-caption-1 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {m.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {receipts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={tt({ de: "Suchen: Lieferant, Beschreibung, Betrag…", en: "Search: supplier, description, amount…" })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-11 pr-9 text-body"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-background flex items-center justify-center"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {/* Mandanten-Select entfernt — die Chips oben übernehmen das */}
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-12 w-[180px] text-body">
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
                {/* Einheitliche Card-Liste auf Mobile + Desktop (Revolut-Pattern) */}
                {renderMobileCards(generalReceipts)}
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{tt({de:"Keine Belege vorhanden", en:"No receipts", tr:"Fiş yok", ar:"لا إيصالات", ru:"Нет чеков"})}</CardContent></Card>
            )
          ) : (
            fuelReceipts.length > 0 ? (
              <>
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

      {/* Vollbild-Lightbox für Beleg-Foto — mit Zoom-Buttons (Capacitor WebView pinch-zoom ist unreliable) */}
      {imageLightboxOpen && detailImageUrl && (
        <ImageLightbox
          src={detailImageUrl}
          onClose={() => setImageLightboxOpen(false)}
          closeLabel={tt({ de: "Schließen", en: "Close" })}
        />
      )}

      <Dialog open={detailOpen} onOpenChange={(o) => { if (!o) { setDetailOpen(false); setIsEditing(false); setVatEditorOpen(false); } }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {/* a11y title — visuell ersetzt durch Hero */}
          <DialogHeader className="sr-only">
            <DialogTitle>
              {isEditing
                ? tt({de:"Beleg bearbeiten", en:"Edit Receipt"})
                : tt({de:"Beleg-Details", en:"Receipt Details"})}
            </DialogTitle>
          </DialogHeader>

          {!isEditing && detailReceipt && (() => {
            const pill = getStatusPill(detailReceipt);
            const isLocked = detailReceipt.accounting_status === "exported" || detailReceipt.accounting_status === "verbucht";
            const receiptBrutto = detailReceipt.amount_eur ?? detailReceipt.amount ?? 0;
            const itemsBrutto = detailVatItems.reduce((s, vi) => s + (vi.net_amount != null ? vi.net_amount + vi.vat_amount : vi.vat_amount * (1 + 100/(vi.vat_rate || 19))), 0);
            const diff = itemsBrutto - receiptBrutto;
            const isMismatch = detailVatItems.length > 0 && Math.abs(diff) > 0.02;
            const defaultRate = TAX_CATEGORIES.find(c => c.id === detailReceipt.tax_category)?.defaultVatRate ?? 19;
            const taxCat = TAX_CATEGORIES.find(c => c.value === detailReceipt.tax_category);

            return (
              <>
                {/* Foto-Preview kompakt — bleibt klickbar zum Vergrößern */}
                {detailImageUrl && !detailImageError ? (
                  <button
                    type="button"
                    onClick={() => setImageLightboxOpen(true)}
                    className="block w-full group relative bg-muted"
                    aria-label={tt({ de: "Beleg vergrößern", en: "View receipt full size" })}
                  >
                    <img
                      src={detailImageUrl}
                      alt="Receipt"
                      onError={() => setDetailImageError(true)}
                      className="w-full h-20 object-cover object-top transition group-hover:opacity-90 group-active:opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
                    <div className="absolute top-2 right-12 rounded-full bg-black/60 text-white text-caption-2 px-2.5 py-1 backdrop-blur-sm">
                      {tt({ de: "Tippen zum Vergrößern", en: "Tap to zoom" })}
                    </div>
                  </button>
                ) : (
                  <div className="w-full h-16 bg-muted flex items-center justify-center gap-2">
                    <ReceiptIcon className="h-6 w-6 text-muted-foreground" />
                    {detailImageError && (
                      <p className="text-caption-2 text-muted-foreground">
                        {tt({ de: "Foto nicht verfügbar", en: "Photo unavailable" })}
                      </p>
                    )}
                  </div>
                )}

                {/* Hero-Stat: Datum + Betrag + Status-Pill */}
                <div className="px-5 pt-5 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-caption-1 text-muted-foreground">
                        {new Date(detailReceipt.date).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                      <p className="text-large-title font-bold font-mono tabular-nums">{formatAmountFull(detailReceipt)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-footnote font-medium shrink-0 mt-1 ${pill.classes}`}>
                      {pill.label}
                    </span>
                  </div>
                  {detailReceipt.description && (
                    <p className="text-body text-foreground">{detailReceipt.description}</p>
                  )}
                  {(() => {
                    const hasCompany = detailReceipt.company_id && companies.find(c => c.id === detailReceipt.company_id);
                    if (!hasCompany && !taxCat) return null;
                    return (
                      <p className="text-footnote text-muted-foreground flex items-center flex-wrap gap-x-2">
                        {hasCompany && <span>{companyName(detailReceipt.company_id)}</span>}
                        {hasCompany && taxCat && <span aria-hidden="true">·</span>}
                        {taxCat && (
                          <span className="flex items-center gap-1">
                            <span>{taxCat.icon}</span>
                            <span>{lang === "de" ? taxCat.label.de : taxCat.label.en}</span>
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>

                {/* GoBD-Lock Banner */}
                {isLocked && (
                  <div className="mx-5 mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 space-y-1">
                    <p className="text-footnote font-semibold text-amber-900 dark:text-amber-200">
                      🔒 {tt({ de: "Festgeschrieben (GoBD)", en: "Locked (GoBD)" })}
                    </p>
                    <p className="text-caption-1 text-amber-800 dark:text-amber-300 leading-relaxed">
                      {tt({
                        de: "Dieser Beleg wurde in einem DATEV-Stapel exportiert. Nach § 146 Abs. 4 AO sind Änderungen nicht erlaubt. Für Korrekturen bitte einen Storno-Beleg anlegen.",
                        en: "This receipt was exported in a DATEV stapel. Per § 146 AO, changes are not allowed. Please create a correction receipt instead.",
                      })}
                    </p>
                  </div>
                )}

                {/* Sektion: Steuer & MwSt */}
                <div className="px-5 pb-3 space-y-4">
                  {vatEditorOpen && user ? (
                    <div className="rounded-2xl border bg-card p-4">
                      <VatItemsEditor
                        receiptId={detailReceipt.id}
                        userId={user.id}
                        initialItems={detailVatItems}
                        receiptBrutto={receiptBrutto}
                        defaultVatRate={defaultRate}
                        onClose={() => setVatEditorOpen(false)}
                        onSaved={async () => {
                          const { data } = await supabase
                            .from("receipt_vat_items")
                            .select("*")
                            .eq("receipt_id", detailReceipt.id)
                            .order("vat_rate");
                          setDetailVatItems(data || []);
                          fetchData();
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border bg-card overflow-hidden">
                      <div className="px-4 pt-3.5 pb-2 border-b">
                        <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
                          {tt({ de: "Steuer & MwSt.", en: "Tax & VAT" })}
                        </p>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {detailVatItems.length > 0 ? (
                          <>
                            {detailVatItems.map((vi) => (
                              <div key={vi.id} className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-subhead text-foreground truncate">{vi.label || tt({ de: "Position", en: "Item" })}</p>
                                  <p className="text-caption-1 text-muted-foreground">{vi.vat_rate}%{vi.net_amount != null ? ` · netto ${vi.net_amount.toFixed(2)} €` : ""}</p>
                                </div>
                                <span className="text-subhead font-mono font-semibold tabular-nums whitespace-nowrap">{vi.vat_amount.toFixed(2)} €</span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-2 border-t mt-1">
                              <span className="text-footnote font-semibold text-muted-foreground uppercase tracking-wider">{tt({ de: "MwSt. gesamt", en: "Total VAT" })}</span>
                              <span className="text-body font-mono font-bold tabular-nums">{detailVatItems.reduce((s, i) => s + i.vat_amount, 0).toFixed(2)} €</span>
                            </div>
                          </>
                        ) : (detailReceipt.vat_amount != null || detailReceipt.vat_rate != null) ? (
                          <div className="flex justify-between">
                            <span className="text-subhead text-muted-foreground">MwSt.</span>
                            <span className="text-subhead font-mono font-semibold">
                              {detailReceipt.vat_amount != null ? `${detailReceipt.vat_amount.toFixed(2)} ${detailReceipt.currency && detailReceipt.currency !== "EUR" ? detailReceipt.currency : "€"}` : "–"}
                              {detailReceipt.vat_rate != null ? ` (${detailReceipt.vat_rate}%)` : ""}
                            </span>
                          </div>
                        ) : (
                          <p className="text-footnote text-muted-foreground italic">
                            {tt({ de: "Keine MwSt-Daten erfasst.", en: "No VAT data captured." })}
                          </p>
                        )}

                        {isMismatch && (
                          <div className="rounded-xl border border-destructive bg-destructive/10 px-3 py-2.5 mt-2 space-y-2">
                            <p className="text-caption-1 text-destructive leading-relaxed">
                              {tt({
                                de: `[!] Summe MwSt-Positionen ${itemsBrutto.toFixed(2).replace(".", ",")} € weicht vom Brutto ${receiptBrutto.toFixed(2).replace(".", ",")} € ab. Differenz ${Math.abs(diff).toFixed(2).replace(".", ",")} €. DATEV-Export blockiert.`,
                                en: `[!] Sum of VAT items ${itemsBrutto.toFixed(2)} € differs from gross ${receiptBrutto.toFixed(2)} €. Diff ${Math.abs(diff).toFixed(2)} €. DATEV export blocked.`,
                              })}
                            </p>
                            {/* Trinkgeld-CTA: nur wenn Brutto > Items (häufigster Fall) */}
                            {diff < 0 && !isLocked && (
                              <div className="pt-2 border-t border-destructive/30 space-y-2">
                                <p className="text-caption-1 text-foreground leading-relaxed">
                                  {tt({
                                    de: `Häufige Ursache: Trinkgeld auf der Rechnung. Soll der Differenzbetrag als „Trinkgeld“ erfasst werden? (0 % MwSt, gehört bei Bewirtungen zu den Bewirtungskosten)`,
                                    en: `Common cause: tip on the receipt. Add the difference as a "Tip" item? (0% VAT, recognized as entertainment expense)`,
                                  })}
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-10 text-footnote text-primary-foreground gap-1.5"
                                  onClick={() => handleAddTrinkgeld(Math.abs(diff))}
                                >
                                  + {tt({
                                    de: `Trinkgeld ${Math.abs(diff).toFixed(2).replace(".", ",")} € erfassen`,
                                    en: `Add tip ${Math.abs(diff).toFixed(2)} €`,
                                  })}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {!isLocked && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant={isMismatch ? "default" : "outline"}
                              className={`flex-1 h-11 text-footnote ${isMismatch ? "text-primary-foreground" : ""}`}
                              onClick={() => setVatEditorOpen(true)}
                            >
                              <Pencil className="h-4 w-4 mr-1.5" />
                              {detailVatItems.length === 0
                                ? tt({ de: "MwSt-Positionen anlegen", en: "Add VAT items" })
                                : tt({ de: "Bearbeiten", en: "Edit" })}
                            </Button>
                            {detailVatItems.length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 text-footnote"
                                onClick={handleResetVatItems}
                              >
                                {tt({ de: "Zurücksetzen", en: "Reset" })}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sektion: Beleg-Details */}
                  <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-4 pt-3.5 pb-2 border-b">
                      <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
                        {tt({ de: "Beleg-Details", en: "Receipt Details" })}
                      </p>
                    </div>
                    <div className="divide-y">
                      {isFuel(detailReceipt) ? (
                        <>
                          {detailReceipt.license_plate && (
                            <div className="flex items-center justify-between px-4 py-3">
                              <span className="text-subhead text-muted-foreground">{tt({ de: "Kennzeichen", en: "License Plate" })}</span>
                              <span className="text-subhead font-medium font-mono">{detailReceipt.license_plate}</span>
                            </div>
                          )}
                          {detailReceipt.mileage != null && (
                            <div className="flex items-center justify-between px-4 py-3">
                              <span className="text-subhead text-muted-foreground">{tt({ de: "Kilometerstand", en: "Mileage" })}</span>
                              <span className="text-subhead font-medium font-mono tabular-nums">{detailReceipt.mileage.toLocaleString(locale)} km</span>
                            </div>
                          )}
                          {!detailReceipt.license_plate && detailReceipt.mileage == null && (
                            <div className="px-4 py-3">
                              <p className="text-footnote text-muted-foreground italic">
                                {tt({ de: "Kennzeichen und Kilometerstand fehlen.", en: "License plate and mileage missing." })}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {detailReceipt.person_met && (
                            <div className="flex items-start justify-between px-4 py-3 gap-3">
                              <span className="text-subhead text-muted-foreground shrink-0">
                                {detailReceipt.tax_category === "bewirtung"
                                  ? t("receipts.person")
                                  : tt({ de: "Kontakt", en: "Contact" })}
                              </span>
                              <span className="text-subhead font-medium text-right">{detailReceipt.person_met}</span>
                            </div>
                          )}
                          {detailReceipt.organization && (
                            <div className="flex items-start justify-between px-4 py-3 gap-3">
                              <span className="text-subhead text-muted-foreground shrink-0">{t("receipts.organization")}</span>
                              <span className="text-subhead font-medium text-right">{detailReceipt.organization}</span>
                            </div>
                          )}
                          {detailReceipt.meeting_purpose && (
                            <div className="flex items-start justify-between px-4 py-3 gap-3">
                              <span className="text-subhead text-muted-foreground shrink-0">
                                {detailReceipt.tax_category === "bewirtung"
                                  ? t("receipts.meetingPurpose")
                                  : tt({ de: "Anlass", en: "Purpose" })}
                              </span>
                              <span className="text-subhead font-medium text-right max-w-[60%]">{detailReceipt.meeting_purpose}</span>
                            </div>
                          )}
                          {!detailReceipt.person_met && !detailReceipt.organization && !detailReceipt.meeting_purpose && (
                            <div className="px-4 py-3">
                              <p className="text-footnote text-muted-foreground italic">
                                {tt({ de: "Keine weiteren Details erfasst.", en: "No further details captured." })}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sticky Action-Bar */}
                {!isLocked && (
                  <div className="sticky bottom-0 border-t bg-background px-5 py-3 flex gap-2 z-10">
                    <Button
                      className="flex-1 h-13 text-body font-semibold text-primary-foreground gap-2"
                      onClick={startEditing}
                    >
                      <Pencil className="h-5 w-5" />
                      {t("general.edit")}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-13 px-5 text-body text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                      onClick={() => handleDelete(detailReceipt.id, detailReceipt.file_path)}
                      aria-label={t("general.delete")}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </>
            );
          })()}

          {isEditing && detailReceipt && (
            <form onSubmit={handleEditSave} className="flex flex-col">
              {/* Header */}
              <div className="px-5 pt-5 pb-3 space-y-1 border-b">
                <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
                  {tt({ de: "Beleg bearbeiten", en: "Edit Receipt" })}
                </p>
                <h2 className="text-title-2 font-bold">
                  {formatAmountFull(detailReceipt)} · {new Date(detailReceipt.date).toLocaleDateString(locale)}
                </h2>
              </div>

              {/* Form-Body */}
              <div className="px-5 py-4 space-y-4">
                {/* KI-Daten-Card */}
                <div className="rounded-2xl bg-muted/50 border p-4 space-y-2.5">
                  <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
                    {tt({ de: "KI-erkannt · nicht änderbar", en: "AI-detected · read-only" })}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-caption-1 text-muted-foreground">{t("receipts.date")}</p>
                      <p className="text-subhead font-medium">{new Date(detailReceipt.date).toLocaleDateString(locale)}</p>
                    </div>
                    <div>
                      <p className="text-caption-1 text-muted-foreground">{t("receipts.amount")}</p>
                      <p className="text-subhead font-mono font-semibold">{detailReceipt.amount != null ? `${detailReceipt.amount.toFixed(2)} €` : "–"}</p>
                    </div>
                  </div>
                  {detailReceipt.description && (
                    <div>
                      <p className="text-caption-1 text-muted-foreground">{t("receipts.description")}</p>
                      <p className="text-subhead">{detailReceipt.description}</p>
                    </div>
                  )}
                </div>

                {/* Mandant + Kategorie */}
                <div className="space-y-2">
                  <Label className="text-footnote font-medium">{t("receipts.assignCompany")}</Label>
                  <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                    <SelectTrigger className="h-12 text-body"><SelectValue placeholder="–" /></SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="max-h-56">
                      {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-footnote font-medium">
                    {tt({ de: "Steuer-Kategorie", en: "Tax category" })}
                  </Label>
                  <Select value={editTaxCategory} onValueChange={setEditTaxCategory}>
                    <SelectTrigger className="h-12 text-body">
                      <SelectValue placeholder={tt({ de: "Keine Kategorie", en: "No category" })} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="max-h-64">
                      {TAX_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="mr-1.5">{c.icon}</span>
                          {lang === "de" ? c.label.de : c.label.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sektion: Fahrzeug oder Anlass */}
                {isFuel(detailReceipt) ? (
                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
                      {tt({ de: "Fahrzeug", en: "Vehicle" })}
                    </p>
                    <div className="space-y-2">
                      <Label className="text-footnote font-medium">{tt({ de: "Kennzeichen", en: "License Plate" })}</Label>
                      <Input
                        value={editLicensePlate}
                        onChange={(e) => setEditLicensePlate(e.target.value)}
                        placeholder={tt({ de: "z.B. B-AB 1234", en: "e.g. B-AB 1234" })}
                        className="h-12 text-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-footnote font-medium">{tt({ de: "Kilometerstand", en: "Mileage" })}</Label>
                      <Input
                        type="number"
                        value={editMileage}
                        onChange={(e) => setEditMileage(e.target.value)}
                        placeholder={tt({ de: "z.B. 45230", en: "e.g. 45230" })}
                        className="h-12 text-body"
                      />
                    </div>
                  </div>
                ) : (() => {
                  const isBewirtung = editTaxCategory === "bewirtung";
                  return (
                    <div className="rounded-2xl border bg-card p-4 space-y-3">
                      <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
                        {isBewirtung
                          ? tt({ de: "Anlass & Personen", en: "Purpose & People" })
                          : tt({ de: "Anlass & Kontakt", en: "Purpose & Contact" })}
                      </p>
                      <div className="space-y-2">
                        <Label className="text-footnote font-medium">
                          {isBewirtung ? t("receipts.person") : tt({ de: "Kontakt", en: "Contact" })}
                        </Label>
                        <Input value={editPersonMet} onChange={(e) => setEditPersonMet(e.target.value)} className="h-12 text-body" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-footnote font-medium">{t("receipts.organization")}</Label>
                        <Input value={editOrganization} onChange={(e) => setEditOrganization(e.target.value)} className="h-12 text-body" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-footnote font-medium">
                          {isBewirtung ? t("receipts.meetingPurpose") : tt({ de: "Anlass", en: "Purpose" })}
                        </Label>
                        <Input value={editMeetingPurpose} onChange={(e) => setEditMeetingPurpose(e.target.value)} className="h-12 text-body" />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Sticky Action-Bar */}
              <div className="sticky bottom-0 border-t bg-background px-5 py-3 flex gap-2 z-10">
                <Button type="button" variant="outline" className="flex-1 h-13 text-body" onClick={() => setIsEditing(false)}>
                  {t("general.cancel")}
                </Button>
                <Button type="submit" className="flex-1 h-13 text-body font-semibold text-primary-foreground" disabled={editSaving}>
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
