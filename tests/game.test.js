import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStake, validStake, snapshotAt, settleOutcome, DEMO_SEQUENCE, DEMO_OUTCOMES, chooseOutcome, INITIAL_BALANCE, PAYOUTS, ROUND_LENGTH, multiplierFor, formatMultiplier } from '../src/game.js';

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

test('five immutable authored fixtures keep the original video and derive final returns from the ladder', () => {
  assert.ok(Object.isFrozen(DEMO_OUTCOMES));
  assert.equal(DEMO_OUTCOMES.length, 5);
  assert.equal(new Set(DEMO_OUTCOMES.map((outcome) => outcome.id)).size, 5);
  assert.strictEqual(DEMO_OUTCOMES[0], DEMO_SEQUENCE);
  assert.deepEqual(DEMO_SEQUENCE.kills, [9.75, 19.5]);
  assert.equal(DEMO_SEQUENCE.visualType, 'video');
  assert.deepEqual(DEMO_OUTCOMES.map(({ id, duration, finalKills, survival, multiplier }) => ({ id, duration, finalKills, survival, multiplier })), [
    { id: 'SPRINT-002', duration: 30, finalKills: 2, survival: true, multiplier: 1 },
    { id: 'AMBUSH-001', duration: 12.5, finalKills: 1, survival: false, multiplier: 0 },
    { id: 'CROSSFIRE-003', duration: 22, finalKills: 3, survival: false, multiplier: 0 },
    { id: 'EXTRACTION-004', duration: 30, finalKills: 4, survival: true, multiplier: 5 },
    { id: 'CASHFIRE-010', duration: 30, finalKills: 10, survival: true, multiplier: 1000 },
  ]);
  for (const outcome of DEMO_OUTCOMES) {
    assert.ok(Object.isFrozen(outcome));
    assert.ok(Object.isFrozen(outcome.kills));
    assert.throws(() => outcome.kills.push(29.9), TypeError);
    assert.throws(() => { outcome.duration = 1; }, TypeError);
    assert.equal(outcome.probability, .2);
    assert.equal(outcome.finalKills, outcome.kills.length);
    assert.equal(outcome.multiplier, outcome.survival ? PAYOUTS[outcome.finalKills] : 0);
    assert.ok(outcome.duration > 0 && outcome.duration <= ROUND_LENGTH);
    assert.equal(outcome.duration === ROUND_LENGTH, outcome.survival);
    assert.ok(outcome.kills.every((at, index, events) => at > 0 && at < outcome.duration && (index === 0 || at > events[index - 1])));
    if (outcome !== DEMO_SEQUENCE) assert.equal(outcome.visualType, 'simulation');
  }
});

test('each kill event changes its selected fixture exactly once at the authored timestamp', () => {
  for (const outcome of DEMO_OUTCOMES) {
    assert.deepEqual([snapshotAt(0, outcome).kills, snapshotAt(0, outcome).done], [0, false]);
    for (const [index, at] of outcome.kills.entries()) {
      const before = snapshotAt(at - .000001, outcome);
      const exact = snapshotAt(at, outcome);
      const after = snapshotAt(at + .000001, outcome);
      assert.equal(before.kills, index, `${outcome.id}: before kill ${index + 1}`);
      assert.equal(exact.kills, index + 1, `${outcome.id}: exact kill ${index + 1}`);
      assert.equal(after.kills, index + 1, `${outcome.id}: after kill ${index + 1}`);
      assert.equal(exact.multiplier, PAYOUTS[index + 1]);
      assert.equal(exact.potentialMultiplier, PAYOUTS[index + 1]);
      assert.equal(exact.done, false);
      assert.equal(exact.survived, false);
      assert.equal(exact.didDie, false);
      assert.equal(exact.alive, true);
    }
  }
});

test('every fixture ends at its own endpoint, with death cancelling the conditional return immediately', () => {
  for (const outcome of DEMO_OUTCOMES) {
    const before = snapshotAt(outcome.duration - .000001, outcome);
    const final = snapshotAt(outcome.duration, outcome);
    assert.equal(before.done, false);
    assert.equal(before.alive, true);
    assert.equal(before.survived, false);
    assert.equal(before.didDie, false);
    assert.equal(final.outcomeId, outcome.id);
    assert.equal(final.time, outcome.duration);
    assert.equal(final.kills, outcome.finalKills);
    assert.equal(final.done, true);
    assert.equal(final.didDie, !outcome.survival);
    assert.equal(final.alive, outcome.survival);
    assert.equal(final.survived, outcome.survival);
    assert.equal(final.multiplier, outcome.multiplier);
    assert.equal(final.potentialMultiplier, PAYOUTS[outcome.finalKills]);
    assert.equal(final.remaining, Math.ceil(ROUND_LENGTH - outcome.duration));
    assert.equal(final.objective, outcome.survival ? 'Extraction complete' : 'Operator down — round ended');
    assert.deepEqual(snapshotAt(outcome.duration + 100, outcome), final);
    for (const stake of [10, 1000, 1777, 10000]) {
      assert.equal(settleOutcome(stake, final.kills, final.survived), Math.round(stake * outcome.multiplier));
    }
    if (!outcome.survival) {
      assert.ok(final.remaining > 0, 'early death retains the unused survival countdown');
      assert.ok(before.multiplier > 0, 'a potential return exists before the authored death');
      assert.equal(final.multiplier, 0, 'death cancels that potential return');
    }
  }
});

test('outcome choice partitions the unit interval into five equal 20% fixtures and samples once', () => {
  const boundaryCases = [
    [0, 0], [.2 - Number.EPSILON, 0], [.2, 1], [.4 - Number.EPSILON, 1],
    [.4, 2], [.6 - Number.EPSILON, 2], [.6, 3], [.8 - Number.EPSILON, 3],
    [.8, 4], [1 - Number.EPSILON, 4],
  ];
  for (const [value, index] of boundaryCases) {
    let calls = 0;
    const selected = chooseOutcome(() => { calls += 1; return value; });
    assert.strictEqual(selected, DEMO_OUTCOMES[index]);
    assert.equal(calls, 1);
    snapshotAt(10, selected);
    snapshotAt(selected.duration, selected);
    assert.equal(calls, 1, 'timeline snapshots cannot reroll an accepted fixture');
  }
  const counts = Array(5).fill(0);
  for (let index = 0; index < 500; index++) counts[DEMO_OUTCOMES.indexOf(chooseOutcome(() => (index + .5) / 500))] += 1;
  assert.deepEqual(counts, [100, 100, 100, 100, 100]);
});

test('invalid outcome random sources are rejected instead of selecting an unintended fixture', () => {
  for (const source of [null, 0, 'random', {}]) assert.throws(() => chooseOutcome(source), TypeError);
  for (const value of [-.1, 1, 1.1, NaN, Infinity, -Infinity, '.2', null, undefined]) {
    let calls = 0;
    assert.throws(() => chooseOutcome(() => { calls += 1; return value; }), RangeError);
    assert.equal(calls, 1);
  }
});

test('every fixture clamps invalid elapsed input without awarding survival or death early', () => {
  for (const outcome of DEMO_OUTCOMES) {
    for (const elapsed of [-1, NaN, Infinity, -Infinity, '30', null, undefined]) {
      const snapshot = snapshotAt(elapsed, outcome);
      assert.equal(snapshot.time, 0);
      assert.equal(snapshot.remaining, ROUND_LENGTH);
      assert.equal(snapshot.kills, 0);
      assert.equal(snapshot.done, false);
      assert.equal(snapshot.survived, false);
      assert.equal(snapshot.didDie, false);
    }
  }
});
