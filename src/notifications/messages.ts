import { dateAt, diffDays, formatMinutes, relativeDayLabel } from '../domain/dates';
import type { Assignment, DayKey, Plan, Settings, Subject } from '../domain/types';

export type ReminderKind = 'plan' | 'check-in';

export interface PlannedReminder {
  /** Stable identifier so a reschedule replaces rather than duplicates. */
  id: string;
  kind: ReminderKind;
  date: DayKey;
  fireAt: Date;
  title: string;
  body: string;
}

export interface ReminderInput {
  plan: Plan;
  assignments: Assignment[];
  subjects: Subject[];
  settings: Settings;
  today: DayKey;
  now: Date;
  /** How many days ahead to schedule. Kept small to stay under the iOS limit. */
  horizonDays?: number;
}

const DEFAULT_HORIZON = 7;

/**
 * Turns a plan into the notifications that should be pending on the device.
 *
 * Two a day is the ceiling on purpose. A student who gets pinged six times a
 * night stops reading the pings, and then the app has made the problem worse:
 * one message with the plan, one gentle check-in, and nothing on a free day.
 */
export function buildReminders(input: ReminderInput): PlannedReminder[] {
  const { plan, assignments, subjects, settings, today, now } = input;
  if (!settings.notificationsEnabled) return [];

  const horizon = input.horizonDays ?? DEFAULT_HORIZON;
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const byId = new Map(assignments.map((a) => [a.id, a]));
  const reminders: PlannedReminder[] = [];

  for (const day of plan.days) {
    const ahead = diffDays(today, day.date);
    if (ahead < 0 || ahead >= horizon) continue;

    const outstanding = day.blocks.filter((b) => b.minutes > b.doneMinutes);
    const dueTomorrow = assignments.filter(
      (a) => a.completedAt === null && diffDays(day.date, a.dueDate) === 1,
    );
    if (outstanding.length === 0 && dueTomorrow.length === 0) continue;

    const remainingMinutes = outstanding.reduce((sum, b) => sum + (b.minutes - b.doneMinutes), 0);
    const labelFor = (assignmentId: string) => {
      const assignment = byId.get(assignmentId);
      if (!assignment) return 'Homework';
      const subject = subjectName.get(assignment.subjectId);
      return subject ? `${subject} — ${assignment.title}` : assignment.title;
    };

    const planAt = dateAt(day.date, settings.planReminderMinutes);
    if (planAt > now && outstanding.length > 0) {
      const detail = outstanding
        .map((b) => `${labelFor(b.assignmentId)} (${formatMinutes(b.minutes - b.doneMinutes)})`)
        .join('\n');
      reminders.push({
        id: `plan-${day.date}`,
        kind: 'plan',
        date: day.date,
        fireAt: planAt,
        title: planTitle(outstanding.length, remainingMinutes, day.overloaded),
        body: detail,
      });
    }

    const checkInAt = dateAt(day.date, settings.checkInMinutes);
    if (checkInAt > now) {
      const body = checkInBody(
        outstanding.map((b) => labelFor(b.assignmentId)),
        dueTomorrow.map((a) => labelFor(a.id)),
        day.date,
        today,
      );
      if (body) {
        reminders.push({
          id: `check-in-${day.date}`,
          kind: 'check-in',
          date: day.date,
          fireAt: checkInAt,
          title: dueTomorrow.length > 0 ? 'Due tomorrow' : 'How did it go?',
          body,
        });
      }
    }
  }

  return reminders.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

function planTitle(count: number, minutes: number, overloaded: boolean): string {
  const things = count === 1 ? '1 thing' : `${count} things`;
  if (overloaded) return `${things} tonight — it's a lot (${formatMinutes(minutes)})`;
  return `${things} tonight · ${formatMinutes(minutes)}`;
}

function checkInBody(
  outstanding: string[],
  dueTomorrow: string[],
  date: DayKey,
  today: DayKey,
): string {
  const parts: string[] = [];
  if (dueTomorrow.length > 0) {
    const when = date === today ? 'tomorrow' : `the day after ${relativeDayLabel(date, today).toLowerCase()}`;
    parts.push(`Due ${when}: ${joinList(dueTomorrow)}.`);
  }
  if (outstanding.length > 0) {
    parts.push(`Still on your list: ${joinList(outstanding)}. Tick off whatever you finished.`);
  }
  return parts.join('\n');
}

function joinList(items: string[]): string {
  const shown = items.slice(0, 3);
  const rest = items.length - shown.length;
  const base = shown.join(', ');
  return rest > 0 ? `${base} and ${rest} more` : base;
}
