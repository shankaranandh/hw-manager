import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TAP_TARGET,
  fontCap,
  fontStyle,
  radius,
  space,
  useTheme,
  type FontVariant,
  type Theme,
} from '../theme';

/**
 * Every piece of text in the app goes through here.
 *
 * It applies the type scale and, more importantly, the per-size Dynamic Type cap
 * from the theme: a student who turns text size all the way up still gets a
 * readable plan instead of a heading that pushes the rest of the row off screen.
 */
export function Text({
  variant = 'body',
  color,
  style,
  children,
  ...rest
}: TextProps & { variant?: FontVariant; color?: string }) {
  return (
    <RNText
      maxFontSizeMultiplier={fontCap(variant)}
      style={[fontStyle(variant), color ? { color } : null, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

/**
 * Page frame: safe areas, the header, and the width cap that keeps a line of
 * text readable when this is running full-screen on an iPad.
 */
export function Screen({
  title,
  subtitle,
  action,
  children,
  scroll = true,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  /** Opt into the wider cap for a screen that lays itself out in columns. */
  wide?: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const topPad = theme.railNavigation ? space(4) : insets.top + space(2);
  const maxWidth = wide ? theme.wideMaxWidth : theme.contentMaxWidth;

  const body = (fill: boolean) => (
    // The width cap must not swallow the height: without `flex: 1` a
    // non-scrolling screen sizes to its content and runs on under the tab bar,
    // taking its primary button with it.
    <View
      style={[
        styles.constrain,
        { maxWidth: maxWidth === Infinity ? undefined : maxWidth },
        fill && styles.constrainFill,
      ]}
    >
      <View style={[styles.header, { paddingHorizontal: theme.gutter }]}>
        <View style={styles.headerText}>
          <Text variant="display" color={theme.color.text}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color={theme.color.textMuted} style={{ marginTop: space(1) }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={[styles.screen, { paddingTop: topPad }]}>{body(true)}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: space(10) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {body(false)}
    </ScrollView>
  );
}

/** Horizontal padding that matches the current size class. */
export function Gutter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[{ paddingHorizontal: theme.gutter, gap: space(2) }, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.sectionTitleRow, { paddingHorizontal: theme.gutter }]}>
      <Text variant="tiny" color={theme.color.textFaint} style={styles.uppercase} accessibilityRole="header">
        {children}
      </Text>
      {trailing}
    </View>
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
  const theme = useTheme();
  const styles = useStyles();
  const palette: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.color.accent, fg: theme.color.onAccent, border: theme.color.accent },
    secondary: { bg: theme.color.surfaceHigh, fg: theme.color.text, border: theme.color.border },
    ghost: { bg: 'transparent', fg: theme.color.textMuted, border: 'transparent' },
    danger: { bg: theme.color.dangerSoft, fg: theme.color.onDangerSoft, border: 'transparent' },
  };
  const tone = palette[kind];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
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
        <Text variant="heading" color={tone.fg}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ProgressBar({
  value,
  tint,
  height = 6,
  label,
}: {
  /** 0 to 1. */
  value: number;
  tint?: string;
  height?: number;
  label?: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.color.surfaceSunken,
        overflow: 'hidden',
        width: '100%',
      }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: tint ?? theme.color.accent,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

export type BadgeTone = 'neutral' | 'warning' | 'danger' | 'success';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.color.surfaceHigh, fg: theme.color.textMuted },
    warning: { bg: theme.color.warningSoft, fg: theme.color.onWarningSoft },
    danger: { bg: theme.color.dangerSoft, fg: theme.color.onDangerSoft },
    success: { bg: theme.color.successSoft, fg: theme.color.onSuccessSoft },
  };
  const selected = tones[tone];
  return (
    <View style={{ backgroundColor: selected.bg, paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.sm }}>
      <Text variant="tiny" color={selected.fg}>
        {label.toUpperCase()}
      </Text>
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
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: space(8), paddingVertical: space(10) }}>
      {/* Decorative: the title and body already say everything. */}
      <RNText style={{ fontSize: 44, marginBottom: space(3) }} accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </RNText>
      <Text variant="title" color={theme.color.text} style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        variant="body"
        color={theme.color.textMuted}
        style={{ textAlign: 'center', marginTop: space(2), lineHeight: 21 }}
      >
        {body}
      </Text>
      {action ? <View style={{ marginTop: space(4), alignSelf: 'stretch', maxWidth: 320 }}>{action}</View> : null}
    </View>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return (
    <Text
      variant="tiny"
      color={theme.color.textFaint}
      style={[{ textTransform: 'uppercase', marginBottom: space(2) }, style]}
    >
      {children}
    </Text>
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
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textFaint}
        accessibilityLabel={label}
        multiline={multiline}
        autoFocus={autoFocus}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        maxFontSizeMultiplier={fontCap('heading')}
        keyboardAppearance={theme.scheme === 'dark' ? 'dark' : 'light'}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.color.border, marginVertical: space(4) }} />;
}

export function useStyles() {
  const theme = useTheme();
  return useMemo(() => makeStyles(theme), [theme]);
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.color.bg },
    constrain: {
      width: '100%',
      maxWidth: theme.contentMaxWidth === Infinity ? undefined : theme.contentMaxWidth,
      alignSelf: 'center',
    },
    constrainFill: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingBottom: space(4),
      gap: space(3),
    },
    headerText: { flex: 1 },

    card: {
      backgroundColor: theme.color.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
      padding: space(4),
      ...theme.elevation(1),
    },
    pressed: { opacity: 0.7 },
    uppercase: { textTransform: 'uppercase' },

    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(6),
      marginBottom: space(3),
    },

    button: {
      minHeight: TAP_TARGET + 4,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space(5),
      paddingVertical: space(2),
    },
    buttonDisabled: { opacity: 0.4 },

    input: {
      minHeight: TAP_TARGET + 4,
      backgroundColor: theme.color.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingHorizontal: space(4),
      paddingVertical: space(3),
      color: theme.color.text,
      ...fontStyle('heading'),
    },
    inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  });
