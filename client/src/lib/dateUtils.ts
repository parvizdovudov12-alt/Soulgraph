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

export function getStartOfIntradayInterval(unixSeconds: number, intervalSeconds: number): number {
  const startOfDay = getStartOfDay(unixSeconds);
  const secondsSinceDayStart = Math.max(0, unixSeconds - startOfDay);
  return startOfDay + Math.floor(secondsSinceDayStart / intervalSeconds) * intervalSeconds;
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

export type Timeframe = "30S" | "1M" | "30M" | "1H" | "4H" | "1D";

export function timeframeToSeconds(timeframe: Timeframe): number {
  switch (timeframe) {
    case "30S":
      return 30;
    case "1M":
      return 60;
    case "30M":
      return 30 * 60;
    case "1H":
      return 60 * 60;
    case "4H":
      return 4 * 60 * 60;
    case "1D":
      return 24 * 60 * 60;
  }
}

export interface AggregatedCandle {
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

export function aggregateCandles(
  dailyData: Array<{ time: number; mental: number; physical: number; moral: number; financial: number }>,
  days: number,
): AggregatedCandle[] {
  if (dailyData.length === 0) return [];

  const sorted = [...dailyData].sort((a, b) => a.time - b.time);
  const candles: AggregatedCandle[] = [];
  let currentGroup: typeof sorted = [];
  let groupStartTime = sorted[0].time;

  for (let i = 0; i < sorted.length; i += 1) {
    const point = sorted[i];
    const daysSinceStart = Math.floor((point.time - groupStartTime) / (24 * 60 * 60));

    if (daysSinceStart >= days) {
      if (currentGroup.length > 0) {
        candles.push(createCandleFromGroup(currentGroup));
      }
      currentGroup = [point];
      groupStartTime = point.time;
    } else {
      currentGroup.push(point);
    }
  }

  if (currentGroup.length > 0) {
    candles.push(createCandleFromGroup(currentGroup));
  }

  return candles;
}

function createCandleFromGroup(
  group: Array<{ time: number; mental: number; physical: number; moral: number; financial: number }>,
): AggregatedCandle {
  const values = group.map((point) => (point.mental + point.physical + point.moral + point.financial) / 4);
  const last = group[group.length - 1];

  return {
    dateStart: group[0].time,
    dateEnd: group[group.length - 1].time,
    open: values[0],
    high: Math.max(...values),
    low: Math.min(...values),
    close: values[values.length - 1],
    mental: last.mental,
    physical: last.physical,
    moral: last.moral,
    financial: last.financial,
  };
}

export function formatPeriodLabel(unixSeconds: number, timeframe: Timeframe, _language: "ru" | "en" = "ru"): string {
  const moscowDate = toMoscowTime(unixSeconds);
  const day = moscowDate.getUTCDate().toString().padStart(2, "0");
  const month = (moscowDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = moscowDate.getUTCFullYear();
  const hours = moscowDate.getUTCHours().toString().padStart(2, "0");
  const minutes = moscowDate.getUTCMinutes().toString().padStart(2, "0");

  switch (timeframe) {
    case "30S":
    case "1M":
    case "30M":
    case "1H":
    case "4H":
      return `${day}.${month} ${hours}:${minutes}`;
    case "1D":
      return `${day}.${month}.${year}`;
  }
}

export function getPeriodKey(unixSeconds: number, timeframe: Timeframe): number {
  switch (timeframe) {
    case "30S":
      return getStartOfIntradayInterval(unixSeconds, 30);
    case "1M":
      return getStartOfIntradayInterval(unixSeconds, 60);
    case "30M":
      return getStartOfIntradayInterval(unixSeconds, 30 * 60);
    case "1H":
      return getStartOfIntradayInterval(unixSeconds, 60 * 60);
    case "4H":
      return getStartOfIntradayInterval(unixSeconds, 4 * 60 * 60);
    case "1D":
      return getStartOfDay(unixSeconds);
  }
}

export function getPeriodBucket(unixSeconds: number, timeframe: Timeframe): number {
  return getPeriodKey(unixSeconds, timeframe);
}
