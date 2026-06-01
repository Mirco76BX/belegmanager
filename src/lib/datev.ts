/**
 * DATEV-Export Library
 *
 * Generates a DATEV-compliant Buchungsstapel CSV (Format 7) from receipts.
 *
 * Format reference:
 *  - Header (Vorlauf): 31 fields, "EXTF";700;21;"Buchungsstapel";7;...
 *  - Data rows: 19+ semicolon-separated fields, German number format (1.234,56)
 *  - Encoding: Windows-1252 (we offer that and UTF-8 with BOM as fallback)
 *
 * Konten-Mapping based on standard SKR 03 / SKR 04 charts of accounts.
 */
import type { TaxCategory } from "./taxCategories";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// ───────────────────────────────────────────────────────────────────────────
//   Types
// ───────────────────────────────────────────────────────────────────────────

export type Kontenrahmen = "SKR03" | "SKR04";

export interface DatevMandantSettings {
  berater_nr: string;        // 4–7 Stellen
  mandanten_nr: string;      // 1–5 Stellen
  wj_beginn: string;         // YYYY-MM-DD
  sachkontenlaenge: 4 | 5 | 6 | 7 | 8;
  kontenrahmen: Kontenrahmen;
  konto_gegenkonto: string;  // Bezahlweg — default Bank (1200 SKR03 / 1800 SKR04)
  bezeichnung?: string;      // freier Stapel-Name
  diktatkuerzel?: string;    // optional, max 2 Zeichen
}

/**
 * Einzelne MwSt-Position eines Belegs (z.B. bei Restaurant-Rechnungen mit
 * gemischten Sätzen 7% Speisen + 19% Getränke). Wenn vorhanden, wird
 * jede Position als eigene Buchung exportiert.
 */
export interface DatevVatItem {
  vat_rate: number;        // 7, 19, 0
  vat_amount: number;      // MwSt-Betrag in EUR
  net_amount?: number;     // Netto-Betrag in EUR (optional, wird sonst berechnet)
  label?: string;          // z.B. "Speisen", "Getränke"
}

export interface DatevReceipt {
  id: string;
  date: string;             // YYYY-MM-DD
  amount: number | null;    // brutto in EUR (oder Originalwährung)
  amount_eur?: number | null;
  currency?: string;
  vat_rate?: number | null; // 0, 7, 19 — wird nur genutzt wenn vat_items leer ist
  description?: string | null;
  tax_category?: string | null;
  belegnummer?: string;     // optional override für Belegfeld 1
  laufende_nr?: number;     // wird vom Generator gesetzt
  vat_items?: DatevVatItem[]; // Multi-MwSt-Positionen (optional)
}

export interface DatevExportOptions {
  receipts: DatevReceipt[];
  mandant: DatevMandantSettings;
  datumVon: string;         // YYYY-MM-DD
  datumBis: string;         // YYYY-MM-DD
  exportiertVon: string;    // Email des Exportierenden
  herkunft?: string;        // 2-Zeichen-Kürzel, default "BM"
  /**
   * GoBD-Modus:
   *  - "test":      Generiert eine CSV, aber Belege werden NICHT festgeschrieben.
   *                 Dateiname enthält "TEST_". Wird NICHT in datev_export_batches geloggt.
   *  - "produktiv": Vollwertiger Export — Belege bekommen accounting_status="exported",
   *                 Batch wird geloggt, kein nachträgliches Editieren möglich.
   * Default: "produktiv" (sicherste Variante)
   */
  mode?: "test" | "produktiv";
}

export interface DatevExportResult {
  csv: string;              // fertige CSV
  filename: string;         // empfohlener Dateiname
  count: number;            // Anzahl gebuchter Buchungszeilen (kann > Belege bei Multi-MwSt)
  receiptIds: string[];     // Belege im Export (für Festschreibung)
  warnings: string[];       // soft hints
  errors: string[];         // hard errors — wenn nicht leer, sollte CSV NICHT verwendet werden
  mode: "test" | "produktiv";
}

// ───────────────────────────────────────────────────────────────────────────
//   Konten-Mapping (SKR 03 + SKR 04)
//
//   Quelle: DATEV-Standard-Kontenrahmen, Stand 2024.
//   tax_category → { skr03, skr04 }
// ───────────────────────────────────────────────────────────────────────────

