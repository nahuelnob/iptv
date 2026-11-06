# Decisiones técnicas

Feature ODD: [`odd/tasks/smooth-playback.md`](../../../odd/tasks/smooth-playback.md). Solo las
decisiones no obvias.

## La página no sale del caché del service worker

**Contexto:** el service worker sirve desde el equipo los scripts, los estilos, la lista y los logos.
Lo natural era servir también la página (stale-while-revalidate).

**Decisión:** la página va primero a la red y usa la copia guardada solo sin conexión. Toda petición de
HTML (también la del precache) lleva `Accept: text/html`.

**Descartado:** servir la página desde el caché. En la app, Capacitor inyecta su puente
(`window.Capacitor`, que es lo que activa ExoPlayer y las actualizaciones) en el HTML que pasa por su
proxy, y solo cuando la petición acepta `text/html` (`WebViewLocalServer.handleProxyRequest`). El
service worker original pedía la página con `new Request(url)`, sin ese header: la copia guardada
quedaba sin puente y en el arranque siguiente la app se habría creído un navegador. Los tests unitarios
no lo ven porque solo pasa dentro del WebView.

**Costo aceptado:** en el primer arranque después de un deploy, la página llega nueva de la red pero
los scripts y estilos salen todavía del caché viejo; el arranque siguiente ya es todo nuevo. Los
cambios entre versiones tienen que tolerar esa mezcla (agregar marcado o código, no depender de que
el otro lado ya cambió).

## La reconexión no detiene ExoPlayer

**Contexto:** la reconexión llamaba a `native.stop()`, que oculta la vista: pantalla negra en cada corte.

**Decisión:** al reconectar el mismo canal, la página no llama a `stop()` y el plugin activa
`setKeepContentOnPlayerReset(true)`: el último cuadro queda congelado hasta que llega el primero del
stream nuevo. `stop()` lo desactiva antes de parar, así un canal nuevo nunca muestra el cuadro del
anterior. En la página, un flag `nativeActive` asegura que cambiar de canal, cerrar o un error final
detengan ExoPlayer aunque haya una reconexión esperando.

**Descartado:** congelar también al cambiar de canal. Mostrar el cuadro del canal anterior mientras
carga el nuevo confunde.

## Logos de imgur sin achicar

**Contexto:** Wikimedia e imgur permiten pedir versiones chicas cambiando la URL.

**Decisión:** solo Wikimedia, y solo con sus anchos estándar (120, 250, 330, 500…): otros anchos dan
error (verificado: 160 y 240 fallan).

**Descartado:** imgur. Sus versiones chicas (`…m.png`, `…t.png`) vuelven como `image/jpeg` y pierden la
transparencia de los logos.
