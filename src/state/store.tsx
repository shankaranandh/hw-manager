import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { makeId, nextSubjectColor } from '../domain/defaults';
import { todayKey } from '../domain/dates';
import { buildPlan } from '../domain/planner';
import type { AppData, Assignment, DayKey, Plan, Settings, Subject } from '../domain/types';
import { buildReminders } from '../notifications/messages';
import {
  cancelAllReminders,
  getPermissionState,
  requestPermission,
  syncReminders,
  type PermissionState,
} from '../notifications/scheduler';
import { emptyAppData } from '../domain/defaults';
import { loadAppData, saveAppData } from '../storage/repository';

export interface NewAssignment {
  subjectId: string;
  title: string;
  notes: string;
  dueDate: DayKey;
  estimateMinutes: number;
}

type Action =
  | { type: 'hydrate'; data: AppData }
  | { type: 'add-assignment'; input: NewAssignment }
  | { type: 'update-assignment'; id: string; patch: Partial<Assignment> }
  | { type: 'delete-assignment'; id: string }
  | { type: 'set-block-done'; date: DayKey; assignmentId: string; minutes: number; done: boolean }
  | { type: 'set-assignment-done'; id: string; done: boolean; today: DayKey }
  | { type: 'add-subject'; name: string }
  | { type: 'update-subject'; id: string; patch: Partial<Subject> }
  | { type: 'delete-subject'; id: string }
  | { type: 'update-settings'; patch: Partial<Settings> }
  | { type: 'reset' };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
      return action.data;

    case 'add-assignment': {
      const assignment: Assignment = {
        id: makeId('hw'),
        subjectId: action.input.subjectId,
        title: action.input.title.trim(),
        notes: action.input.notes.trim(),
        dueDate: action.input.dueDate,
        estimateMinutes: Math.max(5, Math.round(action.input.estimateMinutes)),
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      return { ...state, assignments: [...state.assignments, assignment] };
    }

    case 'update-assignment':
      return {
        ...state,
        assignments: state.assignments.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };

    case 'delete-assignment':
      return {
        ...state,
        assignments: state.assignments.filter((a) => a.id !== action.id),
        logs: state.logs.filter((l) => l.assignmentId !== action.id),
      };

    case 'set-block-done': {
      const logs = setLoggedMinutes(
        state.logs,
        action.date,
        action.assignmentId,
        action.done ? action.minutes : 0,
      );
      return syncCompletion({ ...state, logs }, action.assignmentId);
    }

    case 'set-assignment-done': {
      const assignment = state.assignments.find((a) => a.id === action.id);
      if (!assignment) return state;

      if (action.done) {
        // Record the outstanding minutes as done today: the student did the work,
        // so the week's history should say so.
        const logged = totalLogged(state.logs, action.id);
        const remaining = Math.max(0, assignment.estimateMinutes - logged);
        const logs =
          remaining > 0
            ? setLoggedMinutes(
                state.logs,
                action.today,
                action.id,
                loggedOn(state.logs, action.today, action.id) + remaining,
              )
            : state.logs;
        return {
          ...state,
          logs,
          assignments: state.assignments.map((a) =>
            a.id === action.id ? { ...a, completedAt: new Date().toISOString() } : a,
          ),
        };
      }

      // Reopening undoes today's work first. If the estimate is still fully
      // logged from earlier days there would be nothing left to plan, so the
      // log is cleared entirely rather than leaving a stuck assignment.
      let logs = setLoggedMinutes(state.logs, action.today, action.id, 0);
      if (totalLogged(logs, action.id) >= assignment.estimateMinutes) {
        logs = logs.filter((l) => l.assignmentId !== action.id);
      }
      return {
        ...state,
        logs,
        assignments: state.assignments.map((a) =>
          a.id === action.id ? { ...a, completedAt: null } : a,
        ),
      };
    }

    case 'add-subject': {
      const name = action.name.trim();
      if (!name) return state;
      const subject: Subject = { id: makeId('sub'), name, color: nextSubjectColor(state.subjects) };
      return { ...state, subjects: [...state.subjects, subject] };
    }

    case 'update-subject':
      return {
        ...state,
        subjects: state.subjects.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };

    case 'delete-subject': {
      // Assignments outlive their subject: move them rather than lose them.
      const remaining = state.subjects.filter((s) => s.id !== action.id);
      if (remaining.length === 0) return state;
      const fallback = remaining[0].id;
      return {
        ...state,
        subjects: remaining,
        assignments: state.assignments.map((a) =>
          a.subjectId === action.id ? { ...a, subjectId: fallback } : a,
        ),
      };
    }

    case 'update-settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'reset':
      return emptyAppData();

    default:
      return state;
  }
}

