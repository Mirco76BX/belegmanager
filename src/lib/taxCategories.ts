// Steuerrechtliche Kategorisierung – Mapping between business categories and tax accounts
// Based on German tax law (EStG, UStG)

export interface TaxCategory {
  value: string;
  label: { de: string; en: string };
  subcategories?: TaxCategory[];
  requiredFields?: string[]; // field names that must be filled
  defaultVatRate?: number;   // Smart Guess VAT rate
  icon: string;
}

export const TAX_CATEGORIES: TaxCategory[] = [
  {
    value: "reisekosten_uebernachtung",
    label: { de: "Reisekosten – Übernachtung", en: "Travel – Accommodation" },
    icon: "🏨",
    defaultVatRate: 7,
  },
  {
    value: "reisekosten_fahrt",
    label: { de: "Reisekosten – Fahrtkosten", en: "Travel – Transport" },
    icon: "🚆",
    defaultVatRate: 7,
  },
  {
    value: "reisekosten_nebenkosten",
    label: { de: "Reisekosten – Nebenkosten", en: "Travel – Incidentals" },
    icon: "🧳",
    defaultVatRate: 19,
  },
  {
    value: "verpflegungsmehraufwand",
    label: { de: "Verpflegungsmehraufwand (VMA)", en: "Per Diem Allowance" },
    icon: "🍽️",
    defaultVatRate: 0,
  },
  {
    value: "bewirtung",
    label: { de: "Bewirtungskosten", en: "Entertainment/Hospitality" },
    icon: "🥂",
    defaultVatRate: 19,
    requiredFields: ["person_met", "meeting_purpose"], // § 4 Abs. 5 EStG
  },
  {
    value: "tankkosten",
    label: { de: "Tankkosten / Kraftstoff", en: "Fuel Costs" },
    icon: "⛽",
    defaultVatRate: 19,
  },
  {
    value: "bueromaterial",
    label: { de: "Büromaterial", en: "Office Supplies" },
    icon: "📎",
    defaultVatRate: 19,
  },
  {
    value: "telekommunikation",
    label: { de: "Telefon / Internet", en: "Phone / Internet" },
    icon: "📱",
    defaultVatRate: 19,
  },
  {
    value: "fortbildung",
    label: { de: "Fortbildung / Weiterbildung", en: "Training / Education" },
    icon: "📚",
    defaultVatRate: 19,
  },
  {
    value: "versicherung",
    label: { de: "Versicherungen", en: "Insurance" },
    icon: "🛡️",
    defaultVatRate: 19,
  },
  // ───── Geschenke an Geschäftspartner — § 4 Abs. 5 Nr. 1 EStG ─────
  // Freigrenze 50 € netto pro Empfänger/Jahr (seit 01.01.2024, Wachstumschancengesetz).
  // Bei Überschreitung: Geschenk komplett nicht abziehbar. Pauschalsteuer § 37b EStG optional.
  {
    value: "streuwerbeartikel",
    label: { de: "Streuwerbeartikel (≤ 10 €, keine Aufzeichnung)", en: "Promo Items (≤ €10, no tracking)" },
    icon: "🖊️",
    defaultVatRate: 19,
  },
  {
    value: "geschenke_abziehbar",
    label: { de: "Geschenke ≤ 50 € (abziehbar, ohne Pauschalsteuer)", en: "Gifts ≤ €50 (deductible, no flat tax)" },
    icon: "🎁",
    defaultVatRate: 19,
  },
  {
    value: "geschenke_pauschal",
    label: { de: "Geschenke ≤ 50 € (mit § 37b Pauschalsteuer 30 %)", en: "Gifts ≤ €50 (with §37b flat tax 30%)" },
    icon: "🎁",
    defaultVatRate: 19,
  },
  {
    value: "geschenke_nicht_abziehbar",
    label: { de: "Geschenke > 50 € (nicht abziehbar, ohne § 37b Pauschalsteuer)", en: "Gifts > €50 (not deductible, no §37b flat tax)" },
    icon: "🚫",
    defaultVatRate: 19,
  },
  {
    value: "geschenke_nicht_abziehbar_pauschal",
    label: { de: "Geschenke > 50 € (nicht abziehbar, mit § 37b Pauschalsteuer 30 %)", en: "Gifts > €50 (not deductible, with §37b flat tax 30%)" },
    icon: "🚫",
    defaultVatRate: 19,
  },
  // — Legacy-Wert für Rückwärtskompatibilität bestehender Belege, in UI bevorzugt die 4 neuen Werte. —
  {
    value: "geschenke",
    label: { de: "Geschenk (alt — bitte differenzieren)", en: "Gift (legacy — please re-classify)" },
    icon: "🎁",
    defaultVatRate: 19,
  },
  {
    value: "software_saas",
    label: { de: "Software / SaaS-Abos", en: "Software / SaaS Subscriptions" },
    icon: "💻",
    defaultVatRate: 19,
  },
  {
    value: "miete_raum",
    label: { de: "Miete / Raumkosten", en: "Rent / Office Space" },
    icon: "🏢",
    defaultVatRate: 19,
  },
  {
    value: "werbung_marketing",
    label: { de: "Werbung / Marketing", en: "Advertising / Marketing" },
    icon: "📢",
    defaultVatRate: 19,
  },
  {
    value: "beratung_recht",
    label: { de: "Rechts- und Beratungskosten", en: "Legal / Consulting Fees" },
    icon: "⚖️",
    defaultVatRate: 19,
  },
  {
    value: "porto_versand",
    label: { de: "Porto / Versand", en: "Postage / Shipping" },
    icon: "📮",
    defaultVatRate: 19,
  },
  {
    value: "bankgebuehren",
    label: { de: "Bank- / Geldverkehrskosten", en: "Bank Fees" },
    icon: "🏦",
    defaultVatRate: 0,
  },
  {
    value: "reparatur_wartung",
    label: { de: "Reparatur / Wartung", en: "Repair / Maintenance" },
    icon: "🔧",
    defaultVatRate: 19,
  },
  {
    value: "gwg",
    label: { de: "GwG (geringwertige Wirtschaftsgüter ≤ 800 €)", en: "Low-value Assets (≤ €800)" },
    icon: "🛠️",
    defaultVatRate: 19,
  },
  {
    value: "energie",
    label: { de: "Strom / Wasser / Heizung", en: "Utilities (Power / Water / Heating)" },
    icon: "💡",
    defaultVatRate: 19,
  },
  {
    value: "sonstiges",
    label: { de: "Sonstige betriebliche Aufwendungen", en: "Other Business Expenses" },
    icon: "📦",
    defaultVatRate: 19,
  },
];

