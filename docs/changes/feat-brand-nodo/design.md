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
