import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStake, validStake, snapshotAt, settleOutcome, settlementAt, pickSequence, SEQUENCES, DEMO_SEQUENCE, INITIAL_BALANCE, PAYOUTS, multiplierFor, formatMultiplier } from '../src/game.js';

test('only two kills, final payout 1x at exactly 30 seconds', () => {
  assert.equal(snapshotAt(0).kills, 0);
  assert.equal(snapshotAt(DEMO_SEQUENCE.kills[0] - .001).kills, 0);
  assert.equal(snapshotAt(DEMO_SEQUENCE.kills[0]).kills, 1);
  assert.equal(snapshotAt(DEMO_SEQUENCE.kills[1] - .001).kills, 1);
  assert.equal(snapshotAt(DEMO_SEQUENCE.kills[1]).kills, 2);
  assert.equal(snapshotAt(29.999).survived, false);
  assert.deepEqual(
    [snapshotAt(30).survived, snapshotAt(30).kills, snapshotAt(30).multiplier],
    [true, 2, 1],
  );
});

test('money is integer cents; round trip returns the original balance without profit', () => {
  for (const stake of [10, 11, 100, 500, 1000, 1777, 9999, 10000]) {
    const afterDebit = INITIAL_BALANCE - stake;
    const returned = settleOutcome(stake, 2, true);
    assert.equal(returned, stake);
    assert.equal(afterDebit + returned, INITIAL_BALANCE);
  }
});

test('death always pays zero, even with ten kills', () => {
  for (let kills = 0; kills <= 10; kills++) assert.equal(settleOutcome(1000, kills, false), 0);
});

test('the complete demo ladder shares one immutable payout definition', () => {
  const expected = [0, .5, 1, 2, 5, 10, 25, 50, 100, 250, 1000];
  assert.deepEqual(PAYOUTS, expected);
  assert.ok(Object.isFrozen(PAYOUTS));
  for (let kills = 0; kills <= 10; kills++) {
    assert.equal(multiplierFor(kills), expected[kills]);
    assert.equal(settleOutcome(1000, kills, true), expected[kills] * 1000);
  }
});

test('invalid kill counts cannot settle and multiplier labels retain every tier', () => {
  for (const kills of [-1, 11, 1.5, NaN, Infinity, '2', null, undefined]) {
    assert.equal(multiplierFor(kills), null);
    assert.throws(() => settleOutcome(1000, kills, true), /Payout not configured/);
  }
  assert.equal(formatMultiplier(.5), '0.5×');
  assert.equal(formatMultiplier(2), '2×');
  assert.equal(formatMultiplier(1000), '1,000×');
});

test('stake parsing rejects invalid, excessive precision, and non-finite inputs', () => {
  assert.equal(parseStake('10.00'), 1000);
  assert.equal(parseStake('0.10'), 10);
  assert.equal(parseStake('17.77'), 1777);
  assert.equal(parseStake(' 5 '), 500);
  for (const input of ['', 'NaN', 'Infinity', '-2', '1.001', 'abc', '1e3', '.']) assert.equal(parseStake(input), null);
  assert.equal(validStake(9, INITIAL_BALANCE), false);
  assert.equal(validStake(10001, INITIAL_BALANCE), false);
  assert.equal(validStake(1000, 500), false);
  assert.equal(validStake(1000, INITIAL_BALANCE), true);
});

test('timeline clamps and invalid elapsed input is safe', () => {
  assert.equal(snapshotAt(-2).time, 0);
  assert.equal(snapshotAt(100).time, 30);
  assert.equal(snapshotAt(NaN).time, 0);
});

test('five immutable outcomes preserve the original and add exactly the requested results', () => {
  assert.equal(SEQUENCES.length, 5);
  assert.equal(SEQUENCES[0], DEMO_SEQUENCE);
  assert.deepEqual(DEMO_SEQUENCE.kills, [9.75, 19.5]);
  assert.equal(DEMO_SEQUENCE.video, './assets/call-of-booty-sprint.mp4');
  assert.equal(new Set(SEQUENCES.map((s) => s.id)).size, 5);
  assert.equal(new Set(SEQUENCES.map((s) => s.video)).size, 5);
  assert.deepEqual(SEQUENCES.map((s) => s.multiplier), [1, 0, 0, 5, 1000]);
  assert.ok(Object.isFrozen(SEQUENCES));
  for (const sequence of SEQUENCES) {
    assert.ok(Object.isFrozen(sequence));
    assert.ok(Object.isFrozen(sequence.kills));
    assert.ok(Object.isFrozen(sequence.cues));
    assert.ok(sequence.kills.every((at, i) => at > 0 && at < sequence.duration && (i === 0 || at > sequence.kills[i - 1])));
    assert.equal(sequence.survival ? multiplierFor(sequence.kills.length) : 0, sequence.multiplier);
    assert.equal(sequence.survival ? sequence.duration === 30 : sequence.duration < 30, true);
  }
});

