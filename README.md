# Cashfire

A play-money first-person video survival prototype. Five supplied native combat sequences retain their original video frames, sound, kill timings and results. Cashfire branding, the Incentive Studios shell and the complete right-hand payout table show current progress, next-kill return and the 1,000× maximum. Betting controls are hidden during loading, active and paused rounds.

## Run and build

Use Node.js 20 or later. Run `npm ci`, then `npm test`. Use `npm run dev` for development, or `npm run build` to generate `dist/`. Serve the complete build over HTTP. HTTPS or localhost is required for browser SHA-256 verification. No backend, account, database or API key is required. Fonts use the existing external providers with local fallbacks.

## Browser-upload media transport

Four large MP4s are stored as byte-exact parts under `public/assets/video-parts/`. Every part is at most 4 MiB, below a 25 MiB individual-file upload limit. The early ambush remains a direct native MP4. All parts, manifests and the direct clip are required assets; building does not download missing footage.

Only the independently selected clip loads. For a split clip, the loader verifies each part and the complete SHA-256, then creates a `video/mp4` Blob URL for native playback. It does not re-encode, trim, reorder scenes or change audio. The full selected clip must finish downloading before its clock starts. Native seeking uses the completed local Blob; chunk requests do not require server byte-range support. The direct early clip can use the browser's normal progressive/range loading.

During loading, the accepted stake and outcome stay fixed and the timer is held. If playback needs a fresh gesture after loading, tap Resume to start the same selected round. Opening a menu or leaving the tab also holds playback. Missing or corrupt footage ends the unsuccessful load and refunds the unsettled stake once. Retry begins from a safe idle state. Blob URLs and in-flight loads are released when leaving or replacing the round.

To regenerate the parts from the five original MP4s, run `python scripts/prepare-browser-media.py --originals <original-video-directory>`. This optional preparation script verifies the native hashes and writes parts/catalogs inside this project. Originals are not re-encoded. The checked-in parts are sufficient for ordinary builds.

## Demo mechanics

Each accepted Play selects one of five outcomes independently with 20% probability using WebCrypto rejection sampling. Repeated outcomes are possible. The source outcome model is unchanged:

| Sequence | Kills | Round end | Total stake return |
|---|---:|---:|---:|
| SPRINT-002 | 2 | 30s | 1× |
| AMBUSH-001 | 1 | 9.9s | 0× |
| AMBUSH-003 | 3 | 21.8s | 0× |
| EXTRACT-005 | 4 | 30s | 5× |
| EXTRACT-1000 | 10 | 30s | 1,000× |

Native video time drives kills, survival and settlement. Fatal endpoints differ from full file lengths. An eliminated player receives zero regardless of prior kills. Multipliers are total returns after survival, not additional profit. There are no player aiming or shooting controls.

All money is demo money. This equal showcase mix has an expected total return of 201.2× stake. It does not implement the future 97% RTP concept or a 10,000-animation catalogue. Production probabilities and certification are not implemented.

## Verification

`npm test` covers the outcome model, fixed native-media hashes, part reconstruction, safe references, loading integrity, cancellation and retry. Browser playback, audible sound and responsive presentation still require actual browser review; automated byte checks do not establish those passes.

For deterministic local review, open `?qa=1` on localhost and call `window.__cashfireTest.forceNextOutcome(id)` before Play. Accepted rounds cannot be changed. Ordinary Play remains independently randomized.
