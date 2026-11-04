# Marca Nodo aplicada a la app y al APK

**Rama:** `feat/brand-nodo`
**Tipo:** `feat(brand)`

## Qué cambió

La app pasa a llamarse **Nodo** y adopta la identidad elegida (dirección "B · Punto"): fondo
negro de pantalla, texto hueso, un único acento rojo y la tipografía Schibsted Grotesk. El riel
muestra el símbolo de la marca, la pestaña del navegador lleva el nombre y el favicon, y el APK
aparece en Android TV como "Nodo" con su banner, su ícono adaptable y la pantalla de inicio nueva.

## Por qué

El dueño descartó la primera identidad ("Perilla") por verse genérica y eligió el nombre Nodo con
la dirección B · Punto ("me gusta"). Después pidió aplicarla en una rama aparte: "podes aplicar todo
el diseño en otra rama?".

## Alcance

Adentro:

- Tokens de la interfaz (`styles/tokens.css`) con la paleta y la tipografía de la marca.
- Estilos sin colores sueltos fuera de los tokens, y el símbolo del riel.
- Nombre, favicon y fuentes en `index.html`; el paso de copia a `www/` incluye `assets/`.
- Android: nombre, banner de TV, ícono adaptable, íconos para Android 7, pantallas de inicio.
- La carpeta `design/brand/` con el manual, los logos y los tokens propuestos.

Afuera:

- No cambia ningún comportamiento ni texto de la interfaz salvo el nombre.
- Los focos de los mosaicos siguen con los tonos actuales; el manual propone otro tono que
  coincide con uno ya usado en la grilla.
- Los registros de `docs/changes/` anteriores mencionan el diseño viejo y no se reescriben.
- El nombre no está verificado en el registro de marcas (INPI).

## Historial de cambios

### 2026-11-04 — feat(brand)

- Marca Nodo aplicada a la web y al proyecto Android; archivos de marca en `design/brand/`.

### 2026-11-04 — fix(ui)

- El dueño vio todo muy grande, en el monitor y en la tele ("todos los iconos, las navbar lateral,
  los textos, los veo todos muy grandes"; "ojo, en tele tambien lo veo grande"). La letra base
  crecía con el ancho de la ventana hasta 24 px. Ahora el navegador usa 16 px fijos y la escala de
  tele (unos 14 px en un deco 1080p) se activa solo en el APK o en navegadores de TV. Los márgenes
  de seguridad, el riel, el menú de categorías y el nombre del canal se ajustaron igual.
