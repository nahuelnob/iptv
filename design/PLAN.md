# Reproductor IPTV: plan de interfaz

Modo: **autoría**. No hay una fuente de diseño de un diseñador. `styles/tokens.css` es código del propio equipo (Technical Mono, solo oscuro), así que cada opción puede conservarlo, evolucionarlo o reemplazarlo. La polaridad no cambia: las tres opciones son solo oscuras, como la app actual.

**Idioma**: toda la interfaz está en español de Argentina, con registro profesional y voseo cuando se le habla al usuario ("Buscá un canal", "Reintentar"). Los comentarios y los identificadores del código siguen en inglés. Las maquetas usan `<html lang="es-AR">`.

Maquetas: `design/options/index.html` (abrir en `http://localhost:5173/design/options/`). Cada opción acepta enlaces directos como `option-b.html#player`, `#search`, `#favorites`, `#empty`, `#loading`, `#error` y `#settings`.

## 1. Objetivos

1. **Ver un canal en dos pulsaciones**: al abrir la app, un canal se reproduce con, como mucho, un movimiento y OK (primero el último visto o los favoritos).
2. **Pensado para el control remoto**: todo funciona con flechas, OK y Volver. Nada depende del mouse ni del hover.
3. **Legible desde el sillón**: se lee bien a 1920×1080 a unos 3 m, se puede usar a 1280×720 y en un teléfono pasa a una sola columna razonable.
4. **Liviano**: sin frameworks, sin paso de build y sin imágenes de portada. Las iniciales del canal son el visual por defecto, no un plan B.
5. **Honesto con los datos**: las listas no traen guía de programación (EPG) y muchos logos faltan o están rotos. La interfaz no inventa ninguna de las dos cosas.

## 2. Arquitectura de información

| Pantalla | Para qué sirve | Se llega desde | Contenido | Estados |
|---|---|---|---|---|
| Inicio | Seguir viendo o elegir un canal | Al abrir; Volver desde cualquier sección | Último visto / seguir viendo, favoritos y después las categorías | cargando (esqueleto), vacío (todavía no hay lista), error |
| Categoría | Todos los canales de un grupo | Navegación de secciones (A: título de fila o pestaña; B: columna izquierda; C: chip) | Una lista o una grilla | categoría vacía |
| Buscar | Encontrar un canal por nombre | Navegación de secciones | Campo (teclado del sistema en la TV, o teclado en pantalla en C) y resultados en vivo con la coincidencia subrayada | sin texto, sin coincidencias |
| Favoritos | Lista corta personal | Navegación de secciones; además encabeza Inicio | Favoritos en el orden en que se agregaron | vacío (qué son y cómo agregar uno) |
| Reproductor | Ver y cambiar de canal | OK sobre cualquier canal | Video, barra de información con datos del canal, cambio de canal ▲ ▼, botón de favorito, Volver | cargando la señal, error de señal, aviso de Solo Argentina u Horario parcial, video de YouTube |
| Lista de canales (ajustes) | Cambiar la fuente | Navegación de secciones | Fuente actual y fecha, campo de URL, Abrir archivo, Volver a cargar, URL recientes | cargando, error con forma de recuperarse, "no se encontraron canales" |

**Modelo de navegación.** Hay dos capas.

- **Capa de exploración**: un selector de secciones y una zona de contenido. El selector son pestañas en A, una columna izquierda en B y chips en C.
- **Capa del reproductor**: un ámbito de foco modal por encima. La navegación espacial nunca sale de ese ámbito; `[data-nav-scope]` ya lo hace.

Cada pantalla recuerda su último elemento con foco, así que Volver desde el reproductor deja el foco en la misma tarjeta desde la que se abrió.

## 3. Reglas de interacción

