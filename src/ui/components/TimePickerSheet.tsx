import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { radius, space, useTheme, type Theme } from '../theme';
import { Text } from './primitives';

const toDate = (minutesAfterMidnight: number) => {
  const d = new Date();
  d.setHours(Math.floor(minutesAfterMidnight / 60), minutesAfterMidnight % 60, 0, 0);
  return d;
};

/**
 * The system time wheel, so picking a reminder time feels like every other iOS
 * app rather than like tapping a plus button fifteen minutes at a time.
 */
export function TimePickerSheet({
  visible,
  title,
  minutes,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  minutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [value, setValue] = useState(() => toDate(minutes));

  useEffect(() => {
    if (visible) setValue(toDate(minutes));
  }, [visible, minutes]);

  const confirm = () => onConfirm(value.getHours() * 60 + value.getMinutes());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.bar}>
            <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button">
              <Text variant="body" color={theme.color.textMuted}>
                Cancel
              </Text>
            </Pressable>
            <Text variant="heading" color={theme.color.text}>
              {title}
            </Text>
            <Pressable onPress={confirm} hitSlop={12} accessibilityRole="button">
              <Text variant="heading" color={theme.color.accent}>
                Done
              </Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
            minuteInterval={5}
            themeVariant={theme.scheme}
            onChange={(_event: unknown, date?: Date) => {
              if (!date) return;
              setValue(date);
              // Android's dialog commits on its own OK button.
              if (Platform.OS !== 'ios') onConfirm(date.getHours() * 60 + date.getMinutes());
            }}
            style={styles.picker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.color.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingBottom: space(8),
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(5),
      paddingVertical: space(4),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.color.border,
    },
    picker: { alignSelf: 'center' },
  });
