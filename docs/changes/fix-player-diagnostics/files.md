# Archivos tocados

Desglose por archivo de lo que hizo **este cambio**. No describe qué es el archivo
hoy: describe qué le hizo esta rama.

## `src/infra/playlist-source.js`

**Cambio:** modificado

`loadFromUrl` prueba una lista de rutas en orden: la URL directa (solo si es
`https:`), el proxy de Cloudflare y el proxy local si está disponible. Devuelve la
primera respuesta OK. Si todas fallan, informa el timeout, el último código HTTP o un
error de conexión, en ese orden de prioridad. Los demás exports (`loadFromFile`,
`playlistName`, `rememberUrl`, `lastUrl`) se mantienen con la misma firma.

## `src/ui/player.js`

**Cambio:** modificado

- Agrega la constante `CLOUDFLARE_PROXY`. Las señales http(s) se envuelven con ese
  proxy, y las que ya llegan envueltas no se envuelven de nuevo. El proxy local
  sigue siendo el fallback ante un error de red.
- Ya no hay una salida temprana para señales `http:` en páginas HTTPS: el proxy de
  Cloudflare resuelve el Mixed Content.
- El intento (`attempt`) suma dos flags: `recovered`, para recuperar un `mediaError`
  una sola vez, y `noPicture`, para marcar una reproducción sin pista de video.
- Escucha `Hls.Events.BUFFER_CODECS`. Si llega sin `video` ni `audiovideo`, marca
  `noPicture` y muestra `NO_PICTURE`. Los handlers de `playing` y `waiting` mantienen
  ese aviso en lugar de borrarlo o reemplazarlo por "Cargando…".
- `describeHlsError` distingue el 403 y los demás códigos HTTP (`data.response.code`).
- El handler de `error` del `<video>` exige que el elemento tenga `src`.
