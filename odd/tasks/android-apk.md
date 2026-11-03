# Feature: android-apk — package the web app as an Android TV APK with Capacitor

Objective: build an installable APK that shows on the Android TV home screen and plays HTTP and CORS-blocked channels.
Branch: `feat/android-apk` · Delivery: `ask-on-risk` · Test runner: `node --test` (web logic); Gradle `assembleDebug` (APK)

## Specs

- **S1** Start the Android path. User: "bueno... cerremos, pusheemos y empecemos con lo de android"; earlier: "dale, probamos el camino 1 pero siempre mirando al objetivo del camino 2".
- **S2** HTTP channels must play in the app. User, on "This channel streams over plain HTTP, which browsers block on HTTPS pages.": "perdon, esto es lo que quiero corregir"; then "vamos solo por la APK". Needs `usesCleartextTraffic`.
- **S3** The app appears in the Android TV launcher (LEANBACK_LAUNCHER + banner) and works with the remote, without a touchscreen.
- **S4** Install target: the user's deco via Downloader (may be blocked by the operator) or the Android TV emulator (Television 1080p, API 36, x86_64).

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S1 | inline | done | Capacitor 8.5.3 + @capacitor/app 8.1.2 (exact), `www/` copy step, `npx cap add android` |
| T2 | S2 S3 | inline | done | manifest: cleartext, LEANBACK_LAUNCHER (confirmed in `dumpsys package`), placeholder banner, touchscreen not required |
| T3 | S1 | inline | done | `assembleDebug` OK with Microsoft OpenJDK 21 (`app-debug.apk`, 4.1 MB) |
| T4 | S2 S4 | inline | in progress | emulator Android 16 / WebView 143: list loads, TN (YouTube) and Canal 26 (HLS) play fullscreen; remote Back and focus fixed; HTTP-only legit channel and launcher banner still to check |

## Log

- **L1** (2026-11-03) User: "bueno... cerremos, pusheemos y empecemos con lo de android".
- **L2** (2026-11-03) Capacitor 8.5.3 needs Java 21 and AGP 8.13 (`@capacitor/android/capacitor/build.gradle`). Android Studio ships OpenJDK 25; whether Gradle 8.x runs on it is to be checked at build time, not assumed.
- **L3** (2026-11-03) T1–T2 done: Capacitor 8.5.3 installed (exact), `scripts/build-www.mjs` copies index.html/src/styles to `www/`, `npx cap add android` OK, manifest has cleartext, LEANBACK_LAUNCHER, placeholder banner, touchscreen/leanback not required, `allowMixedContent` in capacitor.config.json. T3 first build FAILED: Gradle wrapper 8.14.3 cannot run on Android Studio's OpenJDK 25 ("Unsupported class file major version 69"). Proposed fix: install Microsoft OpenJDK 21 (matches Capacitor's Java 21 target) and use it only for builds.
- **L4** (2026-11-03) With JDK 21 the APK builds. Emulator findings, each reproduced before fixing:
  1. Remote Back closed the whole app: without `@capacitor/app` nothing maps Back to WebView history. Added the plugin.
  2. With the plugin and no JS listener, Back at the first history entry does nothing (`AppPlugin.java:48-58`), so the app could not be left. Added `src/infra/native-back.js`: `history.back()` while `canGoBack`, else `exitApp()`.
  3. YouTube channels needed two Backs: setting `src` on an already-loaded iframe added joint history entries (history.length 4 instead of 2). The player now inserts a fresh iframe per channel and removes it on close.
  4. Focus was lost to `<body>` when the WebView entered/left fullscreen (after our focus() calls), so arrows went to the header. The player now restores focus after `fullscreenchange` (Volver on enter, the intended tile on exit; `afterPlayer` returns that tile).
  Verified in the emulator with the real remote keys: OK plays, Back closes the player with focus on the channel's tile, ▶ moves to the next tile, Back again exits to the launcher. `node --test` 27/27. Fixes 3 and 4 also apply to the web build.
