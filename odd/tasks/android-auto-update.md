# Feature: android-auto-update — the TV app picks up web deploys on its own and offers new APKs in-app

Objective: after one last manual install, the Android TV app never needs Downloader again: web changes arrive with each GitHub Pages deploy, and native changes arrive as an in-app APK update.
Branch: `feat/android-auto-update` (from `main` at `1a9baf8`) · Delivery: `ask-on-risk` · Test runner: `node --test` (web logic); Gradle `assembleRelease` + Android TV emulator (native)

## Specs

- **S1** User: "yo la tengo que volver a instalar en el tele desde el dowloader para aplicar los cambios, hagamos que despues de eso no haga falta descargarla de nuevo, que se actualice sola cuando deployemos". Chosen approach: "Ambas" (remote web now + APK self-update for native changes).
- **S2** Web changes: the APK loads `https://nahuelnob.github.io/iptv/` (Capacitor `server.url`), so a deploy to `main` reaches the TV on the next app start. Without network a local page explains it and offers to retry.
- **S3** Native changes: on start, the app compares the latest GitHub release with its own version code; when newer, a remote-friendly dialog offers to update, downloads the APK and opens Android's installer. Accepted cost (from the options shown): each update needs a confirm with the remote, the "install unknown apps" permission, and always the same signing key.
- **S4** Releases are signed with one release key kept outside the repo and published with a script; the version comes from `package.json`.
- **S5** Accepted cost: favorites and the saved list are lost once, because the page origin changes from `https://localhost` to `https://nahuelnob.github.io`.

## Tasks

| ID | Specs | Route | Status | Evidence |
|----|-------|-------|--------|----------|
| T1 | S2 S5 | inline | done (uncommitted) | `server.url` + `errorPath`, `offline.html`, `MainActivity` posts the offline navigation; `test/android-config.test.js` |
| T2 | S4 | inline | done (uncommitted) | Gradle version from `package.json` (0.2.0 → 200), release signing from gitignored `keystore.properties` (key at `~/.android/nodo-release.jks`), `scripts/release-android.mjs` (`--dry-run` OK, apksigner shows the release key) |
| T3 | S3 | inline | done (uncommitted) | `app-version.js` + `app-update.js`: RED then GREEN 10/10; `AppUpdatePlugin`; dialog; suite 44/44 |
| T4 | S1-S4 | inline | partial | emulator, signed release build against the dev server: remote page has NativeVideo/AppUpdate/App/CapacitorHttp, MPEG-2 channel plays, silent with no release, dialog + Back, permission → TV "Install unknown apps" screen, 404 download → message, offline page with DNS failure. Pending: a real install from a published release (needs merge + `v0.2.0`) |

Route evidence: one understood feature; no parallel units and no context backstop, so no writer is delegated. Risk: item 5 (delivery: signing, installer, release).

## Log

- **L1** (2026-11-04) User: "funciona, ahora lo que quiero es lo siguiente, yo la tengo que volver a instalar en el tele desde el dowloader para aplicar los cambios, hagamos que despues de eso no haga falta descargarla de nuevo, que se actualice sola cuando deployemos". Options shown: remote web (`server.url`) vs APK self-download; answer: "Ambas".
- **L2** (2026-11-04) Capacitor 8: `server.errorPath` loads `https://localhost/<path>` from the bundled assets when the main frame fails (`BridgeWebViewClient.onReceivedError`); the bridge script is injected for the origin of `server.url`, so plugins work on the remote page. `App.getInfo().build` is the version code as a string. The app's `FileProvider` already exposes `cache-path`. GitHub Pages serves with a 10-minute cache, so a deploy can take up to ~10 minutes to show.
- **L3** (2026-11-04) Bug found in the emulator: with no network, Capacitor's `onReceivedError` calls `loadUrl(errorPath)` but Chromium's error page wins (CDP showed `chrome-error://chromewebdata/`). Loading `https://localhost/offline.html` by hand worked, so the asset was fine. Fix: `MainActivity` sets a `BridgeWebViewClient` subclass that `post()`s the navigation; the offline page then showed with focus on "Reintentar". A closed port on the host hangs instead of failing (emulator NAT), so the offline test used an unresolvable `.invalid` host, the same failure a TV without internet gets.
- **L5** (2026-11-04) Independent verifier (Risk items 2 and 5): one blocker. With `shell: true` on Windows, `execFileSync` joins arguments unquoted, so `gh release create --title "Nodo 0.2.0"` split and `&` in notes ran as a command. Fixed: no shell except for `npx` and `gradlew.bat`. Advisories applied in the same batch: release URLs limited to `/nahuelnob/iptv/releases/download/` (parsed with `java.net.URL`, no port, user info or `..`), the downloaded APK must have this app's package name, every exception on the download thread rejects the call, the release refuses untracked files in what the APK ships and an existing remote tag. Recheck: arguments arrive intact (`["--title","Nodo 0.2.0","--notes","a & echo INJECTED"]`), the script stops on uncommitted files, the plugin returns INVALID_URL for another repo, `/raw/`, `..` and `http`, and DOWNLOAD_FAILED for a missing release of this repo. Suite 44/44.
- **L4** (2026-11-04) Release builds disable WebView debugging; test-only builds set `android.webContentsDebuggingEnabled` and a dev-server `server.url`, never committed. The emulator only reaches the host at `10.0.2.2`.
