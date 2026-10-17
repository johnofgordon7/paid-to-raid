import React, { useId, useState } from 'react';
import './combat-simulation.css';

const OPENING = './assets/cashfire-opening.webp';
const WAREHOUSE = './assets/cashfire-extraction.webp';
const ENEMY_ART = './assets/branding/cashfire-enemy.png';
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const ease = (n) => { const x = clamp(n); return x * x * (3 - 2 * x); };
const flashAt = (time, events, length = .115) => events.reduce((strength, event) => Math.max(strength, time >= event && time < event + length ? 1 - (time - event) / length : 0), 0);

const POSITIONS = Object.freeze({
  ambush: [[66, 76, .98]],
  crossfire: [[24, 75, .88], [70, 77, 1.04], [44, 74, .93]],
  extraction: [[36, 76, .93], [68, 78, 1.07], [24, 76, 1.03], [58, 74, .91]],
  cashfire: [[31, 76, .96], [68, 75, .9], [48, 78, 1.04], [23, 76, .98], [73, 77, 1.02], [40, 75, .93], [61, 78, 1.06], [28, 76, 1.02], [69, 75, .95], [48, 78, 1.09]],
});

/** All motion derives from the accepted round's clock; pausing never changes a pose. */
export function combatVisualStateAt(outcome, requestedTime = 0) {
  const theme = outcome?.visualTheme || 'extraction';
  const duration = Number.isFinite(outcome?.duration) ? outcome.duration : 30;
  const time = clamp(Number(requestedTime) || 0, 0, duration);
  const kills = Array.isArray(outcome?.kills) ? outcome.kills : [];
  const positions = POSITIONS[theme] || POSITIONS.extraction;
  const dies = outcome?.survival === false;
  const deathProgress = dies ? ease((time - duration + .85) / .85) : 0;
  const incomingTimes = dies ? [duration - 3.25, duration - 2.15, duration - 1.15, duration - .23] : [];
  const hitStrength = flashAt(time, incomingTimes, .34);
  const shotTimes = kills.flatMap((kill) => [kill - .58, kill - .31, kill - .06]);
  const muzzle = flashAt(time, shotTimes);
  const recoil = flashAt(time, shotTimes, .20);
  const enemies = kills.map((killTime, index) => {
    const [x, y, scale] = positions[index % positions.length];
    const appearTime = Math.max(.2, killTime - (theme === 'cashfire' ? 1.75 : 2.45));
    return { id: `target-${index}`, index, x, y, scale, appearTime, killTime, direction: index % 2 === 0 ? -1 : 1 };
  });
  if (dies) {
    const side = theme === 'ambush' ? -1 : 1;
    enemies.push(
      { id: 'threat-left', index: 10, x: theme === 'ambush' ? 21 : 24, y: 82, scale: 1.26, appearTime: duration - 3.9, killTime: Infinity, direction: side },
      { id: 'threat-right', index: 11, x: theme === 'ambush' ? 59 : 74, y: 77, scale: 1.02, appearTime: duration - 2.75, killTime: Infinity, direction: -side },
    );
  }
  const visible = enemies.filter((enemy) => time >= enemy.appearTime && time < enemy.killTime + 1.1).map((enemy) => {
    const enter = ease((time - enemy.appearTime) / .75);
    const fall = Number.isFinite(enemy.killTime) ? ease((time - enemy.killTime) / .65) : 0;
    const alive = time < enemy.killTime;
    const fireTimes = enemy.killTime === Infinity
      ? [enemy.appearTime + .65, enemy.appearTime + 1.3, enemy.appearTime + 2.1, enemy.appearTime + 2.8, enemy.appearTime + 3.45]
      : [enemy.appearTime + .85, enemy.appearTime + 1.45];
    return { ...enemy, enter, fall, alive, fire: alive ? flashAt(time, fireTimes, .13) : 0, hit: flashAt(time, [enemy.killTime], .23), opacity: enter * (1 - ease((time - enemy.killTime - .5) / .6)) };
  });
  const target = visible.find((enemy) => enemy.alive && Number.isFinite(enemy.killTime)) || visible.find((enemy) => enemy.hit > 0) || visible.find((enemy) => enemy.alive);
  const indoor = theme === 'extraction' || theme === 'crossfire' ? 1 : theme === 'cashfire' ? ease((time - 13.6) / 2.3) : 0;
  const aimX = target ? target.x + target.direction * (1 - target.enter) * 13 : 49 + Math.sin(time * .55) * 6;
  const aimY = target ? target.y - 25 * target.scale : 51;
  return { theme, time, duration, visible, deathProgress, hitStrength, muzzle, recoil, indoor, aimX, aimY, targetId: target?.id, defeated: kills.filter((kill) => time >= kill).length };
}

