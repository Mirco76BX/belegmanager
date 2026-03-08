import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
}

interface Company {
  id: string;
  name: string;
}

const ExpenseReport = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [receiptsRes, companiesRes] = await Promise.all([
      supabase
        .from("receipts")
        .select("*")
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: true }),
      supabase.from("companies").select("id, name"),
    ]);
    if (receiptsRes.data) setReceipts(receiptsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, fromDate, toDate]);

  const getCompanyName = (id: string | null) =>
    id ? companies.find((c) => c.id === id)?.name || "–" : "–";

  const totalAmount = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  const getTableHeaders = () => [
    lang === "de" ? "Datum" : "Date",
    lang === "de" ? "Betrag" : "Amount",
    lang === "de" ? "Beschreibung" : "Description",
    lang === "de" ? "Organisation" : "Organization",
    lang === "de" ? "Person" : "Person",
    lang === "de" ? "Zweck" : "Purpose",
  ];

  const getTableRows = () =>
    receipts.map((r) => [
      new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US"),
      r.amount != null ? `${r.amount.toFixed(2)} €` : "–",
      r.description || "–",
      getCompanyName(r.company_id),
      r.person_met || "–",
      r.meeting_purpose || "–",
    ]);

  const exportCSV = () => {
    if (receipts.length === 0) return;
    const headers = getTableHeaders();
    const rows = getTableRows();
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
      [lang === "de" ? "Gesamt" : "Total", `${totalAmount.toFixed(2)} €`, "", "", "", ""].map((c) => `"${c}"`).join(";"),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lang === "de" ? "Reisekostenabrechnung" : "expense-report"}_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = async () => {
    if (receipts.length === 0) {
      toast({ title: lang === "de" ? "Keine Belege im Zeitraum" : "No receipts in period", variant: "destructive" });
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Title
      doc.setFontSize(18);
      doc.text(
        lang === "de" ? "Reisekostenabrechnung" : "Travel Expense Report",
        pageWidth / 2, 20, { align: "center" }
      );

      doc.setFontSize(11);
      doc.text(
        `${lang === "de" ? "Zeitraum" : "Period"}: ${fromDate} – ${toDate}`,
        pageWidth / 2, 30, { align: "center" }
      );

      const rows = getTableRows();
      rows.push([
        lang === "de" ? "Gesamt" : "Total",
        `${totalAmount.toFixed(2)} €`,
        "", "", "", "",
      ]);

      autoTable(doc, {
        startY: 40,
        head: [getTableHeaders()],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [41, 74, 112] },
        footStyles: { fontStyle: "bold" },
        theme: "grid",
      });

      // Collect receipt images – multiple per page
      const receiptFiles = receipts.filter(
        (r) => r.file_path && !r.file_path.toLowerCase().endsWith(".pdf")
      );

      if (receiptFiles.length > 0) {
        // Grid layout: 2 columns, multiple rows per page
        const colCount = 2;
        const colWidth = (pageWidth - margin * 2 - 10) / colCount; // 10 = gap
        const maxImgHeight = 80;
        const headerHeight = 12;
        const cellHeight = maxImgHeight + headerHeight + 6;

        let curX = margin;
        let curY = margin;
        let col = 0;

        doc.addPage();
        doc.setFontSize(14);
        doc.text(lang === "de" ? "Beleganhänge" : "Receipt Attachments", pageWidth / 2, curY, { align: "center" });
        curY += 10;

        for (let i = 0; i < receiptFiles.length; i++) {
          const receipt = receiptFiles[i];
          if (!receipt.file_path) continue;

          try {
            const { data: urlData } = await supabase.storage
              .from("receipts")
              .createSignedUrl(receipt.file_path, 60);
            if (!urlData?.signedUrl) continue;

            const response = await fetch(urlData.signedUrl);
            const blob = await response.blob();
            const imgData = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            // Check if we need a new page
            if (curY + cellHeight > pageHeight - margin) {
              doc.addPage();
              curY = margin;
              col = 0;
            }

            curX = margin + col * (colWidth + 10);

            // Label
            doc.setFontSize(7);
            doc.text(
              `${i + 1}. ${(receipt.description || receipt.date).substring(0, 30)}`,
              curX, curY + 4
            );

            // Image
            const imgProps = doc.getImageProperties(imgData);
            const ratio = Math.min(colWidth / imgProps.width, maxImgHeight / imgProps.height);
            const w = imgProps.width * ratio;
            const h = imgProps.height * ratio;
            doc.addImage(imgData, "JPEG", curX, curY + headerHeight, w, h);

            col++;
            if (col >= colCount) {
              col = 0;
              curY += cellHeight;
            }
          } catch (err) {
            console.error("Error adding receipt image:", err);
          }
        }
      }

      doc.save(`${lang === "de" ? "Reisekostenabrechnung" : "expense-report"}_${fromDate}_${toDate}.pdf`);
      toast({ title: lang === "de" ? "PDF erstellt!" : "PDF generated!" });
    } catch (err: any) {
      toast({ title: err.message || "PDF error", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">{t("expense.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("expense.period")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 min-w-0">
              <Label>{t("expense.from")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full" />
            </div>
            <div className="space-y-2 min-w-0">
              <Label>{t("expense.to")}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button className="gap-2" onClick={generatePDF} disabled={generating || receipts.length === 0}>
              <Download className="h-4 w-4" />
              {generating ? t("general.loading") : "PDF"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={receipts.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {receipts.length > 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("receipts.date")}</TableHead>
                    <TableHead className="text-right">{t("receipts.amount")}</TableHead>
                    <TableHead>{t("receipts.description")}</TableHead>
                    <TableHead>{t("receipts.company")}</TableHead>
                    <TableHead>{t("receipts.person")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}</TableCell>
                      <TableCell className="font-mono text-right whitespace-nowrap">{r.amount != null ? `${r.amount.toFixed(2)} €` : "–"}</TableCell>
                      <TableCell>{r.description || "–"}</TableCell>
                      <TableCell>{getCompanyName(r.company_id)}</TableCell>
                      <TableCell>{r.person_met || "–"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>{lang === "de" ? "Gesamt" : "Total"}</TableCell>
                    <TableCell className="font-mono text-right whitespace-nowrap">{totalAmount.toFixed(2)} €</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {receipts.map((r) => (
                <div key={r.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
                    </span>
                    <span className="font-mono text-sm font-semibold whitespace-nowrap">
                      {r.amount != null ? `${r.amount.toFixed(2)} €` : "–"}
                    </span>
                  </div>
                  {r.description && <p className="text-sm truncate">{r.description}</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getCompanyName(r.company_id)}</span>
                    {r.person_met && <span>{r.person_met}</span>}
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 flex items-center justify-between font-bold">
                <span>{lang === "de" ? "Gesamt" : "Total"}</span>
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
