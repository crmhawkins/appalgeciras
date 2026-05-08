import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';

const linking: LinkingOptions<any> = {
  prefixes: ['algeciras://', 'https://algecirasclubdefutbol.com'],
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

export default function RootNavigator() {
  const { loading, token } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={token ? 'Main' : 'Auth'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="Main" component={MainStack} />
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
