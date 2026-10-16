# IG Universal Control Bar — v1.3.1 Amendment: Stake Selector & Autoplay Popovers

Replaces §9.1 and §9.2 in full. Everything else in v1.3 SIGNED remains frozen. All tokens, type rules, and target minimums inherit from the v1.3 reference (token table, 44dp minimum targets, greyscale + green + amber, red licensed to STOP only). No new colours, no new fonts. Render deliverable at true 390dp device width.

---

## 0. Shared popover chrome (applies to both)

- **Form:** anchored popover, not bottom sheet. Fill `bar/bg-solid` #111111, corner radius 14dp, 1dp stroke rgba(255,255,255,0.10), no drop shadow beyond a 1dp rgba(0,0,0,0.4) edge.
- **Anchor tail:** 20dp wide, 12dp tall triangle, same fill, pointing at the owning control: stake selector tail → bet block centre (x=58); autoplay tail → autoplay cluster button centre (x=352).
- **Position:** popover bottom edge 10dp above the control bar top edge. Width 358dp (16dp insets). Max height: must fit above the bar within safe area at 390×844; if content exceeds, the popover scrolls internally — the header row and commit row pin, only the middle scrolls.
- **Dismissal:** scrim rgba(0,0,0,0.35) over game canvas only (header stays clear); tap scrim or the owning control to dismiss. No X button.
- **Open state on the bar:** while a popover is open, its owning control shows a 2dp white stroke.
- **Section labels:** 10sp/700, +1 letter-spacing, uppercase, `ui/grey-label` #9AA0A6. NOT amber — amber in these panels is reserved for active/required states only. (This deliberately diverges from the Hacksaw reference, which uses yellow section headers.)
- **Chips (shared component):** height 44dp, radius 8dp, min width 64dp, 8dp gaps. Rest: 1dp stroke rgba(255,255,255,0.15), text 14sp/500 white, transparent fill. Selected: 2dp stroke #FFFFFF, fill rgba(255,255,255,0.08), text 14sp/700. Pressed: fill rgba(255,255,255,0.12), 80ms. Disabled: 35% opacity. Exactly one chip selected per group at all times (radio semantics).
- **Commit buttons:** height 48dp, radius 10dp. Primary commit: fill `accent/green` #3B8F3E, text 13sp/700 white, +0.5 letter-spacing, uppercase. Secondary (RESET): transparent, 1dp stroke rgba(255,255,255,0.2), text `ui/grey-label`. Green appears on exactly one element per popover.
- **Disabled commit:** green at 35% opacity, non-interactive, haptic-reject on tap.

## 1. Stake selector (§9.1 replacement)

### 1.1 Layout, top to bottom
1. Section label: "SELECT STAKE".
2. **Stake grid:** 3 columns of chips, values from the operator ladder config, ascending, currency-formatted (£0.50, £2.00 — no trailing-zero truncation). Current stake pre-selected. Rows as needed up to 4 (12 values max on screen).
3. **Ladder overflow rule:** if the config ladder has >12 values, render a two-tab segmented control above the grid — "STANDARD" / "HIGH" — splitting the ladder at the config boundary `ladder.highTierIndex`. No scrolling stake lists anywhere, ever. If ≤12 values, tabs do not render.
4. **Info line** (11sp, grey label, white values), one line: "Max win at {selected}: {maxWin}". `maxWin` comes from LUT metadata `game.maxWinMultiplier × stake`, computed live on selection change. If metadata is unavailable, the line does not render — never show a placeholder.
5. **Commit:** "SET STAKE · {selected}" — the button text always carries the currently selected value and updates live.

### 1.2 Behaviour
- Tapping a chip selects it (updates info line and commit label) but does NOT apply the stake. Only SET STAKE commits, then dismisses.
- Dismissing without commit leaves the previous stake untouched.
- If ante bet is active, an amber ribbon renders between grid and info line: "Ante active · total per round = 2 × stake" and the commit reads "SET STAKE · {selected} (£{2×selected} TOTAL)". Stake-truth lock applies here too.
- No free-text entry. No "other amount". This is load-bearing for certification (stake ladder integrity); do not add it under any instruction that doesn't also amend the frozen register.
- While any round is live or autoplay is running: the bet block is non-interactive (v1.3 rule), therefore this popover cannot open. Do not build a read-only variant.

## 2. Autoplay popover (§9.2 replacement)

Two-tier progressive disclosure: BASIC always shown; ADVANCED expands below it.

