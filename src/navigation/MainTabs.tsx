import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/main/HomeScreen';
import NoticiasScreen from '../screens/main/NoticiasScreen';
import PlantillaScreen from '../screens/main/PlantillaScreen';
import FanZoneScreen from '../screens/main/FanZoneScreen';
import TiendaScreen from '../screens/main/TiendaScreen';
import PerfilScreen from '../screens/main/PerfilScreen';
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
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen
        name="InicioTab"
        component={HomeScreen}
        options={{ title: 'Inicio', tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="NoticiasTab"
        component={NoticiasScreen}
        options={{ title: 'Noticias', tabBarIcon: tabIcon('📰') }}
      />
      <Tab.Screen
        name="PlantillaTab"
        component={PlantillaScreen}
        options={{ title: 'Plantilla', tabBarIcon: tabIcon('👥') }}
      />
      <Tab.Screen
        name="AbonosTab"
        component={AbonosStack}
        options={{ title: 'Comprar', tabBarIcon: tabIcon('🎟️') }}
      />
      <Tab.Screen
        name="FanZoneTab"
        component={FanZoneScreen}
        options={{ title: 'Fan Zone', tabBarIcon: tabIcon('⭐') }}
      />
      <Tab.Screen
        name="TiendaTab"
        component={TiendaScreen}
        options={{ title: 'Tienda', tabBarIcon: tabIcon('🛍️') }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{ title: 'Perfil', tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}
