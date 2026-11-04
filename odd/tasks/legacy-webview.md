# Feature: legacy-webview — run the app on Android TV boxes with Chrome 66 WebViews

Objective: the Claro B866V2 deco (Android 9, WebView 66, not updatable) runs Nodo; then the black-video problem is diagnosed there.
Branch: `feat/legacy-webview` (from `main` at `ee62bea`) · Delivery: `ask-on-risk` · Test runner: `node --test`; build checked on the B866V2 over adb (authorized: logs and installs)

## Specs

- **S1** User: "Mi idea hagamos que sea compatible con el deco que ya te conectaste por adb y una vez que sea compatible, diagnosticas ahi". The app must start and be usable on the B866V2 (Chrome 66 / V8 6.6).
- **S2** After S1, diagnose on the B866V2 why channels play sound over a black screen (the other deco shows the same with 0.2.1's TextureView and cannot be connected).
- **S3** Assumption: modern browsers keep the current behavior and `npm start` keeps serving the source without a build.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1 S3 | inline | pending | `scripts/build-web.mjs`: esbuild bundles `src/main.js` and the CSS for `chrome66` into `site/`; `src/polyfills.js` |
| T2 | S1 S3 | inline | pending | CSS fallbacks for what esbuild cannot lower: flex `gap`, `clamp()`/`min()`/`max()`, `aspect-ratio`, `:focus-visible` |
| T3 | S1 | inline | done (uncommitted) | the chrome66 build served from this PC (`adb reverse tcp:5199`) runs on the B866V2: no JS errors, grid, drawer, focus ring and list load (217 channels) verified with screenshots |
| T4 | S2 | inline | done (uncommitted) | root cause found and fixed in `src/ui/player.js` (`enterFullscreen` is a no-op in the Android app); verified with the real remote: OK → picture, Back → grid, OK → picture, ▼ → next channel with picture, no crash |
| T5 | S1 | inline | pending | GitHub Pages serves the built site (GitHub Actions); needs the user's OK to switch the Pages source |

## Log

- **L1** (2026-11-04) User: "sigo escuchando el sonido, pero sin ver el video y se actualizo correctamente, pero no puedo conectar a este deco por adb. Mi idea hagamos que sea compatible con el deco que ya te conectaste por adb y una vez que sea compatible, diagnosticas ahi". Earlier: "tengo 2 decos".
- **L2** (2026-11-04) Feature probe on the B866V2 (CSS.supports and a flex probe): supported: `gap` (grid), `grid-gap`, `rgb(r g b / a)`, `place-items`, `object-fit`. Missing: flex `gap`, `inset`, `clamp()`, `min()`, `aspect-ratio`, `Element.replaceChildren`, `Element.toggleAttribute`, `String.matchAll`, `globalThis`, `queueMicrotask`, `AbortSignal.timeout`, `Object.fromEntries`. Optional chaining and `??` are syntax errors there (`main.js` 68:29).
- **L3** (2026-11-04) Black-with-sound diagnosed on the B866V2. A channel opened by a synthetic click showed picture; opened with the real OK key the page became `about:blank` (the WebView renderer died) while ExoPlayer, which is native, kept playing the audio. The difference: a real key press is a user gesture, so `requestFullscreen()` in `player.open()` succeeds; in the Capacitor app that opens a native "custom view" and the old WebView's renderer crashes on it (newer WebViews instead cover the native video with it). Fix: `enterFullscreen()` returns at once in the Android app, which already fills the screen. The user confirmed on the TV: "parece andar, elegi un canal y se ve".
- **L4** (2026-11-04) Still open on the B866V2: the renderer sometimes crashes ~3 s after the grid shows (two launches in a row aborted with SIGABRT after "Renderer process crash", the third survived). Suspect: memory pressure from 217 remote logos (several 960 px wikimedia files) in a 32-bit renderer. Tooling notes: `adb reverse` is lost whenever the deco reconnects; the devtools socket is `webview_devtools_remote_<pid>`; helper `tv.sh` in the scratchpad.
