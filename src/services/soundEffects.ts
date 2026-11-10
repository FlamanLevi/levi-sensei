/**
 * Web Audio API Sound Effects Synthesizer for Levi-Sensei Classroom Games
 * Zero external MP3 downloads required - instant, glitch-free audio synthesis
 */

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private outputGainNode: GainNode | null = null;
  private volume: number = 1.0;
  private quietClassroomMode: boolean = false;

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.updateOutputGain();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateOutputGain();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setQuietClassroomMode(enabled: boolean) {
    this.quietClassroomMode = enabled;
    this.updateOutputGain();
  }

  public isQuietClassroomMode(): boolean {
    return this.quietClassroomMode;
  }

  private getEffectiveGain(): number {
    if (this.muted) return 0;
    // Quiet Classroom Mode caps volume to 0.04 (gentle tactile whisper for student iPads)
    if (this.quietClassroomMode) return Math.min(this.volume, 0.04);
    return this.volume;
  }

  private updateOutputGain() {
    if (this.outputGainNode && this.ctx) {
      try {
        this.outputGainNode.gain.setValueAtTime(this.getEffectiveGain(), this.ctx.currentTime);
      } catch {}
    }
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    if (!this.outputGainNode || this.outputGainNode.context !== ctx) {
      this.outputGainNode = ctx.createGain();
      this.outputGainNode.connect(ctx.destination);
    }
    this.outputGainNode.gain.setValueAtTime(this.getEffectiveGain(), ctx.currentTime);
    return this.outputGainNode;
  }

  /**
   * Subtle woodblock tick for countdown timer
   */
  public playTick() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Crisp mechanical ratchet click for spinning wheel and slot machine reels
   */
  public playWheelClick(frequency: number = 750) {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, now + 0.025);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Rapid dice tumbling clatter sound effect
   */
  public playDiceRattle() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 4 quick tumbling clatters
    [0, 0.04, 0.09, 0.15].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = 420 + Math.random() * 380;
      const t = now + offset;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.035);

      gain.gain.setValueAtTime(0.12 - idx * 0.015, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));

      osc.start(t);
      osc.stop(t + 0.04);
    });
  }

  /**
   * Final solid dice landing clack on table
   */
  public playDiceLand() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * High-pitch urgency tick for the final 5 seconds
   */
  public playUrgencyTick() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Cheerful ascending major chime for correct answer
   */
  public playCorrect() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));

      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });
  }

  /**
   * Soft, non-punitive descending buzz for incorrect answer
   */
  public playIncorrect() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Answer reveal swoosh / chime
   */
  public playReveal() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Victory fanfare for podium / leaderboard
   */
  public playFanfare() {
    if (this.muted) return;
    // In quiet classroom mode, substitute a gentle subtle chime to avoid classroom cacophony
    if (this.quietClassroomMode) {
      this.playChime();
      return;
    }
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // G4, C5, E5, G5 sustained
    const notes = [
      { f: 392.00, d: 0.12, t: 0 },
      { f: 523.25, d: 0.12, t: 0.12 },
      { f: 659.25, d: 0.12, t: 0.24 },
      { f: 783.99, d: 0.55, t: 0.36 }
    ];

    notes.forEach(({ f, d, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + t;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + d);

      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));

      osc.start(noteTime);
      osc.stop(noteTime + d + 0.05);
    });
  }

  /**
   * F1 start lights beep: low beep for red lights, high vibrant beep for GREEN / GO!
   */
  public playRaceCountdownBeep(isGo: boolean = false) {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isGo) {
      // High energetic green beep
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.4);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));
      osc.start(now);
      osc.stop(now + 0.46);
    } else {
      // Low red gantry light beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));
      osc.start(now);
      osc.stop(now + 0.22);
    }
  }

  /**
   * Fast overtake / turbo combo whoosh for sprint mode
   */
  public playOvertake() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Sports Day referee whistle (pea whistle trill using twin high frequencies and LFO modulation)
   */
  public playWhistle(durationSeconds: number = 0.6) {
    if (this.muted) return;
    if (this.quietClassroomMode) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const masterGain = ctx.createGain();

    // Twin frequencies characteristic of Acme Thunderer / referee whistle
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2550, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2880, now);

    // LFO for pea spin flutter (~28Hz trill)
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(28, now);
    lfoGain.gain.setValueAtTime(140, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.28, now + 0.05);
    masterGain.gain.setValueAtTime(0.28, now + durationSeconds - 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

    osc1.connect(masterGain);
    osc2.connect(masterGain);
    masterGain.connect(this.getOutputNode(ctx));

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    osc1.stop(now + durationSeconds + 0.05);
    osc2.stop(now + durationSeconds + 0.05);
    lfo.stop(now + durationSeconds + 0.05);
  }

  /**
   * Heavy rope tug yank sound (low thud + friction creak)
   */
  public playRopeTug() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Slipped in the mud squelch sound
   */
  public playMudSlip() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Grand Prix Checkered Flag celebratory finish
   */
  public playCheckeredFlag() {
    if (this.muted) return;
    if (this.quietClassroomMode) {
      this.playChime();
      return;
    }
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Fast arpeggio: C5, G5, C6, E6
    const notes = [523.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));

      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });
  }

  /**
   * Choice unblur pop chime when recall delay ends
   */
  public playUnblurChime() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * 50/50 elimination whoosh sound effect
   */
  public play5050() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Theatrical curtain swoosh sound effect
   */
  public playCurtainSwoosh() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * Cheerful bell chime when curtains reopen
   */
  public playChime() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Bell chime: E6 (1318Hz), G6 (1568Hz), C7 (2093Hz)
    const notes = [1318.51, 1567.98, 2093.00];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.getOutputNode(ctx));

      osc.start(noteTime);
      osc.stop(noteTime + 0.46);
    });
  }

  /**
   * Crisp tactile card flip sound
   */
  public playCardFlip() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.05);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Dramatic cartoon explosion for Time-Bomb game
   */
  public playExplosion() {
    if (this.muted) return;
    if (this.quietClassroomMode) {
      this.playIncorrect();
      return;
    }
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Deep sub-bass impact boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 1.2);

    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    subOsc.connect(subGain);
    subGain.connect(this.getOutputNode(ctx));
    subOsc.start(now);
    subOsc.stop(now + 1.25);

    // 2. Filtered white noise blast
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.8);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.8);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.getOutputNode(ctx));

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.85);
    } catch {
      // Fallback if buffer creation fails
    }
  }

  /**
   * Sizzling fuse crackle spark
   */
  public playFuseCrackle() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800 + Math.random() * 600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /**
   * Fast tactile pass / swoosh chime
   */
  public playPassSwoosh() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Crisp, comical balloon pop sound
   */
  public playBalloonPop() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.09);

    // Snap noise
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.3, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(nGain);
      nGain.connect(this.getOutputNode(ctx));
      noise.start(now);
      noise.stop(now + 0.07);
    } catch {}
  }

  /**
   * Sizzling hot steam / butter sizzle sound
   */
  public playSizzle() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.7);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(2, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.35, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.getOutputNode(ctx));

      noise.start(now);
      noise.stop(now + 0.75);
    } catch {}
  }

  /**
   * Cute bubbly pop for Popcorn Popper
   */
  public playPopcornPop() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.07);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Volleyball forearm dig / receive (damped low-frequency thump)
   */
  public playVolleyballDig() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.11);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Volleyball fingertips toss / set (crisp, musical pop)
   */
  public playVolleyballSet() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Volleyball thunderous jump spike (impact snap + deep sub boom)
   */
  public playVolleyballSpike() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. High transient crack
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(450, now);
    osc1.frequency.exponentialRampToValueAtTime(110, now + 0.08);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.getOutputNode(ctx));
    osc1.start(now);
    osc1.stop(now + 0.09);

    // 2. Heavy sub-bass boom
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(140, now);
    osc2.frequency.exponentialRampToValueAtTime(38, now + 0.28);
    gain2.gain.setValueAtTime(0.6, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(this.getOutputNode(ctx));
    osc2.start(now);
    osc2.stop(now + 0.32);
  }
}

export const soundEffects = new SoundEffectsService();
