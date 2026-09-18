import { addDays, diffDays, toDayKey } from './dates';
import type { Assignment, DayKey, WorkLog } from './types';

/**
 * What the student gets credit for.
 *
 * Two rules shape all of this.
 *
 * Reward pacing, not volume. Credit for "days early" rewards starting sooner,
 * which is the behaviour the app exists to create. Credit for minutes worked
 * would reward being given more homework, which is not an achievement.
 *
 * Never punish a free evening. A day with nothing to do is neutral: it neither
 * extends a streak nor breaks it. A student with no homework on Tuesday has done
 * nothing wrong, and an app that says otherwise is lying to them.
 */
export interface Achievements {
  /** Assignments finished, ever. */
  finishedCount: number;
  /** Assignments finished on or before their due date. */
  onTimeCount: number;
  /** Assignments finished strictly before their due date. */
  earlyCount: number;
  /** Total days saved across every assignment finished early. */
  daysEarly: number;
  /** Consecutive days worked, skipping days with nothing to do. */
  currentStreak: number;
  /** The longest such run, ever. */
  bestStreak: number;
  /** True when today had planned work and all of it is done. */
  clearedToday: boolean;
}

export interface AchievementsInput {
  assignments: Assignment[];
  logs: WorkLog[];
  today: DayKey;
  /** Minutes planned and done today, from the current plan. */
  todayPlannedMinutes?: number;
  todayDoneMinutes?: number;
}

/** How many days before its due date an assignment was finished; 0 if not early. */
export function daysEarlyFor(assignment: Assignment): number {
  if (!assignment.completedAt) return 0;
  const finishedOn = toDayKey(new Date(assignment.completedAt));
  return Math.max(0, diffDays(finishedOn, assignment.dueDate));
}

export function computeAchievements(input: AchievementsInput): Achievements {
  const { assignments, logs, today } = input;

  const finished = assignments.filter((a) => a.completedAt !== null);
  let onTimeCount = 0;
  let earlyCount = 0;
  let daysEarly = 0;

  for (const assignment of finished) {
    const finishedOn = toDayKey(new Date(assignment.completedAt!));
    const margin = diffDays(finishedOn, assignment.dueDate);
    if (margin >= 0) onTimeCount += 1;
    if (margin > 0) {
      earlyCount += 1;
      daysEarly += margin;
    }
  }

  const workedDays = new Set(logs.filter((l) => l.minutes > 0).map((l) => l.date));
  const currentStreak = streakEndingAt(today, today, workedDays, assignments);
  const bestStreak = longestStreak(workedDays, assignments, today, currentStreak);

  const planned = input.todayPlannedMinutes ?? 0;
  const done = input.todayDoneMinutes ?? 0;

  return {
    finishedCount: finished.length,
    onTimeCount,
    earlyCount,
    daysEarly,
    currentStreak,
    bestStreak,
    clearedToday: planned > 0 && done >= planned,
  };
}

/** Was there anything the student could have worked on that day? */
function hadWorkAvailable(day: DayKey, assignments: Assignment[]): boolean {
  return assignments.some((a) => {
    const created = toDayKey(new Date(a.createdAt));
    if (created > day) return false;
    // Overdue work still counts as available, so ignoring it breaks the streak.
    const finishedOn = a.completedAt ? toDayKey(new Date(a.completedAt)) : null;
    if (finishedOn && finishedOn < day) return false;
    return true;
  });
}

/**
 * Counts back from `from`, skipping days with nothing to do. Today never breaks
 * a streak, because the evening is not over yet.
 */
function streakEndingAt(
  from: DayKey,
  today: DayKey,
  workedDays: Set<DayKey>,
  assignments: Assignment[],
  limit = 400,
): number {
  let streak = 0;
  let day = from;
  for (let i = 0; i < limit; i += 1) {
    if (workedDays.has(day)) {
      streak += 1;
    } else if (hadWorkAvailable(day, assignments)) {
      // A day with work available and none done ends the run, unless it is
      // today, which the student can still rescue.
      if (day !== today) break;
    }
    day = addDays(day, -1);
  }
  return streak;
}

function longestStreak(
  workedDays: Set<DayKey>,
  assignments: Assignment[],
  today: DayKey,
  current: number,
): number {
  if (workedDays.size === 0) return current;
  const days = [...workedDays].sort();
  let best = current;
  for (const day of days) {
    best = Math.max(best, streakEndingAt(day, today, workedDays, assignments));
  }
  return best;
}

/** A short, honest line about the streak. Never scolds. */
export function streakMessage(streak: number): string {
  if (streak <= 0) return 'Tick something off to start a streak';
  if (streak === 1) return 'Day one';
  if (streak < 5) return `${streak} days in a row`;
  if (streak < 14) return `${streak} days running — that is a habit`;
  return `${streak} days. Genuinely impressive`;
}
