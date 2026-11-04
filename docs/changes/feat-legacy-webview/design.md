# Decisiones técnicas

Feature: [`odd/tasks/legacy-webview.md`](../../../odd/tasks/legacy-webview.md), que cubre el qué, el por qué
y el alcance. Acá queda solo lo que un lector futuro cuestionaría.

## Sin pantalla completa de elemento en la app de Android

**Contexto:** al abrir un canal con el control remoto (un gesto real del usuario), el
`requestFullscreen()` del player se acepta. Dentro del WebView de Capacitor eso abre una
"custom view" nativa: en Chrome 66 (deco Claro B866V2) el renderer crashea y la página
queda en `about:blank` mientras ExoPlayer sigue con el audio; en WebViews más nuevos esa
vista tapa el video nativo. Abierto por software, el pedido se rechaza y todo funciona, lo
que ocultó el problema en las pruebas automatizadas.

**Decisión:** en la app de Android, `enterFullscreen()` no hace nada. La Activity ya ocupa
toda la pantalla, así que el elemento fullscreen no aportaba nada ahí.

**Alternativas descartadas:**

- Manejar la custom view en `BridgeWebChromeClient.onShowCustomView` (ubicarla, hacerla
  transparente): más código nativo para sostener un modo que la app no necesita, y no
  evita el crash del renderer en Chrome 66.
- Pedir fullscreen solo cuando falla el video nativo: el player web sigue usándolo en el
  navegador, que es el único lugar donde tiene sentido.

**Consecuencias:** en el navegador nada cambia. En la app, el `fullscreenchange` nunca
llega, así que los caminos `fullscreenOwned` y `reenterFullscreen` quedan inactivos ahí.

## Un build con esbuild, publicado por GitHub Actions

**Contexto:** el deco Claro B866V2 trae Chrome 66 y no puede actualizarlo. Ahí `?.` y `??`
son errores de sintaxis, faltan APIs (`replaceChildren`, `matchAll`, `globalThis`, …) y
CSS como `gap` en flex, `inset`, `clamp()` y `aspect-ratio`. Pages servía los archivos
crudos de `main`.

**Decisión:** el código fuente sigue siendo moderno y corre tal cual con `npm start`.
`scripts/build-web.mjs` genera `site/` con esbuild (`target: chrome66`), `src/polyfills.js`
cubre las APIs y un bloque al final de `styles/app.css` cubre el CSS que no se puede
bajar (`gap` en flex se detecta con una medición en `index.html`, porque `@supports`
responde por el `gap` de grid). Un workflow publica `site/` en Pages en cada push a
`main`, después de correr los tests.

**Alternativas descartadas:**

- Escribir el código sin `?.`/`??` y sin CSS moderno: degrada todo el proyecto por un
  dispositivo, y se vuelve a romper con el primer olvido.
- Babel + core-js: más dependencias y configuración para el mismo resultado; esbuild ya
  baja la sintaxis y el CSS, y los polyfills que hacen falta son cinco funciones.
- Dar por perdido el deco: era uno de los dos televisores del usuario.

**Consecuencias:** el sitio publicado ya no es el código fuente: para reproducir un
problema de Pages hay que usar `npm run serve:site`. La publicación depende de que los
tests pasen en el workflow.
