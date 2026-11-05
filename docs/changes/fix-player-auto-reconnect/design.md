# Decisiones técnicas

Solo las decisiones no obvias: las que un lector futuro cuestionaría sin este
documento. Si no descartaste una alternativa razonable, no hace falta este archivo.

## Reconectar desde JS arrancando el canal de cero

**Contexto:** el corte se resolvía cambiando de canal y volviendo, es decir, con un arranque
completo. Había que lograr lo mismo en la app Android (ExoPlayer) y en la web (hls.js).

**Decisión:** cuando el reproductor se rinde, JS llama de nuevo a `native.play` (con un id
nuevo) o a `play()`, igual que el zapping. La lógica vive una sola vez y aplica a los dos
reproductores.

**Descartado:**
- Reintentar los 4xx dentro de `NativeVideoPlugin.java`: solo cubría la app, pedía publicar un
  APK nuevo y además mezclaba un 404 pasajero con un 403 definitivo dentro del rejoin rápido.
- Ajustar las políticas de reintento de hls.js: solo cubría la web, y un rejoin dentro de la
  misma sesión no es lo que resolvía el corte, sino pedir el playlist de nuevo.

## Un solo intento en vuelo

**Contexto:** el usuario pidió que la app siga ágil y que no se acumulen cargas.

**Decisión:** antes de cada espera se llama a `teardown()`, que corta el stream que falló, y hay
un único timer que `teardown()` también limpia. JS solo reintenta cuando ExoPlayer o hls.js ya se
rindieron, así que sus reintentos internos y los de JS van uno detrás del otro.

**Descartado:** dejar el stream que falló cargando mientras se espera, o programar varios
reintentos a la vez. Los dos suman descargas en paralelo, y en un TV box eso se nota.
