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

new_block = """release {
            if (project.hasProperty('ALGECIRAS_RELEASE_STORE_FILE')) {
                storeFile     file(project.property('ALGECIRAS_RELEASE_STORE_FILE'))
                storePassword project.property('ALGECIRAS_RELEASE_STORE_PASSWORD')
                keyAlias      project.property('ALGECIRAS_RELEASE_KEY_ALIAS')
                keyPassword   project.property('ALGECIRAS_RELEASE_KEY_PASSWORD')
            }
        }"""

# Busca el bloque release { ... } dentro de signingConfigs { ... }.
# Patrón: línea con 'release {' y bloque balanceado hasta el cierre '}'.
pat = re.compile(
    r"release\s*\{[^{}]*storeFile[^{}]*\}",
    re.DOTALL,
)
m = pat.search(src)
if not m:
    print("ERROR: no encontré el bloque release { storeFile ... } en build.gradle", file=sys.stderr)
    sys.exit(2)

new = src[:m.start()] + new_block + src[m.end():]
path.write_text(new, encoding="utf-8")
print("Patched signingConfigs.release OK")
PYEOF