const KONTEN_MAPPING: Record<string, { skr03: string; skr04: string }> = {
  // — Reisekosten —
  reisekosten_uebernachtung:  { skr03: "4660", skr04: "6660" }, // Reisekosten AN — Übernachtung
  reisekosten_fahrt:          { skr03: "4670", skr04: "6670" }, // Reisekosten AN — Fahrtkosten
  reisekosten_nebenkosten:    { skr03: "4674", skr04: "6674" }, // Reisenebenkosten (Maut, Parkplatz)
  verpflegungsmehraufwand:    { skr03: "4664", skr04: "6664" }, // VMA Inland (Pauschalen)
  // — Bewirtung —
  bewirtung:                  { skr03: "4650", skr04: "6640" }, // Bewirtungskosten § 4 Abs. 5 Nr. 2 EStG
  // — Geschenke an Geschäftspartner § 4 Abs. 5 Nr. 1 EStG —
  // Freigrenze 50 € netto/Empfänger/Jahr seit 01.01.2024 (Wachstumschancengesetz)
  streuwerbeartikel:          { skr03: "4633", skr04: "6613" }, // ≤ 10 €, immer abziehbar (kein 50€-Limit)
  geschenke_abziehbar:        { skr03: "4630", skr04: "6610" }, // > 10 € und ≤ 50 €, abziehbar
  geschenke_pauschal:         { skr03: "4636", skr04: "6616" }, // mit § 37b Pauschalsteuer 30%
  geschenke_nicht_abziehbar:  { skr03: "4635", skr04: "6611" }, // > 50 €, nicht abziehbar (kein VSt-Abzug!)
  // — Legacy —
  geschenke:                  { skr03: "4630", skr04: "6610" }, // Fallback alte Belege
  // — KFZ —
  tankkosten:                 { skr03: "4530", skr04: "6530" }, // Laufende Kfz-Betriebskosten
  // — Büro & Kommunikation —
  bueromaterial:              { skr03: "4930", skr04: "6815" }, // Bürobedarf
  telekommunikation:          { skr03: "4920", skr04: "6805" }, // Telefon / Internet
  porto_versand:              { skr03: "4910", skr04: "6800" }, // Porto / Postversand
  software_saas:              { skr03: "4806", skr04: "6817" }, // EDV-Software-/SaaS-Aufwand
  // — Personal-/Weiterbildung —
  fortbildung:                { skr03: "4946", skr04: "6840" }, // Fortbildungskosten
  // — Beratung & Recht —
  beratung_recht:             { skr03: "4955", skr04: "6825" }, // Rechts- und Beratungskosten
  // — Werbung & Marketing —
  werbung_marketing:          { skr03: "4600", skr04: "6300" }, // Werbekosten (Ads, SEO, Agenturen)
  // — Raum & Energie —
  miete_raum:                 { skr03: "4210", skr04: "6310" }, // Miete für Geschäftsräume
  energie:                    { skr03: "4240", skr04: "6325" }, // Gas, Strom, Wasser
  // — Reparatur & GwG —
  reparatur_wartung:          { skr03: "4805", skr04: "6470" }, // Reparaturen & Instandhaltung
  gwg:                        { skr03: "4855", skr04: "6260" }, // Sofortabschreibung GwG ≤ 800 €
  // — Versicherung & Finanzen —
  versicherung:               { skr03: "4360", skr04: "6420" }, // Betriebliche Versicherungen
  bankgebuehren:              { skr03: "4970", skr04: "6855" }, // Nebenkosten des Geldverkehrs (SKR04: 6855!)
  // — Fallback —
  sonstiges:                  { skr03: "4900", skr04: "6850" }, // Übrige betriebliche Aufwendungen
};

const DEFAULT_KONTO = { skr03: "4900", skr04: "6850" }; // Fallback: Übrige betriebliche Aufwendungen

/**
 * Default-Gegenkonto je Kontenrahmen.
 *
 * WICHTIG: Verbindlichkeits-/Verrechnungskonto, NICHT Bank!
 *   Bank als Gegenkonto würde beim Steuerberater eine doppelte Bank-Buchung
 *   erzeugen, weil er den Kontoauszug separat importiert.
 *   Standard-Workflow in DATEV:
 *     1) Beleg-Aufwand SOLL  gegen  Verbindlichkeit aus L+L HABEN
 *     2) Verbindlichkeit aus L+L SOLL  gegen  Bank HABEN  (kommt aus Kontoauszug)
 *   Damit gleicht sich die Verbindlichkeit zu null aus, die Bank wird nicht doppelt gebucht.
 *
 *   SKR 03: 1600 = Verbindlichkeiten aus L+L
 *   SKR 04: 3300 = Verbindlichkeiten aus L+L
 *
 *   Der User kann das pro Company in den Stammdaten überschreiben.
 */
export const DEFAULT_GEGENKONTO: Record<Kontenrahmen, string> = {
  SKR03: "1600", // Verbindlichkeiten aus L+L
  SKR04: "3300", // Verbindlichkeiten aus L+L
};

/**
 * Liefert für eine tax_category das passende Sachkonto im gewählten Kontenrahmen.
 */
