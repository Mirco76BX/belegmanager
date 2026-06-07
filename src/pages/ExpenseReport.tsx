import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileSpreadsheet, Download, Send } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  buildDatevStapel,
  downloadDatevCsv,
  DEFAULT_GEGENKONTO,
  kontoForTaxCategory,
  type DatevMandantSettings,
  type Kontenrahmen,
} from "@/lib/datev";
import { detectTaxCategoryInconsistency } from "@/lib/taxCategories";

// localStorage-Key, damit der User die DATEV-Stammdaten nicht jedes Mal neu eintippen muss
const DATEV_SETTINGS_KEY = "belegmanager.datev_settings.v1";

function loadDatevSettings(): Partial<DatevMandantSettings> {
  try {
    const raw = localStorage.getItem(DATEV_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<DatevMandantSettings>;
  } catch {
    return {};
  }
}

function saveDatevSettings(s: DatevMandantSettings) {
  try {
    localStorage.setItem(DATEV_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

interface VatItem {
  vat_rate: number;
  vat_amount: number;
  net_amount: number | null;
  label: string | null;
}

interface Receipt {
  id: string;
  date: string;
  amount: number | null;
  currency?: string;
  amount_eur?: number | null;
  description: string | null;
  person_met: string | null;
  organization: string | null;
  meeting_purpose: string | null;
  file_path: string | null;
  company_id: string | null;
  vat_amount: number | null;
  vat_rate: number | null;
  status?: string;
  tax_category?: string | null;
  accounting_status?: string;
  vat_items?: VatItem[];
}

interface Company {
  id: string;
  name: string;
  // DATEV-Stammdaten (Multi-Mandant)
  datev_berater_nr?: string | null;
  datev_mandanten_nr?: string | null;
  datev_kontenrahmen?: string | null;
  datev_konto_gegenkonto?: string | null;
  datev_wj_beginn?: string | null;
  datev_sachkontenlaenge?: number | null;
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ExpenseReport = () => {
  const { t, lang, tt } = useLanguage();
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const locale = getLocale(lang);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return formatLocalDate(d);
  });
  const [toDate, setToDate] = useState(formatLocalDate(new Date()));
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; display_name: string | null; email: string; tax_advisor_email?: string | null; tax_advisor_name?: string | null } | null>(null);

  // DATEV-Export Dialog State
  const [datevDialogOpen, setDatevDialogOpen] = useState(false);
  const [datevForm, setDatevForm] = useState<DatevMandantSettings>(() => {
    const cached = loadDatevSettings();
    return {
      berater_nr: cached.berater_nr ?? "",
      mandanten_nr: cached.mandanten_nr ?? "",
      wj_beginn: cached.wj_beginn ?? `${new Date().getFullYear()}-01-01`,
      sachkontenlaenge: (cached.sachkontenlaenge as 4 | 5 | 6 | 7 | 8) ?? 4,
      kontenrahmen: (cached.kontenrahmen as Kontenrahmen) ?? "SKR03",
      konto_gegenkonto: cached.konto_gegenkonto ?? DEFAULT_GEGENKONTO.SKR03,
      bezeichnung: cached.bezeichnung ?? "",
      diktatkuerzel: cached.diktatkuerzel ?? "",
    };
  });
  const [datevEncoding, setDatevEncoding] = useState<"windows-1252" | "utf-8-bom">("windows-1252");
  const [datevMode, setDatevMode] = useState<"test" | "produktiv">("test");
  const [datevErrors, setDatevErrors] = useState<string[]>([]);


  const fetchData = async () => {
    if (!user || subscription.tier === "free") return;
    setLoading(true);
    const [receiptsRes, companiesRes, profileRes] = await Promise.all([
      supabase.from("receipts").select("*").gte("date", fromDate).lte("date", toDate).order("date", { ascending: true }),
      supabase.from("companies").select("id, name, datev_berater_nr, datev_mandanten_nr, datev_kontenrahmen, datev_konto_gegenkonto, datev_wj_beginn, datev_sachkontenlaenge"),
      supabase.from("profiles").select("first_name, last_name, display_name, email, tax_advisor_email, tax_advisor_name").eq("id", user.id).single(),
    ]);

    let receiptsWithVat: Receipt[] = [];
    if (receiptsRes.data && receiptsRes.data.length > 0) {
      // Multi-MwSt-Positionen für jeden Beleg laden (für sauberen DATEV-Export)
      const receiptIds = receiptsRes.data.map((r: { id: string }) => r.id);
      const { data: vatRows } = await supabase
        .from("receipt_vat_items")
        .select("receipt_id, vat_rate, vat_amount, net_amount, label")
        .in("receipt_id", receiptIds);

      const vatMap = new Map<string, VatItem[]>();
      (vatRows || []).forEach((v: { receipt_id: string; vat_rate: number; vat_amount: number; net_amount: number | null; label: string | null }) => {
        const list = vatMap.get(v.receipt_id) || [];
        list.push({ vat_rate: v.vat_rate, vat_amount: v.vat_amount, net_amount: v.net_amount, label: v.label });
        vatMap.set(v.receipt_id, list);
      });

      receiptsWithVat = receiptsRes.data.map((r: Receipt) => ({
        ...r,
        vat_items: vatMap.get(r.id),
      }));
    }

    setReceipts(receiptsWithVat);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (profileRes.data) setProfile(profileRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, fromDate, toDate, subscription.tier]);

  /**
   * Multi-Mandant: Sobald eine konkrete Company ausgewählt ist, befüllen wir
   * datevForm mit deren DATEV-Stammdaten. So sind Berater-Nr, Mandanten-Nr,
   * Kontenrahmen, Gegenkonto etc. pro Mandant getrennt.
   * Bei "Alle Organisationen" / "Ohne Organisation" werden die alten
   * localStorage-Werte beibehalten (Rückwärtskompatibilität).
   */
  useEffect(() => {
    if (filterCompanyId === "all" || filterCompanyId === "none") return;
    const c = companies.find((x) => x.id === filterCompanyId);
    if (!c) return;
    setDatevForm((prev) => ({
      ...prev,
      berater_nr: c.datev_berater_nr ?? prev.berater_nr,
      mandanten_nr: c.datev_mandanten_nr ?? prev.mandanten_nr,
      kontenrahmen: (c.datev_kontenrahmen as Kontenrahmen) ?? prev.kontenrahmen,
      konto_gegenkonto: c.datev_konto_gegenkonto ?? prev.konto_gegenkonto,
      wj_beginn: c.datev_wj_beginn ?? prev.wj_beginn,
      sachkontenlaenge: (c.datev_sachkontenlaenge as 4 | 5 | 6 | 7 | 8 | undefined) ?? prev.sachkontenlaenge,
    }));
  }, [filterCompanyId, companies]);

  if (subscription.tier === "free") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">{t("expense.title")}</h2>
        <p className="text-muted-foreground max-w-sm">
          {tt({de:"Diese Funktion ist ab dem BASIC-Plan verfügbar. Upgrade jetzt, um Reisekostenabrechnungen zu erstellen.", en:"This feature is available from the BASIC plan. Upgrade now to create travel expense reports.", tr:"Bu özellik BASIC planından itibaren kullanılabilir. Seyahat masraf raporları oluşturmak için şimdi yükseltin.", ar:"هذه الميزة متاحة من خطة BASIC. قم بالترقية الآن لإنشاء تقارير مصاريف السفر.", ru:"Эта функция доступна с плана BASIC. Обновите сейчас для создания отчётов о командировочных."})}
        </p>
        <Button onClick={() => navigate("/pricing")} className="gap-2">
          {tt({de:"Jetzt upgraden", en:"Upgrade Now", tr:"Şimdi Yükselt", ar:"ترقية الآن", ru:"Обновить сейчас"})}
        </Button>
      </div>
    );
  }

  const getCompanyName = (id: string | null) => id ? companies.find((c) => c.id === id)?.name || "–" : "–";

  // Receipt completeness status
  const getReceiptStatus = (r: Receipt): "incomplete" | "ready" | "exported" => {
    if (r.accounting_status === "verbucht" || r.accounting_status === "exported") return "exported";
    if (!r.amount || !r.date || !r.description) return "incomplete";
    if (r.tax_category === "bewirtung" && (!r.person_met || !r.meeting_purpose)) return "incomplete";
    return "ready";
  };

  const statusLabel = (s: "incomplete" | "ready" | "exported") => {
    const map = {
      incomplete: { de: "Unvollständig", en: "Incomplete", cls: "bg-destructive/10 text-destructive" },
      ready: { de: "Bereit", en: "Ready", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
      exported: { de: "Exportiert", en: "Exported", cls: "bg-muted text-muted-foreground" },
    };
    const m = map[s];
    return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${m.cls}`}>{lang === "de" ? m.de : m.en}</span>;
  };

  const filteredReceipts = filterCompanyId === "all" ? receipts
    : filterCompanyId === "none" ? receipts.filter(r => !r.company_id)
    : receipts.filter(r => r.company_id === filterCompanyId);

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.amount_eur ?? r.amount ?? 0), 0);
  const totalVat = filteredReceipts.reduce((sum, r) => sum + (r.vat_amount || 0), 0);

  // Status summary
  const statusCounts = { incomplete: 0, ready: 0, exported: 0 };
  filteredReceipts.forEach(r => { statusCounts[getReceiptStatus(r)]++; });

  const getTableHeaders = () => [
    tt({de:"Beleg-Nr", en:"Doc-No"}),
    t("receipts.date"),
    tt({de:"Konto", en:"Account"}),
    t("receipts.amount"), "MwSt.", "MwSt.-%",
    t("receipts.description"),
    t("receipts.company"), t("receipts.person"),
    tt({de:"Zweck", en:"Purpose", tr:"Amaç", ar:"الغرض", ru:"Цель"}),
    "Status",
  ];

  /** Bildet "7%+19%" / "0%+7%+19%" bei Multi-MwSt-Belegen, sonst "X%" oder "–". */
  const formatVatRate = (r: Receipt): string => {
    if (r.vat_items && r.vat_items.length > 1) {
      const rates = Array.from(new Set(r.vat_items.map(v => v.vat_rate)))
        .sort((a, b) => a - b);
      return rates.map(rt => `${rt}%`).join("+");
    }
    return r.vat_rate != null ? `${r.vat_rate}%` : "–";
  };

  const getTableRows = () =>
    filteredReceipts.map((r, idx) => {
      const isForex = r.currency && r.currency !== "EUR";
      const amountStr = r.amount != null
        ? isForex
          ? `${r.amount.toFixed(2)}\u00A0${r.currency}${r.amount_eur != null ? ` (${r.amount_eur.toFixed(2)}\u00A0€)` : ""}`
          : `${r.amount.toFixed(2)}\u00A0€`
        : "–";
      const s = getReceiptStatus(r);
      const sLabel = s === "incomplete" ? (lang === "de" ? "Unvollständig" : "Incomplete")
        : s === "ready" ? (lang === "de" ? "Bereit" : "Ready")
        : (lang === "de" ? "Exportiert" : "Exported");
      const belegNr = String(idx + 1).padStart(4, "0");
      const konto = kontoForTaxCategory(r.tax_category, datevForm.kontenrahmen);
      // Konsistenz-Check: passt der Zweck zur Tax-Category?
      const inconsistency = detectTaxCategoryInconsistency(r.tax_category, r.meeting_purpose, r.description);
      const zweckCell = r.meeting_purpose
        ? (inconsistency ? `[!] ${r.meeting_purpose}` : r.meeting_purpose)
        : "–";
      return [
        belegNr,
        new Date(r.date).toLocaleDateString(locale),
        konto,
        amountStr,
        r.vat_amount != null ? `${r.vat_amount.toFixed(2)}\u00A0€` : "–",
        formatVatRate(r),
        r.description || "–", getCompanyName(r.company_id),
        r.person_met || "–", zweckCell,
        sLabel,
      ];
    });

  const totalLabel = tt({de:"Gesamt", en:"Total", tr:"Toplam", ar:"الإجمالي", ru:"Итого"});

  const exportCSV = () => {
    if (filteredReceipts.length === 0) return;
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    const selectedCompany = filterCompanyId !== "all" && filterCompanyId !== "none"
      ? companies.find(c => c.id === filterCompanyId)?.name : null;
    const metaLines: string[] = [];
    if (fullName) metaLines.push(`"${tt({de:"Name", en:"Name", tr:"Ad", ar:"الاسم", ru:"Имя"})}";"${fullName}"`);
    metaLines.push(`"${tt({de:"E-Mail", en:"Email", tr:"E-posta", ar:"البريد", ru:"Почта"})}";"${profile?.email || user?.email || ""}"`);
    if (selectedCompany) metaLines.push(`"${tt({de:"Organisation", en:"Organization", tr:"Kuruluş", ar:"المنظمة", ru:"Организация"})}";"${selectedCompany}"`);
    metaLines.push(`"${t("expense.period")}";"${fromDate} – ${toDate}"`);
    metaLines.push("");

    const headers = getTableHeaders();
    const rows = getTableRows();
    const csvContent = [
      ...metaLines,
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      ["", "", totalLabel, `${totalAmount.toFixed(2)}\u00A0€`, `${totalVat.toFixed(2)}\u00A0€`, "", "", "", "", "", ""].map((c) => `"${c}"`).join(";"),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Mail an Steuerberater: öffnet die native Mail-App (iOS / macOS Mail / Outlook etc.)
   * via mailto:-Link mit vorausgefüllten Feldern.
   *
   * Anhänge können über mailto: leider nicht direkt eingehängt werden — der User
   * muss CSV + PDF separat (über die Export-Buttons + Share-Sheet → „An Mail anhängen")
   * an die geöffnete Mail anhängen. iOS macht das beim Tippen auf "An Steuerberater
   * senden" im DATEV-/PDF-Share-Sheet aber komfortabel: dort einfach im Empfänger
   * den Berater wählen.
   */
  const openMailToAdvisor = () => {
    if (!profile?.tax_advisor_email) {
      toast({
        title: tt({ de: "Steuerberater-E-Mail fehlt", en: "Tax advisor email missing" }),
        description: tt({
          de: "Bitte zuerst unter „Mein Konto“ → „Mein Steuerberater“ die E-Mail-Adresse hinterlegen.",
          en: "Please set the tax advisor email under My Account → My Tax Advisor first.",
        }),
        variant: "destructive",
      });
      return;
    }
    const company = filterCompanyId !== "all" && filterCompanyId !== "none"
      ? companies.find((c) => c.id === filterCompanyId) : null;
    const myFullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;
    const advisorGreeting = profile.tax_advisor_name
      ? `Hallo ${profile.tax_advisor_name.split(" ")[0]},`
      : "Hallo,";

    const subject = company
      ? `Buchungsstapel ${company.name} ${fromDate} bis ${toDate}`
      : `Buchungsstapel ${fromDate} bis ${toDate}`;

    const lines: string[] = [
      advisorGreeting,
      "",
      `anbei der Buchungsstapel im DATEV-Format 7 für den Zeitraum ${fromDate} bis ${toDate}.`,
      "",
      `Mandant: ${company?.name ?? "—"}`,
    ];
    if (company?.datev_berater_nr && company?.datev_mandanten_nr) {
      lines.push(`Berater-Nr: ${company.datev_berater_nr} · Mandanten-Nr: ${company.datev_mandanten_nr}`);
    }
    if (company?.datev_kontenrahmen) {
      lines.push(`Kontenrahmen: ${company.datev_kontenrahmen}`);
    }
    lines.push("");
    lines.push(`Anzahl Belege: ${filteredReceipts.length}`);
    lines.push(`Gesamt brutto: ${totalAmount.toFixed(2)} €`);
    lines.push(`Gesamt MwSt: ${totalVat.toFixed(2)} €`);
    lines.push("");
    lines.push("Die Belege sind im Test-Modus exportiert — Festschreibung erfolgt nach deinem OK.");
    lines.push("Beleg-Fotos hänge ich als PDF mit an (separat über die App-Buttons CSV + PDF).");
    lines.push("");
    lines.push("Beste Grüße");
    lines.push(myFullName);

    const body = lines.join("\n");
    const mailto = `mailto:${encodeURIComponent(profile.tax_advisor_email)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    // Mailto öffnen — iOS leitet auf Mail.app weiter
    window.location.href = mailto;

    // Userhinweis, dass er CSV + PDF noch anhängen muss
    setTimeout(() => {
      toast({
        title: tt({ de: "Mail vorbereitet", en: "Mail prepared" }),
        description: tt({
          de: "Hänge jetzt CSV + PDF an deine geöffnete Mail an: erst „CSV“/„DATEV“ und „PDF“ tippen, im Share-Sheet „An aktuelle Mail anhängen“ wählen.",
          en: "Now attach CSV + PDF to the opened mail: tap CSV/DATEV/PDF, in share-sheet choose 'Attach to current Mail'.",
        }),
      });
    }, 600);
  };

  // DATEV-Export: öffnet erst den Stammdaten-Dialog, dann generiert die Lib den Stapel.
  // Multi-Mandant: Nur erlaubt wenn eine konkrete Organisation ausgewählt ist —
  // sonst würden Belege verschiedener Mandanten im gleichen Stapel landen (verboten!).
  const exportDATEV = () => {
    if (filteredReceipts.length === 0) return;
    if (filterCompanyId === "all" || filterCompanyId === "none") {
      toast({
        title: tt({
          de: "Bitte eine Organisation auswählen",
          en: "Please select an organization",
        }),
        description: tt({
          de: "DATEV-Buchungsstapel sind pro Mandant zu führen. Wähle oben eine konkrete Organisation aus, dann erneut auf DATEV klicken.",
          en: "DATEV booking stapels must be per mandant. Select a specific organization above and try again.",
        }),
        variant: "destructive",
      });
      return;
    }
    // Optional: Prüfen ob Company tatsächlich DATEV-Stammdaten gepflegt hat
    const c = companies.find((x) => x.id === filterCompanyId);
    if (c && !c.datev_berater_nr) {
      toast({
        title: tt({
          de: "DATEV-Stammdaten fehlen",
          en: "DATEV master data missing",
        }),
        description: tt({
          de: `Bei „${c.name}" sind noch keine Berater-/Mandanten-Nr hinterlegt. Bitte zuerst unter Organisationen → Bearbeiten → DATEV-Stammdaten pflegen.`,
          en: `"${c.name}" has no consultant/client number yet. Please configure under Organizations → Edit → DATEV.`,
        }),
        variant: "destructive",
      });
      return;
    }
    setDatevDialogOpen(true);
  };

  // Setzt das Gegenkonto auf den passenden Default, wenn der Kontenrahmen
  // wechselt UND der User das Feld noch nicht selbst geändert hat.
  const handleKontenrahmenChange = (next: Kontenrahmen) => {
    setDatevForm((prev) => {
      const isAtDefault =
        prev.konto_gegenkonto === DEFAULT_GEGENKONTO.SKR03 ||
        prev.konto_gegenkonto === DEFAULT_GEGENKONTO.SKR04;
      return {
        ...prev,
        kontenrahmen: next,
        konto_gegenkonto: isAtDefault ? DEFAULT_GEGENKONTO[next] : prev.konto_gegenkonto,
      };
    });
  };

  const performDatevExport = async () => {
    // Stammdaten cachen für den nächsten Export
    saveDatevSettings(datevForm);
    setDatevErrors([]);

    const result = buildDatevStapel({
      receipts: filteredReceipts.map((r) => ({
        id: r.id,
        date: r.date,
        amount: r.amount,
        amount_eur: r.amount_eur ?? null,
        currency: r.currency,
        vat_rate: r.vat_rate ?? null,
        description: r.description,
        tax_category: r.tax_category ?? null,
        vat_items: r.vat_items?.map(v => ({
          vat_rate: v.vat_rate,
          vat_amount: v.vat_amount,
          net_amount: v.net_amount ?? undefined,
          label: v.label ?? undefined,
        })),
      })),
      mandant: datevForm,
      datumVon: fromDate,
      datumBis: toDate,
      exportiertVon: profile?.email || user?.email || "BelegManager",
      herkunft: "BM",
      mode: datevMode,
    });

    // GoBD-Schicht A: Hard-Errors blockieren den Export komplett.
    if (result.errors.length > 0) {
      setDatevErrors(result.errors);
      toast({
        title: tt({
          de: "Export blockiert wegen Daten-Inkonsistenz",
          en: "Export blocked due to data inconsistency",
        }),
        description: tt({
          de: `${result.errors.length} Fehler — siehe Dialog. Belege bitte korrigieren.`,
          en: `${result.errors.length} errors — see dialog. Please fix the receipts.`,
        }),
        variant: "destructive",
      });
      return;
    }

    // Datei runterladen / via iOS Share Sheet teilen
    try {
      await downloadDatevCsv(result, datevEncoding);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        title: tt({ de: "DATEV-Export fehlgeschlagen", en: "DATEV export failed" }),
        description: msg,
        variant: "destructive",
      });
      return;
    }

    // GoBD-Schicht B: Nur im Produktiv-Modus werden Belege festgeschrieben +
    // ein Audit-Batch in datev_export_batches angelegt.
    if (datevMode === "produktiv" && result.receiptIds.length > 0 && user) {
      try {
        // 1) Export-Batch dokumentieren
        const { data: batch, error: batchErr } = await supabase
          .from("datev_export_batches")
          .insert({
            user_id: user.id,
            berater_nr: datevForm.berater_nr,
            mandanten_nr: datevForm.mandanten_nr,
            wj_beginn: datevForm.wj_beginn,
            date_from: fromDate,
            date_to: toDate,
            kontenrahmen: datevForm.kontenrahmen,
            receipt_count: result.receiptIds.length,
            buchung_count: result.count,
            filename: result.filename,
          })
          .select("id")
          .single();
        if (batchErr) throw batchErr;
        // 2) Belege festschreiben (Trigger schreibt automatisch Audit-Log)
        const { error: updErr } = await supabase
          .from("receipts")
          .update({
            accounting_status: "exported",
            export_batch_id: batch.id,
            exported_at: new Date().toISOString(),
          })
          .in("id", result.receiptIds);
        if (updErr) throw updErr;

        toast({
          title: tt({ de: "DATEV-Stapel festgeschrieben", en: "DATEV stapel locked" }),
          description: tt({
            de: `${result.count} Buchungen aus ${result.receiptIds.length} Belegen exportiert. Belege sind jetzt schreibgeschützt (GoBD).`,
            en: `${result.count} bookings from ${result.receiptIds.length} receipts exported. Receipts are now read-only (GoBD).`,
          }),
        });
        // Receipts neu laden, damit "Exportiert"-Status in der UI sichtbar wird
        await fetchData();
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        toast({
          title: tt({
            de: "Datei wurde erstellt, aber Festschreibung fehlgeschlagen",
            en: "File created, but locking failed",
          }),
          description: msg + " — Belege sind noch editierbar.",
          variant: "destructive",
        });
      }
    } else if (datevMode === "test") {
      toast({
        title: tt({ de: "Test-Stapel erstellt", en: "Test stapel generated" }),
        description: tt({
          de: `${result.count} Buchungen aus ${result.receiptIds.length} Belegen. KEIN Schreibschutz — Belege bleiben editierbar. Dateiname beginnt mit DATEV_TEST_.`,
          en: `${result.count} bookings from ${result.receiptIds.length} receipts. No lock — receipts stay editable. Filename starts with DATEV_TEST_.`,
        }),
      });
    }

    if (result.warnings.length > 0) {
      console.warn("[DATEV] Soft warnings:", result.warnings);
    }
    setDatevDialogOpen(false);
  };


  const generatePDF = async () => {
    if (filteredReceipts.length === 0) {
      toast({ title: tt({de:"Keine Belege im Zeitraum", en:"No receipts in period", tr:"Dönemde fiş yok", ar:"لا إيصالات في الفترة", ru:"Нет чеков за период"}), variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let yPos = 20;

      doc.setFontSize(18);
      doc.text(t("expense.title"), pageWidth / 2, yPos, { align: "center" });
      yPos += 12;

      // User info
      doc.setFontSize(10);
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
      if (fullName) {
        doc.text(fullName, pageWidth / 2, yPos, { align: "center" });
        yPos += 5;
      }
      doc.text(profile?.email || user?.email || "", pageWidth / 2, yPos, { align: "center" });
      yPos += 7;

      // Selected organization
      const selectedCompanyName = filterCompanyId !== "all" && filterCompanyId !== "none"
        ? companies.find(c => c.id === filterCompanyId)?.name : null;
      if (selectedCompanyName) {
        doc.text(`${tt({de:"Organisation", en:"Organization", tr:"Kuruluş", ar:"المنظمة", ru:"Организация"})}: ${selectedCompanyName}`, pageWidth / 2, yPos, { align: "center" });
        yPos += 7;
      }

      doc.setFontSize(11);
      doc.text(`${t("expense.period")}: ${fromDate} – ${toDate}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      const rows = getTableRows();
      // 11 Spalten: BelegNr, Datum, Konto, Betrag, MwSt, MwSt-%, Beschr, Org, Person, Zweck, Status
      rows.push(["", "", totalLabel, `${totalAmount.toFixed(2)}\u00A0€`, `${totalVat.toFixed(2)}\u00A0€`, "", "", "", "", "", ""]);

      autoTable(doc, {
        startY: yPos, head: [getTableHeaders()], body: rows,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 74, 112], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 13, halign: 'center' },  // Beleg-Nr
          1: { cellWidth: 17 },                    // Datum
          2: { cellWidth: 12, halign: 'center' },  // Konto
          3: { cellWidth: 22, halign: 'right' },   // Betrag
          4: { cellWidth: 16, halign: 'right' },   // MwSt
          5: { cellWidth: 14, halign: 'right' },   // MwSt-%
        },
        footStyles: { fontStyle: "bold" }, theme: "grid",
      });

      // Konsistenz-Warnungen sammeln und auflisten (passive Hinweise — Buchhalter entscheidet)
      const inconsistencies = filteredReceipts
        .map((r, idx) => ({ idx, r, issue: detectTaxCategoryInconsistency(r.tax_category, r.meeting_purpose, r.description) }))
        .filter((x) => x.issue);
      if (inconsistencies.length > 0) {
        // Position direkt nach der Tabelle (autoTable schreibt finalY in doc.lastAutoTable)
        const tableEnd = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yPos;
        let warnY = tableEnd + 6;
        doc.setFontSize(8);
        doc.setTextColor(200, 80, 0); // gedämpftes Orange für Warnungen
        doc.setFont("helvetica", "bold");
        doc.text(`[!]  Konsistenz-Hinweise (${inconsistencies.length}) – bitte vor Festschreibung prüfen:`, margin, warnY);
        doc.setFont("helvetica", "normal");
        warnY += 4;
        doc.setTextColor(60, 60, 60);
        for (const { idx, r, issue } of inconsistencies) {
          if (warnY > pageHeight - 15) { doc.addPage(); warnY = margin; }
          const belegNr = String(idx + 1).padStart(4, "0");
          const lines = doc.splitTextToSize(
            `Beleg ${belegNr} (${r.description?.slice(0, 30) ?? "–"}): ${issue!.reason}`,
            pageWidth - margin * 2,
          );
          for (const ln of lines) {
            doc.text(ln, margin, warnY);
            warnY += 3.5;
          }
          warnY += 1;
        }
        doc.setTextColor(0, 0, 0);
      }

      const receiptFiles = filteredReceipts.filter((r) => r.file_path && !r.file_path.toLowerCase().endsWith(".pdf"));

      if (receiptFiles.length > 0) {
        const colCount = 2;
        const colWidth = (pageWidth - margin * 2 - 10) / colCount;
        const maxImgHeight = 80;
        const headerHeight = 12;
        const cellHeight = maxImgHeight + headerHeight + 6;
        let curX = margin; let curY = margin; let col = 0;

        doc.addPage();
        doc.setFontSize(14);
        doc.text(tt({de:"Beleganhänge", en:"Receipt Attachments", tr:"Fiş Ekleri", ar:"مرفقات الإيصالات", ru:"Приложения чеков"}), pageWidth / 2, curY, { align: "center" });
        curY += 10;

        for (let i = 0; i < receiptFiles.length; i++) {
          const receipt = receiptFiles[i];
          if (!receipt.file_path) continue;
          try {
            const { data: urlData } = await supabase.storage.from("receipts").createSignedUrl(receipt.file_path, 60);
            if (!urlData?.signedUrl) continue;
            const response = await fetch(urlData.signedUrl);
            const blob = await response.blob();
            const imgData = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            if (curY + cellHeight > pageHeight - margin) { doc.addPage(); curY = margin; col = 0; }
            curX = margin + col * (colWidth + 10);
            doc.setFontSize(7);
            doc.text(`${i + 1}. ${(receipt.description || receipt.date).substring(0, 30)}`, curX, curY + 4);
            const imgProps = doc.getImageProperties(imgData);
            const ratio = Math.min(colWidth / imgProps.width, maxImgHeight / imgProps.height);
            const w = imgProps.width * ratio; const h = imgProps.height * ratio;
            doc.addImage(imgData, "JPEG", curX, curY + headerHeight, w, h);
            col++;
            if (col >= colCount) { col = 0; curY += cellHeight; }
          } catch (err) { console.error("Error adding receipt image:", err); }
        }
      }

      const filename = `Report_${fromDate}_${toDate}.pdf`;
      if (Capacitor.isNativePlatform()) {
        // iOS/Android: ins Cache-Verzeichnis schreiben und über Share-Sheet teilen
        const pdfDataUri = doc.output("datauristring");
        const base64 = pdfDataUri.split(",")[1];
        const written = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });
        try {
          await Share.share({
            title: "BelegManager Report",
            text: `Belegabrechnung ${fromDate} – ${toDate}`,
            url: written.uri,
            dialogTitle: "Report teilen",
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!/cancel|abort/i.test(msg)) throw e;
        }
        toast({ title: tt({de:"PDF geteilt", en:"PDF shared"}) });
      } else {
        // Web: Browser-Download
        doc.save(filename);
        toast({ title: tt({de:"PDF erstellt!", en:"PDF generated!", tr:"PDF oluşturuldu!", ar:"تم إنشاء PDF!", ru:"PDF создан!"}) });
      }
    } catch (err: any) {
      toast({ title: err.message || "PDF error", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
          {tt({ de: "Belegabrechnung", en: "Expense Report" })}
        </p>
        <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">{t("expense.title")}</h1>
        {profile && (
          <p className="text-subhead text-muted-foreground">
            {(profile.first_name || profile.last_name) && [profile.first_name, profile.last_name].filter(Boolean).join(" ") + " · "}
            {profile.email}
            {filterCompanyId !== "all" && filterCompanyId !== "none" && companies.find(c => c.id === filterCompanyId) && (
              <> · <span className="text-foreground font-medium">{companies.find(c => c.id === filterCompanyId)?.name}</span></>
            )}
          </p>
        )}
      </div>

      {/* Zeitraum-Card im Revolut-Stil */}
      <div className="rounded-2xl border bg-card p-5 space-y-5">
        <h2 className="text-headline">{t("expense.period")}</h2>

        {/* Schnellauswahl als Chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const end = new Date(now.getFullYear(), now.getMonth(), 0);
              setFromDate(formatLocalDate(start));
              setToDate(formatLocalDate(end));
            }}
            className="h-11 px-4 rounded-full text-callout font-medium border border-border bg-card hover:bg-muted active:bg-muted"
          >
            {tt({ de: "Letzter Monat", en: "Last month" })}
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
              const end = new Date(now.getFullYear(), now.getMonth() - 1, 0);
              setFromDate(formatLocalDate(start));
              setToDate(formatLocalDate(end));
            }}
            className="h-11 px-4 rounded-full text-callout font-medium border border-border bg-card hover:bg-muted active:bg-muted"
          >
            {tt({ de: "Vorletzter Monat", en: "Month before last" })}
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setFromDate(formatLocalDate(new Date(now.getFullYear(), 0, 1)));
              setToDate(formatLocalDate(now));
            }}
            className="h-11 px-4 rounded-full text-callout font-medium border border-border bg-card hover:bg-muted active:bg-muted"
          >
            {tt({ de: "Year-to-date", en: "Year-to-date" })}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-subhead">{t("expense.from")}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-12 text-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-subhead">{t("expense.to")}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-12 text-body" />
          </div>
        </div>

        {/* Status-Summary als Chip-Reihe */}
        {filteredReceipts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-footnote font-medium bg-amber-50 text-amber-800 border border-amber-200">
              {statusCounts.incomplete} {tt({ de: "Unvollständig", en: "Incomplete" })}
            </span>
            <span className="px-3 py-1 rounded-full text-footnote font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {statusCounts.ready} {tt({ de: "Bereit", en: "Ready" })}
            </span>
            <span className="px-3 py-1 rounded-full text-footnote font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {statusCounts.exported} {tt({ de: "Festgeschrieben", en: "Locked" })}
            </span>
          </div>
        )}

        {/* Action-Bar: Primary "An StB" + Secondary Trio (PDF/CSV/DATEV) */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={openMailToAdvisor}
            disabled={filteredReceipts.length === 0 || !profile?.tax_advisor_email}
            className="h-13 w-full text-body font-semibold text-primary-foreground gap-2"
            title={!profile?.tax_advisor_email ? tt({ de: "Bitte erst E-Mail des Steuerberaters in „Mein Konto“ speichern", en: "Please set tax advisor email in My Account first" }) : ""}
          >
            <Send className="h-5 w-5" />
            {tt({ de: "An Steuerberater senden", en: "Send to Tax Advisor" })}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-11 text-body gap-2" onClick={generatePDF} disabled={generating || filteredReceipts.length === 0}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="h-11 text-body gap-2" onClick={exportCSV} disabled={filteredReceipts.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="h-11 text-body gap-2" onClick={exportDATEV} disabled={filteredReceipts.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              DATEV
            </Button>
          </div>
        </div>
      </div>

      {/* Mandanten-Filter als Chips — Revolut-Pattern, explizit weil ein Stapel pro Mandant gemacht werden muss */}
      {receipts.length > 0 && companies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {[
            { id: "all", name: tt({ de: "Alle", en: "All" }), count: receipts.length },
            ...companies.map(c => ({ id: c.id, name: c.name, count: receipts.filter(r => r.company_id === c.id).length })),
            { id: "none", name: tt({ de: "Ohne", en: "None" }), count: receipts.filter(r => !r.company_id).length },
          ].map((m) => {
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

      {filteredReceipts.length > 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="hidden md:block">
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>{t("receipts.date")}</TableHead>
                     <TableHead className="text-right">{t("receipts.amount")}</TableHead>
                     <TableHead className="text-right">MwSt.</TableHead>
                     <TableHead>{t("receipts.description")}</TableHead>
                     <TableHead>{t("receipts.company")}</TableHead>
                     <TableHead>{t("receipts.person")}</TableHead>
                     <TableHead>Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredReceipts.map((r) => (
                     <TableRow key={r.id}>
                       <TableCell className="whitespace-nowrap">{new Date(r.date).toLocaleDateString(locale)}</TableCell>
                       <TableCell className="font-mono text-right whitespace-nowrap">
                         {(() => {
                           const isForex = r.currency && r.currency !== "EUR";
                           const eur = r.amount_eur ?? r.amount;
                           if (eur == null) return "–";
                           if (isForex && r.amount != null && r.amount_eur != null) {
                             return (
                               <>
                                 <span>{r.amount_eur.toFixed(2)} €</span>
                                 <span className="block text-[10px] text-muted-foreground font-normal">
                                   {r.amount.toFixed(2)}&nbsp;{r.currency}
                                 </span>
                               </>
                             );
                           }
                           return `${eur.toFixed(2)} €`;
                         })()}
                       </TableCell>
                       <TableCell className="font-mono text-right whitespace-nowrap text-muted-foreground">
                         {r.vat_amount != null ? `${r.vat_amount.toFixed(2)} €` : "–"}
                         {r.vat_rate != null ? ` (${r.vat_rate}%)` : ""}
                       </TableCell>
                       <TableCell>{r.description || "–"}</TableCell>
                       <TableCell>{getCompanyName(r.company_id)}</TableCell>
                       <TableCell>{r.person_met || "–"}</TableCell>
                       <TableCell>{statusLabel(getReceiptStatus(r))}</TableCell>
                     </TableRow>
                   ))}
                   <TableRow className="font-bold border-t-2">
                     <TableCell>{totalLabel}</TableCell>
                     <TableCell className="font-mono text-right whitespace-nowrap">{totalAmount.toFixed(2)} €</TableCell>
                     <TableCell className="font-mono text-right whitespace-nowrap">{totalVat.toFixed(2)} €</TableCell>
                     <TableCell colSpan={4} />
                   </TableRow>
                 </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y">
              {filteredReceipts.map((r) => (
                <div key={r.id} className="px-4 py-3 space-y-1">
                   <div className="flex items-center justify-between">
                     <span className="text-sm text-muted-foreground">{new Date(r.date).toLocaleDateString(locale)}</span>
                     <span className="font-mono text-sm font-semibold whitespace-nowrap">
                       {(() => {
                         const isForex = r.currency && r.currency !== "EUR";
                         const eur = r.amount_eur ?? r.amount;
                         if (eur == null) return "–";
                         if (isForex && r.amount != null && r.amount_eur != null) {
                           return `${r.amount_eur.toFixed(2)} € (${r.amount.toFixed(2)} ${r.currency})`;
                         }
                         return `${eur.toFixed(2)} €`;
                       })()}
                     </span>
                   </div>
                   {r.vat_amount != null && (
                     <div className="flex items-center justify-between text-xs text-muted-foreground">
                       <span>MwSt.</span>
                       <span className="font-mono">{r.vat_amount.toFixed(2)} € {r.vat_rate != null ? `(${r.vat_rate}%)` : ""}</span>
                     </div>
                   )}
                  {r.description && <p className="text-sm truncate">{r.description}</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getCompanyName(r.company_id)}</span>
                    <div className="flex items-center gap-2">
                      {r.person_met && <span>{r.person_met}</span>}
                      {statusLabel(getReceiptStatus(r))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 flex items-center justify-between font-bold">
                <span>{totalLabel}</span>
                <span className="font-mono whitespace-nowrap">{totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("receipts.noReceipts")}</p>
          </CardContent>
        </Card>
      )}

      {/* ─── DATEV-Export Dialog ────────────────────────────────────────── */}
      <Dialog open={datevDialogOpen} onOpenChange={setDatevDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tt({ de: "DATEV-Stapel exportieren", en: "Export DATEV stapel" })}
            </DialogTitle>
            <DialogDescription>
              {tt({
                de: "Mandanten-Stammdaten für den DATEV-Buchungsstapel (Format 7). Die Eingaben werden lokal gespeichert.",
                en: "Master data for the DATEV booking stapel (Format 7). Inputs are stored locally.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="datev_berater_nr" className="text-xs">
                {tt({ de: "Berater-Nr*", en: "Consultant No*" })}
              </Label>
              <Input
                id="datev_berater_nr"
                inputMode="numeric"
                placeholder="z.B. 1001"
                value={datevForm.berater_nr}
                onChange={(e) => setDatevForm({ ...datevForm, berater_nr: e.target.value.replace(/\D/g, "").slice(0, 7) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="datev_mandanten_nr" className="text-xs">
                {tt({ de: "Mandanten-Nr*", en: "Client No*" })}
              </Label>
              <Input
                id="datev_mandanten_nr"
                inputMode="numeric"
                placeholder="z.B. 50001"
                value={datevForm.mandanten_nr}
                onChange={(e) => setDatevForm({ ...datevForm, mandanten_nr: e.target.value.replace(/\D/g, "").slice(0, 5) })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="datev_wj_beginn" className="text-xs">
                {tt({ de: "Wirtschaftsjahr-Beginn*", en: "Fiscal year start*" })}
              </Label>
              <Input
                id="datev_wj_beginn"
                type="date"
                value={datevForm.wj_beginn}
                onChange={(e) => setDatevForm({ ...datevForm, wj_beginn: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="datev_sachkonten" className="text-xs">
                {tt({ de: "Sachkontenlänge", en: "Account length" })}
              </Label>
              <Select
                value={String(datevForm.sachkontenlaenge)}
                onValueChange={(v) => setDatevForm({ ...datevForm, sachkontenlaenge: Number(v) as 4 | 5 | 6 | 7 | 8 })}
              >
                <SelectTrigger id="datev_sachkonten"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 (Standard)</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="datev_rahmen" className="text-xs">
                {tt({ de: "Kontenrahmen", en: "Chart of accounts" })}
              </Label>
              <Select
                value={datevForm.kontenrahmen}
                onValueChange={(v) => handleKontenrahmenChange(v as Kontenrahmen)}
              >
                <SelectTrigger id="datev_rahmen"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SKR03">SKR 03</SelectItem>
                  <SelectItem value="SKR04">SKR 04</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="datev_gegenkonto" className="text-xs">
                {tt({ de: "Gegenkonto (Verrechnung/Verbindlichkeit)", en: "Counter-account (clearing/payable)" })}
              </Label>
              <Input
                id="datev_gegenkonto"
                inputMode="numeric"
                placeholder={`Default: ${DEFAULT_GEGENKONTO[datevForm.kontenrahmen]} — mit Steuerberater abstimmen`}
                value={datevForm.konto_gegenkonto}
                onChange={(e) => setDatevForm({ ...datevForm, konto_gegenkonto: e.target.value.replace(/\D/g, "").slice(0, 8) })}
              />
              <p className="text-[10px] text-muted-foreground leading-snug">
                {tt({
                  de: "Nicht das Bankkonto wählen — der Steuerberater bucht die Bank separat aus dem Kontoauszug. Default ist ein Verrechnungs-/Verbindlichkeitskonto, das genaue Konto bitte mit deinem Steuerberater abstimmen.",
                  en: "Do not pick the bank account — the bookkeeper posts the bank separately from the statement. Default is a clearing/payable account; confirm the exact account with your tax advisor.",
                })}
              </p>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="datev_bezeichnung" className="text-xs">
                {tt({ de: "Stapel-Bezeichnung (optional)", en: "Stapel description (optional)" })}
              </Label>
              <Input
                id="datev_bezeichnung"
                placeholder={`z.B. Belege ${fromDate} – ${toDate}`}
                value={datevForm.bezeichnung || ""}
                onChange={(e) => setDatevForm({ ...datevForm, bezeichnung: e.target.value.slice(0, 30) })}
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="datev_encoding" className="text-xs">
                {tt({ de: "Datei-Encoding", en: "File encoding" })}
              </Label>
              <Select value={datevEncoding} onValueChange={(v) => setDatevEncoding(v as "windows-1252" | "utf-8-bom")}>
                <SelectTrigger id="datev_encoding"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="windows-1252">Windows-1252 ({tt({ de: "DATEV-Standard", en: "DATEV default" })})</SelectItem>
                  <SelectItem value="utf-8-bom">UTF-8 with BOM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* GoBD-Schicht B: Test- vs. Produktiv-Modus */}
            <div className="space-y-1.5 col-span-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
              <Label htmlFor="datev_mode" className="text-xs font-semibold">
                {tt({ de: "Export-Modus (GoBD)", en: "Export mode (GoBD)" })}
              </Label>
              <Select value={datevMode} onValueChange={(v) => setDatevMode(v as "test" | "produktiv")}>
                <SelectTrigger id="datev_mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">
                    🧪 {tt({ de: "Test-Export (Belege bleiben editierbar)", en: "Test export (receipts stay editable)" })}
                  </SelectItem>
                  <SelectItem value="produktiv">
                    🔒 {tt({ de: "Produktiv-Export (Belege werden festgeschrieben)", en: "Production export (receipts get locked)" })}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {datevMode === "test"
                  ? tt({
                      de: "Datei beginnt mit „DATEV_TEST_“. Belege werden NICHT festgeschrieben. Zum gefahrlosen Probieren.",
                      en: 'Filename starts with "DATEV_TEST_". Receipts are NOT locked. Safe for testing.',
                    })
                  : tt({
                      de: "Belege werden nach § 146 AO / GoBD festgeschrieben und können danach NICHT mehr bearbeitet werden.",
                      en: "Receipts will be locked per § 146 AO / GoBD and can NO LONGER be edited afterwards.",
                    })}
              </p>
            </div>
          </div>

          {/* Hard-Errors aus dem letzten Export-Versuch */}
          {datevErrors.length > 0 && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-1">
              <p className="font-semibold">
                {tt({
                  de: `Export blockiert — ${datevErrors.length} Fehler in den Daten:`,
                  en: `Export blocked — ${datevErrors.length} errors in the data:`,
                })}
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {datevErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              <p className="pt-1">
                {tt({
                  de: "Bitte die genannten Belege öffnen und Daten korrigieren, dann erneut exportieren.",
                  en: "Please open the listed receipts, fix the data, and try again.",
                })}
              </p>
            </div>
          )}

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {tt({
              de: `${filteredReceipts.length} Belege werden als Buchungsstapel exportiert. Pflichtfelder sind mit * markiert.`,
              en: `${filteredReceipts.length} receipts will be exported as a booking stapel. Required fields marked with *.`,
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDatevDialogOpen(false); setDatevErrors([]); }}>
              {tt({ de: "Abbrechen", en: "Cancel" })}
            </Button>
            <Button
              onClick={performDatevExport}
              variant={datevMode === "produktiv" ? "default" : "secondary"}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {datevMode === "produktiv"
                ? tt({ de: "Festschreiben & exportieren", en: "Lock & export" })
                : tt({ de: "Test-Stapel erstellen", en: "Create test stapel" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseReport;
