// Android app versions. A release tag "v1.4.12" maps to the version code Gradle builds from
// package.json (android/app/build.gradle): major * 10000 + minor * 100 + patch. Comparing codes tells
// the installed app whether a published release is newer.

// The APK every release carries (scripts/release-android.mjs uploads it under this name).
export const APK_ASSET = 'nodo.apk';

export function versionCodeOf(tag) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag ?? '');
  if (!match) return null;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major * 10000 + minor * 100 + patch;
}

// release: GitHub's "latest release" JSON. Returns what to offer, or null when nothing is newer.
export function pickUpdate(release, installedBuild) {
  const code = versionCodeOf(release?.tag_name);
  if (code === null || code <= Number(installedBuild)) return null;

  const asset = release.assets?.find((candidate) => candidate.name === APK_ASSET);
  if (!asset?.browser_download_url) return null;

  return { version: release.tag_name.replace(/^v/, ''), code, url: asset.browser_download_url };
}
