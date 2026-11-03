// Copies only what the app needs into www/, the folder Capacitor packages into the APK.
// The app has no build step; this keeps tests, designs and the android/ project out of the APK.
import { cp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'www');
const entries = ['index.html', 'src', 'styles'];

await rm(out, { recursive: true, force: true });
for (const entry of entries) {
  await cp(join(root, entry), join(out, entry), { recursive: true });
}
console.log(`Copied ${entries.join(', ')} to www/`);
