import type { NewsEvent as DBNewsEvent } from "@shared/schema";

const STORAGE_KEY = "soulgraph-dashboard-state";

export type TaskImpact = {
  mental: number;
  physical: number;
  moral: number;
  financial: number;
};

export interface LocalDashboardState {
  lastKnownGoal: string;
  pendingGoal: string | null;
  lastKnownEvents: DBNewsEvent[];
  pendingEvents: DBNewsEvent[];
  dailyTasks: DailyTask[];
  completedGoals: CompletedGoal[];
}

export interface DailyTask {
  id: string;
  text: string;
  impact: TaskImpact;
  createdAt: string;
  completedDates: string[];
  pinned: boolean;
  orderIndex: number;
}

export interface CompletedGoal {
  goal: string;
  completedAt: string;
}

const defaultState: LocalDashboardState = {
  lastKnownGoal: "",
  pendingGoal: null,
  lastKnownEvents: [],
  pendingEvents: [],
  dailyTasks: [],
  completedGoals: [],
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeEvent(event: DBNewsEvent): DBNewsEvent {
  return {
    ...event,
    createdAt: event.createdAt ? new Date(event.createdAt) : null,
  };
}

export function readLocalDashboardState(): LocalDashboardState {
  if (!isBrowser()) {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as Partial<LocalDashboardState>;
    return {
      lastKnownGoal: typeof parsed.lastKnownGoal === "string" ? parsed.lastKnownGoal : "",
      pendingGoal: typeof parsed.pendingGoal === "string" ? parsed.pendingGoal : null,
      lastKnownEvents: Array.isArray(parsed.lastKnownEvents) ? parsed.lastKnownEvents.map(normalizeEvent) : [],
      pendingEvents: Array.isArray(parsed.pendingEvents) ? parsed.pendingEvents.map(normalizeEvent) : [],
      dailyTasks: Array.isArray(parsed.dailyTasks) ? parsed.dailyTasks.map(normalizeDailyTask) : [],
      completedGoals: Array.isArray(parsed.completedGoals) ? parsed.completedGoals.map(normalizeCompletedGoal) : [],
    };
  } catch {
    return defaultState;
  }
}

function normalizeCompletedGoal(goal: CompletedGoal): CompletedGoal {
  return {
    goal: typeof goal.goal === "string" ? goal.goal : "",
    completedAt: typeof goal.completedAt === "string" ? goal.completedAt : new Date().toISOString(),
  };
}

function normalizeDailyTask(task: DailyTask): DailyTask {
  return {
    id: typeof task.id === "string" ? task.id : `task-${Date.now()}`,
    text: typeof task.text === "string" ? task.text : "",
    impact: normalizeTaskImpact(task.impact),
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
    completedDates: Array.isArray(task.completedDates)
      ? task.completedDates.filter((date) => typeof date === "string")
      : [],
    pinned: task.pinned === true,
    orderIndex: typeof task.orderIndex === "number" && Number.isFinite(task.orderIndex) ? task.orderIndex : 0,
  };
}

export function normalizeTaskImpact(impact?: Partial<TaskImpact> | null): TaskImpact {
  return {
    mental: normalizeImpactValue(impact?.mental),
    physical: normalizeImpactValue(impact?.physical),
    moral: normalizeImpactValue(impact?.moral),
    financial: normalizeImpactValue(impact?.financial),
  };
}

function normalizeImpactValue(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-1000, Math.min(1000, Math.round(numeric)));
}

export function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function writeLocalDashboardState(nextState: LocalDashboardState) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export function updateLocalDashboardState(
  updater: (current: LocalDashboardState) => LocalDashboardState,
): LocalDashboardState {
  const nextState = updater(readLocalDashboardState());
  writeLocalDashboardState(nextState);
  return nextState;
}

export function mergeDashboardEvents(
  serverEvents: DBNewsEvent[],
  localState: LocalDashboardState,
): DBNewsEvent[] {
  const merged = new Map<string, DBNewsEvent>();

  for (const event of serverEvents.length > 0 ? serverEvents : localState.lastKnownEvents) {
    merged.set(event.id, normalizeEvent(event));
  }

  for (const event of localState.pendingEvents) {
    merged.set(event.id, normalizeEvent(event));
  }

  return Array.from(merged.values()).sort((a, b) => a.time - b.time);
}
