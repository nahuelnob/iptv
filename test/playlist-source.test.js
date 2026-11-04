import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadFromUrl } from '../src/infra/playlist-source.js';

const LIST = '#EXTM3U\n#EXTINF:-1,Canal\nhttp://example.com/canal.m3u8\n';

// Simulates the Android app: Capacitor reports a native platform and exposes CapacitorHttp.
function installNativeHttp(get) {
  const calls = [];
  globalThis.window = {
    Capacitor: {
      isNativePlatform: () => true,
      Plugins: {
        CapacitorHttp: {
          get: async (options) => {
            calls.push(options);
            return get(options);
          },
        },
      },
    },
  };
  return calls;
}

function forbidFetch() {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    throw new Error('fetch must not be used in the Android app');
  };
  return calls;
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.fetch;
});

test('in the Android app an http:// list loads natively, without fetch or the Cloudflare proxy', async () => {
  const fetchCalls = forbidFetch();
  const httpCalls = installNativeHttp(() => ({ status: 200, data: LIST }));

  const text = await loadFromUrl('http://provider.example/get.php?token=abc');

  assert.equal(text, LIST);
  assert.equal(fetchCalls.length, 0);
  assert.equal(httpCalls.length, 1);
  assert.equal(httpCalls[0].url, 'http://provider.example/get.php?token=abc');
  assert.equal(httpCalls[0].responseType, 'text');
  assert.equal(httpCalls[0].connectTimeout, 15000);
  assert.equal(httpCalls[0].readTimeout, 15000);
});

test('in the Android app an error status names the host and the code', async () => {
  forbidFetch();
  installNativeHttp(() => ({ status: 404, data: 'Not found' }));

  await assert.rejects(
    loadFromUrl('https://lists.example/ar.m3u'),
    { message: 'lists.example respondió con el error 404. Revisá la dirección y volvé a intentar.' },
  );
});

test('in the Android app a native timeout reports the 15-second timeout', async () => {
  forbidFetch();
  installNativeHttp(() => {
    throw Object.assign(new Error('Read timed out'), { code: 'SocketTimeoutException' });
  });

  await assert.rejects(
    loadFromUrl('http://slow.example/list.m3u'),
    { message: 'slow.example no respondió en 15 segundos. Revisá la dirección o tu conexión y volvé a intentar.' },
  );
});

test('in the Android app any other native failure reports a connection error', async () => {
  const fetchCalls = forbidFetch();
  const httpCalls = installNativeHttp(() => {
    throw Object.assign(new Error('Unable to resolve host'), { code: 'UnknownHostException' });
  });

  await assert.rejects(
    loadFromUrl('http://gone.example/list.m3u'),
    { message: /^No se pudo conectar con gone\.example\./ },
  );
  assert.equal(httpCalls.length, 1);
  assert.equal(fetchCalls.length, 0);
});

test('in a browser an https:// list is still fetched directly first', async () => {
  const fetchCalls = [];
  globalThis.fetch = async (url) => {
    fetchCalls.push(url);
    return new Response(LIST, { status: 200 });
  };

  const text = await loadFromUrl('https://lists.example/ar.m3u');

  assert.equal(text, LIST);
  assert.deepEqual(fetchCalls, ['https://lists.example/ar.m3u']);
});
