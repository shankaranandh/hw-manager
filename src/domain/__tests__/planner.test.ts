import { buildPlan } from '../planner';
import { findPlanDay } from '../planner';
import type { Assignment, Settings, WorkLog } from '../types';

// 2026-09-16 is a Wednesday, so the fixture week runs Mon 14th to Sun 20th.
const TODAY = '2026-09-16';

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  // Sun, Mon, Tue, Wed, Thu, Fri, Sat
  capacityByWeekday: [60, 60, 60, 60, 60, 30, 60],
  maxChunkMinutes: 40,
  minChunkMinutes: 15,
  finishADayEarly: true,
  planReminderMinutes: 16 * 60 + 30,
  checkInMinutes: 19 * 60 + 45,
  notificationsEnabled: true,
  ...overrides,
});

let seq = 0;
const assignment = (overrides: Partial<Assignment> = {}): Assignment => {
  seq += 1;
  return {
    id: `a${seq}`,
    subjectId: 's1',
    title: `Assignment ${seq}`,
    notes: '',
    dueDate: '2026-09-18',
    estimateMinutes: 40,
    createdAt: '2026-09-16T08:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
};

const plan = (assignments: Assignment[], logs: WorkLog[] = [], overrides: Partial<Settings> = {}) =>
  buildPlan({ assignments, logs, settings: overrides ? settings(overrides) : settings(), today: TODAY });

/** Minutes planned for one assignment on one day. */
const minutesOn = (p: ReturnType<typeof buildPlan>, date: string, assignmentId: string) =>
  findPlanDay(p, date)?.blocks.find((b) => b.assignmentId === assignmentId)?.minutes ?? 0;

const scheduledDays = (p: ReturnType<typeof buildPlan>, assignmentId: string) =>
  p.days.filter((d) => d.blocks.some((b) => b.assignmentId === assignmentId)).map((d) => d.date);

beforeEach(() => {
  seq = 0;
});

describe('buildPlan', () => {
  it('paces a big assignment across the days before it is due', () => {
    const a = assignment({ estimateMinutes: 120, dueDate: '2026-09-21' });
    const p = plan([a]);

    const days = scheduledDays(p, a.id);
    expect(days.length).toBeGreaterThan(1);
    // Nothing is left for the due date itself: big work finishes a day early.
    expect(days).not.toContain('2026-09-21');
    expect(days.every((d) => d >= TODAY)).toBe(true);
  });

  it('schedules every minute of the estimate exactly once', () => {
    const a = assignment({ estimateMinutes: 150, dueDate: '2026-09-25' });
    const p = plan([a]);

    const total = p.days.reduce(
      (sum, d) => sum + d.blocks.filter((b) => b.assignmentId === a.id).reduce((s, b) => s + b.minutes, 0),
      0,
    );
    expect(total).toBe(150);
  });

  it('never exceeds the daily capacity the student set', () => {
    const a = assignment({ estimateMinutes: 90, dueDate: '2026-09-25' });
    const b = assignment({ estimateMinutes: 90, dueDate: '2026-09-25' });
    const p = plan([a, b]);

    for (const day of p.days) {
      expect(day.plannedMinutes).toBeLessThanOrEqual(day.capacityMinutes);
    }
    expect(p.warnings.filter((w) => w.kind === 'overloaded')).toHaveLength(0);
  });

  it('gives the sooner deadline first claim on tonight', () => {
    // Due today, so today is the only day it can possibly be worked on, and it
    // needs every one of tonight's 60 minutes.
    const soon = assignment({ title: 'Due today', estimateMinutes: 60, dueDate: TODAY });
    const later = assignment({ title: 'Due next week', estimateMinutes: 60, dueDate: '2026-09-25' });
    const p = plan([soon, later]);

    expect(minutesOn(p, TODAY, soon.id)).toBe(60);
    expect(minutesOn(p, TODAY, later.id)).toBe(0);
    // The one due next week is not dropped, just moved off tonight.
    expect(scheduledDays(p, later.id).length).toBeGreaterThan(0);
  });

  it('splits work due tomorrow across tonight and tomorrow', () => {
    const a = assignment({ estimateMinutes: 60, dueDate: '2026-09-17' });
    const p = plan([a]);

    expect(minutesOn(p, TODAY, a.id)).toBe(30);
    expect(minutesOn(p, '2026-09-17', a.id)).toBe(30);
  });

  it('respects days the student marked as unavailable', () => {
    // No time at all on Thursday.
    const a = assignment({ estimateMinutes: 120, dueDate: '2026-09-25' });
    const p = plan([a], [], { capacityByWeekday: [60, 60, 60, 60, 0, 60, 60] });

    expect(minutesOn(p, '2026-09-17', a.id)).toBe(0);
    expect(findPlanDay(p, '2026-09-17')!.capacityMinutes).toBe(0);
  });

  it('counts logged work as progress and only plans what is left', () => {
    const a = assignment({ estimateMinutes: 100, dueDate: '2026-09-25' });
    const logs: WorkLog[] = [{ date: '2026-09-15', assignmentId: a.id, minutes: 60 }];
    const p = plan([a], logs);

    expect(p.remainingByAssignment[a.id]).toBe(40);
    const futureMinutes = p.days
      .filter((d) => d.date >= TODAY)
      .reduce(
        (sum, d) => sum + d.blocks.filter((b) => b.assignmentId === a.id).reduce((s, b) => s + b.minutes, 0),
        0,
      );
    expect(futureMinutes).toBe(40);
  });

  it('shows work done earlier in the week as history without replanning it', () => {
    const a = assignment({ estimateMinutes: 100, dueDate: '2026-09-25' });
    const p = plan([a], [{ date: '2026-09-15', assignmentId: a.id, minutes: 60 }]);

    const tuesday = findPlanDay(p, '2026-09-15')!;
    expect(tuesday.doneMinutes).toBe(60);
    expect(tuesday.blocks[0].doneMinutes).toBe(60);
  });

  it('plans nothing for a completed assignment', () => {
    const a = assignment({ estimateMinutes: 60, completedAt: '2026-09-15T20:00:00.000Z' });
    const p = plan([a], [{ date: '2026-09-15', assignmentId: a.id, minutes: 60 }]);

    expect(p.remainingByAssignment[a.id]).toBeUndefined();
    expect(scheduledDays(p, a.id)).toEqual(['2026-09-15']);
  });

  it('pulls an overdue assignment onto today and says so', () => {
    const a = assignment({ title: 'Lab report', estimateMinutes: 30, dueDate: '2026-09-14' });
    const p = plan([a]);

    expect(minutesOn(p, TODAY, a.id)).toBe(30);
    expect(findPlanDay(p, TODAY)!.blocks[0].urgent).toBe(true);
    expect(p.warnings.some((w) => w.kind === 'overdue' && w.assignmentId === a.id)).toBe(true);
  });

  it('warns instead of silently hiding work that cannot fit', () => {
    // Six hours of work due tomorrow, against one hour a night.
    const a = assignment({ title: 'Essay', estimateMinutes: 360, dueDate: '2026-09-17' });
    const p = plan([a]);

    expect(p.warnings.some((w) => w.kind === 'wont-fit' && w.assignmentId === a.id)).toBe(true);
    const total = p.days.reduce(
      (sum, d) => sum + d.blocks.filter((b) => b.assignmentId === a.id).reduce((s, b) => s + b.minutes, 0),
      0,
    );
    // The overflow is still shown rather than dropped.
    expect(total).toBe(360);
    expect(p.days.some((d) => d.overloaded)).toBe(true);
  });

  it('concentrates overflow instead of smearing slivers across the week', () => {
    // More work than the week can hold, so some of it must go over capacity.
    const a = assignment({ title: 'Project', estimateMinutes: 400, dueDate: '2026-09-21' });
    const p = plan([a]);

    expect(p.warnings.some((w) => w.kind === 'wont-fit')).toBe(true);
    for (const day of p.days) {
      for (const block of day.blocks) {
        // No day should be carrying a token five-minute fragment.
        expect(block.minutes).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('marks the last day of an assignment as the one that finishes it', () => {
    const a = assignment({ estimateMinutes: 120, dueDate: '2026-09-25' });
    const p = plan([a]);

    const days = scheduledDays(p, a.id);
    const finishers = p.days
      .flatMap((d) => d.blocks)
      .filter((b) => b.assignmentId === a.id && b.isFinisher)
      .map((b) => b.date);
    expect(finishers).toEqual([days[days.length - 1]]);
  });

  it('folds an awkward remainder into a real sitting instead of a sliver', () => {
    // 100 minutes in 15-minute steps leaves 10 minutes over; it should join an
    // existing block rather than become a block of its own.
    const a = assignment({ estimateMinutes: 100, dueDate: '2026-09-30' });
    const p = plan([a]);

    for (const day of p.days) {
      for (const block of day.blocks) {
        expect(block.minutes).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('still schedules an assignment smaller than one sitting', () => {
    const a = assignment({ estimateMinutes: 10, dueDate: '2026-09-18' });
    const p = plan([a]);

    const total = p.days.reduce(
      (sum, d) => sum + d.blocks.filter((b) => b.assignmentId === a.id).reduce((s, b) => s + b.minutes, 0),
      0,
    );
    expect(total).toBe(10);
    expect(scheduledDays(p, a.id)).toHaveLength(1);
  });

  it('keeps a single sitting under the maximum chunk length when there is room', () => {
    const a = assignment({ estimateMinutes: 180, dueDate: '2026-09-30' });
    const p = plan([a], [], { capacityByWeekday: [240, 240, 240, 240, 240, 240, 240] });

    for (const day of p.days) {
      for (const block of day.blocks) {
        expect(block.minutes).toBeLessThanOrEqual(40);
      }
    }
  });

  it('is stable: planning twice from the same data gives the same plan', () => {
    const a = assignment({ estimateMinutes: 90, dueDate: '2026-09-22' });
    const b = assignment({ estimateMinutes: 45, dueDate: '2026-09-19' });
    expect(JSON.stringify(plan([a, b]).days)).toBe(JSON.stringify(plan([a, b]).days));
  });

  it('handles an empty week without falling over', () => {
    const p = plan([]);
    expect(p.warnings).toEqual([]);
    expect(p.days.every((d) => d.blocks.length === 0)).toBe(true);
  });
});
