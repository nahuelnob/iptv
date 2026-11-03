// Development-only stream proxy. Browsers enforce CORS; Node does not, so the dev server
// fetches streams on the page's behalf, the same way a native TV app would.
// HLS playlists are rewritten so every segment, key and sub-playlist also goes through here.
import { Readable } from 'node:stream';

const UPSTREAM_TIMEOUT_MS = 15_000;
const PLAYLIST_TYPES = /mpegurl/i;

export function proxyPath(url) {
  return `/proxy?url=${encodeURIComponent(url)}`;
}

// Refuses non-web schemes and private addresses so a page cannot use the proxy to reach this
// machine or the local network. Hostnames that *resolve* to private IPs are not caught:
// acceptable for a dev server bound to 127.0.0.1, not for anything exposed to a network.
export function isAllowedTarget(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.startsWith('[')) return false;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

export function rewritePlaylist(text, baseUrl) {
  const toProxy = (uri) => proxyPath(new URL(uri, baseUrl).href);

  return text.split(/(\r?\n)/).map((part) => {
    const line = part.trim();
    if (!line || part === '\n' || part === '\r\n') return part;
    if (line.startsWith('#')) {
      return part.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${toProxy(uri)}"`);
    }
    return toProxy(line);
  }).join('');
}

export async function handleProxy(req, res) {
  // Only this app's own pages may use the proxy; other sites open in the same browser may not.
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') {
    return send(res, 403, 'Cross-site requests to the dev proxy are not allowed.');
  }

  const target = new URL(req.url, 'http://localhost').searchParams.get('url');
  if (!target || !isAllowedTarget(target)) {
    return send(res, 400, 'Missing or disallowed url parameter.');
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      headers: pickHeaders(req.headers, ['user-agent', 'range', 'accept']),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return send(res, 502, 'The stream server did not answer.');
  }

  const type = upstream.headers.get('content-type') ?? '';
  const isPlaylist = PLAYLIST_TYPES.test(type) || /\.m3u8?(\?|$)/i.test(new URL(upstream.url).pathname);

  if (isPlaylist && upstream.ok) {
    // Resolve relative URIs against the final URL, after any redirects.
    const body = rewritePlaylist(await upstream.text(), upstream.url);
    res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' });
    return res.end(body);
  }

  const headers = { 'Content-Type': type || 'application/octet-stream' };
  for (const name of ['content-length', 'content-range', 'accept-ranges']) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  res.writeHead(upstream.status, headers);
  if (!upstream.body) return res.end();
  Readable.fromWeb(upstream.body).on('error', () => res.destroy()).pipe(res);
}

function pickHeaders(source, names) {
  return Object.fromEntries(names.filter((n) => source[n]).map((n) => [n, source[n]]));
}

function send(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(message);
}
