import type { NewsEvent } from "@/components/LifeChart";
import {
  createInitialState,
  evaluate,
  explain,
  updateState,
  type Event as CoreEvent,
  type Goal,
  type SoulgraphState,
} from "@shared/soulgraphCore";

export interface GoalAnalysisEntry {
  id: string;
  direction: "toward" | "away" | "neutral";
  score: number;
  reason: string;
  dominantArea: string;
  text: string;
  time: number;
}

export interface GoalAnalysisResult {
  summary: string;
  towardEntries: GoalAnalysisEntry[];
  awayEntries: GoalAnalysisEntry[];
  neutralEntries: GoalAnalysisEntry[];
  suggestions: string[];
  totalEvents: number;
  stateScore: number;
  history: number[];
}

type GoalDimension = "mental" | "physical" | "moral" | "financial";
type GoalCoachLanguage = "ru" | "en";

const DIMENSION_LABELS: Record<GoalCoachLanguage, Record<GoalDimension, string>> = {
  ru: {
    mental: "фокус",
    physical: "энергия",
    moral: "отношения",
    financial: "финансы",
  },
  en: {
    mental: "focus",
    physical: "energy",
    moral: "relationships",
    financial: "finance",
  },
};

const GOAL_PATTERNS: Array<{ dimension: GoalDimension; patterns: string[] }> = [
  { dimension: "physical", patterns: ["здоров", "спорт", "трен", "бег", "сон", "энерг", "health", "sleep", "fitness"] },
  { dimension: "financial", patterns: ["деньг", "доход", "финанс", "работ", "карьер", "бизнес", "money", "income", "career"] },
  { dimension: "mental", patterns: ["учеб", "код", "фокус", "дисципл", "дум", "study", "learn", "skill", "focus"] },
  { dimension: "moral", patterns: ["отнош", "семь", "друз", "любов", "поддерж", "family", "friends", "relationship"] },
];

const NEGATIVE_AXES_BY_DIMENSION: Record<GoalDimension, string[]> = {
  mental: ["distraction", "doomscrolling", "chaos", "procrastination", "расфокус", "прокрастинация", "хаос"],
  physical: ["burnout", "fatigue", "sleep-debt", "вялость", "усталость", "недосып"],
  moral: ["conflict", "isolation", "stress", "конфликт", "изоляция", "ссора"],
  financial: ["overspending", "debt", "waste", "долг", "траты", "потери"],
};

const STOP_WORDS = new Set([
  "и", "в", "во", "на", "по", "для", "к", "ко", "из", "за", "не", "что", "это", "как",
  "a", "the", "to", "for", "of", "and", "or", "with",
]);

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-zа-я0-9\s-]/gi, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function detectGoalDimensions(goal: string): GoalDimension[] {
  const normalizedGoal = normalizeText(goal);
  const matches = GOAL_PATTERNS
    .filter((entry) => entry.patterns.some((pattern) => normalizedGoal.includes(pattern)))
    .map((entry) => entry.dimension);

  return matches.length > 0 ? matches : ["mental"];
}

function buildGoal(goalText: string, language: GoalCoachLanguage): Goal {
  const detectedDimensions = detectGoalDimensions(goalText);
  const goalTokens = tokenize(goalText).slice(0, 6);

  const positiveAxes = Array.from(
    new Set([
      ...detectedDimensions,
      ...detectedDimensions.map((dimension) => DIMENSION_LABELS[language][dimension]),
      ...goalTokens,
    ]),
  );

  const negativeAxes = Array.from(
    new Set(detectedDimensions.flatMap((dimension) => NEGATIVE_AXES_BY_DIMENSION[dimension])),
  );

  return {
    id: `goal:${goalText}`,
    title: goalText,
    directionVector: {
      positiveAxes,
      negativeAxes,
    },
  };
}

function dominantDimensionFromEvent(event: NewsEvent): GoalDimension {
  const dimensionScores: Record<GoalDimension, number> = {
    mental: Math.abs(event.impact.mental),
    physical: Math.abs(event.impact.physical),
    moral: Math.abs(event.impact.moral),
    financial: Math.abs(event.impact.financial),
  };

  return (Object.entries(dimensionScores) as Array<[GoalDimension, number]>).sort((a, b) => b[1] - a[1])[0][0];
}

function buildEventTags(event: NewsEvent, language: GoalCoachLanguage): string[] {
  const dominantDimension = dominantDimensionFromEvent(event);
  const textTags = tokenize(event.text).slice(0, 8);

  return Array.from(
    new Set([
      ...textTags,
      dominantDimension,
      DIMENSION_LABELS[language][dominantDimension],
      event.type === "positive" ? "progress" : "setback",
    ]),
  );
}

function toCoreEvent(event: NewsEvent, goalId: string, language: GoalCoachLanguage): CoreEvent {
  return {
    id: event.id || `${event.time}-${event.text}`,
    goalId,
    text: event.text,
    timestamp: Number(event.time),
    userSignal: event.type === "positive" ? "positive" : "negative",
    tags: buildEventTags(event, language),
    impactScore: 0,
  };
}

function directionFromScore(score: number): GoalAnalysisEntry["direction"] {
  if (score > 0) return "toward";
  if (score < 0) return "away";
  return "neutral";
}

function localizedExplain(score: number, language: GoalCoachLanguage): string {
  if (language === "ru") {
    if (score > 0) return "приближает к цели";
    if (score < 0) return "отдаляет от цели";
    return "нейтрально";
  }

  return explain({ impactScore: score });
}

