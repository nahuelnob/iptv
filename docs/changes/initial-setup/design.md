# Decisiones técnicas

## Web sin frameworks ni build

**Contexto:** la app tiene que correr en el navegador ahora y en decos Android, Tizen o
webOS después, muchos con poca memoria.

**Decisión:** HTML, CSS y JavaScript con módulos nativos, sin paso de build. hls.js se
carga desde un CDN con versión fija.

**Alternativas descartadas:**

- React o similar — suma peso y un build que no hace falta para una sola pantalla.

**Consecuencias:** cualquier empaquetador de TV puede envolver la carpeta tal cual. Para
el APK conviene copiar hls.js y las fuentes dentro del proyecto en vez de usar CDN.

## hls.js antes que el HLS nativo

**Contexto:** Chrome responde "maybe" a `canPlayType` para HLS, pero su reproductor nativo
informa los errores sin ningún detalle.

**Decisión:** usar hls.js donde el navegador lo soporte y el HLS nativo solo como
respaldo (Safari en iOS, algunas TV).

**Alternativas descartadas:**

- Preguntar primero por el soporte nativo — elegía el camino nativo en Chrome y el
  usuario veía errores genéricos.

**Consecuencias:** mensajes de error útiles (CORS, formato, canal caído).

## YouTube con el reproductor oficial y un mapa de IDs

**Contexto:** la mitad de los canales de Free-TV son vivos de YouTube, y el reproductor
embebido solo acepta IDs de video o de canal, no nombres como `/c/todonoticias`.

**Decisión:** embeber `youtube.com/embed/live_stream?channel=UC…` con un mapa de nombres
a IDs mantenido a mano.

**Alternativas descartadas:**

- Leer el HTML de YouTube en cada carga para sacar el ID — frágil y contrario a las
  reglas de YouTube.
- YouTube Data API — oficial, pero exige crear una clave de Google Cloud.
- Tapar el logo o los carteles de YouTube — las reglas de YouTube lo prohíben.

**Consecuencias:** un canal nuevo de YouTube por nombre necesita agregar su ID al mapa.

## Proxy de desarrollo que reescribe las listas HLS

**Contexto:** el navegador bloquea por CORS streams que una app nativa reproduciría sin
problema.

**Decisión:** el servidor de desarrollo descarga el stream desde Node y reescribe cada
URL de la lista `.m3u8` para que también pase por el proxy.

**Alternativas descartadas:**

- Desviar los pedidos con `xhrSetup` de hls.js — hls.js resuelve las rutas relativas de
  los segmentos contra la URL del proxy y arma URLs rotas.
- Abrir Chrome con `--disable-web-security` — desactiva la seguridad de todo el navegador.

**Consecuencias:** solo existe en desarrollo, escucha en `127.0.0.1` y rechaza pedidos de
otros sitios y destinos de la red local. En producción y en la TV no hay proxy.

## Tecla Atrás por el historial del navegador

**Contexto:** en Android TV, Atrás no llega a la página como tecla: navega el historial y
sacaba al usuario de la app.

**Decisión:** abrir el reproductor agrega una entrada al historial, y Atrás la saca y
cierra el reproductor. Esc y el botón de cerrar pasan por el mismo camino.

**Alternativas descartadas:**

- Escuchar solo `keydown` — no funciona en navegadores Android ni en WebViews.

**Consecuencias:** el mismo mecanismo sirve para el APK con Capacitor, que usa el
historial de la WebView para su botón Atrás.

## Traducción de categorías en el lector de listas

**Contexto:** las listas públicas traen las categorías en inglés y la app es para
Argentina.

**Decisión:** traducirlas al leer la lista, con un diccionario y pasando sin cambios las
desconocidas.

**Alternativas descartadas:**

- Traducirlas en la capa visual — más prolijo (el dominio conserva el dato original),
  pero sin una tabla de textos de la interfaz todavía.

**Consecuencias:** deuda anotada: mover la traducción a la capa visual cuando se traduzcan
todos los textos de la app.
