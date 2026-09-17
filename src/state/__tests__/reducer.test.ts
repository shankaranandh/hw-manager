import { emptyAppData } from '../../domain/defaults';
import type { AppData } from '../../domain/types';
import { __reducerForTests as reducer } from '../store';

const TODAY = '2026-09-16';

const seed = (): AppData => ({
  ...emptyAppData(),
  subjects: [
    { id: 's1', name: 'Math', color: '#5B8DEF' },
    { id: 's2', name: 'English', color: '#F2994A' },
  ],
  assignments: [
    {
      id: 'a1',
      subjectId: 's1',
      title: 'Ch 4 problems',
      notes: '',
      dueDate: '2026-09-18',
      estimateMinutes: 60,
      createdAt: '2026-09-16T08:00:00.000Z',
      completedAt: null,
    },
  ],
  logs: [],
});

const loggedFor = (state: AppData, id: string) =>
  state.logs.filter((l) => l.assignmentId === id).reduce((sum, l) => sum + l.minutes, 0);

describe('assignments', () => {
  it('adds an assignment with trimmed text and a sane estimate', () => {
    const next = reducer(seed(), {
      type: 'add-assignment',
      input: { subjectId: 's2', title: '  Read ch 3  ', notes: '  pages 40-55 ', dueDate: '2026-09-20', estimateMinutes: 40 },
    });

    const added = next.assignments[next.assignments.length - 1];
    expect(added.title).toBe('Read ch 3');
    expect(added.notes).toBe('pages 40-55');
    expect(added.estimateMinutes).toBe(40);
    expect(added.completedAt).toBeNull();
  });

  it('refuses to store an estimate of zero minutes', () => {
    const next = reducer(seed(), {
      type: 'add-assignment',
      input: { subjectId: 's1', title: 'Tiny', notes: '', dueDate: '2026-09-20', estimateMinutes: 0 },
    });
    expect(next.assignments[next.assignments.length - 1].estimateMinutes).toBeGreaterThanOrEqual(5);
  });

  it('takes the logged work with it when an assignment is deleted', () => {
    const withLog = reducer(seed(), {
      type: 'set-block-done',
      date: TODAY,
      assignmentId: 'a1',
      minutes: 30,
      done: true,
    });
    const next = reducer(withLog, { type: 'delete-assignment', id: 'a1' });

    expect(next.assignments).toHaveLength(0);
    expect(next.logs).toHaveLength(0);
  });
});

describe('ticking off work', () => {
  it('logs the block without finishing an assignment that has more to do', () => {
    const next = reducer(seed(), {
      type: 'set-block-done',
      date: TODAY,
      assignmentId: 'a1',
      minutes: 30,
      done: true,
    });

    expect(loggedFor(next, 'a1')).toBe(30);
    expect(next.assignments[0].completedAt).toBeNull();
  });

  it('finishes the assignment when the last block is ticked', () => {
    let state = reducer(seed(), { type: 'set-block-done', date: TODAY, assignmentId: 'a1', minutes: 30, done: true });
    state = reducer(state, { type: 'set-block-done', date: '2026-09-17', assignmentId: 'a1', minutes: 30, done: true });

    expect(loggedFor(state, 'a1')).toBe(60);
    expect(state.assignments[0].completedAt).not.toBeNull();
  });

  it('reopens the assignment when a block is un-ticked', () => {
    let state = reducer(seed(), { type: 'set-block-done', date: TODAY, assignmentId: 'a1', minutes: 60, done: true });
    expect(state.assignments[0].completedAt).not.toBeNull();

    state = reducer(state, { type: 'set-block-done', date: TODAY, assignmentId: 'a1', minutes: 60, done: false });
    expect(loggedFor(state, 'a1')).toBe(0);
    expect(state.assignments[0].completedAt).toBeNull();
  });

  it('does not double-count a block ticked twice', () => {
    let state = reducer(seed(), { type: 'set-block-done', date: TODAY, assignmentId: 'a1', minutes: 30, done: true });
    state = reducer(state, { type: 'set-block-done', date: TODAY, assignmentId: 'a1', minutes: 30, done: true });
    expect(loggedFor(state, 'a1')).toBe(30);
  });
});

describe('finishing a whole assignment', () => {
  it('records the outstanding minutes as work done today', () => {
    const next = reducer(seed(), { type: 'set-assignment-done', id: 'a1', done: true, today: TODAY });

    expect(next.assignments[0].completedAt).not.toBeNull();
    expect(loggedFor(next, 'a1')).toBe(60);
    expect(next.logs.find((l) => l.assignmentId === 'a1')!.date).toBe(TODAY);
  });

  it('adds only what was left when some work was already logged', () => {
    let state = reducer(seed(), { type: 'set-block-done', date: '2026-09-15', assignmentId: 'a1', minutes: 20, done: true });
    state = reducer(state, { type: 'set-assignment-done', id: 'a1', done: true, today: TODAY });

    expect(loggedFor(state, 'a1')).toBe(60);
  });

  it('leaves work to do after reopening, rather than a stuck assignment', () => {
    let state = reducer(seed(), { type: 'set-assignment-done', id: 'a1', done: true, today: TODAY });
    state = reducer(state, { type: 'set-assignment-done', id: 'a1', done: false, today: TODAY });

    expect(state.assignments[0].completedAt).toBeNull();
    expect(loggedFor(state, 'a1')).toBeLessThan(state.assignments[0].estimateMinutes);
  });

  it('reopening something finished on an earlier day still leaves work to do', () => {
    let state = reducer(seed(), { type: 'set-assignment-done', id: 'a1', done: true, today: '2026-09-10' });
    state = reducer(state, { type: 'set-assignment-done', id: 'a1', done: false, today: TODAY });

    expect(state.assignments[0].completedAt).toBeNull();
    expect(loggedFor(state, 'a1')).toBeLessThan(60);
  });
});

describe('classes', () => {
  it('moves assignments to another class instead of deleting them', () => {
    const next = reducer(seed(), { type: 'delete-subject', id: 's1' });

    expect(next.subjects.map((s) => s.id)).toEqual(['s2']);
    expect(next.assignments[0].subjectId).toBe('s2');
  });

  it('refuses to delete the last class', () => {
    const single = { ...seed(), subjects: [{ id: 's1', name: 'Math', color: '#5B8DEF' }] };
    expect(reducer(single, { type: 'delete-subject', id: 's1' }).subjects).toHaveLength(1);
  });

  it('ignores a blank class name', () => {
    const next = reducer(seed(), { type: 'add-subject', name: '   ' });
    expect(next.subjects).toHaveLength(2);
  });

  it('gives a new class a colour that is not already in use', () => {
    const next = reducer(seed(), { type: 'add-subject', name: 'Physics' });
    const colors = next.subjects.map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('settings', () => {
  it('merges a partial change without dropping the rest', () => {
    const next = reducer(seed(), { type: 'update-settings', patch: { maxChunkMinutes: 25 } });

    expect(next.settings.maxChunkMinutes).toBe(25);
    expect(next.settings.minChunkMinutes).toBe(seed().settings.minChunkMinutes);
  });
});
