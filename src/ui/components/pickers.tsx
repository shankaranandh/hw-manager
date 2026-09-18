import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';

import { dayRange, fromDayKey, monthDayLabel, relativeDayLabel, weekdayShort } from '../../domain/dates';
import { SIZE_LABELS, SIZE_MINUTES, type DayKey, type Size, type Subject } from '../../domain/types';
import { TAP_TARGET, radius, space, useTheme, type Theme } from '../theme';
import { Text } from './primitives';

/**
 * A spoken-sounding question rather than a shouty form label. The all-caps
 * micro-label above every field is what made this screen read like a generated
 * form instead of something a person designed.
 */
export function Prompt({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text variant="heading" color={theme.color.textMuted} style={{ marginBottom: space(3) }}>
      {children}
    </Text>
  );
}

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
      <Prompt>When is it due?</Prompt>
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
const SIZE_FACE: Record<Size, string> = {
  quick: '⚡️',
  medium: '📗',
  big: '📚',
  huge: '🏔️',
};

export function SizePicker({ value, onChange }: { value: Size; onChange: (size: Size) => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sizes: Size[] = ['quick', 'medium', 'big', 'huge'];

  return (
    <View>
      <Prompt>How big is it?</Prompt>
      <View style={styles.sizeGrid}>
        {sizes.map((size) => {
          const selected = size === value;
          return (
            <Pressable
              key={size}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${SIZE_LABELS[size].label}, ${SIZE_LABELS[size].hint}`}
              onPress={() => onChange(size)}
              style={({ pressed }) => [styles.sizeTile, selected && styles.tileSelected, pressed && styles.pressed]}
            >
              <RNText style={styles.face} accessibilityElementsHidden importantForAccessibility="no">
                {SIZE_FACE[size]}
              </RNText>
              <Text variant="heading" color={selected ? theme.color.onAccent : theme.color.text}>
                {SIZE_LABELS[size].label}
              </Text>
              <Text
                variant="small"
                color={selected ? theme.color.onAccent : theme.color.textFaint}
                style={styles.sizeHint}
              >
                {SIZE_LABELS[size].hint.replace('about ', '')}
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
      <Prompt>Which class?</Prompt>
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

    sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
    sizeTile: {
      // Two per row, big enough to hit without looking.
      width: '47%',
      flexGrow: 1,
      minHeight: 104,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space(3),
      gap: 2,
    },
    tileSelected: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
    face: { fontSize: 26, marginBottom: 2 },
    sizeHint: { textAlign: 'center' },

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
