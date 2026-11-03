# Decisiones técnicas

Feature: [`odd/tasks/ui-mosaico.md`](../../../odd/tasks/ui-mosaico.md) — aplicar la opción C del diseño
(riel lateral) a la app real. El qué, el porqué y el alcance están en ese documento.

## Atrás del control remoto a través del historial, también para la navegación

**Contexto:** en Android TV, y en la WebView de Capacitor, la tecla Atrás no llega a la página como
tecla: navega el historial. La navegación tiene varios pasos para deshacer (menú abierto, categoría
elegida, sección) y no solo el reproductor.

**Decisión:** mientras haya algo para deshacer, la app mantiene una única entrada propia en el
historial (`src/ui/back-stack.js`). Atrás la consume, deshace un paso según el orden de PLAN §3 y la
vuelve a poner si queda algo más. Esc y los botones pasan por el mismo camino.

**Alternativas descartadas:**

- Escuchar solo `keydown` — no llega en navegadores Android ni en WebViews.
- Una entrada de historial por cada paso — el historial crece y el usuario necesita Atrás de más
  para salir de la app.

**Consecuencias:** el mismo mecanismo sirve para el navegador y para el APK. Queda un cierre de
respaldo de 600 ms en el reproductor para un caso en que el evento del historial no llegó y no se
pudo explicar; es deuda a revisar.

## Favoritos y "Seguir viendo" guardados por URL del stream

**Contexto:** el `id` de cada canal es su posición en la lista (`ch-${index}`) y cambia si la lista
cambia.

**Decisión:** `localStorage` guarda las URLs, y al cargar una lista se cruzan con los canales.
Todo acceso al almacenamiento está protegido con `try/catch`, porque algunas WebViews de TV lo
bloquean.

**Alternativas descartadas:**

- Guardar el `id` — los favoritos apuntarían a otro canal con la primera lista nueva.
- Guardar por nombre — se repiten entre listas y cambian de formato.

**Consecuencias:** los favoritos sobreviven a cambiar o actualizar la lista, y sirven igual si más
adelante se cargan varias listas.

## ▲/▼ cambian de canal; la estrella de favoritos se alcanza con ◀

**Contexto:** el dueño pidió la estrella junto al nombre del canal y pidió también que ▲/▼ cambien
de canal mientras mira. Las dos cosas no pueden usar ▲.

**Decisión:** ▲/▼ (y CH+/CH−) siempre cambian de canal en el reproductor. La estrella se alcanza con
◀ desde "Volver"; además existen la tecla F y mantener OK sobre un mosaico.

**Alternativas descartadas:**

- ▲ desde la barra hacia la estrella — haría que ▲ a veces cambie de canal y a veces no, según el foco.

**Consecuencias:** el cambio de canal es predecible, que es la acción más frecuente al mirar TV.

## Pantalla completa: salir de ella cierra el reproductor

**Contexto:** en Chrome, Esc con pantalla completa lo consume el navegador y solo dispara
`fullscreenchange`; la página no recibe la tecla.

**Decisión:** abrir un canal pide pantalla completa con la acción del usuario; salir de pantalla
completa con el reproductor abierto se trata como cerrarlo, por el mismo camino del historial.

**Alternativas descartadas:**

- Pedir dos Esc (uno sale de pantalla completa, otro cierra) — confuso con el control remoto.

**Consecuencias:** la pantalla completa real no se puede probar con teclas simuladas; se verificó la
lógica forzando el estado.

## Búsqueda con el teclado del sistema

**Contexto:** la maqueta tenía un teclado en pantalla propio.

**Decisión:** un `<input>` nativo; en Android TV abre el teclado del sistema, con voz y su propio
manejo con el control.

**Alternativas descartadas:**

- Teclado en pantalla propio — más código y un teclado peor que el del sistema.

**Consecuencias:** en el navegador de escritorio se escribe con el teclado físico.