| Tecla | Capa de exploración | Capa del reproductor |
|---|---|---|
| Flechas | Movimiento geométrico del foco (`src/ui/spatial-nav.js`, sin cambios). En los campos de texto, ◀ ▶ mueven el cursor y ▲ ▼ salen del campo. | ▲ ▼ cambian de canal. ◀ ▶ se mueven entre los botones de la barra. Si la barra está oculta, la primera tecla solo la muestra. |
| OK (Enter) | Activa el elemento con foco; sobre un canal, lo reproduce. | Activa el botón con foco. |
| Volver (Esc, GoBack, 461, 10009) | Búsqueda con texto: primero lo borra. Cualquier sección: va a Inicio. Inicio: no hace nada (en la versión de TV, pregunta "¿Salir de IPTV?"). | Cierra el reproductor y devuelve el foco a la tarjeta de origen. |
| Teclas CH+ / CH- | — | Igual que ▲ ▼. |
| OK sostenido (≥ 600 ms) sobre un canal, o `F` en teclado | Agrega o quita de favoritos (atajo; el camino principal es el botón del reproductor). | — |

**Cambio de canal ▲ ▼.**

- ▲ va al canal que está *arriba* del actual y ▼ al de *abajo*, dentro de la lista desde la que se abrió: la categoría, favoritos, resultados de búsqueda o todos los canales. La lista es circular.
- Esto coincide con lo que muestran B y C en pantalla. Si se prefiere la convención de la TV abierta (▲ es el número siguiente), alcanza con invertir un signo; la barra siempre indica qué canal hay arriba y abajo, así que cualquiera de las dos queda clara.
- El cambio de canal espera unos 400 ms antes de cargar la señal, así que mantener ▼ apretado recorre la barra sin arrancar diez transmisiones.
- La barra se oculta a los 4 s. Los canales Solo Argentina y Horario parcial muestran un aviso con la salida ("Presioná ▼ para pasar al canal siguiente").

**Foco para uso a distancia.**

- Estilar `[data-nav]:focus`, no solo `:focus-visible`. Con el control remoto el foco *es* el cursor, y el foco asignado por código al cargar siempre tiene que verse.
- El foco combina un borde de 3–4 px, un cambio de superficie y una escala de 1,06–1,08 (solo A y C). Con movimiento reducido se quita la escala y quedan el borde y la superficie.
- `scrollIntoView({ block: 'nearest' })` mantiene el elemento con foco dentro del área segura. Las filas usan `scroll-padding-inline` igual al margen del área segura.

## 4. Reglas comunes (todas las opciones)

- **Área segura**: `--safe-x: clamp(16px, 5vw, 96px)`, `--safe-y: clamp(12px, 4.5vh, 54px)`, que cubre el overscan de los televisores.
- **Tipografía**: tamaño raíz `clamp(16px, 0.75vw + 10px, 24px)` (24 px a 1080p), escala de razón 1,25. **La información nunca baja de 0,8rem** (~19 px en TV). 0,64rem queda solo para ayudas. Hoy los datos de las tarjetas usan `--text-2xs` (0,64rem) y tienen que subir.
- **Español ocupa más lugar**: los textos son entre un 15 % y un 30 % más largos que en inglés. Los botones no tienen ancho fijo y los nombres largos se cortan con puntos suspensivos, nunca en dos líneas dentro de una tarjeta.
- **Áreas táctiles**: 48 px como mínimo en elementos interactivos (44 px es el piso).
- **Contraste**: todos los pares de texto se verificaron en ≥ 4,5:1. Los más bajos son el texto atenuado de B sobre la fila seleccionada (4,97:1) y el texto atenuado de C sobre el mosaico B (4,98:1). Los indicadores de foco tienen ≥ 6:1 contra su superficie.
- **Movimiento**: solo `transform` y `opacity`, de 120 a 320 ms, `cubic-bezier(0.2, 0, 0, 1)`. Todas las opciones tienen la rama `prefers-reduced-motion`.
- **El significado nunca depende solo del color**: Solo Argentina y Horario parcial son palabras, la categoría seleccionada lleva una barra y negrita, y las coincidencias de búsqueda se subrayan.
- **Hora**: formato de 24 horas (`es-AR`, `hour12: false`), por ejemplo 21:04.
- **Iniciales del canal**: la regla actual da una sola letra para DeporTV, C5N, LN+ y Cine.AR. Las maquetas usan esta regla:
  - nombres de hasta 4 caracteres van completos (`C5N`, `LN+`);
  - una sola palabra con 2 o más mayúsculas usa esas mayúsculas (`DeporTV` → `DTV`);
  - si no, una palabra da sus dos primeras letras (`Pakapaka` → `PA`);
  - una sigla inicial de 2–3 letras se mantiene (`TN Todo Noticias` → `TN`);
  - si no, las iniciales de las dos primeras palabras, con los números completos (`Canal 26` → `C26`).

