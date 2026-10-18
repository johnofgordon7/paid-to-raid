import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowDownRight, ArrowRight, Check, ChevronRight, Crosshair, Expand, History,
  Info, LoaderCircle, LockKeyhole, Maximize2, Minus, Moon, Pause, Play,
  Plus, Radio, RotateCcw, ShieldCheck, Skull, Sun, Trophy, Volume2, VolumeX, X,
} from 'lucide-react';
import { Button, ButtonGroup, cn } from './ui.jsx';
import {
  DEMO_SEQUENCE, SEQUENCES, INITIAL_BALANCE, MAX_STAKE, MIN_STAKE, PAYOUTS, PRESETS, ROUND_LENGTH,
  formatMoney, formatMultiplier, multiplierFor, parseStake, pickSequence, settlementAt, snapshotAt, validStake,
} from './game.js';
import { InterfaceAudio } from './audio.js';
import { getVideoTransport, loadChunkedVideo } from './media.js';
import './base.css';
import './style.css';
import { IncentiveHeader, IncentiveControls, IncentiveFooter, STAKE_LADDER } from './IncentiveShell.jsx';
import './ig-shell.css';
import CashfireMeter from './CashfireMeter.jsx';
import './cashfire.css';

const POSTER_URL = './assets/exfil-opening.webp';

function releaseRoundMedia(round) {
  round?.loadController?.abort();
  if (round) round.loadingMedia = false;
  if (round?.objectUrl) {
    URL.revokeObjectURL(round.objectUrl);
    round.objectUrl = null;
  }
}

