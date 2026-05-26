#!/usr/bin/env node
/**
 * CLI-Validator für DATEV-CSV-Dateien.
 *
 * Usage:
 *   node scripts/validate-datev.mjs <pfad-zur-datei.csv>
 *
 * Exit-Codes:
 *   0  → CSV ist valide (ggf. mit Warnungen)
 *   1  → Format-Fehler gefunden (blockierend)
 *   2  → Tool-Fehler (Datei nicht lesbar etc.)
 *
 * Funktioniert sowohl mit Win-1252- als auch UTF-8-codierten Dateien.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

// ─── Inline-Copy der Validator-Lib (Node-Standalone, keine TS-Build-Abhängigkeit) ───
//
// Die Logik ist 1:1 mit src/lib/datev.validator.ts. Bei Lib-Updates muss diese Datei
// nachgezogen werden. Alternative: TS via tsx ausführen — dann braucht's npm install.

const SPALTEN_ERWARTET = [
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

function parseCsvLine(line) {
  const fields = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { buf += '"'; i++; }
        else inQuote = false;
      } else buf += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ";") { fields.push(buf); buf = ""; }
      else buf += ch;
    }
  }
  fields.push(buf);
  return fields;
}

function validateDatevCsv(csv) {
  const errors = [];
  const warnings = [];
  const meta = {
    formatVersion: null, beraterNr: null, mandantenNr: null, wjBeginn: null,
    sachkontenlaenge: null, datumVon: null, datumBis: null, buchungsCount: 0,
  };

  const rawLines = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") rawLines.pop();

  if (rawLines.length < 2) {
    errors.push({ zeile: 0, code: "STRUKTUR_LEER", message: "Datei hat weniger als 2 Zeilen." });
    return { valid: false, errors, warnings, meta };
  }

  const vorlauf = parseCsvLine(rawLines[0]);
  if (vorlauf[0] !== "EXTF") errors.push({ zeile: 1, feld: 1, code: "VORLAUF_BAD_MAGIC", message: `Feld 1 muss "EXTF" sein, ist "${vorlauf[0]}".` });

  const version = parseInt(vorlauf[1] || "", 10);
  if (![300, 510, 700, 800].includes(version)) errors.push({ zeile: 1, feld: 2, code: "VORLAUF_BAD_VERSION", message: `Feld 2 muss 300/510/700/800 sein.` });

  if (parseInt(vorlauf[2] || "", 10) !== 21) errors.push({ zeile: 1, feld: 3, code: "VORLAUF_BAD_KATEGORIE", message: `Feld 3 muss 21 sein.` });
  if (vorlauf[3] !== "Buchungsstapel") errors.push({ zeile: 1, feld: 4, code: "VORLAUF_BAD_FORMATNAME", message: `Feld 4 muss "Buchungsstapel" sein.` });

  const formatVersion = parseInt(vorlauf[4] || "", 10);
  meta.formatVersion = isNaN(formatVersion) ? null : formatVersion;
  if (formatVersion < 7) errors.push({ zeile: 1, feld: 5, code: "VORLAUF_BAD_FORMATVERSION", message: `Feld 5 muss ≥ 7 sein.` });

  if (!/^\d{17}$/.test(vorlauf[5] || "")) errors.push({ zeile: 1, feld: 6, code: "VORLAUF_BAD_TIMESTAMP", message: `Feld 6 muss 17 Ziffern haben.` });

  meta.beraterNr = vorlauf[10] || null;
  if (!/^\d{4,7}$/.test(vorlauf[10] || "")) errors.push({ zeile: 1, feld: 11, code: "VORLAUF_MISSING_BERATER_NR", message: `Feld 11 (Berater-Nr) muss 4–7 Ziffern haben, ist "${vorlauf[10]}".` });

  meta.mandantenNr = vorlauf[11] || null;
  if (!/^\d{1,5}$/.test(vorlauf[11] || "")) errors.push({ zeile: 1, feld: 12, code: "VORLAUF_MISSING_MANDANTEN_NR", message: `Feld 12 (Mandanten-Nr) muss 1–5 Ziffern haben, ist "${vorlauf[11]}".` });

  meta.wjBeginn = vorlauf[12] || null;
  if (!/^\d{8}$/.test(vorlauf[12] || "")) errors.push({ zeile: 1, feld: 13, code: "VORLAUF_BAD_WJ_BEGINN", message: `Feld 13 muss YYYYMMDD sein.` });

  const sk = parseInt(vorlauf[13] || "", 10);
  meta.sachkontenlaenge = isNaN(sk) ? null : sk;
  if (sk < 4 || sk > 8) errors.push({ zeile: 1, feld: 14, code: "VORLAUF_BAD_SACHKONTENLAENGE", message: `Feld 14 muss 4–8 sein.` });

  meta.datumVon = vorlauf[14] || null;
  meta.datumBis = vorlauf[15] || null;
  if (!/^\d{8}$/.test(vorlauf[14] || "")) errors.push({ zeile: 1, feld: 15, code: "VORLAUF_BAD_DATUM_VON", message: `Feld 15 muss YYYYMMDD sein.` });
  if (!/^\d{8}$/.test(vorlauf[15] || "")) errors.push({ zeile: 1, feld: 16, code: "VORLAUF_BAD_DATUM_BIS", message: `Feld 16 muss YYYYMMDD sein.` });

  const headerLine = parseCsvLine(rawLines[1]);
  SPALTEN_ERWARTET.forEach((expected, idx) => {
    if (headerLine[idx] !== expected) {
      errors.push({ zeile: 2, feld: idx + 1, code: "HEADER_BAD_COLUMN_NAME", message: `Spalte ${idx + 1}: erwartet "${expected}", ist "${headerLine[idx] || "(leer)"}".` });
    }
  });

  for (let i = 2; i < rawLines.length; i++) {
    const row = parseCsvLine(rawLines[i]);
    const zeile = i + 1;
    if (row.length < 19) { errors.push({ zeile, code: "ROW_TOO_FEW_FIELDS", message: `Zeile ${zeile} hat ${row.length}/19 Felder.` }); continue; }
    meta.buchungsCount++;
    if (!/^\d+(,\d{1,2})?$/.test(row[0] || "")) errors.push({ zeile, feld: 1, code: "ROW_BAD_UMSATZ", message: `Umsatz ungültig: "${row[0]}".` });
    if (row[1] !== "S" && row[1] !== "H") errors.push({ zeile, feld: 2, code: "ROW_BAD_SH", message: `Soll/Haben muss "S" oder "H" sein.` });
    if (!/^\d+$/.test(row[6] || "")) errors.push({ zeile, feld: 7, code: "ROW_BAD_KONTO", message: `Konto muss numerisch sein.` });
    if (!/^\d+$/.test(row[7] || "")) errors.push({ zeile, feld: 8, code: "ROW_BAD_GEGENKONTO", message: `Gegenkonto muss numerisch sein.` });
    if (row[9] && !/^\d{4}$/.test(row[9]) && !/^\d{8}$/.test(row[9])) errors.push({ zeile, feld: 10, code: "ROW_BAD_BELEGDATUM", message: `Belegdatum "${row[9]}" muss 4 oder 8 Ziffern sein.` });
    if (meta.sachkontenlaenge && row[6] && row[6].length !== meta.sachkontenlaenge) warnings.push({ zeile, feld: 7, code: "ROW_KONTO_LENGTH_MISMATCH", message: `Konto "${row[6]}" hat ${row[6].length} Stellen, erwartet ${meta.sachkontenlaenge}.` });
    if ((row[13] || "").length > 60) warnings.push({ zeile, feld: 14, code: "ROW_BUCHUNGSTEXT_LANG", message: `Buchungstext > 60 Zeichen.` });
  }

  return { valid: errors.length === 0, errors, warnings, meta };
}

// ─── CLI ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/validate-datev.mjs <pfad-zur-csv>");
  process.exit(2);
}

const path = resolve(args[0]);
if (!existsSync(path) || !statSync(path).isFile()) {
  console.error(`✗ Datei nicht gefunden: ${path}`);
  process.exit(2);
}

// Win-1252 → UTF-8 decoding (für DATEV-typische Dateien)
const buf = readFileSync(path);
let csv;
try {
  // Sniff: hat UTF-8 BOM?
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    csv = buf.subarray(3).toString("utf-8");
  } else {
    // Check ob's UTF-8 ist (heuristisch via Replacement Chars)
    const asUtf8 = buf.toString("utf-8");
    if (asUtf8.includes("�")) {
      // Fallback Win-1252 (Node nennt es "latin1" — nicht ganz exakt, aber praktisch OK)
      csv = buf.toString("latin1");
    } else {
      csv = asUtf8;
    }
  }
} catch (err) {
  console.error("✗ Decoding-Fehler:", err.message);
  process.exit(2);
}

const result = validateDatevCsv(csv);

// Bericht ausgeben
console.log("─────────────────────────────────────────────────────────────");
console.log("DATEV-CSV Validierungsbericht");
console.log("─────────────────────────────────────────────────────────────");
console.log(`Datei:            ${path}`);
console.log(`Größe:            ${buf.length} Bytes`);
console.log(`Status:           ${result.valid ? "✅ VALID" : "❌ FEHLER"}`);
console.log(`Format-Version:   ${result.meta.formatVersion ?? "?"}`);
console.log(`Berater-Nr:       ${result.meta.beraterNr ?? "?"}`);
console.log(`Mandanten-Nr:     ${result.meta.mandantenNr ?? "?"}`);
console.log(`WJ-Beginn:        ${result.meta.wjBeginn ?? "?"}`);
console.log(`Sachkontenlänge:  ${result.meta.sachkontenlaenge ?? "?"}`);
console.log(`Datum-Bereich:    ${result.meta.datumVon ?? "?"} – ${result.meta.datumBis ?? "?"}`);
console.log(`Anzahl Buchungen: ${result.meta.buchungsCount}`);
console.log(`Fehler:           ${result.errors.length}`);
console.log(`Warnungen:        ${result.warnings.length}`);

if (result.errors.length > 0) {
  console.log("");
  console.log("❌ FEHLER (blockierend):");
  result.errors.forEach((e, i) => {
    console.log(`  ${i + 1}. [Zeile ${e.zeile}${e.feld ? `, Feld ${e.feld}` : ""}] ${e.code}`);
    console.log(`     ${e.message}`);
  });
}

if (result.warnings.length > 0) {
  console.log("");
  console.log("⚠ WARNUNGEN (nicht blockierend):");
  result.warnings.forEach((w, i) => {
    console.log(`  ${i + 1}. [Zeile ${w.zeile}${w.feld ? `, Feld ${w.feld}` : ""}] ${w.code}`);
    console.log(`     ${w.message}`);
  });
}

console.log("");
process.exit(result.valid ? 0 : 1);
