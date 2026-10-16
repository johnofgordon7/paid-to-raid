# IG UNIVERSAL CONTROL BAR — v1.3.2 MASTER FLOW (ENGLISH) — FINAL DIRECTIVE

Objective: one presentation-grade English reference sheet, composed 100% from signed components, zero defects, suitable for internal launch to the IG team. The Portuguese render is close: composition discipline finally held (no legacy bet control, no legacy menu, signed popovers throughout). It is rejected only for the defects in §2 and because the canonical master must be English. Localisation (pt-BR included) is a config layer applied AFTER the English master is signed — never the master itself.

---

## 1. Language rule
- Master sheet: en-GB. Currency in examples: GBP (£2.00 format).
- Canonical strings (frozen once signed): BET / TOTAL BET · SELECT STAKE · SET STAKE · {value} · AUTOPLAY · NUMBER OF ROUNDS · LOSS LIMIT · ALWAYS ON · SINGLE WIN LIMIT · STOP ON FEATURE WIN · RESET · START · {n} ROUNDS · TURBO · AUTO · BUY BONUS · {price} · WIN · Menu: How to Play / Sound / Buy Bonus {price} / Responsible Gaming / History / Close.
- Primary button labels are per-vertical: DROP / SPIN / PLAY. Never a generic "START"/"GO" on the primary. The flow uses DROP throughout (Drop the Boss).
- Localisation ships as string tables against these keys; any label that busts its width budget triggers the §5 fallback (v1.3.2 CR), never resizing.

## 2. Defects in the pt-BR render — fix all seven in the English master
1. **Bet block layout drifted (frozen lock 3).** Render shows amount above with the label BELOW it. Frozen anatomy: label (BET / TOTAL BET) ABOVE amount, decorative underline beneath, 10sp/700 label, 22sp/700 amount. Restore exactly; pixel-diff against v1.3 SIGNED.
2. **Buy-bonus pill mutated.** It gained a "+" glyph and lost the gift icon. Frozen form: gift icon 18dp amber + "BUY BONUS · £10.00", dark fill, 2dp amber stroke. No "+", no icon substitutions.
3. **Frame 7's buy-bonus popover is unauthorised and resurrects legacy content.** The Ante-Bet/Chaos-Mode two-option chooser (with "2%/3%") is the old pre-v1.0 dialog restyled. There is exactly ONE buy-bonus surface: tap pill → §8.5 confirm sheet. Frame 7 becomes "pill pressed state"; frame 8 is the confirm sheet. If the game genuinely sells multiple bonus products, that is a v1.4-class change request, not a render decision — as drawn it is deleted.
4. **Green licence violated twice.** CONFIRM/COMPRAR buttons in frames 7–8 are green. The buy-bonus confirm commit is amber-deep fill + amber stroke (§8.5) precisely so green never sits on a purchase. Green remains licensed to: primary button, popover primary commits (SET STAKE / START), win amounts.
5. **Confirm sheet content wrong.** It must state: product name, one-off cost, and the mandatory line "Your stake stays £2.00. No recurring charge." (dynamic stake), then amber confirm + cancel. The ante-bet panel does not belong inside the buy-bonus confirm — ante is a separate modifier with its own signed treatment.
6. **Autoplay-running state contradicts the signed matrix.** Render shows the primary repurposed as a grey "STOP 10/18" AND a count on AUTO — two stop surfaces, double count. Signed behaviour: count lives on the AUTO button ONLY (amber stroke, count replaces icon, tap = stop); primary renders green 60% + label, non-interactive for slot, red STOP only where a live drop/hit round can be settled. One count, one stop surface.
7. **Turbo-active is solid amber fill.** CR §3: amber STROKE + amber icon + amber label on dark fill. Solid amber is the loudness we rejected on the buy-bonus pill; same rule here.

Also normalise sample data: Free Bets £3.00 (not mirroring the win value), WIN £12.34, balance £1,234.56 — three distinct numbers so no one misreads a binding.

## 3. Sheet composition (presentation-grade)
- **Row 1 — the flow, 10 frames at true 390dp:** Idle → Stake selector → Autoplay basic → Autoplay advanced → Autoplay running → Buy bonus (idle pill) → Pill pressed → Confirm sheet → Menu → Turbo active. Every frame: frozen navy header (Balance chip, Free Bets chip, info, close), signed bar, correct pill/win-pill states. Frame captions in plain English, one line each.
- **Row 2 — the six popover/sheet details** at full size: stake (idle), stake (ante active, showing TOTAL BET commit), autoplay basic, autoplay advanced (regulated), autoplay custom (ante active, chips resolving against £4.00 debit), buy-bonus confirm.
- **Row 3 — system panels:** geometry strip with the sum check (16+84+12+48+10+108+10+86+16=390, primary centre 224 = 58%), utility-button state row (rest / turbo-active / autoplay-count / disabled), configuration variants (all features / turbo-only / neither), colour tokens, stop-reason toasts (grey icons; feature-triggered amber), localisation & fallback rule, and the frozen register — now EIGHT locks: header · red stop licence · bet block · primary geometry · token table · stake truth · buy-bonus surface (one pill, one confirm sheet) · canonical strings.
- **Footer:** zero-diff rule, rejected-items log (solid amber fills, segmented toggle, legacy dialogs, generic START), "Cashout deferred to v1.4", and an UNSIGNED submission block — no self-applied signatures, no dates.
- Visual polish bar: consistent frame spacing, one caption size, no truncated or garbled strings anywhere, no watermark artefacts. This sheet will be shown to the whole team; it is the face of the system.

## 4. Evidence pack (files, delivered with the sheet)
1. Ten frame PNGs at 390dp + per-frame pixel diff of header/bet block/stepper/primary/pills vs v1.3 SIGNED (zero-diff outside x=278–374).
2. Six popover crops + measured 44dp overlays.
3. Colour grep: zero out-of-token values; zero green on any purchase surface.
4. State assertions: one count/one stop surface in autoplay; chip radio semantics; stake truth with ante on/off; string table matches §1 exactly.

Acceptance = sheet + files pass; signature is applied by the client.
