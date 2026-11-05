# Decisiones técnicas

Solo las decisiones no obvias: las que un lector futuro cuestionaría sin este
documento. Si no descartaste una alternativa razonable, no hace falta este archivo.

## La columna flota sobre el video en pantalla completa

**Contexto:** la propuesta preferida (B) achicaba el video a una caja a la derecha mientras se
recorría la lista.

**Decisión:** el video sigue en pantalla completa y la columna flota encima (propuesta E).

**Descartado:** achicar el video. En la app Android el video es un `PlayerView` nativo de ExoPlayer
en `match_parent` debajo del WebView: achicarlo pedía cambiar el plugin Java, publicar un APK nuevo y
redimensionar un `TextureView` en plena reproducción en los TV box viejos, donde ya hubo video negro
por tocar la superficie. Además, cualquier tecla muestra los controles, así que el video saltaría de
tamaño con cada tecla.

## Back siempre cierra el reproductor

**Contexto:** se pensó que Back primero cancelara la navegación (devolviera el cursor al canal en
pantalla) y recién después cerrara.

**Decisión:** Back cierra, como antes; el cursor vuelve solo cuando los controles se ocultan.

**Descartado:** el Back en dos pasos. En la app Android el botón Back no llega a la página como tecla:
`native-back.js` llama a `history.back()` y el `popstate` del reproductor lo cierra. La regla solo
habría funcionado en el navegador, y el mismo control se comportaría distinto según la plataforma.

## Medir cuántas filas entran

**Contexto:** la columna mostraba siete filas fijas y dejaba espacio vacío abajo.

**Decisión:** después de renderizar se mide el alto de la lista y el paso entre la primera y la
segunda fila, y se vuelve a renderizar una vez si entra otra cantidad. Todas las filas tienen la
segunda línea (vacía si no hay dato) para medir lo mismo.

**Descartado:** calcular con `rem` desde CSS. El tamaño de letra cambia entre TV y escritorio, y en
Chrome 66 el espacio entre filas es un margen en lugar de `gap`; medir el paso real cubre los dos.
