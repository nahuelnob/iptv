# Archivos tocados

Desglose por archivo de lo que hizo **este cambio**. No describe qué es el archivo
hoy: describe qué le hizo esta rama.

## `src/domain/reconnect.js`

**Cambio:** añadido

Política de reconexión sin DOM ni timers, para poder testearla en Node. Exporta
`startSession`, `markPlaying`, `nextReconnect`, `RECONNECT_DELAYS_MS` y `STABLE_MS`.
`nextReconnect` devuelve cuánto esperar (o `null` para rendirse), qué intento es y de cuántos.

## `test/reconnect.test.js`

**Cambio:** añadido

Cubre las esperas de 1, 3, 6 y 10 s, el reintento único de un canal que nunca arrancó, el
reinicio del contador tras 30 s estables y que una pausa por buffering no mueve el inicio.

## `src/ui/player.js`

**Cambio:** modificado

Los errores del reproductor (error nativo de ExoPlayer, error fatal de red o de formato de
hls.js, error del `<video>`) pasan por la nueva `recover()` en lugar de cortar con `fail()`.
`teardown()` cancela la espera pendiente, así que el zapping y el cierre la cancelan. Una espera
que termina con la app en segundo plano se retoma al volver (`visibilitychange`).

## `README.md`

**Cambio:** modificado

Fila nueva para `src/domain/reconnect.js` en la tabla de estructura.