## 5. Textos de la interfaz

Textos de referencia para traducir la app real de forma consistente. Voseo cuando se le habla al usuario; sustantivos y verbos en infinitivo en botones y títulos.

**Navegación y secciones**

| Clave sugerida | Texto |
|---|---|
| `nav.home` | Inicio |
| `nav.search` | Buscar |
| `nav.favorites` | Favoritos |
| `nav.categories` | Categorías |
| `nav.playlist` | Lista |
| `nav.allChannels` | Todos los canales |
| `home.lastWatched` | Último canal visto · hace {tiempo} |
| `home.continue` | Seguir viendo |
| `common.channelCount` | {n} canales |

**Categorías** (traducción de los `group-title` habituales; si no hay equivalente, se muestra el nombre original)

| Grupo en la lista (ejemplos) | Texto |
|---|---|
| News | Noticias |
| Sports | Deportes |
| Kids, Children | Infantiles |
| Music | Música |
| Movies, Cinema | Cine |
| Culture, Education, Documentary | Cultura |
| General, Entertainment | General |
| Other, sin grupo (`OTHER_GROUP`) | Otros |

**Etiquetas de canal**

| Dato | Texto |
|---|---|
| `quality` 1080p / 720p / sd | 1080p · 720p · SD |
| URL de YouTube | YouTube |
| `geoBlocked` | Solo Argentina |
| `unstable` | Horario parcial |
| Último visto (en la lista) | Último visto |
| Marca de favorito | Favorito |

**Botones**

| Texto | Dónde |
|---|---|
| Agregar a favoritos / Quitar de favoritos | Reproductor, Inicio |
| Volver a los canales | Reproductor (A) |
| Volver a la guía | Reproductor (B) |
| Volver | Reproductor (C) |
| Explorar canales / Ver todos los canales | Favoritos vacío |
| Cargar lista | Lista de canales |
| Abrir archivo | Lista de canales |
| Volver a cargar | Lista de canales |
| Reintentar | Error |
| Cambiar lista | Error |
| Usar la lista guardada | Error |
| Espacio / Borrar | Teclado en pantalla (C) |

**Búsqueda**

| Estado | Texto |
|---|---|
| Campo (texto de ayuda / etiqueta accesible) | Buscá un canal / Nombre del canal |
| Sin texto | Escribí parte del nombre de un canal. En el televisor se abre el teclado del sistema. |
| Con resultados | {n} de {total} canales coinciden con "{texto}". Bajá con ▼ para ver los resultados. |
| Sin coincidencias | Ningún canal coincide con "{texto}". Revisá cómo lo escribiste o probá con otra parte del nombre. |

**Vacío, carga y error**

| Estado | Título | Texto |
|---|---|---|
| Sin lista (primer uso) | Cargá una lista para empezar a mirar | Pegá la URL de una lista M3U o abrí un archivo `.m3u` de este dispositivo. Usá solo listas que tengas derecho a ver: canales públicos, de aire o un servicio que pagues. |
| Favoritos vacío | Todavía no tenés favoritos | Sirven para tener a mano los canales que más mirás. Abrí cualquier canal y elegí **Agregar a favoritos**. |
| Cargando | Cargando {archivo}… | (esqueleto con la forma de la pantalla, sin spinner) |
| Error de red | No se pudo cargar la lista | {servidor} no respondió en 15 segundos. Revisá la dirección o tu conexión y volvé a intentar. La última lista que funcionó sigue guardada. |
| Lista sin canales | No se encontraron canales | Revisá que el archivo sea una lista M3U. |
| Lista cargada | {n} canales cargados. | — |

**Reproductor**

