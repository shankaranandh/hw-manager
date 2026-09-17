import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { dayRange, fromDayKey, monthDayLabel, relativeDayLabel, weekdayShort } from '../../domain/dates';
import { SIZE_LABELS, SIZE_MINUTES, type DayKey, type Size, type Subject } from '../../domain/types';
import { TAP_TARGET, radius, space, useTheme, type Theme } from '../theme';
import { Label, Text } from './primitives';

/**
 * A horizontal strip of upcoming days.
 *
 * A native date wheel is three interactions and a lot of scrolling for a date
 * that is almost always within the next two weeks. One tap is the whole point.
 */
export function DuePicker({
  today,
  value,
  onChange,
  days = 21,
}: {
  today: DayKey;
  value: DayKey;
  onChange: (date: DayKey) => void;
  days?: number;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const options = useMemo(() => dayRange(today, days), [today, days]);

  return (
    <View>
      <Label>When is it due?</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {options.map((date) => {
          const selected = date === value;
          const weekend = [0, 6].includes(fromDayKey(date).getDay());
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${relativeDayLabel(date, today)}, ${monthDayLabel(date)}`}
              onPress={() => onChange(date)}
              style={({ pressed }) => [
                styles.day,
                weekend && styles.dayWeekend,
                selected && styles.daySelected,
                pressed && styles.pressed,
              ]}
            >
              <Text variant="tiny" color={selected ? theme.color.onAccent : theme.color.textMuted}>
                {date === today ? 'Today' : weekdayShort(date)}
              </Text>
              <Text
                variant="title"
                color={selected ? theme.color.onAccent : theme.color.text}
                style={{ marginTop: 2 }}
              >
                {fromDayKey(date).getDate()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Students cannot estimate minutes, but they can tell you how big it feels. */
export function SizePicker({ value, onChange }: { value: Size; onChange: (size: Size) => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sizes: Size[] = ['quick', 'medium', 'big', 'huge'];

  return (
    <View>
      <Label>How big is it?</Label>
      <View style={styles.sizeRow}>
        {sizes.map((size) => {
          const selected = size === value;
          return (
            <Pressable
              key={size}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${SIZE_LABELS[size].label}, ${SIZE_LABELS[size].hint}`}
              onPress={() => onChange(size)}
              style={({ pressed }) => [styles.size, selected && styles.daySelected, pressed && styles.pressed]}
            >
              <Text variant="body" color={selected ? theme.color.onAccent : theme.color.text}>
                {SIZE_LABELS[size].label}
              </Text>
              <Text
                variant="tiny"
                color={selected ? theme.color.onAccent : theme.color.textFaint}
                style={styles.sizeHint}
              >
                {SIZE_LABELS[size].hint}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const sizeForMinutes = (minutes: number): Size => {
  const entries = Object.entries(SIZE_MINUTES) as [Size, number][];
  return entries.reduce(
    (best, [size, value]) =>
      Math.abs(value - minutes) < Math.abs(SIZE_MINUTES[best] - minutes) ? size : best,
    'quick' as Size,
  );
};

export function SubjectPicker({
  subjects,
  value,
  onChange,
  onAdd,
}: {
  subjects: Subject[];
  value: string;
  onChange: (id: string) => void;
  onAdd?: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View>
      <Label>Which class?</Label>
      <View style={styles.subjectWrap}>
        {subjects.map((subject) => {
          const selected = subject.id === value;
          const colors = theme.subject(subject.color);
          return (
            <Pressable
              key={subject.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(subject.id)}
              style={({ pressed }) => [
                styles.subject,
                selected && { backgroundColor: colors.fill, borderColor: colors.fill },
                pressed && styles.pressed,
              ]}
            >
              {!selected ? <View style={[styles.subjectDot, { backgroundColor: colors.dot }]} /> : null}
              <Text
                variant="body"
                color={selected ? colors.onFill : theme.color.text}
                numberOfLines={1}
              >
                {subject.name}
              </Text>
            </Pressable>
          );
        })}
        {onAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a class"
            onPress={onAdd}
            style={({ pressed }) => [styles.subject, styles.subjectAdd, pressed && styles.pressed]}
          >
            <Text variant="body" color={theme.color.textMuted}>
              + Class
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    strip: { gap: space(2), paddingRight: space(4), paddingVertical: 2 },
    day: {
      width: 58,
      minHeight: TAP_TARGET + 18,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space(2),
    },
    dayWeekend: { backgroundColor: theme.color.surfaceHigh },
    daySelected: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
    pressed: { opacity: 0.7 },

    sizeRow: { flexDirection: 'row', gap: space(2) },
    size: {
      flex: 1,
      minHeight: TAP_TARGET + 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space(1),
      paddingVertical: space(2),
    },
    sizeHint: { marginTop: 2, textAlign: 'center' },

    subjectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
    subject: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
      minHeight: TAP_TARGET,
      paddingHorizontal: space(4),
      paddingVertical: space(2),
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
    },
    subjectDot: { width: 8, height: 8, borderRadius: 4 },
    subjectAdd: { borderStyle: 'dashed', borderColor: theme.color.borderStrong },
  });
