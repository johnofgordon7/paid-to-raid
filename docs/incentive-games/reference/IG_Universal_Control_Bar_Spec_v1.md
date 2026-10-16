# IG Universal Control Bar — Build Specification v1.0

Reusable control layer for all Incentive Games LUT-based titles (drop / hit / slot). One certified core layout; jurisdiction-restricted features mount as removable satellite modules. Portrait mobile first (reference viewport 390×844 @1x; all values in dp/pt, scale linearly).

---

## 1. Design principles (non-negotiable)

1. The bar is greyscale. Exactly two accent hues exist in the entire control layer: GREEN (primary action + winnings) and AMBER (active modifiers). No other element may ever be coloured.
2. The primary button is the largest interactive object on screen and overflows the bar's top edge.
3. The displayed stake ALWAYS equals the actual per-round debit. If any modifier (ante bet) changes the debit, the headline number changes and the label switches to "TOTAL BET".
4. Jurisdiction-restricted features (autoplay, turbo, buy bonus) are satellites that mount/unmount by config flag. The layout must look complete with zero satellites mounted. They never occupy positions inside the bar itself.
5. All interactive targets ≥ 44×44 dp.
6. One meaning per colour. Green never indicates state; amber never indicates action.

---

## 2. Colour tokens

| Token | Hex | Usage |
|---|---|---|
| `bar/bg` | #0A0A0A @ 92% opacity | Control bar, header bar, toasts, modals |
| `bar/bg-solid` | #111111 | Satellite fills, modal panels |
| `ui/white` | #FFFFFF | Primary text, icons, chevrons |
| `ui/grey-label` | #9AA0A6 | Field labels (BET, BALANCE), secondary text |
| `ui/grey-line` | rgba(255,255,255,0.12) | Hairline dividers, inactive strokes |
| `accent/green` | #3B8F3E | Primary action button fill ONLY |
| `accent/green-text` | #5DCAA5 | Win amounts in toasts ONLY |
| `accent/amber` | #F5A623 | Active-modifier rings, chips, ante toast highlights ONLY |
| `accent/amber-deep` | #854F0B | Amber chip background fill |
| `danger/stop` | #BA7517 | In-play stop-state button fill |

Hard rule for the builder: any colour not in this table is a spec violation. No gradients, no glows, no drop shadows on the bar (a single 1dp rgba(0,0,0,0.4) edge is permitted under the primary button for lift).

## 3. Typography

- Font: single geometric sans (Inter or equivalent), weights 500 and 700 only.
- Labels (BET, TOTAL BET, BALANCE, WIN): 10sp, weight 700, letter-spacing +1, uppercase, `ui/grey-label`.
- Stake amount: 22sp, weight 700, `ui/white`.
- Balance amount: 13sp, weight 700, `ui/white`.
- Toast text: 13sp, weight 500; win amounts weight 700 in `accent/green-text`.
- Minimum rendered text anywhere: 10sp.

---

## 4. Layout — header bar

Full-width strip, top of viewport, height 44dp, fill `bar/bg`.

- Left: "BALANCE" label + amount, single line, 14dp inset.
- Right: two icon buttons, 44×44 tap area each, 20dp icons, `ui/white`: info (ⓘ) and hamburger menu. 8dp between them, 14dp right inset.
- Free bets: NOT in the header. When free bets exist, show as a one-line amber chip toast (see §7) on game load and on balance change; the balance dropdown (tap balance) lists cash / free bets / bonus balances.

## 5. Layout — control bar

Anchored 22dp above the bottom safe-area edge, horizontal insets 14dp, height 64dp, fill `bar/bg`, corner radius 12dp. Left-to-right:

### 5.1 Bet block
- Position: left inset 14dp, vertically centred.
- Label: "BET" (or "TOTAL BET" when a modifier is active — see §8.3).
- Amount below label, 2dp gap.
- Decorative underline: 34×3dp, `ui/white`, radius 2dp, 4dp below amount. Purely decorative — it must NOT encode autoplay progress or any state.
- Tapping the bet block opens the stake selector sheet (§9.1). Tap area: full block, min 64×64.