export function kontoForTaxCategory(taxCategory: string | null | undefined, rahmen: Kontenrahmen): string {
  if (!taxCategory) return rahmen === "SKR03" ? DEFAULT_KONTO.skr03 : DEFAULT_KONTO.skr04;
  const map = KONTEN_MAPPING[taxCategory];
  if (!map) return rahmen === "SKR03" ? DEFAULT_KONTO.skr03 : DEFAULT_KONTO.skr04;
  return rahmen === "SKR03" ? map.skr03 : map.skr04;
}

// ───────────────────────────────────────────────────────────────────────────
//   BU-Schlüssel-Mapping (Umsatzsteuer)
//
//   DATEV neue Schlüssel (Standard seit ~2018):
//     8 = 7% VSt (Vorsteuer)
//     9 = 19% VSt
//     0 / leer = USt-frei oder nicht relevant
//
//   Bei Konten mit Steuerautomatik kann der BU-Schlüssel leer bleiben,
//   weil DATEV die Steuer aus dem Konto selbst zieht. Wir geben ihn
//   trotzdem an für maximale Eindeutigkeit.
// ───────────────────────────────────────────────────────────────────────────

export function buSchluesselForVatRate(vatRate: number | null | undefined): string {
  if (vatRate === 19) return "9";
  if (vatRate === 7) return "8";
  return ""; // 0% oder unklar → leer lassen
}

/**
 * Standard-USt-Satz pro Tax-Category (Fallback, wenn vat_rate fehlt).
 * Diese Werte spiegeln die gängigen deutschen USt-Sätze für die jeweiligen
 * Belegtypen wider und werden im Konfigurations-Modul taxCategories.ts
 * synchron gepflegt.
 */
const DEFAULT_VAT_RATE_BY_CATEGORY: Record<string, number> = {
  reisekosten_uebernachtung: 7,
  reisekosten_fahrt: 7,
  reisekosten_nebenkosten: 19,
  verpflegungsmehraufwand: 0,
  bewirtung: 19,
  tankkosten: 19,
  bueromaterial: 19,
  telekommunikation: 19,
  fortbildung: 19,
  versicherung: 0,        // Versicherungen sind meist USt-frei
  geschenke: 19,
  sonstiges: 19,
};

/**
 * Gibt den effektiven USt-Satz zurück: erst vat_rate, dann Tax-Category-Default.
 * Wenn beide fehlen, undefined.
 */
export function effectiveVatRate(
  vatRate: number | null | undefined,
  taxCategory: string | null | undefined,
): number | undefined {
  if (vatRate != null && !isNaN(vatRate)) return vatRate;
  if (taxCategory && DEFAULT_VAT_RATE_BY_CATEGORY[taxCategory] != null) {
    return DEFAULT_VAT_RATE_BY_CATEGORY[taxCategory];
  }
  return undefined;
}

// ───────────────────────────────────────────────────────────────────────────
//   Format-Helpers
// ───────────────────────────────────────────────────────────────────────────

/** Beträge im deutschen Format: 1234,56 (kein Tausenderpunkt im Stapel) */
function formatBetrag(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** Datum YYYY-MM-DD → DATEV-Belegdatum TTMM (4-stellig im Stapel) */
function formatBelegdatum(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length < 10) return "";
  const [, mm, dd] = yyyymmdd.split("-");
  return `${dd}${mm}`;
}

/** Datum YYYY-MM-DD → DATEV-Header-Datum YYYYMMDD (8-stellig) */
function formatDateYYYYMMDD(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length < 10) return "";
  return yyyymmdd.replace(/-/g, "");
}

