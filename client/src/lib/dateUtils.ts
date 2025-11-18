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

// Format period label for display
export function formatPeriodLabel(unixSeconds: number, timeframe: 'day' | 'week' | 'month' | 'year'): string {
  const moscowDate = toMoscowTime(unixSeconds);
  
  if (timeframe === 'year') {
    return moscowDate.getUTCFullYear().toString();
  }
  
  if (timeframe === 'month') {
    const monthNames = [
      'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
      'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
    ];
    return `${monthNames[moscowDate.getUTCMonth()]} ${moscowDate.getUTCFullYear()}`;
  }
  
  if (timeframe === 'week') {
    // Show week as range: "01.11 - 07.11"
    const weekStart = toMoscowTime(getStartOfWeek(unixSeconds));
    const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
    
    const startDay = weekStart.getUTCDate().toString().padStart(2, '0');
    const startMonth = (weekStart.getUTCMonth() + 1).toString().padStart(2, '0');
    const endDay = weekEnd.getUTCDate().toString().padStart(2, '0');
    const endMonth = (weekEnd.getUTCMonth() + 1).toString().padStart(2, '0');
    
    if (startMonth === endMonth) {
      return `${startDay}-${endDay}.${startMonth}`;
    }
    return `${startDay}.${startMonth}-${endDay}.${endMonth}`;
  }
  
  // Day
  const day = moscowDate.getUTCDate().toString().padStart(2, '0');
  const month = (moscowDate.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}.${moscowDate.getUTCFullYear()}`;
}

// Get the period bucket key for grouping
export function getPeriodBucket(unixSeconds: number, timeframe: 'day' | 'week' | 'month' | 'year'): number {
  switch (timeframe) {
    case 'day':
      return getStartOfDay(unixSeconds);
    case 'week':
      return getStartOfWeek(unixSeconds);
    case 'month':
      return getStartOfMonth(unixSeconds);
    case 'year':
      return getStartOfYear(unixSeconds);
  }
}
