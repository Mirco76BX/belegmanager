import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "@/i18n/LanguageContext";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  onSelect?: () => void;
}

const ThemeToggle = ({ showLabel, className, onSelect }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const { lang } = useLanguage();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
    onSelect?.();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className={className}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel && (
        <span className="ml-3">{isDark ? (lang === "de" ? "Hellmodus" : "Light Mode") : (lang === "de" ? "Dunkelmodus" : "Dark Mode")}</span>
      )}
    </Button>
  );
};

export default ThemeToggle;
