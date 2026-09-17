import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedReminder } from './messages';

export const CHANNEL_ID = 'homework-reminders';

/** Notifications only work on a real device build, not in a web preview. */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Shows reminders even when the app is open. A student who is already looking at
 * the app still benefits from the nudge, and silently swallowing it makes the
 * feature feel broken during setup.
 */
export function configureNotificationHandler(): void {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Homework reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5B8DEF',
    showBadge: false,
  });
}

export type PermissionState = 'granted' | 'denied' | 'unsupported';

export async function getPermissionState(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  const { granted } = await Notifications.getPermissionsAsync();
  return granted ? 'granted' : 'denied';
}

/** Asks for permission, returning the resulting state rather than throwing. */
export async function requestPermission(): Promise<PermissionState> {
  if (!supported) return 'unsupported';
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return 'granted';
  if (!existing.canAskAgain) return 'denied';
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted ? 'granted' : 'denied';
}

/**
 * Replaces every pending reminder with the given set.
 *
 * The plan is rebuilt from scratch whenever anything changes, so reminders are
 * cleared and rewritten rather than diffed. There are at most a couple of dozen
 * of them, and a stale reminder telling a student to do homework they already
 * finished is exactly the kind of thing that gets an app deleted.
 */
export async function syncReminders(reminders: PlannedReminder[]): Promise<number> {
  if (!supported) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();

  let scheduled = 0;
  for (const reminder of reminders) {
    // A trigger in the past fires immediately on some platforms; skip it.
    if (reminder.fireAt.getTime() <= Date.now()) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: true,
          data: { kind: reminder.kind, date: reminder.date },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    } catch {
      // One bad reminder should not stop the rest from being scheduled.
    }
  }
  return scheduled;
}

export async function cancelAllReminders(): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function countPendingReminders(): Promise<number> {
  if (!supported) return 0;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  return pending.length;
}
