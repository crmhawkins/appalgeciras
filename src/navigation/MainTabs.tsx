import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
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

function tabIcon(label: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ color, fontSize: 18 }}>{label}</Text>
  );
}

// Hidden tab button — keeps screen navigable but invisible in tab bar
const hiddenTab = { tabBarButton: () => null, tabBarStyle: { display: 'none' as const } };

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 60, paddingBottom: 6, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarItemStyle: { flex: 1 },
      }}
    >
      {/* ── Visible tabs (5) ── */}
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
        name="FanZoneTab"
        component={FanZoneScreen}
        options={{ title: 'Fan Zone', tabBarIcon: tabIcon('⭐') }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilScreen}
        options={{ title: 'Perfil', tabBarIcon: tabIcon('👤') }}
      />
      <Tab.Screen
        name="MasTab"
        component={MasScreen}
        options={{ title: 'Más', tabBarIcon: tabIcon('☰') }}
      />

      {/* ── Hidden tabs — accessible via navigate() but not shown in bar ── */}
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
