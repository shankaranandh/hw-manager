import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotificationHandler, ensureAndroidChannel } from './src/notifications/scheduler';
import { AppProvider, useApp } from './src/state/store';
import { RootNavigator } from './src/ui/RootNavigator';
import { ThemeProvider, useTheme } from './src/ui/theme';

// Registered once, before anything can schedule a reminder.
configureNotificationHandler();

/**
 * Sits between the data and the theme so the student's appearance choice, which
 * is stored with the rest of their settings, drives the palette.
 */
function Themed() {
  const { data } = useApp();
  return (
    <ThemeProvider preference={data.settings.themePreference}>
      <StatusBarForTheme />
      <RootNavigator />
    </ThemeProvider>
  );
}

function StatusBarForTheme() {
  const theme = useTheme();
  return <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  useEffect(() => {
    ensureAndroidChannel().catch(() => {
      // Without the channel Android falls back to a default one; not fatal.
    });
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <Themed />
      </AppProvider>
    </SafeAreaProvider>
  );
}
