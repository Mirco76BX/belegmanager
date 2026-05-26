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
import { FileSpreadsheet, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  buildDatevStapel,
  downloadDatevCsv,
  DEFAULT_GEGENKONTO,
  type DatevMandantSettings,
  type Kontenrahmen,
} from "@/lib/datev";

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
}

interface Company {
  id: string;
  name: string;
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
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; display_name: string | null; email: string } | null>(null);

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


  const fetchData = async () => {
    if (!user || subscription.tier === "free") return;
    setLoading(true);
    const [receiptsRes, companiesRes, profileRes] = await Promise.all([
      supabase.from("receipts").select("*").gte("date", fromDate).lte("date", toDate).order("date", { ascending: true }),
      supabase.from("companies").select("id, name"),
      supabase.from("profiles").select("first_name, last_name, display_name, email").eq("id", user.id).single(),
    ]);
    if (receiptsRes.data) setReceipts(receiptsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (profileRes.data) setProfile(profileRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, fromDate, toDate, subscription.tier]);

  if (subscription.tier === "free") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">{t("expense.title")}</h2>
        <p className="text-muted-foreground max-w-sm">
          {tt({de:"Diese Funktion ist ab dem RELAX-Plan verfügbar. Upgrade jetzt, um Reisekostenabrechnungen zu erstellen.", en:"This feature is available from the RELAX plan. Upgrade now to create travel expense reports.", tr:"Bu özellik RELAX planından itibaren kullanılabilir. Seyahat masraf raporları oluşturmak için şimdi yükseltin.", ar:"هذه الميزة متاحة من خطة RELAX. قم بالترقية الآن لإنشاء تقارير مصاريف السفر.", ru:"Эта функция доступна с плана RELAX. Обновите сейчас для создания отчётов о командировочных."})}
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
    t("receipts.date"), t("receipts.amount"), "MwSt.", "MwSt.-%", t("receipts.description"),
    t("receipts.company"), t("receipts.person"), tt({de:"Zweck", en:"Purpose", tr:"Amaç", ar:"الغرض", ru:"Цель"}),
    "Status",
  ];

  const getTableRows = () =>
    filteredReceipts.map((r) => {
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
      return [
        new Date(r.date).toLocaleDateString(locale),
        amountStr,
        r.vat_amount != null ? `${r.vat_amount.toFixed(2)}\u00A0€` : "–",
        r.vat_rate != null ? `${r.vat_rate}%` : "–",
        r.description || "–", getCompanyName(r.company_id),
        r.person_met || "–", r.meeting_purpose || "–",
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
      [totalLabel, `${totalAmount.toFixed(2)}\u00A0€`, `${totalVat.toFixed(2)}\u00A0€`, "", "", "", "", "", ""].map((c) => `"${c}"`).join(";"),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // DATEV-Export: öffnet erst den Stammdaten-Dialog, dann generiert die Lib den Stapel.
  const exportDATEV = () => {
    if (filteredReceipts.length === 0) return;
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
      })),
      mandant: datevForm,
      datumVon: fromDate,
      datumBis: toDate,
      exportiertVon: profile?.email || user?.email || "BelegManager",
      herkunft: "BM",
    });

    const hardErrors = result.warnings.filter((w) =>
      /Berater-Nr|Mandanten-Nr|WJ-Beginn/.test(w),
    );
    if (hardErrors.length > 0) {
      toast({
        title: tt({ de: "DATEV-Stammdaten ungültig", en: "DATEV master data invalid" }),
        description: hardErrors.join(" • "),
        variant: "destructive",
      });
      return;
    }

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
    setDatevDialogOpen(false);

    const softWarnings = result.warnings.filter((w) => !hardErrors.includes(w));
    toast({
      title: tt({ de: "DATEV-Stapel erstellt", en: "DATEV stapel generated" }),
      description: softWarnings.length
        ? tt({
            de: `${result.count} Buchungen exportiert (${softWarnings.length} Hinweise – siehe Konsole)`,
            en: `${result.count} bookings exported (${softWarnings.length} notes – see console)`,
          })
        : tt({
            de: `${result.count} Buchungen exportiert.`,
            en: `${result.count} bookings exported.`,
          }),
    });
    if (softWarnings.length > 0) {
      console.warn("[DATEV] Soft warnings:", softWarnings);
    }
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
      rows.push([totalLabel, `${totalAmount.toFixed(2)}\u00A0€`, `${totalVat.toFixed(2)}\u00A0€`, "", "", "", "", ""]);

      autoTable(doc, {
        startY: yPos, head: [getTableHeaders()], body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [41, 74, 112] },
        columnStyles: {
          0: { cellWidth: 22 },  // Datum
          1: { cellWidth: 24, halign: 'right' },  // Betrag
          2: { cellWidth: 20, halign: 'right' },  // MwSt.
          3: { cellWidth: 16, halign: 'right' },  // MwSt.-%
        },
        footStyles: { fontStyle: "bold" }, theme: "grid",
      });

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

      doc.save(`Report_${fromDate}_${toDate}.pdf`);
      toast({ title: tt({de:"PDF erstellt!", en:"PDF generated!", tr:"PDF oluşturuldu!", ar:"تم إنشاء PDF!", ru:"PDF создан!"}) });
    } catch (err: any) {
      toast({ title: err.message || "PDF error", variant: "destructive" });
    } finally { setGenerating(false); }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">{t("expense.title")}</h1>

      {profile && (
        <div className="text-sm text-muted-foreground">
          {(profile.first_name || profile.last_name) && (
            <p className="font-medium text-foreground">{[profile.first_name, profile.last_name].filter(Boolean).join(" ")}</p>
          )}
          <p>{profile.email}</p>
          {filterCompanyId !== "all" && filterCompanyId !== "none" && (
            <p className="font-medium text-foreground">
              {tt({de:"Organisation", en:"Organization", tr:"Kuruluş", ar:"المنظمة", ru:"Организация"})}: {companies.find(c => c.id === filterCompanyId)?.name}
            </p>
          )}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("expense.period")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                setFromDate(formatLocalDate(start));
                setToDate(formatLocalDate(end));
              }}
            >
              {tt({ de: "Letzter Monat", en: "Last month", tr: "Geçen ay", ar: "الشهر الماضي", ru: "Прошлый месяц" })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                const end = new Date(now.getFullYear(), now.getMonth() - 1, 0);
                setFromDate(formatLocalDate(start));
                setToDate(formatLocalDate(end));
              }}
            >
              {tt({ de: "Vorletzter Monat", en: "Month before last", tr: "Önceki ay", ar: "الشهر قبل الماضي", ru: "Позапрошлый месяц" })}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            <div className="space-y-2 min-w-0">
              <Label>{t("expense.from")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full max-w-full text-sm" />
            </div>
            <div className="space-y-2 min-w-0">
              <Label>{t("expense.to")}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full max-w-full text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button className="gap-2" onClick={generatePDF} disabled={generating || filteredReceipts.length === 0}>
              <Download className="h-4 w-4" />
              {generating ? t("general.loading") : "PDF"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={filteredReceipts.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportDATEV} disabled={filteredReceipts.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              DATEV
            </Button>
          </div>

          {/* Status summary */}
          {filteredReceipts.length > 0 && (
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">{statusCounts.incomplete} {tt({de:"Unvollständig", en:"Incomplete"})}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">{statusCounts.ready} {tt({de:"Bereit", en:"Ready"})}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">{statusCounts.exported} {tt({de:"Exportiert", en:"Exported"})}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                       <TableCell className="font-mono text-right whitespace-nowrap">{r.amount != null ? `${r.amount.toFixed(2)} €` : "–"}</TableCell>
                       <TableCell className="font-mono text-right whitespace-nowrap text-muted-foreground">
                         {r.vat_amount != null ? `${r.vat_amount.toFixed(2)} €` : "–"}
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
                     <TableCell className="font-mono text-right whitespace-nowrap">{totalAmount.toFixed(2)} €</TableCell>
                     <TableCell className="font-mono text-right whitespace-nowrap">{totalVat.toFixed(2)} €</TableCell>
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
                     <span className="font-mono text-sm font-semibold whitespace-nowrap">{r.amount != null ? `${r.amount.toFixed(2)} €` : "–"}</span>
                   </div>
                   {r.vat_amount != null && (
                     <div className="flex items-center justify-between text-xs text-muted-foreground">
                       <span>MwSt.</span>
                       <span className="font-mono">{r.vat_amount.toFixed(2)} € {r.vat_rate != null ? `(${r.vat_rate}%)` : ""}</span>
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
                <span className="font-mono whitespace-nowrap">{totalAmount.toFixed(2)} €</span>
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
        <DialogContent className="max-w-lg">
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
                {tt({ de: "Gegenkonto (Bezahlweg)", en: "Counter-account (payment)" })}
              </Label>
              <Input
                id="datev_gegenkonto"
                inputMode="numeric"
                placeholder={`Default: ${DEFAULT_GEGENKONTO[datevForm.kontenrahmen]} (Bank)`}
                value={datevForm.konto_gegenkonto}
                onChange={(e) => setDatevForm({ ...datevForm, konto_gegenkonto: e.target.value.replace(/\D/g, "").slice(0, 8) })}
              />
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
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {tt({
              de: `${filteredReceipts.length} Belege werden als Buchungsstapel exportiert. Pflichtfelder sind mit * markiert.`,
              en: `${filteredReceipts.length} receipts will be exported as a booking stapel. Required fields marked with *.`,
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDatevDialogOpen(false)}>
              {tt({ de: "Abbrechen", en: "Cancel" })}
            </Button>
            <Button onClick={performDatevExport}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {tt({ de: "Stapel exportieren", en: "Export stapel" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseReport;
