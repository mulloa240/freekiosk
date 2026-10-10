<div align="center">
  <h1>Catas Kiosk</h1>
  <p><strong>La app Android de las tablets de Catas</strong></p>
  <p>Fork de <a href="https://github.com/rushb-fr/freekiosk">FreeKiosk</a> adaptado a la plataforma Catas</p>

  <p>
    <a href="https://github.com/mulloa240/freekiosk/releases/latest">Última versión</a> •
    <a href="#-dónde-está-el-código-propio-del-fork">Código del fork</a> •
    <a href="#-publicar-una-versión">Publicar una versión</a> •
    <a href="https://github.com/mulloa240/somelier">Plataforma Catas (somelier)</a>
  </p>

  <p>
    <a href="https://github.com/mulloa240/freekiosk/releases/latest"><img src="https://img.shields.io/github/v/release/mulloa240/freekiosk?label=versi%C3%B3n" alt="Versión"></a>
    <a href="https://github.com/mulloa240/freekiosk/actions/workflows/build-apk.yml"><img src="https://github.com/mulloa240/freekiosk/actions/workflows/build-apk.yml/badge.svg" alt="Build APK"></a>
    <img src="https://img.shields.io/badge/Android-8.0%2B-green.svg" alt="Android 8.0+">
    <img src="https://img.shields.io/badge/Licencia-MIT-blue.svg" alt="Licencia MIT">
  </p>
</div>

Catas Kiosk es el *shell* nativo que corre en cada tablet de la flota. Bloquea el equipo en modo kiosko (Device Owner), se empareja con el portal de Catas y carga el **kiosk-client** en un WebView con el token del dispositivo. Además reporta telemetría y un auto-diagnóstico de compatibilidad al **admin-api**, y se actualiza sola desde los releases de este repositorio.

