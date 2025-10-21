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
