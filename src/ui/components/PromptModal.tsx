import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { radius, space, useTheme, type Theme } from '../theme';
import { Button, Text, TextField } from './primitives';

/**
 * A single-field prompt that works on both platforms.
 *
 * `Alert.prompt` is iOS-only, and silently doing nothing on Android would leave
 * half of all students unable to add a class.
 */
export function PromptModal({
  visible,
  title,
  message,
  placeholder,
  initialValue = '',
  confirmLabel = 'Add',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Swallow presses inside the card so tapping the field does not dismiss. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text variant="title" color={theme.color.text} accessibilityRole="header">
              {title}
            </Text>
            {message ? (
              <Text variant="small" color={theme.color.textMuted} style={styles.message}>
                {message}
              </Text>
            ) : null}
            <View style={{ marginTop: space(4) }}>
              <TextField
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            </View>
            <View style={styles.actions}>
              <Button label="Cancel" kind="ghost" onPress={onCancel} style={{ flex: 1 }} />
              <Button label={confirmLabel} onPress={submit} disabled={!value.trim()} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.color.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: space(6),
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.color.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.color.border,
      padding: space(5),
      ...theme.elevation(2),
    },
    message: { marginTop: space(1), lineHeight: 19 },
    actions: { flexDirection: 'row', gap: space(2), marginTop: space(4) },
  });
