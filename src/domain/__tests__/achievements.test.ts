import { computeAchievements, daysEarlyFor, streakMessage } from '../achievements';
import type { Assignment, WorkLog } from '../types';

const TODAY = '2026-09-18'; // Friday

let seq = 0;
const assignment = (overrides: Partial<Assignment> = {}): Assignment => {
  seq += 1;
  return {
    id: `a${seq}`,
    subjectId: 's1',
    title: `Assignment ${seq}`,
    notes: '',
    dueDate: '2026-09-20',
    estimateMinutes: 40,
    createdAt: '2026-09-10T08:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
};

/** Completed at midday on the given day, in local time. */
const completedOn = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};

const log = (date: string, assignmentId = 'a1', minutes = 30): WorkLog => ({ date, assignmentId, minutes });

beforeEach(() => {
  seq = 0;
});

describe('days early', () => {
  it('counts the gap between finishing and the due date', () => {
    expect(daysEarlyFor(assignment({ dueDate: '2026-09-20', completedAt: completedOn('2026-09-17') }))).toBe(3);
  });

  it('is zero for work finished on the day it was due', () => {
    expect(daysEarlyFor(assignment({ dueDate: '2026-09-20', completedAt: completedOn('2026-09-20') }))).toBe(0);
  });

  it('is zero, not negative, for late work', () => {
    expect(daysEarlyFor(assignment({ dueDate: '2026-09-20', completedAt: completedOn('2026-09-22') }))).toBe(0);
  });

  it('is zero for unfinished work', () => {
    expect(daysEarlyFor(assignment())).toBe(0);
  });
});

describe('completion tallies', () => {
  it('separates early, on-time and late', () => {
    const result = computeAchievements({
      today: TODAY,
      logs: [],
      assignments: [
        assignment({ dueDate: '2026-09-20', completedAt: completedOn('2026-09-17') }), // 3 early
        assignment({ dueDate: '2026-09-18', completedAt: completedOn('2026-09-18') }), // on time
        assignment({ dueDate: '2026-09-15', completedAt: completedOn('2026-09-17') }), // late
        assignment(), // unfinished
      ],
    });

    expect(result.finishedCount).toBe(3);
    expect(result.onTimeCount).toBe(2);
    expect(result.earlyCount).toBe(1);
    expect(result.daysEarly).toBe(3);
  });

  it('starts at zero for a student who has done nothing yet', () => {
    const result = computeAchievements({ today: TODAY, logs: [], assignments: [] });
    expect(result).toMatchObject({ finishedCount: 0, daysEarly: 0, currentStreak: 0, bestStreak: 0 });
  });
});

describe('streaks', () => {
  const outstanding = [assignment({ createdAt: '2026-09-01T08:00:00.000Z', dueDate: '2026-09-30' })];

  it('counts consecutive days with work logged', () => {
    const logs = ['2026-09-18', '2026-09-17', '2026-09-16'].map((d) => log(d));
    expect(computeAchievements({ today: TODAY, logs, assignments: outstanding }).currentStreak).toBe(3);
  });

  it('does not break on a day when there was nothing to do', () => {
    // Nothing existed before the 16th, so the 15th cannot count against them.
    const assignments = [assignment({ createdAt: '2026-09-16T08:00:00.000Z', dueDate: '2026-09-30' })];
    const logs = [log('2026-09-18'), log('2026-09-17'), log('2026-09-16')];
    expect(computeAchievements({ today: TODAY, logs, assignments }).currentStreak).toBe(3);
  });

  it('breaks on a day work was available and none was done', () => {
    const logs = [log('2026-09-18'), log('2026-09-17'), log('2026-09-15')];
    // The 16th is a miss, so the run is just the 17th and 18th.
    expect(computeAchievements({ today: TODAY, logs, assignments: outstanding }).currentStreak).toBe(2);
  });

  it('does not punish a today that is not finished yet', () => {
    // Nothing logged today, but the evening is not over.
    const logs = [log('2026-09-17'), log('2026-09-16')];
    expect(computeAchievements({ today: TODAY, logs, assignments: outstanding }).currentStreak).toBe(2);
  });

  it('keeps the best run even after the current one breaks', () => {
    const logs = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-18'].map((d) => log(d));
    const result = computeAchievements({ today: TODAY, logs, assignments: outstanding });
    expect(result.currentStreak).toBe(1);
    expect(result.bestStreak).toBe(4);
  });

  it('never reports a best shorter than the current run', () => {
    const logs = ['2026-09-18', '2026-09-17'].map((d) => log(d));
    const result = computeAchievements({ today: TODAY, logs, assignments: outstanding });
    expect(result.bestStreak).toBeGreaterThanOrEqual(result.currentStreak);
  });

  it('ignores an assignment finished before the day in question', () => {
    // Finished on the 10th, so it cannot make the 16th a missed day.
    const assignments = [
      assignment({ createdAt: '2026-09-01T08:00:00.000Z', dueDate: '2026-09-12', completedAt: completedOn('2026-09-10') }),
    ];
    const logs = [log('2026-09-18')];
    expect(computeAchievements({ today: TODAY, logs, assignments }).currentStreak).toBe(1);
  });
});

describe('cleared today', () => {
  it('is true only when every planned minute is done', () => {
    const base = { today: TODAY, logs: [], assignments: [] };
    expect(computeAchievements({ ...base, todayPlannedMinutes: 60, todayDoneMinutes: 60 }).clearedToday).toBe(true);
    expect(computeAchievements({ ...base, todayPlannedMinutes: 60, todayDoneMinutes: 45 }).clearedToday).toBe(false);
  });

  it('is false on a day with nothing planned, which is not an achievement', () => {
    const result = computeAchievements({
      today: TODAY,
      logs: [],
      assignments: [],
      todayPlannedMinutes: 0,
      todayDoneMinutes: 0,
    });
    expect(result.clearedToday).toBe(false);
  });
});

describe('streak wording', () => {
  it('invites rather than scolds at zero', () => {
    expect(streakMessage(0)).toMatch(/start a streak/i);
    expect(streakMessage(0)).not.toMatch(/lost|broke|failed|missed/i);
  });

  it('scales with the run', () => {
    expect(streakMessage(1)).toBe('Day one');
    expect(streakMessage(3)).toBe('3 days in a row');
    expect(streakMessage(7)).toMatch(/habit/);
    expect(streakMessage(30)).toMatch(/impressive/);
  });
});
