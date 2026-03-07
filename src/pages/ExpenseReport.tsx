import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
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

  const generatePDF = async () => {
    if (receipts.length === 0) {
      toast({ title: lang === "de" ? "Keine Belege im Zeitraum" : "No receipts in period", variant: "destructive" });
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(18);
      doc.text(
        lang === "de" ? "Reisekostenabrechnung" : "Travel Expense Report",
        pageWidth / 2,
        20,
        { align: "center" }
      );

      // Period
      doc.setFontSize(11);
      doc.text(
        `${lang === "de" ? "Zeitraum" : "Period"}: ${fromDate} – ${toDate}`,
        pageWidth / 2,
        30,
        { align: "center" }
      );

      // Table
      const headers = [
        lang === "de" ? "Datum" : "Date",
        lang === "de" ? "Betrag" : "Amount",
        lang === "de" ? "Beschreibung" : "Description",
        lang === "de" ? "Unternehmen" : "Company",
        lang === "de" ? "Person" : "Person",
        lang === "de" ? "Zweck" : "Purpose",
      ];

      const rows = receipts.map((r) => [
        new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US"),
        r.amount != null ? `${r.amount.toFixed(2)} €` : "–",
        r.description || "–",
        getCompanyName(r.company_id),
        r.person_met || "–",
        r.meeting_purpose || "–",
      ]);

      // Add total row
      rows.push([
        lang === "de" ? "Gesamt" : "Total",
        `${totalAmount.toFixed(2)} €`,
        "", "", "", "",
      ]);

      autoTable(doc, {
        startY: 40,
        head: [headers],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [41, 74, 112] },
        footStyles: { fontStyle: "bold" },
        theme: "grid",
      });

      // Collect receipt images/files as attachments
      const receiptFiles = receipts.filter((r) => r.file_path);

      for (let i = 0; i < receiptFiles.length; i++) {
        const receipt = receiptFiles[i];
        if (!receipt.file_path) continue;

        // Skip PDFs - we can only embed images
        if (receipt.file_path.toLowerCase().endsWith(".pdf")) continue;

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

          doc.addPage();

          // Header for the attachment page
          doc.setFontSize(12);
          doc.text(
            `${lang === "de" ? "Beleg" : "Receipt"} ${i + 1}: ${receipt.description || receipt.date}`,
            14,
            20
          );

          // Add image
          const imgProps = doc.getImageProperties(imgData);
          const maxW = pageWidth - 28;
          const maxH = 240;
          const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          const w = imgProps.width * ratio;
          const h = imgProps.height * ratio;

          doc.addImage(imgData, "JPEG", 14, 30, w, h);
        } catch (err) {
          console.error("Error adding receipt image:", err);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("expense.title")}</h1>
        <Button className="gap-2" onClick={generatePDF} disabled={generating || receipts.length === 0}>
          <Download className="h-4 w-4" />
          {generating ? t("general.loading") : (lang === "de" ? "PDF erstellen" : "Generate PDF")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("expense.period")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>{t("expense.from")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>{t("expense.to")}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {receipts.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("receipts.date")}</TableHead>
                  <TableHead>{t("receipts.amount")}</TableHead>
                  <TableHead>{t("receipts.description")}</TableHead>
                  <TableHead>{t("receipts.company")}</TableHead>
                  <TableHead>{t("receipts.person")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}</TableCell>
                    <TableCell className="font-mono">{r.amount != null ? `${r.amount.toFixed(2)} €` : "–"}</TableCell>
                    <TableCell>{r.description || "–"}</TableCell>
                    <TableCell>{getCompanyName(r.company_id)}</TableCell>
                    <TableCell>{r.person_met || "–"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>{lang === "de" ? "Gesamt" : "Total"}</TableCell>
                  <TableCell className="font-mono">{totalAmount.toFixed(2)} €</TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableBody>
            </Table>
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
