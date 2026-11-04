// Builds the site GitHub Pages publishes (and the Android app loads) into site/.
// The source runs as-is in modern browsers (npm start); this build also makes it run on old Android
// TV WebViews such as the Claro B866V2 deco, stuck on Chrome 66: esbuild lowers the syntax (optional
// chaining, ??) and the CSS it can (inset), src/polyfills.js covers missing APIs, and the
// "Old TV WebViews" block at the end of styles/app.css covers the CSS that cannot be lowered.
import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const TARGET = 'chrome66';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'site');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ['index.html', 'offline.html', 'assets', '.nojekyll']) {
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

console.log(`Built site/ for ${TARGET}`);
