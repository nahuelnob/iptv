# Lista propia por defecto y "Lista" como opción de desarrollador

**Rama:** `feat/own-playlist`
**Tipo:** `feat(playlist)`

## Qué cambió

La app abre siempre con la lista propia (`playlists/mi-lista.m3u`, 71 canales elegidos a mano de la
lista de iptv-org Argentina), publicada junto con el sitio. La sección "Lista", donde se cambia de
lista, queda escondida: aparece recién al apretar OK siete veces seguidas sobre "Inicio" en el menú
lateral, al estilo de las opciones de desarrollador de Android. El mismo gesto la vuelve a esconder.

## Por qué

El dueño quiere que la tele arranque con su lista sin tener que cargarla, y que nadie la cambie por
accidente desde el control remoto.

## Alcance

- Con las opciones apagadas se ignora cualquier URL guardada antes, así ninguna tele queda atada a una
  lista vieja. Con las opciones prendidas vuelve el comportamiento anterior: arranca con la última
  lista que funcionó.
- Desde el cuarto OK un aviso cuenta cuántos faltan; una pausa de más de 1,5 s reinicia la cuenta.
- La lista propia nunca se guarda como "última lista", para no pisar la que elija un desarrollador.
- Las listas del propio servidor se piden directo, sin el proxy de Cloudflare (en desarrollo son
  `http://localhost`, que el proxy no alcanza).
- Afuera: la parte nativa no cambia. Pendiente: probarlo en el deco.

## Historial de cambios

### 2026-11-05 — feat(playlist)

- Lista propia de 71 canales publicada con el sitio y cargada por defecto.
- "Lista" escondida detrás de siete OK en "Inicio".
