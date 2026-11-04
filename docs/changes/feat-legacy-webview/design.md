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
