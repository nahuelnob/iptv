# El video carga recién cuando su superficie existe

**Rama:** `fix/android-surface-before-load`
**Tipo:** `fix(android)`

## Qué cambió

Al abrir un canal, la app Android primero hace visible la vista del video, espera a que su superficie
de dibujo exista (la revisa cada 16 ms, hasta 1 s como máximo) y recién entonces empieza a cargar y
decodificar el canal. Antes empezaba a cargar y después hacía visible la vista. La versión pasa a 0.2.3.

## Por qué

En el deco Flow con Android 11 algunos canales arrancan con la imagen verde y llena de líneas de
colores, y se arreglan cambiando de canal y volviendo. La foto del dueño muestra que es la salida del
decodificador de video. La causa probable: con `TextureView`, la superficie se crea recién cuando la
vista se hace visible, y el decodificador se configuraba antes de tenerla. Al volver al canal, la
superficie ya existe y arranca bien.

## Alcance

- Si llega otro canal, un `stop()` o Android cierra la app mientras se espera la superficie, esa espera
  se cancela y no carga nada.
- No se probó en ningún deco: el de Flow no permite adb y el B866V2 no estaba conectado al publicar.
  Lo confirma el dueño en el deco Flow con la versión 0.2.3; si el verde sigue, la causa es otra y el
  paso siguiente es mostrar los datos del decodificador en las opciones de desarrollador.

## Historial de cambios

### 2026-11-05 — fix(android)

- La carga del canal espera a que exista la superficie del video; versión 0.2.3.
