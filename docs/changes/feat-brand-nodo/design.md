# Decisiones técnicas

## El símbolo del riel va sobre una placa clara

**Contexto:** el símbolo es un cuadrado negro; sobre el fondo oscuro de la app su borde mide
alrededor de 1,02:1 y desaparece.

**Decisión:** sobre fondos oscuros el símbolo va sobre una placa hueso, como indica el manual de
marca para cuando el borde del cuadrado tiene que verse.

**Alternativas descartadas:**

- Aclarar el cuadrado solo en la app — crea una variante del símbolo que el manual no define.
- Un borde fino alrededor — a distancia de sillón no se lee.

**Consecuencias:** el riel tiene un único elemento claro arriba, que funciona como firma.

## El rojo nunca como texto fuera del negro de pantalla

**Contexto:** el rojo de la marca solo alcanza 4,5:1 como texto sobre `#0E0E0E`; sobre las
superficies un poco más claras no llega.

**Decisión:** el rojo queda para el anillo de foco, el relleno del botón principal (con texto
negro) y la estrella de favoritos; "Seguir viendo" pasa a texto claro.

**Alternativas descartadas:**

- Un rojo más claro para texto — sería un segundo rojo y la marca define uno solo.

**Consecuencias:** el rojo conserva un solo significado visual: lo activo.

## Fondos semitransparentes con `rgb()` y no con `color-mix()`

**Contexto:** el diseño usaba fondos semitransparentes escritos a mano con los colores viejos.

**Decisión:** tokens nuevos con `rgb(... / alfa)` sobre los neutros de la marca.

**Alternativas descartadas:**

- `color-mix()` — WebViews viejas de Android TV pueden no soportarlo.

**Consecuencias:** si cambia un neutro, hay que actualizar también esos tres tokens.

## Escala de tele por tipo de dispositivo, no por ancho de ventana

**Contexto:** el tamaño base se calculaba con el ancho (`0.75vw`), pensando que 1920 px era una
tele. Un deco 1080p con densidad 2 informa 960 px, y un monitor informa 1920: el monitor terminaba
con la letra más grande que la tele.

**Decisión:** 16 px fijos por defecto y una clase `tv` en `<html>`, puesta por un script en el
`<head>` antes de los estilos cuando la página corre en el APK (Capacitor) o en un navegador de TV.
Con esa clase la letra base queda cerca de 14 px en un deco 1080p y crecen los márgenes de
seguridad, el riel y los renglones del menú (48 px para el control remoto).

**Alternativas descartadas:**

- Seguir escalando por ancho con otros números — el ancho no dice a qué distancia está la persona.
- Detectar la tele por `devicePixelRatio` — monitores y notebooks también tienen densidad 2.

**Consecuencias:** un navegador de TV que no se identifique como tal se ve con la escala de
navegador; el APK siempre usa la escala de tele.
