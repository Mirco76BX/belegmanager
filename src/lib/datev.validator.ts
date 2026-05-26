/**
 * DATEV-CSV Validator
 *
 * Prüft eine DATEV-Buchungsstapel-CSV (Format 7) gegen die offizielle Spec.
 *
 * Pure function — keine Browser- oder Node-Abhängigkeiten. Kann sowohl in der
 * App (z.B. nach Generierung zur Selbst-Validierung) als auch in Tests
 * (CI/vitest) und CLI-Tools (scripts/validate-datev.mjs) verwendet werden.
 */

export interface DatevValidationResult {
  valid: boolean;
  errors: DatevValidationIssue[];   // blockierende Format-Fehler
  warnings: DatevValidationIssue[]; // weiche Hinweise (z.B. unbelegter Konto-Code)
  meta: {
    formatVersion: number | null;
    beraterNr: string | null;
    mandantenNr: string | null;
    wjBeginn: string | null;
    sachkontenlaenge: number | null;
    datumVon: string | null;
    datumBis: string | null;
    buchungsCount: number;
  };
}

export interface DatevValidationIssue {
  zeile: number;       // 1-basiert
  feld?: number;       // 1-basiert (Spalte)
  code: string;        // Maschinen-lesbarer Code, z.B. "VORLAUF_MISSING_BERATER_NR"
  message: string;     // Mensch-lesbar (deutsch)
}

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

/**
 * Parst eine CSV-Zeile mit Semikolon als Trenner und Anführungszeichen als
 * String-Quote. Beachtet ""-Escape innerhalb von "..."-Strings.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          buf += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        buf += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ";") {
        fields.push(buf);
        buf = "";
      } else {
        buf += ch;
      }
    }
  }
  fields.push(buf);
  return fields;
}

/**
 * Hauptfunktion: validiert eine komplette DATEV-CSV.
 */
