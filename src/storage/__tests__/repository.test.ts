import { DEFAULT_SETTINGS, emptyAppData } from '../../domain/defaults';
import { migrate } from '../repository';

describe('migrate', () => {
  it('starts fresh when there is nothing saved', () => {
    expect(migrate(null).assignments).toEqual([]);
    expect(migrate(undefined).subjects.length).toBeGreaterThan(0);
    expect(migrate('not an object').settings).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps a well-formed payload intact', () => {
    const data = emptyAppData();
    data.assignments = [
      {
        id: 'a1',
        subjectId: data.subjects[0].id,
        title: 'Ch 4',
        notes: 'p 40',
        dueDate: '2026-09-18',
        estimateMinutes: 40,
        createdAt: '2026-09-16T08:00:00.000Z',
        completedAt: null,
      },
    ];
    data.logs = [{ date: '2026-09-16', assignmentId: 'a1', minutes: 20 }];

    const result = migrate(JSON.parse(JSON.stringify(data)));
    expect(result.assignments).toEqual(data.assignments);
    expect(result.logs).toEqual(data.logs);
  });

  it('drops an assignment with an unusable due date rather than crashing the week', () => {
    const result = migrate({
      subjects: [{ id: 's1', name: 'Math', color: '#5B8DEF' }],
      assignments: [
        { id: 'good', subjectId: 's1', dueDate: '2026-09-18', title: 'Fine', estimateMinutes: 30 },
        { id: 'bad', subjectId: 's1', dueDate: 'next Tuesday', title: 'Broken', estimateMinutes: 30 },
        { id: 'worse', subjectId: 's1', title: 'No date at all', estimateMinutes: 30 },
      ],
    });

    expect(result.assignments.map((a) => a.id)).toEqual(['good']);
  });

  it('re-homes an assignment whose class no longer exists', () => {
    const result = migrate({
      subjects: [{ id: 's1', name: 'Math', color: '#5B8DEF' }],
      assignments: [{ id: 'a1', subjectId: 'deleted', dueDate: '2026-09-18', title: 'Orphan', estimateMinutes: 30 }],
    });

    expect(result.assignments[0].subjectId).toBe('s1');
  });

  it('discards logs pointing at assignments that are gone', () => {
    const result = migrate({
      subjects: [{ id: 's1', name: 'Math', color: '#5B8DEF' }],
      assignments: [{ id: 'a1', subjectId: 's1', dueDate: '2026-09-18', title: 'Real', estimateMinutes: 30 }],
      logs: [
        { date: '2026-09-16', assignmentId: 'a1', minutes: 20 },
        { date: '2026-09-16', assignmentId: 'ghost', minutes: 20 },
        { date: 'whenever', assignmentId: 'a1', minutes: 20 },
        { date: '2026-09-16', assignmentId: 'a1', minutes: -5 },
      ],
    });

    expect(result.logs).toEqual([{ date: '2026-09-16', assignmentId: 'a1', minutes: 20 }]);
  });

  it('always leaves at least one class to file work under', () => {
    expect(migrate({ subjects: [] }).subjects.length).toBeGreaterThan(0);
    expect(migrate({ subjects: 'nonsense' }).subjects.length).toBeGreaterThan(0);
  });

  it('removes duplicate ids that would confuse the planner', () => {
    const result = migrate({
      subjects: [
        { id: 's1', name: 'Math', color: '#5B8DEF' },
        { id: 's1', name: 'Math again', color: '#EB5757' },
      ],
      assignments: [
        { id: 'a1', subjectId: 's1', dueDate: '2026-09-18', title: 'One', estimateMinutes: 30 },
        { id: 'a1', subjectId: 's1', dueDate: '2026-09-19', title: 'Duplicate', estimateMinutes: 30 },
      ],
    });

    expect(result.subjects).toHaveLength(1);
    expect(result.assignments).toHaveLength(1);
  });

  it('clamps settings that would make planning impossible', () => {
    const result = migrate({
      settings: {
        capacityByWeekday: [-10, 60, 60, 60, 60, 60, 9999],
        maxChunkMinutes: 5,
        minChunkMinutes: 400,
        planReminderMinutes: 5000,
        checkInMinutes: -60,
      },
    });

    expect(result.settings.capacityByWeekday[0]).toBe(0);
    expect(result.settings.capacityByWeekday[6]).toBeLessThanOrEqual(8 * 60);
    expect(result.settings.minChunkMinutes).toBeLessThanOrEqual(result.settings.maxChunkMinutes);
    expect(result.settings.planReminderMinutes).toBeLessThan(1440);
    expect(result.settings.checkInMinutes).toBeGreaterThanOrEqual(0);
  });

  it('keeps a partial settings object by filling in the defaults', () => {
    const result = migrate({ settings: { notificationsEnabled: false } });

    expect(result.settings.notificationsEnabled).toBe(false);
    expect(result.settings.maxChunkMinutes).toBe(DEFAULT_SETTINGS.maxChunkMinutes);
  });

  it('repairs a title that is missing or blank', () => {
    const result = migrate({
      subjects: [{ id: 's1', name: 'Math', color: '#5B8DEF' }],
      assignments: [{ id: 'a1', subjectId: 's1', dueDate: '2026-09-18', title: '   ', estimateMinutes: 30 }],
    });
    expect(result.assignments[0].title).toBe('Untitled');
  });
});
