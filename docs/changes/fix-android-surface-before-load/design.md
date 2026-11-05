# Decisiones técnicas

Solo las decisiones no obvias: las que un lector futuro cuestionaría sin este
documento. Si no descartaste una alternativa razonable, no hace falta este archivo.

## Esperar la superficie con un sondeo corto

**Contexto:** la carga del canal tiene que empezar cuando la superficie del video ya existe. La vista
de Media3 (`PlayerView`) registra su propio listener en el `TextureView` para entregarle la superficie
al reproductor.

**Decisión:** revisar `isAvailable()` (o que la superficie del `SurfaceView` sea válida) cada 16 ms,
con un tope de 1 s después del cual carga igual, y cancelar la espera con un contador que suben
`play()`, `stop()` y el cierre de la app.

**Descartado:**
- Poner un `SurfaceTextureListener` propio: reemplazaría el de `PlayerView` y el reproductor dejaría de
  recibir la superficie.
- Pasar ese deco a `SurfaceView`: tiene el mismo problema de orden (su superficie también se crea al
  hacerse visible) y en el B866V2 `SurfaceView` daba pantalla negra.
- Reabrir el primer canal automáticamente después de arrancar, imitando el cambio de canal: esconde el
  síntoma en el primer canal y no en los siguientes.
