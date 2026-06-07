/**
 * Round-Trip-Tests für die DATEV-Lib:
 *   buildDatevStapel(opts) → CSV → validateDatevCsv(csv) → valid?
 *
 * Diese Tests stellen sicher, dass jeder generierte Stapel auch unsere
 * eigene Spec-Validierung besteht. Wenn die Lib oder die Spec drifted,
 * brechen diese Tests.
 */
import { describe, it, expect } from "vitest";
import {
  buildDatevStapel,
  kontoForTaxCategory,
  buSchluesselForVatRate,
  DEFAULT_GEGENKONTO,
  type DatevMandantSettings,
  type DatevReceipt,
} from "./datev";
import { validateDatevCsv, parseCsvLine } from "./datev.validator";

const MANDANT_OK: DatevMandantSettings = {
  berater_nr: "1001",
  mandanten_nr: "50001",
  wj_beginn: "2026-01-01",
  sachkontenlaenge: 4,
  kontenrahmen: "SKR03",
  konto_gegenkonto: "1600", // Verbindlichkeiten aus L+L (SKR03) — NICHT Bank
  bezeichnung: "Test-Stapel",
};

const RECEIPTS_OK: DatevReceipt[] = [
  { id: "uuid-001", date: "2026-05-15", amount: 123.45, vat_rate: 19, description: "Bewirtung mit Kunde", tax_category: "bewirtung" },
  { id: "uuid-002", date: "2026-05-16", amount: 89.90, vat_rate: 19, description: "Tanken Shell A40", tax_category: "tankkosten" },
  { id: "uuid-003", date: "2026-05-17", amount: 159.00, vat_rate: 7, description: "Hotel Düsseldorf", tax_category: "reisekosten_uebernachtung" },
];

describe("buildDatevStapel — Format-Konformität", () => {
  it("erzeugt eine CSV, die unsere eigene Validierung besteht", () => {
    const result = buildDatevStapel({
      receipts: RECEIPTS_OK,
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "test@example.com",
    });
    const v = validateDatevCsv(result.csv);
    if (!v.valid) {
      console.error("Validation errors:", v.errors);
    }
    expect(v.valid).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.meta.beraterNr).toBe("1001");
    expect(v.meta.mandantenNr).toBe("50001");
    expect(v.meta.wjBeginn).toBe("20260101");
    expect(v.meta.sachkontenlaenge).toBe(4);
    expect(v.meta.buchungsCount).toBe(3);
  });

  it("Vorlauf hat exakt 31 Felder", () => {
    const result = buildDatevStapel({
      receipts: RECEIPTS_OK,
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "test@example.com",
    });
    const firstLine = result.csv.split(/\r\n/)[0];
    const fields = parseCsvLine(firstLine);
    expect(fields.length).toBe(31);
    expect(fields[0]).toBe("EXTF");
    expect(fields[3]).toBe("Buchungsstapel");
    expect(fields[2]).toBe("21"); // Datenkategorie Buchungsstapel
  });

  it("Spalten-Header sind exakt die 19 erwarteten DATEV-Felder", () => {
    const result = buildDatevStapel({
      receipts: RECEIPTS_OK,
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "test@example.com",
    });
    const lines = result.csv.split(/\r\n/);
    const headers = parseCsvLine(lines[1]);
    expect(headers[0]).toBe("Umsatz (ohne Soll/Haben-Kz)");
    expect(headers[1]).toBe("Soll/Haben-Kennzeichen");
    expect(headers[6]).toBe("Konto");
    expect(headers[7]).toBe("Gegenkonto (ohne BU-Schlüssel)");
    expect(headers[9]).toBe("Belegdatum");
  });

  it("Datenzeilen haben Betrag im deutschen Format (Komma)", () => {
    const result = buildDatevStapel({
      receipts: RECEIPTS_OK,
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "test@example.com",
    });
    const lines = result.csv.split(/\r\n/);
    const firstBuchung = parseCsvLine(lines[2]);
    expect(firstBuchung[0]).toBe("123,45");
    expect(firstBuchung[1]).toBe("S");        // Soll
    expect(firstBuchung[2]).toBe("EUR");      // WKZ
  });

  it("Belegdatum ist im TTMM-Format (Tag+Monat, 4 Stellen)", () => {
    const result = buildDatevStapel({
      receipts: [{ id: "x", date: "2026-05-15", amount: 100, vat_rate: 19, tax_category: "sonstiges" }],
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "t@e.com",
    });
    const lines = result.csv.split(/\r\n/);
    const row = parseCsvLine(lines[2]);
    expect(row[9]).toBe("1505"); // 15. Mai → TTMM
  });

  it("Belegfeld 1 ist laufende Nummer 4-stellig", () => {
    const result = buildDatevStapel({
      receipts: RECEIPTS_OK,
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "t@e.com",
    });
    const lines = result.csv.split(/\r\n/);
    expect(parseCsvLine(lines[2])[10]).toBe("0001");
    expect(parseCsvLine(lines[3])[10]).toBe("0002");
    expect(parseCsvLine(lines[4])[10]).toBe("0003");
  });

  it("schlägt fehl wenn Berater-Nr fehlt", () => {
    const result = buildDatevStapel({
      receipts: RECEIPTS_OK,
      mandant: { ...MANDANT_OK, berater_nr: "" },
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "t@e.com",
    });
    expect(result.warnings.some((w) => /Berater-Nr/.test(w))).toBe(true);
  });

  it("schlägt fehl wenn Mandanten-Nr ungültiges Format hat", () => {
    const result = buildDatevStapel({
      receipts: RECEIPTS_OK,
      mandant: { ...MANDANT_OK, mandanten_nr: "ABC123" },
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "t@e.com",
    });
    expect(result.warnings.some((w) => /Mandanten-Nr/.test(w))).toBe(true);
  });
});

