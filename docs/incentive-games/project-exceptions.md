# Cashfire: Incentive Games exceptions and limitations

## Applicable standard and precedence

Apply the Incentive Games Design System skill entry point, release 1.0.0 approved 19 September 2026, to this project only. The entry point's explicit requirements supersede conflicting legacy reference documents: keep the main PLAY action centred on the game viewport, and use a scrollable three-column stake overlay rather than four columns or paginated stake tiers.

The four supplied control-bar Markdown references and `Header.png` are preserved under `reference/`. They establish available source evidence; they do not establish a Figma sign-off for this implementation. Do not mark this project signed, certified, pixel-perfect or an exact exported component implementation.

## Explicitly authorized exception

On 15 October 2026, the user requested: "in play remove the controls". For Cashfire this means unmounting betting/stake/PLAY controls during `starting`, `playing` and `paused`, restoring them after settlement or abort. Necessary pause/resume and mute access remain discreetly available. The kill meter moves into the game region as a HUD. This exception is local to Cashfire and does not alter the company standard or other projects.

## Unavailable standard resources

The main skill loaded, but the referenced rules, source map, tokens, acceptance files, exact exported control vectors and `scripts/attach_to_project.py` were not accessible. A bounded read-only search of nearby Codex projects and the local skill directory did not locate a replacement bundle. The attachment script was not run. Project-local instructions and the supplied references were recorded manually; this is not equivalent to installing the complete versioned standard bundle.

Current control glyphs use the project's existing `lucide-react` library. They are a disclosed fallback, not claimed to be the official exported IG vectors. Replace them with the approved exports when those become available. The official studio logo is not recreated: `public/assets/branding/studio-logo.png` preserves the 32,486-byte horizontal white PNG from `Incentive-Studios-Logos.zip`, entry `Incentive-Studios-Logos/PNGs/incentivestudios-logo-tertiary-white-fill@2x.png` (3434 x 386).

## Scope adaptations

- Free-bet, ante, autoplay, turbo, buy-bonus and cash-out modules are absent because the supplied game does not implement those capabilities. Their reference examples do not authorize new mechanics or invented balances.
- Header uses supplied navy `#0F1B39`, balance chip, official studio mark and info/menu hierarchy. The source screenshot's mock phone status framing is removed.
- This project's footer says LAST RETURN rather than LAST WIN because the deterministic demonstration returns the stake and has zero net profit at settlement.
- Existing optional cinematic mode hides header, footer and controller chrome during playback. Settlement now calls `setExpanded(false)` so betting controls and money context become visible again. This optional presentation does not replace the normal persistent shell.
- Compact action diameters and short-landscape layout are host-project adaptations; no exact compact Figma export was available. They require visual verification and must not be presented as a pixel-diff match.

## Static review and remaining checks

The independent reviewer inspected source only and did not operate the browser or native UI.

The following initial findings have been addressed in the source and were re-read after the main task's edits: header icon buttons retain 44px targets on narrow phones; control-layer labels render at least 10px; the stake overlay autofocuses its visible selected radio chip; settlement exits cinematic mode; and asynchronous playback start checks for an open dialog or hidden page before entering the playing phase. These are source-level confirmations, not claims of interaction-test passes.

Remaining review limits:

- The stage HUD, playback tools and mobile result use absolute positioning. Confirm legibility and absence of collisions in desktop and narrow-phone start, active, paused and settlement screenshots; source inspection cannot prove this.
- Some game-art/HUD labels are 8-9px. They are outside the shared control bar, but their real-device readability should be considered during visual review.
- Compact primary sizes, exact-control-vector parity and full Figma geometry were not independently verified. Retain the disclosed source-resource limitations above.
- The existing optional cinematic view hides balance during live playback. The normal shell preserves money context, and settlement restores it. Do not describe that optional full-viewport mode as a faithful approved shell variant without a corresponding reference.

Record actual final browser evidence in the main task's quality report; do not convert this source review into invented passing checks.

## Cashfire update,17October2026

The right-hand full paytable supersedes the earlier lower-left HUD description. Five equal-probability demo outcomes now exist, including two early deaths,5× and1,000× survivals. Current/next conditional money and actual settlement are separate; no97%RTP implementation is claimed. The live-phase hidden-controller exception is preserved. Desktop/phone/short-container review is pending because browser launch/IPC is denied in this environment. Local `.openai` metadata is unchanged and excluded from publication archives. See `../cashfire-update.md` for current facts.
