import React, { Children, useMemo } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { TAP_TARGET, radius, space, useTheme, type Theme } from '../theme';
import { Text } from './primitives';

/**
 * Inset grouped list, the way iOS Settings is built.
 *
 * The rules that make it read as native rather than as a web form: rows are
 * terse and the same height, the value sits right-aligned in grey, separators
 * are inset to the start of the label, and explanation lives in one footer under
 * the whole section rather than under every row.
 */
export function ListSection({
  header,
  footer,
  children,
  style,
}: {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.section, { paddingHorizontal: theme.gutter }, style]}>
      {header ? (
        <Text variant="tiny" color={theme.color.textFaint} style={styles.header} accessibilityRole="header">
          {header.toUpperCase()}
        </Text>
      ) : null}
      <View style={styles.group}>
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 ? <View style={styles.separator} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        <Text variant="small" color={theme.color.textFaint} style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export type RowAccessory = 'chevron' | 'none';

export function ListRow({
  label,
  value,
  icon,
  iconColor,
  onPress,
  accessory,
  destructive,
  switchValue,
  onSwitchChange,
  switchDisabled,
  accessibilityHint,
}: {
  label: string;
  value?: string;
  /** Ionicons name, rendered in a tinted rounded square like iOS Settings. */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  onPress?: () => void;
  accessory?: RowAccessory;
  destructive?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  switchDisabled?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isSwitch = onSwitchChange !== undefined;
  const showChevron = accessory === 'chevron' || (!!onPress && !isSwitch && accessory !== 'none');

  const body = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: iconColor ?? theme.color.accent }]}>
          <Ionicons name={icon} size={16} color="#FFFFFF" />
        </View>
      ) : null}

      <Text
        variant="body"
        color={destructive ? theme.color.danger : theme.color.text}
        style={styles.label}
        numberOfLines={1}
      >
        {label}
      </Text>

      {value ? (
        <Text variant="body" color={theme.color.textMuted} numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}

      {isSwitch ? (
        <Switch
          value={!!switchValue}
          disabled={switchDisabled}
          onValueChange={onSwitchChange}
          accessibilityLabel={label}
          trackColor={{ true: theme.color.accent, false: theme.color.borderStrong }}
          thumbColor="#FFFFFF"
        />
      ) : null}

      {showChevron ? (
        <Ionicons name="chevron-forward" size={17} color={theme.color.textFaint} style={styles.chevron} />
      ) : null}
    </View>
  );

  if (!onPress || isSwitch) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { backgroundColor: theme.color.surfaceHigh } : null)}
    >
      {body}
    </Pressable>
  );
}

/** A centred action row, for things like "Add Class". */
export function ListAction({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.color.surfaceHigh }]}
    >
      <Ionicons name="add-circle" size={20} color={theme.color.accent} />
      <Text variant="body" color={theme.color.accent} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    section: { marginTop: space(6) },
    header: { marginBottom: space(2), marginLeft: space(4), letterSpacing: 0.6 },
    group: {
      backgroundColor: theme.color.surface,
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: theme.scheme === 'light' ? 0 : 1,
      borderColor: theme.color.border,
    },
    // Inset to where the label starts, which is the detail that reads as iOS.
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border, marginLeft: space(4) },
    footer: { marginTop: space(2), marginHorizontal: space(4), lineHeight: 17 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TAP_TARGET,
      paddingHorizontal: space(4),
      paddingVertical: space(2),
      gap: space(3),
    },
    icon: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { flex: 1 },
    value: { flexShrink: 0, maxWidth: '55%', textAlign: 'right' },
    chevron: { marginLeft: -space(1), marginRight: -space(1) },
  });
