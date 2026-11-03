# Primera versión del reproductor IPTV web

**Rama:** `main` (ref explícito del commit inicial: `initial-setup`)
**Tipo:** `feat(player)`

## Qué cambió

Se crea el reproductor IPTV web: carga una lista M3U por URL o archivo, muestra los
canales en filas por categoría (en castellano), se navega con flechas o control remoto
y reproduce streams HLS y vivos de YouTube con el reproductor oficial embebido.

## Por qué

Primer paso del proyecto: una app para ver canales abiertos argentinos de forma legal,
pensada desde el inicio para el navegador y, más adelante, para decos y TV boxes con
Android. Las listas de referencia son las de Free-TV (solo canales gratuitos) e iptv-org.

## Alcance

Adentro:

- Lectura de listas M3U con limpieza de metadatos en los nombres (calidad, horario
  parcial, marcas de Free-TV) y traducción de categorías al castellano.
- Filas por categoría, navegación espacial con flechas y tecla Atrás del control remoto.
- Reproducción HLS con hls.js (respaldo nativo) y vivos de YouTube por ID de canal.
- Servidor de desarrollo con un proxy local que evita los bloqueos de CORS al probar.
- Tests del lector de listas, de los links de YouTube y del proxy (18 tests).

Afuera, pendiente:

- La interfaz nueva (opción C del diseño) y la traducción de los textos de la app,
  que hoy siguen en inglés. Los diseños en `design/` entran en un commit aparte.
- Búsqueda, favoritos y cambio de canal con ▲/▼ dentro del reproductor.
- Empaquetado como APK para Android TV.
- Los canales pagos que trae la lista de iptv-org no se filtran todavía.

## Historial de cambios

### 2026-11-03 — feat(player)

- Versión inicial del reproductor, el servidor de desarrollo y sus tests.
