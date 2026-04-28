import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/main/HomeScreen';
import PartidosScreen from '../screens/main/PartidosScreen';
import PerfilScreen from '../screens/main/PerfilScreen';
import MisAbonosScreen from '../screens/main/MisAbonosScreen';
import AbonosStack from './AbonosStack';
import { MainTabParamList } from '../types';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

function tabIcon(label: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ color, fontSize: 18 }}>{label}</Text>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="InicioTab"
        component={HomeScreen}
        options={{ title: 'Inicio', tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="AbonosTab"
        component={AbonosStack}
        options={{ title: 'Comprar', tabBarIcon: tabIcon('🎟️') }}
      />
      <Tab.Screen
        name="PartidosTab"
        component={PartidosScreen}
        options={{ title: 'Partidos', tabBarIcon: tabIcon('⚽') }}
      />
      <Tab.Screen
        name="MisAbonosTab"
        component={MisAbonosScreen}
        options={{ title: 'Mis Abonos', tabBarIcon: tabIcon('📋') }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{ title: 'Perfil', tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}
