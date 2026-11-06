# IPTV Player

A web IPTV player for M3U playlists, designed for keyboard and TV-remote (D-pad) navigation from the start, so it can later be packaged for TV boxes.

## Run

```bash
npm start   # http://localhost:5173
npm test    # domain tests (node:test, no dependencies)
```

`npm start` serves the source as-is, which needs a current browser. The published site is a build
(`npm run build:web` → `site/`, served with `npm run serve:site`): esbuild lowers the JavaScript
and CSS for old Android TV WebViews (Chrome 66), `src/polyfills.js` covers the missing APIs, and
the "Old TV WebViews" block at the end of `styles/app.css` covers what cannot be lowered.

The app opens on the owner's own list (`playlists/mi-lista.m3u`, below) and has no way to change it
in sight. Changing the list is a developer option: in the side menu, while on Inicio, press OK seven
times in a row on **Inicio** (from the fourth press a notice counts down). That brings back **Lista**,
where you paste a playlist URL or open an `.m3u` file to try another list until the app restarts: it
always starts on the own list. With the options on, the player also shows a video diagnostics panel
(app and Android version, decoder, format, first-frame time, dropped frames) and a button to try the
other video surface (TextureView or SurfaceView), which stays chosen on that device. The same gesture
hides Lista and the panel again and goes back to the own list.
Use only playlists you have the right to watch. The interface is in Argentine Spanish.

Remote / keyboard: arrows move, OK (Enter) plays, ◀ from the first column opens the menu and categories,
Back (Esc) undoes one step (menu → header → section → category). While watching, the channel column
lists the channels you came from: ▲ ▼ move a cursor without leaving the channel on screen and OK
switches to it, while CH+ CH- (PageUp PageDown on a keyboard) switch directly. Holding OK on a channel (or pressing F) adds or removes a favorite.

Argentine free-to-air channels, curated by Free-TV (no pay channels):
`https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_argentina.m3u8`

A larger list by iptv-org also includes some pay channels; skip those:
`https://iptv-org.github.io/iptv/countries/ar.m3u`

The owner's own list, 71 channels picked by hand from that iptv-org list (copy of 2026-11-05), each
entry kept exactly as the source wrote it; it is published with the site:
`https://nahuelnob.github.io/iptv/playlists/mi-lista.m3u` (`playlists/mi-lista.m3u` in this repository).

YouTube channels play through YouTube's official embed. Channels listed by name
(`/c/name`, `/user/name`, `/@handle`) need their channel ID in `src/data/youtube-channels.js`.

## Structure

| Path | Role |
|------|------|
| `src/domain/playlist.js` | Pure M3U parsing and category grouping. No DOM, tested in Node. |
| `src/domain/library.js` | Favorites and last watched, keyed by stream URL. |
| `src/domain/search.js` | Channel search ignoring case and accents. |
| `src/domain/zapping.js` | Channel above/below and the neighbor strip while watching. |
| `src/domain/reconnect.js` | When a dropped stream is started over: 1, 3, 6 and 10 s waits, one retry if it never played. |
| `src/domain/monogram.js` | Channel initials shown when there is no logo. |
| `src/infra/playlist-source.js` | Loading playlists from a URL (15 s timeout) or a local file. |
| `src/infra/library-store.js` | Saving the library in `localStorage`, tolerant of storage errors. |
| `src/ui/spatial-nav.js` | Arrow-key focus movement between `[data-nav]` elements, scopes and zones. |
| `src/ui/back-stack.js` | Back for the browse layer through history, so the TV Back key works. |
| `src/ui/section-nav.js` | Side rail, breadcrumb and the menu/categories drawer. |
| `src/ui/tiles.js` | Channel tiles of the mosaic (presentational). |
| `src/domain/logo-url.js` | Asks Wikimedia for logo thumbnails at the size on screen (other hosts keep their URL). |
| `src/ui/logo-image.js` | Logos for the grid and the player column: loaded only near the screen, monogram until they paint. |
| `src/ui/player.js` | Full-screen player: hls.js, native HLS fallback, YouTube embed, channel column, quiet loading. |
| `src/infra/hls-loader.js` | Loads hls.js on demand: browsers only, the Android app plays in ExoPlayer. |
| `src/sw/` | Service worker and its routing rules (see "Offline cache" below). |
| `src/domain/app-version.js` | Release tag → Android version code, and whether a release is newer. |
| `src/infra/app-update.js` | Android app: asks GitHub for the latest release and installs it. |
| `src/ui/update-prompt.js` | Android app: the "new version" dialog. |
| `src/main.js` | Wires everything together. |

