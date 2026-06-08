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

def find_block_close(text, open_pos):
    """Devuelve la posición del '}' que cierra el '{' situado en open_pos-1.
    open_pos debe apuntar al carácter inmediatamente DESPUÉS del '{' abierto.
    """
    depth = 1
    i = open_pos
    while i < len(text) and depth > 0:
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
        i += 1
    return i - 1

# PASO 1: Asegurar que signingConfigs tiene un bloque release {} con nuestras
# propiedades. Si existe uno previo (con storeFile), lo reemplazamos; si no,
# lo añadimos antes del cierre del bloque signingConfigs.
m_existing_release = re.search(r"release\s*\{[^{}]*storeFile[^{}]*\}", src, re.DOTALL)
if m_existing_release:
    src = src[:m_existing_release.start()] + release_block + src[m_existing_release.end():]
    print("PASO 1: reemplazado release { storeFile ... } existente")
else:
    m_sig = re.search(r"signingConfigs\s*\{", src)
    if not m_sig:
        print("ERROR: no encontré bloque signingConfigs en build.gradle", file=sys.stderr)
        sys.exit(2)
    close_pos = find_block_close(src, m_sig.end())
    src = src[:close_pos] + "        " + release_block + "\n    " + src[close_pos:]
    print("PASO 1: añadido release { ... } dentro de signingConfigs")

# PASO 2: Forzar que buildTypes.release use signingConfigs.release.
# Localizamos el bloque buildTypes { ... release { ... } } y le inyectamos
# signingConfig signingConfigs.release al inicio, REEMPLAZANDO cualquier
# signingConfig signingConfigs.debug que Expo haya puesto.
m_bt = re.search(r"buildTypes\s*\{", src)
if not m_bt:
    print("ERROR: no encontré buildTypes en build.gradle", file=sys.stderr)
    sys.exit(3)
bt_close = find_block_close(src, m_bt.end())
bt_inner = src[m_bt.end():bt_close]

# dentro de buildTypes, busca 'release {'
m_release_bt = re.search(r"release\s*\{", bt_inner)
if not m_release_bt:
    print("ERROR: no encontré buildTypes.release en build.gradle", file=sys.stderr)
    sys.exit(4)
rel_open_abs = m_bt.end() + m_release_bt.end()  # posición tras '{'
rel_close_abs = find_block_close(src, rel_open_abs)
rel_block = src[rel_open_abs:rel_close_abs]

# Quita cualquier signingConfig anterior y pon el nuestro al principio.
rel_block_new = re.sub(
    r"\n\s*signingConfig\s+signingConfigs\.[a-zA-Z]+\s*",
    "",
    rel_block,
)
rel_block_new = "\n            signingConfig signingConfigs.release" + rel_block_new

src = src[:rel_open_abs] + rel_block_new + src[rel_close_abs:]
print("PASO 2: buildTypes.release ahora usa signingConfigs.release (forzado)")

path.write_text(src, encoding="utf-8")
PYEOF
echo "---- build.gradle (signingConfigs region):"
awk '/signingConfigs/,/^    \}$/' "$GRADLE_FILE" | head -25 || true
echo "---- build.gradle (buildTypes region):"
awk '/buildTypes/,/^    \}$/' "$GRADLE_FILE" | head -30 || true

# Verificación final — falla el script si algo no está correcto.
if ! grep -q "ALGECIRAS_RELEASE_STORE_FILE" "$GRADLE_FILE"; then
  echo "ERROR: keystore prop no inyectada" >&2
  exit 5
fi
if ! grep -q "signingConfig signingConfigs.release" "$GRADLE_FILE"; then
  echo "ERROR: buildTypes.release no usa signingConfigs.release" >&2
  exit 6
fi
echo "[OK] Verificación final passed."

# -------------------------------------------------------------------------
# Fastlane runtime deps missing on hosted runner (Ruby 3.2 + fastlane 2.235)
# -------------------------------------------------------------------------
# El `gem install fastlane -NV` del workflow no instala todas las gemas
# transitivas que cargan las actions por defecto (entre ellas
# create_app_on_managed_play_store -> google-apis-playcustomapp_v1 ->
# representable/json -> multi_json). En CI Linux Ruby 3.2 esto rompe el
# arranque de fastlane con:
#   Could not find 'multi_json' (>= 1.14.1) (Gem::MissingSpecError)
#
# Como NO podemos editar el workflow (PAT sin scope `workflow`), instalamos
# las gemas aquí mismo — este script SÍ se commitea libre.
echo "---- Installing fastlane runtime gems missing on hosted runner..."
gem install multi_json json representable --no-document --conservative 2>&1 | tail -5 || {
    echo "WARN: gem install falló (puede estar ya instalado). Continuando."
}
