export const ROUND_LENGTH = 30;
export const INITIAL_BALANCE = 100000;
export const MIN_STAKE = 10;
export const MAX_STAKE = 10000;
export const PRESETS = [100, 500, 1000, 2500];

// Total stake returns, not net profit. Tiers 4–9 are a proposed demo progression.
// Production probabilities and the 97% RTP target are not implemented here.
export const PAYOUTS = Object.freeze([0, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 1000]);

// One authored, deterministic outcome. Never represented as a random/RTP game.
// Confirmed against the sprint footage: first collapse at 9.75s, second at 19.50s.
export const DEMO_SEQUENCE = Object.freeze({
  id: 'SPRINT-002',
  duration: ROUND_LENGTH,
  kills: Object.freeze([9.75, 19.5]),
  survival: true,
  multiplier: 1,
});

export function parseStake(raw) {
  if (typeof raw !== 'string' || !/^\d+(\.\d{0,2})?$/.test(raw.trim())) return null;
  const cents = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function validStake(cents, balance) {
  return Number.isSafeInteger(cents) && cents >= MIN_STAKE && cents <= MAX_STAKE && cents <= balance;
}

export function multiplierFor(kills) {
  return Number.isInteger(kills) && kills >= 0 && kills < PAYOUTS.length ? PAYOUTS[kills] : null;
}

export function snapshotAt(time) {
  const t = Math.min(ROUND_LENGTH, Math.max(0, Number.isFinite(time) ? time : 0));
  const kills = DEMO_SEQUENCE.kills.filter((at) => t >= at).length;
  let objective = 'Sprint through the depot';
  if (t >= 7.2 && t < DEMO_SEQUENCE.kills[0]) objective = 'Hostile ahead';
  else if (t >= DEMO_SEQUENCE.kills[0] && t < 18.2) objective = 'Keep moving';
  else if (t >= 18.2 && t < DEMO_SEQUENCE.kills[1]) objective = 'Contact on the right';
  else if (t >= DEMO_SEQUENCE.kills[1] && t < 29.2) objective = 'Sprint to the extraction zone';
  else if (t >= 29.2 && t < 30) objective = 'Secure the extraction';
  else if (t === 30) objective = 'Extraction complete';
  return {
    time: t,
    remaining: Math.max(0, Math.ceil(ROUND_LENGTH - t)),
    kills,
    multiplier: multiplierFor(kills),
    survived: t === ROUND_LENGTH,
    objective,
  };
}

export function settleOutcome(stake, kills, survived) {
  if (!survived) return 0;
  const multiplier = multiplierFor(kills);
  if (multiplier === null) throw new Error('Payout not configured for this kill count.');
  return Math.round(stake * multiplier);
}

export const formatMoney = (cents) => new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', minimumFractionDigits: 2,
}).format(cents / 100);

export const formatMultiplier = (value) => `${new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 1,
}).format(value)}×`;
