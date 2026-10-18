export const ROUND_LENGTH = 30;
export const INITIAL_BALANCE = 100000;
export const MIN_STAKE = 10;
export const MAX_STAKE = 10000;
export const PRESETS = [100, 500, 1000, 2500];

// Total stake returns, not net profit. Tiers 4–9 are a proposed demo progression.
// Production probabilities and the 97% RTP target are not implemented here.
export const PAYOUTS = Object.freeze([0, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 1000]);

function defineSequence(sequence) {
  return Object.freeze({
    ...sequence,
    kills: Object.freeze(sequence.kills),
    cues: Object.freeze(sequence.cues.map((cue) => Object.freeze(cue))),
  });
}

// The original approved animation and its observed kill timing are preserved.
export const DEMO_SEQUENCE = defineSequence({
  id: 'SPRINT-002',
  name: 'Clean extraction',
  video: './assets/call-of-booty-sprint.mp4',
  resultArt: './assets/call-of-booty-extraction.webp',
  duration: ROUND_LENGTH,
  clipDuration: ROUND_LENGTH,
  kills: [9.75, 19.5],
  survival: true,
  multiplier: 1,
  cues: [
    [0, 'Sprint through the depot'],
    [7.2, 'Hostile ahead'],
    [9.75, 'Keep moving'],
    [18.2, 'Contact on the right'],
    [19.5, 'Sprint to the extraction zone'],
    [29.2, 'Secure the extraction'],
  ],
});

// Equal, independent demo chances. These are not production odds or 97% RTP maths.
// New footage timing is reviewed before release; duration is the round endpoint,
// whereas clipDuration includes any generated tail after a fatal moment.
export const SEQUENCES = Object.freeze([
  DEMO_SEQUENCE,
  defineSequence({
    id: 'AMBUSH-001',
    name: 'Service-lane ambush',
    video: './assets/call-of-booty-ambush-early.mp4',
    resultArt: './assets/call-of-booty-ambush-early.webp',
    duration: 9.9,
    clipDuration: 12,
    kills: [5],
    survival: false,
    multiplier: 0,
    cues: [[0, 'Move through the service lane'], [4, 'Contact ahead'], [5, 'Keep moving'], [8.7, 'Incoming fire']],
  }),
  defineSequence({
    id: 'AMBUSH-003',
    name: 'Loading-bay ambush',
    video: './assets/call-of-booty-ambush-late.mp4',
    resultArt: './assets/call-of-booty-ambush-late.webp',
    duration: 21.8,
    clipDuration: 30,
    kills: [6, 11.5, 17.8],
    survival: false,
    multiplier: 0,
    cues: [[0, 'Push through the loading yard'], [4, 'Hostile ahead'], [6, 'Stay on the move'], [17.8, 'Reach the extraction bay'], [20.7, 'Incoming fire']],
  }),
  defineSequence({
    id: 'EXTRACT-005',
    name: 'Four-kill extraction',
    video: './assets/call-of-booty-extraction-five.mp4',
    resultArt: './assets/call-of-booty-extraction-five.webp',
    duration: ROUND_LENGTH,
    clipDuration: ROUND_LENGTH,
    kills: [6.5, 12.3, 18.3, 24.1],
    survival: true,
    multiplier: 5,
    cues: [[0, 'Clear a route through the depot'], [6.5, 'Keep moving'], [18.3, 'Push through the loading bay'], [24.1, 'Sprint to the extraction zone'], [26.5, 'Secure the extraction']],
  }),
  defineSequence({
    id: 'EXTRACT-1000',
    name: 'Maximum extraction',
    video: './assets/call-of-booty-extraction-max.mp4',
    resultArt: './assets/call-of-booty-extraction-max.webp',
    duration: ROUND_LENGTH,
    clipDuration: ROUND_LENGTH,
    kills: [3.95, 5.15, 8.45, 9.55, 14, 16.05, 18.7, 19.45, 23.45, 24.65],
    survival: true,
    multiplier: 1000,
    cues: [[0, 'Push through the outer yard'], [5.15, 'Keep moving'], [14, 'Clear the next checkpoint'], [16.05, 'Push through the loading dock'], [24.65, 'Sprint to the extraction zone'], [27.5, 'Secure the extraction']],
  }),
]);

const randomUint32 = () => {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0];
};

export function pickSequence(draw = randomUint32) {
  // Rejection sampling avoids modulo bias. No shuffle bag or forced first win:
  // each valid Play makes a fresh independent draw, including possible repeats.
  const limit = Math.floor(0x100000000 / SEQUENCES.length) * SEQUENCES.length;
  for (let attempt = 0; attempt < 32; attempt++) {
    const value = draw();
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
      throw new Error('Random selection requires an unsigned 32-bit integer.');
    }
    if (value < limit) return SEQUENCES[value % SEQUENCES.length];
  }
  throw new Error('Random selection could not complete.');
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

export function snapshotAt(time, sequence = DEMO_SEQUENCE) {
  const t = Math.min(sequence.duration, Math.max(0, Number.isFinite(time) ? time : 0));
  const kills = sequence.kills.filter((at) => t >= at).length;
  const complete = t >= sequence.duration;
  const survived = complete && sequence.survival && t >= ROUND_LENGTH;
  const eliminated = complete && !sequence.survival;
  let objective = sequence.cues[0][1];
  for (const [at, label] of sequence.cues) if (t >= at) objective = label;
  if (survived) objective = 'Extraction complete';
  if (eliminated) objective = 'Operator eliminated';
  return {
    time: t,
    remaining: Math.max(0, Math.ceil(ROUND_LENGTH - t)),
    kills,
    multiplier: eliminated ? 0 : multiplierFor(kills),
    potentialMultiplier: multiplierFor(kills),
    complete,
    survived,
    eliminated,
    objective,
  };
}

export function settleOutcome(stake, kills, survived) {
  if (!Number.isSafeInteger(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    throw new Error('A valid integer-cent demo stake is required.');
  }
  if (!survived) return 0;
  const multiplier = multiplierFor(kills);
  if (multiplier === null) throw new Error('Payout not configured for this kill count.');
  return Math.round(stake * multiplier);
}

export function settlementAt(stake, sequence, elapsed) {
  const snapshot = snapshotAt(elapsed, sequence);
  if (!snapshot.complete) return null;
  const payout = settleOutcome(stake, snapshot.kills, snapshot.survived);
  return {
    payout,
    net: payout - stake,
    kills: snapshot.kills,
    multiplier: snapshot.multiplier,
    survived: snapshot.survived,
    duration: snapshot.time,
  };
}

export const formatMoney = (cents) => new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'GBP', minimumFractionDigits: 2,
}).format(cents / 100);

export const formatMultiplier = (value) => `${new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 1,
}).format(value)}×`;