/** Aktueller Timestamp YYYYMMDDHHMMSSXXX (17 Stellen, XXX = Millisekunden) */
function timestampNow(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${pad(d.getMilliseconds(), 3)}`;
}

/**
 * Escaped einen Feld-Wert für CSV (mit Anführungszeichen umschließen).
 * DATEV-Spec: Text-Felder in "...", interne " werden zu "".
 * Nummerische Felder bleiben unquoted.
 */
function quote(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function unquoted(n: number | string): string {
  return String(n);
}

/**
 * Ersetzt Unicode-Zeichen, die in Win-1252 fehlen, durch passende Pendants.
 * Wichtig vor allem für Buchungstexte (Pfeile, geschütztes Leerzeichen, …).
 *
 * Anwendung NUR auf user-generierte Text-Felder (Buchungstext, Belegfeld 1).
 * Das Vorlauf-/Spalten-Header-Layout darf NICHT angefasst werden.
 */
export function sanitizeForDatev(text: string): string {
  if (!text) return text;
  const map: Record<string, string> = {
    "→": "->",  // → RIGHTWARDS ARROW
    "←": "<-",  // ← LEFTWARDS ARROW
    "↑": "^",   // ↑ UPWARDS ARROW
    "↓": "v",   // ↓ DOWNWARDS ARROW
    "↔": "<->", // ↔ LEFT-RIGHT ARROW
    "⇒": "=>",  // ⇒ RIGHTWARDS DOUBLE ARROW
    "⇐": "<=",  // ⇐ LEFTWARDS DOUBLE ARROW
    "➡": "->",  // ➡ BLACK RIGHTWARDS ARROW
    "✓": "OK",  // ✓ CHECK MARK
    "✔": "OK",  // ✔ HEAVY CHECK MARK
    "✗": "X",   // ✗ BALLOT X
    "✘": "X",   // ✘ HEAVY BALLOT X
    " ": " ",   //   NO-BREAK SPACE → reguläres Space (DATEV mag's plain)
    "​": "",    // Zero-width space → entfernen
    "‎": "",    // LRM → entfernen
    "‏": "",    // RLM → entfernen
  };
  let out = "";
  for (const ch of text) {
    out += Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
//   Vorlauf-Zeile (Header) — exakt 31 Felder gemäß DATEV-Spec Format 7
// ───────────────────────────────────────────────────────────────────────────

function buildVorlauf(opts: DatevExportOptions): string {
  const m = opts.mandant;
  const fields = [
    quote("EXTF"),                                  // 1  Datei-Format
    unquoted(700),                                  // 2  Version DATEV-Format
    unquoted(21),                                   // 3  Datenkategorie: 21 = Buchungsstapel
    quote("Buchungsstapel"),                        // 4  Formatname
    unquoted(7),                                    // 5  Formatversion
    unquoted(timestampNow()),                       // 6  Erzeugt am
    "",                                             // 7  Importiert (immer leer)
    quote((opts.herkunft || "BM").slice(0, 2)),     // 8  Herkunft (max 2 Zeichen)
    quote(opts.exportiertVon.slice(0, 25)),         // 9  Exportiert von
    "",                                             // 10 Importiert von (leer)
    unquoted(m.berater_nr),                         // 11 Berater-Nr
    unquoted(m.mandanten_nr),                       // 12 Mandanten-Nr
    unquoted(formatDateYYYYMMDD(m.wj_beginn)),      // 13 WJ-Beginn YYYYMMDD
    unquoted(m.sachkontenlaenge),                   // 14 Sachkontenlänge
    unquoted(formatDateYYYYMMDD(opts.datumVon)),    // 15 Datum von
    unquoted(formatDateYYYYMMDD(opts.datumBis)),    // 16 Datum bis
    quote((m.bezeichnung || `Belege ${opts.datumVon} – ${opts.datumBis}`).slice(0, 30)), // 17
    quote((m.diktatkuerzel || "").slice(0, 2)),     // 18 Diktatkürzel
    unquoted(1),                                    // 19 Buchungstyp: 1 = FiBu
    unquoted(0),                                    // 20 Rechnungslegungszweck (0 = Standard)
    unquoted(0),                                    // 21 Festschreibung (0 = nicht festgeschrieben)
    quote("EUR"),                                   // 22 WKZ Mandant
    "",                                             // 23 Derivatskennzeichen
    "",                                             // 24 Sachkontenrahmen
    "",                                             // 25 ID der Branchenlösung
    "",                                             // 26 Reserviert
    "",                                             // 27 Reserviert
    "",                                             // 28 Anwendungsinformation
    "",                                             // 29 Reserviert
    "",                                             // 30 Reserviert
    "",                                             // 31 Reserviert
  ];
  return fields.join(";");
}

// ───────────────────────────────────────────────────────────────────────────
//   Spalten-Header-Zeile — die 19 sichtbaren Spaltennamen
// ───────────────────────────────────────────────────────────────────────────

const SPALTEN = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
];

function buildSpaltenHeader(): string {
  return SPALTEN.map(quote).join(";");
}

// ───────────────────────────────────────────────────────────────────────────
//   Buchungs-Zeile
// ───────────────────────────────────────────────────────────────────────────

/**
 * Erzeugt 1..N Buchungszeilen pro Beleg:
 *  - Wenn vat_items.length > 1: pro MwSt-Position eine eigene Buchung (DATEV-Standard)
 *  - Sonst: eine Buchungszeile mit Gesamtbetrag + effektivem BU-Schlüssel
 *
 * Außerdem:
 *  - Fremdwährungs-Kurs wird berechnet, wenn currency != EUR und amount/amount_eur da
 *  - VSt-Fallback aus Tax-Category-Default, wenn vat_rate fehlt
 */
function buildBuchungen(receipt: DatevReceipt, mandant: DatevMandantSettings, lfdNr: number): { rows: string[]; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const totalEur = receipt.amount_eur ?? receipt.amount ?? 0;
  if (totalEur <= 0) errors.push(`Beleg ${receipt.id.slice(0, 8)}: Betrag ist 0 oder negativ (${totalEur.toFixed(2)} €) — Beleg vor Export prüfen.`);

  const konto = kontoForTaxCategory(receipt.tax_category, mandant.kontenrahmen);
  if (!receipt.tax_category) warnings.push(`Beleg ${receipt.id.slice(0, 8)}: keine Kategorie → Fallback-Konto ${konto}`);

  const belegnummer = (receipt.belegnummer || String(lfdNr).padStart(4, "0")).slice(0, 12);

  // Bewirtung-Buchungstext-Hinweis (§ 4 Abs. 5 Nr. 2 EStG):
  // 70% abziehbar / 100% Vorsteuer. App bucht voll auf 6640/4650; der
  // Steuerberater nimmt den 70/30-Split in DATEV bei der Bilanzierung vor.
  // Wir notieren das im Buchungstext, damit Michael es sofort sieht.
  const isBewirtung = receipt.tax_category === "bewirtung";
  const bewirtungSuffix = isBewirtung ? " [70% abz., § 4 Abs. 5 Nr. 2 EStG]" : "";
  // Buchungstext insgesamt 60 Zeichen — wir reservieren Platz für das Suffix.
  const maxDescLen = Math.max(0, 60 - bewirtungSuffix.length);
  const rawDesc = (receipt.description || "").slice(0, maxDescLen);
  const bText = sanitizeForDatev(rawDesc + bewirtungSuffix);

  // Pflichtfeld-Check Bewirtung > 250 € — § 14 UStG verlangt bei Restaurants
  // > 250 € EXPLIZITE Nennung des Bewirtenden (Name + Anschrift).
  // Wir prüfen das hier nicht hart (die Daten haben wir gar nicht alle), aber
  // werfen eine Warnung, damit der User weiß, was Michael verlangt.
  const totalForCheck = receipt.amount_eur ?? receipt.amount ?? 0;
  if (isBewirtung && totalForCheck > 250) {
    warnings.push(
      `Beleg ${receipt.id.slice(0, 8)} (Bewirtung ${totalForCheck.toFixed(2)} €): ` +
      `Über 250 € — Rechnung muss vollständige § 14 UStG-Angaben enthalten ` +
      `(Name + Anschrift des Bewirtenden auf dem Beleg). Bitte vor Festschreibung prüfen.`,
    );
  }

  // Fremdwährung: Kurs ausrechnen wenn möglich
  const isForex = !!receipt.currency && receipt.currency !== "EUR";
  let wkzBasis = "";
  let kursStr = "";
  let basisUmsatzStr = "";
  if (isForex && receipt.amount && receipt.amount_eur && receipt.amount_eur > 0) {
    wkzBasis = receipt.currency!;
    basisUmsatzStr = formatBetrag(receipt.amount);
    // DATEV-Kurs = Basis-Umsatz (Fremdwährung) / Umsatz (EUR), 6 Nachkommastellen
    const kurs = receipt.amount / receipt.amount_eur;
    kursStr = kurs.toFixed(6).replace(".", ",");
  } else if (isForex && receipt.amount) {
    // Fremdwährung ohne EUR-Wert → wenigstens Basis-Umsatz schreiben
    wkzBasis = receipt.currency!;
    basisUmsatzStr = formatBetrag(receipt.amount);
    warnings.push(`Beleg ${receipt.id.slice(0, 8)}: Fremdwährung ${receipt.currency} ohne EUR-Umrechnung → Kurs fehlt`);
  }

  const rows: string[] = [];

  // ─── Multi-MwSt: pro vat_item eine Buchungszeile ───
  if (receipt.vat_items && receipt.vat_items.length > 1) {
    // GoBD-Schicht A: Hard-Block bei Daten-Inkonsistenz.
    // Wenn Summe der MwSt-Brutto-Positionen NICHT zur receipt.amount passt
    // (Toleranz 5 Cent für Rundungsdifferenzen), darf der Export NICHT
    // durchlaufen — sonst landen falsche Buchungen in der FiBu.
    const sumBrutto = receipt.vat_items.reduce((s, it) => s + (it.net_amount ?? 0) + it.vat_amount, 0);
    const expected = receipt.amount_eur ?? receipt.amount ?? 0;
    const diff = sumBrutto - expected;
    if (Math.abs(diff) > 0.05) {
      errors.push(
        `Beleg ${receipt.id.slice(0, 8)} "${(receipt.description || "").slice(0, 30)}": ` +
        `Summe MwSt-Positionen (${sumBrutto.toFixed(2)} €) weicht von Gesamtbetrag (${expected.toFixed(2)} €) ab. ` +
        `Differenz ${diff.toFixed(2)} €. ` +
        `Bitte Beleg-Daten manuell prüfen und MwSt-Positionen korrigieren, bevor du exportierst.`,
      );
      // Trotzdem keine Buchungs-Zeilen für diesen Beleg generieren
      return { rows: [], warnings, errors };
    }

    receipt.vat_items.forEach((item, idx) => {
      const itemBrutto = (item.net_amount ?? 0) + item.vat_amount;
      const itemBuKey = buSchluesselForVatRate(item.vat_rate);
      if (!itemBuKey && item.vat_rate !== 0) {
        warnings.push(`Beleg ${receipt.id.slice(0, 8)} Position ${idx + 1}: USt-Satz ${item.vat_rate}% nicht in BU-Schlüssel-Mapping`);
      }
      // Label-Suffix: hat Vorrang vor langer Beschreibung. Wir reservieren
      // Platz für das Suffix und kürzen die Beschreibung entsprechend, damit
      // das Label NICHT abgeschnitten wird (sonst sehen Steuerberater "(A").
      const rawLabel = item.label || `Pos ${idx + 1}`;
      const itemLabelFull = ` (${rawLabel})`;
      const maxBeschr = Math.max(0, 60 - itemLabelFull.length);
      const truncBeschr = bText.length > maxBeschr ? bText.slice(0, Math.max(0, maxBeschr - 1)) + "…" : bText;
      const itemText = sanitizeForDatev(truncBeschr + itemLabelFull);
      rows.push(buildBuchungRow({
        amtEur: itemBrutto,
        konto,
        gegenkonto: mandant.konto_gegenkonto,
        buKey: itemBuKey,
        belegdatum: formatBelegdatum(receipt.date),
        belegnummer,
        buchungstext: itemText,
        kursStr,
        basisUmsatzStr: "", // bei Multi-MwSt nur einmal pro Beleg, hier weglassen
        wkzBasis: "",
      }));
    });
  } else {
    // ─── Single-Line-Buchung (keine oder eine MwSt-Position) ───
    // Fallback-Logik: erst vat_items[0], dann receipt.vat_rate, dann Category-Default
    const singleItem = receipt.vat_items?.[0];
    const effVat = singleItem
      ? singleItem.vat_rate
      : effectiveVatRate(receipt.vat_rate, receipt.tax_category);
    const buKey = buSchluesselForVatRate(effVat);
    if (!buKey && effVat !== 0 && effVat !== undefined) {
      warnings.push(`Beleg ${receipt.id.slice(0, 8)}: USt-Satz ${effVat}% nicht in BU-Schlüssel-Mapping`);
    }
    if (buKey === "" && receipt.vat_rate == null && receipt.tax_category) {
      warnings.push(`Beleg ${receipt.id.slice(0, 8)}: vat_rate fehlt, Fallback aus Tax-Category genutzt`);
    }
    rows.push(buildBuchungRow({
      amtEur: totalEur,
      konto,
      gegenkonto: mandant.konto_gegenkonto,
      buKey,
      belegdatum: formatBelegdatum(receipt.date),
      belegnummer,
      buchungstext: bText,
      kursStr,
      basisUmsatzStr,
      wkzBasis,
    }));
  }

  return { rows, warnings, errors };
}

/** Niedrigerer Helper: baut eine einzelne CSV-Zeile aus normalisierten Feldern. */
function buildBuchungRow(p: {
  amtEur: number;
  konto: string;
  gegenkonto: string;
  buKey: string;
  belegdatum: string;
  belegnummer: string;
  buchungstext: string;
  kursStr: string;
  basisUmsatzStr: string;
  wkzBasis: string;
}): string {
  const fields = [
    formatBetrag(p.amtEur),                         // 1  Umsatz (EUR brutto)
    quote("S"),                                     // 2  Soll/Haben (Aufwand → Soll)
    quote("EUR"),                                   // 3  WKZ Umsatz
    p.kursStr,                                      // 4  Kurs (Fremdwährung)
    p.basisUmsatzStr,                               // 5  Basis-Umsatz (Fremdwährung)
    quote(p.wkzBasis),                              // 6  WKZ Basis-Umsatz
    unquoted(p.konto),                              // 7  Konto (Aufwand)
    unquoted(p.gegenkonto),                         // 8  Gegenkonto (Bank/Kasse/Privat)
    quote(p.buKey),                                 // 9  BU-Schlüssel
    unquoted(p.belegdatum),                         // 10 Belegdatum TTMM
    quote(p.belegnummer),                           // 11 Belegfeld 1
    "",                                             // 12 Belegfeld 2
    "",                                             // 13 Skonto
    quote(p.buchungstext),                          // 14 Buchungstext
    "",                                             // 15 Postensperre
    "",                                             // 16 Diverse Adressnummer
    "",                                             // 17 Geschäftspartnerbank
    "",                                             // 18 Sachverhalt
    "",                                             // 19 Zinssperre
  ];
  return fields.join(";");
}

// ───────────────────────────────────────────────────────────────────────────
//   Public API: buildDatevStapel
// ───────────────────────────────────────────────────────────────────────────

export function buildDatevStapel(opts: DatevExportOptions): DatevExportResult {
  const allWarnings: string[] = [];
  const allErrors: string[] = [];
  const mode: "test" | "produktiv" = opts.mode ?? "produktiv";

  // Validierung Mandanten-Stammdaten (Hard-Errors)
  if (!opts.mandant.berater_nr || !/^\d{4,7}$/.test(opts.mandant.berater_nr)) {
    allErrors.push("Berater-Nr fehlt oder ungültig (muss 4–7 Ziffern haben)");
  }
  if (!opts.mandant.mandanten_nr || !/^\d{1,5}$/.test(opts.mandant.mandanten_nr)) {
    allErrors.push("Mandanten-Nr fehlt oder ungültig (muss 1–5 Ziffern haben)");
  }
  if (!opts.mandant.wj_beginn || !/^\d{4}-\d{2}-\d{2}$/.test(opts.mandant.wj_beginn)) {
    allErrors.push("WJ-Beginn fehlt oder ungültiges Format (erwartet: YYYY-MM-DD)");
  }

  const vorlauf = buildVorlauf(opts);
  const header = buildSpaltenHeader();

  const buchungen: string[] = [];
  const receiptIds: string[] = [];
  let lfdNr = 1;
  opts.receipts.forEach((r) => {
    const { rows, warnings, errors } = buildBuchungen(r, opts.mandant, lfdNr);
    buchungen.push(...rows);
    allWarnings.push(...warnings);
    allErrors.push(...errors);
    if (rows.length > 0) receiptIds.push(r.id);
    lfdNr++; // pro Beleg eine Belegnummer, auch wenn der Beleg mehrere Buchungs-Zeilen produziert
  });

  // Zeilenende: CRLF (DATEV-Standard auf Windows-Zielen)
  const csv = [vorlauf, header, ...buchungen].join("\r\n") + "\r\n";

  // Test-Mode hat klar erkennbares Filename-Prefix, damit Steuerberater nicht
  // versehentlich Test-Stapel importieren
  const prefix = mode === "test" ? "DATEV_TEST" : "DATEV";
  const filename = `${prefix}_${opts.mandant.berater_nr}_${opts.mandant.mandanten_nr}_${formatDateYYYYMMDD(opts.datumVon)}_${formatDateYYYYMMDD(opts.datumBis)}.csv`;

  return {
    csv,
    filename,
    count: buchungen.length,    // Anzahl Buchungs-Zeilen (kann > receipts.length sein bei Multi-MwSt)
    receiptIds,
    warnings: allWarnings,
    errors: allErrors,
    mode,
  };
}

// ───────────────────────────────────────────────────────────────────────────
//   Download-Helper — plattform-aware
//
//   Web:    Blob + a-Element-Click (Browser-Download)
//   Native: Filesystem.writeFile + Share.share (iOS Share-Sheet / Android Intent)
//
//   Bietet zwei Encodings:
//   - "windows-1252" (DATEV-Standard, empfohlen)
//   - "utf-8-bom" (Fallback für Tools, die UTF-8 lesen)
// ───────────────────────────────────────────────────────────────────────────

export async function downloadDatevCsv(
  result: DatevExportResult,
  encoding: "windows-1252" | "utf-8-bom" = "windows-1252",
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    return downloadDatevCsvNative(result, encoding);
  }
  return downloadDatevCsvWeb(result, encoding);
}

/** Browser-Pfad: klassischer Datei-Download via Blob + a-Tag */
function downloadDatevCsvWeb(result: DatevExportResult, encoding: "windows-1252" | "utf-8-bom"): void {
  let blob: Blob;
  if (encoding === "windows-1252") {
    const bytes = encodeWin1252(result.csv);
    blob = new Blob([bytes as BlobPart], { type: "text/csv;charset=windows-1252" });
  } else {
    blob = new Blob(["﻿" + result.csv], { type: "text/csv;charset=utf-8;" });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Native-Pfad (iOS/Android): Datei in den Cache-Ordner schreiben, dann via
 * Share-API teilen. Der User sieht das iOS-Share-Sheet (Mail/AirDrop/Dateien…)
 * bzw. den Android-Intent-Picker.
 */
async function downloadDatevCsvNative(result: DatevExportResult, encoding: "windows-1252" | "utf-8-bom"): Promise<void> {
  // 1) Bytes nach Encoding-Wahl bauen
  let bytes: Uint8Array;
  if (encoding === "windows-1252") {
    bytes = encodeWin1252(result.csv);
  } else {
    bytes = new TextEncoder().encode("﻿" + result.csv);
  }

  // 2) Datei in den Cache schreiben — als base64 für Binär-Erhalt
  const base64 = uint8ArrayToBase64(bytes);
  const written = await Filesystem.writeFile({
    path: result.filename,
    data: base64,
    directory: Directory.Cache,
    // Kein `encoding` Property → Capacitor interpretiert `data` als base64-binär
  });

  // 3) Share-Sheet öffnen — `url` muss eine file:// URI sein
  try {
    await Share.share({
      title: "DATEV-Stapel",
      text: `DATEV-Buchungsstapel (${result.count} Buchungen)`,
      url: written.uri,
      dialogTitle: "DATEV-Datei teilen",
    });
  } catch (e: unknown) {
    // User-Cancel auf Android wirft eine Exception — ignorieren.
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|abort/i.test(msg)) return;
    throw e;
  }
}

/** Hilfs-Funktion: Uint8Array → Base64-String (für Capacitor Filesystem binär). */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Chunkwise Build, damit String.fromCharCode bei großen Files nicht crasht
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    parts.push(String.fromCharCode.apply(null, Array.from(slice)));
  }
  return btoa(parts.join(""));
}

/**
 * Manuelles Win-1252-Encoding (Subset von ISO-8859-1 + 0x80–0x9F Sonderzeichen).
 * Für deutsche Umlaute, €-Zeichen, übliche Sonderzeichen ausreichend.
 */
function encodeWin1252(text: string): Uint8Array {
  // Win-1252 erweitert ISO-8859-1 um 0x80–0x9F mit z.B. €, ƒ, „, ", …
  // ALLE Schlüssel als \uXXXX-Escapes — esbuild interpretiert sonst die
  // Smart-Quotes (U+201C/201D) als reguläre String-Delimiter und bricht ab.
  const extras: Record<string, number> = {
    "€": 0x80, // € EURO SIGN
    "‚": 0x82, // ‚ SINGLE LOW-9 QUOTATION MARK
    "ƒ": 0x83, // ƒ LATIN SMALL LETTER F WITH HOOK
    "„": 0x84, // „ DOUBLE LOW-9 QUOTATION MARK
    "…": 0x85, // … HORIZONTAL ELLIPSIS
    "†": 0x86, // † DAGGER
    "‡": 0x87, // ‡ DOUBLE DAGGER
    "ˆ": 0x88, // ˆ MODIFIER LETTER CIRCUMFLEX
    "‰": 0x89, // ‰ PER MILLE SIGN
    "Š": 0x8A, // Š LATIN CAPITAL S WITH CARON
    "‹": 0x8B, // ‹ SINGLE LEFT-POINTING ANGLE QUOTATION
    "Œ": 0x8C, // Œ LATIN CAPITAL LIGATURE OE
    "Ž": 0x8E, // Ž LATIN CAPITAL Z WITH CARON
    "\u2018": 0x91, // U+2018 LEFT SINGLE QUOTATION MARK
    "\u2019": 0x92, // U+2019 RIGHT SINGLE QUOTATION MARK
    "\u201C": 0x93, // U+201C LEFT DOUBLE QUOTATION MARK
    "\u201D": 0x94, // U+201D RIGHT DOUBLE QUOTATION MARK
    "•": 0x95, // • BULLET
    "–": 0x96, // – EN DASH
    "—": 0x97, // — EM DASH
    "˜": 0x98, // ˜ SMALL TILDE
    "™": 0x99, // ™ TRADE MARK SIGN
    "š": 0x9A, // š LATIN SMALL S WITH CARON
    "›": 0x9B, // › SINGLE RIGHT-POINTING ANGLE QUOTATION
    "œ": 0x9C, // œ LATIN SMALL LIGATURE OE
    "ž": 0x9E, // ž LATIN SMALL Z WITH CARON
    "Ÿ": 0x9F, // Ÿ LATIN CAPITAL Y WITH DIAERESIS
  };
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code <= 0xFF && !(code >= 0x80 && code <= 0x9F)) {
      out.push(code);
    } else if (extras[ch] != null) {
      out.push(extras[ch]);
    } else {
      out.push(0x3F); // "?" für nicht darstellbare Zeichen
    }
  }
  return new Uint8Array(out);
}
