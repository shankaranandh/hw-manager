import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { nextCapacity } from '../../domain/capacity';
import { formatMinutes, formatTimeOfDay } from '../../domain/dates';
import type { CapacityByWeekday, ThemePreference } from '../../domain/types';
import { useApp } from '../../state/store';
import { ListAction, ListRow, ListSection } from '../components/List';
import { PromptModal } from '../components/PromptModal';
import { Screen, Text } from '../components/primitives';
import { SubScreen } from '../components/SubScreen';
import { TimePickerSheet } from '../components/TimePickerSheet';
import { TAP_TARGET, radius, space, useTheme, type Theme } from '../theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Automatic',
  light: 'Light',
  dark: 'Dark',
};

export function SettingsScreen() {
  const { data, permission, actions } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = data;

  const [pane, setPane] = useState<null | 'time' | 'pacing' | 'classes' | 'appearance'>(null);
  const [timePicker, setTimePicker] = useState<null | 'plan' | 'checkIn'>(null);
  const [addingSubject, setAddingSubject] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const weekTotal = settings.capacityByWeekday.reduce((sum, m) => sum + m, 0);
  const remindersOn = settings.notificationsEnabled && permission === 'granted';

  const setCapacity = (index: number, minutes: number) => {
    const capacity = [...settings.capacityByWeekday] as CapacityByWeekday;
    capacity[index] = minutes;
    actions.updateSettings({ capacityByWeekday: capacity });
  };

  const toggleReminders = async (on: boolean) => {
    if (on && permission !== 'granted') {
      const result = await actions.askForNotificationPermission();
      if (result !== 'granted') {
        Alert.alert('Notifications are off', 'Turn them on for Chunks in your device settings, then come back.');
        return;
      }
    }
    actions.updateSettings({ notificationsEnabled: on });
  };

  const confirmReset = () => {
    Alert.alert('Erase Everything?', 'Every assignment, class and setting goes back to the start.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => actions.resetEverything() },
    ]);
  };

  const confirmDeleteSubject = (id: string, name: string) => {
    if (data.subjects.length <= 1) {
      Alert.alert('Keep at least one class', 'Assignments have to belong to something.');
      return;
    }
    Alert.alert(`Delete ${name}?`, 'Its assignments move to your first class.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => actions.deleteSubject(id) },
    ]);
  };

  return (
    <Screen title="Settings">
      <ListSection header="Homework time">
        <ListRow
          label="Time each day"
          value={formatMinutes(weekTotal) + ' a week'}
          icon="time"
          onPress={() => setPane('time')}
        />
        <ListRow label="Pacing" value={formatMinutes(settings.maxChunkMinutes) + ' max'} icon="options" onPress={() => setPane('pacing')} />
      </ListSection>

      <ListSection
        header="Reminders"
        footer={
          permission === 'unsupported'
            ? 'Reminders need a phone or iPad.'
            : permission !== 'granted'
              ? 'Notifications are switched off for Chunks in your device settings.'
              : 'Two a night at most, and nothing at all on a free evening.'
        }
      >
        <ListRow
          label="Reminders"
          icon="notifications"
          iconColor={theme.color.danger}
          switchValue={remindersOn}
          switchDisabled={permission === 'unsupported'}
          onSwitchChange={toggleReminders}
        />
        {remindersOn ? (
          <ListRow label="Tonight's plan" value={formatTimeOfDay(settings.planReminderMinutes)} onPress={() => setTimePicker('plan')} />
        ) : null}
        {remindersOn ? (
          <ListRow label="Check-in" value={formatTimeOfDay(settings.checkInMinutes)} onPress={() => setTimePicker('checkIn')} />
        ) : null}
      </ListSection>

      <ListSection header="Classes">
        <ListRow label="Your classes" value={`${data.subjects.length}`} icon="school" iconColor={theme.color.success} onPress={() => setPane('classes')} />
      </ListSection>

      <ListSection header="General">
        <ListRow label="Appearance" value={THEME_LABEL[settings.themePreference]} icon="contrast" iconColor={theme.color.textMuted} onPress={() => setPane('appearance')} />
      </ListSection>

      <ListSection footer="Everything stays on this device. No account, nothing uploaded.">
        <ListRow label="Erase Everything" destructive accessory="none" onPress={confirmReset} />
      </ListSection>

      {/* --- Time each day -------------------------------------------------- */}
      <SubScreen visible={pane === 'time'} title="Time Each Day" onClose={() => setPane(null)}>
        <ListSection footer="How long you're willing to work on each day. Set a busy day to None and the plan routes around it.">
          {DAYS.map((day, index) => (
            <ListRow
              key={day}
              label={day}
              value={settings.capacityByWeekday[index] === 0 ? 'None' : formatMinutes(settings.capacityByWeekday[index])}
              onPress={() => setCapacity(index, nextCapacity(settings.capacityByWeekday[index]))}
              accessory="none"
              accessibilityHint="Double tap to change"
            />
          ))}
        </ListSection>
      </SubScreen>

      {/* --- Pacing --------------------------------------------------------- */}
      <SubScreen visible={pane === 'pacing'} title="Pacing" onClose={() => setPane(null)}>
        <ListSection footer="Work longer than the longest sitting gets split across days. Nothing shorter than the shortest block lands on your plan.">
          <ListRow
            label="Longest sitting"
            value={formatMinutes(settings.maxChunkMinutes)}
            accessory="none"
            onPress={() =>
              actions.updateSettings({
                maxChunkMinutes: settings.maxChunkMinutes >= 90 ? settings.minChunkMinutes : settings.maxChunkMinutes + 10,
              })
            }
          />
          <ListRow
            label="Shortest block"
            value={formatMinutes(settings.minChunkMinutes)}
            accessory="none"
            onPress={() =>
              actions.updateSettings({
                minChunkMinutes: settings.minChunkMinutes >= settings.maxChunkMinutes ? 5 : settings.minChunkMinutes + 5,
              })
            }
          />
        </ListSection>
        <ListSection footer="Schedules big assignments to be done the day before they're due, so a surprise on the due date isn't a disaster.">
          <ListRow
            label="Finish a day early"
            switchValue={settings.finishADayEarly}
            onSwitchChange={(on) => actions.updateSettings({ finishADayEarly: on })}
          />
        </ListSection>
      </SubScreen>

      {/* --- Classes -------------------------------------------------------- */}
      <SubScreen visible={pane === 'classes'} title="Classes" onClose={() => setPane(null)}>
        <ListSection footer="Tap a class to rename it. Deleting one moves its assignments to your first class.">
          {data.subjects.map((subject) => (
            <ListRow
              key={subject.id}
              label={subject.name}
              value={`${data.assignments.filter((a) => a.subjectId === subject.id).length}`}
              icon="ellipse"
              iconColor={theme.subject(subject.color).dot}
              onPress={() => setRenaming({ id: subject.id, name: subject.name })}
            />
          ))}
          <ListAction label="Add Class" onPress={() => setAddingSubject(true)} />
        </ListSection>
        <ListSection>
          {data.subjects.map((subject) => (
            <ListRow
              key={subject.id}
              label={`Delete ${subject.name}`}
              destructive
              accessory="none"
              onPress={() => confirmDeleteSubject(subject.id, subject.name)}
            />
          ))}
        </ListSection>
      </SubScreen>

      {/* --- Appearance ----------------------------------------------------- */}
      <SubScreen visible={pane === 'appearance'} title="Appearance" onClose={() => setPane(null)}>
        <ListSection footer="Automatic follows your device, switching to dark in the evening if your phone does.">
          {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: settings.themePreference === option }}
              onPress={() => actions.updateSettings({ themePreference: option })}
              style={({ pressed }) => [styles.choice, pressed && { backgroundColor: theme.color.surfaceHigh }]}
            >
              <Text variant="body" color={theme.color.text} style={{ flex: 1 }}>
                {THEME_LABEL[option]}
              </Text>
              {settings.themePreference === option ? (
                <Text variant="heading" color={theme.color.accent}>
                  ✓
                </Text>
              ) : null}
            </Pressable>
          ))}
        </ListSection>
      </SubScreen>

      <TimePickerSheet
        visible={timePicker !== null}
        title={timePicker === 'plan' ? "Tonight's Plan" : 'Check-in'}
        minutes={timePicker === 'checkIn' ? settings.checkInMinutes : settings.planReminderMinutes}
        onCancel={() => setTimePicker(null)}
        onConfirm={(minutes) => {
          actions.updateSettings(
            timePicker === 'checkIn' ? { checkInMinutes: minutes } : { planReminderMinutes: minutes },
          );
          setTimePicker(null);
        }}
      />

      <PromptModal
        visible={addingSubject}
        title="New Class"
        placeholder="e.g. Chemistry"
        onCancel={() => setAddingSubject(false)}
        onConfirm={(name) => {
          actions.addSubject(name);
          setAddingSubject(false);
        }}
      />
      <PromptModal
        visible={renaming !== null}
        title="Rename Class"
        initialValue={renaming?.name ?? ''}
        confirmLabel="Save"
        onCancel={() => setRenaming(null)}
        onConfirm={(name) => {
          if (renaming) actions.updateSubject(renaming.id, { name });
          setRenaming(null);
        }}
      />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TAP_TARGET,
      paddingHorizontal: space(4),
      paddingVertical: space(2),
      borderRadius: radius.sm,
    },
  });
