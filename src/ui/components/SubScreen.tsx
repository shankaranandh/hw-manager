import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme, type Theme } from '../theme';
import { Text } from './primitives';

/**
 * A pushed detail screen, presented as a sheet.
 *
 * iOS Settings hides depth behind chevrons rather than stacking everything on
 * one page. There is no navigator in this app, so a sheet with a back-style
 * header stands in for the push.
 */
export function SubScreen({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Done" style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={theme.color.accent} />
            <Text variant="body" color={theme.color.accent}>
              Settings
            </Text>
          </Pressable>
          <Text variant="heading" color={theme.color.text} accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.back} />
        </View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + space(10) }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.color.bg },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space(3),
      paddingVertical: space(4),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.color.border,
    },
    back: { flexDirection: 'row', alignItems: 'center', minWidth: 86 },
  });
