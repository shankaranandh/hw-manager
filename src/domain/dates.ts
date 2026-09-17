import type { DayKey } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a `Date` as the local calendar day it falls on. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a day key into a `Date` at local midnight. */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

/**
 * Adds days using calendar arithmetic rather than millisecond arithmetic, so
 * that days either side of a daylight-saving change still land correctly.
 */
export function addDays(key: DayKey, days: number): DayKey {
  const date = fromDayKey(key);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: DayKey, to: DayKey): number {
  const a = fromDayKey(from);
  const b = fromDayKey(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

/** JS day of week, 0 = Sunday. */
export function weekdayOf(key: DayKey): number {
  return fromDayKey(key).getDay();
}

export function isWeekend(key: DayKey): boolean {
  const day = weekdayOf(key);
  return day === 0 || day === 6;
}

/** `count` consecutive day keys starting at `start`. */
export function dayRange(start: DayKey, count: number): DayKey[] {
  const out: DayKey[] = [];
  for (let i = 0; i < count; i += 1) out.push(addDays(start, i));
  return out;
}

/** The Monday on or before `key`. */
export function startOfWeek(key: DayKey): DayKey {
  const day = weekdayOf(key);
  const backUp = day === 0 ? 6 : day - 1;
  return addDays(key, -backUp);
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function weekdayShort(key: DayKey): string {
  return WEEKDAY_SHORT[weekdayOf(key)];
}

export function weekdayLong(key: DayKey): string {
  return WEEKDAY_LONG[weekdayOf(key)];
}

export function monthDayLabel(key: DayKey): string {
  const date = fromDayKey(key);
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/**
 * A label a student can read at a glance: "Today", "Tomorrow", a weekday name
 * for the coming week, and a date beyond that.
 */
export function relativeDayLabel(key: DayKey, today: DayKey): string {
  const delta = diffDays(today, key);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta < 0) return `${Math.abs(delta)} days ago`;
  if (delta < 7) return weekdayLong(key);
  return `${weekdayShort(key)}, ${monthDayLabel(key)}`;
}

/** Short form of the same idea, for dense layouts. */
export function shortDayLabel(key: DayKey, today: DayKey): string {
  const delta = diffDays(today, key);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tmrw';
  if (delta > 1 && delta < 7) return weekdayShort(key);
  return monthDayLabel(key);
}

/** "45 min" / "1 hr" / "1 hr 30 min" */
export function formatMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  const hourPart = `${hours} hr`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}

/** Turns minutes-after-midnight into a 12-hour clock label. */
export function formatTimeOfDay(minutesAfterMidnight: number): string {
  const total = ((Math.round(minutesAfterMidnight) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

/** A `Date` for a wall-clock time on a given day, in local time. */
export function dateAt(key: DayKey, minutesAfterMidnight: number): Date {
  const date = fromDayKey(key);
  date.setMinutes(date.getMinutes() + minutesAfterMidnight);
  return date;
}
