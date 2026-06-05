export function toMoscowTime(timestamp: number): Date {
  const date = new Date(timestamp * 1000);
  return new Date(date.getTime() + 3 * 60 * 60 * 1000);
}

export function formatMoscowDate(timestamp: number): string {
  const moscowDate = toMoscowTime(timestamp);
  const day = moscowDate.getUTCDate().toString().padStart(2, "0");
  const month = (moscowDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = moscowDate.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

export function formatMoscowTime(timestamp: number): string {
  const moscowDate = toMoscowTime(timestamp);
  const hours = moscowDate.getUTCHours().toString().padStart(2, "0");
  const minutes = moscowDate.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatMoscowDateTime(timestamp: number, language: "ru" | "en" = "ru"): string {
  const moscowDate = toMoscowTime(timestamp);
  const day = moscowDate.getUTCDate().toString().padStart(2, "0");
  const months =
    language === "ru"
      ? [
          "января",
          "февраля",
          "марта",
          "апреля",
          "мая",
          "июня",
          "июля",
          "августа",
          "сентября",
          "октября",
          "ноября",
          "декабря",
        ]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
  const month = months[moscowDate.getUTCMonth()];
  const year = moscowDate.getUTCFullYear();
  return language === "ru" ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
}

export function getStartOfDay(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const startOfDay = new Date(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), moscowDate.getUTCDate());
  return Math.floor((startOfDay.getTime() - 3 * 60 * 60 * 1000) / 1000);
}

export function getStartOfMonth(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const startOfMonth = new Date(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), 1);
  return Math.floor((startOfMonth.getTime() - 3 * 60 * 60 * 1000) / 1000);
}

export function getStartOfWeek(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const dayOfWeek = moscowDate.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(
    moscowDate.getUTCFullYear(),
    moscowDate.getUTCMonth(),
    moscowDate.getUTCDate() - daysToMonday,
  );
  return Math.floor((startOfWeek.getTime() - 3 * 60 * 60 * 1000) / 1000);
}

export function getStartOfYear(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const startOfYear = new Date(moscowDate.getUTCFullYear(), 0, 1);
  return Math.floor((startOfYear.getTime() - 3 * 60 * 60 * 1000) / 1000);
}

export type Timeframe = "ALL" | "1D" | "1W" | "1M" | "3M" | "1Y";

export function timeframeToSeconds(timeframe: Timeframe): number {
  switch (timeframe) {
    case "ALL":
      return Number.MAX_SAFE_INTEGER;
    case "1D":
      return 24 * 60 * 60;
    case "1W":
      return 7 * 24 * 60 * 60;
    case "1M":
      return 30 * 24 * 60 * 60;
    case "3M":
      return 92 * 24 * 60 * 60;
    case "1Y":
      return 365 * 24 * 60 * 60;
  }
}

export interface CandleLike {
  time: unknown;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface AggregatedCandle extends CandleLike {
  dateStart: number;
  dateEnd: number;
  open: number;
  high: number;
  low: number;
  close: number;
  mental: number;
  physical: number;
  moral: number;
  financial: number;
}

export function getStartOfQuarter(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const quarterStartMonth = Math.floor(moscowDate.getUTCMonth() / 3) * 3;
  const startOfQuarter = new Date(moscowDate.getUTCFullYear(), quarterStartMonth, 1);
  return Math.floor((startOfQuarter.getTime() - 3 * 60 * 60 * 1000) / 1000);
}

export function getPeriodKey(date: Date | number, timeframe: Timeframe): string {
  const unixSeconds = typeof date === "number" ? date : Math.floor(date.getTime() / 1000);
  const moscowDate = toMoscowTime(unixSeconds);
  const year = moscowDate.getUTCFullYear();
  const month = moscowDate.getUTCMonth() + 1;

  switch (timeframe) {
    case "ALL":
    case "1D":
      return `${year}-${month.toString().padStart(2, "0")}-${moscowDate.getUTCDate().toString().padStart(2, "0")}`;
    case "1W":
      return `week-${getStartOfWeek(unixSeconds)}`;
    case "1M":
      return `${year}-${month.toString().padStart(2, "0")}`;
    case "3M":
      return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    case "1Y":
      return `${year}`;
  }
}

function getPeriodStart(unixSeconds: number, timeframe: Timeframe): number {
  switch (timeframe) {
    case "ALL":
    case "1D":
      return getStartOfDay(unixSeconds);
    case "1W":
      return getStartOfWeek(unixSeconds);
    case "1M":
      return getStartOfMonth(unixSeconds);
    case "3M":
      return getStartOfQuarter(unixSeconds);
    case "1Y":
      return getStartOfYear(unixSeconds);
  }
}

export function aggregateCandles<T extends CandleLike>(candles: T[], timeframe: Timeframe): T[] {
  const sorted = [...candles].sort((a, b) => (a.time as number) - (b.time as number));
  if (timeframe === "ALL" || timeframe === "1D") return sorted;

  const grouped = new Map<string, T[]>();
  sorted.forEach((candle) => {
    const key = getPeriodKey(candle.time as number, timeframe);
    const group = grouped.get(key);
    if (group) {
      group.push(candle);
    } else {
      grouped.set(key, [candle]);
    }
  });

  return Array.from(grouped.values())
    .map((group) => {
      const first = group[0];
      const last = group[group.length - 1];
      return {
        ...last,
        time: getPeriodStart(first.time as number, timeframe),
        open: first.open,
        high: Math.max(...group.map((candle) => candle.high)),
        low: Math.min(...group.map((candle) => candle.low)),
        close: last.close,
      };
    })
    .sort((a, b) => a.time - b.time);
}

export function formatPeriodLabel(unixSeconds: number, timeframe: Timeframe, _language: "ru" | "en" = "ru"): string {
  const moscowDate = toMoscowTime(unixSeconds);
  const day = moscowDate.getUTCDate().toString().padStart(2, "0");
  const month = (moscowDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = moscowDate.getUTCFullYear();
  const hours = moscowDate.getUTCHours().toString().padStart(2, "0");
  const minutes = moscowDate.getUTCMinutes().toString().padStart(2, "0");

  switch (timeframe) {
    case "ALL":
      return `${day}.${month}.${year}`;
    case "1D":
      return `${hours}:${minutes}`;
    case "1W":
      return `${day}.${month}`;
    case "1M":
      return `${month}.${year}`;
    case "3M":
      return `Q${Math.floor(moscowDate.getUTCMonth() / 3) + 1} ${year}`;
    case "1Y":
      return `${year}`;
  }
}

export function getPeriodBucket(unixSeconds: number, timeframe: Timeframe): number {
  return getPeriodStart(unixSeconds, timeframe);
}
