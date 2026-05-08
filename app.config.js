const { withAndroidManifest } = require('@expo/config-plugins');

// Lee la config base de app.json
const appJson = require('./app.json');

// Plugin: elimina FirebaseInitProvider del manifest para evitar crash
// sin google-services.json. Las notificaciones push vía Expo siguen funcionando
// porque el token FCM se gestiona en el servidor de Expo.
const withoutFirebaseInitProvider = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    if (!manifest.manifest.application) return config;

    const providers = manifest.manifest.application[0].provider || [];

    const alreadyRemoved = providers.some(
      (p) =>
        p.$?.['android:name'] === 'com.google.firebase.provider.FirebaseInitProvider' &&
        p.$?.['tools:node'] === 'remove'
    );

    if (!alreadyRemoved) {
      providers.push({
        $: {
          'android:name': 'com.google.firebase.provider.FirebaseInitProvider',
          'android:authorities': '${applicationId}.firebaseinitprovider',
          'android:exported': 'false',
          'tools:node': 'remove',
        },
      });
      manifest.manifest.application[0].provider = providers;
    }

    // Asegurar que xmlns:tools está en el manifest raíz
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    return config;
  });
};

module.exports = ({ config }) => {
  // Mezcla la config base de app.json con la config dinámica
  const merged = {
    ...appJson.expo,
    ...config,
    plugins: [
      ...(appJson.expo.plugins || []),
      withoutFirebaseInitProvider,
    ],
  };
  return merged;
};