function EnemyFallback({ hit }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="sim-enemy-vector" viewBox="0 0 180 340" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-armour`} x1="35" y1="60" x2="133" y2="235" gradientUnits="userSpaceOnUse"><stop stopColor="#63705a" /><stop offset=".45" stopColor="#303a31" /><stop offset="1" stopColor="#141c19" /></linearGradient>
        <linearGradient id={`${id}-cloth`} x1="25" y1="70" x2="130" y2="320" gradientUnits="userSpaceOnUse"><stop stopColor="#4b5145" /><stop offset=".55" stopColor="#252d28" /><stop offset="1" stopColor="#161d1b" /></linearGradient>
        <linearGradient id={`${id}-steel`} x1="25" y1="90" x2="150" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#515952" /><stop offset=".3" stopColor="#111816" /><stop offset="1" stopColor="#292e2a" /></linearGradient>
      </defs>
      <path d="M63 193 98 194 96 256 78 315 55 314 64 258 54 223Z" fill={`url(#${id}-cloth)`} stroke="#0b110e" strokeWidth="3" />
      <path d="M98 190 124 198 131 250 142 311 118 317 103 258 86 226Z" fill={`url(#${id}-cloth)`} stroke="#0b110e" strokeWidth="3" />
      <path d="m55 307 23 1 2 17-9 9-32-2 1-12Z M119 308l22-2 10 13 2 13-38 3-3-12Z" fill="#141a17" stroke="#080d0a" strokeWidth="3" />
      <path d="m58 251 26 3-8 24-20-3Z M108 250l23-5 6 22-22 8Z" fill="#424d3e" stroke="#20291f" strokeWidth="2" />
      <path d="M56 76 81 65 111 68 135 89 131 151 125 200 61 205 48 170 43 105Z" fill={`url(#${id}-cloth)`} stroke="#111a13" strokeWidth="3" />
      <path d="m63 77 17-7 29 3 20 21-4 83-60 2-11-74Z" fill={`url(#${id}-armour)`} stroke="#172116" strokeWidth="3" />
      <path d="m66 92 51 2-2 23-47-3Z" fill="#2c372a" stroke="#69765b" strokeOpacity=".55" />
      <path d="M69 125h13v31H69z M86 124h14v32H86z M104 125h13v30h-13z" fill="#48543e" stroke="#1d291b" strokeWidth="2" />
      <path d="m64 169 61-1 5 21-69 4Z" fill="#19231b" stroke="#596046" strokeWidth="2" />
      <path d="m55 80-16 11-15 58 17 10 24-44Z M123 86l17 7 18 42-19 20-28-41Z" fill={`url(#${id}-cloth)`} stroke="#152017" strokeWidth="3" />
      <path d="m28 144 13-11 26 13 11-18 15 8-17 31-19 3Z M139 129l16 6-10 29-46-14 5-18 27 11Z" fill={`url(#${id}-armour)`} stroke="#132015" strokeWidth="3" />
      <path d="m67 131 15-3 12 12-6 14-14-3Z M97 127l12 2 1 19-16 1-8-10Z" fill="#161e19" stroke="#46503e" strokeWidth="2" />
      <path d="m76 40 30 2 5 34-17 12-21-14Z" fill="#252f26" stroke="#111a13" strokeWidth="3" />
      <path d="M66 42q-1-29 25-31 30 0 31 29l-7 15-44-3Z" fill={`url(#${id}-armour)`} stroke="#172017" strokeWidth="3" />
      <path d="m69 42 49-1-3 15-44-1Z" fill="#111a16" stroke="#636b53" strokeWidth="2" />
      <path d="m75 46 36 1-2 6-33-1Z" fill="#9b9f70" fillOpacity=".42" />
      <path d="m75 61 30 1-6 16H81Z" fill="#111a16" stroke="#46503c" />
      <path d="m116 27 10 3v19l-9 3Z M63 29l9-4-1 25-7-2Z" fill="#20291e" stroke="#0e160e" strokeWidth="2" />
      <path d="m56 113 28 3 3-11 34 1 4 8 36 6v10l-44 1-6 26-13-3 3-27-19-1-12 14-15-5Z" fill={`url(#${id}-steel)`} stroke="#0b120e" strokeWidth="3" />
      <path d="m145 117 30 3v7l-30-1Z M104 103v-9h14v12" fill="#1b231f" stroke="#0c130e" strokeWidth="3" />
      <path d="M124 117h29 M127 121h23 M89 114l20 2 M84 187l29-1 M65 225l25 2 M106 222l17-5" stroke="#9aa387" strokeOpacity=".38" strokeWidth="2" />
      <path d="m48 96 9-4 M36 143l10 3 M118 93l9 5 M69 201l21 1 M101 201l19-4" stroke="#77816a" strokeOpacity=".46" strokeWidth="3" />
      {hit > 0 && <path d="M100 84 106 101 123 105 108 112 104 130 98 113 81 108 96 102Z" fill="#fff0b3" opacity={hit} />}
    </svg>
  );
}

