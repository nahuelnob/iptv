# Decisiones técnicas

Solo las decisiones no obvias: las que un lector futuro cuestionaría sin este
documento. Si no descartaste una alternativa razonable, no hace falta este archivo.

## Detectar "audio sin imagen" con `BUFFER_CODECS`

**Contexto:** cuando un TS trae video MPEG-2, hls.js descarta esa pista y reproduce
solo el audio, sin emitir `ERROR`. Hacía falta una señal para avisarle al usuario.

**Decisión:** escuchar `Hls.Events.BUFFER_CODECS` y marcar el intento como
`noPicture` cuando los tracks no incluyen `video` ni `audiovideo`. Se verificó con
hls.js 1.7.3: el stream MPEG-2 de Telefe produce solo `audio`, y uno H.264
(Telefe Buenos Aires) produce `audio` y `video`.

**Alternativas descartadas:**

- Revisar `video.videoWidth === 0` en el evento `playing`: con solo audio, el
  elemento puede quedar en `readyState 1`, `playing` no vuelve a dispararse y el
  aviso queda tapado por "Cargando…".
- Leer `CODECS=` del manifiesto: muchas listas no lo declaran (Telefe no lo hace).

**Consecuencias:** solo cubre la ruta de hls.js. En la reproducción nativa de un
`<video>` no hay aviso. Una radio (solo audio) también muestra el aviso, que en ese
caso es exacto.

## No leer `#EXTVLCOPT` (User-Agent y Referer de la lista)

**Contexto:** la hipótesis era que el 403 de Cartoon Network se debía a cabeceras
que la lista indica y el parser ignora.

**Decisión:** no implementarlo por ahora.

**Alternativas descartadas:**

- Parsear `http-user-agent` y `http-referrer` y reenviarlos en los proxies: se
  probaron los 18 canales de `ar.m3u` con y sin esas cabeceras, y todos respondieron
  igual. No arreglaría ninguno.

**Consecuencias:** si aparece una lista donde esas cabeceras sí cambian el resultado,
hay que retomar esta decisión.
