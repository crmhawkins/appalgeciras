#!/usr/bin/env bash
# Patcher para android/app/build.gradle post-prebuild.
#
# /android está en .gitignore (es generated por `expo prebuild`), así que cada
# vez que CI corre, el build.gradle es nuevo y NO incluye nuestra signing config
# basada en propiedades. Este script reemplaza el bloque `release { ... }` por
# uno que lee de gradle properties (ALGECIRAS_RELEASE_STORE_FILE, etc.).
#
# Se ejecuta antes de `gradle bundle` en el workflow android-play.yml.

set -euo pipefail

GRADLE_FILE="android/app/build.gradle"
if [[ ! -f "$GRADLE_FILE" ]]; then
  echo "ERROR: $GRADLE_FILE no existe — ¿se ejecutó expo prebuild?" >&2
  exit 1
fi

# Marker que ponemos para detectar si ya patcheado (idempotente).
if grep -q "ALGECIRAS_RELEASE_STORE_FILE" "$GRADLE_FILE"; then
  echo "Ya patcheado, salto."
  exit 0
fi

# Reemplazar el bloque release { ... } del signingConfigs.
# El template Expo siempre genera:
#   release {
#       storeFile file('release.keystore')
#       storePassword 'android'
#       keyAlias 'androiddebugkey'
#       keyPassword 'android'
#   }
# Usamos awk para reemplazar exactamente ese bloque.
python3 - "$GRADLE_FILE" <<'PYEOF'
import re, sys, pathlib

path = pathlib.Path(sys.argv[1])
src = path.read_text(encoding="utf-8")

release_block = """release {
            if (project.hasProperty('ALGECIRAS_RELEASE_STORE_FILE')) {
                storeFile     file(project.property('ALGECIRAS_RELEASE_STORE_FILE'))
                storePassword project.property('ALGECIRAS_RELEASE_STORE_PASSWORD')
                keyAlias      project.property('ALGECIRAS_RELEASE_KEY_ALIAS')
                keyPassword   project.property('ALGECIRAS_RELEASE_KEY_PASSWORD')
            }
        }"""

# CASO 1 (template Expo antiguo): hay 'release { storeFile ... }' precreado
#         con valores debug. Lo reemplazamos.
m = re.search(r"release\s*\{[^{}]*storeFile[^{}]*\}", src, re.DOTALL)
if m:
    src = src[:m.start()] + release_block + src[m.end():]
    path.write_text(src, encoding="utf-8")
    print("Reemplazado release { storeFile ... } existente OK")
    sys.exit(0)

# CASO 2 (Expo prebuild moderno): solo hay signingConfigs.debug. Añadimos
#         release antes del cierre del bloque signingConfigs.
m_sig = re.search(r"signingConfigs\s*\{", src)
if not m_sig:
    print("ERROR: no encontré bloque signingConfigs en build.gradle", file=sys.stderr)
    sys.exit(2)

# Cierre balanceado de signingConfigs
i = m_sig.end()
depth = 1
while i < len(src) and depth > 0:
    if src[i] == "{":
        depth += 1
    elif src[i] == "}":
        depth -= 1
    i += 1
close_pos = i - 1  # pos del '}' que cierra signingConfigs

src = src[:close_pos] + "        " + release_block + "\n    " + src[close_pos:]

# Además: asegurar que buildTypes.release usa signingConfigs.release.
if "signingConfig signingConfigs.release" not in src:
    src = re.sub(
        r"(buildTypes\s*\{[\s\S]*?release\s*\{)",
        r"\1\n            signingConfig signingConfigs.release",
        src, count=1,
    )

path.write_text(src, encoding="utf-8")
print("Inyectado release { ... } dentro de signingConfigs OK")
PYEOF
echo "---- build.gradle (signingConfigs region):"
awk '/signingConfigs/,/^    \}$/' "$GRADLE_FILE" | head -25 || true
