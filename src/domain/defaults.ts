import type { AppData, Settings, Subject } from './types';

export const SCHEMA_VERSION = 1;

/**
 * Subject colours. Chosen to stay distinguishable against the dark background
 * and to remain distinct for the most common forms of colour blindness, since
 * colour is how a student picks their subject out of a list at a glance.
 */
export const SUBJECT_PALETTE = [
  '#5B8DEF', // blue
  '#F2994A', // orange
  '#27AE60', // green
  '#BB6BD9', // purple
  '#EB5757', // red
  '#2D9CDB', // sky
  '#F2C94C', // yellow
  '#00B8A9', // teal
];

export const DEFAULT_SETTINGS: Settings = {
  // Sun, Mon, Tue, Wed, Thu, Fri, Sat. Light on Friday, because nobody does
  // homework on a Friday night, and pretending otherwise makes the plan a lie.
  capacityByWeekday: [60, 60, 60, 60, 60, 20, 45],
  maxChunkMinutes: 40,
  minChunkMinutes: 15,
  finishADayEarly: true,
  planReminderMinutes: 16 * 60 + 30,
  checkInMinutes: 19 * 60 + 45,
  notificationsEnabled: true,
};

const STARTER_SUBJECT_NAMES = ['Math', 'English', 'Science', 'History', 'Spanish'];

export function starterSubjects(): Subject[] {
  return STARTER_SUBJECT_NAMES.map((name, index) => ({
    id: `subject-${index + 1}`,
    name,
    color: SUBJECT_PALETTE[index % SUBJECT_PALETTE.length],
  }));
}

export function emptyAppData(): AppData {
  return {
    version: SCHEMA_VERSION,
    subjects: starterSubjects(),
    assignments: [],
    logs: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Good enough for identifiers that never leave the device. */
export function makeId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${random}`;
}

export function nextSubjectColor(existing: Subject[]): string {
  const used = new Set(existing.map((s) => s.color));
  return SUBJECT_PALETTE.find((c) => !used.has(c)) ?? SUBJECT_PALETTE[existing.length % SUBJECT_PALETTE.length];
}
