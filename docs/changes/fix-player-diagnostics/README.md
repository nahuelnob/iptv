# Proxy de Cloudflare y diagnósticos de reproducción

**Rama:** `fix/player-diagnostics`
**Tipo:** `fix(player)`

## Qué cambió

Las señales y las listas pasan por el proxy de Cloudflare, así se pueden ver fuera del
servidor de desarrollo. Además, el reproductor ahora explica dos fallas que antes se
veían como pantalla negra o como un error genérico: un video que el navegador no puede
decodificar y un rechazo 403 del servidor de origen.

## Por qué

- En producción no existe el proxy local. Una lista `https://` sin CORS, o una señal
  `http://` dentro de la app servida por HTTPS, fallaban sin alternativa.
- Telefe (1080p) se escuchaba pero se veía negro. El stream trae video MPEG-2
  (`stream_type 0x02` en la PMT del TS), que Chromium no decodifica. hls.js descarta
  esa pista sin emitir ningún error, así que el usuario no tenía ninguna pista de qué
  pasaba.
- Cartoon Network y otros canales del CDN `bantel-cdn1.iptvperu.tv` devuelven 403
  sin importar el User-Agent, el Referer o el Origin, incluso desde una IP argentina.
  El mensaje decía "la señal no responde", que es engañoso.

## Alcance

- Adentro: la cadena de intentos para cargar listas (directo, Cloudflare, proxy
  local), el envoltorio de las señales con el proxy de Cloudflare, la recuperación
  única de `mediaError` en hls.js, el aviso de "sin imagen" y los mensajes por código
  HTTP.
- Afuera: hacer visible el video MPEG-2 (haría falta transcodificar o un reproductor
  nativo) y leer las líneas `#EXTVLCOPT`. Se probaron los 18 canales de `ar.m3u` que
  las traen, con y sin esas cabeceras, y el resultado fue idéntico en todos.
- El código del Worker de Cloudflare no vive en este repo.

## Historial de cambios

### 2026-11-04 — fix(player)

- Las listas se cargan probando directo, después por Cloudflare y por último por el
  proxy local.
- Las señales http(s) pasan por el proxy de Cloudflare.
- Un `mediaError` fatal de hls.js se intenta recuperar una vez antes de mostrar el
  error.
- Se ignoran los errores del `<video>` sin `src` que dispara `teardown()`.
- Si hls.js arranca sin pista de video, se muestra un aviso de "audio sin imagen".
- Un 403 y los demás errores HTTP muestran su código real.