| Situación | Texto |
|---|---|
| Indicador | En vivo |
| Cargando la señal | Conectando con {canal}… |
| Solo Argentina | Solo Argentina: esta señal se puede ver únicamente desde Argentina. Presioná ▼ para pasar al canal siguiente. |
| Horario parcial | Horario parcial: puede que este canal no esté transmitiendo ahora. Presioná ▼ para pasar al canal siguiente. |
| La señal no carga | No se pudo reproducir {canal}. La señal no responde o el navegador no la admite. Presioná ▼ para pasar al canal siguiente. |
| Ayuda de teclas | ▲ ▼ cambiar de canal · Volver cerrar el reproductor |
| Salir (versión TV) | ¿Salir de IPTV? · Salir · Cancelar |

## 6. Cambios que necesita la app real (no se hicieron acá)

1. **Identidad estable de los canales.** El `id` es `ch-${index}` (`src/domain/playlist.js`), así que cambia cada vez que cambia la lista. Favoritos y último visto se tienen que guardar por `url` (o por `tvgId || name` como respaldo) en `localStorage`.
2. **Interfaz en español**: pasar los textos de `index.html`, `src/main.js` y `src/ui/*.js` a los de la sección 5, poner `lang="es-AR"`, traducir `OTHER_GROUP` ('Other' → 'Otros') al mostrarlo y agregar la tabla de categorías de la sección 5 en la capa de UI (el dominio sigue usando el nombre original del grupo).
3. **Estilos de foco**: cambiar `.card:focus-visible` por `:focus` en los elementos `[data-nav]` (ver la sección 3).
4. **Iniciales**: actualizar `renderMonogram` en `src/ui/channel-rows.js` con la regla de la sección 4.
5. **Fuentes en los TV box**: Google Fonts suma 2 pedidos y unos 40–60 KB. Conviene alojar dos pesos WOFF2 propios, o usar las fuentes del sistema en B y C si los equipos son lentos.
6. **Listas grandes**: las listas de iptv-org llegan a cientos de canales. Usar `content-visibility: auto` en filas o secciones (A, C), o renderizar solo unos 30 elementos alrededor del foco (B).
7. **Pila de Volver**: una pila simple de pantallas (`inicio → sección → reproductor`) para que Volver se comporte como en la tabla de la sección 3.

## 7. Hoja de ruta incremental

Cada paso se entrega solo y la app sigue funcionando.

1. Tokens y estructura de la opción elegida: selector de secciones, área segura, reglas de foco, regla de iniciales, textos en español.
2. Almacenamiento: favoritos y último visto, guardados por URL. Agregar "Seguir viendo" en Inicio y la sección de favoritos.
3. Barra del reproductor: datos del canal, cambio ▲ ▼ con espera, botón de favorito, avisos de Solo Argentina y Horario parcial.
4. Búsqueda (por nombre, sin distinguir mayúsculas ni tildes; C ya lo hace).
5. Navegación por categorías (filas, columna o chips según la opción).
6. Pantalla de lista: sacar el formulario de la barra superior, agregar URL recientes y Volver a cargar.
7. Estados: esqueleto de carga, error con acciones para recuperarse, favoritos vacío, búsqueda sin coincidencias.
8. Prueba en TV: un Android TV box a 1280×720 y 1920×1080 con un control real, y ajuste de escala y tiempos.

## 8. Las tres opciones