### 2.1 BASIC tier, top to bottom
1. Header row: section label "AUTOPLAY" left; toggle button right — "ADVANCED ⌄" / "BASIC ⌃" (12sp/700, grey label, 44dp tap height). State persists per session.
2. Section label: "NUMBER OF ROUNDS".
3. **Rounds chip grid:** 4 columns, values from `autoplay.roundOptions` config. Regulated default: [10, 25, 50, 100]. First value pre-selected.
4. **Exposure line** (11sp): "Total staked if uninterrupted: {rounds} × {stake} = {total}", live-updating, white values. With ante active, uses the true per-round debit and appends "(incl. ante)".
5. **Commit row:** RESET (flex 1) + "START · {rounds} ROUNDS" (flex 2).

### 2.2 ADVANCED tier (expands between exposure line and commit row)
Order: loss limit, single win limit, stop-on-feature.

1. **"LOSS LIMIT"** label; if the build is regulated (see 2.4), append an amber tag "ALWAYS ON" (9sp/700, amber, 1dp amber stroke pill).
   - Chip row from `autoplay.lossLimitOptions`, values as bet multipliers rendered "10× BET", "25× BET", "50× BET", plus "CUSTOM". Regulated default pre-selected: `autoplay.lossLimitDefault` (recommend 25×).
   - CUSTOM selected → a stepper row appears below (44dp − / value field / 44dp +), stepping in whole bet multiples, floor 1×, currency preview beside it: "= £{value×stake}".
   - **"NO LIMIT" chip renders only when `autoplay.allowNoLossLimit = true`** (never true in UK-derived, Ontario, or US builds). When absent, it reserves no space.
2. **"SINGLE WIN LIMIT"** — same chip pattern, `autoplay.winLimitOptions` (recommend 10×/25×/75×/CUSTOM), plus "NO LIMIT" gated by `autoplay.allowNoWinLimit`. Optional in all markets: NO LIMIT may be default where allowed; where not allowed, default is the largest chip.
3. **"STOP ON FEATURE WIN"** — label + toggle (44×24dp track, amber fill when ON, grey rgba(255,255,255,0.15) when OFF, knob #111 on amber / #9AA0A6 on grey). Default from `autoplay.stopOnFeatureDefault` (recommend ON in regulated builds). Renders only if the game's LUT metadata declares a feature (`game.hasFeature = true`).

### 2.3 Running state and stops
- START commits, dismisses, and hands count to the autoplay cluster button per v1.3 (amber stroke, count on the cluster button, primary dimmed 60% with label, tap cluster button = immediate stop).
- Every stop MUST emit a reason toast in the standard toast lane, 3s: "Autoplay stopped · {reason}" where reason ∈ {loss limit reached, win limit reached, feature triggered, rounds complete, stopped by player, insufficient balance}. A silent stop is a defect.
- Reopening the popover after a stop restores the last-used configuration.
- Balance insufficient for the next round at current total debit → stop with reason, never partial-stake a round.

### 2.4 Config schema (per market build)
```
autoplay: {
  enabled: bool,                  // false = no cluster button, no popover, no menu row
  roundOptions: [int],            // e.g. [10,25,50,100]; .com may add 500,1000
  allowInfiniteRounds: bool,      // renders ∞ chip; false in ALL regulated builds
  lossLimitOptions: [int],        // bet multipliers
  lossLimitDefault: int,          // pre-selected; required > 0 when allowNoLossLimit=false
  allowNoLossLimit: bool,         // false in regulated builds
  winLimitOptions: [int],
  allowNoWinLimit: bool,
  stopOnFeatureDefault: bool,
  forceAdvancedOnFirstUse: bool   // market requires limits SHOWN before first start
}
```
- When `allowNoLossLimit = false`, START must be provably un-startable without a positive loss limit; since a default is always pre-selected, this holds by construction — assert it in tests anyway.
- `forceAdvancedOnFirstUse = true` → first-ever open per player renders with ADVANCED expanded and non-collapsible until START or dismiss.
- Gating is component-mount level, not visibility (v1.3 rule). A UK-derived build with autoplay disabled contains no reachable autoplay code paths from UI.

## 3. Acceptance evidence (deliver as files, not checkmarks)
1. Renders at 390dp: stake selector (idle, ante-active), autoplay BASIC, autoplay ADVANCED (regulated config), autoplay ADVANCED (.com config with NO LIMIT/∞ present) — 6 crops.
2. Measured overlay proving every chip, stepper, and toggle ≥44dp tap.
3. Colour grep: panels contain only token-table values; zero yellows, oranges, navies.
4. State assertions: chip radio semantics; SET STAKE carries live value; START disabled path unreachable in regulated config; stop-reason toast fires for all six reasons.
5. Stake-truth crops: ante-active stake selector commit label and autoplay exposure line showing true debit.

## 4. Explicitly out of scope
- Turbo has no popover (hold-gesture + cluster toggle only, per v1.3).
- No changes to bar geometry, header, or any frozen element.
- Cashout remains deferred to v1.4.
