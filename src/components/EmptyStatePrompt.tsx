import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel: string;
  onCtaClick: () => void;
  variant?: "default" | "compact";
}

/**
 * Reusable empty-state prompt for dropdowns/fields with no data yet.
 * Use anywhere a Select/Picker would otherwise be silent and leave the
 * user stuck (Organization, Vehicle, Advisor, DATEV-IDs, …).
 */
const EmptyStatePrompt = ({ icon: Icon, title, description, ctaLabel, onCtaClick, variant = "default" }: Props) => {
  const compact = variant === "compact";
  return (
    <div className={`flex ${compact ? "items-center gap-3 p-3" : "flex-col items-center text-center gap-2 p-4"} rounded-lg border border-dashed border-border bg-muted/30`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className={`${compact ? "flex-1 min-w-0" : ""}`}>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Button size="sm" onClick={onCtaClick} className={compact ? "" : "mt-1"}>
        {ctaLabel}
      </Button>
    </div>
  );
};

export default EmptyStatePrompt;
