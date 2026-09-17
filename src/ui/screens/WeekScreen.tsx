import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  addDays,
  dayRange,
  diffDays,
  formatMinutes,
  fromDayKey,
  relativeDayLabel,
  startOfWeek,
  weekdayShort,
} from '../../domain/dates';
import { findPlanDay } from '../../domain/planner';
import type { DayKey } from '../../domain/types';
import { useApp } from '../../state/store';
import { AssignmentSheet } from '../components/AssignmentSheet';
import { BlockRow } from '../components/BlockRow';
import { Card, EmptyState, Screen, SectionTitle } from '../components/primitives';
import { color, font, radius, space } from '../theme';

/** Tallest bar in the chart, in pixels. */
const BAR_HEIGHT = 72;

export function WeekScreen() {
  const { data, plan, today, actions } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<DayKey>(today);
  const [openId, setOpenId] = useState<string | null>(null);

  const weekStart = useMemo(
    () => addDays(startOfWeek(today), weekOffset * 7),
    [today, weekOffset],
  );
  const week = useMemo(() => dayRange(weekStart, 7), [weekStart]);

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects]);
  const assignmentById = useMemo(
    () => new Map(data.assignments.map((a) => [a.id, a])),
    [data.assignments],
  );

  const days = week.map((date) => findPlanDay(plan, date));
  const busiest = Math.max(
    60,
    ...days.map((d) => Math.max(d?.plannedMinutes ?? 0, d?.capacityMinutes ?? 0)),
  );

  const weekMinutes = days.reduce((sum, d) => sum + (d?.plannedMinutes ?? 0), 0);

  // Paging to another week leaves the selection off screen; fall back to that
  // week's first day rather than showing a detail panel for an invisible day.
  const showSelected = week.includes(selected) ? selected : week[0];
  const selectedDay = findPlanDay(plan, showSelected);
  const dueOnSelected = data.assignments.filter((a) => a.dueDate === showSelected);

  return (
    <Screen
      title="Your week"
      subtitle={
        weekMinutes === 0
          ? 'Nothing scheduled this week'
          : `${formatMinutes(weekMinutes)} of homework across 7 days`
      }
      action={
        <View style={styles.weekNav}>
          <NavButton label="‹" onPress={() => setWeekOffset((w) => w - 1)} />
          <Pressable onPress={() => setWeekOffset(0)} hitSlop={8}>
            <Text style={styles.weekNavLabel}>{weekOffset === 0 ? 'This week' : 'Today'}</Text>
          </Pressable>
          <NavButton label="›" onPress={() => setWeekOffset((w) => w + 1)} />
        </View>
      }
    >
      <View style={styles.chartCard}>
        <View style={styles.chart}>
          {week.map((date, index) => {
            const day = days[index];
            const planned = day?.plannedMinutes ?? 0;
            const done = day?.doneMinutes ?? 0;
            const capacity = day?.capacityMinutes ?? 0;
            const isToday = date === today;
            const isSelected = date === showSelected;
            const isPast = diffDays(today, date) < 0;

            const plannedHeight = Math.round((planned / busiest) * BAR_HEIGHT);
            const doneHeight = Math.round((done / busiest) * BAR_HEIGHT);
            const capacityOffset = Math.round((capacity / busiest) * BAR_HEIGHT);

            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${relativeDayLabel(date, today)}, ${formatMinutes(planned)} planned`}
                onPress={() => setSelected(date)}
                style={styles.column}
              >
                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(planned > 0 ? 4 : 0, plannedHeight),
                        backgroundColor: day?.overloaded ? color.warning : color.accentSoft,
                        borderColor: day?.overloaded ? color.warning : color.accent,
                        borderWidth: planned > 0 ? 1 : 0,
                      },
                      isPast && { opacity: 0.45 },
                    ]}
                  >
                    <View
                      style={[
                        styles.barDone,
                        { height: Math.max(0, Math.min(doneHeight, plannedHeight)) },
                      ]}
                    />
                  </View>
                  {/* Drawn last so it stays visible across the top of a full bar:
                      the line the student said they would not cross. */}
                  {capacity > 0 ? (
                    <View style={[styles.capacityLine, { bottom: capacityOffset }]} />
                  ) : null}
                </View>

                <Text style={[styles.columnDay, isToday && styles.columnDayToday]}>
                  {weekdayShort(date).slice(0, 1)}
                </Text>
                <View style={[styles.columnDate, isSelected && styles.columnDateSelected]}>
                  <Text style={[styles.columnDateText, isSelected && styles.columnDateTextSelected]}>
                    {fromDayKey(date).getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <LegendDot color={color.accent} label="planned" />
          <LegendDot color={color.success} label="done" />
          <LegendDot color={color.borderStrong} label="your limit" dashed />
        </View>
      </View>

      <SectionTitle
        trailing={
          <Text style={styles.sectionMeta}>
            {selectedDay ? formatMinutes(selectedDay.plannedMinutes) : '0 min'}
          </Text>
        }
      >
        {relativeDayLabel(showSelected, today)}
      </SectionTitle>

      {dueOnSelected.length > 0 ? (
        <View style={styles.list}>
          {dueOnSelected.map((a) => (
            <Card key={a.id} style={styles.dueCard} onPress={() => setOpenId(a.id)}>
              <View style={[styles.dueDot, { backgroundColor: subjectById.get(a.subjectId)?.color ?? color.accent }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dueLabel}>DUE THIS DAY</Text>
                <Text style={styles.dueTitle} numberOfLines={1}>
                  {a.title}
                </Text>
              </View>
              {a.completedAt ? <Text style={styles.dueDone}>✓</Text> : null}
            </Card>
          ))}
        </View>
      ) : null}

      {selectedDay && selectedDay.blocks.length > 0 ? (
        <View style={[styles.list, { marginTop: dueOnSelected.length > 0 ? space(2) : 0 }]}>
          {selectedDay.blocks.map((block) => {
            const assignment = assignmentById.get(block.assignmentId);
            if (!assignment) return null;
            return (
              <BlockRow
                key={block.id}
                block={block}
                assignment={assignment}
                subject={subjectById.get(assignment.subjectId)}
                today={today}
                onToggle={(done) => actions.setBlockDone(block.date, block.assignmentId, block.minutes, done)}
                onOpen={() => setOpenId(assignment.id)}
              />
            );
          })}
        </View>
      ) : dueOnSelected.length === 0 ? (
        <EmptyState
          emoji="✨"
          title="Free day"
          body={
            diffDays(today, showSelected) < 0
              ? 'Nothing was scheduled for this day.'
              : 'No work is planned here yet. Adding an assignment will fill it in automatically.'
          }
        />
      ) : null}

      <AssignmentSheet assignmentId={openId} onClose={() => setOpenId(null)} />
    </Screen>
  );
}

function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.navButtonLabel}>{label}</Text>
    </Pressable>
  );
}

function LegendDot({ color: tint, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          dashed
            ? { borderTopWidth: 2, borderColor: tint, borderStyle: 'dashed', height: 0 }
            : { backgroundColor: tint },
        ]}
      />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  weekNavLabel: { ...font.small, color: color.textMuted },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceHigh,
  },
  navButtonLabel: { ...font.heading, color: color.text, lineHeight: 20 },

  chartCard: {
    marginHorizontal: space(5),
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space(4),
  },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  column: { alignItems: 'center', flex: 1, gap: space(2) },
  barArea: { height: BAR_HEIGHT, width: 22, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  barDone: { width: '100%', backgroundColor: color.success },
  capacityLine: {
    position: 'absolute',
    left: -3,
    right: -3,
    borderTopWidth: 1,
    borderColor: color.borderStrong,
    borderStyle: 'dashed',
  },
  columnDay: { ...font.tiny, color: color.textFaint },
  columnDayToday: { color: color.accent },
  columnDate: {
    minWidth: 26,
    paddingVertical: 3,
    paddingHorizontal: space(1),
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  columnDateSelected: { backgroundColor: color.accent },
  columnDateText: { ...font.small, color: color.textMuted, fontVariant: ['tabular-nums'] },
  columnDateTextSelected: { color: '#0B1020', fontWeight: '700' },

  legend: {
    flexDirection: 'row',
    gap: space(4),
    marginTop: space(4),
    paddingTop: space(3),
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { ...font.tiny, color: color.textFaint },

  sectionMeta: { ...font.tiny, color: color.textFaint },
  list: { paddingHorizontal: space(5), gap: space(2) },

  dueCard: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3) },
  dueDot: { width: 10, height: 10, borderRadius: 5 },
  dueLabel: { ...font.tiny, color: color.textFaint },
  dueTitle: { ...font.heading, color: color.text, marginTop: 2 },
  dueDone: { ...font.heading, color: color.success },
});
