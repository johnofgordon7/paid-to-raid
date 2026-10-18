import React from 'react';
import { Crosshair, Flame } from 'lucide-react';
import { PAYOUTS, formatMoney, formatMultiplier } from './game.js';

/** Presentation only: all amounts come from the existing total-return ladder. */
export function CashfireMeter({ kills, multiplier, stake, phase, survived, reusesFootage = false }) {
  const lastTier = PAYOUTS.length - 1;
  const currentKills = Math.min(lastTier, Math.max(0, Math.trunc(kills || 0)));
  const currentMultiplier = Number.isFinite(multiplier) ? multiplier : PAYOUTS[currentKills];
  const selectedStake = Number.isFinite(stake) ? stake : 0;
  const nextKills = Math.min(lastTier, currentKills + 1);
  const atMaximum = currentKills === lastTier;
  const settled = phase === 'complete';
  const totalFor = (value) => formatMoney(Math.round(selectedStake * value));

  return <aside className={`cashfire-meter${settled ? ' cashfire-meter-settled' : ''}`} aria-label="Cashfire paytable and kill progress" data-testid="kill-hud">
    <div className="cashfire-meter-heading"><Flame size={16} aria-hidden="true" /><h2>CASHFIRE</h2><span>PAYTABLE</span></div>
    <div className="cashfire-meter-maximum"><strong>{formatMultiplier(PAYOUTS[lastTier])}</strong><span>{lastTier} KILLS<span>CONFIGURED MAX</span></span></div>

    <div className="cashfire-meter-status" aria-live="polite" aria-atomic="true">
      <div className="cashfire-current-return">
        <span className="cashfire-summary-label"><Crosshair size={11} aria-hidden="true" />{settled ? survived === false ? 'ELIMINATED' : 'RETURNED' : 'IF ALIVE'}<b>{currentKills} / {lastTier}</b></span>
        <strong data-long-value={totalFor(currentMultiplier).length >= 10}>{totalFor(currentMultiplier)}<small>{formatMultiplier(currentMultiplier)}</small></strong>
      </div>
      <div className="cashfire-next-return">
        <span className="cashfire-summary-label">{atMaximum ? 'MAXIMUM TIER' : 'NEXT KILL'}<b>{atMaximum ? lastTier : nextKills} {nextKills === 1 ? 'KILL' : 'KILLS'}</b></span>
        <strong data-long-value={totalFor(PAYOUTS[nextKills]).length >= 10}>{totalFor(PAYOUTS[nextKills])}<small>{formatMultiplier(PAYOUTS[nextKills])}</small></strong>
      </div>
    </div>

    <div className="cashfire-table-heading"><span>KILLS</span><span>TOTAL RETURN</span></div>
    <ol className="cashfire-paytable" reversed start={lastTier} aria-label="Total stake return by kill count">
      {PAYOUTS.map((value, tier) => ({ value, tier })).reverse().map(({ value, tier }) => {
        const isCurrent = tier === currentKills;
        const isNext = !atMaximum && tier === nextKills;
        return <li key={tier} className={`cashfire-tier${isCurrent ? ' is-current' : ''}${isNext ? ' is-next' : ''}${tier < currentKills ? ' is-achieved' : ''}${tier === lastTier ? ' is-maximum' : ''}`} aria-current={isCurrent ? 'step' : undefined} aria-label={`${tier} ${tier === 1 ? 'kill' : 'kills'}: ${formatMultiplier(value)} total stake return${isCurrent ? ', your current tier' : isNext ? ', next kill tier' : ''}`}>
          <span className="cashfire-tier-marker">{isCurrent ? 'YOU' : isNext ? 'NEXT' : tier === lastTier ? 'MAX' : ''}</span>
          <span className="cashfire-tier-kills">{String(tier).padStart(2, '0')}</span>
          <i className="cashfire-tier-track" aria-hidden="true"><span /></i>
          <strong>{formatMultiplier(value)}</strong>
        </li>;
      })}
    </ol>
    <div className="cashfire-progress" role="meter" aria-label="Current kill progress" aria-valuenow={currentKills} aria-valuemin={0} aria-valuemax={lastTier} aria-valuetext={`${currentKills} of ${lastTier} kills, ${formatMultiplier(currentMultiplier)} total stake return`}>
      {PAYOUTS.slice(1).map((_, index) => <i className={index < currentKills ? 'is-filled' : ''} key={index} />)}
    </div>
    <p className="cashfire-meter-note">{reusesFootage ? 'Replayed encounters.' : '5-outcome demo.'}<span>Survive to collect.</span></p>
  </aside>;
}

export default CashfireMeter;