function setLoggedMinutes(
  logs: AppData['logs'],
  date: DayKey,
  assignmentId: string,
  minutes: number,
): AppData['logs'] {
  const without = logs.filter((l) => !(l.date === date && l.assignmentId === assignmentId));
  return minutes > 0 ? [...without, { date, assignmentId, minutes }] : without;
}

const totalLogged = (logs: AppData['logs'], assignmentId: string): number =>
  logs.filter((l) => l.assignmentId === assignmentId).reduce((sum, l) => sum + l.minutes, 0);

const loggedOn = (logs: AppData['logs'], date: DayKey, assignmentId: string): number =>
  logs.find((l) => l.date === date && l.assignmentId === assignmentId)?.minutes ?? 0;

/** Ticking off the final block finishes the assignment; un-ticking reopens it. */
function syncCompletion(state: AppData, assignmentId: string): AppData {
  const assignment = state.assignments.find((a) => a.id === assignmentId);
  if (!assignment) return state;
  const done = totalLogged(state.logs, assignmentId) >= assignment.estimateMinutes;
  if (done === (assignment.completedAt !== null)) return state;
  return {
    ...state,
    assignments: state.assignments.map((a) =>
      a.id === assignmentId ? { ...a, completedAt: done ? new Date().toISOString() : null } : a,
    ),
  };
}

export interface AppActions {
  addAssignment(input: NewAssignment): void;
  updateAssignment(id: string, patch: Partial<Assignment>): void;
  deleteAssignment(id: string): void;
  setBlockDone(date: DayKey, assignmentId: string, minutes: number, done: boolean): void;
  setAssignmentDone(id: string, done: boolean): void;
  addSubject(name: string): void;
  updateSubject(id: string, patch: Partial<Subject>): void;
  deleteSubject(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  resetEverything(): void;
  askForNotificationPermission(): Promise<PermissionState>;
}

interface AppContextValue {
  ready: boolean;
  data: AppData;
  plan: Plan;
  today: DayKey;
  permission: PermissionState;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, null, emptyAppData);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState<DayKey>(() => todayKey());
  const [permission, setPermission] = useState<PermissionState>('denied');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, permissionState] = await Promise.all([loadAppData(), getPermissionState()]);
      if (cancelled) return;
      dispatch({ type: 'hydrate', data: loaded });
      setPermission(permissionState);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The app is usually left open overnight, so "today" has to be watched rather
  // than read once at launch, or the plan silently shows yesterday.
  useEffect(() => {
    const refresh = () => setToday((current) => {
      const now = todayKey();
      return now === current ? current : now;
    });
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveAppData(data).catch(() => {
      // Losing one write is recoverable; the next change will try again.
    });
  }, [data, ready]);

  const plan = useMemo(
    () =>
      buildPlan({
        assignments: data.assignments,
        logs: data.logs,
        settings: data.settings,
        today,
      }),
    [data.assignments, data.logs, data.settings, today],
  );

  // Rewrite the pending reminders whenever the plan changes, but not on every
  // keystroke: scheduling is a native round-trip per notification.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (!data.settings.notificationsEnabled || permission !== 'granted') {
        cancelAllReminders().catch(() => {});
        return;
      }
      const reminders = buildReminders({
        plan,
        assignments: data.assignments,
        subjects: data.subjects,
        settings: data.settings,
        today,
        now: new Date(),
      });
      syncReminders(reminders).catch(() => {});
    }, 500);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [ready, plan, data.assignments, data.subjects, data.settings, today, permission]);

  const askForNotificationPermission = useCallback(async () => {
    const state = await requestPermission();
    setPermission(state);
    return state;
  }, []);

  const actions = useMemo<AppActions>(
    () => ({
      addAssignment: (input) => dispatch({ type: 'add-assignment', input }),
      updateAssignment: (id, patch) => dispatch({ type: 'update-assignment', id, patch }),
      deleteAssignment: (id) => dispatch({ type: 'delete-assignment', id }),
      setBlockDone: (date, assignmentId, minutes, done) =>
        dispatch({ type: 'set-block-done', date, assignmentId, minutes, done }),
      setAssignmentDone: (id, done) => dispatch({ type: 'set-assignment-done', id, done, today }),
      addSubject: (name) => dispatch({ type: 'add-subject', name }),
      updateSubject: (id, patch) => dispatch({ type: 'update-subject', id, patch }),
      deleteSubject: (id) => dispatch({ type: 'delete-subject', id }),
      updateSettings: (patch) => dispatch({ type: 'update-settings', patch }),
      resetEverything: () => dispatch({ type: 'reset' }),
      askForNotificationPermission,
    }),
    [today, askForNotificationPermission],
  );

  const value = useMemo<AppContextValue>(
    () => ({ ready, data, plan, today, permission, actions }),
    [ready, data, plan, today, permission, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

export { reducer as __reducerForTests };
