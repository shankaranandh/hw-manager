import { DEFAULT_SETTINGS } from '../../domain/defaults';
import { buildPlan } from '../../domain/planner';
import type { Assignment, Settings, Subject } from '../../domain/types';
import { buildReminders } from '../messages';

const TODAY = '2026-09-16'; // Wednesday
// Mid-afternoon, before both the 4:30pm plan reminder and the 7:45pm check-in.
const NOW = new Date(2026, 8, 16, 14, 0, 0);

const subjects: Subject[] = [
  { id: 's1', name: 'Math', color: '#5B8DEF' },
  { id: 's2', name: 'English', color: '#F2994A' },
];

const settings = (overrides: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...overrides });

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

const remind = (assignments: Assignment[], overrides: Partial<Settings> = {}, logs = []) => {
  const s = settings(overrides);
  const plan = buildPlan({ assignments, logs, settings: s, today: TODAY });
  return buildReminders({ plan, assignments, subjects, settings: s, today: TODAY, now: NOW });
};

beforeEach(() => {
  seq = 0;
});

describe('buildReminders', () => {
  it('says nothing at all on a week with no homework', () => {
    expect(remind([])).toEqual([]);
  });

  it('sends at most a plan and a check-in per day', () => {
    const list = remind([
      assignment({ estimateMinutes: 120, dueDate: '2026-09-21' }),
      assignment({ estimateMinutes: 90, dueDate: '2026-09-22' }),
    ]);

    const perDay = new Map<string, number>();
    for (const r of list) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);
    for (const count of perDay.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it('names the subject and the assignment so the reminder is actionable', () => {
    const list = remind([assignment({ title: 'Ch 4 problems', estimateMinutes: 30, dueDate: '2026-09-17' })]);
    const planReminder = list.find((r) => r.kind === 'plan' && r.date === TODAY)!;

    expect(planReminder.body).toContain('Math — Ch 4 problems');
    expect(planReminder.title).toContain('1 thing');
  });

  it('calls out a day that is over capacity rather than pretending it is fine', () => {
    const list = remind([assignment({ title: 'Essay', estimateMinutes: 300, dueDate: '2026-09-17' })]);
    const planReminder = list.find((r) => r.kind === 'plan' && r.date === TODAY)!;

    expect(planReminder.title).toContain("it's a lot");
  });

  it('warns the night before something is due', () => {
    const list = remind([assignment({ title: 'Book report', dueDate: '2026-09-17', estimateMinutes: 30 })]);
    const checkIn = list.find((r) => r.kind === 'check-in' && r.date === TODAY)!;

    expect(checkIn.title).toBe('Due tomorrow');
    expect(checkIn.body).toContain('Book report');
  });

  it('only schedules times that are still in the future', () => {
    const list = remind([assignment({ estimateMinutes: 120, dueDate: '2026-09-25' })]);
    for (const reminder of list) expect(reminder.fireAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('skips today once both reminder times have passed', () => {
    const s = settings();
    const assignments = [assignment({ estimateMinutes: 60, dueDate: '2026-09-25' })];
    const plan = buildPlan({ assignments, logs: [], settings: s, today: TODAY });
    const lateEvening = new Date(2026, 8, 16, 23, 30, 0);

    const list = buildReminders({ plan, assignments, subjects, settings: s, today: TODAY, now: lateEvening });
    expect(list.some((r) => r.date === TODAY)).toBe(false);
    expect(list.length).toBeGreaterThan(0);
  });

  it('stays inside the scheduling horizon', () => {
    const list = remind([assignment({ estimateMinutes: 600, dueDate: '2026-10-30' })]);
    for (const reminder of list) {
      expect(reminder.date >= TODAY).toBe(true);
      expect(reminder.date < '2026-09-23').toBe(true);
    }
  });

  it('sends nothing when the student has turned reminders off', () => {
    expect(remind([assignment({ estimateMinutes: 60 })], { notificationsEnabled: false })).toEqual([]);
  });

  it('gives every reminder a stable id so rescheduling replaces rather than duplicates', () => {
    const list = remind([assignment({ estimateMinutes: 120, dueDate: '2026-09-21' })]);
    expect(new Set(list.map((r) => r.id)).size).toBe(list.length);
    expect(JSON.stringify(remind([assignment({ estimateMinutes: 120, dueDate: '2026-09-21' })]).map((r) => r.id)))
      .toBe(JSON.stringify(list.map((r) => r.id)));
  });

  it('keeps a long list readable instead of dumping every assignment', () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      assignment({ title: `Task ${i}`, dueDate: '2026-09-17', estimateMinutes: 15 }),
    );
    const list = remind(many);
    const checkIn = list.find((r) => r.kind === 'check-in' && r.date === TODAY)!;

    expect(checkIn.body).toContain('more');
  });
});
