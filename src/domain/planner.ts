import { addDays, dayRange, diffDays, startOfWeek, weekdayOf } from './dates';
import type {
  Assignment,
  DayKey,
  Plan,
  PlanDay,
  PlanWarning,
  Settings,
  WorkBlock,
  WorkLog,
} from './types';

export interface PlanInput {
  assignments: Assignment[];
  logs: WorkLog[];
  settings: Settings;
  today: DayKey;
  /**
   * First day the plan covers. Days before `today` are shown as history (logged
   * work only) and never receive new work. Defaults to the start of this week.
   */
  displayStart?: DayKey;
  /** How far past today to look for room, in days. */
  horizonDays?: number;
}

const DEFAULT_HORIZON_DAYS = 28;

export const blockId = (date: DayKey, assignmentId: string) => `${date}:${assignmentId}`;

interface DayState {
  date: DayKey;
  capacityMinutes: number;
  /** Minutes free for new work; never negative. */
  free: number;
  /** Minutes claimed so far, including work already logged. */
  load: number;
  /** New work allocated by this planner run, per assignment. */
  allocated: Map<string, number>;
}

/**
 * Builds a day-by-day plan from the outstanding assignments.
 *
 * The strategy is earliest-deadline-first across assignments, and least-loaded-
 * day-first within each assignment. Deadline order makes sure the work that is
 * due soonest gets first claim on the student's time; spreading each assignment
 * over its least busy days is what stops the plan from turning into "do all of
 * it the night before".
 */
export function buildPlan(input: PlanInput): Plan {
  const { assignments, logs, settings, today } = input;
  const displayStart = input.displayStart ?? startOfWeek(today);
  const horizonDays = input.horizonDays ?? DEFAULT_HORIZON_DAYS;

  const byId = new Map(assignments.map((a) => [a.id, a]));
  const loggedByAssignment = new Map<string, number>();
  const loggedByDay = new Map<DayKey, number>();
  /** date -> assignmentId -> minutes */
  const logsByDate = new Map<DayKey, Map<string, number>>();
  /** assignmentId -> latest date with logged work */
  const lastLogDate = new Map<string, DayKey>();

  for (const log of logs) {
    if (log.minutes <= 0 || !byId.has(log.assignmentId)) continue;
    loggedByAssignment.set(
      log.assignmentId,
      (loggedByAssignment.get(log.assignmentId) ?? 0) + log.minutes,
    );
    loggedByDay.set(log.date, (loggedByDay.get(log.date) ?? 0) + log.minutes);
    let dayMap = logsByDate.get(log.date);
    if (!dayMap) {
      dayMap = new Map();
      logsByDate.set(log.date, dayMap);
    }
    dayMap.set(log.assignmentId, (dayMap.get(log.assignmentId) ?? 0) + log.minutes);
    const seen = lastLogDate.get(log.assignmentId);
    if (!seen || log.date > seen) lastLogDate.set(log.assignmentId, log.date);
  }

  const outstanding = assignments
    .filter((a) => a.completedAt === null)
    .map((a) => ({
      assignment: a,
      remaining: Math.max(0, a.estimateMinutes - (loggedByAssignment.get(a.id) ?? 0)),
    }))
    .filter((entry) => entry.remaining > 0);

  // The plan must reach at least as far as the last due date, or there would be
  // nowhere to put work for an assignment due beyond the default horizon.
  const lastDue = outstanding.reduce<DayKey>(
    (latest, entry) => (entry.assignment.dueDate > latest ? entry.assignment.dueDate : latest),
    addDays(today, horizonDays),
  );
  const totalDays = Math.max(1, diffDays(displayStart, lastDue) + 1);
  const dates = dayRange(displayStart, totalDays);

  const dayStates = new Map<DayKey, DayState>();
  for (const date of dates) {
    const capacity = capacityFor(date, settings);
    const alreadyDone = loggedByDay.get(date) ?? 0;
    const inPast = date < today;
    dayStates.set(date, {
      date,
      capacityMinutes: capacity,
      free: inPast ? 0 : Math.max(0, capacity - alreadyDone),
      load: alreadyDone,
      allocated: new Map(),
    });
  }

  const warnings: PlanWarning[] = [];

  // Earliest deadline first, then the biggest jobs, so the work with the least
  // slack claims the scarce evenings before anything else does.
  const ordered = [...outstanding].sort((a, b) => {
    const aLast = lastWorkDay(a.assignment, a.remaining, today, settings);
    const bLast = lastWorkDay(b.assignment, b.remaining, today, settings);
    if (aLast !== bLast) return aLast < bLast ? -1 : 1;
    if (a.remaining !== b.remaining) return b.remaining - a.remaining;
    return a.assignment.id < b.assignment.id ? -1 : 1;
  });

  for (const entry of ordered) {
    const { assignment } = entry;
    const deadline = lastWorkDay(assignment, entry.remaining, today, settings);
    const window = dates.filter((d) => d >= today && d <= deadline);

    if (assignment.dueDate < today) {
      warnings.push({
        kind: 'overdue',
        assignmentId: assignment.id,
        message: `"${assignment.title}" was due ${describeLateness(assignment.dueDate, today)}.`,
      });
    }

    const leftOver = allocate(entry.remaining, window, dayStates, assignment.id, settings);
    if (leftOver > 0) {
      spillOver(leftOver, window, dayStates, assignment.id, settings.minChunkMinutes);
      warnings.push({
        kind: 'wont-fit',
        assignmentId: assignment.id,
        date: assignment.dueDate,
        message:
          `"${assignment.title}" needs more time than you have before it's due. ` +
          'Start it now, or ask for an extension.',
      });
    }
  }

  // The block that completes an assignment is the last day carrying work for it:
  // the last day with new work when there is any, otherwise the last logged day.
  const finisherDate = new Map<string, DayKey>();
  for (const [assignmentId, date] of lastLogDate) finisherDate.set(assignmentId, date);
  for (const date of dates) {
    for (const assignmentId of dayStates.get(date)!.allocated.keys()) {
      finisherDate.set(assignmentId, date);
    }
  }

  const days: PlanDay[] = dates.map((date) => {
    const state = dayStates.get(date)!;
    const blocks = buildBlocks(state, byId, logsByDate.get(date), finisherDate, today);
    const plannedMinutes = blocks.reduce((sum, b) => sum + b.minutes, 0);
    const doneMinutes = blocks.reduce((sum, b) => sum + b.doneMinutes, 0);
    return {
      date,
      capacityMinutes: state.capacityMinutes,
      blocks,
      plannedMinutes,
      doneMinutes,
      overloaded: plannedMinutes > state.capacityMinutes,
    };
  });

  for (const day of days) {
    if (day.overloaded && day.date >= today) {
      warnings.push({
        kind: 'overloaded',
        date: day.date,
        message: `${day.plannedMinutes} min planned but you set aside ${day.capacityMinutes} min.`,
      });
    }
  }

  const remainingByAssignment: Record<string, number> = {};
  for (const entry of outstanding) remainingByAssignment[entry.assignment.id] = entry.remaining;

  return { days, warnings, remainingByAssignment };
}

