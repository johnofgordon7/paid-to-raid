import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';
import catalog from '../src/media-catalog.js';
import { getVideoTransport, loadChunkedVideo } from '../src/media.js';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const BASE_URL = 'https://cashfire.test/review/dist/';
const LOGICAL = './assets/call-of-booty-sprint.mp4';
const ENTRY = catalog.videos[LOGICAL];
const ABORT_ERROR = () => new DOMException('Test cancelled the download.', 'AbortError');

// Serve real shipping bytes through the browser fetch/body/Blob interfaces.
// Only HTTP failures and malicious responses are substituted in failure cases.
function network({ manifestChange, partResponse, beforeFetch } = {}) {
  const calls = [];
  const fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, BASE_URL);
    const relative = decodeURIComponent(url.pathname.replace('/review/dist/', ''));
    assert.ok(relative.startsWith('assets/'), `Unexpected request ${url}`);
    assert.ok(!relative.split('/').includes('..'), `Traversal request ${url}`);
    calls.push({ url: url.href, relative, signal: options.signal });
    if (options.signal?.aborted) throw ABORT_ERROR();
    if (beforeFetch) await beforeFetch({ url, relative, signal: options.signal, calls });
    if (options.signal?.aborted) throw ABORT_ERROR();
    const body = await readFile(path.join(PUBLIC, relative));
    if (options.signal?.aborted) throw ABORT_ERROR();
    if (relative.endsWith('manifest.json')) {
      const manifest = JSON.parse(body.toString('utf8'));
      if (manifestChange) manifestChange(manifest);
      return new Response(JSON.stringify(manifest), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (partResponse) {
      const response = await partResponse({ url, relative, body, signal: options.signal, calls });
      if (response) return response;
    }
    return new Response(body, { status: 200, headers: { 'content-length': String(body.length) } });
  };
  return { fetch, calls };
}

function optionsFor(net, extra = {}) {
  const created = [];
  const progress = [];
  return {
    created,
    progress,
    options: {
      fetch: net.fetch,
      baseUrl: BASE_URL,
      crypto: webcrypto,
      createObjectURL: (blob) => { created.push(blob); return `blob:test/${created.length}`; },
      onProgress: (value) => progress.push({ ...value }),
      ...extra,
    },
  };
}

test('transport lookup covers direct and chunked videos and rejects unknown routes', () => {
  assert.equal(getVideoTransport(LOGICAL).type, 'chunks');
  assert.equal(getVideoTransport('./assets/call-of-booty-ambush-early.mp4').type, 'direct');
  assert.throws(() => getVideoTransport('./assets/missing.mp4'));
});

test('verified download creates one byte-exact playable Blob with monotonic pinned progress', async () => {
  const net = network();
  const fixture = optionsFor(net);
  const result = await loadChunkedVideo(LOGICAL, fixture.options);
  assert.equal(result.url, 'blob:test/1');
  assert.equal(result.sha256, ENTRY.sha256);
  assert.equal(result.bytes, ENTRY.bytes);
  assert.equal(fixture.created.length, 1);
  assert.equal(fixture.created[0].type, 'video/mp4');
  assert.equal(fixture.created[0].size, ENTRY.bytes);
  const blobBytes = Buffer.from(await fixture.created[0].arrayBuffer());
  assert.equal(createHash('sha256').update(blobBytes).digest('hex'), ENTRY.sha256);
  assert.ok(fixture.progress.length > 1);
  let previousLoaded = 0;
  let previousParts = 0;
  for (const item of fixture.progress) {
    assert.equal(item.totalBytes, ENTRY.bytes);
    assert.equal(item.totalParts, Math.ceil(ENTRY.bytes / catalog.partSizeBytes));
    assert.ok(item.loadedBytes >= previousLoaded && item.loadedBytes <= ENTRY.bytes);
    assert.ok(item.completeParts >= previousParts && item.completeParts <= item.totalParts);
    assert.ok(['loading', 'verifying', 'ready'].includes(item.phase));
    previousLoaded = item.loadedBytes;
    previousParts = item.completeParts;
  }
  assert.equal(fixture.progress.at(-1).phase, 'ready');
  assert.equal(fixture.progress.at(-1).loadedBytes, ENTRY.bytes);
  assert.equal(fixture.progress.at(-1).completeParts, fixture.progress.at(-1).totalParts);
});

for (const [label, status] of [['missing part', 404], ['server error', 503]]) {
  test(`${label} cannot produce a playable URL`, async () => {
    const net = network({ partResponse: ({ relative }) => relative.endsWith('part-00.bin') ? new Response('Unavailable', { status }) : undefined });
    const fixture = optionsFor(net);
    await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
    assert.equal(fixture.created.length, 0);
    assert.ok(net.calls.some(({ relative }) => relative.endsWith('part-00.bin')));
  });
}

