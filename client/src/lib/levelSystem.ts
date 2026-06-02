import type { NewsEvent } from "@/components/LifeChart";
import type { DailyTask } from "@/lib/localDashboardState";

export interface LevelProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  rankName: string;
  progress: number;
  totalXp: number;
}

function xpNeededForLevel(level: number) {
  return 100 + (level - 1) * 45;
}

function getRankName(level: number, language: string) {
  const ranks =
    language === "ru"
      ? [
          { min: 1, name: "Искра роста" },
          { min: 3, name: "Практик" },
          { min: 6, name: "Собранный" },
          { min: 10, name: "Созидатель" },
          { min: 15, name: "Проводник" },
          { min: 22, name: "Мастер пути" },
        ]
      : [
          { min: 1, name: "Growth Spark" },
          { min: 3, name: "Practitioner" },
          { min: 6, name: "Centered" },
          { min: 10, name: "Builder" },
          { min: 15, name: "Guide" },
          { min: 22, name: "Path Master" },
        ];

  return ranks.reduce((current, rank) => (level >= rank.min ? rank.name : current), ranks[0].name);
}

function getImpactXp(event: NewsEvent) {
  const impactTotal = Object.values(event.impact).reduce((sum, value) => sum + Math.abs(value), 0);
  return Math.min(30, Math.round(impactTotal / 8));
}

function countStableDays(tasks: DailyTask[]) {
  const days = new Set<string>();

  tasks.forEach((task) => {
    task.completedDates.forEach((date) => days.add(date));
  });

  return days.size;
}

export function calculateLevelProgress({
  events,
  tasks,
  language,
}: {
  events: NewsEvent[];
  tasks: DailyTask[];
  language: string;
}): LevelProgress {
  const taskCompletionXp = tasks.reduce((sum, task) => sum + task.completedDates.length * 18, 0);
  const eventXp = events.reduce((sum, event) => {
    const base = event.type === "positive" ? 14 : 6;
    return sum + base + getImpactXp(event);
  }, 0);
  const stabilityXp = countStableDays(tasks) * 12;
  const totalXp = Math.max(0, taskCompletionXp + eventXp + stabilityXp);

  let level = 1;
  let xp = totalXp;
  let xpToNextLevel = xpNeededForLevel(level);

  while (xp >= xpToNextLevel) {
    xp -= xpToNextLevel;
    level += 1;
    xpToNextLevel = xpNeededForLevel(level);
  }

  return {
    level,
    xp,
    xpToNextLevel,
    rankName: getRankName(level, language),
    progress: xpToNextLevel > 0 ? Math.round((xp / xpToNextLevel) * 100) : 0,
    totalXp,
  };
}
