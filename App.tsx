import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#C8102E');
      NavigationBar.setButtonStyleAsync('light');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" backgroundColor="#C8102E" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
