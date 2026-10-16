import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const expectedHash = 'cbf5331b3cc4dc1ad43957e9048685b62979e9b5300244738d67684d79da9924';
const expectedBytes = 45642600;
const expectedParts = Array.from({ length: 11 }, (_, index) => `sprint.part-${String(index).padStart(2, '0')}`);

function assertInside(path) {
  const child = relative(root, path);
  if (child === '..' || child.startsWith(`..\\`) || child.startsWith('../') || isAbsolute(child)) {
    throw new Error('Media preparation path escaped the project workspace.');
  }
}

function confined(...segments) {
  const path = resolve(root, ...segments);
  assertInside(path);
  let existing = path;
  while (!existsSync(existing)) existing = dirname(existing);
  assertInside(realpathSync(existing));
  return path;
}

const manifestPath = confined('media-parts', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.bytes !== expectedBytes || JSON.stringify(manifest.parts) !== JSON.stringify(expectedParts)) {
  throw new Error('Unexpected combat video parts manifest.');
}

const hash = createHash('sha256');
let bytes = 0;
for (const name of manifest.parts) {
  const part = readFileSync(confined('media-parts', name));
  hash.update(part);
  bytes += part.length;
}
if (bytes !== expectedBytes || hash.digest('hex') !== expectedHash) {
  throw new Error('Combat video integrity check failed.');
}

const output = confined('public', 'assets', 'sprint-parts');
mkdirSync(output, { recursive: true });
for (const name of [...manifest.parts, 'manifest.json']) {
  copyFileSync(confined('media-parts', name), confined('public', 'assets', 'sprint-parts', name));
}

function verifyOriginal(path) {
  const video = readFileSync(path);
  if (video.length !== expectedBytes || createHash('sha256').update(video).digest('hex') !== expectedHash) {
    throw new Error(`Refusing to move or remove an unexpected video: ${relative(root, path)}`);
  }
}

// Preserve the original local MP4 outside all deployable asset directories.
const original = confined('public', 'assets', 'call-of-booty-sprint.mp4');
const backup = confined('.sites-runtime', 'original-sprint.mp4');
if (existsSync(original)) {
  verifyOriginal(original);
  if (existsSync(backup)) {
    verifyOriginal(backup);
    unlinkSync(original);
  } else {
    mkdirSync(confined('.sites-runtime'), { recursive: true });
    renameSync(original, backup);
  }
} else if (existsSync(backup)) {
  verifyOriginal(backup);
}

// Clear only the verified duplicate left by an earlier full-MP4 build.
const previousBuildVideo = confined('dist', 'assets', 'call-of-booty-sprint.mp4');
if (existsSync(previousBuildVideo)) {
  verifyOriginal(previousBuildVideo);
  unlinkSync(previousBuildVideo);
}

console.log(`Prepared ${manifest.parts.length} combat video parts; ${bytes} original bytes verified by SHA-256.`);
