# Feature: android-native-player — play streams with ExoPlayer on Android so device decoders show MPEG-2/HEVC video

Objective: in the Android app, channels that play audio without picture in the WebView (MPEG-2, HEVC in TS) show their picture, keeping the current web player UI.
Branch: `feat/android-native-player` (from `fix/player-diagnostics`) · Delivery: `ask-on-risk` · Test runner: `node --test` (web logic); Gradle `assembleDebug` + Android TV emulator (native playback)

## Specs

- **S1** Channels with audio and no picture show their picture in the Android TV app. User: "y podes arreglar los que tienen audio y no imagen?", then chose "Android TV / box". Known cases in `ar.m3u`: Telefe (1080p) and Cartoon Network Latin America South Atlantic (1080p) send MPEG-2 video; Plim Plim (1080p) sends HEVC inside TS, which hls.js 1.7.3 drops.
- **S2** The player UI keeps working on top of native playback: title, favorite, neighbor strip, ▲/▼ zapping, Volver and the remote's Back.
- **S3** The browser build behaves as before (hls.js / `<video>`, Cloudflare and local proxies).
- **S4** Assumption: if native playback fails, the player says why (HTTP code when there is one) like the web path does. Native requests go out from the device itself, so they need no proxy.
- **S5** Assumption: if the device has no decoder for the video track, the existing "Se escucha el audio pero no hay imagen…" notice shows.
- **S6** In the Android app, playlists load with Capacitor's native HTTP client instead of the Cloudflare proxy. User asked "el proxy de cloudflare por el que psaba, sigue haciendo falta o lo elimino?", then "me conviene eso?" and "Yes, do it". The Worker stays for the web version.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1 S4 S5 | inline | done (uncommitted) | `NativeVideoPlugin` (Media3 1.11.1 ExoPlayer + PlayerView under a transparent WebView), events to JS, rejoin on network errors |
| T2 | S2 S3 S4 S5 | inline | done (uncommitted) | `src/infra/native-video.js`; `player.js` `playNative`; CSS `html[data-native-video]`; transparent `<video>` poster; `node --test` 27/27 |
| T3 | S1 S2 S4 | inline | done with limits | emulator: Telefe and Cartoon South Atlantic (MPEG-2) show picture under the overlay (screenshots), Plim Plim (HEVC) plays with a video track, ▼ zapping, Back to the tile, 403 text. Telefe Buenos Aires (1080i H.264) stays loading in the emulator; real-device check pending. Commit `fe4a4c8` |
| T4 | S6 | inline | done (uncommitted) | `loadFromUrl` uses `CapacitorHttp.get` on Android. RED 4/4 then GREEN 5/5 in `test/playlist-source.test.js`, suite 32/32. Emulator: `http://10.0.2.2:8099/ar.m3u` without CORS headers loaded 217 channels, request from `Dalvik/2.1.0` |

Route evidence: one understood change across Java, JS and CSS; no parallel units and no context backstop, so no writer is delegated.

## Log

- **L1** (2026-11-04) User: "y podes arreglar los que tienen audio y no imagen?" → asked where they watch → "Android TV / box". Earlier in the session: "tenemos que hacer que se vea toda la lista de canales, sea como sea".
- **L2** (2026-11-04) Evidence before starting: TS PMT of Telefe (1080p) = `0x02` MPEG-2 video + `0x03` MP2 audio; Plim Plim = HEVC + AAC. In the desktop WebView `MediaSource.isTypeSupported(hvc1)` is true, but hls.js `BUFFER_CODECS` reports only `audio` for both. Chromium has no MPEG-2 decoder. Capacitor's `BridgeWebChromeClient.onShowCustomView` immediately hides the custom view, so element fullscreen does not cover a native view placed under the WebView. Media3 latest stable: 1.11.1.
- **L3** (2026-11-04) Emulator Television_1080p (Android 16) has `c2.android.mpeg2.decoder` and HEVC decoders. Gradle needs `ANDROID_HOME` (no `local.properties`) and JDK 21. Host-GPU screenshots come out black; `-gpu swiftshader_indirect` makes them work but then `c2.goldfish.*` decoders hang, so visual checks used swiftshader and HEVC/H.264 checks used host GPU with plugin events and logcat.
- **L4** (2026-11-04) Bug found in the emulator: Telefe stopped after ~7 s with `HttpDataSourceException` in `skipFully` (a segment cut short, read as position out of range). ExoPlayer's default load policy does not retry that, unlike hls.js. Fix: re-prepare at the live edge up to 3 consecutive times on network errors (not on 4xx), reset when playback resumes. Afterwards Telefe played 60 s without error.
- **L5** (2026-11-04) Telefe Buenos Aires: SPS `frame_mbs_only_flag=0`, 1080i H.264 High@4.0. The emulator decoders allocate but never output; desktop Chrome also raised decode errors on it. Interlaced broadcast is usually decoded in hardware on TV boxes; not verifiable here. The player shows "Cargando…" indefinitely in that case (no stall timeout): candidate follow-up.
- **L6** (2026-11-04) Android's WebView drew its gray play icon on the empty `<video>` after a failure; a 1×1 transparent `poster` removes it.
- **L7** (2026-11-04) User: "che, el proxy de cloudflare por el que psaba, sigue haciendo falta o lo elimino?" → "me conviene eso?" → "Yes, do it". `CapacitorHttp` ships in Capacitor core and is always registered (`Bridge.java:663`); its timeout rejects with code `SocketTimeoutException`. The global fetch patch (`CapacitorHttp.enabled`) was not used because the patched fetch ignores `AbortSignal` (no `signal` handling in `native-bridge.js`).
