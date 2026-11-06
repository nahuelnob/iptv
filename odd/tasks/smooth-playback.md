# Feature: smooth-playback — quiet loading, frozen last frame, cached app and faster logos

Objective: starting or recovering a channel is barely noticed (like cgplus), the app opens and moves faster on the TV box, and the player's channel column shows logos.
Branch: `feat/smooth-playback` (from `main` at `0820730`) · Delivery: `ask-on-risk` · Test runner: `node --test`; Android build with Gradle; browser checks on `npm start` / `npm run serve:site`

## Specs

- **S1** User: "cuando arranca el canal, inlcuso en la reconexion, que no se si la hay, no se nota, en nuestro caso, abrimos el panel de canales y ponemos cargando". Loading, buffering and reconnecting must not bring back the title, column and actions, nor keep them on screen; a small indicator shows only when loading lasts. Final errors still show the controls and the message.
- **S2** User: "vamos a hacer las 2 partes, total no hay nadie usandola, es solo para mi esta apk, asi que tranqui con eso". In the Android app the last picture stays frozen while a channel reconnects (no black screen), and ExoPlayer starts with about 1 s buffered, like cgplus's VLC (`--network-caching=1500`, `--live-caching=1000`). Needs a new APK.
- **S3** User: "Ademas mira lo de service-worker si te parece y todo lo que se pueda optimizar optimicemoslo". A service worker serves the app, the list and the logos from the device and refreshes them in the background; plus the measurable optimizations found: logos load only when visible (Chrome 66 ignores `loading="lazy"`), logos are requested small (Wikimedia and imgur sizes), and the Android app does not download hls.js.
- **S4** User: "en el listado de canales, no se ven los logos, osea cuando elijo el canal, en el listado ese no hay logos". The player's channel column shows each channel's logo, with the monogram as fallback.
- **S5** Assumption: modern browsers keep working, `npm start` serves the source without a service worker (localhost), and the web player keeps using hls.js.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1 | inline | pending | |
| T2 | S3 S4 | inline | pending | |
| T3 | S3 S5 | delegated (Writer trigger a: parallel with T1/T2, disjoint surface: service worker, build, registration) | pending | |
| T4 | S2 | inline | pending | |
| T5 | S3 S5 | inline | pending | |
| T6 | S1–S5 | inline | pending | |

- T1: quiet loading in `src/ui/player.js` + `styles/app.css` (+ indicator markup).
- T2: logo helper (small sizes, lazy load with IntersectionObserver) shared by the grid tiles and the player column.
- T3: service worker (stale-while-revalidate for the app and the list, cache-first for logos and fonts, never streams or the update check), versioned per build.
- T4: Java: reconnect without stop (keep content on reset) and a ~1 s start buffer; JS reconnect path for the native player.
- T5: load hls.js only when the web player needs it.
- T6: tests, build, browser checks, docs, APK build and delivery decision.

## Log

- **L1** (2026-11-06) User: "cuando arranca el canal, inlcuso en la reconexion, que no se si la hay, no se nota, en nuestro caso, abrimos el panel de canales y ponemos cargando" — then: "vamos a hacer las 2 partes, total no hay nadie usandola, es solo para mi esta apk, asi que tranqui con eso. Ademas mira lo de service-worker si te parece y todo lo que se pueda optimizar optimicemoslo. Otra cosa mas, en el listado de canales, no se ven los logos, osea cuando elijo el canal, en el listado ese no hay logos".
- **L2** (2026-11-06) Evidence: cgplus.apk = Jetpack Compose UI + libVLC with `--network-caching=1500`, `--live-caching=1000`, `--clock-jitter=0`, `--http-reconnect`. Nodo: `setStatus()` always calls `wake()`; `rest()` refuses to hide while a status shows; reconnect calls `native.stop()` (stop + clearMediaItems + view GONE → black); no `LoadControl` (ExoPlayer default 2.5 s / 5 s); `img.loading='lazy'` is ignored by Chrome 66; logos: 52 upload.wikimedia.org, 32 i.imgur.com of 93 channels; Google Fonts and hls.js are fetched on every launch.
