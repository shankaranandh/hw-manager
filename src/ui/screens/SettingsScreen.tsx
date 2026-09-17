import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { formatMinutes, formatTimeOfDay } from '../../domain/dates';
import type { CapacityByWeekday, ThemePreference } from '../../domain/types';
import { useApp } from '../../state/store';
import {
  Button,
  Card,
  Divider,
  Gutter,
  Label,
  Screen,
  SectionTitle,
  Text,
} from '../components/primitives';
import { PromptModal } from '../components/PromptModal';
import { TAP_TARGET, radius, space, useTheme, type Theme } from '../theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** The choices a student will actually recognise as "how long I'll sit there". */
const CAPACITY_STEPS = [0, 15, 30, 45, 60, 90, 120];
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const { data, permission, actions } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { settings } = data;
  const [addingSubject, setAddingSubject] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const cycleCapacity = (index: number) => {
    const current = settings.capacityByWeekday[index];
    const position = CAPACITY_STEPS.indexOf(current);
    const next = CAPACITY_STEPS[(position + 1) % CAPACITY_STEPS.length] ?? 60;
    const capacity = [...settings.capacityByWeekday] as CapacityByWeekday;
    capacity[index] = next;
    actions.updateSettings({ capacityByWeekday: capacity });
  };

  const shiftTime = (key: 'planReminderMinutes' | 'checkInMinutes', deltaMinutes: number) => {
    actions.updateSettings({ [key]: (settings[key] + deltaMinutes + 1440) % 1440 });
  };

  const confirmReset = () => {
    Alert.alert(
      'Erase everything?',
      'Every assignment, class and setting goes back to the start. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase', style: 'destructive', onPress: () => actions.resetEverything() },
      ],
    );
  };

  const confirmDeleteSubject = (id: string, name: string) => {
    if (data.subjects.length <= 1) {
      Alert.alert('Keep at least one class', 'Assignments have to belong to something.');
      return;
    }
    Alert.alert(`Delete ${name}?`, 'Its assignments will move to your first class.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => actions.deleteSubject(id) },
    ]);
  };

  const weekTotal = settings.capacityByWeekday.reduce((sum, m) => sum + m, 0);

  return (
    <Screen title="Settings" subtitle="How you want the week paced">
      <SectionTitle
        trailing={
          <Text variant="tiny" color={theme.color.textFaint}>
            {formatMinutes(weekTotal)} a week
          </Text>
        }
      >
        Time you'll actually give it
      </SectionTitle>
      <Gutter>
        <Card>
          <Text variant="small" color={theme.color.textMuted} style={styles.explainer}>
            Tap a day to change how long you're willing to work on it. Set busy days to zero and the
            plan will route around them.
          </Text>
          <View style={styles.capacityRow}>
            {WEEKDAYS.map((label, index) => {
              const minutes = settings.capacityByWeekday[index];
              return (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}: ${formatMinutes(minutes)}`}
                  accessibilityHint="Double tap to change"
                  onPress={() => cycleCapacity(index)}
                  style={({ pressed }) => [
                    styles.capacityDay,
                    minutes === 0 && styles.capacityDayOff,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text variant="tiny" color={theme.color.textFaint}>
                    {label}
                  </Text>
                  <Text
                    variant="heading"
                    color={minutes === 0 ? theme.color.textFaint : theme.color.text}
                    style={styles.capacityValue}
                  >
                    {minutes === 0 ? '—' : minutes}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </Gutter>

      <SectionTitle>Reminders</SectionTitle>
      <Gutter>
        <Card>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text variant="heading" color={theme.color.text}>
                Send me reminders
              </Text>
              <Text variant="small" color={theme.color.textFaint} style={styles.hint}>
                {permission === 'unsupported'
                  ? 'Only available on a phone or iPad, not in the web preview.'
                  : permission === 'granted'
                    ? 'Two a night at most: the plan, then a check-in.'
                    : 'Notifications are switched off for this app in your device settings.'}
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled && permission === 'granted'}
              disabled={permission === 'unsupported'}
              accessibilityLabel="Send me reminders"
              onValueChange={async (on) => {
                if (on && permission !== 'granted') {
                  const result = await actions.askForNotificationPermission();
                  if (result !== 'granted') {
                    Alert.alert(
                      'Notifications are off',
                      'Turn them on for this app in your device settings, then come back.',
                    );
                    return;
                  }
                }
                actions.updateSettings({ notificationsEnabled: on });
              }}
              trackColor={{ true: theme.color.accent, false: theme.color.borderStrong }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Divider />

          <StepperRow
            label="Tonight's plan"
            hint="When you get told what to work on"
            value={formatTimeOfDay(settings.planReminderMinutes)}
            onDecrease={() => shiftTime('planReminderMinutes', -15)}
            onIncrease={() => shiftTime('planReminderMinutes', 15)}
          />
          <StepperRow
            label="Check-in"
            hint="A nudge about anything still unticked"
            value={formatTimeOfDay(settings.checkInMinutes)}
            onDecrease={() => shiftTime('checkInMinutes', -15)}
            onIncrease={() => shiftTime('checkInMinutes', 15)}
          />
        </Card>
      </Gutter>

      <SectionTitle>How work gets split up</SectionTitle>
      <Gutter>
        <Card>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text variant="heading" color={theme.color.text}>
                Finish a day early
              </Text>
              <Text variant="small" color={theme.color.textFaint} style={styles.hint}>
                Schedules big assignments to be done the day before they're due.
              </Text>
            </View>
            <Switch
              value={settings.finishADayEarly}
              accessibilityLabel="Finish a day early"
              onValueChange={(on) => actions.updateSettings({ finishADayEarly: on })}
              trackColor={{ true: theme.color.accent, false: theme.color.borderStrong }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Divider />

          <StepperRow
            label="Longest sitting"
            hint="Work longer than this gets split across days"
            value={formatMinutes(settings.maxChunkMinutes)}
            onDecrease={() =>
              actions.updateSettings({
                maxChunkMinutes: Math.max(settings.minChunkMinutes, settings.maxChunkMinutes - 10),
              })
            }
            onIncrease={() =>
              actions.updateSettings({ maxChunkMinutes: Math.min(180, settings.maxChunkMinutes + 10) })
            }
          />
          <StepperRow
            label="Shortest block"
            hint="Nothing smaller than this lands on your plan"
            value={formatMinutes(settings.minChunkMinutes)}
            onDecrease={() =>
              actions.updateSettings({ minChunkMinutes: Math.max(5, settings.minChunkMinutes - 5) })
            }
            onIncrease={() =>
              actions.updateSettings({
                minChunkMinutes: Math.min(settings.maxChunkMinutes, settings.minChunkMinutes + 5),
              })
            }
          />
        </Card>
      </Gutter>

      <SectionTitle>Appearance</SectionTitle>
      <Gutter>
        <Card>
          <Text variant="small" color={theme.color.textMuted} style={styles.explainer}>
            Auto follows your device, switching to dark in the evening if your phone does.
          </Text>
          <View style={styles.segment}>
            {THEMES.map((option) => {
              const selected = settings.themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => actions.updateSettings({ themePreference: option.value })}
                  style={({ pressed }) => [
                    styles.segmentItem,
                    selected && { backgroundColor: theme.color.accent },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text variant="body" color={selected ? theme.color.onAccent : theme.color.textMuted}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </Gutter>

      <SectionTitle
        trailing={
          <Pressable onPress={() => setAddingSubject(true)} hitSlop={10} accessibilityRole="button">
            <Text variant="small" color={theme.color.accent}>
              + Add
            </Text>
          </Pressable>
        }
      >
        Your classes
      </SectionTitle>
      <Gutter>
        {data.subjects.map((subject) => {
          const colors = theme.subject(subject.color);
          return (
            <Card key={subject.id} style={styles.subjectRow}>
              <View style={[styles.subjectDot, { backgroundColor: colors.dot }]} />
              <Pressable
                style={{ flex: 1 }}
                accessibilityRole="button"
                accessibilityLabel={`Rename ${subject.name}`}
                onPress={() => setRenaming({ id: subject.id, name: subject.name })}
              >
                <Text variant="heading" color={theme.color.text}>
                  {subject.name}
                </Text>
                <Text variant="small" color={theme.color.textFaint} style={styles.hint}>
                  {data.assignments.filter((a) => a.subjectId === subject.id).length} assignments
                </Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDeleteSubject(subject.id, subject.name)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${subject.name}`}
              >
                <Text variant="small" color={theme.color.textFaint}>
                  Remove
                </Text>
              </Pressable>
            </Card>
          );
        })}
      </Gutter>

      <SectionTitle>Your data</SectionTitle>
      <Gutter>
        <Card>
          <Text variant="small" color={theme.color.textMuted} style={styles.explainer}>
            Everything lives on this device. There is no account, nothing is uploaded, and nobody else
            can see it.
          </Text>
          <View style={{ marginTop: space(4) }}>
            <Button label="Erase everything" kind="danger" onPress={confirmReset} />
          </View>
        </Card>
      </Gutter>

      <PromptModal
        visible={addingSubject}
        title="New class"
        placeholder="e.g. Chemistry"
        onCancel={() => setAddingSubject(false)}
        onConfirm={(name) => {
          actions.addSubject(name);
          setAddingSubject(false);
        }}
      />
      <PromptModal
        visible={renaming !== null}
        title="Rename class"
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

