import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { Platform, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/onboarding/OnboardingScreen';
import { colors } from './src/theme/colors';
import { setupNotifications } from './src/services/marcadorPolling';

export default function App() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Setup notification channel + handler
    setupNotifications().catch(() => {});

    // Handle notification taps (app opened from background via notification)
    const sub = Notifications.addNotificationResponseReceivedListener((_response) => {
      // Future: navigate to PartidoDetalle if data.type === 'gol'
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_KEY);
        setShowOnboarding(v !== 'true');
      } catch (_) {
        setShowOnboarding(false);
      } finally {
        setOnboardingChecked(true);
      }
    })();
  }, []);

  if (!onboardingChecked) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.white} />
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#C8102E" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
