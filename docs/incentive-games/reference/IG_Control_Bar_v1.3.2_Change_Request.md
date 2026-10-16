# IG Universal Control Bar — v1.3.2 CHANGE REQUEST: Labelled Utility Cluster

Scope: exactly one change — the two circular utility cluster buttons become labelled rectangular buttons. Everything else in v1.3 SIGNED and v1.3.1 SIGNED is unchanged and remains frozen. The solid-amber buy-bonus treatment and the segmented BASIC/ADVANCED control seen in the rejected Brazil render are REJECTED and must not appear. This document contains the solved geometry; the builder renders it once and attaches evidence. No creative interpretation is requested or permitted.

---

## 1. Rationale (for the record)
Bare 18dp glyphs scored poorly on discoverability and the autoplay glyph had an open legibility question at real device size. A labelled button resolves both. Accepted as a v1.3.2 change via this request; the circular cluster in v1.3 becomes the FALLBACK variant (see §5).

## 2. Solved geometry (portrait, 390dp reference — all rows must reconcile)

Unchanged from v1.3: left inset 16 · bet block 16–100 (84) · gap 12 · stepper 112–160 (48) · gap 10 · primary 170–278 (Ø108, centre 224 = 58% of bar width) · right inset 374–390 (16).

Changed region — the former reserved zone + circular cluster (278–374, 96dp) becomes:

| Element | Left x | Right x | Width | Notes |
|---|---|---|---|---|
| Spacing (primary → buttons) | 278 | 288 | 10 | reserved; nothing renders here |
| Utility buttons (both) | 288 | 374 | 86 | full-bleed to right inset |

SUM CHECK: 16 + 84 + 12 + 48 + 10 + 108 + 10 + 86 + 16 = 390 ✓

Vertical: two buttons, each 86 × 44dp visual, radius 10dp, stacked with 6dp gap (stack = 94dp), stack centred on the bar's horizontal midline → overflow ±15dp beyond the 64dp bar, identical overflow language to v1.3. Tap targets: 86 × 48dp (2dp pad top/bottom); the two tap zones must not overlap — with 6dp visual gap and 2dp pads there is a 2dp dead strip between them: acceptable, verify no overlap in the measured overlay.

TURBO on top, AUTOPLAY below (order unchanged from v1.3 stack).

## 3. Button anatomy

- Fill `bar/bg-solid` #111111, 2dp stroke rgba(255,255,255,0.15) at rest — NOT the 0.10 hairline; these are controls, not chrome.
- Content, left-aligned: 10dp left padding, icon 16dp, 6dp gap, label.
- Labels: 10sp/700, +1 letter-spacing, uppercase, `ui/white`. Label text budget is 54dp max width at 10sp. Fixed label set: **"TURBO"** and **"AUTO"**. Not "AUTOPLAY" — it does not fit the budget and will not be squeezed, condensed, or downsized. "AUTO" also survives pt-BR, es, it, de unchanged; see §5 for the localisation rule.
- States (unchanged semantics from v1.3):
  - Rest: white icon + label, grey stroke.
  - Turbo active: stroke, icon, label all `accent/amber`; persists across rounds.
  - Autoplay running: stroke amber; icon replaced by remaining-round count (14sp/700 amber); label remains "AUTO" in white. Tap = immediate stop. Count must fit to 4 digits (9999) within the icon+gap region — verify.
  - Pressed: fill rgba(255,255,255,0.12), 80ms.
  - Disabled (where a state matrix cell says so): 35% opacity, haptic-reject.
- The v1.3 state interaction matrix applies unchanged — this CR alters shape and labelling only, zero behaviour.

## 4. Configuration variants (mount-level, as always)
- {turbo, autoplay}: as §2.
- {turbo} only: single button 86 × 44, centred on bar midline (no stack).
- {}: region 278–374 renders empty. The no-gaps rule and the "must remain empty / unobstructed by art" requirement apply to 278–374 exactly as they did to the old reserved zone.
- Render all three configs in the evidence pack.

## 5. Localisation & fallback rule
If any market's translated label exceeds the 54dp budget at 10sp, that market's build falls back to the v1.3 SIGNED circular icon-only cluster (330–374) rather than shrinking type or truncating. The fallback is the signed design, so it needs no new approval. Builder must include one rendered fallback example in the evidence pack to prove the code path exists.

## 6. Evidence pack (files, or the CR is not accepted)
1. Idle render, all three configs, 390dp true width.
2. Turbo-active, autoplay-running (with 3-digit count), and both-disabled crops.
3. Measured overlay: 44dp visuals, 48dp taps, no tap overlap, stack centred on midline.
4. Coordinate table with computations reconciling to 390 (as printed in §2 — reproduce and verify, do not restate from memory).
5. Pixel diffs vs v1.3 SIGNED for: header, bet block, stepper, primary, buy-bonus pill, win pill — all must be zero-diff. The ONLY changed pixels on the bar are within 278–374.
6. Fallback variant render per §5.

## 7. Explicitly rejected / out of scope
- Solid amber buy-bonus fill: rejected. Dark fill + amber stroke stands.
- Segmented BASIC/ADVANCED: rejected. Chevron toggle stands.
- Any change to header, geometry left of x=278, popovers, tokens, or state matrix.
- Cashout remains deferred to v1.4.
- No self-applied signature, no dates. Submission is unsigned; signing is the client's act upon evidence verification.
