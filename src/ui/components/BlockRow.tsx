import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { diffDays, formatMinutes, relativeDayLabel } from '../../domain/dates';
import type { Assignment, DayKey, Subject, WorkBlock } from '../../domain/types';
import { TAP_TARGET, color, font, radius, space } from '../theme';
import { Badge } from './primitives';

export function BlockRow({
  block,
  assignment,
  subject,
  today,
  onToggle,
  onOpen,
}: {
  block: WorkBlock;
  assignment: Assignment;
  subject: Subject | undefined;
  today: DayKey;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
}) {
  const done = block.doneMinutes >= block.minutes;
  const tint = subject?.color ?? color.accent;
  const daysUntilDue = diffDays(block.date, assignment.dueDate);

  const toggle = () => {
    Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    );
    onToggle(!done);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${done ? 'Done' : 'Not done'}: ${assignment.title}, ${formatMinutes(block.minutes)}`}
        onPress={toggle}
        hitSlop={8}
        style={({ pressed }) => [
          styles.checkbox,
          // Green rather than the subject colour: a red or orange tick reads as
          // an error, and "done" is the one state that must never look wrong.
          done && { backgroundColor: color.success, borderColor: color.success },
          pressed && styles.pressed,
        ]}
      >
        {done ? <Text style={styles.check}>✓</Text> : null}
      </Pressable>

      <Pressable onPress={onOpen} style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <View style={styles.titleRow}>
          <View style={[styles.subjectDot, { backgroundColor: tint }]} />
          <Text style={styles.subject} numberOfLines={1}>
            {subject?.name ?? 'Homework'}
          </Text>
          {block.urgent && !done ? (
            <Badge label={daysUntilDue < 0 ? 'late' : 'due today'} tone="danger" />
          ) : daysUntilDue === 1 && !done ? (
            <Badge label="due tmrw" tone="warning" />
          ) : null}
        </View>

        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {assignment.title}
        </Text>

        <Text style={styles.meta}>
          {formatMinutes(block.minutes)}
          {block.isFinisher && !done ? ' · finishes it' : ''}
          {!block.urgent ? ` · due ${relativeDayLabel(assignment.dueDate, today).toLowerCase()}` : ''}
        </Text>
      </Pressable>

      <View style={[styles.minutesPill, done && { backgroundColor: 'transparent' }]}>
        <Text style={[styles.minutes, done && styles.minutesDone]}>
          {done ? '✓' : `${block.minutes}m`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space(3),
    paddingHorizontal: space(3),
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#0B1020', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  pressed: { opacity: 0.6 },

  body: { flex: 1, minHeight: TAP_TARGET, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  subjectDot: { width: 7, height: 7, borderRadius: 4 },
  subject: { ...font.tiny, color: color.textMuted, textTransform: 'uppercase' },
  title: { ...font.heading, color: color.text, marginTop: space(1) },
  titleDone: { color: color.textFaint, textDecorationLine: 'line-through' },
  meta: { ...font.small, color: color.textFaint, marginTop: 2 },

  minutesPill: {
    minWidth: 42,
    alignItems: 'center',
    paddingVertical: space(1),
    paddingHorizontal: space(2),
    borderRadius: radius.sm,
    backgroundColor: color.surfaceHigh,
  },
  minutes: { ...font.small, color: color.textMuted, fontVariant: ['tabular-nums'] },
  minutesDone: { color: color.success },
});
