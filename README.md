# Paid to Raid

Playable cinematic survival prototype, with the selected Paid to Raid tactical logo integrated into the original presentation source. Game mechanics, video, audio and other artwork are preserved. Previous Call of Booty artwork and review evidence remain as historical assets.

## Play the included build

With Python 3 installed, run `python3 -m http.server 8080 --directory dist`, then open http://localhost:8080. Use an HTTP server, not a file URL. No account, backend, database or API key is needed.

## Develop and rebuild

Requires Node.js 20+ and npm:

```sh
npm ci
npm test
npm run dev
# Or create and preview a production build:
npm run build
npm run preview
```

The React source is in `src/`, original assets in `public/`, video chunks in `media-parts/`, and runnable production output in `dist/`. Build preparation verifies and copies the video chunks automatically.

## Prototype status

Balances are play money. Every round uses the supplied scripted 30-second sequence with two kills and survival; the 1× total return restores the stake, with no profit. Movement and aiming are not player-controlled. Higher-kill rewards are illustrative; randomized outcome selection, production probabilities, RTP validation and certification are not implemented.

The complete 45,642,600-byte combat video is preserved as eleven binary chunks. Preparation verifies SHA-256 `cbf5331b3cc4dc1ad43957e9048685b62979e9b5300244738d67684d79da9924`; the browser combines the chunks into an MP4 Blob before play. This avoids large individual uploads without re-encoding. Initial playback waits for the complete download. `scripts/restore-video.mjs` is optional legacy tooling; do not run it before deployment because it restores an oversized standalone MP4.

Fonts use external Fontshare/Google Fonts services with local fallbacks. All other runtime media are included.

## Verification of this update

Production build and all 7 game-logic tests passed. The original video checksum passed, the selected logo is present in source and build, and the gameplay logic is unchanged. Fresh browser visual/playback verification was blocked by this environment's browser/socket permissions. Existing screenshots and review reports in `docs/` describe the earlier title/build, not a new visual approval of Paid to Raid. Physical-device and audible-audio review are still unverified.
