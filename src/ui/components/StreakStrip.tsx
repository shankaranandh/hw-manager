import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Achievements } from '../../domain/achievements';
import { streakMessage } from '../../domain/achievements';
import { radius, space, useTheme, type Theme } from '../theme';
import { Text } from './primitives';

/**
 * The reward surface.
 *
 * "Days early" leads, because that is the behaviour worth building: it can only
 * go up, and it is earned by starting sooner rather than by being given more
 * homework. The streak sits beside it and is never phrased as a loss.
 */
export function StreakStrip({ achievements }: { achievements: Achievements }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { currentStreak, daysEarly, finishedCount } = achievements;

  // Nothing to celebrate yet, and a row of zeroes is discouraging.
  if (currentStreak === 0 && daysEarly === 0 && finishedCount === 0) return null;

  return (
    <View style={styles.strip}>
      <Stat
        icon="flame"
        tint={theme.color.warning}
        value={currentStreak > 0 ? `${currentStreak}` : '–'}
        label={currentStreak === 1 ? 'day streak' : 'day streak'}
      />
      <View style={styles.divider} />
      <Stat
        icon="rocket"
        tint={theme.color.success}
        value={`${daysEarly}`}
        label={daysEarly === 1 ? 'day early' : 'days early'}
      />
      <View style={styles.divider} />
      <Stat icon="checkmark-done" tint={theme.color.accent} value={`${finishedCount}`} label="finished" />
    </View>
  );
}

function Stat({
  icon,
  tint,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  value: string;
  label: string;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.stat} accessibilityLabel={`${value} ${label}`}>
      <Ionicons name={icon} size={18} color={tint} />
      <Text variant="title" color={theme.color.text} style={styles.value}>
        {value}
      </Text>
      <Text variant="tiny" color={theme.color.textFaint}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/** Shown on the day everything planned is done. */
export function ClearedBanner({ streak }: { streak: number }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.cleared, { backgroundColor: theme.color.successSoft }]} accessibilityRole="alert">
      <Ionicons name="checkmark-circle" size={22} color={theme.color.success} />
      <View style={{ flex: 1 }}>
        <Text variant="heading" color={theme.color.onSuccessSoft}>
          That’s everything for tonight
        </Text>
        <Text variant="small" color={theme.color.onSuccessSoft} style={{ marginTop: 2 }}>
          {streakMessage(streak)}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.color.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingVertical: space(3),
      ...theme.elevation(1),
    },
    stat: { flex: 1, alignItems: 'center', gap: 1 },
    value: { fontVariant: ['tabular-nums'] },
    divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: theme.color.border },

    cleared: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(3),
      borderRadius: radius.md,
      padding: space(4),
    },
  });
