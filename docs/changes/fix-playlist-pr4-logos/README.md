# Logos para los 28 canales de canales.m3u

**Rama:** `fix/playlist-pr4-logos`
**Tipo:** `fix(playlist)`

## Qué cambió

Los 28 canales que se sumaron en el PR #4 (desde `canales.m3u`) ahora tienen logo en la grilla, como
el resto de la lista: a cada línea `#EXTINF` se le agregó su `tvg-logo`. No cambia ninguna otra parte.

## Por qué

`canales.m3u` traía logo en solo 12 de sus 584 canales, y ninguno de estos 28: en la grilla mostraban
las iniciales en lugar del logo.

## Alcance

- Los logos son los de la base pública de iptv-org, buscados por nombre del canal. Antes de usar cada
  uno se comprobó que la dirección sirve una imagen.
- HBO Xtreme: su logo de iptv-org (`vertvcable.com`) ya no existe; se usa el de HBO Xtreme
  Latinoamérica de la misma base.
- ESPN 5, 6 y 7 no están en iptv-org: llevan el logo de ESPN; el número queda en el nombre del canal.
- Comprobado: el lector de la app ve logo en los 99 canales, y en el navegador los 28 logos cargan.
- Afuera: los logos son enlaces externos (Wikimedia, imgur, Pluto TV), como los del resto de la lista;
  si alguno se cae, el canal vuelve a mostrar sus iniciales.

## Historial de cambios

### 2026-11-05 — fix(playlist)

- `tvg-logo` para los 28 canales agregados en el PR #4.
