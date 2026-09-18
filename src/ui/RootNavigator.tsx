import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../state/store';
import { Text } from './components/primitives';
import { AddScreen } from './screens/AddScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { TAP_TARGET, radius, space, useTheme, type Theme } from './theme';

type Tab = 'today' | 'week' | 'add' | 'settings';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Real icons rather than unicode glyphs, and the filled/outline pair iOS uses to
// show which tab is active.
const TABS: { key: Tab; label: string; icon: IconName; iconActive: IconName }[] = [
  { key: 'today', label: 'Today', icon: 'today-outline', iconActive: 'today' },
  { key: 'week', label: 'Week', icon: 'calendar-outline', iconActive: 'calendar' },
  { key: 'add', label: 'Add', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

export function RootNavigator() {
  const { ready, plan, today } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [tab, setTab] = useState<Tab>('today');
  const insets = useSafeAreaInsets();

  // Badge the Today tab with what is still outstanding tonight.
  const todayPlan = plan.days.find((d) => d.date === today);
  const outstanding = todayPlan ? todayPlan.blocks.filter((b) => b.minutes > b.doneMinutes).length : 0;

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  const screen = (
    <>
      {tab === 'today' ? <TodayScreen onAdd={() => setTab('add')} /> : null}
      {tab === 'week' ? <WeekScreen /> : null}
      {tab === 'add' ? <AddScreen onSaved={() => setTab('today')} /> : null}
      {tab === 'settings' ? <SettingsScreen /> : null}
    </>
  );

  const items = TABS.map(({ key, label, icon, iconActive }) => {
    const active = key === tab;
    const badge = key === 'today' && outstanding > 0 && tab !== 'today' ? outstanding : 0;
    return { key, label, icon: active ? iconActive : icon, active, badge };
  });

  // On a full-width iPad a bottom tab bar strands the controls a long way from
  // the content; a side rail is what the platform expects at this width.
  if (theme.railNavigation) {
    return (
      <View style={[styles.root, styles.rowLayout]}>
        <View style={[styles.rail, { paddingTop: insets.top + space(4), paddingBottom: insets.bottom + space(4) }]}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: item.active }}
              accessibilityLabel={item.label}
              onPress={() => setTab(item.key)}
              style={({ pressed }) => [
                styles.railItem,
                item.active && { backgroundColor: theme.color.accentSoft },
                pressed && { opacity: 0.6 },
              ]}
            >
              <View>
                <Ionicons
                  name={item.icon}
                  size={26}
                  color={item.active ? theme.color.accent : theme.color.textFaint}
                />
                {item.badge > 0 ? <Badge count={item.badge} /> : null}
              </View>
              <Text variant="tiny" color={item.active ? theme.color.accent : theme.color.textFaint}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1 }}>{screen}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>{screen}</View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, space(3)) }]}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.active }}
            accessibilityLabel={item.label}
            onPress={() => setTab(item.key)}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
          >
            <View>
              <Ionicons
                name={item.icon}
                size={25}
                color={item.active ? theme.color.accent : theme.color.textFaint}
              />
              {item.badge > 0 ? <Badge count={item.badge} /> : null}
            </View>
            <Text variant="tiny" color={item.active ? theme.color.accent : theme.color.textFaint}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Badge({ count }: { count: number }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.badge}>
      <Text variant="tiny" color={theme.color.onAccent} style={styles.badgeText}>
        {count}
      </Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.color.bg },
    rowLayout: { flexDirection: 'row' },
    loading: { flex: 1, backgroundColor: theme.color.bg, alignItems: 'center', justifyContent: 'center' },

    tabBar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
      backgroundColor: theme.color.surface,
      paddingTop: space(2),
    },
    tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space(1), minHeight: TAP_TARGET },

    rail: {
      width: 88,
      alignItems: 'center',
      gap: space(2),
      paddingHorizontal: space(2),
      borderRightWidth: 1,
      borderRightColor: theme.color.border,
      backgroundColor: theme.color.surface,
    },
    railItem: {
      width: 68,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: space(3),
      borderRadius: radius.md,
    },

    badge: {
      position: 'absolute',
      top: -2,
      right: -12,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: theme.color.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { lineHeight: 14 },
  });
