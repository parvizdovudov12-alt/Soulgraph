type GoalAiLanguage = "ru" | "en";

export interface GoalAiEventInput {
  id?: string;
  time: number;
  type: "positive" | "negative";
  text: string;
  impact: {
    mental: number;
    physical: number;
    moral: number;
    financial: number;
  };
}

export interface GoalAiRequest {
  goal: string;
  timeframe: string;
  language: GoalAiLanguage;
  events: GoalAiEventInput[];
}

export interface GoalAiResult {
  summary: string;
  helpfulActions: string[];
  mistakes: string[];
  nextSteps: string[];
  focusArea: string;
  encouragement: string;
  model: string;
  generatedAt: string;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function isGoalAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildSystemPrompt(language: GoalAiLanguage) {
  if (language === "ru") {
    return [
      "Ты — AI-коуч внутри приложения Soulgraph.",
      "Твоя задача: проанализировать цель пользователя и события за выбранный период.",
      "Нужно очень практично показать:",
      "1. какие действия реально приближают к цели,",
      "2. какие действия или паттерны отдаляют,",
      "3. какие ошибки пользователь повторяет,",
      "4. на чем сфокусироваться дальше.",
      "Пиши коротко, конкретно, без воды и без морализаторства.",
      "Не придумывай факты, опирайся только на цель и события.",
      "Если данных мало — прямо скажи об этом и дай осторожные рекомендации.",
      "Верни строго JSON по схеме.",
    ].join(" ");
  }

  return [
    "You are an AI goal coach inside Soulgraph.",
    "Analyze the user's goal and the events from the selected period.",
    "Show in a practical way:",
    "1. which actions move the user closer to the goal,",
    "2. which actions or patterns pull the user away,",
    "3. which mistakes repeat,",
    "4. what to focus on next.",
    "Be concise, concrete, and useful.",
    "Do not invent facts. Use only the provided goal and events.",
    "If the data is thin, say so clearly and give cautious suggestions.",
    "Return strict JSON only.",
  ].join(" ");
}

function buildUserPayload(payload: GoalAiRequest) {
  const trimmedEvents = [...payload.events]
    .sort((a, b) => a.time - b.time)
    .slice(-40)
    .map((event) => ({
      id: event.id ?? null,
      time: event.time,
      type: event.type,
      text: event.text,
      impact: event.impact,
    }));

  return {
    goal: payload.goal,
    timeframe: payload.timeframe,
    language: payload.language,
    events: trimmedEvents,
  };
}

function extractOutputText(responseJson: any): string {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text.trim()) {
    return responseJson.output_text;
  }

  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  const textParts: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") {
        textParts.push(part.text);
      }
    }
  }

  return textParts.join("").trim();
}

const RU_STOP_WORDS = new Set([
  "и",
  "в",
  "во",
  "на",
  "но",
  "не",
  "с",
  "со",
  "по",
  "за",
  "из",
  "от",
  "для",
  "что",
  "это",
  "как",
  "или",
  "я",
  "ты",
  "мы",
  "он",
  "она",
  "они",
  "а",
  "у",
  "к",
  "до",
  "после",
  "день",
  "час",
  "был",
  "была",
  "было",
  "были",
]);

const EN_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "you",
  "are",
  "was",
  "were",
  "had",
  "have",
  "has",
  "not",
  "but",
  "too",
  "day",
  "hour",
  "about",
  "just",
  "then",
  "than",
  "when",
  "after",
  "before",
]);

