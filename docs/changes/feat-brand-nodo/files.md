# Archivos tocados

Desglose por archivo de lo que hizo **este cambio**.

## `styles/tokens.css`

**Cambio:** modificado

Reemplaza la paleta cálida con acento verde azulado por la de Nodo: neutros fríos sobre
`#0E0E0E`, texto `#F5F4F0`, acento `#E8381E`, Schibsted Grotesk y radios más chicos. Agrega
`--scrim`, `--overlay-pill` y `--overlay-strip` para los fondos semitransparentes que antes
estaban escritos a mano.

## `styles/app.css`

**Cambio:** modificado

Los fondos semitransparentes y los pesos de letra pasan a usar tokens. El símbolo del riel va sobre
una placa clara. El rótulo "Seguir viendo" deja de ser rojo.

## `index.html`

**Cambio:** modificado

Carga Schibsted Grotesk, título "Nodo", favicon y el símbolo de la marca en el riel.

## `assets/favicon.svg`

**Cambio:** añadido

Copia del favicon de la marca, servido por la web y copiado al APK.

## `scripts/build-www.mjs`

**Cambio:** modificado

Copia también `assets/` a `www/`, para que el favicon llegue al APK.

## `capacitor.config.json` y `android/app/src/main/res/values/strings.xml`

**Cambio:** modificado

Nombre de la app: "Nodo". El `applicationId` no cambia.

## `android/app/src/main/res/drawable/banner.xml`

**Cambio:** modificado

El banner provisorio pasa a ser el logo de Nodo como vector (320×180).

## Ícono de la app (`mipmap-anydpi-v26/`, `drawable*/ic_launcher_*.xml`, `values/ic_launcher_background.xml`, `mipmap-*/ic_launcher*.png`)

**Cambio:** modificado

Ícono adaptable en vectores (frente y fondo) y PNG regenerados para Android 7.

## Pantallas de inicio (`drawable*/splash.png`, `values/styles.xml`)

**Cambio:** modificado

Logo claro sobre negro de pantalla; en Android 12+ el fondo del splash del sistema es `#0E0E0E`.

## `android/app/src/main/AndroidManifest.xml`

**Cambio:** modificado

Solo el comentario del banner, que decía que era provisorio.

## `design/brand/`

**Cambio:** añadido

Manual de marca, logos en SVG, recursos para Android, tokens propuestos, el generador de la
geometría del logo y los archivos de la identidad descartada en `_archive/perilla/`.
