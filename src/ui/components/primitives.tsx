import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAP_TARGET, color, font, radius, shadow, space } from '../theme';

export function Screen({
  title,
  subtitle,
  action,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </>
  );

  if (!scroll) {
    return <View style={[styles.screen, { paddingTop: insets.top + space(2) }]}>{body}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + space(2), paddingBottom: space(8) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {trailing}
    </View>
  );
}

export function Chip({
  label,
  sublabel,
  selected,
  onPress,
  tint,
  style,
}: {
  label: string;
  sublabel?: string;
  selected?: boolean;
  onPress?: () => void;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const accent = tint ?? color.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: accent, borderColor: accent },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[styles.chipSublabel, selected && styles.chipSublabelSelected]} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: color.accent, fg: '#0B1020', border: color.accent },
    secondary: { bg: color.surfaceHigh, fg: color.text, border: color.border },
    ghost: { bg: 'transparent', fg: color.textMuted, border: 'transparent' },
    danger: { bg: color.dangerSoft, fg: color.danger, border: 'transparent' },
  };
  const tone = palette[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone.bg, borderColor: tone.border },
        (disabled || busy) && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <Text style={[styles.buttonLabel, { color: tone.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function ProgressBar({
  value,
  tint = color.accent,
  height = 6,
}: {
  /** 0 to 1. */
  value: number;
  tint?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      style={[styles.progressTrack, { height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: tint,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'warning' | 'danger' | 'success' }) {
  const tones = {
    neutral: { bg: color.surfaceHigh, fg: color.textMuted },
    warning: { bg: color.warningSoft, fg: color.warning },
    danger: { bg: color.dangerSoft, fg: color.danger },
    success: { bg: color.successSoft, fg: color.success },
  } as const;
  const tone_ = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tone_.bg }]}>
      <Text style={[styles.badgeLabel, { color: tone_.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? <View style={{ marginTop: space(4) }}>{action}</View> : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoFocus,
  maxLength,
  returnKeyType,
  onSubmitEditing,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  returnKeyType?: 'done' | 'next' | 'go';
  onSubmitEditing?: () => void;
}) {
  return (
    <View>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.textFaint}
        multiline={multiline}
        autoFocus={autoFocus}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: space(5),
    paddingBottom: space(4),
    gap: space(3),
  },
  headerText: { flex: 1 },
  headerTitle: { ...font.display, color: color.text },
  headerSubtitle: { ...font.body, color: color.textMuted, marginTop: space(1) },

  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space(4),
    ...shadow,
  },
  pressed: { opacity: 0.7 },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(6),
    marginBottom: space(3),
    paddingHorizontal: space(5),
  },
  sectionTitle: { ...font.tiny, color: color.textFaint, textTransform: 'uppercase' },

  chip: {
    minHeight: TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipLabel: { ...font.body, color: color.text, textAlign: 'center' },
  chipLabelSelected: { color: '#0B1020', fontWeight: '700' },
  chipSublabel: { ...font.tiny, color: color.textFaint, textAlign: 'center', marginTop: 2 },
  chipSublabelSelected: { color: 'rgba(11, 16, 32, 0.7)' },

  button: {
    minHeight: TAP_TARGET + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(5),
  },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { ...font.heading },

  progressTrack: { backgroundColor: color.surfaceSunken, overflow: 'hidden', width: '100%' },

  badge: { paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.sm },
  badgeLabel: { ...font.tiny },

  empty: { alignItems: 'center', paddingHorizontal: space(8), paddingVertical: space(10) },
  emptyEmoji: { fontSize: 44, marginBottom: space(3) },
  emptyTitle: { ...font.title, color: color.text, textAlign: 'center' },
  emptyBody: { ...font.body, color: color.textMuted, textAlign: 'center', marginTop: space(2), lineHeight: 21 },

  label: { ...font.tiny, color: color.textFaint, textTransform: 'uppercase', marginBottom: space(2) },
  input: {
    minHeight: TAP_TARGET + 4,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    color: color.text,
    ...font.heading,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
});