function Enemy({ enemy, time, indoor, targeted, aimOpacity, recoil }) {
  const [artLoaded, setArtLoaded] = useState(false);
  const gait = Math.sin((time - enemy.appearTime) * 12) * (1 - enemy.enter) * 5;
  const x = enemy.x + enemy.direction * (1 - enemy.enter) * 13;
  const fallX = enemy.direction * enemy.fall * 27;
  return (
    <div className={`sim-enemy${enemy.alive ? ' is-alive' : ' is-falling'}${artLoaded ? ' has-cutout' : ''}${enemy.index % 2 ? ' is-mirrored' : ''}`} data-enemy-id={enemy.id} data-defeated={!enemy.alive} style={{ left: `${x}%`, top: `${enemy.y}%`, opacity: enemy.opacity, width: `${15.5 * enemy.scale}%`, '--sim-enemy-scale': enemy.scale, '--sim-enemy-tint': indoor ? '.86' : '1', transform: `translate(-50%, -100%) translate(${fallX}px, ${enemy.fall * 44 + gait}px) rotate(${enemy.direction * enemy.fall * 77}deg) scale(${.84 + enemy.enter * .16}, ${1 - enemy.fall * .25})` }}>
      <span className="sim-enemy-ground" style={{ opacity: 1 - enemy.fall * .7 }} />
      <EnemyFallback hit={enemy.hit} />
      <img className="sim-enemy-art" src={ENEMY_ART} alt="" draggable="false" onLoad={() => setArtLoaded(true)} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      <span className="sim-enemy-hit" style={{ opacity: enemy.hit }} />
      <span className="sim-enemy-flash" style={{ opacity: enemy.fire }} />
      {targeted && <div className={`sim-reticle sim-target-reticle${enemy.hit > 0 ? ' is-hit' : ''}`} style={{ opacity: aimOpacity, transform: `translate(-50%, -50%) rotate(${recoil * 8}deg) scale(${1 + recoil * .3})` }} aria-hidden="true"><i /><i /><i /><i /><span /></div>}
    </div>
  );
}

