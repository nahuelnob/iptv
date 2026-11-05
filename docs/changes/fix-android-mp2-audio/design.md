# Decisiones técnicas

Solo las decisiones no obvias: las que un lector futuro cuestionaría sin este
documento. Si no descartaste una alternativa razonable, no hace falta este archivo.

## Extensión FFmpeg precompilada de Jellyfin, versión 1.9.0, sobre Media3 1.11.1

**Contexto:** Media3 no publica su extensión FFmpeg compilada; hay que compilar FFmpeg con el NDK o
usar una compilación de terceros. La más usada es la de Jellyfin en Maven Central
(`org.jellyfin.media3:media3-ffmpeg-decoder`), cuya última versión es 1.9.0+1, mientras la app usa
Media3 1.11.1.

**Decisión:** usar la de Jellyfin 1.9.0+1 con Media3 1.11.1 y el modo
`EXTENSION_RENDERER_MODE_ON` (la extensión después de los decodificadores del equipo). Se verificó en
el deco: el renderizador carga sin errores de enlace y decodifica MP2.

**Descartado:**
- Compilar la extensión para 1.11.1: exige el NDK y compilar FFmpeg; mucho trabajo para el mismo
  resultado mientras la de 1.9 funcione.
- Bajar Media3 a 1.9.0 para alinear versiones: arriesga lo que ya anda en el deco (la superficie de
  video, el arreglo de pantalla negra) sin necesidad.
- `EXTENSION_RENDERER_MODE_PREFER`: haría que FFmpeg decodifique también lo que el equipo ya resuelve
  por hardware, con más consumo de CPU.

**Si se actualiza Media3:** volver a probar un canal MP2 en el deco; si Jellyfin publica una versión
que coincida, alinearla.