function capacityFor(date: DayKey, settings: Settings): number {
  const value = settings.capacityByWeekday[weekdayOf(date)];
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The last day we are willing to schedule work on. Substantial assignments aim
 * to finish a day early, so that a surprise on the due date is survivable.
 */
function lastWorkDay(
  assignment: Assignment,
  remaining: number,
  today: DayKey,
  settings: Settings,
): DayKey {
  if (assignment.dueDate <= today) return today;
  const wantsBuffer =
    settings.finishADayEarly &&
    remaining > settings.maxChunkMinutes &&
    diffDays(today, assignment.dueDate) >= 2;
  const target = wantsBuffer ? addDays(assignment.dueDate, -1) : assignment.dueDate;
  return target < today ? today : target;
}

/**
 * Spreads `minutes` over the window, filling the least loaded days first so the
 * work lands evenly instead of piling onto the first free evening. Returns the
 * minutes that did not fit.
 */
function allocate(
  minutes: number,
  window: DayKey[],
  dayStates: Map<DayKey, DayState>,
  assignmentId: string,
  settings: Settings,
): number {
  let remaining = minutes;
  if (window.length === 0) return remaining;

  // Guard against a settings combination where the minimum exceeds the maximum.
  const maxChunk = Math.max(1, settings.maxChunkMinutes, settings.minChunkMinutes);
  const minChunk = Math.max(1, Math.min(settings.minChunkMinutes, maxChunk));

  while (remaining >= minChunk) {
    const usable = window.map((d) => dayStates.get(d)!).filter((s) => s.free >= minChunk);
    if (usable.length === 0) break;

    const evenShare = Math.ceil(remaining / usable.length);
    const chunk = Math.min(maxChunk, Math.max(minChunk, evenShare));
    const order = [...usable].sort((a, b) =>
      a.load !== b.load ? a.load - b.load : a.date < b.date ? -1 : 1,
    );

    let placedThisPass = 0;
    for (const state of order) {
      if (remaining < minChunk) break;
      const take = Math.min(chunk, state.free, remaining);
      // Never leave a sliver behind in the middle of the run; the tail below
      // handles whatever is smaller than one useful sitting.
      if (take < minChunk) continue;
      place(state, assignmentId, take);
      remaining -= take;
      placedThisPass += take;
    }

    // Every remaining day holds less than one useful block: stop rather than spin.
    if (placedThisPass === 0) break;
  }

  if (remaining > 0) remaining = placeTail(remaining, window, dayStates, assignmentId, maxChunk);
  return remaining;
}

function place(state: DayState, assignmentId: string, minutes: number): void {
  state.free = Math.max(0, state.free - minutes);
  state.load += minutes;
  state.allocated.set(assignmentId, (state.allocated.get(assignmentId) ?? 0) + minutes);
}

/**
 * Places the last few minutes of an assignment. A seven-minute errand of its own
 * is worse than a slightly longer sitting, so the tail joins the latest day that
 * is already working on this assignment whenever it can.
 */
function placeTail(
  minutes: number,
  window: DayKey[],
  dayStates: Map<DayKey, DayState>,
  assignmentId: string,
  maxChunk: number,
): number {
  const candidates = window.map((d) => dayStates.get(d)!).filter((s) => s.free >= minutes);
  if (candidates.length === 0) return minutes;

  const joinable = candidates.filter((s) => {
    const already = s.allocated.get(assignmentId) ?? 0;
    return already > 0 && already + minutes <= maxChunk;
  });

  const target = joinable.length
    ? joinable[joinable.length - 1]
    : [...candidates].sort((a, b) => (a.load !== b.load ? a.load - b.load : a.date < b.date ? -1 : 1))[0];

  place(target, assignmentId, minutes);
  return 0;
}

/**
 * Last resort for work that cannot fit before its due date. The minutes are
 * still placed, deliberately pushing days over capacity, because hiding them
 * would be worse than admitting the week is too full.
 */
function spillOver(
  minutes: number,
  window: DayKey[],
  dayStates: Map<DayKey, DayState>,
  assignmentId: string,
  minChunkMinutes: number,
): void {
  if (window.length === 0) return;
  let remaining = minutes;
  const order = window
    .map((d) => dayStates.get(d)!)
    .sort((a, b) => (a.load !== b.load ? a.load - b.load : a.date < b.date ? -1 : 1));
  // Overflow goes onto the least busy days in real sittings. Smearing five
  // minutes across every day of the week would read as noise and tell the
  // student nothing about where the crunch actually is.
  const share = Math.max(minChunkMinutes, Math.ceil(remaining / order.length));
  for (const state of order) {
    if (remaining <= 0) break;
    const take = Math.min(share, remaining);
    // Deliberately bypasses the free-capacity check: this day is now over budget.
    state.load += take;
    state.allocated.set(assignmentId, (state.allocated.get(assignmentId) ?? 0) + take);
    remaining -= take;
  }
}

function buildBlocks(
  state: DayState,
  byId: Map<string, Assignment>,
  logsToday: Map<string, number> | undefined,
  finisherDate: Map<string, DayKey>,
  today: DayKey,
): WorkBlock[] {
  const ids = new Set<string>(state.allocated.keys());
  // Work already logged on this day belongs on the day's list too, so the
  // student sees what they finished and not only what is left.
  if (logsToday) for (const id of logsToday.keys()) ids.add(id);

  const blocks: WorkBlock[] = [];
  for (const assignmentId of ids) {
    const assignment = byId.get(assignmentId);
    if (!assignment) continue;
    const done = logsToday?.get(assignmentId) ?? 0;
    const planned = state.allocated.get(assignmentId) ?? 0;
    const minutes = planned + done;
    if (minutes <= 0) continue;
    blocks.push({
      id: blockId(state.date, assignmentId),
      date: state.date,
      assignmentId,
      minutes,
      doneMinutes: done,
      isFinisher: finisherDate.get(assignmentId) === state.date,
      urgent: assignment.completedAt === null && assignment.dueDate <= today,
    });
  }

  return blocks.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const dueA = byId.get(a.assignmentId)!.dueDate;
    const dueB = byId.get(b.assignmentId)!.dueDate;
    if (dueA !== dueB) return dueA < dueB ? -1 : 1;
    if (a.minutes !== b.minutes) return b.minutes - a.minutes;
    return a.assignmentId < b.assignmentId ? -1 : 1;
  });
}

function describeLateness(dueDate: DayKey, today: DayKey): string {
  const late = Math.abs(diffDays(today, dueDate));
  return late === 1 ? 'yesterday' : `${late} days ago`;
}

/** Convenience lookup used throughout the UI. */
export function findPlanDay(plan: Plan, date: DayKey): PlanDay | undefined {
  return plan.days.find((d) => d.date === date);
}
