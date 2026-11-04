# Decisiones técnicas

Feature: [`odd/tasks/android-auto-update.md`](../../../odd/tasks/android-auto-update.md), que cubre el qué, el
por qué y el alcance. Acá queda solo lo que un lector futuro cuestionaría.

## Web remota más APK que se actualiza solo

**Contexto:** cada cambio obligaba a reinstalar la app en la tele con Downloader.

**Decisión:** dos mecanismos. El APK carga la web desde GitHub Pages (`server.url`),
así que los cambios web llegan con cada deploy. Los cambios nativos se publican como
release de GitHub, y la app ofrece instalarlos.

**Alternativas descartadas:**

- Solo `server.url`: los cambios nativos (plugins, Gradle) seguirían necesitando
  Downloader.
- Solo el APK que se actualiza: cada cambio web costaría un release y una
  confirmación en el instalador.
- Un plugin de actualizaciones *live* (Capgo, Appflow): agrega un servicio o un
  hosting de bundles para lo mismo que ya resuelve Pages.

**Consecuencias:** sin internet, la app muestra `offline.html`. Al cambiar el origen
de la página, el `localStorage` se pierde una vez. Quien pueda pushear a `main`
controla el código que corre con acceso a los plugins nativos.

## Navegación diferida a `offline.html`

**Contexto:** el `onReceivedError` de Capacitor llama a `loadUrl(errorPath)` y la
página de error de Chromium gana esa carrera. Se observó en el emulador:
`chrome-error://chromewebdata/`.

**Decisión:** `MainActivity` reemplaza el `BridgeWebViewClient` por una subclase que,
después de llamar a `super`, hace `view.post(() -> view.loadUrl(offline))`.

**Alternativas descartadas:**

- Un `WebViewListener`: su `onReceivedError` no dice si el error es del documento
  principal, así que un logo roto mandaría a la página offline.

## Origen permitido de las actualizaciones

**Contexto:** la URL del APK llega desde la página y la API de GitHub. El permiso
`REQUEST_INSTALL_PACKAGES` es sensible.

**Decisión:** solo `https://github.com/nahuelnob/iptv/releases/download/…`, y el APK
descargado tiene que tener el mismo nombre de paquete. Android además exige la misma
firma para actualizar.

**Consecuencias:** cambiar de repositorio o de dueño obliga a cambiar
`RELEASE_PATH` en `AppUpdatePlugin` con un release nativo.
