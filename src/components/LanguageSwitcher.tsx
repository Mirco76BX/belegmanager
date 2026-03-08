import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

interface LanguageSwitcherProps {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "icon";
  className?: string;
  /** Show full label like sidebar style */
  showLabel?: boolean;
  onSelect?: () => void;
}

const LanguageSwitcher = ({ variant = "ghost", size = "sm", className = "", showLabel = false, onSelect }: LanguageSwitcherProps) => {
  const { lang, setLang } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={`gap-1.5 ${className}`}>
          <Globe className="h-3.5 w-3.5" />
          {showLabel ? (
            <span>{current.flag} {current.label}</span>
          ) : (
            <span>{lang.toUpperCase()}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => { setLang(l.code); onSelect?.(); }}
            className={`gap-2 ${l.code === lang ? "font-semibold bg-accent/50" : ""}`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
