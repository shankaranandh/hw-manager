import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, SCHEMA_VERSION, emptyAppData, starterSubjects } from '../domain/defaults';
import type { AppData, Assignment, CapacityByWeekday, Settings, Subject, WorkLog } from '../domain/types';

const STORAGE_KEY = 'hw-manager:data:v1';

/**
 * Reads the saved data, repairing anything that does not match the current
 * shape. A student losing their whole week to one malformed record would be
 * unforgivable, so every field is validated and defaulted rather than trusted.
 */
export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAppData();
    return migrate(JSON.parse(raw));
  } catch {
    // A corrupt payload should not brick the app; start clean instead.
    return emptyAppData();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearAppData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function migrate(raw: unknown): AppData {
  if (typeof raw !== 'object' || raw === null) return emptyAppData();
  const input = raw as Partial<AppData>;

  const subjects = sanitizeSubjects(input.subjects);
  const subjectIds = new Set(subjects.map((s) => s.id));
  const assignments = sanitizeAssignments(input.assignments, subjectIds, subjects[0]?.id ?? '');
  const assignmentIds = new Set(assignments.map((a) => a.id));

  return {
    version: SCHEMA_VERSION,
    subjects,
    assignments,
    logs: sanitizeLogs(input.logs, assignmentIds),
    settings: sanitizeSettings(input.settings),
  };
}

const isDayKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function sanitizeSubjects(value: unknown): Subject[] {
  if (!Array.isArray(value)) return starterSubjects();
  const subjects = value
    .filter((s): s is Partial<Subject> => typeof s === 'object' && s !== null)
    .map((s, index) => ({
      id: str(s.id) || `subject-${index + 1}`,
      name: str(s.name).trim() || `Subject ${index + 1}`,
      color: /^#[0-9a-fA-F]{6}$/.test(str(s.color)) ? str(s.color) : '#5B8DEF',
    }));
  // Subjects are how assignments are grouped; with none, nothing can be added.
  return subjects.length > 0 ? dedupeById(subjects) : starterSubjects();
}

function sanitizeAssignments(
  value: unknown,
  subjectIds: Set<string>,
  fallbackSubjectId: string,
): Assignment[] {
  if (!Array.isArray(value)) return [];
  const assignments = value
    .filter((a): a is Partial<Assignment> => typeof a === 'object' && a !== null)
    .filter((a) => isDayKey(a.dueDate) && str(a.id) !== '')
    .map((a) => ({
      id: str(a.id),
      subjectId: subjectIds.has(str(a.subjectId)) ? str(a.subjectId) : fallbackSubjectId,
      title: str(a.title).trim() || 'Untitled',
      notes: str(a.notes),
      dueDate: a.dueDate as string,
      estimateMinutes: Math.max(5, Math.round(num(a.estimateMinutes, 30))),
      createdAt: str(a.createdAt, new Date().toISOString()),
      completedAt: typeof a.completedAt === 'string' ? a.completedAt : null,
    }));
  return dedupeById(assignments);
}

function sanitizeLogs(value: unknown, assignmentIds: Set<string>): WorkLog[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((l): l is Partial<WorkLog> => typeof l === 'object' && l !== null)
    .filter((l) => isDayKey(l.date) && assignmentIds.has(str(l.assignmentId)))
    .map((l) => ({
      date: l.date as string,
      assignmentId: str(l.assignmentId),
      minutes: Math.max(0, Math.round(num(l.minutes, 0))),
    }))
    .filter((l) => l.minutes > 0);
}

function sanitizeSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_SETTINGS };
  const input = value as Partial<Settings>;
  const capacity = Array.isArray(input.capacityByWeekday) && input.capacityByWeekday.length === 7
    ? (input.capacityByWeekday.map((m) => clamp(Math.round(num(m, 0)), 0, 8 * 60)) as CapacityByWeekday)
    : ([...DEFAULT_SETTINGS.capacityByWeekday] as CapacityByWeekday);

  const maxChunk = clamp(Math.round(num(input.maxChunkMinutes, DEFAULT_SETTINGS.maxChunkMinutes)), 10, 180);
  return {
    capacityByWeekday: capacity,
    maxChunkMinutes: maxChunk,
    minChunkMinutes: clamp(
      Math.round(num(input.minChunkMinutes, DEFAULT_SETTINGS.minChunkMinutes)),
      5,
      maxChunk,
    ),
    finishADayEarly:
      typeof input.finishADayEarly === 'boolean'
        ? input.finishADayEarly
        : DEFAULT_SETTINGS.finishADayEarly,
    planReminderMinutes: clamp(
      Math.round(num(input.planReminderMinutes, DEFAULT_SETTINGS.planReminderMinutes)),
      0,
      1439,
    ),
    checkInMinutes: clamp(
      Math.round(num(input.checkInMinutes, DEFAULT_SETTINGS.checkInMinutes)),
      0,
      1439,
    ),
    notificationsEnabled:
      typeof input.notificationsEnabled === 'boolean'
        ? input.notificationsEnabled
        : DEFAULT_SETTINGS.notificationsEnabled,
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
