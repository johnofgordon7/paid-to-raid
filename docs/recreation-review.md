# Source recreation review

Recreated from `Call of Booty  Source Code.zip` on 15 October 2026 in a separate project. The original archive is intact. The supplied game source, artwork, combat video and generated interface audio are preserved without gameplay or design changes. Hosting rejected the original 45.6 MB Git object and then the 45,642,600-byte deployed MP4 exceeded the 25 MiB (26,214,400-byte) per-asset limit. Source packaging therefore stores 11 exact binary video parts. Before dev/build, preparation verifies their combined SHA-256 and copies them into deployable assets. The browser downloads the parts and combines them into a `video/mp4` Blob URL containing every original video and audio byte. No re-encoding is used; playback waits for the complete download. Any existing full local MP4 is preserved in ignored `.sites-runtime/original-sprint.mp4`, outside `public/` and `dist/`.

## Scope

This is the supplied local play-money prototype: a deterministic 30-second combat sequence, two scripted kills, survival and 1x total stake return. Random outcomes, the proposed outcome library, target RTP, production wallet integration and certification are absent from the source. They have not been added or represented as implemented.

Reviewed under Sites, Incentive Studio Game Template 1.0.0, Incentive Games Design System 1.0.0, Game Layout Studio 1.1.0, Real-Money Game UX 1.0.0 and Game Quality Review 1.0.0. This task preserves the requested reference composition. Shell migration, new Outcomes fixtures and new art direction are outside this source-restoration scope. Some personal-skill reference bundles/attachment scripts were unavailable in the selected environment.

## Checks

- All seven supplied game-logic tests passed on Node 26.10.0.
- Vite 5.4.21 production build passed.
- Built index responds HTTP 200 with the correct Call of Booty title.
- HTTP chunk loading and Blob reconstruction passed: 45,642,600 bytes, video/mp4, exact original SHA-256. The largest deployed file is 4,194,304 bytes, below the 25 MiB limit.
- Extracted media and the combined 11 video parts are checked against original archive bytes with SHA-256.
- Static source review found guarded single debit, settlement and playback-error refunds; responsive styles exist for portrait and landscape layouts.
- A natural desktop round completed at two kills, returned the £10 stake exactly once, restored £1,000 balance and created one history record.
- A second natural mobile round at £5 completed with the correct return and restored £1,000 balance after pause/resume and the rules dialog.
- Invalid £0.09 stake disabled Play; mute changed the media element's muted state; pause kept the media clock unchanged; opening rules paused playback.
- Actual browser screenshots inspected at 1280×720, 390×844, 375×667 and 844×390. Controls and results were reachable; phone layouts had no horizontal overflow, and the 375×667 layout had no document scrolling. The original desktop composition retains a small vertical document scrollbar with all main controls visible.
- Browser console error log was empty during these checks. Eight screenshots are retained in `docs/evidence/`.

## Verification limits

The browser connection recovered and the final Blob playback was exercised through two natural rounds. Phone checks used browser viewport emulation, not physical devices. Audible audio review, actual network-error recovery, reduced-motion/enlarged-text checks and the brief starting-phase interruption edge case were not tested. Original video/audio bytes and generated interface-audio source are preserved.

The original fonts use Fontshare and Google Fonts with fallback fonts. The local demo balance/history reset on reload. Opening a dialog or hiding the page during the brief initial starting phase may miss automatic pause; this existing edge case is untested.

## Run

Use the README commands: `npm ci`, `npm test`, `npm run dev`. For hosting, `npm run build` produces `dist/`. No backend, database or API key is required.
