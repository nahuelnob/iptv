# IPTV Player

A web IPTV player for M3U playlists, designed for keyboard and TV-remote (D-pad) navigation from the start, so it can later be packaged for TV boxes.

## Run

```bash
npm start   # http://localhost:5173
npm test    # parser tests (node:test, no dependencies)
```

Paste a playlist URL or open an `.m3u` file. Use only playlists you have the right to watch.

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
| `src/infra/playlist-source.js` | Loading playlists from a URL or a local file. |
| `src/ui/spatial-nav.js` | Arrow-key focus movement between `[data-nav]` elements. |
| `src/ui/channel-rows.js` | Category rows of channel cards (presentational). |
| `src/ui/player.js` | Full-screen player: hls.js, native HLS fallback. |
| `src/main.js` | Wires everything together. |

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
