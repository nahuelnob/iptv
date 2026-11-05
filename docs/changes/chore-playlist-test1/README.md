# Señal de prueba de América TV en 1080

**Rama:** `chore/playlist-test1`
**Tipo:** `chore(playlist)`

## Qué cambió

La lista propia (`playlists/mi-lista.m3u`) suma una entrada temporal, `test1`, debajo de América TV
y en el mismo grupo, con otra señal del canal.

## Por qué

La señal actual de América TV es 720p. La nueva midió 1920×1080 con una sola calidad y unos 2,8 Mbps
en un segmento real, así que podría verse mejor. No se pudo confirmar en pantalla que sea América ni
medir la señal actual desde la máquina de desarrollo: la comparación se hace en la tele.

## Alcance

- Entrada temporal: después de comparar en la tele, se borra la señal que pierda y la que quede
  toma el nombre y los datos de América TV.
- El README sigue describiendo la lista como 71 canales tomados de iptv-org; `test1` no viene de
  esa fuente y no cuenta como canal propio mientras dure la prueba.

## Historial de cambios

### 2026-11-05 — chore(playlist)

- Entrada `test1` con una segunda señal de América TV en 1080, para comparar.
