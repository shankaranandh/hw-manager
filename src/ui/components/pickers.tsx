import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dayRange, fromDayKey, shortDayLabel, weekdayShort } from '../../domain/dates';
import { SIZE_LABELS, SIZE_MINUTES, type DayKey, type Size, type Subject } from '../../domain/types';
import { TAP_TARGET, color, font, radius, space } from '../theme';
import { Label } from './primitives';

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
  const options = useMemo(() => dayRange(today, days), [today, days]);

  return (
    <View>
      <Label>When is it due?</Label>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {options.map((date) => {
          const selected = date === value;
          const isWeekendDay = [0, 6].includes(fromDayKey(date).getDay());
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={shortDayLabel(date, today)}
              onPress={() => onChange(date)}
              style={({ pressed }) => [
                styles.day,
                isWeekendDay && styles.dayWeekend,
                selected && styles.daySelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.dayName, selected && styles.daySelectedText]}>
                {date === today ? 'Today' : weekdayShort(date)}
              </Text>
              <Text style={[styles.dayNumber, selected && styles.daySelectedText]}>
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
              onPress={() => onChange(size)}
              style={({ pressed }) => [styles.size, selected && styles.sizeSelected, pressed && styles.pressed]}
            >
              <Text style={[styles.sizeLabel, selected && styles.daySelectedText]}>
                {SIZE_LABELS[size].label}
              </Text>
              <Text style={[styles.sizeHint, selected && styles.sizeHintSelected]}>
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
  return entries.reduce((best, [size, value]) =>
    Math.abs(value - minutes) < Math.abs(SIZE_MINUTES[best] - minutes) ? size : best,
  'quick' as Size);
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
  return (
    <View>
      <Label>Which class?</Label>
      <View style={styles.subjectWrap}>
        {subjects.map((subject) => {
          const selected = subject.id === value;
          return (
            <Pressable
              key={subject.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(subject.id)}
              style={({ pressed }) => [
                styles.subject,
                selected && { backgroundColor: subject.color, borderColor: subject.color },
                pressed && styles.pressed,
              ]}
            >
              {!selected ? <View style={[styles.subjectDot, { backgroundColor: subject.color }]} /> : null}
              <Text style={[styles.subjectLabel, selected && styles.daySelectedText]} numberOfLines={1}>
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
            <Text style={styles.subjectAddLabel}>+ Class</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space(2), paddingRight: space(4) },
  day: {
    width: 56,
    minHeight: TAP_TARGET + 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space(2),
  },
  dayWeekend: { backgroundColor: color.surfaceSunken },
  daySelected: { backgroundColor: color.accent, borderColor: color.accent },
  daySelectedText: { color: '#0B1020', fontWeight: '700' },
  dayName: { ...font.tiny, color: color.textMuted },
  dayNumber: { ...font.title, color: color.text, marginTop: 2 },

  sizeRow: { flexDirection: 'row', gap: space(2) },
  size: {
    flex: 1,
    minHeight: TAP_TARGET + 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(1),
  },
  sizeSelected: { backgroundColor: color.accent, borderColor: color.accent },
  sizeLabel: { ...font.body, color: color.text },
  sizeHint: { ...font.tiny, color: color.textFaint, marginTop: 2, textAlign: 'center' },
  sizeHintSelected: { color: 'rgba(11, 16, 32, 0.7)' },

  subjectWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  subject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    minHeight: TAP_TARGET,
    paddingHorizontal: space(4),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectLabel: { ...font.body, color: color.text },
  subjectAdd: { borderStyle: 'dashed', borderColor: color.borderStrong },
  subjectAddLabel: { ...font.body, color: color.textMuted },

  pressed: { opacity: 0.7 },
});
