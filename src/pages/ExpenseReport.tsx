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
  receipt_type?: string | null;
}

interface Company {
  id: string;
  name: string;
  datev_berater_nr?: string | null;
  datev_mandanten_nr?: string | null;
  datev_wj_beginn?: string | null;
  datev_sachkontenlaenge?: number | null;
  datev_bezeichnung?: string | null;
  datev_diktatkuerzel?: string | null;
  datev_konto_gegenkonto?: string | null;
  festschreibung_default?: number | null;
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
      supabase.from("companies").select("*"),
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

  // ============================================================
  // DATEV EXTF Format 7 (Buchungsstapel, Versionssatz 700/Format 21, v13)
  // Spec: DATEV ASCII-Export "Buchungsstapel"
  //   - Encoding: Windows-1252 (ANSI), Zeilenende CRLF
  //   - Dezimaltrenner: Komma, 2 Nachkommastellen
  //   - Datum Header: YYYYMMDD, Belegdatum: TTMM
  //   - Vorlaufzeile: 31 Felder; Spaltenzeile + Buchungszeilen: 116 Felder
  // ============================================================
  const DATEV_COLUMNS = [
    "Umsatz (ohne Soll/Haben-Kz)","Soll/Haben-Kennzeichen","WKZ Umsatz","Kurs","Basisumsatz","WKZ Basisumsatz",
    "Konto","Gegenkonto (ohne BU-Schlüssel)","BU-Schlüssel","Belegdatum","Belegfeld 1","Belegfeld 2","Skonto",
    "Buchungstext","Postensperre","Diverse Adressnummer","Geschäftspartnerbank","Sachverhalt","Zinssperre","Beleglink",
    "Beleginfo – Art 1","Beleginfo – Inhalt 1","Beleginfo – Art 2","Beleginfo – Inhalt 2",
    "Beleginfo – Art 3","Beleginfo – Inhalt 3","Beleginfo – Art 4","Beleginfo – Inhalt 4",
    "Beleginfo – Art 5","Beleginfo – Inhalt 5","Beleginfo – Art 6","Beleginfo – Inhalt 6",
    "Beleginfo – Art 7","Beleginfo – Inhalt 7","Beleginfo – Art 8","Beleginfo – Inhalt 8",
    "KOST1 – Kostenstelle","KOST2 – Kostenstelle","Kost-Menge","EU-Mitgliedstaat u. USt-IdNr. (Bestimmung)",
    "EU-Steuersatz (Bestimmung)","Abw. Versteuerungsart","Sachverhalt L+L","Funktionsergänzung L+L",
    "BU 49 Hauptfunktionstyp","BU 49 Hauptfunktionsnummer","BU 49 Funktionsergänzung",
    "Zusatzinformation – Art 1","Zusatzinformation – Inhalt 1","Zusatzinformation – Art 2","Zusatzinformation – Inhalt 2",
    "Zusatzinformation – Art 3","Zusatzinformation – Inhalt 3","Zusatzinformation – Art 4","Zusatzinformation – Inhalt 4",
    "Zusatzinformation – Art 5","Zusatzinformation – Inhalt 5","Zusatzinformation – Art 6","Zusatzinformation – Inhalt 6",
    "Zusatzinformation – Art 7","Zusatzinformation – Inhalt 7","Zusatzinformation – Art 8","Zusatzinformation – Inhalt 8",
    "Zusatzinformation – Art 9","Zusatzinformation – Inhalt 9","Zusatzinformation – Art 10","Zusatzinformation – Inhalt 10",
    "Zusatzinformation – Art 11","Zusatzinformation – Inhalt 11","Zusatzinformation – Art 12","Zusatzinformation – Inhalt 12",
    "Zusatzinformation – Art 13","Zusatzinformation – Inhalt 13","Zusatzinformation – Art 14","Zusatzinformation – Inhalt 14",
    "Zusatzinformation – Art 15","Zusatzinformation – Inhalt 15","Zusatzinformation – Art 16","Zusatzinformation – Inhalt 16",
    "Zusatzinformation – Art 17","Zusatzinformation – Inhalt 17","Zusatzinformation – Art 18","Zusatzinformation – Inhalt 18",
    "Zusatzinformation – Art 19","Zusatzinformation – Inhalt 19","Zusatzinformation – Art 20","Zusatzinformation – Inhalt 20",
    "Stück","Gewicht","Zahlweise","Forderungsart","Veranlagungsjahr","Zugeordnete Fälligkeit","Skontotyp",
    "Auftragsnummer","Buchungstyp","USt-Schlüssel (Anzahlungen)","EU-Mitgliedstaat (Anzahlungen)",
    "Sachverhalt L+L (Anzahlungen)","EU-Steuersatz (Anzahlungen)","Erlöskonto (Anzahlungen)","Herkunft-Kz",
    "Leerfeld","KOST-Datum","SEPA-Mandatsreferenz","Skontosperre","Gesellschaftername","Beteiligtennummer",
    "Identifikationsnummer","Zeichnernummer","Postensperre bis","Bezeichnung SoBil-Sachverhalt","Kennzeichen SoBil-Buchung",
    "Festschreibung","Leistungsdatum","Datum Zuord. Steuerperiode","Fälligkeit","Generalumkehr (GU)","Steuersatz","Land",
  ]; // 116 columns
  const DATEV_COL_COUNT = DATEV_COLUMNS.length;

