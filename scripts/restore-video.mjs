import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const expected = 'cbf5331b3cc4dc1ad43957e9048685b62979e9b5300244738d67684d79da9924';
const target = new URL('public/assets/call-of-booty-sprint.mp4', root);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (existsSync(target) && hash(readFileSync(target)) === expected) {
  console.log('Original combat video verified.');
} else {
  const manifest = JSON.parse(readFileSync(new URL('media-parts/manifest.json', root), 'utf8'));
  const video = Buffer.concat(manifest.parts.map((name) => readFileSync(new URL(`media-parts/${name}`, root))));
  if (video.length !== manifest.bytes || hash(video) !== expected) throw new Error('Combat video integrity check failed.');
  const temporary = `${fileURLToPath(target)}.restoring`;
  writeFileSync(temporary, video);
  renameSync(temporary, target);
  console.log('Original combat video restored and verified.');
}