describe("Konten-Mapping", () => {
  it("mappt SKR03-Konten korrekt", () => {
    expect(kontoForTaxCategory("bewirtung", "SKR03")).toBe("4650");
    expect(kontoForTaxCategory("tankkosten", "SKR03")).toBe("4530");
    expect(kontoForTaxCategory("reisekosten_uebernachtung", "SKR03")).toBe("4660");
    expect(kontoForTaxCategory("bueromaterial", "SKR03")).toBe("4930");
    expect(kontoForTaxCategory("sonstiges", "SKR03")).toBe("4900");
  });

  it("mappt SKR04-Konten korrekt", () => {
    expect(kontoForTaxCategory("bewirtung", "SKR04")).toBe("6640");
    expect(kontoForTaxCategory("tankkosten", "SKR04")).toBe("6530");
    expect(kontoForTaxCategory("reisekosten_uebernachtung", "SKR04")).toBe("6660");
    expect(kontoForTaxCategory("bueromaterial", "SKR04")).toBe("6815");
    expect(kontoForTaxCategory("sonstiges", "SKR04")).toBe("6300");
  });

  it("fällt auf Default-Konto zurück bei unbekannter Kategorie", () => {
    expect(kontoForTaxCategory("unbekannte_kategorie", "SKR03")).toBe("4900");
    expect(kontoForTaxCategory(null, "SKR03")).toBe("4900");
    expect(kontoForTaxCategory(null, "SKR04")).toBe("6300");
  });

  it("Default-Gegenkonten je Kontenrahmen sind korrekt", () => {
    // WICHTIG: NICHT Bank! Default ist Verrechnungs-/Verbindlichkeitskonto,
    // weil der Steuerberater die Bank separat aus dem Kontoauszug bucht.
    // Würde hier Bank stehen, gäbe es eine doppelte Bank-Buchung.
    expect(DEFAULT_GEGENKONTO.SKR03).toBe("1600"); // Verbindlichkeiten aus L+L (SKR03)
    expect(DEFAULT_GEGENKONTO.SKR04).toBe("3300"); // Verbindlichkeiten aus L+L (SKR04)
  });
});

describe("BU-Schlüssel-Mapping", () => {
  it("mappt USt-Sätze auf DATEV-BU-Schlüssel", () => {
    expect(buSchluesselForVatRate(19)).toBe("9");
    expect(buSchluesselForVatRate(7)).toBe("8");
    expect(buSchluesselForVatRate(0)).toBe("");
    expect(buSchluesselForVatRate(null)).toBe("");
    expect(buSchluesselForVatRate(undefined)).toBe("");
  });
});

