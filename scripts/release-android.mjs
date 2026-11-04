// Builds the signed Android APK and publishes it as a GitHub release, the source the installed app
// checks for updates (src/infra/app-update.js). Web-only changes need none of this: the app loads
// the site from GitHub Pages, so pushing to main is enough.
//
// Usage: npm run release:android [-- --notes "What changed"] [-- --dry-run]
// Before: bump "version" in package.json, commit it and push main. The tag is v<version>.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const notesIndex = args.indexOf('--notes');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const tag = `v${version}`;
const notes = notesIndex >= 0 ? args[notesIndex + 1] : `Nodo ${version}`;

// Must match the asset name the app looks for (APK_ASSET in src/domain/app-version.js).
const ASSET = 'nodo.apk';

const windows = process.platform === 'win32';
const env = {
  ...process.env,
  ANDROID_HOME: process.env.ANDROID_HOME ?? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk'),
};

// No shell by default: on Windows a shell joins the arguments unquoted, which splits "Nodo 0.2.0" and
// runs anything after an & in the notes. Only .cmd/.bat launchers (npx, gradlew.bat) need one, and
// their arguments here are fixed words.
function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, { cwd: root, env, encoding: 'utf8', shell: false, ...options });
}

function stop(message) {
  console.error(`release-android: ${message}`);
  process.exit(1);
}

// The release must describe what main serves: GitHub Pages publishes main, and the APK's web part
// comes from there.
// Everything that ends up inside the APK. Untracked files count too: a forgotten new Java file would
// be compiled in without being on main.
const SHIPPED = ['android', 'src', 'styles', 'assets', 'index.html', 'offline.html', 'capacitor.config.json', 'package.json'];

if (!dryRun) {
  if (run('git', ['status', '--porcelain', '--', ...SHIPPED]).trim()) {
    stop('there are uncommitted or untracked files in what the APK ships; commit them first.');
  }
  run('git', ['fetch', '-q', 'origin', 'main']);
  const head = run('git', ['rev-parse', 'HEAD']).trim();
  if (head !== run('git', ['rev-parse', 'origin/main']).trim()) {
    stop('HEAD is not origin/main; release from an up-to-date main that is already pushed.');
  }
  let exists = true;
  try {
    run('gh', ['release', 'view', tag], { stdio: 'ignore' });
  } catch {
    exists = false;
  }
  if (exists) stop(`release ${tag} already exists; bump "version" in package.json first.`);
  // A bare tag would be reused by "gh release create", attaching this APK to an older commit.
  if (run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]).trim()) {
    stop(`tag ${tag} already exists on origin; bump "version" in package.json first.`);
  }
}

if (!existsSync(join(root, 'android', 'keystore.properties'))) {
  stop('android/keystore.properties is missing: releases must be signed with the release key.');
}

console.log(`Building ${tag}…`);
run('node', ['scripts/build-www.mjs'], { stdio: 'inherit' });
run('npx', ['cap', 'sync', 'android'], { stdio: 'inherit', shell: windows });
run(join(root, 'android', windows ? 'gradlew.bat' : 'gradlew'), ['assembleRelease', '-q'], {
  cwd: join(root, 'android'),
  stdio: 'inherit',
  shell: windows,
});

const built = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
mkdirSync(join(root, 'dist'), { recursive: true });
const apk = join(root, 'dist', ASSET);
copyFileSync(built, apk);
console.log(`Signed APK: ${apk}`);

if (dryRun) {
  console.log('Dry run: nothing published.');
  process.exit(0);
}

const target = run('git', ['rev-parse', 'HEAD']).trim();
run('gh', ['release', 'create', tag, apk, '--title', `Nodo ${version}`, '--notes', notes, '--target', target], {
  stdio: 'inherit',
});
console.log(`Published ${tag}. Installed apps will offer it the next time they start.`);
