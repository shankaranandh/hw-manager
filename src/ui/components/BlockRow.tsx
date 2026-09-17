import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { diffDays, formatMinutes, relativeDayLabel } from '../../domain/dates';
import type { Assignment, DayKey, Subject, WorkBlock } from '../../domain/types';
import { TAP_TARGET, radius, space, useTheme, type Theme } from '../theme';
import { Badge, Text } from './primitives';

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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const done = block.doneMinutes >= block.minutes;
  const colors = theme.subject(subject?.color ?? '#3D6FD6');
  const daysUntilDue = diffDays(block.date, assignment.dueDate);

  const toggle = () => {
    Haptics.impactAsync(
      done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    ).catch(() => {});
    onToggle(!done);
  };

  return (
    <View style={done ? [styles.wrapperBase, styles.wrapperDone] : [styles.wrapperBase, styles.wrapper]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${assignment.title}, ${formatMinutes(block.minutes)}`}
        accessibilityHint={done ? 'Double tap to mark as not done' : 'Double tap to mark as done'}
        onPress={toggle}
        hitSlop={10}
        style={({ pressed }) => [
          styles.checkbox,
          // Green rather than the subject colour: a red or orange tick reads as
          // an error, and "done" is the one state that must never look wrong.
          done && { backgroundColor: theme.color.success, borderColor: theme.color.success },
          pressed && styles.pressed,
        ]}
      >
        {done ? (
          <Text variant="heading" color={theme.color.onSuccess} style={styles.check}>
            ✓
          </Text>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${assignment.title}`}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.titleRow}>
          <View style={[styles.subjectDot, { backgroundColor: colors.dot }]} />
          <Text variant="tiny" color={theme.color.textMuted} style={styles.subject} numberOfLines={1}>
            {subject?.name ?? 'Homework'}
          </Text>
          {block.urgent && !done ? (
            <Badge label={daysUntilDue < 0 ? 'late' : 'due today'} tone="danger" />
          ) : daysUntilDue === 1 && !done ? (
            <Badge label="due tmrw" tone="warning" />
          ) : null}
        </View>

        <Text
          variant="heading"
          color={done ? theme.color.textFaint : theme.color.text}
          style={[styles.title, done && styles.titleDone]}
          numberOfLines={2}
        >
          {assignment.title}
        </Text>

        <Text variant="small" color={theme.color.textFaint} style={styles.meta}>
          {formatMinutes(block.minutes)}
          {block.isFinisher && !done ? ' · finishes it' : ''}
          {!block.urgent ? ` · due ${relativeDayLabel(assignment.dueDate, today).toLowerCase()}` : ''}
        </Text>
      </Pressable>

      <View style={[styles.minutesPill, done && styles.minutesPillDone]}>
        <Text
          variant="small"
          color={done ? theme.color.success : theme.color.textMuted}
          style={styles.minutes}
        >
          {done ? '✓' : `${block.minutes}m`}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrapperBase: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      backgroundColor: theme.color.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingVertical: space(3),
      paddingHorizontal: space(3),
    },
    wrapper: { ...theme.elevation(1) },
    // A finished row recedes: flatter, and without the lift the others carry.
    wrapperDone: { backgroundColor: theme.color.surfaceHigh },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.color.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    check: { lineHeight: 18 },
    pressed: { opacity: 0.6 },

    body: { flex: 1, minHeight: TAP_TARGET, justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
    subjectDot: { width: 8, height: 8, borderRadius: 4 },
    subject: { textTransform: 'uppercase', flexShrink: 1 },
    title: { marginTop: space(1) },
    titleDone: { textDecorationLine: 'line-through' },
    meta: { marginTop: 2 },

    minutesPill: {
      minWidth: 44,
      alignItems: 'center',
      paddingVertical: space(1),
      paddingHorizontal: space(2),
      borderRadius: radius.sm,
      backgroundColor: theme.color.surfaceHigh,
    },
    minutesPillDone: { backgroundColor: 'transparent' },
    minutes: { fontVariant: ['tabular-nums'] },
  });
