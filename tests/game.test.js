import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStake, validStake, snapshotAt, settleOutcome, DEMO_SEQUENCE, INITIAL_BALANCE, PAYOUTS, multiplierFor, formatMultiplier } from '../src/game.js';

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
