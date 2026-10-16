import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowDownRight, ArrowRight, Check, ChevronRight, Crosshair, Expand, History,
  Info, LoaderCircle, LockKeyhole, Maximize2, Minus, Moon, Pause, Play,
  Plus, Radio, RotateCcw, ShieldCheck, Skull, Sun, Volume2, VolumeX, X,
} from 'lucide-react';
import { Button, ButtonGroup, cn } from './ui.jsx';
import {
  DEMO_SEQUENCE, INITIAL_BALANCE, MAX_STAKE, MIN_STAKE, PAYOUTS, PRESETS, ROUND_LENGTH,
  formatMoney, formatMultiplier, multiplierFor, parseStake, settleOutcome, snapshotAt, validStake,
} from './game.js';
import { InterfaceAudio } from './audio.js';
import { loadCombatVideo } from './media.js';
import './base.css';
import './style.css';
import { IncentiveHeader, IncentiveControls, IncentiveFooter, STAKE_LADDER } from './IncentiveShell.jsx';
import './ig-shell.css';

const POSTER_URL = './assets/exfil-opening.webp';
const VICTORY_URL = './assets/call-of-booty-extraction.webp';

function Emblem({ className = '' }) {
  return (
    <svg className={className} aria-label="Paid to Raid emblem" viewBox="0 0 44 44" fill="none" role="img">
      <path d="M7 8h30M7 16l15 12 15-12v9L22 37 7 25z" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter" />
      <path d="M22 6v13" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function Modal({ open, onOpenChange, title, eyebrow, children, className = '' }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-shade" />
        <Dialog.Content className={cn('dialog-panel', className)} onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => (document.querySelector('.stake-dialog [aria-checked="true"]') || document.querySelector('[data-dialog-close]'))?.focus());
        }}>
          <div className="dialog-heading">
            <div>
              <span className="eyebrow">{eyebrow}</span>
              <Dialog.Title>{title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" data-dialog-close aria-label="Close dialog"><X size={20} /></Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function KillMeter({ kills, multiplier, stake, phase }) {
  const settled = phase === 'complete';
  return <aside className="kill-hud" aria-label="Kill meter and potential return" data-testid="kill-hud">
    <div className="kill-hud-heading"><Crosshair size={14} /><span>KILLS</span><strong>{String(kills).padStart(2, '0')} <small>/ 10</small></strong></div>
    <div className="kill-hud-track" role="meter" aria-label={`${kills} kills out of ten`} aria-valuenow={kills} aria-valuemin={0} aria-valuemax={10}>
      {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < kills ? 'achieved' : ''} />)}
    </div>
    <div className="kill-hud-return"><span>{settled ? 'TOTAL RETURNED' : 'RETURN IF YOU SURVIVE'}</span><strong>{formatMoney(Math.round(stake * multiplier))}<small>{formatMultiplier(multiplier)}</small></strong></div>
  </aside>;
}