function getTopKeywords(texts: string[], language: GoalAiLanguage, limit = 3) {
  const stopWords = language === "ru" ? RU_STOP_WORDS : EN_STOP_WORDS;
  const counts = new Map<string, number>();
  const sanitizePattern = /[^A-Za-zА-Яа-яЁё0-9\s-]/g;

  for (const text of texts) {
    const normalizedWords = text
      .toLowerCase()
      .replace(sanitizePattern, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !stopWords.has(word));

    for (const word of normalizedWords) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function sumImpact(event: GoalAiEventInput) {
  return event.impact.mental + event.impact.physical + event.impact.moral + event.impact.financial;
}

function buildFallbackAnalysis(payload: GoalAiRequest): GoalAiResult {
  const totals = payload.events.reduce(
    (acc, event) => {
      acc.mental += event.impact.mental;
      acc.physical += event.impact.physical;
      acc.moral += event.impact.moral;
      acc.financial += event.impact.financial;
      return acc;
    },
    { mental: 0, physical: 0, moral: 0, financial: 0 },
  );

  const dimensions = [
    { labelRu: "ментальном состоянии", labelEn: "mental stability", value: totals.mental },
    { labelRu: "физическом состоянии", labelEn: "physical energy", value: totals.physical },
    { labelRu: "душевном состоянии", labelEn: "spiritual balance", value: totals.moral },
    { labelRu: "финансовой дисциплине", labelEn: "financial discipline", value: totals.financial },
  ] as const;

  const strongest = [...dimensions].sort((a, b) => b.value - a.value)[0];
  const weakest = [...dimensions].sort((a, b) => a.value - b.value)[0];
  const positives = payload.events.filter((event) => event.type === "positive");
  const negatives = payload.events.filter((event) => event.type === "negative");
  const strongestPositive = [...positives].sort((a, b) => sumImpact(b) - sumImpact(a))[0];
  const strongestNegative = [...negatives].sort((a, b) => sumImpact(a) - sumImpact(b))[0];
  const negativeKeywords = getTopKeywords(negatives.map((event) => event.text), payload.language);
  const positiveKeywords = getTopKeywords(positives.map((event) => event.text), payload.language);
  const netScore = dimensions.reduce((sum, dimension) => sum + dimension.value, 0);
  const hasRepeatedNegativePattern = negativeKeywords.length > 0 && negatives.length >= 2;

  if (payload.language === "ru") {
    const summary =
      positives.length === 0 && negatives.length === 0
        ? "Пока слишком мало событий для уверенного вывода. Начни фиксировать все заметные действия за день."
        : netScore >= 0
          ? `[AI fallback] По выбранному периоду курс к цели "${payload.goal}" пока держится, но требует контроля: сильнее всего тебя поддерживает фокус на ${strongest.labelRu}, а просадка заметнее всего в ${weakest.labelRu}.`
          : `[AI fallback] По выбранному периоду видно отклонение от цели "${payload.goal}": сейчас сильнее всего тебя тянет вниз ${weakest.labelRu}, хотя опора всё ещё есть в ${strongest.labelRu}.`;

    const helpfulActions =
      positives.length > 0
        ? [
            strongestPositive?.text,
            positiveKeywords.length > 0
              ? `Повтори действия, связанные с: ${positiveKeywords.join(", ")}.`
              : undefined,
            `Сохраняй события, которые усиливают ${strongest.labelRu}.`,
          ].filter((value): value is string => Boolean(value))
        : ["Фиксируй даже небольшие удачные действия, чтобы система увидела, что тебя реально продвигает."];

    const mistakes =
      negatives.length > 0
        ? [
            strongestNegative?.text,
            hasRepeatedNegativePattern
              ? `Повторяется паттерн вокруг: ${negativeKeywords.join(", ")}.`
              : "Есть негативные события, но паттерн пока ещё неустойчив.",
            `Главный урон сейчас идёт по ${weakest.labelRu}.`,
          ].filter((value): value is string => Boolean(value))
        : ["Пока нет явных ошибок в событиях, но нужно больше данных за день."];

    return {
      summary,
      helpfulActions,
      mistakes,
      nextSteps: [
        `Сохраняй все события за ${payload.timeframe}, даже если они кажутся мелкими.`,
        hasRepeatedNegativePattern
          ? `Сначала сократи повторяющийся паттерн: ${negativeKeywords.join(", ")}.`
          : `Проверь, какие действия сильнее всего бьют по ${weakest.labelRu}.`,
        strongestPositive
          ? `Повтори сегодня действие из события: "${strongestPositive.text}".`
          : `Сделай 1 конкретный шаг к цели "${payload.goal}" уже сегодня.`,
      ],
      focusArea: `Сейчас главный фокус: восстановить устойчивость в ${weakest.labelRu}.`,
      encouragement: "Ты уже строишь карту своих паттернов. Чем честнее события, тем точнее станет помощь.",
      model: "local-fallback-v2",
      generatedAt: new Date().toISOString(),
    };
  }

  const summary =
    positives.length === 0 && negatives.length === 0
      ? "There is not enough event data yet for a confident conclusion. Start logging every noticeable action during the day."
      : netScore >= 0
        ? `[AI fallback] For the selected period, your goal "${payload.goal}" is still supported overall, but it needs control: your strongest support comes from ${strongest.labelEn}, while the main drop shows up in ${weakest.labelEn}.`
        : `[AI fallback] For the selected period, your goal "${payload.goal}" is drifting off course: the main drag is in ${weakest.labelEn}, even though you still have support in ${strongest.labelEn}.`;

  const helpfulActions =
    positives.length > 0
      ? [
          strongestPositive?.text,
          positiveKeywords.length > 0 ? `Repeat actions connected to: ${positiveKeywords.join(", ")}.` : undefined,
          `Keep actions that strengthen ${strongest.labelEn}.`,
        ].filter((value): value is string => Boolean(value))
      : ["Log even small wins so the system can learn what genuinely helps you move forward."];

  const mistakes =
    negatives.length > 0
      ? [
          strongestNegative?.text,
          hasRepeatedNegativePattern
            ? `A repeating pattern is building around: ${negativeKeywords.join(", ")}.`
            : "There are negative events, but the pattern is not stable enough yet.",
          `The main damage right now is in ${weakest.labelEn}.`,
        ].filter((value): value is string => Boolean(value))
      : ["There are no clear mistakes yet, but the system needs more daily data."];

  return {
    summary,
    helpfulActions,
    mistakes,
    nextSteps: [
      `Keep logging all events for ${payload.timeframe}, even the small ones.`,
      hasRepeatedNegativePattern
        ? `Reduce the recurring pattern around: ${negativeKeywords.join(", ")}.`
        : `Check which actions are weakening ${weakest.labelEn} the most.`,
      strongestPositive
        ? `Repeat today the action from: "${strongestPositive.text}".`
        : `Take one concrete action toward "${payload.goal}" today.`,
    ],
    focusArea: `Main focus right now: rebuild stability in ${weakest.labelEn}.`,
    encouragement: "You are already mapping your own patterns. The more honest your events are, the smarter the guidance becomes.",
    model: "local-fallback-v2",
    generatedAt: new Date().toISOString(),
  };
}

export async function analyzeGoalWithAi(payload: GoalAiRequest): Promise<GoalAiResult> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackAnalysis(payload);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: buildSystemPrompt(payload.language) }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(buildUserPayload(payload)),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "soulgraph_goal_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              helpfulActions: {
                type: "array",
                items: { type: "string" },
              },
              mistakes: {
                type: "array",
                items: { type: "string" },
              },
              nextSteps: {
                type: "array",
                items: { type: "string" },
              },
              focusArea: { type: "string" },
              encouragement: { type: "string" },
            },
            required: ["summary", "helpfulActions", "mistakes", "nextSteps", "focusArea", "encouragement"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);
  if (!outputText) {
    throw new Error("OpenAI response did not include parsable text.");
  }

  const parsed = JSON.parse(outputText) as Omit<GoalAiResult, "model" | "generatedAt">;

  return {
    ...parsed,
    model: DEFAULT_MODEL,
    generatedAt: new Date().toISOString(),
  };
}
