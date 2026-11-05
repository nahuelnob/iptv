# 28 canales de canales.m3u que respondían

**Rama:** `feat/playlist-working-channels`
**Tipo:** `feat(playlist)`

## Qué cambió

`playlists/mi-lista.m3u` pasa de 71 a 99 canales. Se agregan al final 28 canales elegidos de
`canales.m3u` que respondían al momento de agregarlos: ESPN 1 a 7, TNT Sports Premium, HBO Xtreme,
A&E, AXN, Cinecanal, Comedy Central, Discovery Science, Turbo y World, History, Nat Geo, TLC,
Lifetime, MTV, Nickelodeon, Disney Jr., Space, Universal, Warner y otros.

## Por qué

Es el primer paso de dos para sumar los canales elegidos, así cada paso se prueba en el deco y se
puede revertir por separado. El segundo paso (`feat/playlist-untested-channels`) suma los que no
respondían.

## Alcance

- Una copia por canal: de las repetidas en `canales.m3u` (el mismo canal en varios servidores) queda
  la que respondió. Se saltean los que ya estaban en la lista (TNT Sports, TNT Novelas).
- Cada entrada conserva su `#EXTINF` y sus líneas extra; la categoría se reescribe con los nombres que
  usa la app (Cine, Deportes, Documentales, Infantiles, Entretenimiento) para no partir categorías.
- Respondían desde la red del dueño el 2026-11-05: casi todos vienen del servidor `181.78.79.131`.
- Afuera: de qué feed regional son los ESPN 1 a 7 (Sur, Norte…) no se sabe; hay que verlo en el deco.
- Para volver a la lista de 71 canales: revertir el PR de esta rama.

## Historial de cambios

### 2026-11-05 — feat(playlist)

- +28 canales que respondían, una copia por canal.
