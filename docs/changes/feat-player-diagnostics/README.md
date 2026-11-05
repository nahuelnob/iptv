# Panel de diagnóstico de video y arranque siempre con la lista propia

**Rama:** `feat/player-diagnostics`
**Tipo:** `feat(player)`

## Qué cambió

- Con las opciones de desarrollador prendidas, el reproductor muestra arriba a la derecha un panel
  de diagnóstico: versión de la app y de Android, reproductor (nativo o web), superficie de video,
  decodificador, formato (códec, resolución, fps), tiempo hasta el primer cuadro, cuadros perdidos y
  el último evento del reproductor.
- En la app Android, el panel tiene un botón para probar la otra superficie de video (`TextureView` o
  `SurfaceView`): reinicia el canal sobre ella y la elección queda guardada en ese equipo, con las
  opciones prendidas o apagadas.
- La app arranca siempre con la lista propia. Con las opciones prendidas, "Lista" sirve para probar
  otra lista hasta que la app se reinicia.

## Por qué

- En el deco Flow (Android 11) algunos canales arrancan verdes y rotos y la 0.2.3 no lo resolvió. Ese
  deco no permite adb, así que la única forma de ver qué hace es que la app lo muestre en pantalla. El
  plugin nativo ya emitía decodificador, formato y cuadros perdidos; nadie los mostraba.
- Probar la superficie desde la pantalla dice si el verde depende de `TextureView`, sin APK nuevo: el
  plugin ya acepta el parámetro `surface`.
- Ese deco quedó arrancando con `ar.m3u` porque las opciones estaban prendidas: la regla anterior
  hacía que la última lista cargada a mano ganara al arrancar.

## Alcance

- Solo web: se publica con Pages, sin APK nuevo.
- Verificado en el navegador: arranca con la lista propia aunque las opciones estén prendidas y haya
  otra lista guardada; el panel aparece solo con las opciones prendidas. La parte nativa
  (decodificador, formato, cambio de superficie) no se pudo probar: no había ningún deco disponible.

## Historial de cambios

### 2026-11-05 — feat(player)

- Panel de diagnóstico con selector de superficie; arranque siempre con la lista propia.
