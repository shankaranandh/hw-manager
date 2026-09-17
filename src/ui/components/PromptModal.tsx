import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, font, radius, space } from '../theme';
import { Button, TextField } from './primitives';

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
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Swallow presses inside the card so tapping the field does not dismiss. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: space(6),
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    padding: space(5),
  },
  title: { ...font.title, color: color.text },
  message: { ...font.small, color: color.textMuted, marginTop: space(1), lineHeight: 19 },
  actions: { flexDirection: 'row', gap: space(2), marginTop: space(4) },
});
