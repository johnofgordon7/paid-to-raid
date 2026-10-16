import { createHash } from 'node:crypto';
import { loadCombatVideo } from '../src/media.js';

const baseUrl = process.argv[2];
if (!baseUrl) throw new Error('Provide the served sprint-parts directory URL.');
const url = await loadCombatVideo({ baseUrl });
try {
  const response = await fetch(url);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const expected = 'cbf5331b3cc4dc1ad43957e9048685b62979e9b5300244738d67684d79da9924';
  if (sha256 !== expected) throw new Error('Loaded video differs from the supplied archive.');
  console.log(JSON.stringify({ httpChunkLoading: 'passed', blobType: response.headers.get('content-type'), bytes: bytes.length, originalSha256Matches: true }));
} finally {
  URL.revokeObjectURL(url);
}