export function validateDatevCsv(csv: string): DatevValidationResult {
  const errors: DatevValidationIssue[] = [];
  const warnings: DatevValidationIssue[] = [];
  const meta: DatevValidationResult["meta"] = {
    formatVersion: null,
    beraterNr: null,
    mandantenNr: null,
    wjBeginn: null,
    sachkontenlaenge: null,
    datumVon: null,
    datumBis: null,
    buchungsCount: 0,
  };

  // Split lines (CRLF, LF, CR — alle drei akzeptieren)
  const rawLines = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  // Trailing empty line entfernen (durch trailing CRLF)
  while (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") rawLines.pop();

  if (rawLines.length < 2) {
    errors.push({
      zeile: 0,
      code: "STRUKTUR_LEER",
      message: "Datei hat weniger als 2 Zeilen — Vorlauf und Spalten-Header werden mindestens erwartet.",
    });
    return { valid: false, errors, warnings, meta };
  }

  // ─── Zeile 1: Vorlauf ──────────────────────────────────────────────────
  const vorlauf = parseCsvLine(rawLines[0]);

  if (vorlauf[0] !== "EXTF") {
    errors.push({ zeile: 1, feld: 1, code: "VORLAUF_BAD_MAGIC", message: `Feld 1 muss "EXTF" sein, ist "${vorlauf[0]}".` });
  }

  const version = parseInt(vorlauf[1] || "", 10);
  if (![300, 510, 700, 800].includes(version)) {
    errors.push({ zeile: 1, feld: 2, code: "VORLAUF_BAD_VERSION", message: `Feld 2 (Version) muss 300/510/700/800 sein, ist "${vorlauf[1]}".` });
  }

  if (parseInt(vorlauf[2] || "", 10) !== 21) {
    errors.push({ zeile: 1, feld: 3, code: "VORLAUF_BAD_KATEGORIE", message: `Feld 3 (Datenkategorie) muss 21 (Buchungsstapel) sein, ist "${vorlauf[2]}".` });
  }

  if (vorlauf[3] !== "Buchungsstapel") {
    errors.push({ zeile: 1, feld: 4, code: "VORLAUF_BAD_FORMATNAME", message: `Feld 4 muss "Buchungsstapel" sein, ist "${vorlauf[3]}".` });
  }

  const formatVersion = parseInt(vorlauf[4] || "", 10);
  meta.formatVersion = isNaN(formatVersion) ? null : formatVersion;
  if (formatVersion < 7) {
    errors.push({ zeile: 1, feld: 5, code: "VORLAUF_BAD_FORMATVERSION", message: `Feld 5 (Formatversion) muss ≥ 7 sein, ist "${vorlauf[4]}".` });
  }

  // Feld 6: Timestamp YYYYMMDDHHMMSSXXX (17 Stellen)
  if (!/^\d{17}$/.test(vorlauf[5] || "")) {
    errors.push({ zeile: 1, feld: 6, code: "VORLAUF_BAD_TIMESTAMP", message: `Feld 6 (Erzeugt am) muss 17 Ziffern haben (YYYYMMDDHHMMSSXXX), ist "${vorlauf[5]}".` });
  }

  // Feld 8: Herkunft (max 2 Zeichen)
  if ((vorlauf[7] || "").length > 2) {
    warnings.push({ zeile: 1, feld: 8, code: "VORLAUF_HERKUNFT_LANG", message: `Feld 8 (Herkunft) hat mehr als 2 Zeichen — DATEV-Spec erlaubt max 2.` });
  }

  // Feld 11: Berater-Nr (4-7 Ziffern)
  meta.beraterNr = vorlauf[10] || null;
  if (!/^\d{4,7}$/.test(vorlauf[10] || "")) {
    errors.push({ zeile: 1, feld: 11, code: "VORLAUF_MISSING_BERATER_NR", message: `Feld 11 (Berater-Nr) muss 4–7 Ziffern haben, ist "${vorlauf[10]}".` });
  }

  // Feld 12: Mandanten-Nr (1-5 Ziffern)
  meta.mandantenNr = vorlauf[11] || null;
  if (!/^\d{1,5}$/.test(vorlauf[11] || "")) {
    errors.push({ zeile: 1, feld: 12, code: "VORLAUF_MISSING_MANDANTEN_NR", message: `Feld 12 (Mandanten-Nr) muss 1–5 Ziffern haben, ist "${vorlauf[11]}".` });
  }

  // Feld 13: WJ-Beginn (YYYYMMDD)
  meta.wjBeginn = vorlauf[12] || null;
  if (!/^\d{8}$/.test(vorlauf[12] || "")) {
    errors.push({ zeile: 1, feld: 13, code: "VORLAUF_BAD_WJ_BEGINN", message: `Feld 13 (WJ-Beginn) muss 8 Ziffern haben (YYYYMMDD), ist "${vorlauf[12]}".` });
  }

  // Feld 14: Sachkontenlänge (4-8)
  const sk = parseInt(vorlauf[13] || "", 10);
  meta.sachkontenlaenge = isNaN(sk) ? null : sk;
  if (sk < 4 || sk > 8) {
    errors.push({ zeile: 1, feld: 14, code: "VORLAUF_BAD_SACHKONTENLAENGE", message: `Feld 14 (Sachkontenlänge) muss 4–8 sein, ist "${vorlauf[13]}".` });
  }

  // Feld 15+16: Datum von / bis (YYYYMMDD)
  meta.datumVon = vorlauf[14] || null;
  meta.datumBis = vorlauf[15] || null;
  if (!/^\d{8}$/.test(vorlauf[14] || "")) {
    errors.push({ zeile: 1, feld: 15, code: "VORLAUF_BAD_DATUM_VON", message: `Feld 15 (Datum von) muss 8 Ziffern haben (YYYYMMDD).` });
  }
  if (!/^\d{8}$/.test(vorlauf[15] || "")) {
    errors.push({ zeile: 1, feld: 16, code: "VORLAUF_BAD_DATUM_BIS", message: `Feld 16 (Datum bis) muss 8 Ziffern haben (YYYYMMDD).` });
  }

  // Feld 17: Bezeichnung (max 30 Zeichen)
  if ((vorlauf[16] || "").length > 30) {
    warnings.push({ zeile: 1, feld: 17, code: "VORLAUF_BEZEICHNUNG_LANG", message: `Feld 17 (Bezeichnung) hat mehr als 30 Zeichen.` });
  }

  // Feld 22: WKZ Mandant
  if (vorlauf[21] && !/^[A-Z]{3}$/.test(vorlauf[21])) {
    warnings.push({ zeile: 1, feld: 22, code: "VORLAUF_BAD_WKZ", message: `Feld 22 (WKZ Mandant) erwartet 3-Buchstaben-ISO-Code, ist "${vorlauf[21]}".` });
  }

  // ─── Zeile 2: Spalten-Header ──────────────────────────────────────────
  const headerLine = parseCsvLine(rawLines[1]);
  SPALTEN_ERWARTET.forEach((expected, idx) => {
    if (headerLine[idx] !== expected) {
      errors.push({
        zeile: 2,
        feld: idx + 1,
        code: "HEADER_BAD_COLUMN_NAME",
        message: `Spalte ${idx + 1}: erwartet "${expected}", ist "${headerLine[idx] || "(leer)"}".`,
      });
    }
  });

  // ─── Zeile 3+: Buchungen ──────────────────────────────────────────────
  for (let i = 2; i < rawLines.length; i++) {
    const line = rawLines[i];
    const zeile = i + 1;
    const row = parseCsvLine(line);

    if (row.length < 19) {
      errors.push({ zeile, code: "ROW_TOO_FEW_FIELDS", message: `Zeile ${zeile} hat nur ${row.length} Felder, mindestens 19 werden erwartet.` });
      continue;
    }

    meta.buchungsCount++;

    // Feld 1: Umsatz (deutsches Komma-Format)
    if (!/^\d+(,\d{1,2})?$/.test(row[0] || "")) {
      errors.push({ zeile, feld: 1, code: "ROW_BAD_UMSATZ", message: `Feld 1 (Umsatz) ungültig: "${row[0]}". Erwartet z.B. "123,45".` });
    }

    // Feld 2: Soll/Haben — "S" oder "H"
    if (row[1] !== "S" && row[1] !== "H") {
      errors.push({ zeile, feld: 2, code: "ROW_BAD_SH", message: `Feld 2 (Soll/Haben) muss "S" oder "H" sein, ist "${row[1]}".` });
    }

    // Feld 3: WKZ Umsatz (3-Buchstaben oder leer)
    if (row[2] && !/^[A-Z]{3}$/.test(row[2])) {
      warnings.push({ zeile, feld: 3, code: "ROW_BAD_WKZ", message: `Feld 3 (WKZ) erwartet ISO-3-Buchstaben-Code, ist "${row[2]}".` });
    }

    // Feld 7: Konto (Ziffern, sollte mit Sachkontenlänge übereinstimmen)
    if (!/^\d+$/.test(row[6] || "")) {
      errors.push({ zeile, feld: 7, code: "ROW_BAD_KONTO", message: `Feld 7 (Konto) muss numerisch sein, ist "${row[6]}".` });
    } else if (meta.sachkontenlaenge && row[6].length !== meta.sachkontenlaenge) {
      warnings.push({
        zeile, feld: 7, code: "ROW_KONTO_LENGTH_MISMATCH",
        message: `Konto "${row[6]}" hat ${row[6].length} Stellen, Sachkontenlänge ist ${meta.sachkontenlaenge}.`,
      });
    }

    // Feld 8: Gegenkonto (Ziffern)
    if (!/^\d+$/.test(row[7] || "")) {
      errors.push({ zeile, feld: 8, code: "ROW_BAD_GEGENKONTO", message: `Feld 8 (Gegenkonto) muss numerisch sein, ist "${row[7]}".` });
    }

    // Feld 9: BU-Schlüssel (Ziffern oder leer)
    if (row[8] && !/^\d{0,2}$/.test(row[8])) {
      errors.push({ zeile, feld: 9, code: "ROW_BAD_BU", message: `Feld 9 (BU-Schlüssel) muss 0-2 Ziffern sein oder leer, ist "${row[8]}".` });
    }

    // Feld 10: Belegdatum (TTMM = 4 Ziffern, oder TTMMJJJJ = 8 Ziffern)
    if (row[9] && !/^\d{4}$/.test(row[9]) && !/^\d{8}$/.test(row[9])) {
      errors.push({ zeile, feld: 10, code: "ROW_BAD_BELEGDATUM", message: `Feld 10 (Belegdatum) muss 4 (TTMM) oder 8 (TTMMJJJJ) Ziffern sein, ist "${row[9]}".` });
    } else if (/^\d{4}$/.test(row[9])) {
      // Plausibilität TTMM: TT 01-31, MM 01-12
      const tt = parseInt(row[9].slice(0, 2), 10);
      const mm = parseInt(row[9].slice(2, 4), 10);
      if (tt < 1 || tt > 31 || mm < 1 || mm > 12) {
        warnings.push({ zeile, feld: 10, code: "ROW_DATUM_IMPLAUSIBEL", message: `Belegdatum "${row[9]}" hat unplausible TT/MM-Werte (TT=${tt}, MM=${mm}).` });
      }
    }

    // Feld 11: Belegfeld 1 (max 36 Zeichen)
    if ((row[10] || "").length > 36) {
      warnings.push({ zeile, feld: 11, code: "ROW_BELEGFELD1_LANG", message: `Belegfeld 1 hat ${row[10].length} Zeichen — DATEV erlaubt max 36.` });
    }

    // Feld 14: Buchungstext (max 60 Zeichen)
    if ((row[13] || "").length > 60) {
      warnings.push({ zeile, feld: 14, code: "ROW_BUCHUNGSTEXT_LANG", message: `Buchungstext hat ${row[13].length} Zeichen — DATEV erlaubt max 60.` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    meta,
  };
}

/**
 * Formatiert ein Validation-Result als lesbarer Text-Report.
 */
export function formatValidationReport(result: DatevValidationResult): string {
  const lines: string[] = [];
  lines.push("─────────────────────────────────────────────────────────────");
  lines.push("DATEV-CSV Validierungsbericht");
  lines.push("─────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`Status:           ${result.valid ? "✅ VALID" : "❌ FEHLER"}`);
  lines.push(`Format-Version:   ${result.meta.formatVersion ?? "?"}`);
  lines.push(`Berater-Nr:       ${result.meta.beraterNr ?? "?"}`);
  lines.push(`Mandanten-Nr:     ${result.meta.mandantenNr ?? "?"}`);
  lines.push(`WJ-Beginn:        ${result.meta.wjBeginn ?? "?"}`);
  lines.push(`Sachkontenlänge:  ${result.meta.sachkontenlaenge ?? "?"}`);
  lines.push(`Datum-Bereich:    ${result.meta.datumVon ?? "?"} bis ${result.meta.datumBis ?? "?"}`);
  lines.push(`Anzahl Buchungen: ${result.meta.buchungsCount}`);
  lines.push(`Fehler:           ${result.errors.length}`);
  lines.push(`Warnungen:        ${result.warnings.length}`);

  if (result.errors.length > 0) {
    lines.push("");
    lines.push("FEHLER (blockierend):");
    result.errors.forEach((e, i) => {
      lines.push(`  ${i + 1}. [Zeile ${e.zeile}${e.feld ? `, Feld ${e.feld}` : ""}] ${e.code}`);
      lines.push(`     ${e.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("WARNUNGEN (nicht blockierend):");
    result.warnings.forEach((w, i) => {
      lines.push(`  ${i + 1}. [Zeile ${w.zeile}${w.feld ? `, Feld ${w.feld}` : ""}] ${w.code}`);
      lines.push(`     ${w.message}`);
    });
  }

  lines.push("");
  return lines.join("\n");
}