### 5.2 Stepper (chevron stack)
- Position: 12dp right of bet block, vertically centred.
- Two stacked buttons: chevron-up above chevron-down.
- Each button: 44×30dp visual, 44×32dp tap area, 2dp vertical gap between them. Icon 18dp, `ui/white`, no background fill at rest; pressed state fill `ui/grey-line`.
- Behaviour: steps through the operator-configured stake ladder. Long-press = auto-repeat at 6 steps/sec after 400ms hold. At ladder min/max, the relevant chevron drops to 35% opacity and emits haptic-reject on tap (never removed).

### 5.3 Primary action button
- Circle, 108dp diameter, centre positioned 58% of bar width from left edge, vertically overflowing the bar so its centre sits 10dp above the bar's top edge.
- Fill `accent/green`, icon `ui/white` 48dp, 3dp ring `bar/bg-solid` (separates it from any art behind).
- Icon by vertical: slot = spin arrows; drop = downward release arrow; hit = play triangle. Icon is configurable per title; button geometry is not.
- Tap area: 116dp circle.
- Press animation: scale 0.94, 120ms ease-out, haptic-medium.
- Idle attract: subtle 4% scale pulse, 2.2s loop, pauses during play. No colour animation.

### 5.4 Last win
- No persistent win row in the bar. Wins render as toasts (§7).

## 6. Satellites (jurisdiction-gated modules)

Circular buttons orbiting the primary button's right side. Fill `bar/bg-solid`, 2dp stroke `ui/grey-line` at rest, icon 18dp `ui/white`. Diameter 44dp, tap area 48dp.

