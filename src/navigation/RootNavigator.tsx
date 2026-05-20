import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { ErrorBoundary } from '../components/ErrorBoundary';
import SplashScreen from '../screens/SplashScreen';

const linking: LinkingOptions<any> = {
  prefixes: ['algecirascf://', 'algeciras://', 'https://algecirasclubdefutbol.com'],
  config: {
    screens: {
      Main: {
        screens: {
          Tabs: {
            screens: {
              NoticiasTab: 'noticias',
            },
          },
          NoticiaDetalle: 'blog/:slug',
          JugadorDetalle: 'plantilla/:id',
          PartidoDetalle: 'partidos/:id',
        },
      },
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  navigationRef?: React.RefObject<NavigationContainerRef<any> | null>;
}

const SPLASH_MIN_MS = 2500;

export default function RootNavigator({ navigationRef }: RootNavigatorProps) {
  const { loading, token } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !splashDone) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="Main">
          {() => (
            <ErrorBoundary>
              <MainStack />
            </ErrorBoundary>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