/**
 * Get the default VAT rate for a given tax category.
 * Used for "Smart Guess" when OCR can't read the VAT clearly.
 */
export function getSmartGuessVat(taxCategory: string | null): number | null {
  if (!taxCategory) return null;
  const cat = TAX_CATEGORIES.find((c) => c.value === taxCategory);
  return cat?.defaultVatRate ?? null;
}

/**
 * Get required fields for a tax category (e.g. Bewirtung needs Anlass + Teilnehmer)
 */
export function getRequiredFields(taxCategory: string | null): string[] {
  if (!taxCategory) return [];
  const cat = TAX_CATEGORIES.find((c) => c.value === taxCategory);
  return cat?.requiredFields ?? [];
}

/**
 * Map old purpose presets to new tax categories for auto-detection
 */
export function guessTaxCategoryFromPurpose(purpose: string | null): string | null {
  if (!purpose) return null;
  const lower = purpose.toLowerCase();
  if (lower.includes("bewirtung") || lower.includes("geschäftsessen") || lower.includes("business meal")) return "bewirtung";
  if (lower.includes("tanken") || lower.includes("fuel")) return "tankkosten";
  if (lower.includes("reise") && lower.includes("nebenkost")) return "reisekosten_nebenkosten";
  if (lower.includes("reise") && (lower.includes("übernacht") || lower.includes("hotel"))) return "reisekosten_uebernachtung";
  if (lower.includes("reise") && (lower.includes("fahrt") || lower.includes("bahn") || lower.includes("flug"))) return "reisekosten_fahrt";
  if (lower.includes("reise")) return "reisekosten_nebenkosten";
  if (lower.includes("büromaterial") || lower.includes("bürobedarf") || lower.includes("office supplies")) return "bueromaterial";
  if (lower.includes("fortbildung") || lower.includes("weiterbildung") || lower.includes("training") || lower.includes("seminar") || lower.includes("workshop") || lower.includes("kurs") || lower.includes("schulung")) return "fortbildung";
  if (lower.includes("telefon") || lower.includes("internet") || lower.includes("provider")) return "telekommunikation";
  if (lower.includes("akquise") || lower.includes("kundengewinnung")) return "bewirtung";
  if (lower.includes("software") || lower.includes("saas") || lower.includes("abo") || lower.includes("lizenz")) return "software_saas";
  if (lower.includes("miete") || lower.includes("raumkost")) return "miete_raum";
  if (lower.includes("werbung") || lower.includes("marketing") || lower.includes("anzeige")) return "werbung_marketing";
  if (lower.includes("beratung") || lower.includes("anwalt") || lower.includes("steuerberater") || lower.includes("notar")) return "beratung_recht";
  if (lower.includes("porto") || lower.includes("versand") || lower.includes("paket")) return "porto_versand";
  if (lower.includes("reparatur") || lower.includes("wartung") || lower.includes("instandhaltung")) return "reparatur_wartung";
  if (lower.includes("geschenk") || lower.includes("präsent")) return "geschenke";
  if (lower.includes("versicherung")) return "versicherung";
  return null;
}

