# Reconexión automática de canales que se cortan

**Rama:** `fix/player-auto-reconnect`
**Tipo:** `fix(player)`

## Qué cambió

Cuando un canal que se estaba viendo se corta (por ejemplo, con un 404 del servidor), el
reproductor lo vuelve a arrancar solo, sin que el usuario tenga que cambiar de canal y volver.
Mientras espera, muestra "Se cortó la señal de {canal}. Reconectando… (n de 4)".

## Por qué

Algunos canales se cortaban en plena reproducción y quedaban en el mensaje de error. Al cambiar
de canal y volver, andaban: arrancar de cero (playlist y conexión nuevas) resolvía el corte, pero
el código no lo intentaba nunca.

- En la app Android, ExoPlayer toma cualquier respuesta 4xx como definitiva y no reintenta. Un
  404 de un segmento vencido, o de un playlist que el servidor está rotando, terminaba en error.
- En la web, un error de red fatal de hls.js solo se reintentaba por el proxy local de
  desarrollo. En producción iba directo al error.

## Alcance

- Un canal que estaba reproduciendo se reintenta hasta 4 veces, con esperas de 1, 3, 6 y 10 s.
- Un canal que nunca llegó a arrancar se reintenta una sola vez, al segundo, y después muestra
  el error como antes. Un canal caído no queda en loop.
- Si el canal reproduce 30 s seguidos sin fallar, el próximo corte cuenta desde cero.
- La app tiene que seguir ágil: hay un solo intento por vez, el stream que falló se corta antes
  de esperar, hacer zapping o cerrar cancela la espera, y en segundo plano no se reintenta.
- Afuera: la parte nativa (Java) no cambia, así que no hace falta un APK nuevo. Un stream que se
  queda cargando para siempre sin emitir error no está cubierto.
- Pendiente: probarlo en el TV box. Se verificó en el navegador forzando 404.

## Historial de cambios

### 2026-11-05 — fix(player)

- Política de reconexión pura y testeada, y reconexión en el reproductor web y en el nativo.
