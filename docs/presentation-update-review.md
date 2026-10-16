# Call of Booty presentation update — 15 October 2026

## Delivered changes

- New transparent shooter-and-title logo in the existing industrial combat direction.
- Authentic supplied Incentive Studios wordmark, navy header, balance chip, info/menu controls, centred green PLAY action, stake chevrons and compact bet/last-return footer.
- Scrollable three-column fixed stake picker. A draft selection applies only through SET STAKE; Escape dismissal preserves the previous stake.
- Betting controls unmount during starting, playing and paused phases. They return at settlement or media abort. Discreet pause/resume and mute remain in the game.
- Kill count, progress ticks and survival return move into a compact HUD inside the footage. Settled returns remain pinned to the accepted round stake even when the next stake changes.
- Settlement exits cinematic mode. Playback startup respects a dialog or hidden page interruption.

## Verification

Production build passed. All seven existing mechanics tests passed. The preparation step verifies all 45,642,600 original combat-video bytes against SHA-256 before building. `src/game.js`, `src/audio.js` and both supplied WebP files remain unchanged.

Actual browser review covered 1280 × 720 desktop, 375 × 667 narrow phone, and 390 × 844 portrait layouts. The document matched the viewport with no page scrolling at measured desktop and narrow-phone ready/live/settled states. The primary action uses the intended `rgb(59, 143, 62)` green. The new logo and HUD were visually inspected. An observed ready-screen hint/HUD collision was removed and the title group was moved upward.

Desktop and narrow-phone natural rounds each settled at two kills and a 1× total return, restoring the £1,000 demo balance. During play the controller was absent from the DOM, the balance reflected exactly one debit, and the HUD remained inside the stage. Desktop rules opened with playback paused. A cinematic pause held its exact media clock (15.763024 seconds) across separate observations; unmuting preserved the pause. The £100 maximum stake fit at 375px. The phone stake grid measured three columns with internal scrolling, a 300px viewport and 414px content, with the commit action visible.

An additional uninterrupted desktop round started in cinematic mode and automatically exited it at settlement. The actual controller visibility was `visible`, the balance was £1,000, and the returned amount was £10.00. Original media fetched successfully from the local HTTP server, reconstructed to 45,642,600 bytes, and matched the supplied SHA-256.

Review screenshots are in `evidence/shell-update/`: desktop ready/active/paused/settlement/cinematic-settlement, narrow-phone ready/active/paused/settlement/stakes and tall-phone ready.

## Scope and limitations

This remains the supplied deterministic play-money demonstration: 30 seconds, two eliminations, survival, and the stake returned with zero net profit. There is no random outcome pool, production RTP, real wallet, server settlement or aiming/shooting input.

The approved control reference bundle and exact exported control vectors were unavailable. The supplied local references and original studio wordmark were used; existing Lucide control glyphs are a disclosed fallback. Compact geometry is adapted for the game and is not claimed to be pixel-perfect Figma output. See `incentive-games/project-exceptions.md`.

Browser viewport tests are not physical-phone tests. Audible playback has not been independently assessed; original embedded combat audio and interface-audio source are preserved, and video mute state was checked. Connection interruptions during QA were infrastructure issues; completed checks were retained and the preview was restarted when the host returned.
