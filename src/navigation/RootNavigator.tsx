import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { ErrorBoundary } from '../components/ErrorBoundary';

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

export default function RootNavigator({ navigationRef }: RootNavigatorProps) {
  const { loading, token } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
