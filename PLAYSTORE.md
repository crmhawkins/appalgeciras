# Guía de Publicación en Google Play Store

## Requisitos previos

- Node.js instalado (versión 18 o superior)
- Cuenta en [expo.dev](https://expo.dev) (gratuita)
- Cuenta de Google Play Developer ($25 pago único)

---

## 1. Crear cuenta en Expo

1. Ir a [expo.dev](https://expo.dev)
2. Pulsar **Sign Up**
3. Crear cuenta con email o GitHub
4. Verificar el email

---

## 2. Autenticarse en EAS CLI

```bash
eas login
```

Introducir email y contraseña de la cuenta Expo. Verificar sesión:

```bash
eas whoami
```

---

## 3. Vincular proyecto con EAS

Dentro del directorio del proyecto:

```bash
eas init
```

Esto crea un `projectId` real en `app.json` bajo `extra.eas.projectId`. Sustituye el valor `PENDIENTE-EAS-LOGIN` actual.

---

## 4. Compilar APK para pruebas (perfil preview)

Genera un APK instalable directamente en Android. Útil para pruebas internas antes de subir a Play Store.

```bash
eas build --platform android --profile preview
```

- La build se ejecuta en servidores de Expo (no necesita Android Studio)
- Al terminar, EAS proporciona un enlace de descarga del APK
- Instalar el APK en el dispositivo para probar

---

## 5. Compilar AAB para Play Store (perfil production)

El formato AAB (Android App Bundle) es obligatorio para Google Play Store.

```bash
eas build --platform android --profile production
```

- Primera vez: EAS genera automáticamente el keystore (firma de la app)
- **Importante:** guardar el keystore en lugar seguro — sin él no se pueden publicar actualizaciones
- Al terminar, descargar el archivo `.aab` desde el dashboard de EAS o el enlace proporcionado

---

## 6. Crear cuenta de Google Play Developer

1. Ir a [play.google.com/console](https://play.google.com/console)
2. Iniciar sesión con cuenta Google
3. Pagar la tasa de registro: **$25 USD** (pago único)
4. Completar el perfil de desarrollador (nombre, email de contacto, etc.)
5. Aceptar los términos del servicio

---

## 7. Crear app en Play Console

1. En Play Console, pulsar **Crear app**
2. Rellenar:
   - **Nombre de la app:** Algeciras CF Abonos
   - **Idioma predeterminado:** Español (España)
   - **Tipo:** App
   - **Gratis o de pago:** Gratuita
3. Aceptar políticas y pulsar **Crear app**

---

## 8. Subir el AAB a Play Console

1. En el menú lateral: **Producción** → **Versiones**
2. Pulsar **Crear nueva versión**
3. En la sección "App bundles", subir el archivo `.aab` descargado
4. Añadir notas de la versión (en español):
   ```
   Primera versión de Algeciras CF Abonos.
   Gestión de abonos y compra de entradas desde tu móvil.
   ```
5. Pulsar **Guardar** → **Revisar versión**

---

## 9. Completar la ficha de la tienda

Sección: **Presencia en Google Play** → **Ficha principal de la tienda**

Rellenar obligatoriamente:
- **Nombre de la app:** Algeciras CF Abonos (máx. 30 caracteres)
- **Descripción corta:** (ver `store-listing.md`)
- **Descripción completa:** (ver `store-listing.md`)
- **Icono de la app:** PNG 512×512 px (fondo verde #1a5c38)
- **Gráfico de funciones:** JPG/PNG 1024×500 px (banner promocional)
- **Capturas de pantalla:** mínimo 2, recomendado 4-8 (teléfono)

Sección: **Categoría de la app**
- **Tipo:** Deporte
- **Etiquetas:** fútbol, abonos, entradas

---

## 10. Clasificación de contenido

Sección: **Clasificación de contenido**

1. Pulsar **Iniciar cuestionario**
2. Categoría: **Aplicaciones de utilidades/herramientas**
3. Responder preguntas (violencia: no, contenido adulto: no, etc.)
4. Guardar y continuar

---

## 11. Publicar

1. Completar todas las secciones marcadas (indicador verde)
2. En **Producción** → **Versiones** → pulsar **Enviar a revisión**
3. Google revisa en 1-7 días laborables
4. Recibirás email de confirmación cuando esté publicada

---

## Actualizaciones futuras

Para publicar una actualización:

1. Incrementar `versionCode` en `app.json` (ej: `2`, `3`...)
2. Incrementar `version` si es cambio de versión visible (ej: `1.0.1`)
3. Ejecutar `eas build --platform android --profile production`
4. Subir el nuevo AAB en Play Console → nueva versión

---

## Comandos de referencia rápida

```bash
# Login
eas login

# Ver estado del proyecto
eas build:list

# Build APK para pruebas
eas build --platform android --profile preview

# Build AAB para producción
eas build --platform android --profile production

# Submit automático a Play Store (requiere configuración de credenciales)
eas submit --platform android --latest
```
