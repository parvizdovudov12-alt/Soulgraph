export type UserSignal = "positive" | "negative" | "neutral";

export interface GoalDirectionVector {
  positiveAxes: string[];
  negativeAxes: string[];
}

export interface Goal {
  id: string;
  title: string;
  directionVector: GoalDirectionVector;
}

export interface Event {
  id: string;
  goalId: string;
  text: string;
  timestamp: number;
  userSignal: UserSignal;
  tags: string[];
  impactScore: number;
}

export interface SoulgraphState {
  score: number;
  history: number[];
}

export interface EvaluatedEvent extends Event {
  impactScore: number;
}

const SCORE_DECAY = 0.95;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function hasAxisMatch(tags: string[], axes: string[]): boolean {
  if (tags.length === 0 || axes.length === 0) return false;

  const normalizedTags = new Set(tags.map(normalizeTag));
  return axes.some((axis) => normalizedTags.has(normalizeTag(axis)));
}

export function evaluate(event: Event, goal: Goal): number {
  let base = 0;

  if (event.userSignal === "positive") base += 1;
  if (event.userSignal === "negative") base -= 1;

  const hasPositiveMatch = hasAxisMatch(event.tags, goal.directionVector.positiveAxes);
  const hasNegativeMatch = hasAxisMatch(event.tags, goal.directionVector.negativeAxes);

  if (hasPositiveMatch) base += 2;
  if (hasNegativeMatch) base -= 2;

  if (!hasPositiveMatch && !hasNegativeMatch) {
    base *= 0.2;
  }

  return clamp(base, -5, 5);
}

export function updateState(
  state: SoulgraphState,
  event: Event,
  goal: Goal,
): { state: SoulgraphState; event: EvaluatedEvent } {
  const impactScore = evaluate(event, goal);
  const nextScore = state.score * SCORE_DECAY + impactScore;
  const evaluatedEvent: EvaluatedEvent = {
    ...event,
    impactScore,
  };

  return {
    event: evaluatedEvent,
    state: {
      score: nextScore,
      history: [...state.history, nextScore],
    },
  };
}

export function explain(event: Pick<Event, "impactScore">): string {
  if (event.impactScore > 0) return "moves you closer to goal";
  if (event.impactScore < 0) return "moves you away";
  return "neutral";
}

export function createInitialState(): SoulgraphState {
  return {
    score: 0,
    history: [],
  };
}

export const soulgraphCoreExample = {
  goal: {
    id: "goal-1",
    title: "Build a calmer, more focused work rhythm",
    directionVector: {
      positiveAxes: ["focus", "sleep", "discipline"],
      negativeAxes: ["doomscrolling", "burnout", "chaos"],
    },
  } satisfies Goal,
  event: {
    id: "event-1",
    goalId: "goal-1",
    text: "Worked deeply for two hours without distractions",
    timestamp: Date.now(),
    userSignal: "positive" as const,
    tags: ["focus", "discipline"],
    impactScore: 0,
  } satisfies Event,
};