function StepperRow({
  label,
  hint,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  hint: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1 }}>
        <Text variant="heading" color={theme.color.text}>
          {label}
        </Text>
        <Text variant="small" color={theme.color.textFaint} style={styles.hint}>
          {hint}
        </Text>
      </View>
      <View style={styles.stepper}>
        <Pressable
          onPress={onDecrease}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.6 }]}
        >
          <Text variant="heading" color={theme.color.text} style={{ lineHeight: 20 }}>
            −
          </Text>
        </Pressable>
        <Text variant="body" color={theme.color.text} style={styles.stepperValue}>
          {value}
        </Text>
        <Pressable
          onPress={onIncrease}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.6 }]}
        >
          <Text variant="heading" color={theme.color.text} style={{ lineHeight: 20 }}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    explainer: { lineHeight: 19 },
    hint: { marginTop: 2, lineHeight: 18 },

    capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space(4), gap: space(1) },
    capacityDay: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: space(2),
      borderRadius: radius.sm,
      backgroundColor: theme.color.surfaceHigh,
      minHeight: TAP_TARGET,
      justifyContent: 'center',
    },
    capacityDayOff: { backgroundColor: theme.color.surfaceSunken },
    capacityValue: { marginTop: 2, fontVariant: ['tabular-nums'] },

    switchRow: { flexDirection: 'row', alignItems: 'center', gap: space(3) },

    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2) },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
    stepperButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.color.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: { minWidth: 78, textAlign: 'center', fontVariant: ['tabular-nums'] },

    segment: {
      flexDirection: 'row',
      gap: space(1),
      marginTop: space(4),
      padding: space(1),
      borderRadius: radius.md,
      backgroundColor: theme.color.surfaceSunken,
    },
    segmentItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: TAP_TARGET - 6,
      borderRadius: radius.sm,
    },

    subjectRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3) },
    subjectDot: { width: 12, height: 12, borderRadius: 6 },
  });
