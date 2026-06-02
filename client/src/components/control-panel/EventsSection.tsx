import { TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ControlPanelText } from "./types";

interface EventsSectionProps {
  t: ControlPanelText;
  onAddPositiveNews: () => void;
  onAddNegativeNews: () => void;
}

export function EventsSection({ t, onAddPositiveNews, onAddNegativeNews }: EventsSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-background/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.events}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.eventsHint}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.eventsHintShort}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Button onClick={onAddPositiveNews} className="min-w-0 justify-start gap-1 bg-positive px-1.5 text-[11px] leading-none text-white hover:bg-positive/90 sm:px-2 sm:text-[12px]" data-testid="button-add-positive-news">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate text-left">{t.plus}</span>
        </Button>
        <Button onClick={onAddNegativeNews} className="min-w-0 justify-start gap-1 bg-negative px-1.5 text-[11px] leading-none text-white hover:bg-negative/90 sm:px-2 sm:text-[12px]" data-testid="button-add-negative-news">
          <TrendingDown className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate text-left">{t.minus}</span>
        </Button>
      </div>
    </section>
  );
}