test('each kill appears only at its own sequence timestamp', () => {
  for (const sequence of SEQUENCES) {
    sequence.kills.forEach((at, i) => {
      assert.equal(snapshotAt(at - .001, sequence).kills, i);
      assert.equal(snapshotAt(at, sequence).kills, i + 1);
      assert.equal(snapshotAt(at, sequence).multiplier, PAYOUTS[i + 1]);
    });
  }
});

test('both deaths end early and forfeit the full stake, including any provisional return', () => {
  const deaths = SEQUENCES.filter((s) => !s.survival);
  assert.equal(deaths.length, 2);
  assert.notEqual(deaths[0].duration, deaths[1].duration);
  for (const sequence of deaths) {
    const before = snapshotAt(sequence.duration - .001, sequence);
    assert.ok(before.multiplier > 0);
    assert.equal(before.eliminated, false);
    assert.equal(settlementAt(1777, sequence, sequence.duration - .001), null);
    const end = snapshotAt(sequence.duration, sequence);
    assert.equal(end.eliminated, true);
    assert.equal(end.survived, false);
    assert.equal(end.multiplier, 0);
    assert.ok(end.remaining > 0);
    assert.deepEqual(settlementAt(1777, sequence, sequence.duration), {
      payout: 0, net: -1777, kills: sequence.kills.length,
      multiplier: 0, survived: false, duration: sequence.duration,
    });
    assert.equal(snapshotAt(100, sequence).time, sequence.duration);
    assert.equal(settlementAt(1777, sequence, 30).payout, 0);
  }
});

test('survivals settle only at 30 seconds with exact 1x, 5x and 1000x returns', () => {
  for (const sequence of SEQUENCES.filter((s) => s.survival)) {
    for (const stake of [10, 11, 100, 1777, 9999, 10000]) {
      assert.equal(settlementAt(stake, sequence, 29.999), null);
      const result = settlementAt(stake, sequence, 30);
      assert.equal(result.payout, stake * sequence.multiplier);
      assert.equal(result.net, stake * (sequence.multiplier - 1));
      assert.equal(result.kills, sequence.kills.length);
      assert.equal(result.survived, true);
      assert.equal(result.duration, 30);
      assert.ok(Number.isSafeInteger(result.payout));
    }
  }
});

test('independent uniform selection can choose all five outcomes and can repeat', () => {
  const counts = Array(5).fill(0);
  for (let draw = 0; draw < 10000; draw++) {
    counts[SEQUENCES.indexOf(pickSequence(() => draw))]++;
  }
  assert.deepEqual(counts, [2000, 2000, 2000, 2000, 2000]);
  assert.equal(pickSequence(() => 4), SEQUENCES[4]);
  assert.equal(pickSequence(() => 4), SEQUENCES[4]);
});

test('selection rejects the biased uint32 tail and fails safely on broken entropy', () => {
  const draws = [0xffffffff, 0xfffffffe];
  assert.equal(pickSequence(() => draws.shift()), SEQUENCES[4]);
  assert.equal(draws.length, 0);
  for (const bad of [-1, 0x100000000, .2, NaN, Infinity, '1', null]) {
    assert.throws(() => pickSequence(() => bad), /unsigned 32-bit/);
  }
  assert.throws(() => pickSequence(() => 0xffffffff), /could not complete/);
});

test('invalid and premature timeline input cannot cause settlement', () => {
  for (const sequence of SEQUENCES) {
    for (const time of [-1, NaN, Infinity, '30', null, undefined]) {
      assert.equal(settlementAt(1000, sequence, time), null);
    }
  }
  for (const stake of [0, -1, .5, 10001, NaN, Infinity, '1000']) {
    assert.throws(() => settleOutcome(stake, 4, true), /integer-cent/);
  }
});
