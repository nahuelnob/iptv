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

Open **Lista** and paste a playlist URL or open an `.m3u` file; the last URL that worked loads on start.
Use only playlists you have the right to watch. The interface is in Argentine Spanish.

Remote / keyboard: arrows move, OK (Enter) plays, ◀ from the first column opens the menu and categories,
Back (Esc) undoes one step (menu → header → section → category). While watching, the channel column
lists the channels you came from: ▲ ▼ move a cursor without leaving the channel on screen and OK
switches to it, while CH+ CH- (PageUp PageDown on a keyboard) switch directly. Holding OK on a channel (or pressing F) adds or removes a favorite.

Argentine free-to-air channels, curated by Free-TV (no pay channels):
`https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_argentina.m3u8`

A larger list by iptv-org also includes some pay channels; skip those:
`https://iptv-org.github.io/iptv/countries/ar.m3u`

YouTube channels play through YouTube's official embed. Channels listed by name
(`/c/name`, `/user/name`, `/@handle`) need their channel ID in `src/data/youtube-channels.js`.

## Structure

| Path | Role |
|------|------|
| `src/domain/playlist.js` | Pure M3U parsing and category grouping. No DOM, tested in Node. |
| `src/domain/library.js` | Favorites and last watched, keyed by stream URL. |
| `src/domain/search.js` | Channel search ignoring case and accents. |
| `src/domain/zapping.js` | Channel above/below and the neighbor strip while watching. |
| `src/domain/monogram.js` | Channel initials shown when there is no logo. |
| `src/infra/playlist-source.js` | Loading playlists from a URL (15 s timeout) or a local file. |
| `src/infra/library-store.js` | Saving the library in `localStorage`, tolerant of storage errors. |
| `src/ui/spatial-nav.js` | Arrow-key focus movement between `[data-nav]` elements, scopes and zones. |
| `src/ui/back-stack.js` | Back for the browse layer through history, so the TV Back key works. |
| `src/ui/section-nav.js` | Side rail, breadcrumb and the menu/categories drawer. |
| `src/ui/tiles.js` | Channel tiles of the mosaic (presentational). |
| `src/ui/player.js` | Full-screen player: hls.js, native HLS fallback, YouTube embed, ▲ ▼ zapping. |
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
  (`.github/workflows/pages.yml`) runs the tests, builds the site and publishes it; the TV picks it
  up the next time the app starts (GitHub Pages caches for up to ~10 minutes).
- **Native changes** (`android/`, Capacitor plugins or config): bump `version` in `package.json`,
  commit and push `main`, then run `npm run release:android -- --notes "What changed"`. It builds
  the signed APK and publishes the `v<version>` GitHub release. On its next start the app offers the
  update; the user confirms it in Android's installer (the first time, Android also asks to allow
  Nodo to install apps).

Releases are signed with the release key: `android/keystore.properties` (gitignored) points at the
keystore outside the repo. **Back up both.** Android only installs an update signed with the same
key, so without them the app has to be uninstalled and installed again. `--dry-run` builds the APK
into `dist/` without publishing.

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