  // Quote text fields per DATEV spec: double quotes, internal " escaped as ""
  const q = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  // Header field: number unquoted, text in quotes, blank as empty
  const num = (v: number | string) => String(v);
  // Replace ; and CR/LF inside texts (not allowed)
  const sanitize = (v: string) => v.replace(/[\r\n;]/g, " ").trim();

  // Windows-1252 encoder (browsers only provide UTF-8 TextEncoder)
  // Handles ASCII (0x00-0x7F), Latin-1 supplement (0xA0-0xFF), plus the Win-1252
  // specific 0x80-0x9F range (€, …, ä-mappings already in Latin-1).
  const WIN1252_EXTRAS: Record<number, number> = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
    0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
    0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
    0x017E: 0x9E, 0x0178: 0x9F,
  };
  const encodeWin1252 = (s: string): Uint8Array => {
    const out = new Uint8Array(s.length * 2);
    let i = 0;
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      let byte: number;
      if (cp <= 0xFF && !(cp >= 0x80 && cp <= 0x9F)) byte = cp;
      else if (WIN1252_EXTRAS[cp] !== undefined) byte = WIN1252_EXTRAS[cp];
      else byte = 0x3F; // '?'
      out[i++] = byte;
    }
    return out.slice(0, i);
  };

  const formatAmount = (n: number): string => Math.abs(n).toFixed(2).replace(".", ",");
  const toYYYYMMDD = (iso: string): string => iso.replace(/-/g, "");
  const toTTMM = (iso: string): string => {
    const [, m, d] = iso.split("-");
    return `${d}${m}`;
  };

  const exportDATEV = async () => {
    if (filteredReceipts.length === 0) return;

    // Require a specific organization (Berater/Mandant/WJ are per-Mandant)
    if (filterCompanyId === "all" || filterCompanyId === "none") {
      toast({
        title: tt({ de: "Organisation auswählen", en: "Select organization" }),
        description: tt({
          de: "Für den DATEV-Export muss eine konkrete Organisation gewählt sein (Berater-/Mandanten-Nr., WJ-Beginn, Sachkontenlänge).",
          en: "DATEV export requires a specific organization (advisor/client number, fiscal year start, account length).",
        }),
        variant: "destructive",
      });
      return;
    }

    const company = companies.find((c) => c.id === filterCompanyId);
    if (!company) return;

    // Validate required DATEV master data
    const beraterNr = (company.datev_berater_nr || "").trim();
    const mandantenNr = (company.datev_mandanten_nr || "").trim();
    const wjBeginn = company.datev_wj_beginn ? toYYYYMMDD(company.datev_wj_beginn) : "";
    const skoLen = company.datev_sachkontenlaenge ?? 4;
    if (!beraterNr || !mandantenNr || !wjBeginn) {
      toast({
        title: tt({ de: "DATEV-Stammdaten fehlen", en: "Missing DATEV master data" }),
        description: tt({
          de: "Bitte Berater-Nr., Mandanten-Nr. und Wirtschaftsjahr-Beginn in der Organisation hinterlegen.",
          en: "Please set advisor no., client no. and fiscal year start in the organization settings.",
        }),
        variant: "destructive",
      });
      return;
    }

    // Festschreibung: EXPLICIT 0 (default) so the tax advisor can still edit the
    // stack in DATEV. Empty value would let DATEV apply its own (locking) default.
    const festschreibung = company.festschreibung_default ?? 0;

    // Default contra-account (Gegenkonto). Typically 1200 (Bank, SKR03) or 1800
    // (Bank, SKR04). User-configurable per company.
    const gegenkonto = (company.datev_konto_gegenkonto || "1200").trim();
    const bezeichnung = sanitize(company.datev_bezeichnung || `Belege ${fromDate} - ${toDate}`).slice(0, 30);
    const diktatkuerzel = sanitize((company.datev_diktatkuerzel || "BM")).slice(0, 2);

    // --- 1. Vorlaufzeile (31 Felder) ---
    const now = new Date();
    const pad = (n: number, l = 2) => String(n).padStart(l, "0");
    const erzeugtTs =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}000`;
    const exporter = sanitize([profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Belegmanager").slice(0, 25);

    const header = [
      q("EXTF"),          // 1  Kennzeichen
      num(700),           // 2  Versionsnummer
      num(21),            // 3  Datenkategorie: 21 = Buchungsstapel
      q("Buchungsstapel"),// 4  Formatname
      num(13),            // 5  Formatversion (13 = Format 7)
      num(erzeugtTs),     // 6  Erzeugt am (YYYYMMDDHHMMSSFFF)
      "",                 // 7  Importiert (leer)
      q("SV"),            // 8  Herkunft (2 Zeichen)
      q(exporter),        // 9  Exportiert von
      "",                 // 10 Importiert von
      num(beraterNr),     // 11 Berater-Nr
      num(mandantenNr),   // 12 Mandanten-Nr
      num(wjBeginn),      // 13 WJ-Beginn YYYYMMDD
      num(skoLen),        // 14 Sachkontenlänge
      num(toYYYYMMDD(fromDate)), // 15 Datum-von
      num(toYYYYMMDD(toDate)),   // 16 Datum-bis
      q(bezeichnung),     // 17 Bezeichnung
      q(diktatkuerzel),   // 18 Diktatkürzel
      num(1),             // 19 Buchungstyp: 1 = Finanzbuchführung
      "",                 // 20 Rechnungslegungszweck (leer = Standard)
      num(festschreibung),// 21 Festschreibung (EXPLIZIT 0!)
      q("EUR"),           // 22 WKZ
      "", "", "", "", "", "", "", "", "", // 23-31 reserviert
    ].join(";");

    // --- 2. Spaltenzeile ---
    const columnHeader = DATEV_COLUMNS.join(";");

    // --- 3. Buchungszeilen ---
    const dataLines = filteredReceipts.map((r) => {
      const row: string[] = new Array(DATEV_COL_COUNT).fill("");
      const amt = r.amount_eur ?? r.amount ?? 0;
      // Default account by tax category. Real implementations should map via
      // a per-company chart of accounts; this is a reasonable SKR03 default.
      let konto = "4900"; // Sonstige betr. Aufwendungen
      if (r.tax_category === "bewirtung") konto = "4650";
      else if (r.tax_category === "fahrtkosten" || r.receipt_type === "fuel") konto = "4530";
      else if (r.tax_category === "buero") konto = "4980";
      else if (r.tax_category === "reisekosten") konto = "4670";

      // BU-Schlüssel (Steuerschlüssel) — SKR03 Standard
      let buKey = "";
      if (r.vat_rate === 19) buKey = "9";  // VSt 19 %
      else if (r.vat_rate === 7) buKey = "8"; // VSt 7 %

      const textParts = [r.description, r.organization].filter(Boolean).join(" / ");
      const buchungstext = sanitize(textParts || "Beleg").slice(0, 60);
      const belegfeld1 = sanitize(r.id.slice(0, 12)).toUpperCase();

      row[0]  = formatAmount(amt);             // Umsatz
      row[1]  = q(amt >= 0 ? "S" : "H");       // Soll/Haben
      row[2]  = q("EUR");                      // WKZ
      row[6]  = konto;                         // Konto (Aufwand)
      row[7]  = gegenkonto;                    // Gegenkonto (Bank/Kasse)
      row[8]  = buKey;                         // BU-Schlüssel
      row[9]  = toTTMM(r.date);                // Belegdatum TTMM
      row[10] = q(belegfeld1);                 // Belegfeld 1 (Belegnr.)
      row[13] = q(buchungstext);               // Buchungstext
      // 114 Festschreibung pro Zeile bleibt leer – Vorlaufzeile gilt für Stapel

      return row.join(";");
    });

    // CRLF line endings, Windows-1252 encoding
    const fileContent = [header, columnHeader, ...dataLines].join("\r\n") + "\r\n";
    const bytes = encodeWin1252(fileContent);

    // DATEV erwartet KEIN BOM (ANSI ist byte-stream)
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "text/csv;charset=windows-1252" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Empfohlener DATEV-Dateiname: EXTF_<freier Text>.csv
    a.download = `EXTF_Buchungsstapel_${toYYYYMMDD(fromDate)}_${toYYYYMMDD(toDate)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // GoBD-Festschreibung: Belege im Stapel als DATEV-exportiert markieren
    const ids = filteredReceipts.map((r) => r.id);
    if (ids.length > 0) {
      const { error: lockErr } = await supabase
        .from("receipts")
        .update({ datev_exported_at: new Date().toISOString(), accounting_status: "verbucht" })
        .in("id", ids)
        .is("datev_exported_at", null);
      if (lockErr) {
        console.warn("[DATEV] Festschreibung fehlgeschlagen:", lockErr.message);
        toast({
          title: tt({ de: "DATEV EXTF erstellt – Festschreibung fehlgeschlagen", en: "DATEV EXTF generated – lock failed" }),
          description: lockErr.message,
          variant: "destructive",
        });
        return;
      }
    }
    toast({ title: tt({ de: "DATEV EXTF erstellt & festgeschrieben", en: "DATEV EXTF generated & locked" }) });
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
    </div>
  );
};

export default ExpenseReport;
