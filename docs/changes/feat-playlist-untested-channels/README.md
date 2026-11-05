# 51 canales de canales.m3u que hoy no responden

**Rama:** `feat/playlist-untested-channels`
**Tipo:** `feat(playlist)`

## Qué cambió

`playlists/mi-lista.m3u` pasa de 99 a 150 canales. Se agregan al final los 51 canales elegidos de
`canales.m3u` que no tenían ninguna copia respondiendo: HBO (y HBO 2, Plus, Family), Cinemax, TCM,
Disney Channel, Disney XD, Cartoon Network, Discovery Kids, Boomerang, National Geographic, Nat Geo
Wild, Discovery Channel, TNT, TNT Series, FX, Fox, Fox Sports 3, TyC, Paramount, Sony y otros.

## Por qué

Es el segundo de dos pasos. El dueño los quiere probar en el deco igual: un servidor caído puede
volver, y este PR se revierte solo si no andan.

## Alcance

- El 2026-11-05, desde la red del dueño, ninguna copia respondió: los servidores `168.232.168.242` y
  `190.60.52.28` rechazaron la conexión, `181.78.79.131` respondió 404 para estos canales, y las
  direcciones de `envivoslatam.org` traen un token vencido.
- Una copia por canal: la primera elegida en `canales.m3u`.
- Misma regla de categorías que el paso anterior.
- Para volver a la lista de 99 canales: revertir el PR de esta rama.

## Historial de cambios

### 2026-11-05 — feat(playlist)

- +51 canales elegidos que no respondían al agregarlos, para probar en el deco.
