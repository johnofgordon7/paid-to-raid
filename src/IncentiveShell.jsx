import React from 'react';
import { ChevronDown, ChevronUp, Info, LoaderCircle, Menu, Play } from 'lucide-react';
import { Button } from './ui.jsx';
import { formatMoney } from './game.js';

export const STAKE_LADDER = [10, 20, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000];

export function IncentiveHeader({ balance, onInfo, onMenu }) {
  return <header className="ig-header">
    <div className="ig-balance" aria-label="Demo balance">
      <span>BALANCE <small>DEMO</small></span>
      <strong data-testid="balance">{formatMoney(balance)}</strong>
    </div>
    <img className="ig-studio-logo" src="./assets/branding/studio-logo.png" alt="Incentive Studios" />
    <div className="ig-header-actions">
      <Button variant="ghost" size="icon" onClick={onInfo} aria-label="How to play"><Info size={20} /></Button>
      <Button variant="ghost" size="icon" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></Button>
    </div>
  </header>;
}

export function IncentiveControls({ stake, ready, canPlay, onPlay, onStake, onStep, complete }) {
  return <section className="ig-controls" aria-label="Betting controls" data-testid="betting-controls">
    <div className="ig-control-bar" />
    <Button variant="ghost" className="ig-bet-select" id="stake" onClick={onStake} aria-label={`Select stake: ${formatMoney(stake)}`}>
      <span className="ig-control-label">BET</span>
      <strong>{formatMoney(stake)}</strong>
      <span className="ig-bet-underline" aria-hidden="true" />
    </Button>
    <div className="ig-stepper" aria-label="Stake stepper">
      <Button variant="ghost" size="icon" aria-label="Increase stake" disabled={stake >= STAKE_LADDER.at(-1)} onClick={() => onStep(1)}><ChevronUp size={20} /></Button>
      <Button variant="ghost" size="icon" aria-label="Decrease stake" disabled={stake <= STAKE_LADDER[0]} onClick={() => onStep(-1)}><ChevronDown size={20} /></Button>
    </div>
    <Button id="start-btn" className="ig-primary" disabled={!canPlay} onClick={onPlay} aria-label={ready ? `${complete ? 'Play again' : 'Play'} for ${formatMoney(stake)}` : 'Loading footage'}>
      {ready ? <Play size={43} fill="currentColor" /> : <LoaderCircle size={43} className="spin" />}
      <span>{ready ? 'PLAY' : 'LOADING'}</span>
    </Button>
    <div className="ig-controller-note"><span>30 SECOND SURVIVAL</span><strong>{complete ? 'Stake returned. Ready for another round.' : 'Choose your stake. Survive to collect.'}</strong></div>
  </section>;
}

export function IncentiveFooter({ stake, lastReturn, live }) {
  return <footer className="ig-footer">
    <span><small>BET</small> {formatMoney(stake)}</span>
    <span className="ig-demo-note">PLAY MONEY · {live ? 'ROUND IN PROGRESS' : 'SCRIPTED DEMONSTRATION'}</span>
    <span><small>LAST RETURN</small> {lastReturn === null ? '—' : formatMoney(lastReturn)}</span>
  </footer>;
}
