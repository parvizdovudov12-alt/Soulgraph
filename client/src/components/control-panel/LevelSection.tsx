import { TrendingUp } from "lucide-react";
import type { ControlPanelText } from "./types";
import type { LevelProgress } from "@/lib/levelSystem";

interface LevelSectionProps {
  t: ControlPanelText;
  levelProgress: LevelProgress;
}

export function LevelSection({ t, levelProgress }: LevelSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-background/50 p-3" data-testid="level-section">
      <div className="rounded-md border border-[#7cf3b8]/35 bg-[linear-gradient(135deg,#9AF6C2,#36C98B)] px-2.5 py-2 text-[#07130f] shadow-[0_8px_18px_rgba(54,201,139,0.18)]">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#07130f]/10 text-[#07130f]">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-[#103326]/75">{t.levelTitle}</p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <span className="text-lg font-semibold leading-none">{levelProgress.level}</span>
              <span className="min-w-0 truncate text-[12px] font-semibold leading-none text-[#103326]/90">{levelProgress.rankName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{t.levelProgress}</span>
          <span className="font-medium text-foreground">
            {levelProgress.xp}/{levelProgress.xpToNextLevel} XP
          </span>
        </div>
        <div
          className="relative h-3 overflow-hidden rounded-full border border-[#36C98B]/25 bg-[#07130f]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={levelProgress.progress}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#36C98B,#F3B35A)] shadow-[0_0_10px_rgba(54,201,139,0.34)] transition-[width] duration-500"
            style={{ width: `${Math.max(6, Math.min(100, levelProgress.progress))}%` }}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t.levelHint}</p>
      </div>
    </section>
  );
}
