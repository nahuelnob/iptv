// The local dev server (scripts/serve.mjs) offers a stream proxy to get around CORS while
// testing in a browser. Production hosts and TV apps do not have it, so detect it once.
let availability = null;

export function devProxyAvailable() {
  availability ??= fetch('/proxy/health')
    .then((response) => response.ok)
    .catch(() => false);
  return availability;
}

export function devProxyUrl(url) {
  return `/proxy?url=${encodeURIComponent(url)}`;
}
