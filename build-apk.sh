#!/bin/bash
# Build APK local — Algeciras CF
# Uso: ./build-apk.sh [nombre-apk]
# Ejemplo: ./build-apk.sh AlgecirasCF-v1.2

set -e

JAVA_HOME="C:/Program Files/Microsoft/jdk-17.0.18.8-hotspot"
ANDROID_HOME="C:/Android/sdk"
KEYSTORE_PATH="C:/tmp/appalgeciras/algeciras-release.keystore"
KEY_ALIAS="algeciras-key"
KEY_PASSWORD="AlgecirasCF2024"
STORE_PASSWORD="AlgecirasCF2024"
DESKTOP="/c/Users/Dani-Mefle/Desktop"
APK_NAME="${1:-AlgecirasCF}"
ZIPALIGN="$ANDROID_HOME/build-tools/34.0.0/zipalign.exe"
APKSIGNER="$ANDROID_HOME/build-tools/34.0.0/apksigner.bat"

export JAVA_HOME ANDROID_HOME

echo "==> 1/5 Parando Gradle daemons..."
"$JAVA_HOME/bin/java" -cp "$HOME/.gradle/wrapper/dists/gradle-"*/*/gradle-*/lib/gradle-launcher-*.jar \
  org.gradle.launcher.daemon.client.StopDaemonCommandLineAction 2>/dev/null || true

echo "==> 2/5 Prebuild..."
npx expo prebuild --platform android

echo "==> 3/5 Configurando SDK..."
printf 'sdk.dir=C:/Android/sdk\n' > android/local.properties

echo "==> 4/5 Compilando..."
cd android
./gradlew assembleRelease
cd ..

echo "==> 5/5 Firmando y copiando al escritorio..."
RAW="android/app/build/outputs/apk/release/app-release.apk"
UNSIGNED="/tmp/app-unsigned.apk"
ALIGNED="/tmp/app-aligned.apk"

cp "$RAW" "$UNSIGNED"
zip -d "$UNSIGNED" "META-INF/*" 2>/dev/null || true
"$ZIPALIGN" -v -p 4 "$UNSIGNED" "$ALIGNED"

rm -f "$DESKTOP"/AlgecirasCF*.apk
cmd //c "$APKSIGNER" sign \
  --ks "$KEYSTORE_PATH" \
  --ks-pass pass:$STORE_PASSWORD \
  --key-pass pass:$KEY_PASSWORD \
  --ks-key-alias "$KEY_ALIAS" \
  --out "/tmp/${APK_NAME}.apk" \
  "$ALIGNED"

rm -f "$DESKTOP"/AlgecirasCF*.apk
cp "/tmp/${APK_NAME}.apk" "$DESKTOP/${APK_NAME}.apk"

echo ""
echo "APK listo: $DESKTOP/${APK_NAME}.apk"
ls -lh "$DESKTOP/${APK_NAME}.apk"
