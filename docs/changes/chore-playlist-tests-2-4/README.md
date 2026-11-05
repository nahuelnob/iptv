# Señales de prueba test2, test3 y test4

**Rama:** `chore/playlist-tests-2-4`
**Tipo:** `chore(playlist)`

## Qué cambió

La lista propia (`playlists/mi-lista.m3u`) suma tres entradas temporales, `test2`, `test3` y `test4`,
debajo de `test1` y en el mismo grupo. Vienen del mismo servidor que `test1` (`138.59.227.20:8000`).

## Por qué

Son señales nuevas para probar en la tele. Las tres respondieron desde la máquina de desarrollo con
video H.264 y audio AAC, el mismo formato que `test1`, así que no dependen del decodificador de MP2.
Su calidad declarada es de unos 3 Mbps (`test2`), 4 Mbps (`test3`) y 1 Mbps (`test4`). No se pudo ver
qué canal es cada una: eso se confirma en la tele.

## Alcance

- Entradas temporales: después de verlas en la tele, se borran las que no sirvan y las que queden
  toman el nombre, el logo y el grupo del canal que resulten ser.
- Igual que `test1`, no cuentan como canales propios de la lista mientras dure la prueba.

## Historial de cambios

### 2026-11-05 — chore(playlist)

- Entradas `test2`, `test3` y `test4` con tres señales del servidor de `test1`, para identificar en la tele.