function buildReason(event: CoreEvent, goal: Goal, score: number, dominantArea: string, language: GoalCoachLanguage): string {
  const positiveMatches = event.tags.filter((tag) =>
    goal.directionVector.positiveAxes.some((axis) => axis.toLowerCase() === tag.toLowerCase()),
  );
  const negativeMatches = event.tags.filter((tag) =>
    goal.directionVector.negativeAxes.some((axis) => axis.toLowerCase() === tag.toLowerCase()),
  );

  const parts: string[] = [localizedExplain(score, language)];

  if (positiveMatches.length > 0) {
    parts.push(
      language === "ru"
        ? `совпадает с осью цели: ${positiveMatches.slice(0, 2).join(", ")}`
        : `matches a goal axis: ${positiveMatches.slice(0, 2).join(", ")}`,
    );
  }

  if (negativeMatches.length > 0) {
    parts.push(
      language === "ru"
        ? `задевает зону риска: ${negativeMatches.slice(0, 2).join(", ")}`
        : `touches a risk axis: ${negativeMatches.slice(0, 2).join(", ")}`,
    );
  }

  parts.push(language === "ru" ? `сильнее всего влияет через ${dominantArea}` : `mostly affects the ${dominantArea} area`);

  return parts.join(", ");
}

function inferSuggestions(
  goal: Goal,
  state: SoulgraphState,
  awayEntries: GoalAnalysisEntry[],
  towardEntries: GoalAnalysisEntry[],
  language: GoalCoachLanguage,
): string[] {
  const suggestions: string[] = [];

  if (towardEntries.length === 0) {
    suggestions.push(
      language === "ru"
        ? "Добавь одно маленькое действие, которое прямо совпадает с направлением цели."
        : "Add one small action that directly matches the goal direction.",
    );
  }

  if (awayEntries.length > towardEntries.length) {
    suggestions.push(
      language === "ru"
        ? "Сейчас действий, которые уводят в сторону, больше. Сначала убери главный источник отклонения."
        : "Right now there are more actions that pull you away. Remove the main source of drift first.",
    );
  }

  if (state.score > 0) {
    suggestions.push(
      language === "ru"
        ? "Текущий курс положительный. Закрепи повторяющиеся действия, которые уже двигают тебя вперёд."
        : "The current direction is positive. Reinforce the repeated actions that already move you forward.",
    );
  } else if (state.score < 0) {
    suggestions.push(
      language === "ru"
        ? "Текущий курс проседает. Сфокусируйся на одной сильной положительной оси и убери один повторяющийся минус."
        : "The current direction is slipping. Focus on one strong positive axis and remove one repeating negative pattern.",
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      language === "ru"
        ? `Ориентируйся на оси цели: ${goal.directionVector.positiveAxes.slice(0, 3).join(", ")}.`
        : `Use these goal axes as your guide: ${goal.directionVector.positiveAxes.slice(0, 3).join(", ")}.`,
    );
  }

  return suggestions.slice(0, 3);
}

export function analyzeGoalProgress(goalText: string, events: NewsEvent[], language: GoalCoachLanguage = "ru"): GoalAnalysisResult | null {
  if (!goalText.trim()) {
    return null;
  }

  const goal = buildGoal(goalText.trim(), language);
  const sortedEvents = [...events].sort((a, b) => Number(a.time) - Number(b.time));
  let state = createInitialState();

  const entries = sortedEvents.map<GoalAnalysisEntry>((event) => {
    const coreEvent = toCoreEvent(event, goal.id, language);
    const impactScore = evaluate(coreEvent, goal);
    const updated = updateState(state, coreEvent, goal);
    state = updated.state;

    const dominantDimension = dominantDimensionFromEvent(event);
    const dominantArea = DIMENSION_LABELS[language][dominantDimension];

    return {
      id: coreEvent.id,
      direction: directionFromScore(impactScore),
      score: impactScore,
      reason: buildReason(coreEvent, goal, impactScore, dominantArea, language),
      dominantArea,
      text: event.text,
      time: Number(event.time),
    };
  });

  const towardEntries = entries.filter((entry) => entry.direction === "toward").sort((a, b) => b.score - a.score);
  const awayEntries = entries.filter((entry) => entry.direction === "away").sort((a, b) => a.score - b.score);
  const neutralEntries = entries.filter((entry) => entry.direction === "neutral");

  const summary =
    entries.length === 0
      ? language === "ru"
        ? "За выбранный период пока нет событий для расчёта движения."
        : "There are no events in the selected period yet, so movement cannot be calculated."
      : state.score > 0
        ? language === "ru"
          ? `Курс по цели положительный: ${state.score.toFixed(1)}. Больше действий усиливают движение вперёд.`
          : `Goal direction is positive: ${state.score.toFixed(1)}. More actions are reinforcing forward movement.`
        : state.score < 0
          ? language === "ru"
            ? `Курс по цели отрицательный: ${state.score.toFixed(1)}. Сейчас больше действий, которые уводят в сторону.`
            : `Goal direction is negative: ${state.score.toFixed(1)}. Right now more actions are pulling you away.`
          : language === "ru"
            ? "Курс по цели нейтральный: пока нет устойчивого движения ни в плюс, ни в минус."
            : "Goal direction is neutral: there is no stable movement in either direction yet.";

  return {
    summary,
    towardEntries,
    awayEntries,
    neutralEntries,
    suggestions: inferSuggestions(goal, state, awayEntries, towardEntries, language),
    totalEvents: entries.length,
    stateScore: state.score,
    history: state.history,
  };
}
