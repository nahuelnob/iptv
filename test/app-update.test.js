import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkForUpdate, LATEST_RELEASE_URL } from '../src/infra/app-update.js';

const LATEST = {
  tag_name: 'v0.3.0',
  assets: [{ name: 'nodo.apk', browser_download_url: 'https://github.com/x/releases/download/v0.3.0/nodo.apk' }],
};

// Simulates the Android app. `plugins` lists the native plugins this APK build has.
function installApp({ build = '200', get, plugins = ['App', 'CapacitorHttp', 'AppUpdate'] } = {}) {
  const calls = [];
  globalThis.window = {
    Capacitor: {
      isNativePlatform: () => true,
      isPluginAvailable: (name) => plugins.includes(name),
      Plugins: {
        App: { getInfo: async () => ({ build, version: '0.2.0' }) },
        CapacitorHttp: {
          get: async (options) => {
            calls.push(options);
            return get(options);
          },
        },
        AppUpdate: { install: async () => {} },
      },
    },
  };
  return calls;
}

afterEach(() => {
  delete globalThis.window;
});

test('offers the latest GitHub release when it is newer than the installed app', async () => {
  const calls = installApp({ build: '200', get: () => ({ status: 200, data: LATEST }) });

  assert.deepEqual(await checkForUpdate(), {
    version: '0.3.0',
    code: 300,
    url: 'https://github.com/x/releases/download/v0.3.0/nodo.apk',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, LATEST_RELEASE_URL);
  assert.equal(LATEST_RELEASE_URL, 'https://api.github.com/repos/nahuelnob/iptv/releases/latest');
});

test('reads a release that arrives as JSON text', async () => {
  installApp({ build: '200', get: () => ({ status: 200, data: JSON.stringify(LATEST) }) });

  assert.equal((await checkForUpdate())?.version, '0.3.0');
});

test('offers nothing when the installed app is already that version', async () => {
  installApp({ build: '300', get: () => ({ status: 200, data: LATEST }) });

  assert.equal(await checkForUpdate(), null);
});

test('stays silent when there is no release yet or GitHub cannot be reached', async () => {
  installApp({ get: () => ({ status: 404, data: { message: 'Not Found' } }) });
  assert.equal(await checkForUpdate(), null);

  installApp({ get: () => { throw new Error('Unable to resolve host'); } });
  assert.equal(await checkForUpdate(), null);
});

test('does not ask GitHub from a browser or from an APK without the updater plugin', async () => {
  assert.equal(await checkForUpdate(), null);

  const calls = installApp({ plugins: ['App', 'CapacitorHttp'], get: () => ({ status: 200, data: LATEST }) });
  assert.equal(await checkForUpdate(), null);
  assert.equal(calls.length, 0);
});
