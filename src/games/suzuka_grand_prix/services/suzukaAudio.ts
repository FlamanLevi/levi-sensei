/**
 * 3D Suzuka Grand Prix Audio Service
 * AAA Studio Single-Mic Engine Audio with Real Sampled Stems & WebAudio Synth.
 *
 * Stems:
 * - kart_idle_loop.wav       (Stationary 850 RPM start-line idle & sub-bass rumble)
 * - kart_cruise_mid_loop.wav (Crisp mid-RPM driving cruise & exhaust resonance)
 * - kart_tire_drift_loop.wav (Asphalt rubber scrub & micro-chatter)
 * - curb_rumble_loop.wav     (FIA red-white curb vibration thud)
 * - engine_sputter_burst_1..3.wav (Authentic backfire misfire slices)
 *
 * Adheres strictly to Levi-Sensei Rule 6 (Classroom Audio & iPad Web Audio Resilience).
 */

const AUDIO_BASE_PATH = '/assets/audio/grand_prix';

const LOOP_STEMS = {
  idle: `${AUDIO_BASE_PATH}/kart_idle_loop.wav`,
  cruise: `${AUDIO_BASE_PATH}/kart_cruise_mid_loop.wav`,
  drift: `${AUDIO_BASE_PATH}/kart_tire_drift_loop.wav`,
  curb: `${AUDIO_BASE_PATH}/curb_rumble_loop.wav`,
};

const SPUTTER_STEMS = [
  `${AUDIO_BASE_PATH}/engine_sputter_burst_1.wav`,
  `${AUDIO_BASE_PATH}/engine_sputter_burst_2.wav`,
  `${AUDIO_BASE_PATH}/engine_sputter_burst_3.wav`,
];

class SuzukaAudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isStarted: boolean = false;

  // Master Audio Nodes
  private masterGain: GainNode | null = null;
  private engineBusGain: GainNode | null = null;
  private misfireDuckGain: GainNode | null = null;
  private lowShelfFilter: BiquadFilterNode | null = null;
  private presencePeakFilter: BiquadFilterNode | null = null;
  private engineBusFilter: BiquadFilterNode | null = null;

  // Sub-Bass Sine Resonator (<95 Hz)
  private rumbleSubOsc: OscillatorNode | null = null;
  private rumbleOutGain: GainNode | null = null;

  // Loop Nodes & Gains
  private loopSources: Partial<Record<keyof typeof LOOP_STEMS, AudioBufferSourceNode>> = {};
  private loopGains: Partial<Record<keyof typeof LOOP_STEMS, GainNode>> = {};
  private loopBuffers: Partial<Record<keyof typeof LOOP_STEMS, AudioBuffer>> = {};

  // Sputter One-Shot Buffers
  private sputterBuffers: AudioBuffer[] = [];

  // Telemetry Smoothing
  private smoothSpeed: number = 0;
  private prevSpeed: number = 0;
  private prevTime: number = performance.now();
  private isDrifting: boolean = false;
  private onCurb: boolean = false;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Lazy initialized on first user interaction to comply with iOS Safari autoplay rules
  }

  private getAudioContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0001 : 0.32, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Presence filter: 1550 Hz peaking for crisp mechanical snap
      this.presencePeakFilter = this.ctx.createBiquadFilter();
      this.presencePeakFilter.type = 'peaking';
      this.presencePeakFilter.frequency.value = 1550;
      this.presencePeakFilter.Q.value = 1.0;
      this.presencePeakFilter.gain.value = 1.6;
      this.presencePeakFilter.connect(this.masterGain);

      // Engine bus lowpass filter: 6200 Hz open, rolling off gently under high pitch
      this.engineBusFilter = this.ctx.createBiquadFilter();
      this.engineBusFilter.type = 'lowpass';
      this.engineBusFilter.frequency.value = 6200;
      this.engineBusFilter.Q.value = 0.707;
      this.engineBusFilter.connect(this.presencePeakFilter);

      // 98 Hz low-shelf filter for physical muffler pulse
      this.lowShelfFilter = this.ctx.createBiquadFilter();
      this.lowShelfFilter.type = 'lowshelf';
      this.lowShelfFilter.frequency.value = 98;
      this.lowShelfFilter.gain.value = 3.5;
      this.lowShelfFilter.connect(this.engineBusFilter);

      // Misfire duck gain: temporarily dips 16ms during exhaust pops
      this.misfireDuckGain = this.ctx.createGain();
      this.misfireDuckGain.gain.value = 1.0;
      this.misfireDuckGain.connect(this.lowShelfFilter);

      // Engine bus master
      this.engineBusGain = this.ctx.createGain();
      this.engineBusGain.gain.value = 1.0;
      this.engineBusGain.connect(this.misfireDuckGain);

      // Pure <95 Hz sub-harmonic sine reinforcer
      this.rumbleSubOsc = this.ctx.createOscillator();
      this.rumbleSubOsc.type = 'sine';
      this.rumbleSubOsc.frequency.value = 55.0;

      const rumbleLowpass = this.ctx.createBiquadFilter();
      rumbleLowpass.type = 'lowpass';
      rumbleLowpass.frequency.value = 95.0;
      rumbleLowpass.Q.value = 0.707;

      this.rumbleOutGain = this.ctx.createGain();
      this.rumbleOutGain.gain.value = 0.0;

      this.rumbleSubOsc.connect(rumbleLowpass);
      rumbleLowpass.connect(this.rumbleOutGain);
      this.rumbleOutGain.connect(this.masterGain);
      this.rumbleSubOsc.start();

      return this.ctx;
    } catch {
      return null;
    }
  }

  private async loadAllStems(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const fetchBuffer = async (url: string): Promise<AudioBuffer | null> => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) return null;
          const arrayBuf = await resp.arrayBuffer();
          return await ctx.decodeAudioData(arrayBuf);
        } catch {
          return null;
        }
      };

      // Load loop buffers
      const entries = Object.entries(LOOP_STEMS) as [keyof typeof LOOP_STEMS, string][];
      await Promise.all(
        entries.map(async ([key, url]) => {
          const buf = await fetchBuffer(url);
          if (buf) this.loopBuffers[key] = buf;
        })
      );

      // Load sputter buffers
      const sputterProms = SPUTTER_STEMS.map((url) => fetchBuffer(url));
      const sputters = await Promise.all(sputterProms);
      this.sputterBuffers = sputters.filter((b): b is AudioBuffer => b !== null);

      this.isLoaded = true;
    })();

    return this.loadPromise;
  }

  private startLoopingSource(key: keyof typeof LOOP_STEMS, destination: AudioNode): void {
    const ctx = this.getAudioContext();
    const buffer = this.loopBuffers[key];
    if (!ctx || !buffer) return;

    // Stop existing source if already playing
    if (this.loopSources[key]) {
      try {
        this.loopSources[key]?.stop();
        this.loopSources[key]?.disconnect();
      } catch {
        // Safe ignore
      }
    }

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(destination);
    this.loopGains[key] = gain;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(gain);
    src.start(0);
    this.loopSources[key] = src;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0.0001 : 0.32, now, 0.04);
    }
  }

  public async startEngine(): Promise<void> {
    if (this.isStarted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    await this.loadAllStems();
    if (!this.misfireDuckGain || !this.masterGain) return;

    // Start engine loops: idle and cruise route through misfire duck gain
    this.startLoopingSource('idle', this.misfireDuckGain);
    this.startLoopingSource('cruise', this.misfireDuckGain);

    // Surface interaction loops: drift and curb route directly to master gain
    this.startLoopingSource('drift', this.masterGain);
    this.startLoopingSource('curb', this.masterGain);

    // Initial idle gain
    if (this.loopGains.idle) {
      this.loopGains.idle.gain.setTargetAtTime(0.85, ctx.currentTime, 0.05);
    }

    this.isStarted = true;
  }

  public updateEngineTelemetry(
    speedKmh: number,
    isBoosting: boolean = false,
    options?: { isDrifting?: boolean; onCurb?: boolean; slope?: number }
  ): void {
    if (!this.isStarted || !this.ctx || this.ctx.state !== 'running') return;

    const nowMs = performance.now();
    const dt = Math.min(0.1, Math.max(0.005, (nowMs - this.prevTime) / 1000));
    this.prevTime = nowMs;

    const targetSpeed = Math.max(0, speedKmh);
    const alpha = 1.0 - Math.exp(-9.0 * dt);
    this.smoothSpeed += (targetSpeed - this.smoothSpeed) * alpha;

    const normSpeed = Math.min(1.0, this.smoothSpeed / 180); // 0 to 180 km/h scale
    const now = this.ctx.currentTime;
    const timeConst = 0.04;

    // 1. Equal-power crossfade between idle and cruise
    // Idle is strong below 30 km/h, fades completely by 60 km/h
    const launchU = Math.min(1.0, Math.max(0.0, (this.smoothSpeed - 8) / 45));
    const idleGain = 0.88 * Math.cos(0.5 * Math.PI * launchU);
    const cruiseGain = (0.15 + 0.80 * normSpeed) * Math.sin(0.5 * Math.PI * launchU);

    if (this.loopGains.idle) {
      this.loopGains.idle.gain.setTargetAtTime(idleGain, now, timeConst);
    }

    if (this.loopGains.cruise && this.loopSources.cruise) {
      this.loopGains.cruise.gain.setTargetAtTime(cruiseGain, now, timeConst);

      // Pitch curve: 0.72x at roll-out -> 1.00x at 100 km/h -> 1.35x flat-out -> 1.50x with Nitro boost
      let baseRate = 0.72 + normSpeed * 0.63;
      if (isBoosting) baseRate *= 1.18;
      this.loopSources.cruise.playbackRate.setTargetAtTime(Math.min(1.65, baseRate), now, timeConst);
    }

    // 2. Sub-Bass Sine Pulse (<85 Hz)
    if (this.rumbleSubOsc && this.rumbleOutGain) {
      const subHz = 45.0 + normSpeed * 35.0;
      this.rumbleSubOsc.frequency.setTargetAtTime(subHz, now, 0.04);
      const subVol = 0.08 + normSpeed * 0.12;
      this.rumbleOutGain.gain.setTargetAtTime(subVol, now, 0.04);
    }

    // 3. Formant-Compensating Lowpass Filter
    if (this.engineBusFilter) {
      // Clamps high-frequency fuzz when pitching up above 120 km/h
      const cutoff = Math.max(3200, 6200 - normSpeed * 2200);
      this.engineBusFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
    }

    // 4. Tire Drift Scrub Loop
    const drifting = options?.isDrifting ?? (isBoosting && normSpeed > 0.45);
    if (this.loopGains.drift && this.loopSources.drift) {
      const targetDriftGain = drifting ? Math.min(0.40, 0.15 + normSpeed * 0.25) : 0.0;
      this.loopGains.drift.gain.setTargetAtTime(targetDriftGain, now, 0.05);
      this.loopSources.drift.playbackRate.setTargetAtTime(0.92 + normSpeed * 0.25, now, 0.05);
    }

    // 5. Curb Rumble Loop
    const onCurbActive = options?.onCurb ?? false;
    if (this.loopGains.curb && this.loopSources.curb) {
      const targetCurbGain = onCurbActive ? Math.min(0.48, 0.22 + normSpeed * 0.26) : 0.0;
      this.loopGains.curb.gain.setTargetAtTime(targetCurbGain, now, 0.03);
      this.loopSources.curb.playbackRate.setTargetAtTime(0.85 + normSpeed * 0.35, now, 0.04);
    }

    this.prevSpeed = targetSpeed;
  }

  /**
   * Plays the authentic Formula 1 5-Light Countdown Beep
   * - isGo === false: 880 Hz (A5) tone for each of the 5 red lights illuminating
   * - isGo === true:  1760 Hz (A6) high tone when all 5 lights turn off simultaneously (GO!)
   */
  public playF1CountdownBeep(isGo: boolean = false): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const baseFreq = isGo ? 1760.0 : 880.0;
    const dur = isGo ? 0.38 : 0.18;
    const peakGain = isGo ? 0.85 : 0.65;

    // Gently duck engine bus so gantry beeps cut through cleanly on TV
    if (this.misfireDuckGain) {
      this.misfireDuckGain.gain.setValueAtTime(0.55, now);
      this.misfireDuckGain.gain.linearRampToValueAtTime(1.0, now + dur);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isGo ? 5500 : 3200;
    filter.connect(this.masterGain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peakGain, now + 0.004);
    env.gain.setValueAtTime(peakGain * 0.90, now + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    env.connect(filter);

    const oscMain = ctx.createOscillator();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(baseFreq, now);
    oscMain.connect(env);

    const oscHarm = ctx.createOscillator();
    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(baseFreq, now);
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.28;
    oscHarm.connect(harmGain);
    harmGain.connect(env);

    oscMain.start(now);
    oscHarm.start(now);
    oscMain.stop(now + dur + 0.02);
    oscHarm.stop(now + dur + 0.02);
  }

  /**
   * Plays a 4-tone ascending arpeggio when completing a lap (C5 -> E5 -> G5 -> C6)
   */
  public playLapChime(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;

      const tStart = now + idx * 0.065;
      g.gain.setValueAtTime(0.0001, tStart);
      g.gain.exponentialRampToValueAtTime(0.18, tStart + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.32);

      o.connect(g);
      g.connect(this.masterGain!);
      o.start(tStart);
      o.stop(tStart + 0.35);
    });
  }

  /**
   * Fires a real exhaust misfire sputter pop using sampled audio stems
   * with a punchy acoustic muffler thump and brief cylinder duck.
   */
  public playBoostSputter(intensity: number = 1.0): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    // 1. Duck the engine slightly so the backfire pops out
    if (this.misfireDuckGain) {
      this.misfireDuckGain.gain.setValueAtTime(1.0, now);
      this.misfireDuckGain.gain.linearRampToValueAtTime(0.40, now + 0.008);
      this.misfireDuckGain.gain.linearRampToValueAtTime(1.0, now + 0.045);
    }

    // 2. Low-frequency acoustic air thump (98 Hz -> 45 Hz)
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(95.0, now + 0.008);
    thumpOsc.frequency.exponentialRampToValueAtTime(42.0, now + 0.048);

    const peak = Math.min(0.28, 0.16 * intensity);
    thumpGain.gain.setValueAtTime(0.0001, now + 0.008);
    thumpGain.gain.linearRampToValueAtTime(peak, now + 0.012);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thumpOsc.start(now + 0.008);
    thumpOsc.stop(now + 0.055);

    // 3. Sampled crackle slice from real WAV buffer
    if (this.sputterBuffers.length > 0) {
      const randomBuf = this.sputterBuffers[Math.floor(Math.random() * this.sputterBuffers.length)];
      const src = ctx.createBufferSource();
      src.buffer = randomBuf;
      src.playbackRate.value = 0.92 + 0.16 * Math.random();

      const sliceDur = 0.18 + 0.12 * Math.random();
      const maxOffset = Math.max(0, randomBuf.duration - sliceDur - 0.02);
      const offset = Math.random() * maxOffset;

      const g = ctx.createGain();
      const gPeak = Math.min(0.48, 0.28 * intensity);
      g.gain.setValueAtTime(0.0001, now + 0.010);
      g.gain.linearRampToValueAtTime(gPeak, now + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.010 + sliceDur);

      src.connect(g);
      if (this.presencePeakFilter) {
        g.connect(this.presencePeakFilter);
      } else {
        g.connect(this.masterGain);
      }
      src.start(now + 0.010, offset, sliceDur);
    }
  }

  /**
   * Metallic guardrail thud / scrape sound when hitting a barrier or pit-stop penalty
   */
  public playRailImpact(intensity: number = 1.0): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const strength = Math.max(0.2, Math.min(1.2, intensity));

    // Duck engine briefly
    if (this.misfireDuckGain) {
      this.misfireDuckGain.gain.setValueAtTime(1.0, now);
      this.misfireDuckGain.gain.linearRampToValueAtTime(0.35, now + 0.010);
      this.misfireDuckGain.gain.linearRampToValueAtTime(1.0, now + 0.085);
    }

    // Low chassis impact thud (110 Hz -> 42 Hz)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(110.0, now);
    thudOsc.frequency.exponentialRampToValueAtTime(42.0, now + 0.08);

    thudGain.gain.setValueAtTime(0.0001, now);
    thudGain.gain.linearRampToValueAtTime(0.42 * strength, now + 0.006);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);
    thudOsc.start(now);
    thudOsc.stop(now + 0.10);
  }

  public setDrifting(isDrifting: boolean): void {
    this.isDrifting = isDrifting;
    if (this.loopGains.drift && this.ctx) {
      const now = this.ctx.currentTime;
      this.loopGains.drift.gain.setTargetAtTime(isDrifting ? 0.35 : 0.0, now, 0.04);
    }
  }

  public setCurbRumble(onCurb: boolean): void {
    this.onCurb = onCurb;
    if (this.loopGains.curb && this.ctx) {
      const now = this.ctx.currentTime;
      this.loopGains.curb.gain.setTargetAtTime(onCurb ? 0.40 : 0.0, now, 0.03);
    }
  }

  public stopAll(): void {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    }

    // Stop all active loop sources
    (Object.keys(this.loopSources) as (keyof typeof LOOP_STEMS)[]).forEach((key) => {
      try {
        this.loopSources[key]?.stop();
        this.loopSources[key]?.disconnect();
      } catch {
        // Safe ignore
      }
    });

    this.loopSources = {};
    this.loopGains = {};
    this.isStarted = false;
  }
}

export const suzukaAudio = new SuzukaAudioService();
export const deskAudio = suzukaAudio; // Backwards compatibility alias
