// Assemble the original MP4 bytes without re-encoding. Small hosted parts keep
// the supplied video within the static host's per-file limit.
export async function loadCombatVideo({ signal, baseUrl } = {}) {
  const base = new URL(baseUrl ?? './assets/sprint-parts/', globalThis.location?.href);
  const manifestResponse = await fetch(new URL('manifest.json', base), { signal });
  if (!manifestResponse.ok) throw new Error('Video manifest could not load.');
  const manifest = await manifestResponse.json();
  if (manifest.bytes !== 45642600 || !Array.isArray(manifest.parts) || manifest.parts.length !== 11 ||
      new Set(manifest.parts).size !== 11 || manifest.parts.some((name) => !/^sprint\.part-\d{2}$/.test(name))) {
    throw new Error('Unexpected video manifest.');
  }
  const parts = new Array(manifest.parts.length);
  let next = 0;
  async function worker() {
    while (next < parts.length) {
      const index = next++;
      const response = await fetch(new URL(manifest.parts[index], base), { signal });
      if (!response.ok) throw new Error('A video part could not load.');
      parts[index] = await response.arrayBuffer();
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  signal?.throwIfAborted();
  if (parts.reduce((sum, part) => sum + part.byteLength, 0) !== manifest.bytes) {
    throw new Error('The combat footage is incomplete.');
  }
  return URL.createObjectURL(new Blob(parts, { type: 'video/mp4' }));
}
