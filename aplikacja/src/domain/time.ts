import type { LocalDateTime } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Lokalny czas jako "YYYY-MM-DDTHH:MM:SS" (bez strefy, jak w modelu). */
export function toLocalDateTime(d: Date): LocalDateTime {
  return `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Lokalna data jako "YYYY-MM-DD". */
export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-06-14" → "14.06.2026" */
export function formatDatePl(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}
