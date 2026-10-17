# Cashfire update — 17 October 2026

The runtime, package metadata, title treatment and favicon now use Cashfire. The full right-hand paytable is driven by the existing `PAYOUTS` array, with all eleven kill tiers from 0× to 1,000×, current/next markers, conditional total returns and settled returns. Multipliers are total stake returns, not additional profit. The table is internally scrollable in very short containers.

## Five-outcome demonstration

One outcome is chosen once after Play acceptance. Each has 20% demo probability. Pause, resume, dialogs and visibility changes retain that accepted outcome. Settlement is guarded so a round credits at most once.

| ID | Presentation | Duration | Kills | Result |
|---|---|---:|---:|---:|
| SPRINT-002 | Original supplied video | 30s | 2 | survives, 1× |
| AMBUSH-001 | Animated dock-side ambush | 12.5s | 1 | eliminated, 0× |
| CROSSFIRE-003 | Animated warehouse crossfire | 22s | 3 | eliminated, 0× |
| EXTRACTION-004 | Animated warehouse extraction | 30s | 4 | survives, 5× |
| CASHFIRE-010 | Animated dock-to-warehouse waves | 30s | 10 | survives, 1,000× |

The four additional scenes are procedural animated cutout simulations using photographic background plates, generated enemy artwork, timed entry, firing, collapse and camera motion. They are not newly filmed video clips. The original video and embedded audio bytes are preserved exactly. Existing interface sounds are preserved; a short synthesized shot cue is added only to the four simulations and follows the same firing timestamps as their visual effects.

Elimination cancels all conditional return, even after confirmed kills. The accepted stake remains pinned through the result. History records the actual kills, return, survival and outcome ID; cumulative session net is separate from the last twenty displayed records.

This is a play-money showcase mix. Its equal five-way selection is not a 97% RTP model: the arithmetic expected total return of this mix is 201.2× stake. The future catalogue of 10,000 animations, lookup weighting and 97% target remain unimplemented and unvalidated.

## Source and publication boundaries

The separate working copy was reconstructed from a complete local original whose 69 original files matched the parent's verified archive hashes. The parent confirmed gameplay, CSS, tests, dependency versions, media and all eleven video chunks match Paid to Raid commit `f06bc79f66cb396e0eaecaa9c1b707123d220ea9`; latest differences were branding/docs replaced in this task. The original local project was not edited.

Local hosting metadata and the optional restore-video script remain in the working copy. `.openai` hosting identity is excluded from the upload/publication source archive. No Sites publication, repository rename, visibility change, public Pages enablement or credential/security/network change was performed.

## Validation and remaining review

All thirteen game-model tests pass, covering all five timelines, kill boundaries, early deaths, exact configured returns, immutable fixtures, equal selection boundaries and invalid random sources. Visual-state checks verify each procedural kill has a corresponding collapse and both death scenes reach their terminal camera state.

The standard Vite command is blocked locally by Node child-process `spawn EPERM`. A static bundle is produced with the existing installed esbuild CLI invoked directly, followed by Tailwind/PostCSS processing. This does not change the project dependency versions or security configuration.

Windows browser execution is blocked: Playwright child launch returns `spawn EPERM`; direct sandboxed Chromium reports access denied in its Mojo IPC/crashpad initialization; browser UI transport was unavailable. No browser gameplay, responsive geometry, screenshot or audible-audio pass is claimed. The supplied QA harness is ready for the parent's functioning browser environment.

For deterministic local fixtures, open a localhost preview with `?qa=1`, then call `window.__cashfireTest.forceNextOutcome(id)` before Play. It rejects changes during a live round. Ordinary Play remains random. The helper is also available in Vite development mode; it is absent on normal nonlocal production URLs. `window.advanceTime(ms)` advances the accepted round without selecting a new outcome.
