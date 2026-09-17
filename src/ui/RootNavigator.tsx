import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../state/store';
import { AddScreen } from './screens/AddScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { color, font, space } from './theme';

type Tab = 'today' | 'week' | 'add' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: '◉' },
  { key: 'week', label: 'Week', icon: '▦' },
  { key: 'add', label: 'Add', icon: '＋' },
  { key: 'settings', label: 'You', icon: '⚙' },
];

export function RootNavigator() {
  const { ready, plan, today } = useApp();
  const [tab, setTab] = useState<Tab>('today');
  const insets = useSafeAreaInsets();

  // Badge the Today tab with what is still outstanding tonight.
  const todayPlan = plan.days.find((d) => d.date === today);
  const outstanding = todayPlan
    ? todayPlan.blocks.filter((b) => b.minutes > b.doneMinutes).length
    : 0;

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {tab === 'today' ? <TodayScreen onAdd={() => setTab('add')} /> : null}
        {tab === 'week' ? <WeekScreen /> : null}
        {tab === 'add' ? <AddScreen onSaved={() => setTab('today')} /> : null}
        {tab === 'settings' ? <SettingsScreen /> : null}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, space(3)) }]}>
        {TABS.map(({ key, label, icon }) => {
          const active = key === tab;
          const badge = key === 'today' && outstanding > 0 && tab !== 'today' ? outstanding : 0;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              onPress={() => setTab(key)}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
            >
              <View>
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
                {badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  loading: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
    paddingTop: space(2),
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space(1) },
  tabIcon: { fontSize: 20, color: color.textFaint, lineHeight: 24 },
  tabIconActive: { color: color.accent },
  tabLabel: { ...font.tiny, color: color.textFaint },
  tabLabelActive: { color: color.accent },

  badge: {
    position: 'absolute',
    top: -2,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: color.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#0B1020' },
});
