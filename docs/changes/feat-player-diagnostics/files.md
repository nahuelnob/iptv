# Archivos tocados

Desglose por archivo de lo que hizo **este cambio**. No describe qué es el archivo
hoy: describe qué le hizo esta rama.

## `src/domain/diagnostics.js`

**Cambio:** añadido

Versión de Android desde el user-agent, texto del formato (sin valores desconocidos), cuadros perdidos
y la superficie alternativa (`nextSurface`).

## `src/ui/diagnostics-panel.js`

**Cambio:** añadido

El panel: guarda los eventos del canal actual y los muestra; lee la versión instalada con
`App.getInfo()` de Capacitor; el botón de superficie solo aparece con el reproductor nativo.

## `src/infra/video-surface-store.js`

**Cambio:** añadido

Guarda la superficie elegida en `localStorage` (`TextureView` si no hay nada o si el almacenamiento falla).

## `src/ui/player.js`

**Cambio:** modificado

Reenvía los eventos nativos al panel, le pasa al plugin la superficie guardada, muestra el panel al
abrir solo con las opciones prendidas y reinicia el canal al cambiar de superficie.

## `src/main.js`

**Cambio:** modificado

Arranca siempre con la lista propia y le pasa al reproductor si las opciones están prendidas.

## `index.html` y `styles/app.css`

**Cambio:** modificado

Marcado y estilos del panel; no se desvanece con los controles, para que una foto de la tele lo muestre.

## `test/diagnostics.test.js`

**Cambio:** añadido

Versión de Android, formato, cuadros perdidos y alternancia de superficie.

## `README.md`

**Cambio:** modificado

Describe el panel y que la app arranca siempre con la lista propia.
