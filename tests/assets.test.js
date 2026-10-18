import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import catalog from '../src/media-catalog.js';
import { SEQUENCES } from '../src/game.js';

const PUBLIC = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const WEB_UPLOAD_LIMIT = 25 * 1024 * 1024;
const APPROVED = {
  './assets/call-of-booty-sprint.mp4': [45642600, 'cbf5331b3cc4dc1ad43957e9048685b62979e9b5300244738d67684d79da9924'],
  './assets/call-of-booty-ambush-early.mp4': [17444048, 'd9e0297ec40531723c73d3b94fa0804d4dbe0283070882f02edc07a6ba849da5'],
  './assets/call-of-booty-ambush-late.mp4': [39044597, 'a38880bcf80f1382a627ce9f90f0bbe3da7968ba2d9497798b71ec61ef8fb94e'],
  './assets/call-of-booty-extraction-five.mp4': [42997236, 'e3739bbd91ff09a42ae6549b82f17a2ced9da39bc82ed991ae854b9612d12f6f'],
  './assets/call-of-booty-extraction-max.mp4': [43572023, 'f8557534dd9e22b6e1654527e0ea9d6699f6c44db8a67a6f5d635db7f3a7403e'],
};

function localAsset(relative) {
  assert.match(relative, /^\.\/assets\/[A-Za-z0-9_./-]+$/);
  assert.ok(!relative.split('/').includes('..'), `Unsafe asset path: ${relative}`);
  const resolved = path.resolve(PUBLIC, relative);
  assert.ok(resolved.startsWith(`${PUBLIC}${path.sep}`), `Asset escapes public: ${relative}`);
  return resolved;
}

async function* chunksOf(files) {
  for (const file of files) yield* createReadStream(file);
}

test('all five approved videos reconstruct to their supplied byte counts and SHA-256 hashes', async () => {
  assert.equal(catalog.version, 1);
  assert.equal(catalog.partSizeBytes, 4 * 1024 * 1024);
  assert.deepEqual(Object.keys(catalog.videos).sort(), Object.keys(APPROVED).sort());
  assert.deepEqual([...new Set(SEQUENCES.map(({ video }) => video))].sort(), Object.keys(APPROVED).sort());
  let chunkedCount = 0;
  let directCount = 0;
  for (const [logicalVideo, [approvedBytes, approvedHash]] of Object.entries(APPROVED)) {
    const entry = catalog.videos[logicalVideo];
    assert.equal(entry.bytes, approvedBytes);
    assert.equal(entry.sha256, approvedHash);
    let files;
    if (entry.type === 'direct') {
      directCount++;
      assert.equal(entry.url, logicalVideo);
      files = [localAsset(entry.url)];
      assert.ok(approvedBytes < WEB_UPLOAD_LIMIT);
    } else {
      chunkedCount++;
      assert.equal(entry.type, 'chunks');
      const manifestFile = localAsset(entry.manifest);
      const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
      assert.equal(manifest.version, 1);
      assert.equal(manifest.logicalVideo, logicalVideo);
      assert.equal(manifest.bytes, approvedBytes);
      assert.equal(manifest.sha256, approvedHash);
      assert.equal(manifest.partSizeBytes, catalog.partSizeBytes);
      assert.equal(manifest.parts.length, Math.ceil(approvedBytes / catalog.partSizeBytes));
      files = [];
      let total = 0;
      for (const [index, part] of manifest.parts.entries()) {
        assert.equal(part.file, `part-${String(index).padStart(2, '0')}.bin`);
        assert.match(part.sha256, /^[a-f0-9]{64}$/);
        const expectedBytes = Math.min(catalog.partSizeBytes, approvedBytes - total);
        assert.equal(part.bytes, expectedBytes);
        const file = path.join(path.dirname(manifestFile), part.file);
        assert.equal((await stat(file)).size, part.bytes);
        const partHash = createHash('sha256');
        for await (const bytes of createReadStream(file)) partHash.update(bytes);
        assert.equal(partHash.digest('hex'), part.sha256, `${logicalVideo}/${part.file}`);
        files.push(file);
        total += part.bytes;
      }
      assert.equal(total, approvedBytes);
    }
    let bytes = 0;
    let header = Buffer.alloc(0);
    const hash = createHash('sha256');
    for await (const chunk of chunksOf(files)) {
      bytes += chunk.length;
      hash.update(chunk);
      if (header.length < 12) header = Buffer.concat([header, chunk]).subarray(0, 12);
    }
    assert.equal(header.toString('ascii', 4, 8), 'ftyp', `Invalid reconstructed MP4: ${logicalVideo}`);
    assert.equal(bytes, approvedBytes, logicalVideo);
    assert.equal(hash.digest('hex'), approvedHash, logicalVideo);
  }
  assert.equal(chunkedCount, 4);
  assert.equal(directCount, 1);
});

test('every supplied outcome and opening image is a complete WebP container', async () => {
  const images = new Set(SEQUENCES.map(({ resultArt }) => resultArt));
  assert.equal(images.size, 5);
  images.add('./assets/exfil-opening.webp');
  for (const image of images) {
    const bytes = await readFile(localAsset(image));
    assert.ok(bytes.length > 1024, image);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', image);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', image);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `Truncated WebP: ${image}`);
    assert.match(bytes.toString('ascii', 12, 16), /^VP8[ XL]$/, image);
  }
});

test('published files fit the browser upload limit and contain no private staging material', async () => {
  const visit = async (directory) => {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      assert.ok(!item.isSymbolicLink(), `Symlink in published assets: ${file}`);
      assert.ok(!['.git', '.openai', 'evidence', 'rollback', 'node_modules'].includes(item.name), file);
      if (item.isDirectory()) await visit(file);
      else assert.ok((await stat(file)).size < WEB_UPLOAD_LIMIT, `Exceeds browser limit: ${file}`);
    }
  };
  await visit(PUBLIC);
});
