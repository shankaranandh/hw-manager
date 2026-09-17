import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { formatMinutes, formatTimeOfDay } from '../../domain/dates';
import type { CapacityByWeekday } from '../../domain/types';
import { useApp } from '../../state/store';
import { Button, Card, Label, Screen, SectionTitle } from '../components/primitives';
import { PromptModal } from '../components/PromptModal';
import { TAP_TARGET, color, font, radius, space } from '../theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** The choices a student will actually recognise as "how long I'll sit there". */
const CAPACITY_STEPS = [0, 15, 30, 45, 60, 90, 120];

export function SettingsScreen() {
  const { data, permission, actions } = useApp();
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
    const next = (settings[key] + deltaMinutes + 1440) % 1440;
    actions.updateSettings({ [key]: next });
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
      <SectionTitle trailing={<Text style={styles.sectionMeta}>{formatMinutes(weekTotal)} a week</Text>}>
        Time you'll actually give it
      </SectionTitle>
      <View style={styles.block}>
        <Card>
          <Text style={styles.explainer}>
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
                  accessibilityLabel={`${label}: ${formatMinutes(minutes)}. Tap to change.`}
                  onPress={() => cycleCapacity(index)}
                  style={({ pressed }) => [
                    styles.capacityDay,
                    minutes === 0 && styles.capacityDayOff,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.capacityLabel}>{label}</Text>
                  <Text style={[styles.capacityValue, minutes === 0 && styles.capacityValueOff]}>
                    {minutes === 0 ? '—' : minutes}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>

      <SectionTitle>Reminders</SectionTitle>
      <View style={styles.block}>
        <Card>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Send me reminders</Text>
              <Text style={styles.rowHint}>
                {permission === 'unsupported'
                  ? 'Only available on a phone, not in the web preview.'
                  : permission === 'granted'
                    ? 'Two a night at most: the plan, then a check-in.'
                    : 'Your phone has notifications turned off for this app.'}
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled && permission === 'granted'}
              disabled={permission === 'unsupported'}
              onValueChange={async (on) => {
                if (on && permission !== 'granted') {
                  const result = await actions.askForNotificationPermission();
                  if (result !== 'granted') {
                    Alert.alert(
                      'Notifications are off',
                      'Turn them on for this app in your phone settings, then come back.',
                    );
                    return;
                  }
                }
                actions.updateSettings({ notificationsEnabled: on });
              }}
              trackColor={{ true: color.accent, false: color.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <TimeRow
            label="Tonight's plan"
            hint="When you get told what to work on"
            minutes={settings.planReminderMinutes}
            onShift={(delta) => shiftTime('planReminderMinutes', delta)}
          />
          <TimeRow
            label="Check-in"
            hint="A nudge about anything still unticked"
            minutes={settings.checkInMinutes}
            onShift={(delta) => shiftTime('checkInMinutes', delta)}
          />
        </Card>
      </View>

      <SectionTitle>How work gets split up</SectionTitle>
      <View style={styles.block}>
        <Card>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Finish a day early</Text>
              <Text style={styles.rowHint}>
                Schedules big assignments to be done the day before they're due.
              </Text>
            </View>
            <Switch
              value={settings.finishADayEarly}
              onValueChange={(on) => actions.updateSettings({ finishADayEarly: on })}
              trackColor={{ true: color.accent, false: color.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

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
      </View>

      <SectionTitle
        trailing={
          <Pressable onPress={() => setAddingSubject(true)} hitSlop={10}>
            <Text style={styles.link}>+ Add</Text>
          </Pressable>
        }
      >
        Your classes
      </SectionTitle>
      <View style={styles.block}>
        {data.subjects.map((subject) => (
          <Card key={subject.id} style={styles.subjectRow}>
            <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
            <Pressable
              style={{ flex: 1 }}
              onPress={() => setRenaming({ id: subject.id, name: subject.name })}
            >
              <Text style={styles.rowTitle}>{subject.name}</Text>
              <Text style={styles.rowHint}>
                {data.assignments.filter((a) => a.subjectId === subject.id).length} assignments
              </Text>
            </Pressable>
            <Pressable
              onPress={() => confirmDeleteSubject(subject.id, subject.name)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${subject.name}`}
            >
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </Card>
        ))}
      </View>

      <SectionTitle>Your data</SectionTitle>
      <View style={styles.block}>
        <Card>
          <Text style={styles.explainer}>
            Everything lives on this phone. There is no account, nothing is uploaded, and nobody else
            can see it.
          </Text>
          <View style={{ marginTop: space(4) }}>
            <Button label="Erase everything" kind="danger" onPress={confirmReset} />
          </View>
        </Card>
      </View>

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

function TimeRow({
  label,
  hint,
  minutes,
  onShift,
}: {
  label: string;
  hint: string;
  minutes: number;
  onShift: (deltaMinutes: number) => void;
}) {
  return (
    <StepperRow
      label={label}
      hint={hint}
      value={formatTimeOfDay(minutes)}
      onDecrease={() => onShift(-15)}
      onIncrease={() => onShift(15)}
    />
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
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable
          onPress={onDecrease}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.stepperSymbol}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={onIncrease}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.stepperSymbol}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: space(5), gap: space(2) },
  sectionMeta: { ...font.tiny, color: color.textFaint },
  explainer: { ...font.small, color: color.textMuted, lineHeight: 19 },
  link: { ...font.small, color: color.accent },

  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space(4), gap: space(1) },
  capacityDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space(2),
    borderRadius: radius.sm,
    backgroundColor: color.surfaceHigh,
    minHeight: TAP_TARGET,
    justifyContent: 'center',
  },
  capacityDayOff: { backgroundColor: color.surfaceSunken },
  capacityLabel: { ...font.tiny, color: color.textFaint },
  capacityValue: { ...font.heading, color: color.text, marginTop: 2, fontVariant: ['tabular-nums'] },
  capacityValueOff: { color: color.textFaint },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  rowTitle: { ...font.heading, color: color.text },
  rowHint: { ...font.small, color: color.textFaint, marginTop: 2, lineHeight: 18 },
  divider: { height: 1, backgroundColor: color.border, marginVertical: space(4) },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(2) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: { ...font.heading, color: color.text, lineHeight: 20 },
  stepperValue: {
    ...font.body,
    color: color.text,
    minWidth: 74,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3) },
  subjectDot: { width: 12, height: 12, borderRadius: 6 },
  remove: { ...font.small, color: color.textFaint },
});
