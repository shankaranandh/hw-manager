import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotificationHandler, ensureAndroidChannel } from './src/notifications/scheduler';
import { AppProvider } from './src/state/store';
import { RootNavigator } from './src/ui/RootNavigator';

// Registered once, before anything can schedule a reminder.
configureNotificationHandler();

export default function App() {
  useEffect(() => {
    ensureAndroidChannel().catch(() => {
      // Without the channel Android falls back to a default one; not fatal.
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