test('truncated response is rejected before URL creation', async () => {
  const net = network({ partResponse: ({ relative, body }) => relative.endsWith('part-00.bin') ? new Response(body.subarray(0, body.length - 1)) : undefined });
  const fixture = optionsFor(net);
  await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
  assert.equal(fixture.created.length, 0);
});

test('same-size corrupt bytes are rejected by SHA-256', async () => {
  const net = network({ partResponse: ({ relative, body }) => {
    if (!relative.endsWith('part-00.bin')) return;
    const corrupt = Buffer.from(body);
    corrupt[Math.floor(corrupt.length / 2)] ^= 0xff;
    return new Response(corrupt);
  } });
  const fixture = optionsFor(net);
  await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
  assert.equal(fixture.created.length, 0);
});

for (const [field, mutate] of [
  ['video identity', (manifest) => { manifest.logicalVideo = './assets/call-of-booty-extraction-max.mp4'; }],
  ['pinned byte count', (manifest) => { manifest.bytes++; }],
  ['pinned full-file hash', (manifest) => { manifest.sha256 = '0'.repeat(64); }],
]) {
  test(`manifest ${field} mismatch rejects before requesting parts`, async () => {
    const net = network({ manifestChange: mutate });
    const fixture = optionsFor(net);
    await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
    assert.equal(fixture.created.length, 0);
    assert.equal(net.calls.length, 1);
  });
}

test('advertising a hash for altered bytes cannot replace the pinned whole-file digest', async () => {
  const partPath = path.join(PUBLIC, ENTRY.manifest.replace(/^\.\//, '').replace('manifest.json', 'part-00.bin'));
  const replacement = await readFile(partPath);
  replacement[100] ^= 0xff;
  const net = network({
    manifestChange: (manifest) => { manifest.parts[0].sha256 = createHash('sha256').update(replacement).digest('hex'); },
    partResponse: ({ relative }) => relative.endsWith('part-00.bin') ? new Response(replacement) : undefined,
  });
  const fixture = optionsFor(net);
  await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
  assert.equal(fixture.created.length, 0);
});

for (const file of ['../escape.bin', '/escape.bin', 'https://other.test/part.bin', 'part-00.bin?redirect=1', 'part%2f00.bin']) {
  test(`unsafe part path ${file} is rejected without part fetches`, async () => {
    const net = network({ manifestChange: (manifest) => { manifest.parts[0].file = file; } });
    const fixture = optionsFor(net);
    await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
    assert.equal(fixture.created.length, 0);
    assert.equal(net.calls.length, 1);
  });
}

test('already-aborted request does no fetch and creates no URL', async () => {
  const controller = new AbortController();
  controller.abort();
  const net = network();
  const fixture = optionsFor(net, { signal: controller.signal });
  await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
  assert.equal(net.calls.length, 0);
  assert.equal(fixture.created.length, 0);
});

test('aborting an active download cancels it without a playable URL', async () => {
  const controller = new AbortController();
  let partStarted = false;
  const net = network({ beforeFetch: async ({ relative, signal }) => {
    if (!relative.endsWith('.bin')) return;
    partStarted = true;
    assert.ok(signal, 'Part fetch must receive a cancellation signal.');
    controller.abort();
  } });
  const fixture = optionsFor(net, { signal: controller.signal });
  await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
  assert.ok(partStarted);
  assert.equal(fixture.created.length, 0);
});

test('a fresh retry succeeds after failure without reusing partial media', async () => {
  let fail = true;
  const net = network({ partResponse: ({ relative }) => fail && relative.endsWith('part-00.bin') ? new Response('', { status: 404 }) : undefined });
  const fixture = optionsFor(net);
  await assert.rejects(loadChunkedVideo(LOGICAL, fixture.options));
  assert.equal(fixture.created.length, 0);
  fail = false;
  const result = await loadChunkedVideo(LOGICAL, fixture.options);
  assert.equal(result.sha256, ENTRY.sha256);
  assert.equal(result.bytes, ENTRY.bytes);
  assert.equal(fixture.created.length, 1);
});

test('the chunk loader refuses the direct native video transport', async () => {
  const net = network();
  const fixture = optionsFor(net);
  await assert.rejects(loadChunkedVideo('./assets/call-of-booty-ambush-early.mp4', fixture.options));
  assert.equal(net.calls.length, 0);
  assert.equal(fixture.created.length, 0);
});
