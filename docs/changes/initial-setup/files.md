# Archivos tocados

Desglose por archivo de lo que hizo **este cambio**. No describe qué es el archivo
hoy: describe qué le hizo este commit. Todos los archivos son nuevos.

## `src/domain/playlist.js`

**Cambio:** añadido

Lector de listas M3U sin dependencias del navegador. Exporta `parseM3U(text)`, que
devuelve canales `{ id, name, quality, unstable, geoBlocked, logo, tvgId, groups, url }`,
y `groupChannels(channels)`, que arma las filas por categoría ordenadas por tamaño con
"Otros" al final. Traduce las categorías conocidas al castellano y deja igual las
desconocidas.

## `src/domain/youtube.js`

**Cambio:** añadido

Reconoce links de YouTube (video, ID de canal o nombre de canal). Exporta
`parseYouTubeUrl(url)` y `youtubeEmbedUrl(url, knownChannels)`, que arma la URL del
reproductor embebido sin barra de controles.

## `src/data/youtube-channels.js`

**Cambio:** añadido

Mapa de nombres de canales de YouTube a su ID (`UC…`) para los 11 canales argentinos de
la lista de Free-TV que vienen por nombre.

## `src/infra/playlist-source.js`

**Cambio:** añadido

Carga de listas por URL o archivo, con reintento por el proxy de desarrollo si el
navegador bloquea la descarga, y recuerda la última URL usada.

## `src/infra/dev-proxy.js`

**Cambio:** añadido

Detecta si el proxy de desarrollo está disponible y arma sus URLs. Fuera del servidor
de desarrollo responde que no hay proxy.

## `src/ui/channel-rows.js`

**Cambio:** añadido

Dibuja las filas de tarjetas (logo o iniciales, nombre y etiquetas de calidad, YouTube,
región y horario parcial).

## `src/ui/player.js`

**Cambio:** añadido

Reproductor a pantalla completa: hls.js primero y HLS nativo de respaldo, embebido de
YouTube, mensajes de error que explican la causa, reintento por el proxy y cierre con
la tecla Atrás del control remoto a través del historial del navegador.

## `src/ui/spatial-nav.js` y `src/ui/keys.js`

**Cambio:** añadido

Navegación con flechas al elemento más cercano en esa dirección y reconocimiento de la
tecla Atrás de Samsung, LG y teclado.

## `src/main.js`

**Cambio:** añadido

Conecta la carga de listas, las filas y el reproductor.

## `index.html`, `styles/tokens.css`, `styles/app.css`

**Cambio:** añadido

Página única, tokens de diseño (oscuro, acento ámbar) y estilos de la interfaz actual.

## `scripts/serve.mjs` y `scripts/proxy.mjs`

**Cambio:** añadido

Servidor estático de desarrollo (`npm start`, solo en `127.0.0.1`) con el proxy
`/proxy?url=` que reescribe las listas HLS para que cada segmento también pase por él.
Rechaza pedidos de otros sitios y direcciones de la red local.

## `test/playlist.test.js`, `test/youtube.test.js`, `test/proxy.test.js`

**Cambio:** añadido

18 tests con `node:test`, sin dependencias.

## `package.json`, `README.md`, `.gitignore`, `.nojekyll`

**Cambio:** añadido

Scripts `start` y `test`, documentación de uso, archivos ignorados y desactivación de
Jekyll para servir el sitio tal cual en GitHub Pages.