## Android TV app

The APK is a shell around the site GitHub Pages publishes from `main`
(`capacitor.config.json` → `server.url`), plus native plugins: ExoPlayer playback (`NativeVideoPlugin`)
and in-app updates (`AppUpdatePlugin`). Without internet it shows the bundled `offline.html`.

Install it once (Downloader, or any browser on the TV) from the latest release:
`https://github.com/nahuelnob/iptv/releases/latest/download/nodo.apk`

After that:

- **Web changes** (`index.html`, `src/`, `styles/`): push to `main`. The Pages workflow
  (`.github/workflows/pages.yml`) runs the tests, builds the site and publishes it; the TV downloads
  it the next time the app starts and shows it on the start after that (see "Offline cache"; GitHub
  Pages also caches for up to ~10 minutes).
- **Native changes** (`android/`, Capacitor plugins or config): bump `version` in `package.json`,
  commit and push `main`, then run `npm run release:android -- --notes "What changed"`. It builds
  the signed APK and publishes the `v<version>` GitHub release. On its next start the app offers the
  update; the user confirms it in Android's installer (the first time, Android also asks to allow
  Nodo to install apps).

Releases are signed with the release key: `android/keystore.properties` (gitignored) points at the
keystore outside the repo. **Back up both.** Android only installs an update signed with the same
key, so without them the app has to be uninstalled and installed again. `--dry-run` builds the APK
into `dist/` without publishing.

Playback in the app: ExoPlayer starts a channel with 1 s buffered and resumes after a stall with 2 s
(its defaults are 2.5 s and 5 s), like VLC-based IPTV apps. While a channel reconnects, its last
frame stays on screen. Loading never brings the controls back: a small ring shows in the corner when
it lasts more than 0.7 s, and a message appears only from the third reconnect try or on an error.

### Offline cache

The published site registers a service worker (`src/sw/`, built into `site/sw.js`; never on
localhost, so `npm start` always serves the source). The page itself comes from the network first,
because inside the app Capacitor injects its bridge (`window.Capacitor`, which turns on ExoPlayer)
into the HTML it proxies; the cached page answers only offline. The scripts, styles and the playlist
answer from the device at once and refresh in the background, so **a deploy shows up on the launch
after the one that downloaded it**. Google Fonts and hls.js are cached once; logos go to their own
cache (300 entries) and survive deploys. Streams, proxies and the update check are never touched.
Every build stamps `sw.js` with a hash of the site, so any change installs a new worker and clears
the old caches.

## Known browser limits

Many streams play on a TV box app but not in a browser:

- **CORS**: hls.js downloads segments with `fetch`, so the stream server must send `Access-Control-Allow-Origin`.
- **Mixed content**: an HTTPS page cannot load `http://` streams.
- **Headers**: `#EXTVLCOPT` referrer/user-agent options are ignored; browsers do not let pages set them.

### Dev proxy

`npm start` also serves `/proxy?url=…`, which fetches a stream from Node (not subject to CORS)
and rewrites HLS playlists so every segment goes through it too. When a playlist or a channel
fails in the browser, the app retries through the proxy automatically, only if the proxy exists.

It is a development tool: the server listens on `127.0.0.1` only, refuses cross-site requests
and private-network targets, and is not part of any production build. Streams use your bandwidth.