describe("Multi-MwSt-Splitting", () => {
  it("erzeugt pro vat_item eine eigene Buchungszeile (Restaurant 7% + 19%)", () => {
    const restaurantReceipt: DatevReceipt = {
      id: "uuid-restaurant",
      date: "2026-05-16",
      amount: 157.00,
      currency: "EUR",
      description: "CAFE DEL SOL",
      tax_category: "bewirtung",
      vat_items: [
        { vat_rate: 7,  vat_amount: 4.87,  net_amount: 69.63, label: "Speisen" },
        { vat_rate: 19, vat_amount: 11.26, net_amount: 59.24, label: "Getränke" },
      ],
    };
    const result = buildDatevStapel({
      receipts: [restaurantReceipt],
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "t@e.com",
    });
    expect(result.count).toBe(2); // 2 Buchungszeilen aus 1 Beleg
    const lines = result.csv.split(/\r\n/).filter(Boolean);
    // Zeile 1 = Vorlauf, Zeile 2 = Spalten-Header, Zeile 3+4 = Buchungen
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const buchung1 = lines[2];
    const buchung2 = lines[3];
    expect(buchung1).toContain("74,50"); // Brutto Speisen: 69,63 + 4,87
    expect(buchung1).toContain('"8"');    // BU-Schlüssel 7%
    expect(buchung2).toContain("70,50"); // Brutto Getränke: 59,24 + 11,26
    expect(buchung2).toContain('"9"');    // BU-Schlüssel 19%
  });

  it("nutzt vat_rate-Fallback aus Tax-Category, wenn vat_rate fehlt", () => {
    const receipt: DatevReceipt = {
      id: "uuid-fallback",
      date: "2026-05-15",
      amount: 100.00,
      description: "Bewirtung ohne MwSt-Angabe",
      tax_category: "bewirtung",
      // vat_rate fehlt absichtlich
    };
    const result = buildDatevStapel({
      receipts: [receipt],
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "t@e.com",
    });
    const buchung = result.csv.split(/\r\n/).filter(Boolean)[2];
    // Bewirtung-Default ist 19% → BU-Schlüssel 9
    expect(buchung).toContain('"9"');
  });

  it("berechnet Fremdwährungs-Kurs (Bali-Beispiel: EUR ↔ IDR)", () => {
    const baliReceipt: DatevReceipt = {
      id: "uuid-bali",
      date: "2026-05-01",
      amount: 4077700,        // IDR
      amount_eur: 199.81,
      currency: "IDR",
      description: "Amankila Restaurant",
      tax_category: "bewirtung",
    };
    const result = buildDatevStapel({
      receipts: [baliReceipt],
      mandant: MANDANT_OK,
      datumVon: "2026-05-01",
      datumBis: "2026-05-31",
      exportiertVon: "t@e.com",
    });
    const buchung = result.csv.split(/\r\n/).filter(Boolean)[2];
    // Kurs = 4077700 / 199.81 ≈ 20408,388469 (in deutschem Komma-Format)
    expect(buchung).toContain("20408,388469");
    // Basis-Umsatz in IDR
    expect(buchung).toContain("4077700,00");
    // WKZ Basis = IDR
    expect(buchung).toContain('"IDR"');
  });
});

describe("validateDatevCsv — Negativ-Tests", () => {
  it("erkennt fehlenden EXTF-Magic", () => {
    const csv = `"BAD";700;21;"Buchungsstapel";7;20260518123456000;;"BM";"x";;1001;50001;20260101;4;20260501;20260531;"Test";"";1;0;0;"EUR";;;;;;;;\r\n${"\"x\";".repeat(19)}\r\n`;
    const v = validateDatevCsv(csv);
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.code === "VORLAUF_BAD_MAGIC")).toBe(true);
  });

  it("erkennt fehlende Berater-Nr", () => {
    const csv = `"EXTF";700;21;"Buchungsstapel";7;20260518123456000;;"BM";"x";;;50001;20260101;4;20260501;20260531;"Test";"";1;0;0;"EUR";;;;;;;;\r\n${"\"\";".repeat(19)}\r\n`;
    const v = validateDatevCsv(csv);
    expect(v.errors.some((e) => e.code === "VORLAUF_MISSING_BERATER_NR")).toBe(true);
  });

  it("erkennt zu wenige Felder in Datenzeile", () => {
    const csv = `"EXTF";700;21;"Buchungsstapel";7;20260518123456000;;"BM";"x";;1001;50001;20260101;4;20260501;20260531;"Test";"";1;0;0;"EUR";;;;;;;;\r\n"Umsatz (ohne Soll/Haben-Kz)";"Soll/Haben-Kennzeichen";"WKZ Umsatz";"Kurs";"Basis-Umsatz";"WKZ Basis-Umsatz";"Konto";"Gegenkonto (ohne BU-Schlüssel)";"BU-Schlüssel";"Belegdatum";"Belegfeld 1";"Belegfeld 2";"Skonto";"Buchungstext";"Postensperre";"Diverse Adressnummer";"Geschäftspartnerbank";"Sachverhalt";"Zinssperre"\r\n100,00;"S";"EUR"\r\n`;
    const v = validateDatevCsv(csv);
    expect(v.errors.some((e) => e.code === "ROW_TOO_FEW_FIELDS")).toBe(true);
  });
});

describe("parseCsvLine — CSV-Parser-Edge-Cases", () => {
  it("parst einfache semikolon-getrennte Werte", () => {
    expect(parseCsvLine(`a;b;c`)).toEqual(["a", "b", "c"]);
  });

  it("parst quoted Strings", () => {
    expect(parseCsvLine(`"hello";"world"`)).toEqual(["hello", "world"]);
  });

  it("parst escapte Quotes innerhalb von Strings", () => {
    expect(parseCsvLine(`"sa""id";"hello"`)).toEqual([`sa"id`, "hello"]);
  });

  it("parst Mischung aus quoted und unquoted", () => {
    expect(parseCsvLine(`123,45;"S";"EUR";;;;4650`)).toEqual(["123,45", "S", "EUR", "", "", "", "4650"]);
  });

  it("parst leere Felder", () => {
    expect(parseCsvLine(`;;;`)).toEqual(["", "", "", ""]);
  });
});
