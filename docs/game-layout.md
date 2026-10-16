# Call of Booty game layout

## Scope and references

This document describes the Call of Booty shell update requested on 15 October 2026. It does not change the supplied deterministic combat sequence, media, payout ladder, or settlement logic.

The applicable personal skill is Incentive Games Design System release 1.0.0, approved 19 September 2026. Its entry point was read from `skill://user/6aae28f71b0c8191a5e21328d26ac8d4/incentive-games-design-system/SKILL.md`. Its referenced child-resource bundle was unavailable in this session.

Available supplied visual and written references are stored in `incentive-games/reference/`:

- `Header.png` (390 x 96 source screenshot).
- `IG_Universal_Control_Bar_Spec_v1.md`.
- `IG_Control_Bar_v1.3.1_Popover_Amendment.md`.
- `IG_Control_Bar_v1.3.2_Change_Request.md`.
- `IG_Control_Bar_v1.3.2_Master_Flow_Directive.md`.

These are reference materials, not proof that this implementation has a Figma approval or pixel-diff sign-off. Conflicting older requirements defer to the installed skill: the primary action is centred on the game viewport, and the stake overlay is a scrollable three-column grid. The source screenshot's mock phone time/battery/status framing is omitted.

## Layout contract

The app fills the available viewport with page scrolling disabled. In normal presentation it stacks a navy header, a flexible game view, betting controls when no round is live, and a compact bet/last-return footer. Artwork, timer, objectives, kill feedback and result art stay inside the game region.

The header provides the current demo balance, the authentic Incentive Studios wordmark, How to Play and Menu. It uses the source screenshot's sampled navy `#0F1B39`. No fake free-bet value is introduced: the supplied prototype has no free-bet balance or feature.

The betting controller has a dark 64px bar, BET label above the stake amount, a decorative white underline, stacked stake chevrons and a green circular PLAY button. PLAY is horizontally centred even without optional controls. The regular primary diameter is 108px; compact breakpoints currently reduce it to 96px below 379px width and 90px for short landscape viewports. These adaptations are recorded separately from the approved reference geometry.

Stakes come from the operator-style fixed ladder in `IncentiveShell.jsx`. The overlay renders three columns with internal scrolling. A chip changes only the draft selection; SET STAKE commits it. Dismissal leaves the committed stake unchanged. The next-round stake and the stake pinned to the settled round are separate values.

The kill meter is an in-game HUD at the lower left, not a side panel. It shows kills out of ten, a segmented progress track, the conditional survival return while playing, and the actual total returned at settlement. It is not interactive and uses `pointer-events: none`. The centre of combat is kept clear; narrow settlement presentation widens the HUD along the lower edge. Pause, mute and cinematic-view access sit at the lower right.

## State layout

| State | Betting controller | Game region | Money context |
|---|---|---|---|
| Idle/loading | Present; PLAY disabled until media and valid stake are ready | Title artwork, scene and HUD | Selected next-round stake |
| Starting/playing | Unmounted | Full available combat area and integrated kill HUD; discreet playback tools | Accepted round stake, balance after debit |
| Paused/buffering | Unmounted | Timer and round remain held; pause/resume or buffering feedback | Accepted round stake remains pinned |
| Complete | Restored; settlement also exits cinematic view | Extraction result plus settled kill HUD | Settled return remains based on the accepted round stake |
| Media abort | Restored | Retry feedback | Unsettled stake is refunded by existing round logic |

Hiding betting and PLAY controls during all live phases is the user's explicit game-specific exception. It does not remove the normal header or money footer. The existing optional cinematic view is separate: it covers the viewport and hides shell chrome during playback. Settlement automatically exits cinematic view so the normal controller and money context become visible again.

## Implementation and review

Shell components are in `src/IncentiveShell.jsx`; shell overrides are in `src/ig-shell.css`, imported after the original styles; state composition and the integrated kill HUD are in `src/main.jsx`.

This document was prepared from source inspection only. No browser or native UI interactions were performed by this reviewer. Desktop and narrow-phone start, live play and settlement must be evidenced by the main task's screenshots and checks. The final deliverable must not claim pixel-perfect Figma matching, exported-icon parity, physical-device verification, or audible-audio verification unless those checks actually occur.
