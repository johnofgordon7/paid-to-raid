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
  shot() {
    if (!this.context || this.muted || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const buffer = this.context.createBuffer(1, Math.round(this.context.sampleRate * .095), this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 9173;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[i] = seed / 2147483648;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, now);
    gain.gain.setValueAtTime(.12 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .09);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(now);
    source.stop(now + .095);
  }
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
