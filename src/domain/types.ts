/**
 * Core data model.
 *
 * Everything is stored locally on the device. There are no accounts, no server,
 * and no personal information beyond what the student types in themselves.
 */

/** A calendar day in the student's own timezone, formatted `YYYY-MM-DD`. */
export type DayKey = string;

export interface Subject {
  id: string;
  name: string;
  /** Hex colour used for the subject's chip and block accents. */
  color: string;
}

/**
 * Students are bad at estimating minutes but good at estimating "how big does
 * this feel". We capture the feeling and translate it into minutes.
 */
export type Size = 'quick' | 'medium' | 'big' | 'huge';

export const SIZE_MINUTES: Record<Size, number> = {
  quick: 15,
  medium: 40,
  big: 90,
  huge: 180,
};

export const SIZE_LABELS: Record<Size, { label: string; hint: string }> = {
  quick: { label: 'Quick', hint: 'about 15 min' },
  medium: { label: 'Medium', hint: 'about 40 min' },
  big: { label: 'Big', hint: 'about 1.5 hrs' },
  huge: { label: 'Huge', hint: '3 hrs or a project' },
};

export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  notes: string;
  dueDate: DayKey;
  /** Total work the assignment is expected to take, in minutes. */
  estimateMinutes: number;
  createdAt: string;
  /** ISO timestamp once the whole assignment is finished, otherwise null. */
  completedAt: string | null;
}

/**
 * A record of work actually done, keyed by day. Logs are the source of truth for
 * progress: the plan is recomputed from scratch every time, but logs persist, so
 * replanning never loses the fact that the student already did the work.
 */
export interface WorkLog {
  date: DayKey;
  assignmentId: string;
  minutes: number;
}

/** Minutes of homework the student is willing to do, indexed by JS day-of-week (0 = Sunday). */
export type CapacityByWeekday = [number, number, number, number, number, number, number];

/** Follow the phone, or override it. */
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  capacityByWeekday: CapacityByWeekday;
  themePreference: ThemePreference;
  /** Longest single sitting before a break, in minutes. */
  maxChunkMinutes: number;
  /** Shortest block worth putting on the plan, in minutes. */
  minChunkMinutes: number;
  /** Aim to finish big assignments a day early. */
  finishADayEarly: boolean;
  /** "Here is tonight's plan" reminder, minutes after local midnight. */
  planReminderMinutes: number;
  /** "How did it go?" nudge, minutes after local midnight. */
  checkInMinutes: number;
  notificationsEnabled: boolean;
}

export interface AppData {
  version: number;
  subjects: Subject[];
  assignments: Assignment[];
  logs: WorkLog[];
  settings: Settings;
}

/** One sitting of work on one assignment, on one day. Derived, never stored. */
export interface WorkBlock {
  /** Stable for a given (day, assignment) pair so completion survives replanning. */
  id: string;
  date: DayKey;
  assignmentId: string;
  minutes: number;
  /** Minutes already logged against this assignment on this day. */
  doneMinutes: number;
  /** True when this block finishes the assignment. */
  isFinisher: boolean;
  /** Due today or already late. */
  urgent: boolean;
}

export interface PlanDay {
  date: DayKey;
  capacityMinutes: number;
  blocks: WorkBlock[];
  /** Minutes of work planned for the day, including work already done. */
  plannedMinutes: number;
  doneMinutes: number;
  /** Planned minutes exceed what the student said they can do. */
  overloaded: boolean;
}

export type WarningKind = 'overloaded' | 'wont-fit' | 'overdue';

export interface PlanWarning {
  kind: WarningKind;
  message: string;
  date?: DayKey;
  assignmentId?: string;
}

export interface Plan {
  days: PlanDay[];
  warnings: PlanWarning[];
  /** Assignments with work left, keyed by id, for quick lookup by the UI. */
  remainingByAssignment: Record<string, number>;
}
