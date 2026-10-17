export const ROUND_LENGTH = 30;
export const INITIAL_BALANCE = 100000;
export const MIN_STAKE = 10;
export const MAX_STAKE = 10000;
export const PRESETS = [100, 500, 1000, 2500];

// Total stake returns, not net profit. This prototype catalogue is not a balanced
// production outcome pool; the future 97% RTP target is not implemented here.
export const PAYOUTS = Object.freeze([0, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 1000]);

function defineOutcome({ id, label, duration, kills, survival, visualType, visualTheme }) {
  const finalKills = kills.length;
  return Object.freeze({
    id, label, duration, kills: Object.freeze([...kills]), survival, finalKills,
    multiplier: survival ? PAYOUTS[finalKills] : 0,
    visualType, visualTheme, probability: 1 / 5,
  });
}

// The supplied video remains the original two-kill, 1× extraction. Its two
// collapse times are unchanged. The other four outcomes use authored simulations.
export const DEMO_SEQUENCE = defineOutcome({
  id: 'SPRINT-002',
  label: 'Depot extraction',
  duration: ROUND_LENGTH,
  kills: [9.75, 19.5],
  survival: true,
  visualType: 'video',
  visualTheme: 'sprint',
});

// Select one immutable fixture when a round is accepted. Equal 20% sampling is a
// prototype demonstration distribution, not a 97% RTP or production probability.
export const DEMO_OUTCOMES = Object.freeze([
  DEMO_SEQUENCE,
  defineOutcome({
    id: 'AMBUSH-001', label: 'Depot ambush', duration: 12.5,
    kills: [4.6], survival: false, visualType: 'simulation', visualTheme: 'ambush',
  }),
  defineOutcome({
    id: 'CROSSFIRE-003', label: 'Crossfire', duration: 22,
    kills: [5.4, 11.5, 17.4], survival: false, visualType: 'simulation', visualTheme: 'crossfire',
  }),
  defineOutcome({
    id: 'EXTRACTION-004', label: 'Four-kill extraction', duration: ROUND_LENGTH,
    kills: [5, 11, 18, 25], survival: true, visualType: 'simulation', visualTheme: 'extraction',
  }),
  defineOutcome({
    id: 'CASHFIRE-010', label: 'Cashfire maximum', duration: ROUND_LENGTH,
    kills: [2.1, 4.6, 7.3, 10.1, 12.8, 15.4, 18.1, 20.9, 23.6, 26.7],
    survival: true, visualType: 'simulation', visualTheme: 'cashfire',
  }),
]);

export function chooseOutcome(random = Math.random) {
  if (typeof random !== 'function') throw new TypeError('Outcome random source must be a function.');
  const value = random();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Outcome random source must return a finite number from 0 (inclusive) to 1 (exclusive).');
  }
  return DEMO_OUTCOMES[Math.floor(value * DEMO_OUTCOMES.length)];
}

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

export function snapshotAt(time, outcome = DEMO_SEQUENCE) {
  const t = Math.min(outcome.duration, Math.max(0, Number.isFinite(time) ? time : 0));
  const kills = outcome.kills.filter((at) => t >= at).length;
  const done = t >= outcome.duration;
  const didDie = done && !outcome.survival;
  const survived = done && outcome.survival;
  const potentialMultiplier = multiplierFor(kills);
  let objective = 'Sprint through the depot';
  if (outcome === DEMO_SEQUENCE) {
    if (t >= 7.2 && t < outcome.kills[0]) objective = 'Hostile ahead';
    else if (t >= outcome.kills[0] && t < 18.2) objective = 'Keep moving';
    else if (t >= 18.2 && t < outcome.kills[1]) objective = 'Contact on the right';
    else if (t >= outcome.kills[1] && t < 29.2) objective = 'Sprint to the extraction zone';
    else if (t >= 29.2 && t < 30) objective = 'Secure the extraction';
  } else {
    const nextKillAt = outcome.kills[kills];
    if (!outcome.survival && t >= outcome.duration - 3) objective = 'Incoming fire — find cover';
    else if (t >= ROUND_LENGTH - 1.2) objective = 'Secure the extraction';
    else if (kills === outcome.finalKills) objective = 'Sprint to the extraction zone';
    else if (nextKillAt - t <= 1.8) objective = 'Hostile ahead';
    else if (kills > 0) objective = 'Advance through the depot';
  }
  if (didDie) objective = 'Operator down — round ended';
  else if (survived) objective = 'Extraction complete';
  return {
    time: t,
    remaining: Math.max(0, Math.ceil(ROUND_LENGTH - t)),
    kills,
    multiplier: didDie ? 0 : potentialMultiplier,
    potentialMultiplier,
    survived,
    didDie,
    alive: !didDie,
    done,
    outcomeId: outcome.id,
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
