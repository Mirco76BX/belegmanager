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
import { FileSpreadsheet, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Receipt {
  id: string;
  date: string;
  amount: number | null;
  description: string | null;
  person_met: string | null;
  organization: string | null;
  meeting_purpose: string | null;
  file_path: string | null;
  company_id: string | null;
  vat_amount: number | null;
  vat_rate: number | null;
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

  const filteredReceipts = filterCompanyId === "all" ? receipts
    : filterCompanyId === "none" ? receipts.filter(r => !r.company_id)
    : receipts.filter(r => r.company_id === filterCompanyId);

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalVat = filteredReceipts.reduce((sum, r) => sum + (r.vat_amount || 0), 0);

  const getTableHeaders = () => [
    t("receipts.date"), t("receipts.amount"), "MwSt.", "MwSt.-%", t("receipts.description"),
    t("receipts.company"), t("receipts.person"), tt({de:"Zweck", en:"Purpose", tr:"Amaç", ar:"الغرض", ru:"Цель"}),
  ];

  const getTableRows = () =>
    filteredReceipts.map((r) => [
      new Date(r.date).toLocaleDateString(locale),
      r.amount != null ? `${r.amount.toFixed(2)}\u00A0€` : "–",
      r.vat_amount != null ? `${r.vat_amount.toFixed(2)}\u00A0€` : "–",
      r.vat_rate != null ? `${r.vat_rate}%` : "–",
      r.description || "–", getCompanyName(r.company_id),
      r.person_met || "–", r.meeting_purpose || "–",
    ]);

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
      [totalLabel, `${totalAmount.toFixed(2)}\u00A0€`, `${totalVat.toFixed(2)}\u00A0€`, "", "", "", "", ""].map((c) => `"${c}"`).join(";"),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="grid grid-cols-2 gap-3">
            <Button className="gap-2" onClick={generatePDF} disabled={generating || filteredReceipts.length === 0}>
              <Download className="h-4 w-4" />
              {generating ? t("general.loading") : "PDF"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={filteredReceipts.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </Button>
          </div>
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
                     </TableRow>
                   ))}
                   <TableRow className="font-bold border-t-2">
                     <TableCell>{totalLabel}</TableCell>
                     <TableCell className="font-mono text-right whitespace-nowrap">{totalAmount.toFixed(2)} €</TableCell>
                     <TableCell className="font-mono text-right whitespace-nowrap">{totalVat.toFixed(2)} €</TableCell>
                     <TableCell colSpan={3} />
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
                    {r.person_met && <span>{r.person_met}</span>}
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
    </div>
  );
};

export default ExpenseReport;
