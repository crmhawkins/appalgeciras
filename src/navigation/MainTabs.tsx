import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useWindowDimensions } from 'react-native';
import HomeScreen from '../screens/main/HomeScreen';
import NoticiasScreen from '../screens/main/NoticiasScreen';
import PlantillaScreen from '../screens/main/PlantillaScreen';
import FanZoneScreen from '../screens/main/FanZoneScreen';
import TiendaScreen from '../screens/main/TiendaScreen';
import SociosScreen from '../screens/main/SociosScreen';
import PerfilScreen from '../screens/main/PerfilScreen';
import MasScreen from '../screens/main/MasScreen';
import AbonosStack from './AbonosStack';
import { MainTabParamList } from '../types';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

const VISIBLE_TABS = 5;

function tabIcon(label: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ color, fontSize: 16 }}>{label}</Text>
  );
}

const hiddenTab = {
  tabBarButton: () => null,
  tabBarItemStyle: { width: 0, height: 0, overflow: 'hidden' as const, flex: 0 },
};

export default function MainTabs() {
  const { width } = useWindowDimensions();
  const tabWidth = Math.floor(width / VISIBLE_TABS);
  const visibleTab = { tabBarItemStyle: { width: tabWidth } };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 58, paddingBottom: 5, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      {/* ── Visible tabs (5) — explicit width so hidden tabs don't shrink them ── */}
      <Tab.Screen
        name="InicioTab"
        component={HomeScreen}
        options={{ title: 'Inicio', tabBarIcon: tabIcon('🏠'), ...visibleTab }}
      />
      <Tab.Screen
        name="AbonosTab"
        component={AbonosStack}
        options={{ title: 'Comprar', tabBarIcon: tabIcon('🎟️'), ...visibleTab }}
      />
      <Tab.Screen
        name="FanZoneTab"
        component={FanZoneScreen}
        options={{ title: 'Fan Zone', tabBarIcon: tabIcon('⭐'), ...visibleTab }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{ title: 'Perfil', tabBarIcon: tabIcon('👤'), ...visibleTab }}
      />
      <Tab.Screen
        name="MasTab"
        component={MasScreen}
        options={{ title: 'Más', tabBarIcon: tabIcon('☰'), ...visibleTab }}
      />

      {/* ── Hidden tabs — navigable but invisible ── */}
      <Tab.Screen
        name="NoticiasTab"
        component={NoticiasScreen}
        options={{ title: 'Noticias', ...hiddenTab }}
      />
      <Tab.Screen
        name="PlantillaTab"
        component={PlantillaScreen}
        options={{ title: 'Plantilla', ...hiddenTab }}
      />
      <Tab.Screen
        name="TiendaTab"
        component={TiendaScreen}
        options={{ title: 'Tienda', ...hiddenTab }}
      />
      <Tab.Screen
        name="SociosTab"
        component={SociosScreen}
        options={{ title: 'Socios', ...hiddenTab }}
      />
    </Tab.Navigator>
  );
}