function App() {
  const [phase, setPhase] = useState('idle');
  const [time, setTime] = useState(0);
  const [stakeText, setStakeText] = useState('10.00');
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [ready, setReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [mediaAttempt, setMediaAttempt] = useState(0);
  const [mediaError, setMediaError] = useState('');
  const [inputTouched, setInputTouched] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(.55);
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [draftStake, setDraftStake] = useState(1000);
  const [records, setRecords] = useState([]);
  const [buffering, setBuffering] = useState(false);
  const [pausedByVisibility, setPausedByVisibility] = useState(false);
  const [theme, setTheme] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [videoStats, setVideoStats] = useState({ width: 1280, height: 720, fps: 0 });
  const videoRef = useRef(null);
  const roundRef = useRef(null);
  const roundCounter = useRef(0);
  const phaseRef = useRef(phase);
  const dialogRef = useRef(dialog);
  const stateRef = useRef({});
  const virtualTime = useRef(null);
  const lastKill = useRef(0);
  const audio = useRef(new InterfaceAudio());
  const restoreFocusRef = useRef(null);
  const finalRef = useRef(null);
  const isLive = ['starting', 'playing', 'paused'].includes(phase);
  const parsedStake = parseStake(stakeText);
  const stakeValid = validStake(parsedStake, balance);
  const displayedStake = isLive || phase === 'complete' ? (roundRef.current?.stake || 1000) : (parsedStake ?? 0);
  const snapshot = snapshotAt(time);
  const showResult = phase === 'complete';
  const busy = isLive;
  const latestKillTime = snapshot.kills ? DEMO_SEQUENCE.kills[snapshot.kills - 1] : -10;
  const killNotice = isLive && time - latestKillTime >= 0 && time - latestKillTime < 2.2;
  const showCrosshair = isLive && phase !== 'starting';
  const stakeError = parsedStake === null
    ? 'Enter an amount with up to two decimal places.'
    : parsedStake < MIN_STAKE || parsedStake > MAX_STAKE
      ? 'Choose a stake from £0.10 to £100.00.'
      : parsedStake > balance ? 'Not enough demo balance.' : '';

  phaseRef.current = phase;
  dialogRef.current = dialog;
  stateRef.current = { phase, time, balance, stake: displayedStake, kills: snapshot.kills, multiplier: snapshot.multiplier, muted, volume, expanded, ready, buffering, mediaError, records: records.length };

  const openDialog = (type, event) => {
    restoreFocusRef.current = event?.currentTarget || document.activeElement;
    setDialog(type);
    if (phaseRef.current === 'playing') pauseRound();
  };

  const closeDialog = () => {
    setDialog(null);
    requestAnimationFrame(() => restoreFocusRef.current?.focus());
  };

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    loadCombatVideo({ signal: controller.signal }).then((url) => {
      objectUrl = url;
      if (controller.signal.aborted) URL.revokeObjectURL(url);
      else setVideoUrl(url);
    }).catch((error) => {
      if (error.name !== 'AbortError' && !controller.signal.aborted) {
        setMediaError('The combat footage could not load. No demo stake has been lost. Check your connection and retry.');
      }
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaAttempt]);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = volume;
    }
    audio.current.muted = muted;
    audio.current.volume = volume;
  }, [muted, volume]);

  const finishRound = useCallback(() => {
    const round = roundRef.current;
    if (!round || round.settled || round.aborted) return;
    round.settled = true;
    videoRef.current?.pause();
    const payout = settleOutcome(round.stake, 2, true);
    setTime(30);
    setBalance((old) => old + payout);
    setPhase('complete');
    phaseRef.current = 'complete';
    setExpanded(false);
    setBuffering(false);
    setRecords((old) => [{
      id: round.id, stake: round.stake, payout, kills: 2, multiplier: 1, survived: true,
    }, ...old].slice(0, 20));
    audio.current.success();
    requestAnimationFrame(() => finalRef.current?.focus());
  }, []);

  const abortRound = useCallback((message) => {
    const round = roundRef.current;
    if (round && !round.settled && !round.aborted) {
      round.aborted = true;
      setBalance((old) => old + round.stake);
    }
    videoRef.current?.pause();
    setPhase('idle');
    phaseRef.current = 'idle';
    setTime(0);
    setBuffering(false);
    setMediaError(message);
  }, []);

  const updateTime = useCallback((next) => {
    const clamped = Math.min(30, Math.max(0, next));
    setTime(clamped);
    const kills = snapshotAt(clamped).kills;
    if (kills > lastKill.current) audio.current.kill();
    lastKill.current = kills;
  }, []);

  async function startRound() {
    const existing = roundRef.current;
    if (existing && !existing.settled && !existing.aborted) return;
    const selectedStake = parseStake(stakeText);
    setInputTouched(true);
    if (!validStake(selectedStake, balance) || !ready) return;
    const video = videoRef.current;
    if (!video) return;
    virtualTime.current = null;
    lastKill.current = 0;
    setTime(0);
    setMediaError('');
    setPausedByVisibility(false);
    roundCounter.current += 1;
    roundRef.current = { id: roundCounter.current, stake: selectedStake, settled: false, aborted: false };
    setBalance((old) => old - selectedStake);
    setPhase('starting');
    phaseRef.current = 'starting';
    setBuffering(true);
    video.muted = muted;
    video.volume = volume;
    video.currentTime = 0;
    audio.current.unlock();
    try {
      await video.play();
      if (!roundRef.current?.aborted && !roundRef.current?.settled) {
        const interrupted = Boolean(dialogRef.current) || document.hidden;
        if (interrupted) video.pause();
        setPhase(interrupted ? 'paused' : 'playing');
        phaseRef.current = interrupted ? 'paused' : 'playing';
        if (document.hidden) setPausedByVisibility(true);
        setBuffering(false);
      }
    } catch {
      abortRound('Playback could not start. Your demo stake has been returned. Try again.');
    }
  }

  function pauseRound() {
    if (phaseRef.current !== 'playing') return;
    videoRef.current?.pause();
    setPhase('paused');
    phaseRef.current = 'paused';
    setBuffering(false);
  }

  async function resumeRound() {
    if (phaseRef.current !== 'paused') return;
    setPausedByVisibility(false);
    virtualTime.current = null;
    try {
      await videoRef.current?.play();
      setPhase('playing');
      phaseRef.current = 'playing';
    } catch {
      abortRound('Playback was interrupted. Your demo stake has been returned. Try again.');
    }
  }

  function backToBase() {
    if (phaseRef.current !== 'complete') return;
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
    setTime(0);
    lastKill.current = 0;
    virtualTime.current = null;
    setPhase('idle');
    phaseRef.current = 'idle';
    setExpanded(false);
    requestAnimationFrame(() => document.getElementById('start-btn')?.focus());
  }

  function chooseStake(cents) {
    if (busy) return;
    setStakeText((Math.min(MAX_STAKE, Math.max(MIN_STAKE, cents)) / 100).toFixed(2));
    setInputTouched(false);
    audio.current.click();
  }

  function retryMedia() {
    setMediaError('');
    setReady(false);
    setVideoUrl('');
    setMediaAttempt((old) => old + 1);
  }

  useEffect(() => {
    const ac = new AbortController();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && phaseRef.current === 'playing') {
        pauseRound();
        setPausedByVisibility(true);
      }
    }, { signal: ac.signal });
    document.addEventListener('keydown', (event) => {
      const tag = event.target?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag) || document.querySelector('[role="dialog"]')) return;
      if (event.key.toLowerCase() === 'f') setExpanded((old) => !old);
      if (event.key === 'Escape') setExpanded(false);
      if (event.code === 'Space' && ['playing', 'paused'].includes(phaseRef.current)) {
        event.preventDefault();
        if (phaseRef.current === 'paused') resumeRound(); else pauseRound();
      }
    }, { signal: ac.signal });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    let animationId;
    let lastUpdate = -1;
    let sampleAt = performance.now();
    let framesAt = 0;
    const tick = (now) => {
      const video = videoRef.current;
      if (video && phaseRef.current === 'playing' && virtualTime.current === null) {
        // End the round on its media clock, excluding the render's fractional tail.
        if (video.currentTime >= ROUND_LENGTH) {
          finishRound();
        } else if (Math.abs(video.currentTime - lastUpdate) > .025) {
          lastUpdate = video.currentTime;
          updateTime(video.currentTime);
        }
      }
      if (video && now - sampleAt >= 1000) {
        const frames = video.getVideoPlaybackQuality?.().totalVideoFrames || 0;
        const fps = video.paused ? 0 : Math.round((frames - framesAt) * 1000 / (now - sampleAt));
        setVideoStats({ width: video.videoWidth || 1280, height: video.videoHeight || 720, fps });
        sampleAt = now;
        framesAt = frames;
      }
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [finishRound, updateTime]);

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify({
      ...stateRef.current,
      remaining: snapshotAt(stateRef.current.time).remaining,
      survived: stateRef.current.phase === 'complete',
      sequence: DEMO_SEQUENCE.id,
      game: 'Paid to Raid',
      roundDuration: ROUND_LENGTH,
      payoutLadder: PAYOUTS,
      mediaDuration: videoRef.current?.duration || 0,
      mediaTime: videoRef.current?.currentTime || 0,
      readyState: videoRef.current?.readyState || 0,
      netResult: stateRef.current.phase === 'complete' ? 0 : null,
      demoOnly: true,
      outcomeRandomized: false,
      coordinates: 'Prerecorded first-person scene; screen origin top-left, x right, y down. No aiming or movement input.',
    });
    window.advanceTime = async (ms) => {
      const video = videoRef.current;
      if (!video || !['playing', 'paused'].includes(phaseRef.current)) return;
      if (virtualTime.current === null) virtualTime.current = video.currentTime;
      video.pause();
      const next = Math.min(30, virtualTime.current + ms / 1000);
      virtualTime.current = next;
      const requested = Math.min(next, Math.max(0, (video.duration || 30) - .01));
      const done = new Promise((resolve) => {
        if (Math.abs(video.currentTime - requested) < .001) { resolve(); return; }
        video.addEventListener('seeked', resolve, { once: true });
        video.currentTime = requested;
      });
      updateTime(next);
      await done;
      if (next >= 30) finishRound();
      await new Promise(requestAnimationFrame);
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
      audio.current.close();
    };
  }, [finishRound, updateTime]);

  useEffect(() => {
    if (!expanded) return;
    const key = (event) => { if (event.key === 'Escape' && !document.querySelector('[role="dialog"]')) setExpanded(false); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [expanded]);

  const multiplierLabel = snapshot.multiplier.toFixed(2) + '×';

  return (
    <div className={cn('app-shell', expanded && 'is-expanded', isLive && 'round-live')}>
      <a className="skip-link" href="#stake">Skip to game controls</a>
      <IncentiveHeader balance={balance} onInfo={(e) => openDialog('rules', e)} onMenu={(e) => openDialog('menu', e)} />
      <main id="main">
        <section className="game-frame" aria-label="Paid to Raid cinematic survival game">
          <div className="game-layout">
            <section className={cn('stage', isLive && 'stage-live', phase === 'paused' && 'stage-paused', showResult && 'stage-complete', expanded && 'stage-expanded')} aria-label="First-person combat sequence">
              <img className={cn('scene-poster', phase !== 'idle' && 'hidden-poster')} src={POSTER_URL} alt="First-person view across a rain-worn military shipping depot, a tactical rifle in the foreground." />
              <video ref={videoRef} className="combat-video" src={videoUrl || undefined} poster={POSTER_URL} preload="auto"
                playsInline disablePictureInPicture controlsList="nodownload noremoteplayback"
                aria-label="Thirty-second fictional combat animation with fast sprinting, two enemy eliminations and survival"
                onLoadedMetadata={(e) => {
                  const { duration, videoWidth, videoHeight } = e.currentTarget;
                  if (!Number.isFinite(duration) || duration < 29.8 || duration > 30.3) {
                    setMediaError('The demonstration could not load correctly. Reload the sequence to try again.');
                    return;
                  }
                  setVideoStats((old) => ({ ...old, width: videoWidth, height: videoHeight }));
                }}
                onCanPlay={() => { setReady(true); setBuffering(false); }}
                onWaiting={() => { if (isLive && phase !== 'paused') setBuffering(true); }}
                onPlaying={() => setBuffering(false)}
                onEnded={finishRound}
                onError={() => {
                  setReady(false);
                  abortRound('The combat footage could not load. No demo stake has been lost. Check your connection and retry.');
                }}
              />
              <div className="scene-grade" />
              <div className="stage-vignette" />
              <div className="hud-top">
                <div className="operation-tag"><span className={cn('status-dot', isLive && 'live-dot')} /><span>{showResult ? 'OPERATION COMPLETE' : isLive ? 'OPERATION LIVE' : 'AWAITING DEPLOYMENT'}</span></div>
                <div className="compass" aria-hidden="true"><span>W</span><i /><i /><span>NW</span><i /><b>N</b><i /><span>NE</span><i /></div>
                <div className={cn('timer', snapshot.remaining <= 5 && isLive && 'timer-urgent')}>
                  <span className="timer-label">{showResult ? 'SURVIVED' : 'SURVIVE'}</span>
                  <span className="timer-digits" data-testid="timer">00:{String(snapshot.remaining).padStart(2, '0')}</span>
                </div>
              </div>

              {phase === 'idle' && !mediaError && <div className="intro">
                <div className="intro-location"><span /> SECTOR 07 / INDUSTRIAL ZONE</div>
                <h1 className="sr-only">Paid to Raid</h1>
                <img className="game-title-logo" src="./assets/branding/paid-to-raid-logo.png" alt="Paid to Raid — military shooter game logo" />
                <p>Make the kills. Survive the clock.<br />Only the living get paid.</p>
                <div className="intro-footnote"><ArrowDownRight size={17} /> Set your stake. Press play. Watch it unfold.</div>
                {expanded && <Button onClick={startRound} disabled={!ready || !stakeValid} className="expanded-start"><Play size={17} fill="currentColor" /> PLAY {formatMoney(displayedStake)}</Button>}
              </div>}

              {showCrosshair && <div className={cn('crosshair', killNotice && 'crosshair-hit')} aria-hidden="true"><i /><i /><i /><i /><span /></div>}

              {killNotice && <div className="kill-confirmation" key={snapshot.kills}>
                <span className="kill-confirmation-icon"><Skull size={23} /></span>
                <div><span className="eyebrow">HOSTILE ELIMINATED</span><strong>+1 KILL <span>{multiplierLabel}</span></strong></div>
              </div>}

              {isLive && phase !== 'paused' && <div className={cn('objective', killNotice && 'objective-during-kill')}>
                <span className="objective-icon"><Radio size={17} /></span>
                <div><span className="eyebrow">{snapshot.kills === 2 ? 'EXTRACTION' : 'MISSION OBJECTIVE'}</span><span>{snapshot.objective}</span></div>
              </div>}

              {phase === 'paused' && !dialog && <div className="pause-screen">
                <span className="eyebrow">{pausedByVisibility ? 'YOUR ROUND IS SAFE' : 'OPERATION PAUSED'}</span>
                <h2>HOLDING POSITION</h2>
                <p>{pausedByVisibility ? 'Playback paused while you were away.' : 'The timer and your return are on hold.'}</p>
                <Button onClick={resumeRound} size="lg" className="resume-button"><Play size={17} fill="currentColor" /> RESUME OPERATION</Button>
              </div>}

              {buffering && isLive && <div className="buffer-indicator" role="status"><LoaderCircle size={19} className="spin" /> {phase === 'starting' ? 'DEPLOYING' : 'BUFFERING · TIMER HELD'}</div>}

              {mediaError && <div className="media-error" role="alert">
                <Info size={28} /><h2>COMMS INTERRUPTED</h2><p>{mediaError}</p>
                <Button onClick={retryMedia}><RotateCcw size={16} /> RECONNECT</Button>
              </div>}

              {showResult && <div className="result-screen" role="region" aria-label="Round result" aria-live="polite">
                <img src={VICTORY_URL} alt="" className="victory-art" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div className="result-content">
                  <Emblem className="victory-emblem" />
                  <span className="eyebrow">YOU MADE IT OUT</span>
                  <h2>EXTRACTED</h2>
                  <div className="result-divider"><span /> <ShieldCheck size={17} /> <span /></div>
                  <span className="eyebrow">TOTAL RETURNED</span>
                  <div className="result-money" data-testid="result-payout">{formatMoney(displayedStake)}<span>1.00×</span></div>
                  <div className="result-facts">
                    <span><Crosshair size={16} /> <b>2</b> KILLS</span>
                    <span><ShieldCheck size={16} /> <b>30s</b> SURVIVED</span>
                  </div>
                  <p className="result-explanation"><span className="result-return-label">Your stake, returned.</span><span className="result-net-label">Net result: {formatMoney(0)}</span></p>
                  <Button ref={finalRef} className="result-button" onClick={backToBase} size="lg">BACK TO BASE <ArrowRight size={18} /></Button>
                </div>
              </div>}

              <div className="stage-bottom">
                <div className="operator-status"><ShieldCheck size={15} /><span>{showResult ? 'EXTRACTED' : isLive ? 'OPERATOR ALIVE' : '30s / ONE LIFE'}</span></div>
                <div className="player-tools">
                  {isLive && <Button variant="ghost" size="icon" className="stage-icon" disabled={phase === 'starting'} onClick={phase === 'paused' ? resumeRound : pauseRound} aria-label={phase === 'paused' ? 'Resume round' : 'Pause round'} title={phase === 'paused' ? 'Resume round' : 'Pause round'}>
                    {phase === 'paused' ? <Play size={17} /> : <Pause size={17} />}
                  </Button>}
                  <Button variant="ghost" size="icon" className="stage-icon" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Unmute sound' : 'Mute sound'}>
                    {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </Button>
                  <label className="volume-control"><span className="sr-only">Sound volume</span><input type="range" min="0" max="1" step=".05" value={volume} onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }} aria-label="Sound volume" /></label>
                  <Button variant="ghost" size="icon" className="stage-icon" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Exit cinematic view' : 'Expand cinematic view'} title={expanded ? 'Exit cinematic view (Esc)' : 'Expand cinematic view (F)'}>
                    {expanded ? <X size={18} /> : <Maximize2 size={17} />}
                  </Button>
                </div>
              </div>
              <KillMeter kills={snapshot.kills} multiplier={snapshot.multiplier} stake={displayedStake} phase={phase} />
              <div className="round-progress" role="progressbar" aria-label="Round elapsed" aria-valuemin={0} aria-valuemax={30} aria-valuenow={Math.round(time)}><span style={{ width: `${time / 30 * 100}%` }} /></div>
            </section>

          </div>

        </section>
        {!isLive && <IncentiveControls stake={parsedStake ?? 0} ready={ready} canPlay={ready && stakeValid && !mediaError} complete={showResult}
          onPlay={startRound} onStake={(e) => { setDraftStake(parsedStake ?? 1000); openDialog('stakes', e); }}
          onStep={(direction) => {
            const current = parsedStake ?? 1000;
            const next = direction > 0 ? STAKE_LADDER.find((value) => value > current) : [...STAKE_LADDER].reverse().find((value) => value < current);
            if (next !== undefined) chooseStake(next);
          }} />}
      </main>
      <IncentiveFooter stake={isLive ? displayedStake : parsedStake ?? 0} lastReturn={records.length ? records[0].payout : null} live={isLive} />

      <Modal open={dialog === 'stakes'} onOpenChange={(open) => !open && closeDialog()} title="SELECT STAKE" eyebrow="NEXT DEMO ROUND" className="stake-dialog">
        <Dialog.Description className="dialog-description">Choose your next stake. Confirm to apply it.</Dialog.Description>
        <div className="stake-grid" role="radiogroup" aria-label="Available stakes">
          {STAKE_LADDER.map((value) => <Button key={value} className="stake-chip" role="radio" aria-checked={draftStake === value} disabled={value > balance} onClick={() => setDraftStake(value)}>{formatMoney(value)}</Button>)}
        </div>
        <Button className="stake-commit" disabled={!validStake(draftStake, balance)} onClick={() => { chooseStake(draftStake); closeDialog(); }}>SET STAKE · {formatMoney(draftStake)}</Button>
      </Modal>

      <Modal open={dialog === 'menu'} onOpenChange={(open) => !open && closeDialog()} title="MENU" eyebrow="PAID TO RAID">
        <Dialog.Description className="dialog-description">Game information and playback settings.</Dialog.Description>
        <div className="menu-options">
          <Button variant="ghost" onClick={() => setDialog('rules')}><Info size={18} /> How to Play / Paytable</Button>
          <Button variant="ghost" onClick={() => setDialog('history')}><History size={18} /> History</Button>
          <Button variant="ghost" onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />} Sound: {muted ? 'off' : 'on'}</Button>
          <Button variant="ghost" onClick={() => { setExpanded(!expanded); closeDialog(); }}><Maximize2 size={18} /> {expanded ? 'Exit cinematic view' : 'Cinematic view'}</Button>
          <Button variant="ghost" onClick={closeDialog}><X size={18} /> Close</Button>
        </div>
      </Modal>

      <Modal open={dialog === 'rules'} onOpenChange={(open) => !open && closeDialog()} title="The rules of survival." eyebrow="FIELD MANUAL">
        <Dialog.Description className="dialog-description">Set a demo stake, press Play, and watch a 30-second first-person combat sequence. There are no aiming or shooting controls.</Dialog.Description>
        <div className="rules-list">
          <div><span>01</span><p><strong>Make kills.</strong> Each confirmed elimination increases the return shown on the kill meter.</p></div>
          <div><span>02</span><p><strong>Stay alive.</strong> Returns are only paid after surviving the full 30 seconds. Elimination at any point means a zero return.</p></div>
          <div><span>03</span><p><strong>Collect at extraction.</strong> Multipliers are total returns, not extra profit. Two kills return your stake, for a net result of zero.</p></div>
        </div>
        <div className="paytable">
          <div className="paytable-heading"><span>KILLS AT SURVIVAL</span><span>TOTAL STAKE RETURN</span></div>
          {PAYOUTS.map((payout, kills) => <div key={kills} className={kills === 2 ? 'paytable-demo-tier' : undefined}><span>{kills} {kills === 1 ? 'kill' : 'kills'}</span><strong>{formatMultiplier(payout)}</strong></div>)}
          <div className="paytable-death"><span>Eliminated at any time</span><strong>0×</strong></div>
        </div>
        <div className="demo-disclosure"><Info size={18} /><p><strong>This demonstration is not random.</strong> Every round repeats the same two-kill survival sequence and returns 1× the stake. All balances are play money.</p></div>
        <div className="production-note"><span className="eyebrow">DEMO PAYOUT PROGRESSION</span><p>The 4–9 kill rewards are proposed prototype values. The full ladder is shown for illustration; this demonstration always ends with two kills.</p></div>
        <div className="production-note"><span className="eyebrow">FUTURE PRODUCTION CONCEPT</span><p>10,000 randomized animations with a target RTP of 97%. That outcome library, weighting, mathematical validation, and certification are not part of this demonstration.</p></div>
        <p className="motion-note">Combat motion and gunfire are part of the video. Sound can be muted, and playback can be paused at any point without changing the result.</p>
      </Modal>

      <Modal open={dialog === 'history'} onOpenChange={(open) => !open && closeDialog()} title="Operation log." eyebrow="THIS SESSION">
        <Dialog.Description className="dialog-description">Completed demonstration rounds. All amounts are play money.</Dialog.Description>
        {records.length === 0 ? <div className="history-empty"><History size={32} /><h3>No operations yet.</h3><p>Your first extraction will appear here.<br />Return to the depot and press Play.</p></div> : <>
          <div className="history-head"><span>ROUND</span><span>STAKE</span><span>RETURN</span></div>
          <div className="history-list">{records.map((record) => <div className="history-row" key={record.id}>
            <div><span><ShieldCheck size={16} /> EXTRACTED</span><small>#{String(record.id).padStart(3, '0')} · 2 KILLS · 1.00×</small></div>
            <span>{formatMoney(record.stake)}</span><strong>{formatMoney(record.payout)}</strong>
          </div>)}</div>
          <div className="session-summary"><span>SESSION NET RESULT</span><strong>{formatMoney(0)}</strong></div>
        </>}
      </Modal>
    </div>
  );
}

const appRoot = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'));
appRoot.render(<App />);
if (import.meta.hot) import.meta.hot.data.root = appRoot;
