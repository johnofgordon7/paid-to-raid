import catalog from './media-catalog.js';

const SHA256 = /^[a-f0-9]{64}$/;
const PART_SIZE = 4 * 1024 * 1024;

export function getVideoTransport(logicalVideo) {
  if (!Object.hasOwn(catalog.videos, logicalVideo)) throw new Error('Unknown combat footage.');
  return catalog.videos[logicalVideo];
}

const hex = (buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

/** Fetch only the accepted clip, verify all bytes, then hand native video a seekable Blob. */
export async function loadChunkedVideo(logicalVideo, {
  signal, onProgress, fetch: fetchImpl = globalThis.fetch,
  baseUrl = globalThis.location?.href,
  crypto = globalThis.crypto,
  createObjectURL = (blob) => URL.createObjectURL(blob),
} = {}) {
  signal?.throwIfAborted();
  const entry = getVideoTransport(logicalVideo);
  if (entry.type !== 'chunks') throw new Error('This footage uses direct native playback.');
  if (!crypto?.subtle) throw new Error('Footage verification requires HTTPS or localhost.');
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  const active = controller.signal;
  let loadedBytes = 0;
  let completeParts = 0;
  const manifestUrl = new URL(entry.manifest, baseUrl);
  manifestUrl.searchParams.set('v', entry.sha256);
  const digest = async (bytes) => hex(await crypto.subtle.digest('SHA-256', bytes));
  let totalParts = 0;
  const progress = (phase) => onProgress?.({ loadedBytes, totalBytes: entry.bytes, completeParts, totalParts, phase });
  try {
    const response = await fetchImpl(manifestUrl.href, { signal: active, cache: 'no-cache' });
    if (!response.ok) throw new Error('The footage manifest could not load.');
    const manifest = await response.json();
    active.throwIfAborted();
    if (manifest.version !== 1 || manifest.logicalVideo !== logicalVideo ||
        manifest.bytes !== entry.bytes || manifest.sha256 !== entry.sha256 ||
        !SHA256.test(manifest.sha256) || manifest.partSizeBytes !== PART_SIZE ||
        !Array.isArray(manifest.parts) || manifest.parts.length < 1 || manifest.parts.length > 16) {
      throw new Error('The footage manifest does not match the accepted operation.');
    }
    const expectedCount = Math.ceil(entry.bytes / PART_SIZE);
    if (manifest.parts.length !== expectedCount || manifest.parts.some((part, index) =>
      part.file !== `part-${String(index).padStart(2, '0')}.bin` || !SHA256.test(part.sha256) ||
      part.bytes !== Math.min(PART_SIZE, entry.bytes - index * PART_SIZE))) {
      throw new Error('The footage manifest contains invalid part references.');
    }
    totalParts = manifest.parts.length;
    progress('loading');
    const parts = new Array(totalParts);
    let next = 0;
    async function worker() {
      while (next < totalParts) {
        active.throwIfAborted();
        const index = next++;
        const expected = manifest.parts[index];
        const partUrl = new URL(expected.file, manifestUrl);
        partUrl.searchParams.set('v', expected.sha256);
        const partResponse = await fetchImpl(partUrl.href, { signal: active, cache: 'no-cache' });
        if (!partResponse.ok) throw new Error('A footage part could not load.');
        const bytes = await partResponse.arrayBuffer();
        active.throwIfAborted();
        if (bytes.byteLength !== expected.bytes || await digest(bytes) !== expected.sha256) {
          throw new Error('The footage is incomplete or failed its integrity check.');
        }
        active.throwIfAborted();
        parts[index] = bytes;
        loadedBytes += bytes.byteLength;
        completeParts += 1;
        progress('loading');
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    active.throwIfAborted();
    progress('verifying');
    const joined = new Uint8Array(entry.bytes);
    let offset = 0;
    for (let index = 0; index < parts.length; index++) {
      joined.set(new Uint8Array(parts[index]), offset);
      offset += parts[index].byteLength;
      parts[index] = null;
    }
    const sha256 = await digest(joined);
    active.throwIfAborted();
    if (offset !== entry.bytes || sha256 !== entry.sha256) throw new Error('The complete footage failed its integrity check.');
    progress('ready');
    active.throwIfAborted();
    return { url: createObjectURL(new Blob([joined], { type: 'video/mp4' })), sha256, bytes: joined.byteLength };
  } catch (error) {
    controller.abort(error);
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}
