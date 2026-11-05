# Archivos tocados

Desglose por archivo de lo que hizo **este cambio**. No describe qué es el archivo
hoy: describe qué le hizo esta rama.

## `playlists/mi-lista.m3u`

**Cambio:** añadido

71 canales de iptv-org Argentina (copia del 2026-11-05), cada uno con su línea `#EXTINF` y sus líneas
extra (`#EXTVLCOPT` de user-agent y referrer) tal como venían, en el orden original.

## `scripts/build-web.mjs`

**Cambio:** modificado

Copia `playlists/` al sitio, así la lista se publica en Pages junto con la app.

## `src/domain/dev-mode.js`

**Cambio:** añadido

`nextTap(streak, now)` cuenta los OK seguidos (siete, con pausas de hasta 1,5 s) y `tapHint` arma el
aviso "Te faltan N toques…" desde el cuarto.

## `src/infra/dev-mode-store.js`

**Cambio:** añadido

Guarda en `localStorage` si las opciones de desarrollador están prendidas; si el almacenamiento falla,
quedan apagadas.

## `src/main.js`

**Cambio:** modificado

Arranca con la lista propia (o con la última guardada, si las opciones están prendidas). Esconde
"Lista" en el riel y el menú, y los botones "Cambiar lista" y "Usar la lista guardada" del error.
OK sobre "Inicio" con el menú abierto y ya en Inicio cuenta para el gesto en vez de cerrar el menú.
Al apagar las opciones vuelve a la lista propia.

## `src/infra/playlist-source.js`

**Cambio:** modificado

Una URL del mismo origen que la página se pide directo aunque sea `http://`.

## `index.html` y `styles/app.css`

**Cambio:** modificado

Aviso breve (`.toast`) abajo al centro, para la cuenta del gesto.

## `test/dev-mode.test.js` y `test/playlist-source.test.js`

**Cambio:** añadido y modificado

Cubren el gesto (siete OK, pausa que reinicia, cuenta desde el cuarto) y la carga directa del mismo
origen.

## `README.md`

**Cambio:** modificado

Explica la lista propia, su URL y cómo prender las opciones de desarrollador.
