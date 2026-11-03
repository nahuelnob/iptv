# Feature: ui-mosaico — apply design option C (header 2, side rail) to the real app

Objective: replace the current rows UI with the approved "Mosaico del Living" design, header variant 2 (side rail), in Argentine Spanish.
Branch: `feat/ui-mosaico` · Delivery: `ask-on-risk` · Test runner: `node --test` (node:test, no dependencies)

## Specs

- **S1** Apply the approved design. User: "me gusta la c, pero trabajemosla un poco mas, sobre todo el header"; later, with a screenshot of header variant 2: "Tema diseño, me gusta la C, pero hay que corregir un espacio en blanco que queda a la izquiera de los iconos"; then "che, en cuanto al diseño, ya esta ok, lo queres aplicar y subir?". Source of truth: `design/options/option-c-header-2.html` (rail gap already fixed there) and `design/PLAN.md` sections 2, 3, 4, 9. Assumption: header variant 2 is the chosen one (the user's screenshots and fix request were about it).
- **S2** Spanish UI. User: "cosas que quiero si o si, que este en castellano, es una app para argentina". Every user-facing string comes from `design/PLAN.md` section 5 "Textos de la interfaz" (Argentine Spanish, voseo, professional). `<html lang="es-AR">`. Code identifiers and comments stay in English.
- **S3** Spanish categories. User: "asi que no quiero cateogrias como music, sports, etc". Already done in `src/domain/playlist.js`; must keep working.
- **S4** Features shown in the approved mockup: favorites and "Seguir viendo" (last watched), search by channel name, category drawer, playlist source view ("Lista"), empty/loading/error states. Favorites and last watched are keyed by stream URL, not by `ch-${index}` (PLAN section 6).
- **S5** Remote control rules from PLAN section 3: D-pad focus movement, ◀ from the first tile column opens the drawer, Back order (close panel → header/drawer to grid → section to Inicio → category to Todos), ▲/▼ switch channel while watching, Back closes the player (keep the existing history-based Back in `src/ui/player.js`).
- **S6** Publish. User: "lo queres aplicar y subir?". Commit with the user's commit skill (message approved by the user), push, and update GitHub Pages (`main`).

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1 S2 S3 S5 | delegated (context backstop: parent session is long) | done | monogram RED→GREEN; drawer feedback (L5) applied and checked |
| T2 | S4 | delegated, same writer, after T1 | done | library tests RED→GREEN (4) |
| T3 | S4 | delegated, same writer, after T2 | done | search tests RED→GREEN (2) |
| T4 | S4 S5 | delegated, same writer, after T3 | done | zapping tests RED→GREEN (2); player feedback (L4) applied |
| T5 | S6 | inline (parent) | in progress | `node --test` 27/27; parent spot check passed; independent verifier running (Risk item 4) |

- T1: shell from the mockup (rail, breadcrumb, clock, list context, focused-channel info, tile grid with the PLAN section 4 monogram rule, category drawer), "Lista" view with URL/file loading, empty/loading/error states, all texts in Spanish.
- T2: favorites (add/remove from the player and from a tile) and "Seguir viendo", persisted in localStorage keyed by stream URL, with pure-logic tests.
- T3: search view filtering by channel name (accent-insensitive), with tests for the matching rule.
- T4: player restyle per mockup, ▲/▼ channel switching through the current filtered list, neighbor strip; keep hls.js-first, YouTube embed, dev-proxy retry and history Back.
- T5: review in the browser, full test suite, commit(s) with approval, merge to `main`, push, verify Pages.

## Log

- **L1** (2026-11-03) User: "che, en cuanto al diseño, ya esta ok, lo queres aplicar y subir?"
- **L2** (2026-11-03) Earlier constraints carried in: "que este en castellano, es una app para argentina"; "no quiero cateogrias como music, sports, etc"; "vamos solo por la APK" (the web build is not adapted for HTTP-only channels).
- **L3** (2026-11-03) Branch `feat/ui-mosaico` created from `50b13b9`. `design/` (plan + mockups) still uncommitted; it goes in with this feature.
- **L4** (2026-11-03) User, on the player: "perfecto, 2 cosas que necesito, 1, cada vez que abro, si tiene que abrir en pantalla completa y no me gusta como esta y/o donde esta lo de agregar a favoritos". Sent to the T4 writer: real fullscreen on open (exit on close, leaving fullscreen closes the player), favorites as a star toggle in the top title instead of a bottom-bar button, remove native video controls that overlapped the strip, auto-hide the strip.
- **L5** (2026-11-03) User, on the category drawer: "otra cosa, que no me gusta es esto: no me gusta como esta estructurada, otra vez tiene espacio en blanco al pedo y creo que esta mal el volver". Sent to the writer (T1): drawer as the expanded rail (vertical section list aligned with rail icons), no space reserved by empty overflow cues, rail inset instead of full safe margin, remove the "▶ o Volver: cerrar" hint, verify Back/▶ close without changing the filter and restore focus.
- **L6** (2026-11-03) Writer finished T1–T4 (27/27 tests). Decisions taken by the writer: ▲/▼ keep switching channel in the player, so the favorite star is reached with ◀ from "Volver" (L4 asked for ▲, which conflicts with S5); the saved list loads on start (PLAN §1). Deliberate gaps: no on-screen keyboard, no exit dialog, no "En vivo" label. Real fullscreen could not be verified with synthetic input. Writer added a 600 ms fallback close for a missing history event it could not explain.
- **L7** (2026-11-03) Parent spot check: close via button, Esc and history.back() all close the player with nothing playing and no leftover history state; 4 open/close cycles keep history.length constant. Risk: item 4 (async ordering of history/popstate, fallback timer, zapping debounce) → independent verifier launched.
- **L8** (2026-11-03) Verifier: no blockers; probes 1–4 PASS (close paths, fast reopen, drawer Back order with one guard entry, ▼▼▼ loads only the final channel), the 600 ms fallback cannot double-close or pop extra history. Two advisories fixed by the parent: a late `fullscreenchange` from the previous close could close a quickly reopened player (now `hide()` drops fullscreen ownership and a reopen during a pending exit re-requests fullscreen), and the back guard was not re-synced after a drop popstate. Re-checked by simulation: reopened player stays open; leaving fullscreen still closes once. `node --test` 27/27. Real fullscreen and the physical remote remain unverified.
