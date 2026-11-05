# Archivos tocados

Desglose por archivo de lo que hizo **este cambio**. No describe qué es el archivo
hoy: describe qué le hizo esta rama.

## `src/ui/keys.js`

**Cambio:** modificado

Nueva `browseStepOf` (▲ ▼ mueven el cursor). `channelStepOf` dejó de incluir las flechas: ahora solo
responde a ChannelUp / ChannelDown / PageUp / PageDown.

## `src/domain/zapping.js`

**Cambio:** modificado

Nueva `windowAround(list, current, size)`: `size` canales alrededor del actual, con el extra abajo
si la cantidad es par y sin repetir canales en listas cortas. `neighborWindow` delega en ella.

## `src/ui/player.js`

**Cambio:** modificado

La tira se reemplazó por la columna: filas como botones navegables (`data-nav`), un `cursor` aparte
del canal en pantalla, `pick()` para OK y `switchTo()` compartido con el zapping de CH+ / CH-.
`rowsThatFit()` mide el alto disponible y el paso entre filas para renderizar las que entran, y se
recalcula al cambiar el tamaño de la ventana. Al abrir, el foco va a la fila del canal en pantalla.

## `index.html`

**Cambio:** modificado

La tira pasó a ser un `<nav>` con encabezado (posición "n de N"), la lista y la pista de teclas.
"Activar sonido" y "Volver" se movieron a un contenedor propio abajo a la derecha.

## `styles/app.css`

**Cambio:** modificado

Estilos de la columna, las filas, el cursor y el chip OK; el título y los avisos se corren a la
derecha de la columna; versión de hoja inferior en teléfonos; respaldos sin flex gap para Chrome 66.

## `test/keys.test.js`

**Cambio:** añadido

Cubre que ▲ ▼ recorren, que CH+ / CH- cambian directo y que las flechas ya no cambian de canal.

## `test/zapping.test.js`

**Cambio:** modificado

Test de `windowAround`: centrado, cantidad par, lista circular, lista corta y lista vacía.

## `README.md`

**Cambio:** modificado

El párrafo de control remoto describe la columna, OK y CH+ / CH-.
