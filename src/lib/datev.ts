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

export interface DatevReceipt {
  id: string;
  date: string;             // YYYY-MM-DD
  amount: number | null;    // brutto in EUR (oder Originalwährung)
  amount_eur?: number | null;
  currency?: string;
  vat_rate?: number | null; // 0, 7, 19
  description?: string | null;
  tax_category?: string | null;
  belegnummer?: string;     // optional override für Belegfeld 1
  laufende_nr?: number;     // wird vom Generator gesetzt
}

export interface DatevExportOptions {
  receipts: DatevReceipt[];
  mandant: DatevMandantSettings;
  datumVon: string;         // YYYY-MM-DD
  datumBis: string;         // YYYY-MM-DD
  exportiertVon: string;    // Email des Exportierenden
  herkunft?: string;        // 2-Zeichen-Kürzel, default "BM"
}

export interface DatevExportResult {
  csv: string;              // fertige CSV
  filename: string;         // empfohlener Dateiname
  count: number;            // Anzahl gebuchter Belege
  warnings: string[];       // z.B. Belege ohne Mapping
}

// ───────────────────────────────────────────────────────────────────────────
//   Konten-Mapping (SKR 03 + SKR 04)
//
//   Quelle: DATEV-Standard-Kontenrahmen, Stand 2024.
//   tax_category → { skr03, skr04 }
// ───────────────────────────────────────────────────────────────────────────

const KONTEN_MAPPING: Record<string, { skr03: string; skr04: string }> = {
  reisekosten_uebernachtung:  { skr03: "4660", skr04: "6660" }, // Übernachtungskosten AN
  reisekosten_fahrt:          { skr03: "4670", skr04: "6670" }, // Fahrtkosten AN
  reisekosten_nebenkosten:    { skr03: "4674", skr04: "6674" }, // Reisenebenkosten AN
  verpflegungsmehraufwand:    { skr03: "4664", skr04: "6664" }, // VMA Inland
  bewirtung:                  { skr03: "4650", skr04: "6640" }, // Bewirtungskosten
  tankkosten:                 { skr03: "4530", skr04: "6530" }, // Laufende Kfz-Betriebskosten
  bueromaterial:              { skr03: "4930", skr04: "6815" }, // Bürobedarf
  telekommunikation:          { skr03: "4920", skr04: "6805" }, // Telefon
  fortbildung:                { skr03: "4946", skr04: "6840" }, // Fortbildung
  versicherung:               { skr03: "4360", skr04: "6420" }, // Versicherungen
  sonstiges:                  { skr03: "4900", skr04: "6300" }, // Sonstige betriebliche Aufwendungen
};

const DEFAULT_KONTO = { skr03: "4900", skr04: "6300" }; // Fallback

