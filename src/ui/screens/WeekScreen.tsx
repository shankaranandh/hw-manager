import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  addDays,
  dateRangeLabel,
  dayRange,
  diffDays,
  formatMinutes,
  fromDayKey,
  fullDayLabel,
  relativeDayLabel,
  startOfWeek,
  weekdayShort,
} from '../../domain/dates';
import { findPlanDay } from '../../domain/planner';
import type { DayKey } from '../../domain/types';
import { useApp } from '../../state/store';
import { AssignmentSheet } from '../components/AssignmentSheet';
import { BlockRow } from '../components/BlockRow';
import { Card, EmptyState, Gutter, Screen, SectionTitle, Text } from '../components/primitives';
import { radius, space, useTheme, type Theme } from '../theme';

export function WeekScreen() {
  const { data, plan, today, actions } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<DayKey>(today);
  const [openId, setOpenId] = useState<string | null>(null);

  /** Taller bars on a tablet, where there is room for them. */
  const barHeight = theme.sizeClass === 'compact' ? 72 : 104;

  const weekStart = useMemo(() => addDays(startOfWeek(today), weekOffset * 7), [today, weekOffset]);
  const week = useMemo(() => dayRange(weekStart, 7), [weekStart]);

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects]);
  const assignmentById = useMemo(
    () => new Map(data.assignments.map((a) => [a.id, a])),
    [data.assignments],
  );

  const days = week.map((date) => findPlanDay(plan, date));
  const busiest = Math.max(60, ...days.map((d) => Math.max(d?.plannedMinutes ?? 0, d?.capacityMinutes ?? 0)));
  const weekMinutes = days.reduce((sum, d) => sum + (d?.plannedMinutes ?? 0), 0);

  // Paging to another week leaves the selection off screen; fall back to that
  // week's first day rather than showing a detail panel for an invisible day.
  const showSelected = week.includes(selected) ? selected : week[0];
  const selectedDay = findPlanDay(plan, showSelected);
  const dueOnSelected = data.assignments.filter((a) => a.dueDate === showSelected);

  return (
    <Screen
      title={weekOffset === 0 ? 'This week' : dateRangeLabel(week[0], week[6])}
      subtitle={
        weekOffset === 0
          ? dateRangeLabel(week[0], week[6])
          : weekMinutes === 0
            ? 'Nothing scheduled'
            : `${formatMinutes(weekMinutes)} of homework`
      }
      action={
        <View style={styles.weekNav}>
          <NavButton label="‹" hint="Previous week" onPress={() => setWeekOffset((w) => w - 1)} />
          {/* Only offer the jump back when you are not already on this week;
              otherwise it repeats the title for no reason. */}
          {weekOffset !== 0 ? (
            <Pressable onPress={() => setWeekOffset(0)} hitSlop={8} accessibilityRole="button">
              <Text variant="small" color={theme.color.accent}>
                Today
              </Text>
            </Pressable>
          ) : null}
          <NavButton label="›" hint="Next week" onPress={() => setWeekOffset((w) => w + 1)} />
        </View>
      }
    >
      <Gutter>
        <Card>
          <View style={styles.chart}>
            {week.map((date, index) => {
              const day = days[index];
              const planned = day?.plannedMinutes ?? 0;
              const done = day?.doneMinutes ?? 0;
              const capacity = day?.capacityMinutes ?? 0;
              const isToday = date === today;
              const isSelected = date === showSelected;
              const isPast = diffDays(today, date) < 0;

              const plannedHeight = Math.round((planned / busiest) * barHeight);
              const doneHeight = Math.round((done / busiest) * barHeight);
              const capacityOffset = Math.round((capacity / busiest) * barHeight);

              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${relativeDayLabel(date, today)}, ${formatMinutes(planned)} planned${
                    day?.overloaded ? ', over your limit' : ''
                  }`}
                  onPress={() => setSelected(date)}
                  style={styles.column}
                >
                  <View style={[styles.barArea, { height: barHeight }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(planned > 0 ? 4 : 0, plannedHeight),
                          backgroundColor: day?.overloaded ? theme.color.warningSoft : theme.color.accentSoft,
                          borderColor: day?.overloaded ? theme.color.warning : theme.color.accent,
                          borderWidth: planned > 0 ? 1.5 : 0,
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

                  <Text variant="tiny" color={isToday ? theme.color.accent : theme.color.textFaint}>
                    {weekdayShort(date).slice(0, 1)}
                  </Text>
                  <View style={[styles.columnDate, isSelected && { backgroundColor: theme.color.accent }]}>
                    <Text
                      variant="small"
                      color={isSelected ? theme.color.onAccent : theme.color.textMuted}
                      style={styles.tabular}
                    >
                      {fromDayKey(date).getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.totalRow}>
            <Text variant="small" color={theme.color.textMuted}>
              {weekMinutes === 0 ? 'Nothing scheduled' : `${formatMinutes(weekMinutes)} planned this week`}
            </Text>
          </View>

          <View style={styles.legend}>
            <LegendDot color={theme.color.accent} label="planned" />
            <LegendDot color={theme.color.success} label="done" />
            <LegendDot color={theme.color.borderStrong} label="your limit" dashed />
          </View>
        </Card>
      </Gutter>

      <SectionTitle
        trailing={
          <Text variant="tiny" color={theme.color.textFaint}>
            {selectedDay ? formatMinutes(selectedDay.plannedMinutes) : '0 min'}
          </Text>
        }
      >
        {showSelected === today ? `Today · ${fullDayLabel(showSelected)}` : fullDayLabel(showSelected)}
      </SectionTitle>

      {dueOnSelected.length > 0 ? (
        <Gutter>
          {dueOnSelected.map((a) => {
            const colors = theme.subject(subjectById.get(a.subjectId)?.color ?? '#3D6FD6');
            return (
              <Card
                key={a.id}
                style={styles.dueCard}
                onPress={() => setOpenId(a.id)}
                accessibilityLabel={`Due this day: ${a.title}`}
              >
                <View style={[styles.dueDot, { backgroundColor: colors.dot }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="tiny" color={theme.color.textFaint}>
                    DUE THIS DAY
                  </Text>
                  <Text variant="heading" color={theme.color.text} numberOfLines={1} style={{ marginTop: 2 }}>
                    {a.title}
                  </Text>
                </View>
                {a.completedAt ? (
                  <Text variant="heading" color={theme.color.success}>
                    ✓
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </Gutter>
      ) : null}

      {selectedDay && selectedDay.blocks.length > 0 ? (
        <Gutter style={{ marginTop: dueOnSelected.length > 0 ? space(2) : 0 }}>
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
        </Gutter>
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

function NavButton({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.6 }]}
    >
      <Text variant="heading" color={theme.color.text} style={{ lineHeight: 20 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
      <View
        style={
          dashed
            ? { width: 10, borderTopWidth: 2, borderColor: color, borderStyle: 'dashed' }
            : { width: 10, height: 10, borderRadius: 3, backgroundColor: color }
        }
      />
      <Text variant="tiny" color={theme.color.textFaint}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    weekNav: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.color.surfaceHigh,
    },

    chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    column: { alignItems: 'center', flex: 1, gap: space(2) },
    barArea: { width: 24, justifyContent: 'flex-end' },
    bar: { width: '100%', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
    barDone: { width: '100%', backgroundColor: theme.color.success },
    capacityLine: {
      position: 'absolute',
      left: -4,
      right: -4,
      borderTopWidth: 1.5,
      borderColor: theme.color.borderStrong,
      borderStyle: 'dashed',
    },
    columnDate: {
      minWidth: 28,
      paddingVertical: 3,
      paddingHorizontal: space(1),
      borderRadius: radius.sm,
      alignItems: 'center',
    },
    tabular: { fontVariant: ['tabular-nums'] },

    totalRow: { marginTop: space(4), alignItems: 'center' },
    legend: {
      flexDirection: 'row',
      gap: space(4),
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: space(3),
      paddingTop: space(3),
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
    },

    dueCard: { flexDirection: 'row', alignItems: 'center', gap: space(3), paddingVertical: space(3) },
    dueDot: { width: 10, height: 10, borderRadius: 5 },
  });