| | A: Al Aire | B: Guía de Canales | C: Mosaico del Living |
|---|---|---|---|
| Dirección | Technical Mono (evolución de los tokens actuales), ámbar | Swiss Grid adaptado a oscuro; rojo de señal solo para EN VIVO y la acción principal | Soft Tactile, oscuro cálido, verde azulado |
| Modelo de Inicio | Franja de "seguir viendo" + filas horizontales por categoría | 3 columnas: secciones y categorías / lista de canales / vista previa | Chips + "línea de información" + una sola grilla de mosaicos |
| Toma de | Filas de Netflix, franja destacada, escala de foco de Android TV, barra de los decodificadores | Guía en lista de Pluto TV y el cable, navegación lateral de Android TV, panel de vista previa de Apple TV | Mosaicos de los launchers de Android TV y Apple TV, chips de YouTube TV, teclado en pantalla de las apps de TV |
| Lo distinto | Franja destacada solo con texto (sin imágenes), canales numerados, datos en monoespaciada | Sin grilla horaria falsa; la misma guía entra al reproductor para cambiar de canal | Sin desplazamiento horizontal; el nombre con foco va en grande arriba de la grilla, no en el mosaico |
| Costo de render | Bajo (tarjetas de texto); con muchas filas necesita `content-visibility` | El más bajo (filas de texto, fáciles de virtualizar) | Bajo (grilla CSS de mosaicos) |
| Uso con control remoto | Bueno. Filas largas (40+ canales) exigen muchas pulsaciones laterales. | El mejor. ▲ ▼ recorre listas de cualquier tamaño, ◀ cambia de categoría y el cambio de canal sigue la lista. | Bueno. La grilla llega rápido a elementos lejanos y el teclado en pantalla evita los teclados del sistema poco confiables. Con seis categorías, la fila de chips se desplaza a 1280×720. |
| Teléfono | Las filas se siguen desplazando de costado; funciona | Pasa a una columna con una tira de categorías | Grilla de 2 columnas; teclado nativo |
| Esfuerzo en JS sin frameworks | **Bajo**: se conservan las filas, la navegación espacial y los tokens; se agregan la franja, la barra del reproductor y las pestañas | **Medio**: nueva estructura de 3 columnas, vista previa enlazada al foco y guía dentro del reproductor | **Medio-alto**: grilla y chips son simples; el teclado en pantalla y la línea de información suman código |
| Riesgo principal | Parece una "pared de pósters sin pósters" cuando faltan los logos | La menos parecida a Netflix; más densa | Los mosaicos de iniciales se repiten (Telefe y Telemax son `TE`; el nombre abajo los distingue) |

### Recomendación: B, Guía de Canales

1. **El contenido son canales en vivo, no un catálogo.** No hay imágenes de portada ni EPG, y faltan muchos logos. Las filas y los mosaicos están hechos para mostrar imágenes; una lista muestra lo que estos datos sí tienen: número, nombre, calidad y estado.
2. **Un solo modelo para explorar y para mirar.** ▲ ▼ recorre la lista en la guía y cambia de canal en el reproductor sobre esa misma lista. ◀ siempre lleva a categorías, favoritos y búsqueda. Es el modelo más fácil de aprender con un control remoto.
3. **Escala bien.** Una lista de 300 canales de iptv-org sigue siendo una sola lista vertical, sin filas de 40 pulsaciones al costado, y es trivial renderizar solo lo visible en equipos lentos.
4. **Es la más liviana al ejecutarse**: filas de texto, sin transformaciones en el foco y una sola familia tipográfica.

La contra: B es la que más se aleja del código actual y la que menos se parece a Netflix. Si pesa más la sensación de Netflix que la velocidad para cambiar de canal, **A** es el camino más barato porque conserva las filas y la navegación espacial de hoy. Conviene no mezclar las dos: elegir una sola estructura.

**Decisión del dueño: Opción C (Mosaico del Living).** El resto del trabajo refina C; el primer paso es su header (sección 9).

## 9. Header de la opción C

**Problema del header original.**

- Una sola fila de chips mezclaba navegación (Buscar, Favoritos, Lista) con filtros (Todos, General, Noticias…) y no se sabía dónde estaba uno.
- A 1280×720 se cortaba ("Deportes"), y una lista real de iptv-org trae unas 21 categorías.
- La marca era débil y no había hora ni contexto de la lista.

**Lo que comparten las tres variantes.**

- Marca con ícono (TV) y "IPTV" en 1,563rem. Reloj de 24 h y contexto ("ar.m3u · 15 canales").
- La sección activa y la categoría activa se ven sin depender del color: barra, inversión y negrita.
- Al pasar de una zona a otra con el control, el foco cae en el elemento actual (sección activa, categoría activa o último mosaico), no en el más cercano.
- Volver, en orden: cierra el panel abierto → del header vuelve a la grilla → de otra sección vuelve a Inicio → con una categoría elegida vuelve a "Todos".
- Cada maqueta arranca con la lista de 21 categorías. La tecla 9 alterna con la de 6, y `#home+corta` abre la corta.

