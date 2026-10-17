# Cashfire

Source code for the current Cashfire cinematic game prototype. This archive includes the React application, styling, game logic, tests, build configuration, and all video and image assets used by the game.

## Run locally

Use Node.js 20 or later and npm. The project was built and tested with Node.js 20.20.2 and npm 10.8.2.

From this folder, run:

```sh
npm ci
npm run dev
```

Open the local address printed in the terminal, normally port 5173. Choose a demo stake and press Play.

## Build and test

```sh
# Run the game-logic tests
npm test

# Create the static production build
npm run build

# Serve the production build locally
npm run preview
```

The production files are generated in `dist/`. Deploy the entire contents of that directory, including `assets/`, to a static web host; no backend, API key, or database is required.

Use an HTTP server to view the build rather than opening `index.html` directly from the filesystem. Keep the development server private; use the static production build for deployment.

Windows browser automation remains blocked by child-process/IPC permissions for this update. Desktop/mobile screenshots, interaction playback and audible review require a final check in a functioning browser environment; see `docs/recreation-review.md`.

## Project contents

- `src/main.jsx`: application, video playback, wallet, stake controls, HUD, dialogs, and settlement flow.
- `src/game.js`: demo timeline, payout ladder, stake validation, and money calculations.
- `src/style.css` and `src/base.css`: visual design and responsive layout.
- `src/ui.jsx`: reusable interface components.
- `src/audio.js`: interface sound effects.
- `public/assets/`: opening and extraction images, plus generated combat video parts.
- `media-parts/`: the original sprinting combat video stored as 11 exact binary parts and its manifest.
- `scripts/prepare-media.mjs`: verifies the original video bytes and prepares the browser-loadable parts before dev/build.
- `public/favicon.svg`: game favicon.
- `tests/game.test.js`: timeline, payout, validation, and accounting tests.
- `package-lock.json`: locked dependency versions for reproducible installation.
- `vite.config.js`, `tailwind.config.js`, and `postcss.config.js`: build configuration.

## Current demo behavior

Play accepts one demo stake and randomly selects one of five equally likely canned outcomes, fixed until that round settles: original30-second two-kill1× video; two different early eliminations at12.5s and22s returning0×; four-kill30-second survival at5×; ten-kill30-second survival at1,000×. Returns are total stake returns. Elimination pays zero regardless of prior kills.

The four new outcomes are procedural animated cutout combat simulations, not newly filmed clips. Their enemy entry, fire, hit/collapse, death and extraction timing follow the selected fixture. The original video/audio bytes are preserved. See `docs/cashfire-update.md` for implementation and review limits.

All balances are play money. Equal five-way demo selection is a showcase distribution, not97%RTP. The future10,000-outcome animation catalogue, lookup weighting, mathematical validation and certification are not implemented.

## Assets and dependencies

The original 45,642,600-byte combat video exceeds the Site host's 25 MiB (26,214,400-byte) limit per asset. It is stored as 11 exact binary parts under `media-parts/`. Before dev/build, `scripts/prepare-media.mjs` verifies that their combined SHA-256 matches the original MP4 and copies the parts and manifest into the generated `public/assets/sprint-parts/` directory. The browser fetches those parts and combines them into a `video/mp4` Blob URL. This preserves every original video and audio byte without re-encoding. The full video must download before playback can start.

If the full original MP4 already exists locally, preparation preserves it under ignored `.sites-runtime/original-sprint.mp4`, outside deployable assets. The legacy `scripts/restore-video.mjs` remains for optional original-file inspection; it is not used by dev/build. Do not run it after preparation when deploying, because it places the oversized MP4 back under `public/assets/`.

The video parts and images are included in this source package. The Satoshi and Barlow Condensed fonts are loaded from Fontshare and Google Fonts through `index.html`; self-host the fonts or use the existing fallbacks if a fully offline presentation is needed.

Dependencies are installed with `npm ci`, so `node_modules/` is intentionally excluded. Build output, repository history, development logs, and test screenshots are also excluded.

The runtime title, package metadata, game logo and favicon use Cashfire branding. The right-side paytable shows every configured tier through 1,000×, the current tier and the next kill's conditional total return. This is a presentation update; the authored round and audio are preserved.
