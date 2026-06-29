import { useEffect, useId, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  invalid?: boolean;
}

const DEFAULT_PURPOSES_DE = [
  "Projektbesprechung",
  "Kundenakquise",
  "Vertragsverhandlung",
  "Strategiegespräch",
  "Networking-Lunch",
  "Vorstellungsgespräch",
];

const DEFAULT_PURPOSES_EN = [
  "Project meeting",
  "Customer acquisition",
  "Contract negotiation",
  "Strategy discussion",
  "Networking lunch",
  "Job interview",
];

/**
 * Editable input with autocomplete suggestions from the user's prior
 * meeting_purpose values plus a static defaults list.
 * Steuerlich: bleibt frei editierbar (§ 4 Abs. 5 EStG verlangt konkrete Anlässe).
 */
const PurposeAutocomplete = ({ value, onChange, className, placeholder, invalid }: Props) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const listId = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("receipts")
        .select("meeting_purpose, created_at")
        .not("meeting_purpose", "is", null)
        .order("created_at", { ascending: false })
        .limit(80);
      const seen = new Set<string>();
      const list: string[] = [];
      for (const r of data || []) {
        const p = (r as any).meeting_purpose?.trim();
        if (p && !seen.has(p.toLowerCase())) {
          seen.add(p.toLowerCase());
          list.push(p);
          if (list.length >= 20) break;
        }
      }
      const defaults = lang === "de" ? DEFAULT_PURPOSES_DE : DEFAULT_PURPOSES_EN;
      for (const d of defaults) {
        if (!seen.has(d.toLowerCase())) {
          seen.add(d.toLowerCase());
          list.push(d);
        }
      }
      setSuggestions(list);
    })();
  }, [user, lang]);

  return (
    <>
      <Input
        value={value}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className || ""} ${invalid ? "border-destructive ring-1 ring-destructive/40" : ""}`}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
};

export default PurposeAutocomplete;
