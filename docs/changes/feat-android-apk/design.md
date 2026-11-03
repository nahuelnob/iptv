# Decisiones técnicas

Feature: [`odd/tasks/android-apk.md`](../../../odd/tasks/android-apk.md) — empaquetar la app web como APK
para Android TV. El qué, el porqué y el alcance están en ese documento.

## Capacitor para envolver la web

**Contexto:** la app es HTML, CSS y JavaScript sin build, y tiene que instalarse en decos Android
y reproducir canales `http://` que el navegador bloquea.

**Decisión:** Capacitor 8.5.3 (versión fija, la más nueva con más de dos semanas publicada), que mete
la web en una WebView nativa y genera un proyecto Android estándar.

**Alternativas descartadas:**

- Trusted Web Activity — necesita Chrome instalado, y en Android TV normalmente no lo está.
- Reescribir la app nativa (Kotlin + ExoPlayer) — duplica toda la interfaz ya hecha.

**Consecuencias:** el mismo código sirve para la web y el APK. Dentro del APK sigue aplicando CORS para
`hls.js`; los streams `http://` se permiten con `usesCleartextTraffic` y `allowMixedContent`.

## Copia a `www/` en vez de usar la raíz como carpeta web

**Contexto:** la app vive en la raíz del repo, junto a tests, diseños y el propio `android/`.

**Decisión:** `scripts/build-www.mjs` copia solo `index.html`, `src/` y `styles/` a `www/`
(ignorada por git), y Capacitor empaqueta esa carpeta.

**Alternativas descartadas:**

- `webDir: "."` — metería en el APK los tests, los diseños y el proyecto Android dentro de sí mismo.
- Un bundler — agrega un build que la app no necesita.

**Consecuencias:** antes de compilar hay que correr `npm run android:sync`.

## Java 21 para compilar

**Contexto:** el Gradle que trae el proyecto de Capacitor (8.14.3) no corre sobre el Java 25 de
Android Studio ("Unsupported class file major version 69").

**Decisión:** compilar con Microsoft OpenJDK 21, la versión que pide Capacitor 8.

**Alternativas descartadas:**

- Subir Gradle a 9.x — el Android Gradle Plugin 8.13 de Capacitor está pensado para Gradle 8.

**Consecuencias:** la compilación por consola necesita `JAVA_HOME` apuntando al JDK 21; en Android
Studio, el "Gradle JDK" tiene que ser 21.

## Atrás del control: plugin App más un manejador propio

**Contexto:** en Android la tecla Atrás la recibe la pantalla nativa. Sin `@capacitor/app` cerraba la
app; con el plugin y sin manejador, en la primera entrada del historial no hacía nada
(`AppPlugin.java:48-58`).

**Decisión:** `@capacitor/app` 8.1.2 y `src/infra/native-back.js`: `history.back()` mientras haya
historial (lo resuelven el back guard y el reproductor como en la web) y `exitApp()` si no.

**Alternativas descartadas:**

- Manejar la navegación en Java — duplicaría la lógica del back guard que ya existe en JavaScript.

**Consecuencias:** en el navegador común el módulo no hace nada, porque no existe Capacitor.

## Un iframe nuevo por canal de YouTube

**Contexto:** cambiarle el `src` a un iframe que ya cargó suma entradas al historial compartido
(con TN abierto había 4 en vez de 2), y el primer Atrás volvía el iframe atrás en vez de cerrar el
reproductor.

**Decisión:** el reproductor inserta un iframe nuevo para cada canal de YouTube y lo saca al cerrar.

**Alternativas descartadas:**

- `contentWindow.location.replace()` — depende de navegar un frame de otro origen.

**Consecuencias:** corrige también la versión web.

## Restaurar el foco después de la pantalla completa

**Contexto:** la WebView de Android pasa el foco a `<body>` al entrar o salir de pantalla completa,
después de nuestros `focus()`, y las flechas del control quedan sin destino.

**Decisión:** al terminar cada cambio de pantalla completa, si el foco quedó en `<body>`, se devuelve
a "Volver" (al entrar) o al mosaico que se quería enfocar (al salir; `afterPlayer` lo devuelve).
Se reintenta a los 50 y 400 ms.

**Alternativas descartadas:**

- Guardar `document.activeElement` al cerrar — durante la salida la WebView ignora `focus()` y ya es `<body>`.

**Consecuencias:** los reintentos con temporizador son una solución empírica, verificada en el
emulador de Android 16; en otros decos puede hacer falta ajustar los tiempos.
