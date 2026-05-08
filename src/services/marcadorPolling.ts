import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Setup notification channel (Android) and handler.
 * Call once on app mount.
 */
export async function setupNotifications(): Promise<void> {
  // Handler for notifications received while app is foregrounded
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('goles', {
      name: 'Goles en directo',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}

/**
 * Fire an immediate local notification for a goal.
 */
export async function notificarGol(
  equipoLocal: string,
  equipoVisitante: string,
  marcador: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚽ ¡GOL!',
      body: `${equipoLocal} ${marcador} ${equipoVisitante}`,
      sound: 'default',
      data: { type: 'gol' },
    },
    trigger: null, // immediate
  });
}
