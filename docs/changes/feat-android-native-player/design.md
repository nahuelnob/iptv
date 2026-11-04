# Decisiones técnicas

Feature: [`odd/tasks/android-native-player.md`](../../../odd/tasks/android-native-player.md), que cubre el qué, el
por qué y el alcance. Acá queda solo lo que un lector futuro cuestionaría.

## Video nativo debajo de un WebView transparente

**Contexto:** algunos canales llegan con video MPEG-2 o HEVC dentro de TS. El WebView
no puede mostrarlos: Chromium no tiene decodificador de MPEG-2, y hls.js 1.7.3
descarta HEVC en TS. El objetivo es el TV box, que sí tiene esos decodificadores por
hardware.

**Decisión:** un plugin de Capacitor (`NativeVideoPlugin`) reproduce con ExoPlayer
(Media3) en un `PlayerView` insertado en el índice 0 del padre del WebView. El
WebView pasa a ser transparente, y la página oculta todo menos el reproductor con
`html[data-native-video]`. La interfaz web existente sigue siendo la misma.

**Alternativas descartadas:**

- Abrir una `Activity` nativa a pantalla completa: obligaba a reescribir en Java la
  interfaz del reproductor (título, favoritos, tira de canales, zapping, Back).
- Usar el reproductor nativo solo cuando hls.js detecta "sin imagen": suma 2 a 3
  segundos por canal y mantiene dos caminos de reproducción en Android.
- Transcodificar con ffmpeg en un servidor: cuesta CPU por cada espectador y
  necesita un servidor siempre prendido.

**Consecuencias:** en Android todos los streams que no son de YouTube van por
ExoPlayer, sin proxies: los pedidos salen desde la IP del dispositivo. Esto depende
de que `BridgeWebChromeClient.onShowCustomView` de Capacitor cierre al instante la
vista de pantalla completa. Si eso cambia, esa vista taparía el video.

## Reenganche ante errores de red

**Contexto:** los servidores IPTV cortan segmentos a mitad de la transferencia. La
política de reintentos por defecto de ExoPlayer trata un cuerpo de respuesta más
corto de lo esperado ("position out of range") como error fatal en el acto.

**Decisión:** ante errores de red (códigos 2xxx de `PlaybackException`) que no sean
un 4xx, el plugin hace `seekToDefaultPosition()` + `prepare()` hasta 3 veces
seguidas. El contador vuelve a cero cuando la reproducción se reanuda.

**Alternativas descartadas:**

- Un `LoadErrorHandlingPolicy` propio: más superficie de código para el mismo
  efecto, y no reengancha al borde del vivo.

**Consecuencias:** un stream que se cae y vuelve una y otra vez se reengancha sin
límite, siempre que reproduzca entre una caída y la siguiente.
