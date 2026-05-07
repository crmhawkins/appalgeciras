import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import PartidosScreen from '../screens/main/PartidosScreen';
import JugadorDetalleScreen from '../screens/main/JugadorDetalleScreen';
import MisAbonosScreen from '../screens/main/MisAbonosScreen';
import MisEntradasScreen from '../screens/main/MisEntradasScreen';
import NoticiaDetalleScreen from '../screens/main/NoticiaDetalleScreen';
import PartidoDetalleScreen from '../screens/main/PartidoDetalleScreen';
import ProductoDetalleScreen from '../screens/main/ProductoDetalleScreen';
import EstadioScreen from '../screens/main/EstadioScreen';
import { colors } from '../theme/colors';

export type MainStackParamList = {
  Tabs: undefined;
  Partidos: undefined;
  PartidoDetalle: { id: number };
  JugadorDetalle: { id: number };
  MisAbonos: undefined;
  MisEntradas: undefined;
  NoticiaDetalle: { slug: string };
  ProductoDetalle: { id: number };
  Estadio: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Partidos"
        component={PartidosScreen}
        options={{
          title: 'Partidos',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="JugadorDetalle"
        component={JugadorDetalleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MisAbonos" component={MisAbonosScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MisEntradas" component={MisEntradasScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NoticiaDetalle" component={NoticiaDetalleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PartidoDetalle" component={PartidoDetalleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductoDetalle" component={ProductoDetalleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Estadio" component={EstadioScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