export default function CombatSimulation({ outcome, time = 0, phase = 'playing' }) {
  if (!outcome) return null;
  const state = combatVisualStateAt(outcome, time);
  const { theme, visible, deathProgress, hitStrength, recoil, muzzle, indoor } = state;
  const bob = Math.sin(state.time * 2.2) * 1.1;
  const pan = theme === 'ambush' ? Math.sin(state.time * .37) * 1.05 - .5 : theme === 'crossfire' ? Math.sin(state.time * .52) * 1.55 : Math.sin(state.time * .29) * .8;
  const deathDirection = theme === 'ambush' ? -1 : 1;
  const rotation = pan * .16 + deathDirection * deathProgress * (theme === 'ambush' ? 18 : 11);
  const push = 1.055 + Math.min(state.time, 28) * .0009;
  const sceneStyle = {
    transform: `translate(${pan - deathDirection * deathProgress * 3}%, ${bob - recoil * 2.4 + deathProgress * 12}px) rotate(${rotation}deg) scale(${push + deathProgress * .13 + recoil * .005})`,
    filter: `saturate(${1 - deathProgress * .93}) brightness(${.94 - deathProgress * .43}) blur(${deathProgress * 1.7}px)`,
  };
  const hitMarker = visible.some((enemy) => enemy.hit > 0);
  const aimVisibility = phase === 'starting' ? 0 : 1 - deathProgress;
  return (
    <div className={`combat-simulation simulation-${theme}${deathProgress > .1 ? ' is-dying' : ''}`} data-simulation={outcome.id} data-visual-kills={state.defeated} data-simulation-time={state.time.toFixed(2)} data-death-progress={deathProgress.toFixed(2)} role="img" aria-label={`${outcome.label || outcome.title || 'Cashfire'}: animated tactical combat simulation`}>
      <div className="sim-camera" style={sceneStyle}>
        <img className="sim-location sim-docks" src={OPENING} alt="" draggable="false" />
        <img className="sim-location sim-warehouse" src={WAREHOUSE} alt="" draggable="false" style={{ opacity: indoor }} />
        <div className="sim-world-haze" style={{ opacity: .23 + Math.sin(state.time * .35) * .05 }} />
        <div className="sim-rain" style={{ opacity: (1 - indoor) * .24, backgroundPosition: `${-state.time * 34}px ${state.time * 270}px` }} />
        <div className="sim-action-space">
          {visible.map((enemy) => <Enemy key={`${outcome.id}-${enemy.id}`} enemy={enemy} time={state.time} indoor={indoor} targeted={enemy.id === state.targetId} aimOpacity={aimVisibility} recoil={recoil} />)}
          <svg className="sim-tracers" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {visible.filter((enemy) => enemy.fire > 0).map((enemy) => <path key={enemy.id} d={`M${enemy.x + 4} ${enemy.y - 23 * enemy.scale} L${52 + enemy.direction * 13} 101`} stroke="#ffd493" strokeWidth=".13" opacity={enemy.fire * .75} />)}
          </svg>
          {!state.targetId && <div className={`sim-reticle${hitMarker ? ' is-hit' : ''}`} style={{ left: `${state.aimX}%`, top: `${state.aimY}%`, opacity: aimVisibility, transform: `translate(-50%, -50%) rotate(${recoil * 8}deg) scale(${1 + recoil * .3})` }} aria-hidden="true"><i /><i /><i /><i /><span /></div>}
        </div>
        <div className="sim-gun-fire" style={{ opacity: muzzle, left: indoor > .5 ? '57.2%' : '58.4%', top: indoor > .5 ? '58.3%' : '58.8%', transform: `translate(-50%, -50%) rotate(${state.time * 283 % 360}deg) scale(${.7 + muzzle * .6})` }} aria-hidden="true"><i /><span /></div>
        <div className="sim-muzzle-light" style={{ opacity: muzzle * .17 }} />
      </div>
      <div className="sim-lens" />
      <div className={`sim-damage sim-damage-${theme}`} style={{ opacity: Math.max(hitStrength * .86, deathProgress * .65) }} />
      <div className="sim-impact-scar" style={{ opacity: deathProgress * .75, transform: `rotate(${deathDirection * 8}deg)` }} />
      <div className="sim-death-shade" style={{ opacity: deathProgress * .67 }} />
    </div>
  );
}