/**
 * Erkennt Inkonsistenzen zwischen meeting_purpose / description und gesetzter tax_category.
 * Liefert einen Hinweistext oder null wenn alles konsistent ist.
 * Verwendet für GoBD-relevante Konsistenz-Warnungen im PDF und im Edit-Dialog.
 *
 * Beispiel: Tax-Category "bewirtung" mit Purpose "Fortbildung" → liefert Hinweis,
 * dass die Tax-Category möglicherweise auf "fortbildung" gehört.
 */
export function detectTaxCategoryInconsistency(
  taxCategory: string | null | undefined,
  purpose: string | null | undefined,
  description: string | null | undefined = null,
): { suggested: string; reason: string } | null {
  if (!taxCategory) return null;
  // Erst den Purpose, dann die Description abgrasen
  const guessed = guessTaxCategoryFromPurpose(purpose ?? null)
    ?? (description ? guessTaxCategoryFromPurpose(description) : null);
  if (!guessed) return null;
  if (guessed === taxCategory) return null;

  const labelFor = (key: string) => {
    const c = TAX_CATEGORIES.find((x) => x.value === key);
    return c?.label.de ?? key;
  };
  return {
    suggested: guessed,
    reason: `Der angegebene Zweck/die Beschreibung deutet auf „${labelFor(guessed)}" hin, aber die Kategorie ist „${labelFor(taxCategory)}".`,
  };
}

/**
 * Map AI-detected description/vendor to a tax category
 */
