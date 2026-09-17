import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { addDays, formatMinutes, relativeDayLabel, weekdayLong } from '../../domain/dates';
import { findPlanDay } from '../../domain/planner';
import type { PlanWarning } from '../../domain/types';
import { useApp } from '../../state/store';
import { AssignmentSheet } from '../components/AssignmentSheet';
import { BlockRow } from '../components/BlockRow';
import {
  Button,
  Card,
  EmptyState,
  Gutter,
  ProgressBar,
  Screen,
  SectionTitle,
  Text,
} from '../components/primitives';
import { radius, space, useTheme, type Theme } from '../theme';

export function TodayScreen({ onAdd }: { onAdd: () => void }) {
  const { data, plan, today, actions } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  const comingUp =
    upcoming.length > 0 ? (
      <>
        <SectionTitle>Coming up</SectionTitle>
        <Gutter>
          {upcoming.map((next) => (
            <Card key={next.date} style={styles.upcomingCard}>
              <View style={{ flex: 1 }}>
                <Text variant="heading" color={theme.color.text}>
                  {relativeDayLabel(next.date, today)}
                </Text>
                <Text variant="small" color={theme.color.textFaint} numberOfLines={1} style={{ marginTop: 2 }}>
                  {next.blocks
                    .map((b) => subjectById.get(assignmentById.get(b.assignmentId)?.subjectId ?? '')?.name)
                    .filter(Boolean)
                    .join(' · ') || `${next.blocks.length} things`}
                </Text>
              </View>
              <Text
                variant="body"
                color={next.overloaded ? theme.color.warning : theme.color.textMuted}
                style={styles.tabular}
              >
                {formatMinutes(next.plannedMinutes)}
              </Text>
            </Card>
          ))}
        </Gutter>
      </>
    ) : null;

  const tonight =
    blocks.length === 0 ? (
      <EmptyState
        emoji="🌤️"
        title="Nothing due, nothing planned"
        body={
          data.assignments.length === 0
            ? 'Add what you wrote down in class today and this turns into a plan you can actually follow.'
            : 'Every assignment you have entered is either finished or scheduled for another day. Enjoy it.'
        }
        action={data.assignments.length === 0 ? <Button label="Add an assignment" onPress={onAdd} /> : undefined}
      />
    ) : (
      <>
        <SectionTitle>Tonight’s plan</SectionTitle>
        <Gutter>
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
        </Gutter>
      </>
    );

  return (
    <Screen
      wide={theme.sizeClass === 'wide' && upcoming.length > 0}
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
        <Gutter>
          <Card style={allDone ? { borderColor: theme.color.success } : undefined}>
            <View style={styles.heroTop}>
              <Text variant="display" color={theme.color.accent} style={styles.heroBig}>
                {allDone ? '🎉' : `${Math.round((doneMinutes / totalMinutes) * 100)}%`}
              </Text>
              <View style={{ flex: 1 }}>
                <Text variant="heading" color={theme.color.text}>
                  {allDone ? 'Everything on tonight’s list is done' : encouragement(blocks.length, leftMinutes)}
                </Text>
                <Text variant="small" color={theme.color.textMuted} style={{ marginTop: space(1) }}>
                  {formatMinutes(doneMinutes)} of {formatMinutes(totalMinutes)} ·{' '}
                  {formatMinutes(day?.capacityMinutes ?? 0)} set aside
                </Text>
              </View>
            </View>
            <View style={{ marginTop: space(4) }}>
              <ProgressBar
                value={doneMinutes / totalMinutes}
                tint={allDone ? theme.color.success : day?.overloaded ? theme.color.warning : theme.color.accent}
                height={8}
                label={`${formatMinutes(doneMinutes)} of ${formatMinutes(totalMinutes)} done`}
              />
            </View>
          </Card>
        </Gutter>
      ) : null}

      {todaysWarnings.length > 0 ? (
        <Gutter style={{ marginTop: space(2) }}>
          {todaysWarnings.map((warning, index) => (
            <WarningCard key={`${warning.kind}-${index}`} warning={warning} />
          ))}
        </Gutter>
      ) : null}

      {/* On a wide screen the plan and what follows it sit side by side, rather
          than leaving half the iPad empty and pushing "coming up" below the fold. */}
      {theme.sizeClass === 'wide' && comingUp ? (
        <View style={styles.columns}>
          <View style={styles.column}>{tonight}</View>
          <View style={styles.column}>{comingUp}</View>
        </View>
      ) : (
        <>
          {tonight}
          {comingUp}
        </>
      )}

      <AssignmentSheet assignmentId={openId} onClose={() => setOpenId(null)} />
    </Screen>
  );
}

function WarningCard({ warning }: { warning: PlanWarning }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const tone =
    warning.kind === 'overloaded'
      ? { bg: theme.color.warningSoft, fg: theme.color.onWarningSoft, icon: '⚠️' }
      : { bg: theme.color.dangerSoft, fg: theme.color.onDangerSoft, icon: warning.kind === 'overdue' ? '⏰' : '🚨' };

  return (
    <View style={[styles.warning, { backgroundColor: tone.bg }]} accessibilityRole="alert">
      <Text variant="body" style={styles.warningIcon} accessibilityElementsHidden importantForAccessibility="no">
        {tone.icon}
      </Text>
      <Text variant="small" color={tone.fg} style={styles.warningText}>
        {warning.message}
      </Text>
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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: space(4) },
    heroBig: { fontVariant: ['tabular-nums'], minWidth: 64 },
    tabular: { fontVariant: ['tabular-nums'] },

    warning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(3),
      borderRadius: radius.md,
      padding: space(3),
    },
    warningIcon: { fontSize: 16 },
    warningText: { flex: 1, lineHeight: 19 },

    upcomingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3) },

    columns: { flexDirection: 'row', gap: space(4) },
    column: { flex: 1 },
  });