/** Default-Gegenkonto je Kontenrahmen (Bank) */
export const DEFAULT_GEGENKONTO: Record<Kontenrahmen, string> = {
  SKR03: "1200", // Bank
  SKR04: "1800", // Bank
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

function buildBuchung(receipt: DatevReceipt, mandant: DatevMandantSettings, lfdNr: number): { row: string; warnings: string[] } {
  const warnings: string[] = [];
  const amt = receipt.amount_eur ?? receipt.amount ?? 0;
  if (amt <= 0) warnings.push(`Beleg ${receipt.id.slice(0, 8)}: Betrag ist 0 oder negativ`);

  const konto = kontoForTaxCategory(receipt.tax_category, mandant.kontenrahmen);
  if (!receipt.tax_category) warnings.push(`Beleg ${receipt.id.slice(0, 8)}: keine Kategorie → Fallback-Konto ${konto}`);

  const buKey = buSchluesselForVatRate(receipt.vat_rate);

  // Belegfeld 1: laufende Nummer (mind. 4-stellig), max 12 Zeichen alphanumerisch
  const belegnummer = (receipt.belegnummer || String(lfdNr).padStart(4, "0")).slice(0, 12);

  const isForex = receipt.currency && receipt.currency !== "EUR";
  const wkz = isForex ? receipt.currency || "" : ""; // bei EUR leer lassen
  const basisUmsatz = isForex && receipt.amount ? formatBetrag(receipt.amount) : "";
  const wkzBasis = isForex ? receipt.currency || "" : "";

  // Buchungstext: max 60 Zeichen
  const bText = (receipt.description || "").slice(0, 60);

  const fields = [
    formatBetrag(amt),                              // 1  Umsatz
    quote("S"),                                     // 2  Soll/Haben (Aufwand → Soll)
    quote("EUR"),                                   // 3  WKZ Umsatz
    "",                                             // 4  Kurs (nur Fremdwährung)
    basisUmsatz,                                    // 5  Basis-Umsatz
    quote(wkzBasis),                                // 6  WKZ Basis-Umsatz
    unquoted(konto),                                // 7  Konto (Aufwand)
    unquoted(mandant.konto_gegenkonto),             // 8  Gegenkonto (Bank/Kasse/Privat)
    quote(buKey),                                   // 9  BU-Schlüssel
    unquoted(formatBelegdatum(receipt.date)),       // 10 Belegdatum TTMM
    quote(belegnummer),                             // 11 Belegfeld 1 (laufende Nr / Belegnr)
    "",                                             // 12 Belegfeld 2
    "",                                             // 13 Skonto
    quote(bText),                                   // 14 Buchungstext
    "",                                             // 15 Postensperre
    "",                                             // 16 Diverse Adressnummer
    "",                                             // 17 Geschäftspartnerbank
    "",                                             // 18 Sachverhalt
    "",                                             // 19 Zinssperre
  ];

  return { row: fields.join(";"), warnings };
}

// ───────────────────────────────────────────────────────────────────────────
//   Public API: buildDatevStapel
// ───────────────────────────────────────────────────────────────────────────

export function buildDatevStapel(opts: DatevExportOptions): DatevExportResult {
  const allWarnings: string[] = [];

  // Validierung Mandanten-Stammdaten
  if (!opts.mandant.berater_nr || !/^\d{4,7}$/.test(opts.mandant.berater_nr)) {
    allWarnings.push("Berater-Nr fehlt oder ungültig (muss 4–7 Ziffern haben)");
  }
  if (!opts.mandant.mandanten_nr || !/^\d{1,5}$/.test(opts.mandant.mandanten_nr)) {
    allWarnings.push("Mandanten-Nr fehlt oder ungültig (muss 1–5 Ziffern haben)");
  }
  if (!opts.mandant.wj_beginn || !/^\d{4}-\d{2}-\d{2}$/.test(opts.mandant.wj_beginn)) {
    allWarnings.push("WJ-Beginn fehlt oder ungültiges Format (erwartet: YYYY-MM-DD)");
  }

  const vorlauf = buildVorlauf(opts);
  const header = buildSpaltenHeader();

  const buchungen: string[] = [];
  opts.receipts.forEach((r, i) => {
    const { row, warnings } = buildBuchung(r, opts.mandant, i + 1);
    buchungen.push(row);
    allWarnings.push(...warnings);
  });

  // Zeilenende: CRLF (DATEV-Standard auf Windows-Zielen)
  const csv = [vorlauf, header, ...buchungen].join("\r\n") + "\r\n";

  const filename = `DATEV_${opts.mandant.berater_nr}_${opts.mandant.mandanten_nr}_${formatDateYYYYMMDD(opts.datumVon)}_${formatDateYYYYMMDD(opts.datumBis)}.csv`;

  return {
    csv,
    filename,
    count: opts.receipts.length,
    warnings: allWarnings,
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
  // Wir mappen die wichtigsten:
  const extras: Record<string, number> = {
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
    "ˆ": 0x88, "‰": 0x89, "Š": 0x8A, "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E,
    "'": 0x91, "'": 0x92, """: 0x93, """: 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C, "ž": 0x9E, "Ÿ": 0x9F,
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