function Emblem({ className = '' }) {
  return (
    <svg className={className} aria-label="Cashfire emblem" viewBox="0 0 44 44" fill="none" role="img">
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

function App() {
  const [phase, setPhase] = useState('idle');
  const [time, setTime] = useState(0);
  const [stakeText, setStakeText] = useState('10.00');
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  // Footage is loaded only after the random draw, not all five clips on arrival.
  const [ready, setReady] = useState(true);
  const [mediaError, setMediaError] = useState('');
  const [inputTouched, setInputTouched] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(.55);
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [draftStake, setDraftStake] = useState(1000);
  const forcedSequenceRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [buffering, setBuffering] = useState(false);
  const [footageLoad, setFootageLoad] = useState(null);
  const [awaitingGesture, setAwaitingGesture] = useState(false);
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
  const pauseOnStartRef = useRef(false);
  const resumingRef = useRef(false);
  const isLive = ['starting', 'playing', 'paused'].includes(phase);
  const parsedStake = parseStake(stakeText);
  const stakeValid = validStake(parsedStake, balance);
  const displayedStake = isLive || phase === 'complete' ? (roundRef.current?.stake || 1000) : (parsedStake ?? 0);
  const sequence = roundRef.current?.sequence || DEMO_SEQUENCE;
  const snapshot = snapshotAt(time, sequence);
  const showResult = phase === 'complete';
  const result = showResult ? roundRef.current?.result : null;
  const eliminated = showResult && !result?.survived;
  const maximumWin = showResult && result?.multiplier === 1000;
  const busy = isLive;
  const latestKillTime = snapshot.kills ? sequence.kills[snapshot.kills - 1] : -10;
  const killNotice = isLive && time - latestKillTime >= 0 && time - latestKillTime < 2.2;
  const showCrosshair = isLive && phase !== 'starting';
  const stakeError = parsedStake === null
    ? 'Enter an amount with up to two decimal places.'
    : parsedStake < MIN_STAKE || parsedStake > MAX_STAKE
      ? 'Choose a stake from £0.10 to £100.00.'
      : parsedStake > balance ? 'Not enough demo balance.' : '';

  phaseRef.current = phase;
  dialogRef.current = dialog;
  const reservedStake = roundRef.current && !roundRef.current.settled && !roundRef.current.aborted ? roundRef.current.stake : 0;
  const sessionNet = balance + reservedStake - INITIAL_BALANCE;
  stateRef.current = {
    phase, time, balance, stake: displayedStake, kills: snapshot.kills,
    multiplier: snapshot.multiplier, remaining: snapshot.remaining,
    survived: !!result?.survived, eliminated, muted, volume, expanded, ready,
    buffering, mediaError, records: records.length, sessionNet,
    footageLoad, awaitingGesture,
    sequence: isLive || showResult ? sequence.id : null,
    sequenceDuration: isLive || showResult ? sequence.duration : null,
    totalReturned: result?.payout ?? null,
    netResult: result?.net ?? null,
  };

  const openDialog = (type, event) => {
    restoreFocusRef.current = event?.currentTarget || document.activeElement;
    pauseOnStartRef.current = true;
    dialogRef.current = type;
    setDialog(type);
    if (phaseRef.current === 'playing') pauseRound();
  };

  const closeDialog = () => {
    dialogRef.current = null;
    setDialog(null);
    requestAnimationFrame(() => restoreFocusRef.current?.focus());
  };

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => () => {
    const round = roundRef.current;
    if (round) round.aborted = true;
    releaseRoundMedia(round);
  }, []);
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
    if (videoRef.current?.currentSrc !== round.mediaSource) return;
    const elapsed = virtualTime.current ?? videoRef.current?.currentTime ?? 0;
    const settlement = settlementAt(round.stake, round.sequence, elapsed);
    if (!settlement) return;
    round.settled = true;
    round.result = settlement;
    videoRef.current?.pause();
    setTime(settlement.duration);
    setExpanded(false);
    setBalance((old) => old + settlement.payout);
    setPhase('complete');
    phaseRef.current = 'complete';
    setBuffering(false);
    setRecords((old) => [{
      id: round.id, stake: round.stake, operation: round.sequence.name,
      sequence: round.sequence.id, ...settlement,
    }, ...old].slice(0, 20));
    if (settlement.survived) audio.current.success(); else audio.current.defeat();
    requestAnimationFrame(() => finalRef.current?.focus());
  }, []);

  const abortRound = useCallback((message) => {
    const round = roundRef.current;
    if (round?.settled) return;
    if (round && !round.settled && !round.aborted) {
      round.aborted = true;
      setBalance((old) => old + round.stake);
    }
    videoRef.current?.pause();
    videoRef.current?.removeAttribute('src');
    videoRef.current?.load();
    releaseRoundMedia(round);
    setPhase('idle');
    phaseRef.current = 'idle';
    setTime(0);
    setBuffering(false);
    setReady(false);
    setFootageLoad(null);
    setAwaitingGesture(false);
    virtualTime.current = null;
    resumingRef.current = false;
    lastKill.current = 0;
    setMediaError(message);
  }, []);

  const updateTime = useCallback((next) => {
    const active = roundRef.current?.sequence || DEMO_SEQUENCE;
    const current = snapshotAt(next, active);
    setTime(current.time);
    const kills = current.kills;
    if (kills > lastKill.current) audio.current.kill();
    lastKill.current = kills;
  }, []);

  async function startRound() {
    const existing = roundRef.current;
    if (!['idle', 'complete'].includes(phaseRef.current)) return;
    if (existing && !existing.settled && !existing.aborted) return;
    const selectedStake = parseStake(stakeText);
    setInputTouched(true);
    if (!validStake(selectedStake, balance) || !ready || mediaError) return;
    const video = videoRef.current;
    if (!video) return;
    let selectedSequence, transport;
    let randomized = true;
    try {
      randomized = !forcedSequenceRef.current;
      selectedSequence = forcedSequenceRef.current ?? pickSequence();
      forcedSequenceRef.current = null;
      transport = getVideoTransport(selectedSequence.video);
    } catch {
      setMediaError('An operation could not be selected. No demo stake has been deducted. Reconnect and try again.');
      return;
    }
    video.pause();
    video.removeAttribute('src');
    video.load();
    releaseRoundMedia(existing);
    virtualTime.current = null;
    lastKill.current = 0;
    setTime(0);
    setMediaError('');
    setPausedByVisibility(false);
    setAwaitingGesture(false);
    pauseOnStartRef.current = false;
    resumingRef.current = false;
    roundCounter.current += 1;
    const round = {
      id: roundCounter.current, stake: selectedStake, sequence: selectedSequence,
      settled: false, aborted: false, result: null, randomized,
      transport: transport.type, expectedSha256: transport.sha256,
      mediaSource: '', mediaVerification: transport.type === 'direct' ? 'native-direct' : 'pending',
      loadingMedia: transport.type === 'chunks', loadController: new AbortController(), objectUrl: null,
    };
    roundRef.current = round;
    setBalance((old) => old - selectedStake);
    setPhase('starting');
    phaseRef.current = 'starting';
    setBuffering(true);
    setReady(false);
    setFootageLoad(transport.type === 'chunks' ? { loadedBytes: 0, totalBytes: transport.bytes, phase: 'loading' } : null);
    video.muted = muted;
    video.volume = volume;
    audio.current.unlock();
    try {
      // Direct small footage stays synchronous with the accepted Play gesture.
      // Larger footage is verified before native playback receives a Blob URL.
      if (transport.type === 'chunks') {
        const loaded = await loadChunkedVideo(selectedSequence.video, {
          signal: round.loadController.signal,
          onProgress(progress) {
            if (roundRef.current === round && !round.aborted && !round.settled) setFootageLoad(progress);
          },
        });
        if (roundRef.current !== round || round.aborted || round.settled) {
          URL.revokeObjectURL(loaded.url);
          return;
        }
        round.objectUrl = loaded.url;
        round.mediaSource = loaded.url;
        round.mediaVerification = 'sha256-verified';
        round.verifiedSha256 = loaded.sha256;
      } else {
        round.mediaSource = new URL(transport.url, location.href).href;
      }
      round.loadingMedia = false;
      video.src = round.mediaSource;
      video.load();
      video.currentTime = 0;
      if (pauseOnStartRef.current || dialogRef.current || document.hidden) {
        setPhase('paused');
        phaseRef.current = 'paused';
        setPausedByVisibility(document.hidden);
        setBuffering(false);
        return;
      }
      await video.play();
      if (roundRef.current !== round || round.aborted || round.settled) return;
      const shouldPause = pauseOnStartRef.current || dialogRef.current || document.hidden;
      if (shouldPause) video.pause();
      setPhase(shouldPause ? 'paused' : 'playing');
      phaseRef.current = shouldPause ? 'paused' : 'playing';
      setPausedByVisibility(document.hidden);
      setBuffering(false);
    } catch (error) {
      if (roundRef.current !== round || round.aborted || round.settled) return;
      if (error.name === 'NotAllowedError' && round.mediaSource) {
        video.pause();
        setAwaitingGesture(true);
        setPhase('paused');
        phaseRef.current = 'paused';
        setBuffering(false);
      } else {
        abortRound('The combat footage could not load or start. Your demo stake has been returned. Reconnect to try again.');
      }
    }
  }

  function pauseRound() {
    if (phaseRef.current !== 'playing') return;
    pauseOnStartRef.current = true;
    videoRef.current?.pause();
    setPhase('paused');
    phaseRef.current = 'paused';
    setBuffering(false);
  }

  async function resumeRound() {
    const round = roundRef.current;
    if (phaseRef.current !== 'paused' || resumingRef.current || !round || round.settled || round.aborted) return;
    if (round.loadingMedia || dialogRef.current || document.hidden) {
      if (document.hidden) setPausedByVisibility(true);
      return;
    }
    resumingRef.current = true;
    setAwaitingGesture(false);
    pauseOnStartRef.current = false;
    setPausedByVisibility(false);
    setBuffering(true);
    virtualTime.current = null;
    try {
      await videoRef.current?.play();
      if (roundRef.current !== round || round.aborted || round.settled) return;
      const shouldPause = pauseOnStartRef.current || dialogRef.current || document.hidden;
      if (shouldPause) videoRef.current?.pause();
      setPhase(shouldPause ? 'paused' : 'playing');
      phaseRef.current = shouldPause ? 'paused' : 'playing';
      setPausedByVisibility(document.hidden);
    } catch (error) {
      if (roundRef.current === round && !round.aborted && !round.settled) {
        if (error.name === 'NotAllowedError') {
          setAwaitingGesture(true);
          setPhase('paused');
          phaseRef.current = 'paused';
        } else {
          abortRound('Playback was interrupted. Your demo stake has been returned. Try again.');
        }
      }
    } finally {
      if (roundRef.current === round) {
        resumingRef.current = false;
        setBuffering(false);
      }
    }
  }

  function backToBase() {
    if (phaseRef.current !== 'complete') return;
    videoRef.current?.pause();
    if (videoRef.current) {
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    releaseRoundMedia(roundRef.current);
    roundRef.current = null;
    setTime(0);
    lastKill.current = 0;
    virtualTime.current = null;
    setReady(true);
    setBuffering(false);
    setFootageLoad(null);
    setAwaitingGesture(false);
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
    if (isLive) return;
    videoRef.current?.pause();
    videoRef.current?.removeAttribute('src');
    videoRef.current?.load();
    releaseRoundMedia(roundRef.current);
    roundRef.current = null;
    setMediaError('');
    setTime(0);
    virtualTime.current = null;
    lastKill.current = 0;
    pauseOnStartRef.current = false;
    resumingRef.current = false;
    setBuffering(false);
    setFootageLoad(null);
    setAwaitingGesture(false);
    setPhase('idle');
    phaseRef.current = 'idle';
    setReady(true);
  }

  useEffect(() => {
    const ac = new AbortController();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && phaseRef.current === 'playing') {
        pauseRound();
        setPausedByVisibility(true);
      } else if (document.hidden && (phaseRef.current === 'starting' || resumingRef.current)) {
        pauseOnStartRef.current = true;
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
      const activeSequence = roundRef.current?.sequence;
      if (video && activeSequence && video.currentSrc === roundRef.current.mediaSource && phaseRef.current === 'playing' && virtualTime.current === null) {
        // End the round on its media clock, excluding the render's fractional tail.
        if (video.currentTime >= activeSequence.duration) {
          finishRound();
        } else if (Math.abs(video.currentTime - lastUpdate) > .025) {
          lastUpdate = video.currentTime;
          updateTime(video.currentTime);
        }
      }
      if (video && now - sampleAt >= 1000) {
        const frames = video.getVideoPlaybackQuality?.().totalVideoFrames || 0;
        const fps = video.paused ? 0 : Math.max(0, Math.round((frames - framesAt) * 1000 / (now - sampleAt)));
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
      game: 'Cashfire',
      roundDuration: ROUND_LENGTH,
      payoutLadder: PAYOUTS,
      mediaDuration: videoRef.current?.duration || 0,
      mediaTime: videoRef.current?.currentTime || 0,
      mediaSource: videoRef.current?.currentSrc || '',
      selectedMediaSource: roundRef.current?.mediaSource || '',
      selectedVideo: roundRef.current?.sequence.video || null,
      activeRoundId: roundRef.current?.id || null,
      mediaTransport: roundRef.current?.transport || null,
      mediaLoading: roundRef.current?.loadingMedia || false,
      mediaVerification: roundRef.current?.mediaVerification || null,
      verifiedMediaSha256: roundRef.current?.verifiedSha256 || null,
      expectedMediaSha256: roundRef.current?.expectedSha256 || null,
      outcomeId: roundRef.current?.sequence.id || null,
      duration: roundRef.current?.sequence.duration || ROUND_LENGTH,
      clipDuration: roundRef.current?.sequence.clipDuration || ROUND_LENGTH,
      readyState: videoRef.current?.readyState || 0,
      demoOnly: true,
      outcomeRandomized: roundRef.current?.randomized ?? true,
      outcomeCount: SEQUENCES.length,
      chancePerOutcome: 1 / SEQUENCES.length,
      coordinates: 'Prerecorded first-person scene; screen origin top-left, x right, y down. No aiming or movement input.',
    });
    window.advanceTime = async (ms) => {
      const video = videoRef.current;
      const acceptedRound = roundRef.current;
      const activeSequence = acceptedRound?.sequence;
      if (!video || !activeSequence || !Number.isFinite(ms) || ms < 0 || !['playing', 'paused'].includes(phaseRef.current)) return;
      if (virtualTime.current === null) virtualTime.current = video.currentTime;
      video.pause();
      const next = Math.min(activeSequence.duration, virtualTime.current + ms / 1000);
      virtualTime.current = next;
      const requested = Math.min(next, Math.max(0, (video.duration || activeSequence.clipDuration) - .01));
      const done = new Promise((resolve) => {
        if (Math.abs(video.currentTime - requested) < .001) { resolve(); return; }
        video.addEventListener('seeked', resolve, { once: true });
        video.currentTime = requested;
      });
      updateTime(next);
      await done;
      if (roundRef.current !== acceptedRound || acceptedRound.aborted || acceptedRound.settled || video.currentSrc !== acceptedRound.mediaSource) return;
      if (next >= activeSequence.duration) finishRound();
      await new Promise(requestAnimationFrame);
    };
    const localQA = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('qa') === '1';
    if (import.meta.env?.DEV || localQA) {
      window.__cashfireTest = {
        outcomes: SEQUENCES.map(({ id, name, duration, clipDuration, kills, multiplier, survival, video }) => ({ id, label: name, duration, clipDuration, finalKills: kills.length, multiplier, survival, video })),
        forceNextOutcome(id) {
          if (['starting', 'playing', 'paused'].includes(phaseRef.current)) throw new Error('Cannot change an accepted round.');
          const selected = SEQUENCES.find((item) => item.id === id);
          if (!selected) throw new Error('Unknown outcome.');
          forcedSequenceRef.current = selected;
          return selected.id;
        },
      };
    }
    return () => {
      delete window.__cashfireTest;
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

  const multiplierLabel = formatMultiplier(snapshot.multiplier);

  return (
    <div className={cn('app-shell', expanded && 'is-expanded', isLive && 'round-live')}>
      <a className="skip-link" href="#stake">Skip to game controls</a>
      <IncentiveHeader balance={balance} onInfo={(e) => openDialog('rules', e)} onMenu={(e) => openDialog('menu', e)} />

      <main id="main">
        <section className="game-frame" aria-label="Cashfire cinematic survival game">
          <div className="game-layout">
            <section className={cn('stage', isLive && 'stage-live', phase === 'paused' && 'stage-paused', showResult && 'stage-complete', eliminated && 'stage-eliminated', expanded && 'stage-expanded')} aria-label="First-person combat sequence">
              <img className={cn('scene-poster', phase !== 'idle' && 'hidden-poster')} src={POSTER_URL} alt="First-person view across a rain-worn military shipping depot, a tactical rifle in the foreground." />
              <video ref={videoRef} className="combat-video" poster={POSTER_URL} preload="metadata"
                playsInline disablePictureInPicture controlsList="nodownload noremoteplayback"
                aria-label="Randomly selected fictional first-person combat animation"
                onLoadedMetadata={(e) => {
                  const { duration, videoWidth, videoHeight } = e.currentTarget;
                  const round = roundRef.current;
                  if (!round || round.aborted || round.settled || e.currentTarget.currentSrc !== round.mediaSource) return;
                  if (!Number.isFinite(duration) || duration < round.sequence.duration || Math.abs(duration - round.sequence.clipDuration) > .65) {
                    abortRound('This operation could not load completely. Your demo stake has been returned. Reconnect to try again.');
                    return;
                  }
                  setReady(true);
                  setVideoStats((old) => ({ ...old, width: videoWidth, height: videoHeight }));
                }}
                onCanPlay={(e) => {
                  const round = roundRef.current;
                  if (round && !round.aborted && round.mediaSource && e.currentTarget.currentSrc === round.mediaSource) {
                    setReady(true); setBuffering(false);
                  }
                }}
                onWaiting={(e) => {
                  const round = roundRef.current;
                  if (round && e.currentTarget.currentSrc === round.mediaSource && ['starting', 'playing'].includes(phaseRef.current)) setBuffering(true);
                }}
                onPlaying={(e) => {
                  if (e.currentTarget.currentSrc === roundRef.current?.mediaSource) setBuffering(false);
                }}
                onEnded={(e) => {
                  const round = roundRef.current;
                  if (!e.currentTarget.ended || !round || round.settled || round.aborted || e.currentTarget.currentSrc !== round.mediaSource) return;
                  if (e.currentTarget.currentTime < round.sequence.duration) {
                    abortRound('The footage ended unexpectedly. Your demo stake has been returned. Reconnect to try again.');
                  } else finishRound();
                }}
                onError={(e) => {
                  if (e.currentTarget.error && roundRef.current?.mediaSource && e.currentTarget.currentSrc === roundRef.current.mediaSource) {
                    abortRound('The combat footage could not load. No demo stake has been lost. Check your connection and retry.');
                  }
                }}
              />
              <div className="scene-grade" />
              <div className="stage-vignette" />
              <div className="hud-top">
                <div className="operation-tag"><span className={cn('status-dot', isLive && 'live-dot')} /><span>{eliminated ? 'OPERATOR DOWN' : showResult ? 'OPERATION COMPLETE' : isLive ? 'OPERATION LIVE' : 'AWAITING DEPLOYMENT'}</span></div>
                <div className="compass" aria-hidden="true"><span>W</span><i /><i /><span>NW</span><i /><b>N</b><i /><span>NE</span><i /></div>
                <div className={cn('timer', snapshot.remaining <= 5 && isLive && 'timer-urgent')}>
                  <span className="timer-label">{eliminated ? 'TIME LEFT' : showResult ? 'SURVIVED' : 'SURVIVE'}</span>
                  <span className="timer-digits" data-testid="timer">00:{String(snapshot.remaining).padStart(2, '0')}</span>
                </div>
              </div>

              {phase === 'idle' && !mediaError && <div className="intro">
                <div className="intro-location"><span /> SECTOR 07 / INDUSTRIAL ZONE</div>
                <h1 className="sr-only">Cashfire</h1>
                <img className="game-title-logo" src="./assets/branding/cashfire-logo.png" alt="Cashfire military shooter game logo" />
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
                <div><span className="eyebrow">{sequence.survival && snapshot.kills === sequence.kills.length ? 'EXTRACTION' : 'MISSION OBJECTIVE'}</span><span>{snapshot.objective}</span></div>
              </div>}

              {phase === 'paused' && !dialog && <div className="pause-screen">
                <span className="eyebrow">{awaitingGesture ? 'FOOTAGE READY' : pausedByVisibility ? 'YOUR ROUND IS SAFE' : 'OPERATION PAUSED'}</span>
                <h2>HOLDING POSITION</h2>
                <p>{awaitingGesture ? 'Tap Resume to start your selected round. The timer is held.' : pausedByVisibility ? 'Playback paused while you were away.' : 'The timer and your return are on hold.'}</p>
                <Button onClick={resumeRound} size="lg" className="resume-button"><Play size={17} fill="currentColor" /> RESUME OPERATION</Button>
              </div>}

              {buffering && isLive && <div className="buffer-indicator" role="status"><LoaderCircle size={19} className="spin" /> {phase === 'starting' ? `DEPLOYING${footageLoad ? ` ${Math.floor(footageLoad.loadedBytes / footageLoad.totalBytes * 100)}%` : ''} · TIMER HELD` : 'BUFFERING · TIMER HELD'}</div>}

              {mediaError && <div className="media-error" role="alert">
                <Info size={28} /><h2>COMMS INTERRUPTED</h2><p>{mediaError}</p>
                <Button onClick={retryMedia}><RotateCcw size={16} /> RECONNECT</Button>
              </div>}

              {showResult && <div className={cn('result-screen', eliminated && 'result-defeat', maximumWin && 'result-maximum')} role="region" aria-label="Round result" aria-live="polite">
                <img src={sequence.resultArt} alt="" className="victory-art" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div className="result-content">
                  {eliminated ? <Skull className="victory-emblem" /> : maximumWin ? <Trophy className="victory-emblem" /> : <Emblem className="victory-emblem" />}
                  <span className="eyebrow">{eliminated ? 'OPERATION FAILED' : maximumWin ? 'MAXIMUM PAYOUT' : 'YOU MADE IT OUT'}</span>
                  <h2>{eliminated ? 'ELIMINATED' : 'EXTRACTED'}</h2>
                  <div className="result-divider"><span /> {eliminated ? <X size={17} /> : <ShieldCheck size={17} />} <span /></div>
                  <span className="eyebrow">TOTAL RETURNED</span>
                  <div className="result-money" data-testid="result-payout">{formatMoney(result.payout)}<span>{formatMultiplier(result.multiplier)}</span></div>
                  <div className="result-facts">
                    <span><Crosshair size={16} /> <b>{result.kills}</b> {result.kills === 1 ? 'KILL' : 'KILLS'}</span>
                    <span>{eliminated ? <Skull size={16} /> : <ShieldCheck size={16} />} <b>{Number(result.duration.toFixed(1))}s</b> {eliminated ? 'ELAPSED' : 'SURVIVED'}</span>
                  </div>
                  <p className="result-explanation"><span className="result-return-label">{eliminated ? 'Full stake lost. No return.' : result.net === 0 ? 'Your stake, returned.' : 'Return credited to your demo balance.'}</span><span className="result-net-label">Net result: {result.net > 0 ? '+' : ''}{formatMoney(result.net)}</span></p>
                  <Button ref={finalRef} className="result-button" onClick={backToBase} size="lg">BACK TO BASE <ArrowRight size={18} /></Button>
                </div>
              </div>}

              <div className="stage-bottom">
                <div className="operator-status">{eliminated ? <Skull size={15} /> : <ShieldCheck size={15} />}<span>{eliminated ? 'OPERATOR ELIMINATED' : showResult ? 'EXTRACTED' : isLive ? 'OPERATOR ALIVE' : '30s / ONE LIFE'}</span></div>
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

              <CashfireMeter kills={snapshot.kills} multiplier={snapshot.multiplier} stake={displayedStake} phase={phase} survived={result?.survived ?? false} />
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

      <Modal open={dialog === 'menu'} onOpenChange={(open) => !open && closeDialog()} title="MENU" eyebrow="CASHFIRE">
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
        <Dialog.Description className="dialog-description">Set a demo stake and press Play. One of five first-person combat sequences is selected at random. Survive for 30 seconds to collect; death ends the round early. There are no aiming or shooting controls.</Dialog.Description>
        <div className="rules-list">
          <div><span>01</span><p><strong>Make kills.</strong> Each confirmed elimination increases the return shown on the kill meter.</p></div>
          <div><span>02</span><p><strong>Stay alive.</strong> Returns are only paid after surviving the full 30 seconds. Elimination at any point means a zero return.</p></div>
          <div><span>03</span><p><strong>Collect at extraction.</strong> Multipliers are total returns, not extra profit. Two kills return your stake, for a net result of zero.</p></div>
        </div>
        <div className="paytable">
          <div className="paytable-heading"><span>KILLS AT SURVIVAL</span><span>TOTAL STAKE RETURN</span></div>
          {PAYOUTS.map((payout, kills) => <div key={kills} className={[2, 4, 10].includes(kills) ? 'paytable-demo-tier' : undefined}><span>{kills} {kills === 1 ? 'kill' : 'kills'}</span><strong>{formatMultiplier(payout)}</strong></div>)}
          <div className="paytable-death"><span>Eliminated at any time</span><strong>0×</strong></div>
        </div>
        <div className="demo-disclosure"><Info size={18} /><p><strong>Five outcomes, equal chances.</strong> Each has a 20% chance on every Play. Selection is independent, so the same round can repeat. All balances are play money; these are demonstration chances, not production odds.</p></div>
        <div className="outcome-list" aria-label="Five demo outcomes">
          {SEQUENCES.map((item) => <div key={item.id}><span>{item.name}<small>{item.kills.length} {item.kills.length === 1 ? 'kill' : 'kills'} · {item.survival ? 'survive 30s' : 'death before 30s'}</small></span><strong>{formatMultiplier(item.multiplier)}</strong></div>)}
        </div>
        <div className="production-note"><span className="eyebrow">DEMO PAYOUT PROGRESSION</span><p>The full ladder is illustrative. These five clips demonstrate two zero-return deaths and surviving returns of 1×, 5× and 1,000×. Other survival tiers are not included in this demo playlist.</p></div>
        <div className="production-note"><span className="eyebrow">FUTURE PRODUCTION CONCEPT</span><p>10,000 randomized animations with a target RTP of 97%. That larger outcome library, production weighting, mathematical validation, and certification are not part of this demonstration.</p></div>
        <p className="motion-note">Combat motion and gunfire are part of the video. Sound can be muted, and playback can be paused at any point without changing the result.</p>
      </Modal>

      <Modal open={dialog === 'history'} onOpenChange={(open) => !open && closeDialog()} title="Operation log." eyebrow="THIS SESSION">
        <Dialog.Description className="dialog-description">Your latest 20 completed rounds, including extractions and losses. All amounts are play money.</Dialog.Description>
        {records.length === 0 ? <div className="history-empty"><History size={32} /><h3>No operations yet.</h3><p>Your completed rounds will appear here.<br />Return to the depot and press Play.</p></div> : <>
          <div className="history-head"><span>ROUND</span><span>STAKE</span><span>RETURN</span></div>
          <div className="history-list">{records.map((record) => <div className={cn('history-row', !record.survived && 'history-loss')} key={record.id}>
            <div><span>{record.survived ? <ShieldCheck size={16} /> : <Skull size={16} />} {record.survived ? 'EXTRACTED' : 'ELIMINATED'}</span><small>#{String(record.id).padStart(3, '0')} · {record.kills} {record.kills === 1 ? 'KILL' : 'KILLS'} · {formatMultiplier(record.multiplier)}</small></div>
            <span>{formatMoney(record.stake)}</span><strong>{formatMoney(record.payout)}</strong>
          </div>)}</div>
          <div className={cn('session-summary', sessionNet < 0 && 'is-negative')}><span>SESSION NET RESULT</span><strong>{sessionNet > 0 ? '+' : ''}{formatMoney(sessionNet)}</strong></div>
        </>}
      </Modal>
    </div>
  );
}

const appRoot = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'));
appRoot.render(<App />);
if (import.meta.hot) import.meta.hot.data.root = appRoot;
