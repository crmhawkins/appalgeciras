import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import * as ExpoSplash from 'expo-splash-screen';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen, { ONBOARDING_KEY } from './src/screens/onboarding/OnboardingScreen';
import { colors } from './src/theme/colors';
import { setupNotifications } from './src/services/marcadorPolling';
import { checkForUpdate, ForceUpdateResult } from './src/services/forceUpdate';
import ForceUpdateModal from './src/components/ForceUpdateModal';

// Mantener splash nativo visible hasta primer render de RN
ExpoSplash.preventAutoHideAsync().catch(() => {});

export const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<ForceUpdateResult | null>(null);
  const [softUpdateDismissed, setSoftUpdateDismissed] = useState(false);

  useEffect(() => {
    setupNotifications().catch(() => {});

    // Comprobación de versión mínima/recomendada contra el backend.
    // No bloquea el resto del arranque; el modal se monta cuando llega
    // la respuesta. Si falla la red, checkForUpdate devuelve {forced:false}.
    checkForUpdate()
      .then((res) => setUpdateStatus(res))
      .catch(() => setUpdateStatus({ forced: false }));

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (!navigationRef.isReady()) return;
      if (data?.type === 'abono') {
        navigationRef.navigate('Main', { screen: 'AbonosTab' });
      } else if (data?.type === 'gol' && data.partidoId) {
        navigationRef.navigate('PartidoDetalle', { id: data.partidoId });
      }
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

  // Ocultar splash nativo en primer render — window blanco ya cubre el gap
  useEffect(() => {
    ExpoSplash.hideAsync().catch(() => {});
  }, []);

  if (!onboardingChecked) {
    return <SplashScreen />;
  }

  // Versión por debajo del mínimo: bloquear todo y mostrar el modal
  // a pantalla completa en lugar del RootNavigator.
  if (updateStatus && updateStatus.forced) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#C8102E" />
        <ForceUpdateModal
          forced
          storeUrl={updateStatus.storeUrl}
          latest={updateStatus.latest}
          releaseNotes={updateStatus.releaseNotes}
        />
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

  // Modo recomendación: el modal NO es bloqueante, va por encima del
  // RootNavigator y el usuario puede pulsar "Más tarde".
  const showSoftUpdate =
    !!updateStatus &&
    !updateStatus.forced &&
    (updateStatus as any).recommended === true &&
    !softUpdateDismissed;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#C8102E" />
        <RootNavigator navigationRef={navigationRef} />
        {showSoftUpdate && updateStatus && !updateStatus.forced ? (
          <ForceUpdateModal
            forced={false}
            storeUrl={(updateStatus as any).storeUrl}
            latest={(updateStatus as any).latest}
            releaseNotes={(updateStatus as any).releaseNotes}
            onDismiss={() => setSoftUpdateDismissed(true)}
          />
        ) : null}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