Fixed anchor slots relative to the primary button centre (angle from 12 o'clock, distance from primary centre):
- Slot A (turbo): 55°, 92dp.
- Slot B (autoplay): 95°, 92dp.
- Slot C (buy bonus): 20°, 96dp. Buy-bonus stroke and icon use `accent/amber` at rest (it is a monetary action) and it carries a price tag: 9sp "$10" pill below the circle, `bar/bg` fill, `ui/white` text. Price always visible before tap.

Unmounted slots render nothing and reserve no space. Any subset (including none) must look intentional — verify visually in the four configs: {}, {A}, {A,B}, {A,B,C}.

Active states: turbo-on and autoplay-running swap the stroke and icon to `accent/amber` and (autoplay only) replace the icon with the remaining-rounds count in 14sp/700. The count must be legible at all times while autoplay runs — this is a UKGC RTS-style requirement pattern; never encode remaining rounds in a progress line.

## 7. Toast system

Single toast lane, centred horizontally, bottom edge 96dp above the control bar top. One toast at a time; new replaces old with 150ms crossfade. Pill: `bar/bg` fill, radius 20dp, padding 8×16dp.

- Win toast: "WIN $12.34" — label `ui/grey-label`, amount `accent/green-text`. Shows on settle, holds 2.5s (or until next round starts).
- Ante toast: "$2.00 + $2.00 ante = $4.00" — equation in 12sp `ui/grey-label`, result in `ui/white` 700, "ante" word in `accent/amber`. Shows for 4s whenever ante toggles on, and on every stake change while ante is active.
- Free-bet toast: "FREE BET $3.00 APPLIED" in amber styling, on relevant rounds.

## 8. States

### 8.1 Idle
As specified above. Primary shows vertical-appropriate go icon.

### 8.2 In-play
- Primary fill changes to `danger/stop`, icon to stop-square (drop/hit verticals where a round can be ended/settled) or remains green and disabled at 60% opacity (slot vertical, uninterruptible spin).
- Stepper chevrons: 35% opacity, non-interactive, tap emits haptic-reject. Bet block non-interactive.
- Satellites remain interactive (turbo may be toggled mid-session; buy bonus disabled at 35% opacity during a live round).

### 8.3 Modifier active (ante bet)
- Bet label switches to "TOTAL BET"; amount shows the true debit (e.g. $4.00).
- 2dp `accent/amber` ring around the bet block, radius 8dp.
- Ante toast per §7.

### 8.4 Bonus active (chaos mode etc.)
- Amber chip docked 8dp above the bar, left-aligned with bet block: `accent/amber-deep` fill, 1dp `accent/amber` stroke, radius 20dp, text 11sp `ui/white` 700: "CHAOS MODE · 8 ROUNDS LEFT". Counter decrements live.
- Buy-bonus satellite hidden while a bought bonus is active.
- Never green. Never on or near the primary button.

### 8.5 Buy-bonus confirm (modal)
- Full-screen scrim rgba(0,0,0,0.55) above game canvas, below header.
- Panel: 260dp wide, `bar/bg-solid`, radius 14dp, centred.
- Contents top-to-bottom: title "Buy chaos mode" 15sp/700 white; line "One-off cost $10.00" 12sp grey with price white/700; line "Your stake stays $2.00. No recurring charge." 11sp `accent/amber` — this line is mandatory and must state the current stake dynamically; confirm button full-width 48dp, `accent/amber-deep` fill, amber stroke, "Confirm purchase · $10.00"; cancel button full-width 44dp, transparent, 1dp `ui/grey-line` stroke. Cancel is always reachable; scrim-tap also cancels.

## 9. Sheets and menu

### 9.1 Stake selector sheet
Bottom sheet, `bar/bg-solid`, radius 16dp top corners. Grid of stake ladder values, 4 columns, cells 64×44dp, selected cell 2dp white stroke. Values from operator config. Close on select or scrim tap.

### 9.2 Autoplay sheet (only if autoplay satellite mounted)
Bottom sheet. Round count options as segmented buttons (10/25/50/100 per config). Mandatory loss-limit field (must be set > 0 to enable START), optional single-win stop and win-limit stop. START button 48dp full-width green — the single exception where green appears off the primary button, because it initiates play. RESET secondary. All limits enforced client- and server-side.

### 9.3 Menu (hamburger)
Right-anchored dropdown, `bar/bg-solid`: How to play, Paytable/Odds, User history, Sound (toggle), Music (toggle), Exit game. Turbo/auto entries appear here ONLY as duplicates when their satellites are mounted. Exit game always last, always present.

---

## 10. Jurisdiction configuration matrix

Single JSON config per market build. Features not in config do not render anywhere (bar, satellites, sheets, menu).

| Feature | UK | Ontario | US (state-dep.) | Brazil | Italy |
|---|---|---|---|---|---|
| Autoplay satellite | OFF | ON | per state | ON | ON (capped) |
| Turbo satellite | OFF | ON | per state | ON | ON |
| Buy bonus satellite | OFF | ON | per state | ON | verify |
| Min round time enforcement | 2.5s | none | per state | none | verify |
| Ante bet | ON (with §8.3 treatment) | ON | ON | ON | ON |

Config keys: `autoplay.enabled`, `autoplay.maxRounds`, `turbo.enabled`, `buyBonus.enabled`, `minRoundMs`, `lossLimitRequired`. The builder must implement gating at the component-mount level, not visibility toggles (`display:none` of a prohibited feature is a cert finding).

## 11. Motion

- All transitions 120–200ms, ease-out. No bounces, no elastic, no colour animation except state swaps.
- Primary press: scale 0.94 / 120ms. In-play swap: crossfade icon 150ms.
- Toast in/out: 150ms fade + 8dp rise.
- Turbo mode: multiplies game-canvas animation speed only; control-layer timings never change.

## 12. Acceptance checklist (builder must self-verify)

1. Screenshot each of the 4 satellite configs — no layout gaps in any.
2. Contrast: white-on-`bar/bg` ≥ 7:1 over the worst-case light art frame.
3. Every tap target ≥ 44dp measured, including chevrons and satellites.
4. With ante active, headline stake equals server-side debit exactly, at every ladder value.
5. Grep the stylesheet: zero colour values outside §2 table.
6. Autoplay-remaining count legible in a 100% zoom screenshot during play.
7. UK config build contains no autoplay/turbo/buy-bonus code paths reachable from UI.
8. Green appears in exactly two places (primary button, win/START), amber only on modifier states and the buy-bonus monetary affordance.

## 13. Out of scope / open decisions (do not improvise)

- Live in-flight cashout button for crash-style rounds: NOT in this spec. If a title requires it, the spec must be revised — do not repurpose the primary button or a satellite slot without a v1.1.
- Landscape layout: not specified; portrait only.
- Operator co-branding of the bar: prohibited pending explicit approval.
