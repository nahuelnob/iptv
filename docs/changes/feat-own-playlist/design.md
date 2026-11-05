# Decisiones técnicas

Solo las decisiones no obvias: las que un lector futuro cuestionaría sin este
documento. Si no descartaste una alternativa razonable, no hace falta este archivo.

## El gesto: siete OK en "Inicio" del menú

**Contexto:** el cambio de lista tenía que quedar escondido y habilitarse con una combinación del
control remoto.

**Decisión:** siete OK seguidos sobre "Inicio" en el menú lateral, estando ya en Inicio, con un aviso
que cuenta desde el cuarto. Para que sea posible, OK sobre "Inicio" en esa situación ya no cierra el
menú: `goSection()` lo cerraba y mandaba el foco a la grilla, así que el segundo OK abría un canal.

**Descartado:**
- Una secuencia de flechas (▲ ▲ ▼ ▼ ◀ ▶ ◀ ▶): mueve el foco mientras se escribe.
- Mantener OK sobre el reloj: el reloj no es enfocable, y hacerlo suma una parada a la navegación normal.

## Apagadas, se ignora la lista guardada

**Contexto:** las teles que ya usaban la app tienen guardada la última URL que cargaron.

**Decisión:** con las opciones apagadas se carga siempre la lista propia; la URL guardada solo cuenta
con las opciones prendidas.

**Descartado:** respetar la URL guardada. Una tele que tenía otra lista quedaría atada a ella sin forma
de cambiarla, porque "Lista" está escondida.
