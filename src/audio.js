export class InterfaceAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.volume = .5;
  }
  async unlock() {
    try {
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* The video remains playable when browser audio is unavailable. */ }
  }
  tone(frequency, duration, delay = 0, shape = 'sine', strength = .06) {
    if (!this.context || this.muted || this.context.state !== 'running') return;
    const now = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(strength * this.volume, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration + .01);
  }
  click() { this.tone(520, .07, 0, 'sine', .04); }
  kill() {
    this.tone(740, .14, 0, 'triangle', .08);
    this.tone(1108, .2, .08, 'sine', .06);
  }
  success() {
    [392, 494, 587, 784].forEach((n, i) => this.tone(n, .65, i * .12, 'triangle', .055));
  }
  async close() {
    if (this.context && this.context.state !== 'closed') await this.context.close();
  }
}