La parte web (portal de administración, kiosk-client, app del participante y APIs) vive en el monorepo [mulloa240/somelier](https://github.com/mulloa240/somelier). Este repo es solo la app Android.

## 📦 Instalar en una tablet

1. Descargá la app e instalala (Android 8.0 o superior). Hay tres formas, todas bajan la última versión:
   - desde la tablet, abrí en el navegador **la dirección del portal seguida de `/app`** (hoy `somelier-portaladmin-…sslip.io/app`). El panel "Descargar la app" del portal muestra la dirección exacta, porque la arma con el dominio desde el que se abrió el portal;
   - en el portal, **Flota → Emparejamiento → Descargar la app**, con un QR para escanear desde la tablet;
   - el link directo: [`releases/latest/download/CatasKiosk.apk`](https://github.com/mulloa240/freekiosk/releases/latest/download/CatasKiosk.apk).

   El navegador de la tablet va a pedir permiso para "instalar apps desconocidas" la primera vez.
2. Para el bloqueo completo, dejá la app como Device Owner con el equipo recién reseteado:

   ```bash
   adb shell dpm set-device-owner com.freekiosk/.DeviceAdminReceiver
   ```

3. Abrí la app y emparejala: muestra un código que se valida desde el portal (**Flota → Emparejamiento**). Al validarlo, la tablet recibe su token y carga el kiosk-client sola.

Una vez instalada, cada tablet revisa los releases de este repo al arrancar y se actualiza sola cuando hay una versión más nueva. Con Device Owner la instalación es silenciosa; sin Device Owner, Android muestra el diálogo de instalación estándar.

> Cada release trae el mismo APK con dos nombres. `CatasKiosk.apk` es fijo, para el link de descarga. `FreeKiosk-v<versión>.apk` es el que busca el actualizador de la app, así que no hay que cambiarlo. El `applicationId` sigue siendo `com.freekiosk`, para que las tablets ya instaladas se actualicen encima sin reinstalar ni volver a emparejar.

## 🧭 Dónde está el código propio del fork

Todo lo que no figura acá es FreeKiosk original. Para ver el detalle completo de lo que cambió respecto del upstream, ver [Mantenerse al día con FreeKiosk](#-mantenerse-al-día-con-freekiosk).

### Integración con la plataforma Catas

| Qué | Dónde |
|---|---|
| URLs del kiosk-client y del admin-api, armado de la URL con el token | [`src/config/somelier.ts`](src/config/somelier.ts) |
| Emparejamiento con el portal (init/validate contra admin-api, ID de instalación) | [`src/utils/somelierPairing.ts`](src/utils/somelierPairing.ts), [`src/screens/PairingScreen.tsx`](src/screens/PairingScreen.tsx) |
| Telemetría nativa (pantalla en blanco, errores del WebView, versión real del WebView) | [`src/utils/somelierTelemetry.ts`](src/utils/somelierTelemetry.ts) |
| Copia durable del contenido asignado (sobrevive reinicios y cortes de red) | [`src/utils/somelierContentStore.ts`](src/utils/somelierContentStore.ts) |
| Puente WebView ↔ kiosk-client: inyección de telemetría, modo de bloqueo y config que llegan del portal, guardado/restauración de contenido | [`src/components/WebViewComponent.tsx`](src/components/WebViewComponent.tsx) (bloques marcados "Somelier") |
| Token del dispositivo y botón "Emparejar" en Ajustes | [`src/screens/settings/tabs/GeneralTab.tsx`](src/screens/settings/tabs/GeneralTab.tsx) |
| Rutas `Pairing` y `Diagnostics` | [`src/navigation/AppNavigator.tsx`](src/navigation/AppNavigator.tsx) |
| Arranque: auto-update y auto-diagnóstico | [`App.tsx`](App.tsx) |

### Auto-diagnóstico de compatibilidad

| Qué | Dónde |
|---|---|
| Recolección nativa (Build, ABIs, WebView real con fallbacks para Android < 8, memoria, permisos, sondas TLS/DNS/reloj) | [`DiagnosticsModule.kt`](android/app/src/main/java/com/freekiosk/DiagnosticsModule.kt), [`DeviceStats.kt`](android/app/src/main/java/com/freekiosk/DeviceStats.kt), [`DiagnosticsPackage.kt`](android/app/src/main/java/com/freekiosk/DiagnosticsPackage.kt) |
| Puente JS del módulo nativo | [`src/utils/DiagnosticsModule.ts`](src/utils/DiagnosticsModule.ts) |
| Checks, veredicto, sonda ES5 en el WebView, cola offline y envío a `POST /telemetry/diagnostics` | [`src/utils/selfDiagnostic/`](src/utils/selfDiagnostic/) |
| Pantalla y sección de Ajustes | [`src/screens/DiagnosticsScreen.tsx`](src/screens/DiagnosticsScreen.tsx), [`src/components/DiagnosticsSection.tsx`](src/components/DiagnosticsSection.tsx), [`src/components/DiagnosticProbeWebView.tsx`](src/components/DiagnosticProbeWebView.tsx) |
| Tests | [`__tests__/selfDiagnostic/`](__tests__/selfDiagnostic/) |

### Actualización, marca y distribución

| Qué | Dónde |
|---|---|
| Auto-update al arrancar contra los releases de este repo | [`src/utils/autoUpdate.ts`](src/utils/autoUpdate.ts), [`UpdateModule.kt`](android/app/src/main/java/com/freekiosk/UpdateModule.kt) (apunta a `mulloa240/freekiosk`) |
| Self-update habilitado, versión de la app, `BUILD_TIME` para el diagnóstico | [`android/app/build.gradle`](android/app/build.gradle) |
| Nombre "Catas Kiosk" | [`android/app/src/main/res/values/strings.xml`](android/app/src/main/res/values/strings.xml) |
| Íconos (isotipo Catas sobre verde bosque) y banner de Android TV | `android/app/src/main/res/mipmap-*/`, [`drawable/tv_banner.xml`](android/app/src/main/res/drawable/tv_banner.xml) |
| Soporte de cajas Android TV (leanback, táctil opcional, `largeHeap`) | [`AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml) |
| Traducciones es/en de la interfaz | [`src/i18n/`](src/i18n/) |
| Compilación del APK en cada push y PR, y publicación de releases | [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml), [`.github/workflows/release-apk.yml`](.github/workflows/release-apk.yml) |

### Nombres internos que siguen diciendo "somelier" o "freekiosk"

La marca visible es Catas, pero varios identificadores internos mantienen el nombre anterior a propósito. Son el protocolo entre la app, el kiosk-client y el admin-api, o datos ya guardados en las tablets; renombrarlos rompería equipos instalados:

- mensajes `SOMELIER_*` entre el WebView y el shell nativo;
- claves de AsyncStorage (`@somelier_*`) y nombres de archivos y funciones `somelier*`;
- el paquete `com.freekiosk` y el nombre del APK del release (`FreeKiosk-v*.apk`).

## 🚀 Publicar una versión

1. En un PR, subí la versión en tres lugares y anotá los cambios:
   - `android/app/build.gradle`: `versionCode` (+1) y `versionName`;
   - `package.json`: `version`;
   - `CHANGELOG.md`: una entrada nueva arriba.
2. Mergeá el PR a `main`. El workflow **Build APK** compila el APK y lo deja como artefacto `catas-kiosk-apk` (esto pasa en cada push y PR, sin publicar nada).
3. Creá el tag sobre `main` y subilo:

   ```bash
   git tag v1.3.0 && git push origin v1.3.0
   ```

   El workflow **Release APK** compila y publica el release "Catas Kiosk v1.3.0" con `FreeKiosk-v1.3.0.apk` y `CatasKiosk.apk`. Desde ese momento las tablets lo detectan solas y el link de descarga ya baja la versión nueva.

> El `versionName` del APK tiene que coincidir con el tag. Si no, la tablet instala la versión nueva pero sigue reportando la vieja, y vuelve a ofrecer la actualización en cada arranque.

## 🛠️ Desarrollo

Requisitos: Node 20+, JDK 17+ y Android SDK 26+.

```bash
npm ci                 # dependencias (aplica los parches de patches/)
npm start              # Metro bundler
npm run android        # correr en un equipo o emulador conectado
npm test               # tests de Jest
npm run lint           # ESLint

cd android && ./gradlew assembleRelease   # APK release
```

El APK queda en `android/app/build/outputs/apk/release/`. Hay más detalle de la arquitectura (módulos nativos, pantallas, parches de dependencias) en [`CLAUDE.md`](CLAUDE.md) y en la [guía de desarrollo](docs/development.md).

## 🔄 Mantenerse al día con FreeKiosk

Para traer mejoras del proyecto original:

```bash
git remote add upstream https://github.com/rushb-fr/freekiosk.git   # una sola vez
git fetch upstream
git diff $(git merge-base main upstream/main) main --stat           # todo lo propio del fork
git merge upstream/main                                              # en una rama, y después PR
```

## 📚 Documentación de FreeKiosk

Las funciones heredadas de FreeKiosk (modos de pantalla, REST API, MQTT, aprovisionamiento por ADB) siguen documentadas en inglés en `docs/`:

| Tema | Documento |
|---|---|
| Instalación y Device Owner | [docs/installation.md](docs/installation.md) |
| Modos de pantalla | [docs/features-and-modes.md](docs/features-and-modes.md) |
| REST API (40+ endpoints) | [docs/rest-api.md](docs/rest-api.md) |
| MQTT y Home Assistant | [docs/MQTT.md](docs/MQTT.md), [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) |
| Aprovisionamiento por ADB | [docs/adb-configuration.md](docs/adb-configuration.md) |
| Preguntas frecuentes | [docs/faq.md](docs/faq.md) |

## 📄 Licencia y créditos

MIT, igual que el original. Ver [LICENSE](LICENSE).

Catas Kiosk se basa en [FreeKiosk](https://github.com/rushb-fr/freekiosk), creado por [Rushb](https://rushb.fr). Gracias a su equipo por publicarlo como software libre.
