// Android app updates. Web changes need none of this: the APK loads the site from GitHub Pages.
// Native changes ship as a GitHub release (scripts/release-android.mjs); on start the app asks GitHub
// for the latest one and, when it is newer, the AppUpdate plugin downloads it and opens Android's
// installer. In a browser, or in an APK built before the plugin existed, everything here is a no-op.
import { pickUpdate } from '../domain/app-version.js';

export const LATEST_RELEASE_URL = 'https://api.github.com/repos/nahuelnob/iptv/releases/latest';
const TIMEOUT_MS = 15000;

// Resolves to { version, code, url } or null. Never rejects: an update check must not get in the way.
export async function checkForUpdate() {
  const capacitor = nativeCapacitor();
  if (!capacitor) return null;

  try {
    const { build } = await capacitor.Plugins.App.getInfo();
    const response = await capacitor.Plugins.CapacitorHttp.get({
      url: LATEST_RELEASE_URL,
      headers: { Accept: 'application/vnd.github+json' },
      responseType: 'json',
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
    });
    if (response.status !== 200) return null;

    const release = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return pickUpdate(release, build);
  } catch {
    return null;
  }
}

// Downloads the APK and opens Android's installer. onProgress receives 0-100.
// Rejects with code 'INSTALL_PERMISSION_REQUIRED' when Android has not yet allowed this app to install
// apps: the plugin has already opened that setting.
export async function installUpdate(update, onProgress = () => {}) {
  const updater = nativeCapacitor()?.Plugins.AppUpdate;
  if (!updater) throw new Error('Updates are only available in the Android app.');

  const listener = await updater.addListener?.('progress', ({ percent }) => onProgress(percent));
  try {
    await updater.install({ url: update.url });
  } finally {
    listener?.remove?.();
  }
}

function nativeCapacitor() {
  const capacitor = globalThis.window?.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  const has = (name) => capacitor.isPluginAvailable?.(name) ?? Boolean(capacitor.Plugins?.[name]);
  return has('AppUpdate') && has('App') && capacitor.Plugins?.CapacitorHttp ? capacitor : null;
}
