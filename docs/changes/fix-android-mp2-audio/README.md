# Audio MP2 en la app Android (decodificador FFmpeg)

**Rama:** `fix/android-mp2-audio`
**Tipo:** `fix(android)`

## Qué cambió

La app Android decodifica por software el audio que el equipo no sabe decodificar. Los canales que
mandan el audio en MPEG-1 Layer II (MP2) ahora se escuchan en el deco; antes se veían sin sonido.
La versión pasa a 0.2.2, para publicarla como release y que las teles se actualicen solas.

## Por qué

Los 28 canales agregados en el PR #4 (servidor `181.78.79.131`) se veían bien pero sin sonido en el
deco. Su PMT declara audio MPEG-1 Layer II (`stream_type 0x03`, castellano) y el deco (B866V2,
Android 9) no tiene decodificador `audio/mpeg-L2`: su `/vendor/etc/media_codecs.xml` lista AAC, AC-3,
E-AC-3, Opus, FLAC y MP3, pero no MP2. ExoPlayer descartaba esa pista y reproducía solo el video.

## Alcance

- Los decodificadores del equipo siguen primero; FFmpeg solo entra para formatos sin decodificador
  propio, así el resto de los canales no cambia.
- El APK crece unos 6 MB (la biblioteca nativa de FFmpeg para cuatro arquitecturas).
- Verificado en el deco por adb con el APK firmado: en TNT Sports Premium SD (audio solo MP2) se ve
  la imagen, el sistema muestra la pista de audio de la app activa y el dueño confirmó que se escucha.
- Afuera: elegir pista de audio. Algunos canales traen más de una (Universal Channel: castellano MP2
  e inglés AC-3); hoy suena la que ExoPlayer elige por defecto.

## Historial de cambios

### 2026-11-05 — fix(android)

- Extensión FFmpeg de Media3 para el audio que el equipo no decodifica; versión 0.2.2.
