// Convert timestamp to Moscow time (UTC+3)
export function toMoscowTime(timestamp: number): Date {
  const date = new Date(timestamp * 1000);
  // Add 3 hours for Moscow timezone
  return new Date(date.getTime() + (3 * 60 * 60 * 1000));
}

// Format date for Moscow timezone
export function formatMoscowDate(timestamp: number): string {
  const moscowDate = toMoscowTime(timestamp);
  const day = moscowDate.getUTCDate().toString().padStart(2, '0');
  const month = (moscowDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = moscowDate.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

// Format time for Moscow timezone
export function formatMoscowTime(timestamp: number): string {
  const moscowDate = toMoscowTime(timestamp);
  const hours = moscowDate.getUTCHours().toString().padStart(2, '0');
  const minutes = moscowDate.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Format full date-time for Moscow timezone
export function formatMoscowDateTime(timestamp: number): string {
  const moscowDate = toMoscowTime(timestamp);
  const day = moscowDate.getUTCDate().toString().padStart(2, '0');
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const month = months[moscowDate.getUTCMonth()];
  const year = moscowDate.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

// Get the start of day in Moscow time for a given Unix timestamp
export function getStartOfDay(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const startOfDay = new Date(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), moscowDate.getUTCDate());
  return Math.floor((startOfDay.getTime() - (3 * 60 * 60 * 1000)) / 1000);
}

// Get the start of month in Moscow time for a given Unix timestamp
export function getStartOfMonth(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const startOfMonth = new Date(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), 1);
  return Math.floor((startOfMonth.getTime() - (3 * 60 * 60 * 1000)) / 1000);
}

// Get the start of week (Monday) in Moscow time for a given Unix timestamp
export function getStartOfWeek(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const dayOfWeek = moscowDate.getUTCDay();
  // Convert Sunday (0) to 7, Monday becomes 1
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(moscowDate.getUTCFullYear(), moscowDate.getUTCMonth(), moscowDate.getUTCDate() - daysToMonday);
  return Math.floor((startOfWeek.getTime() - (3 * 60 * 60 * 1000)) / 1000);
}

// Get the start of year in Moscow time for a given Unix timestamp
export function getStartOfYear(unixSeconds: number): number {
  const moscowDate = toMoscowTime(unixSeconds);
  const startOfYear = new Date(moscowDate.getUTCFullYear(), 0, 1);
  return Math.floor((startOfYear.getTime() - (3 * 60 * 60 * 1000)) / 1000);
}

// New timeframe type for trading view
export type Timeframe = '1D' | '7D' | '30D' | '90D';

// Convert timeframe to days
export function timeframeToDays(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1D': return 1;
    case '7D': return 7;
    case '30D': return 30;
    case '90D': return 90;
  }
}

// Aggregate daily candles into larger periods
export interface AggregatedCandle {
  dateStart: number;
  dateEnd: number;
  open: number;
  high: number;
  low: number;
  close: number;
  // Individual state close values
  mental: number;
  physical: number;
  moral: number;
  financial: number;
}

export function aggregateCandles(
  dailyData: Array<{ time: number; mental: number; physical: number; moral: number; financial: number }>,
  days: number
): AggregatedCandle[] {
  if (dailyData.length === 0) return [];
  
  // Sort by time
  const sorted = [...dailyData].sort((a, b) => a.time - b.time);
  
  // Group into periods
  const candles: AggregatedCandle[] = [];
  let currentGroup: typeof sorted = [];
  let groupStartTime = sorted[0].time;
  
  for (let i = 0; i < sorted.length; i++) {
    const point = sorted[i];
    const daysSinceStart = Math.floor((point.time - groupStartTime) / (24 * 60 * 60));
    
    if (daysSinceStart >= days) {
      // Finish current group and start new one
      if (currentGroup.length > 0) {
        candles.push(createCandleFromGroup(currentGroup));
      }
      currentGroup = [point];
      groupStartTime = point.time;
    } else {
      currentGroup.push(point);
    }
  }
  
  // Add last group
  if (currentGroup.length > 0) {
    candles.push(createCandleFromGroup(currentGroup));
  }
  
  return candles;
}

function createCandleFromGroup(
  group: Array<{ time: number; mental: number; physical: number; moral: number; financial: number }>
): AggregatedCandle {
  // Calculate aggregate values for main candle
  const values = group.map(p => {
    return (p.mental + p.physical + p.moral + p.financial) / 4;
  });
  
  // Get last (close) values for each state
  const last = group[group.length - 1];
  
  return {
    dateStart: group[0].time,
    dateEnd: group[group.length - 1].time,
    open: values[0],
    high: Math.max(...values),
    low: Math.min(...values),
    close: values[values.length - 1],
    // Preserve individual state values
    mental: last.mental,
    physical: last.physical,
    moral: last.moral,
    financial: last.financial,
  };
}

// Format period label for display
export function formatPeriodLabel(unixSeconds: number, timeframe: Timeframe): string {
  const moscowDate = toMoscowTime(unixSeconds);
  const day = moscowDate.getUTCDate().toString().padStart(2, '0');
  const month = (moscowDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = moscowDate.getUTCFullYear();
  
  return `${day}.${month}.${year}`;
}

// Legacy function - kept for backwards compatibility (no longer used)
export function getPeriodBucket(unixSeconds: number, timeframe: string): number {
  return getStartOfDay(unixSeconds);
}
