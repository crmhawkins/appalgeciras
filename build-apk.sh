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
npx expo prebuild --platform android --clean

echo "==> 3/5 Configurando SDK..."
printf 'sdk.dir=C:/Android/sdk\n' > android/local.properties

# Eliminar archivos v31 residuales de builds anteriores (Android 12+ los prioriza
# sobre values/ y estaban rotos — sin windowBackground → fondo negro)
rm -f android/app/src/main/res/values-v31/themes.xml
rm -f android/app/src/main/res/values-night-v31/themes.xml

# Reemplazar splashscreen_logo con escudo transparente (sin fondo blanco de expo)
python3 - << 'PYEOF'
import sys, os
from PIL import Image

shield = Image.open('assets/algeciras_shield.png').convert('RGBA')
densities = ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi','night-mdpi','night-hdpi','night-xhdpi','night-xxhdpi','night-xxxhdpi']
for d in densities:
    out = f'android/app/src/main/res/drawable-{d}/splashscreen_logo.png'
    if not os.path.exists(out):
        continue
    size = Image.open(out).size[0]
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    w, h = shield.size
    scale = min(size / w, size / h) * 0.85
    nw, nh = int(w * scale), int(h * scale)
    scaled = shield.resize((nw, nh), Image.LANCZOS)
    canvas.paste(scaled, ((size - nw) // 2, (size - nh) // 2), scaled)
    canvas.save(out)
    print(f"    {d}: {size}x{size} OK")
print("    Drawables splash OK")
PYEOF

# Dark mode: fondo splash blanco — colors Y styles (sin styles.xml dark mode = negro del sistema)
cat > android/app/src/main/res/values-night/colors.xml << 'EOF'
<resources>
  <color name="splashscreen_background">#C8102E</color>
</resources>
EOF

cat > android/app/src/main/res/values-night/styles.xml << 'EOF'
<resources>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="android:windowBackground">#C8102E</item>
    <item name="android:windowSplashScreenBackground">#C8102E</item>
    <item name="windowSplashScreenBackground">#C8102E</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
    <item name="android:windowSplashScreenBehavior">icon_preferred</item>
  </style>
  <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:windowBackground">#C8102E</item>
  </style>
</resources>
EOF

# Android 12+ dark mode: qualifier más específico
mkdir -p android/app/src/main/res/values-night-v31
cat > android/app/src/main/res/values-night-v31/styles.xml << 'EOF'
<resources>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="android:windowBackground">#C8102E</item>
    <item name="android:windowSplashScreenBackground">#C8102E</item>
    <item name="windowSplashScreenBackground">#C8102E</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
    <item name="android:windowSplashScreenBehavior">icon_preferred</item>
  </style>
</resources>
EOF

# Patch values/styles.xml: Light theme + splash completamente blanco
python3 - << 'PYEOF'
import sys, re
path = 'android/app/src/main/res/values/styles.xml'
try:
    content = open(path, encoding='utf-8').read()

    # AppTheme: DayNight -> Light + windowBackground blanco
    content = content.replace('Theme.AppCompat.DayNight.NoActionBar', 'Theme.AppCompat.Light.NoActionBar')
    if 'android:windowBackground' not in content:
        content = content.replace(
            '<item name="android:enforceNavigationBarContrast"',
            '<item name="android:windowBackground">#C8102E</item>\n    <item name="android:enforceNavigationBarContrast"'
        )

    # Reescribir Theme.App.SplashScreen completo con TODOS los atributos de blanco:
    # - android:windowSplashScreenBackground → atributo sistema Android 12+
    # - windowSplashScreenBackground         → atributo librería (pre-12)
    # - android:windowBackground             → fondo ventana clásico (gap coverage)
    splash_replacement = '''  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="android:windowBackground">#C8102E</item>
    <item name="android:windowSplashScreenBackground">#C8102E</item>
    <item name="windowSplashScreenBackground">#C8102E</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
    <item name="android:windowSplashScreenBehavior">icon_preferred</item>
    <item name="android:forceDarkAllowed">false</item>
  </style>'''
    content = re.sub(
        r'<style name="Theme\.App\.SplashScreen"[^>]*>.*?</style>',
        splash_replacement,
        content,
        flags=re.DOTALL
    )

    open(path, 'w', encoding='utf-8').write(content)
    print("    styles.xml patched OK")
except Exception as e:
    print(f"    WARN styles.xml patch: {e}", file=sys.stderr)
PYEOF
echo "    Splash blanco aplicado."

# Patch AndroidManifest: deshabilitar Force Dark en app y activity
python3 - << 'PYEOF'
import sys, re
path = 'android/app/src/main/AndroidManifest.xml'
try:
    content = open(path, encoding='utf-8').read()
    # Application: añadir forceDarkAllowed=false
    if 'android:forceDarkAllowed' not in content:
        content = content.replace(
            'android:dataExtractionRules=',
            'android:forceDarkAllowed="false" android:dataExtractionRules='
        )
    # Activity: añadir forceDarkAllowed=false
    content = re.sub(
        r'(android:theme="@style/Theme\.App\.SplashScreen")',
        r'\1 android:forceDarkAllowed="false"',
        content
    )
    open(path, 'w', encoding='utf-8').write(content)
    print("    AndroidManifest.xml patched OK")
except Exception as e:
    print(f"    WARN AndroidManifest patch: {e}", file=sys.stderr)
PYEOF

# Patch MainActivity.kt: fondo blanco por código (inmune a dark mode y Force Dark)
python3 - << 'PYEOF'
import sys
path = 'android/app/src/main/java/es/algecirascf/abonos/MainActivity.kt'
try:
    content = open(path, encoding='utf-8').read()
    if 'Color.WHITE' not in content:
        content = content.replace(
            'import android.os.Bundle',
            'import android.graphics.Color\nimport android.os.Bundle'
        )
        content = content.replace(
            'SplashScreenManager.registerOnActivity(this)\n    // @generated end expo-splashscreen\n    super.onCreate(null)',
            'SplashScreenManager.registerOnActivity(this)\n    // @generated end expo-splashscreen\n    window.decorView.setBackgroundColor(Color.WHITE)\n    super.onCreate(null)'
        )
    open(path, 'w', encoding='utf-8').write(content)
    print("    MainActivity.kt patched OK")
except Exception as e:
    print(f"    WARN MainActivity patch: {e}", file=sys.stderr)
PYEOF

# Patch MainApplication.kt: forzar light mode (evita Force Dark del sistema en splash)
python3 - << 'PYEOF'
import sys
path = 'android/app/src/main/java/es/algecirascf/abonos/MainApplication.kt'
try:
    content = open(path, encoding='utf-8').read()
    if 'AppCompatDelegate' not in content:
        content = content.replace(
            'import expo.modules.ApplicationLifecycleDispatcher',
            'import androidx.appcompat.app.AppCompatDelegate\nimport expo.modules.ApplicationLifecycleDispatcher'
        )
    if 'MODE_NIGHT_NO' not in content:
        content = content.replace(
            '  override fun onCreate() {\n    super.onCreate()',
            '  override fun onCreate() {\n    AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)\n    super.onCreate()'
        )
    open(path, 'w', encoding='utf-8').write(content)
    print("    MainApplication.kt patched OK")
except Exception as e:
    print(f"    WARN MainApplication patch: {e}", file=sys.stderr)
PYEOF

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
rm -f "$ALIGNED"
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
