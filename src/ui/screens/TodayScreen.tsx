import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { addDays, formatMinutes, relativeDayLabel, weekdayLong } from '../../domain/dates';
import { findPlanDay } from '../../domain/planner';
import type { PlanWarning } from '../../domain/types';
import { useApp } from '../../state/store';
import { AssignmentSheet } from '../components/AssignmentSheet';
import { BlockRow } from '../components/BlockRow';
import { Button, Card, EmptyState, ProgressBar, Screen, SectionTitle } from '../components/primitives';
import { color, font, radius, space } from '../theme';

export function TodayScreen({ onAdd }: { onAdd: () => void }) {
  const { data, plan, today, actions } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);

  const day = findPlanDay(plan, today);
  const blocks = day?.blocks ?? [];
  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects]);
  const assignmentById = useMemo(
    () => new Map(data.assignments.map((a) => [a.id, a])),
    [data.assignments],
  );

  const totalMinutes = day?.plannedMinutes ?? 0;
  const doneMinutes = day?.doneMinutes ?? 0;
  const leftMinutes = Math.max(0, totalMinutes - doneMinutes);
  const allDone = totalMinutes > 0 && leftMinutes === 0;

  // Overload warnings are about a specific day, so only today's is relevant here.
  // Overdue and won't-fit warnings are about an assignment and always matter.
  const todaysWarnings = plan.warnings
    .filter((w) => (w.kind === 'overloaded' ? w.date === today : true))
    .slice(0, 3);

  const upcoming = useMemo(
    () =>
      [1, 2, 3]
        .map((offset) => findPlanDay(plan, addDays(today, offset)))
        .filter((d): d is NonNullable<typeof d> => !!d && d.blocks.length > 0),
    [plan, today],
  );

  return (
    <Screen
      title={allDone ? 'All done' : 'Today'}
      subtitle={
        totalMinutes === 0
          ? `${weekdayLong(today)} — nothing planned`
          : allDone
            ? `${weekdayLong(today)} — you finished all ${formatMinutes(totalMinutes)}`
            : `${weekdayLong(today)} — ${formatMinutes(leftMinutes)} to go`
      }
    >
      {totalMinutes > 0 ? (
        <View style={styles.section}>
          <Card style={allDone ? styles.heroDone : undefined}>
            <View style={styles.heroTop}>
              <Text style={styles.heroBig}>
                {allDone ? '🎉' : `${Math.round((doneMinutes / totalMinutes) * 100)}%`}
              </Text>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {allDone ? 'Everything on tonight’s list is done' : encouragement(blocks.length, leftMinutes)}
                </Text>
                <Text style={styles.heroMeta}>
                  {formatMinutes(doneMinutes)} of {formatMinutes(totalMinutes)} ·{' '}
                  {formatMinutes(day?.capacityMinutes ?? 0)} set aside
                </Text>
              </View>
            </View>
            <View style={{ marginTop: space(4) }}>
              <ProgressBar
                value={doneMinutes / totalMinutes}
                tint={allDone ? color.success : day?.overloaded ? color.warning : color.accent}
                height={8}
              />
            </View>
          </Card>
        </View>
      ) : null}

      {todaysWarnings.length > 0 ? (
        <View style={styles.section}>
          {todaysWarnings.map((warning, index) => (
            <WarningCard key={`${warning.kind}-${index}`} warning={warning} />
          ))}
        </View>
      ) : null}

      {blocks.length === 0 ? (
        <EmptyState
          emoji="🌤️"
          title="Nothing due, nothing planned"
          body={
            data.assignments.length === 0
              ? 'Add what you wrote down in class today and this turns into a plan you can actually follow.'
              : 'Every assignment you have entered is either finished or scheduled for another day. Enjoy it.'
          }
          action={
            data.assignments.length === 0 ? <Button label="Add an assignment" onPress={onAdd} /> : undefined
          }
        />
      ) : (
        <>
          <SectionTitle>Tonight’s plan</SectionTitle>
          <View style={styles.list}>
            {blocks.map((block) => {
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
        </>
      )}

      {upcoming.length > 0 ? (
        <>
          <SectionTitle>Coming up</SectionTitle>
          <View style={styles.list}>
            {upcoming.map((next) => (
              <Card key={next.date} style={styles.upcomingCard}>
                <View>
                  <Text style={styles.upcomingDay}>{relativeDayLabel(next.date, today)}</Text>
                  <Text style={styles.upcomingDetail} numberOfLines={1}>
                    {next.blocks
                      .map((b) => subjectById.get(assignmentById.get(b.assignmentId)?.subjectId ?? '')?.name)
                      .filter(Boolean)
                      .join(' · ') || `${next.blocks.length} things`}
                  </Text>
                </View>
                <Text style={[styles.upcomingMinutes, next.overloaded && { color: color.warning }]}>
                  {formatMinutes(next.plannedMinutes)}
                </Text>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <AssignmentSheet assignmentId={openId} onClose={() => setOpenId(null)} />
    </Screen>
  );
}

function WarningCard({ warning }: { warning: PlanWarning }) {
  const tone =
    warning.kind === 'overdue'
      ? { bg: color.dangerSoft, fg: color.danger, icon: '⏰' }
      : warning.kind === 'wont-fit'
        ? { bg: color.dangerSoft, fg: color.danger, icon: '🚨' }
        : { bg: color.warningSoft, fg: color.warning, icon: '⚠️' };

  return (
    <View style={[styles.warning, { backgroundColor: tone.bg }]}>
      <Text style={styles.warningIcon}>{tone.icon}</Text>
      <Text style={[styles.warningText, { color: tone.fg }]}>{warning.message}</Text>
    </View>
  );
}

/** Small, honest encouragement. Nothing that sounds like a motivational poster. */
function encouragement(count: number, minutesLeft: number): string {
  if (minutesLeft <= 15) return 'Almost there — one short push left';
  if (count === 1) return 'One thing tonight. Start it and you’re done';
  if (minutesLeft >= 120) return 'Heavy night. Take the first block and stop there if you need to';
  return `${count} short blocks, with breaks in between`;
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: space(5), gap: space(2) },
  list: { paddingHorizontal: space(5), gap: space(2) },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space(4) },
  heroDone: { borderColor: color.success },
  heroBig: { ...font.display, color: color.accent, fontVariant: ['tabular-nums'], minWidth: 64 },
  heroCopy: { flex: 1 },
  heroTitle: { ...font.heading, color: color.text },
  heroMeta: { ...font.small, color: color.textMuted, marginTop: space(1) },

  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space(3),
    borderRadius: radius.md,
    padding: space(3),
  },
  warningIcon: { fontSize: 16 },
  warningText: { ...font.small, flex: 1, lineHeight: 19 },

  upcomingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upcomingDay: { ...font.heading, color: color.text },
  upcomingDetail: { ...font.small, color: color.textFaint, marginTop: 2 },
  upcomingMinutes: { ...font.body, color: color.textMuted, fontVariant: ['tabular-nums'] },
});
