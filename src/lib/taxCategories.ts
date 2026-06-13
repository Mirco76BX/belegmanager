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
  if (lower.includes("bewirtung") || lower.includes("geschäftsessen")) return "bewirtung";
  if (lower.includes("tanken") || lower.includes("fuel")) return "tankkosten";
  if (lower.includes("reise")) return "reisekosten_nebenkosten";
  if (lower.includes("büro")) return "bueromaterial";
  if (lower.includes("fortbildung") || lower.includes("training")) return "fortbildung";
  if (lower.includes("telefon") || lower.includes("internet")) return "telekommunikation";
  if (lower.includes("akquise")) return "bewirtung";
  return null;
}

/**
 * Map AI-detected description/vendor to a tax category
 */
export function guessTaxCategoryFromScan(vendor: string | null, description: string | null, isFuel: boolean): string | null {
  if (isFuel) return "tankkosten";
  const text = [vendor, description].filter(Boolean).join(" ").toLowerCase();
  if (text.match(/hotel|hostel|airbnb|übernachtung|booking/)) return "reisekosten_uebernachtung";
  if (text.match(/taxi|uber|bahn|flug|flight|zug|train|bus/)) return "reisekosten_fahrt";
  if (text.match(/restaurant|gaststätte|bistro|café|essen|pizza|burger/)) return "bewirtung";
  if (text.match(/tankstelle|shell|aral|total|esso|jet|agip|benzin|diesel/)) return "tankkosten";
  if (text.match(/büro|office|staples|papier|drucker/)) return "bueromaterial";
  if (text.match(/telekom|vodafone|o2|telefon|internet|1&1/)) return "telekommunikation";
  return null;
}
