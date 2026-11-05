# Fuera los 10 canales de iptvperu

**Rama:** `fix/playlist-drop-iptvperu`
**Tipo:** `fix(playlist)`

## Qué cambió

`playlists/mi-lista.m3u` pasa de 99 a 89 canales: se sacan los 10 que salen del servidor
`bantel-cdn1.iptvperu.tv` (Cartoon Network, Disney Channel, Disney Jr., ESPN, ESPN 2 y ESPN 3
Latin America Argentina, FX, Space, TNT y TNT Series). El resto de la lista no cambia.

## Por qué

El 2026-11-05 los diez respondieron 403 "Forbidden" a pedir su playlist desde la red del dueño, con
el user-agent de la app y con el que trae cada entrada en sus líneas `#EXTVLCOPT`, y también desde el
proxy de Cloudflare (IP de datacenter). Las URL no tienen token, así que no es un enlace vencido: el
servidor solo admite conexiones de su propia red, y desde Argentina no se pueden ver.

## Alcance

- Solo se borran esas 10 entradas con sus líneas extra; ninguna otra línea cambia.
- Se pierden los únicos ESPN rotulados como feed argentino; quedan ESPN Premium, ESPN Extra y ESPN 1 a 7.
- Para volver a tenerlos: revertir el PR de esta rama.

## Historial de cambios

### 2026-11-05 — fix(playlist)

- −10 canales de `iptvperu.tv` que rechazan cualquier conexión de fuera de su red.