**Las tres variantes**

| | 1: Dos niveles | 2: Riel lateral | 3: Selector |
|---|---|---|---|
| Archivo | `option-c-header-1.html` | `option-c-header-2.html` | `option-c-header-3.html` |
| Navegación | Pestañas de texto con barra debajo de la activa | Riel de íconos siempre visible (activa invertida) + ruta "Inicio › Noticias" arriba | Control segmentado (activa invertida) |
| Filtros | Tira de chips con cantidad, debajo de una línea y la etiqueta "Categorías" | Lista vertical dentro de un panel que se abre con ◀ | Botón "Categoría · 21 / Noticias ▾" que abre una página con todas en grilla |
| Cómo separa navegación y filtros | Nivel distinto, forma distinta (pestaña vs. píldora), línea + etiqueta | Bloque 2×2 con íconos arriba, lista con cantidades debajo de "Categorías" | Forma distinta (pista redonda vs. campo rectangular con chevrón) y lo que hace OK (ir vs. elegir) |
| 21 categorías | Se desplaza; desvanecido en el borde con contadores "◀ 15" / "1 más ▶" | Se desplaza en vertical; 13 visibles a 1080p, 7 a 720p, contadores "▲/▼ n más" | Todas visibles de una vez (5 columnas a 1080p, 4 a 720p); nada se corta |
| Pulsaciones hasta la última categoría ("Otros") desde la grilla | ▲ + 21 ▶ + OK = 23 | ◀ + 21 ▼ + OK = 23 | ▲ + OK + 4–5 ▼ + 1 ▶ + OK ≈ 9 |
| Espacio para la grilla (inicio de los mosaicos) | El que más ocupa: ~390 px a 1080p, ~340 px a 720p | ~290 px a 1080p, ~240 px a 720p; el riel resta ~130 px de ancho | ~295 px a 1080p, ~245 px a 720p |
| Categorías a la vista sin abrir nada | Sí, unas 8–9 | No (solo la activa, en la ruta) | No (solo la activa, en el botón) |
| Esfuerzo en JS sin frameworks | **Bajo-medio**: tira, centrado de la activa y contadores de borde | **Medio**: panel modal, foco que entra y sale, contadores verticales, versión de teléfono distinta | **Bajo**: un botón y una página modal que reutiliza la navegación espacial; sin cálculos de desplazamiento |

### Recomendación: Header 3, Selector

1. **Escala sin límite y sin cortes.** 21 o 60 categorías solo suman filas en una grilla; nunca hay una tira que se corta ni una lista de 4 elementos visibles.
2. **Es el más rápido con el control remoto** para listas largas: cualquier categoría queda a menos de 10 pulsaciones, porque la grilla se recorre en dos ejes; en las otras dos se recorre en uno.
3. **Deja más lugar a la grilla**: el header es una sola fila, lo que más pesa a 1280×720, donde la variante 1 deja ver solo unas dos filas de mosaicos.
4. **Separa con claridad** navegación (dónde estoy) y filtro (qué estoy viendo), y el botón siempre muestra la categoría activa.
5. **Es el más simple de construir**: no necesita sincronizar desplazamientos ni contar elementos ocultos.

La contra: las categorías no están a la vista en Inicio, así que cambiar entre dos vecinas cuesta OK + elegir. Si el dueño cambia seguido entre dos o tres categorías (por ejemplo Noticias y General), conviene sumar al selector una fila "Recientes" con las últimas 3 elegidas. Si prefiere tenerlas siempre a la vista y la lista real tiene pocas categorías, **Header 1** es la alternativa.

**Antipatrones y accesibilidad de los headers.**

- **Bordes que se desvanecen** (Header 1 y 2): son una señal funcional de que hay más contenido de ese lado, siempre acompañada por un contador con número. No son un degradé decorativo.
- **Sombra** (Header 2): solo en el panel lateral, que flota sobre el contenido y se cierra. Header 3 no usa sombra: el selector es una página completa.
- **Contraste**: se corrigieron dos pares que no pasaban.
  - La cantidad sobre la categoría con foco en Header 2 estaba en 4,19:1; se pasó a `--n-5` (7,6:1).
  - El borde del botón Categoría en Header 3 estaba en 1,51:1; se pasó a `--n-4` (6,3:1, el mínimo para bordes de controles es 3:1).
