# Columna de canales con navegación libre en el reproductor

**Rama:** `feat/player-channel-column`
**Tipo:** `feat(player)`

## Qué cambió

La tira horizontal de canales cercanos pasó a ser una columna vertical a la izquierda, sobre el
video en pantalla completa. ▲ ▼ mueve un cursor por la columna sin cortar el canal que se está
viendo, y OK cambia al canal del cursor. CH+ / CH- (PageUp / PageDown en teclado) siguen cambiando de
canal directo.

## Por qué

Con la tira horizontal, ▲ ▼ cambiaban de canal pero la tira se dibujaba de izquierda a derecha: para
ir "a la derecha" había que tocar ▼ y para ir "a la izquierda", ▲. La columna vertical hace que las
flechas se muevan como se ve la lista. Además, recorrer sin cargar cada canal hace la app más ágil:
el canal elegido carga recién con OK.

Se eligió entre cinco propuestas de diseño (lienzo "Nodo · Lista de canales en el player"): la
variante E, que combina el layout de la A con la navegación de la B.

## Alcance

- La columna muestra todos los canales que entran en su alto, con el cursor al medio; en teléfonos
  es una hoja abajo con tres filas.
- El canal en pantalla es la fila invertida (Hueso) con punto rojo y "Viendo ahora"; el cursor lleva
  el anillo de foco y un chip "OK".
- Cuando los controles se ocultan (4 s), el cursor vuelve al canal en pantalla.
- Back cierra el reproductor, igual que antes, también mientras se recorre la lista.
- Los mensajes que decían "Presioná ▼ para pasar al canal siguiente" ahora dicen "Elegí otro canal
  con ▲ ▼ y OK".
- Afuera: la parte nativa (Java) no cambia. Pendiente: probarlo en el TV box.

## Historial de cambios

### 2026-11-05 — feat(player)

- Columna vertical de canales con cursor libre, OK para cambiar y CH+ / CH- directo.
- La columna se llena con todos los canales que entran y todas las filas miden lo mismo.
