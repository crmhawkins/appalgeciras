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
  navigationRef?: React.RefObject<NavigationContainerRef<any>>;
}

export default function RootNavigator({ navigationRef }: RootNavigatorProps) {
  const { loading, token } = useAuth();

  // FIX-1: Reset nav stack on logout so MainStack history doesn't persist
  useEffect(() => {
    if (!loading && !token && navigationRef?.current?.isReady()) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
  }, [token, loading]);

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
        initialRouteName={token ? 'Main' : 'Auth'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="Main">
          {(props) => (
            <ErrorBoundary>
              <MainStack {...props} />
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