- **Movimiento**: las animaciones de entrada del panel (Header 2) y del selector (Header 3) se quitan con movimiento reducido.

## 10. Control de antipatrones

| Control | A | B | C |
|---|---|---|---|
| Degradés decorativos, texto con degradé, glassmorphism | ninguno | ninguno | ninguno |
| Neutros con tinte, sin grises de framework, sin #000/#fff puros | pasa (tono ~215) | pasa (tono ~225) | pasa (tono ~60) |
| Un solo acento, < 5 % de la superficie | pasa (foco, acción principal, número en la barra) | pasa (punto EN VIVO, acción principal) | **en el límite**: el tinte del mosaico "Seguir viendo" ocupa cerca del 5 % a 1080p. Justificado: es el camino principal. Si se ve fuerte, pasarlo a `--n-2`. |
| Colores semánticos fijos | pasa | **anotado**: el rojo de error comparte familia con el acento. Justificado como un único color de alarma, siempre con texto y un bloque con borde. | pasa |
| Tipografía: tracking ajustado, contraste de peso, etiquetas espaciadas | pasa | pasa (una familia, Archivo; 400 contra 600) | pasa |
| Tarjetas en todo / sombra en contenido estático | pasa (sombra solo en la barra del reproductor) | pasa (cero sombras) | pasa: los mosaicos son las acciones, sin sombra; una sola sombra en la tira de zapping, que flota sobre el video y se oculta |
| Radio uniforme | pasa (2/4/6) | pasa (0/2/3) | pasa (10/16/24 según tamaño) |
| Hero centrado con píldora y dos botones | pasa (franja asimétrica, sin píldora) | no aplica | pasa (los chips son filtros, no un aviso) |
| Escala en bloques grandes | **justificado**: escala de foco (no de hover) en tarjetas chicas, la convención de las interfaces de TV; se quita con movimiento reducido | ninguna | **justificado**: igual, 1,08 en mosaicos y 1,04 en el mosaico ancho; se quita con movimiento reducido. El cursor que parpadea indica que se está escribiendo y también se quita. |
| Emoji como íconos | ninguno (▲ ▼ ◀ ▶ son caracteres que nombran teclas del control) | ninguno | ninguno |
| Texto de relleno | ninguno; nombres de canales reales y textos de vacío y error reales | ninguno | ninguno |
| Anulación de tema con `data-theme` | **omisión justificada**: el producto es solo oscuro por decisión, no hay tema claro al que cambiar | igual | igual |
| Rama de movimiento reducido | presente | presente | presente |

## 11. Accesibilidad

- **Contraste**: verificado numéricamente en cada par de texto y foco usado.
  - A: de 5,2 a 15,9:1; ámbar sobre casi negro 9,3:1; texto sobre ámbar 8,9:1.
  - B: de 4,97 a 16,6:1; fila de foco invertida 16,6:1; texto atenuado sobre la fila de foco 7,1:1.
  - C: de 4,98 a 16,3:1; borde verde azulado sobre los mosaicos 6,5:1; texto sobre verde azulado 9,1:1.
- **Foco**: bordes de 3 px o más, o inversión completa; siempre visible con el foco (no solo con `:focus-visible`) y nunca transmitido solo con color (A suma borde y escala, B invierte, C suma borde y escala).
- **Áreas táctiles**: pestañas, chips, botones, teclas y filas miden 48 px o más; tarjetas y mosaicos, mucho más.
- **Lectores de pantalla**: `lang="es-AR"` para que la voz pronuncie en español. Las iniciales tienen `aria-hidden` y el nombre del canal es el nombre accesible. El reproductor es un `role="dialog"` y los avisos usan `role="status"` o `role="alert"`.
- **Límites de las maquetas**: el video es simulado y el teclado en pantalla de C es una demostración; en el teléfono se reemplaza por el campo nativo.