export function guessTaxCategoryFromScan(vendor: string | null, description: string | null, isFuel: boolean): string | null {
  if (isFuel) return "tankkosten";
  const text = [vendor, description].filter(Boolean).join(" ").toLowerCase();
  // Reisekosten
  if (text.match(/hotel|hostel|airbnb|übernachtung|booking|motel|pension/)) return "reisekosten_uebernachtung";
  if (text.match(/taxi|uber|bolt|bahn|db\b|flug|flight|zug|train|bus|sixt|hertz|mietwagen|rental car/)) return "reisekosten_fahrt";
  if (text.match(/maut|parkplatz|parking|garage|toll/)) return "reisekosten_nebenkosten";
  // Bewirtung
  if (text.match(/restaurant|gaststätte|bistro|café|cafe|essen|pizza|burger|bäckerei|bakery|backstuben|brauerei/)) return "bewirtung";
  // Tankkosten
  if (text.match(/tankstelle|shell|aral|total|esso|jet|agip|benzin|diesel|hem\b|sb-tanken/)) return "tankkosten";
  // Software & SaaS — VOR Telekommunikation prüfen
  if (text.match(/adobe|microsoft|office 365|m365|github|gitlab|slack|notion|figma|jetbrains|zoom|aws|azure|google cloud|gcp|supabase|vercel|netlify|cloudflare|lovable|openai|anthropic|claude|chatgpt|abo|subscription|saas|cursor|linear app|asana|monday\.com|hubspot|salesforce/)) return "software_saas";
  // Telekommunikation
  if (text.match(/telekom|vodafone|o2|telefon|internet|1&1|congstar|provider|dsl|glasfaser/)) return "telekommunikation";
  // Büromaterial
  if (text.match(/büro|office|staples|papier|drucker|tinte|toner|kugelschreiber|ordner/)) return "bueromaterial";
  // Miete / Raum
  if (text.match(/miete\b|coworking|wework|mindspace|büromiete|raumkosten/)) return "miete_raum";
  // Marketing / Werbung
  if (text.match(/google ads|facebook ads|meta ads|linkedin ads|werbung|marketing|seo|sea|werbeagentur|werbeanzeige/)) return "werbung_marketing";
  // Beratung
  if (text.match(/steuerberater|rechtsanwalt|notar|beratung|consulting|wirtschaftsprüfer|tax advisor|lawyer|kanzlei/)) return "beratung_recht";
  // Porto / Versand
  if (text.match(/deutsche post|dhl|ups|fedex|hermes|gls|dpd|versand|porto|paket|frachtbrief/)) return "porto_versand";
  // Bank-Gebühren
  if (text.match(/kontogebühr|kontoführung|bank-?gebühr|sparkasse.*gebühr|geldverkehr|kreditkartengebühr/)) return "bankgebuehren";
  // Reparatur / Wartung
  if (text.match(/reparatur|werkstatt|kfz-?werkstatt|wartung|service|inspektion|tüv|hu\b/)) return "reparatur_wartung";
  // Energie
  if (text.match(/stadtwerke|energie|strom\b|gas\b|heizung|fernwärme|wasserwerke|eon\b|rwe|envia/)) return "energie";
  // Versicherung
  if (text.match(/versicherung|allianz|axa|signal iduna|ergo|huk|generali|gothaer|haftpflicht/)) return "versicherung";
  // Fortbildung
  if (text.match(/seminar|workshop|fortbildung|weiterbildung|training|kurs|coaching|udemy|coursera|conference|konferenz/)) return "fortbildung";
  // Geschenke: Blumen, Wein, Pralinen, Schokolade als Geschäftsgeschenk.
  // Smart-Default: "geschenke_abziehbar" (≤ 50 € netto/Empfänger/Jahr seit 01.01.2024).
  // User muss bei Bedarf in die 4 Sub-Kategorien (streuwerbeartikel / abziehbar /
  // pauschal / nicht_abziehbar) wechseln — die App stupst nicht mehr in den
  // veralteten Sammel-Wert.
  if (text.match(/blumen|florist|geschenk|gift|wein\b|sekt|champagne|praline|schokolade|bonbonniere/)) return "geschenke_abziehbar";
  // Tabak: nicht abziehbar nach EStG, daher 'sonstiges'
  if (text.match(/tabak|zigarre|zigarette|tobacco|cigar/)) return "sonstiges";
  return null;
}
