// Minimal static server for local development: `npm start`, then open http://localhost:5173
// Also serves /proxy, a stream proxy that gets around browser CORS blocks while testing.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { handleProxy } from './proxy.mjs';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT) || 5173;
// Loopback only: the proxy must never be reachable from other machines.
const host = '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.m3u': 'audio/x-mpegurl',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  if (path === '/proxy/health') {
    res.writeHead(204).end();
    return;
  }
  if (path === '/proxy') {
    await handleProxy(req, res);
    return;
  }

  // A path ending in "/" is a folder: serve its index.html, like any static server.
  const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, host, () => console.log(`IPTV player on http://localhost:${port}`));
