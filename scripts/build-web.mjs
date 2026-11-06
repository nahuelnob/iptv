// Builds the site GitHub Pages publishes (and the Android app loads) into site/.
// The source runs as-is in modern browsers (npm start); this build also makes it run on old Android
// TV WebViews such as the Claro B866V2 deco, stuck on Chrome 66: esbuild lowers the syntax (optional
// chaining, ??) and the CSS it can (inset), src/polyfills.js covers missing APIs, and the
// "Old TV WebViews" block at the end of styles/app.css covers the CSS that cannot be lowered.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

export const TARGET = 'chrome66';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'site');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ['index.html', 'offline.html', 'assets', 'playlists', '.nojekyll']) {
  await cp(join(root, entry), join(out, entry), { recursive: true });
}

// One file at the same path index.html already loads (src/main.js), so the page needs no rewrite.
await build({
  entryPoints: [join(root, 'src', 'main.js')],
  outfile: join(out, 'src', 'main.js'),
  bundle: true,
  format: 'esm',
  target: TARGET,
  logLevel: 'warning',
});

await build({
  entryPoints: [join(root, 'styles', 'tokens.css'), join(root, 'styles', 'app.css')],
  outdir: join(out, 'styles'),
  target: TARGET,
  logLevel: 'warning',
});

// The service worker last, stamped with a hash of everything above plus its own source: any change
// to the site makes a byte-different sw.js, so the browser installs a new worker and new caches.
// A classic script (iife): Chrome 66 has no module service workers.
const version = await hashFiles([out, join(root, 'src', 'sw')]);
await build({
  entryPoints: [join(root, 'src', 'sw', 'sw.js')],
  outfile: join(out, 'sw.js'),
  bundle: true,
  format: 'iife',
  target: TARGET,
  define: { __SW_VERSION__: JSON.stringify(version) },
  logLevel: 'warning',
});

console.log(`Built site/ for ${TARGET} (service worker ${version})`);

async function hashFiles(dirs) {
  const hash = createHash('sha256');
  for (const dir of dirs) {
    const files = (await readdir(dir, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
      .sort();
    for (const file of files) {
      hash.update(relative(root, file).replaceAll('\\', '/'));
      hash.update(await readFile(file));
    }
  }
  return hash.digest('hex').slice(0, 12);
}
