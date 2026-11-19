/**
 * Town Ambient Audio Synthesizer (Zero-Download Web Audio API)
 * Synthesizes authentic Japanese classroom, town, and facility audio cues:
 * - Master output bus with DynamicsCompressorNode limiter, global Mute, Volume, and Quiet Classroom Mode
 * - Active-jingle voice cancellation so rapid building taps never overlap or clip
 * - Centralized `playForBuilding(id)` dispatcher and `BUILDING_SOUND_LABELS` shared by TownNavigator & TownModelInspector
 */

export const BUILDING_SOUND_LABELS: Record<string, string> = {
  HOUSE: 'Home Intercom 🏠',
  APARTMENT: 'Intercom Chime 🏢',
  EMPTY_LOT: 'Pocket Park Breeze 🌳',
  BUS_STOP: 'Air Brake & Chime 🚏',
  POST_OFFICE: 'Stamp & Bell 📮',
  CONVENIENCE_STORE: 'Store Chime 🏪',
  POLICE_BOX: 'Kōban Whistle 👮',
  POLICE_STATION: 'Whistle & Radio 🚓',
  BOOKSTORE: 'Page & Chord 📖',
  FLOWER_SHOP: 'Fūrin Wind Chime 🎐',
  RESTAURANT: 'Grill & Bell 🍽️',
  SCHOOL: 'School Chime 🔔',
  JUNIOR_HIGH_SCHOOL: 'Chime & Whistle 🏫',
  DEPARTMENT_STORE: 'Elevator Chime 🛍️',
  SWIMMING_POOL: 'Whistle & Splash 🏊',
  FIRE_STATION: 'Bell & Siren 🚨',
  HOSPITAL: 'Clinic Chime 🏥',
  CITY_HALL: '5 PM Broadcast 🏛️',
  STATION: 'Eki-Melo 🚆',
  LIBRARY: 'Clock & Celesta 📚',
  SUPERMARKET: 'Scanner & Jingle 🛒',
  GYM: 'Court & Buzzer 🏀',
  MUSEUM: 'Gallery Chime 🏛️',
  TEMPLE: 'Bonshō Bell 🔔',
  SHRINE: 'Clappers & Suzu ⛩️',
  PARK: 'Birds & Playground 🌳',
  GARDEN: 'Shishi-odoshi 🎋',
  STADIUM: 'Whistle & Cheer ⚽',
  ZOO: 'Safari & Elephant 🦁',
  AQUARIUM: 'Dolphin & Harp 🐬',
  CASTLE: 'Taiko & Koto 🏯',
  AMUSEMENT_PARK: 'Carousel Waltz 🎡',
};

class TownAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private activeVoiceBus: GainNode | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;

  private muted: boolean = false;
  private volume: number = 0.85;
  private quietClassroomMode: boolean = false;

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.updateMasterGain();
    if (muted) {
      this.stopActiveJingle();
      this.stopKartEngine();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateMasterGain();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setQuietClassroomMode(enabled: boolean) {
    this.quietClassroomMode = enabled;
    this.updateMasterGain();
  }

  public isQuietClassroomMode(): boolean {
    return this.quietClassroomMode;
  }

  private getEffectiveGain(): number {
    if (this.muted) return 0;
    if (this.quietClassroomMode) return Math.min(this.volume, 0.05);
    return this.volume;
  }

  private updateMasterGain() {
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setTargetAtTime(this.getEffectiveGain(), this.ctx.currentTime, 0.015);
      } catch {}
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Returns the master compressor/gain output node (for persistent loops like Kart Engine or Bike Bell)
   */
  private getMasterOutput(ctx: AudioContext): AudioNode {
    if (!this.masterGain || !this.compressor || this.masterGain.context !== ctx) {
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-10, ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      this.compressor.release.setValueAtTime(0.18, ctx.currentTime);

      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.getEffectiveGain(), ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);
    }
    return this.compressor;
  }

  /**
   * Fades out any currently playing building jingle in 35ms and returns a fresh bus for the new jingle.
   */
  private beginJingleBus(ctx: AudioContext): AudioNode {
    const masterOut = this.getMasterOutput(ctx);
    const now = ctx.currentTime;

    if (this.activeVoiceBus && this.activeVoiceBus.context === ctx) {
      const prevBus = this.activeVoiceBus;
      try {
        prevBus.gain.cancelScheduledValues(now);
        prevBus.gain.setValueAtTime(Math.max(0.0001, prevBus.gain.value), now);
        prevBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        setTimeout(() => {
          try {
            prevBus.disconnect();
          } catch {}
        }, 60);
      } catch {}
    }

    const nextBus = ctx.createGain();
    nextBus.gain.setValueAtTime(1.0, now);
    nextBus.connect(masterOut);
    this.activeVoiceBus = nextBus;
    return nextBus;
  }

  public stopActiveJingle() {
    if (!this.ctx || !this.activeVoiceBus) return;
    const prevBus = this.activeVoiceBus;
    this.activeVoiceBus = null;
    try {
      const now = this.ctx.currentTime;
      prevBus.gain.cancelScheduledValues(now);
      prevBus.gain.setValueAtTime(Math.max(0.0001, prevBus.gain.value), now);
      prevBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      setTimeout(() => {
        try {
          prevBus.disconnect();
        } catch {}
      }, 50);
    } catch {}
  }

  /**
   * Returns a cached 2-second white-noise AudioBuffer so jingles never allocate buffers on the fly.
   */
  private getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.whiteNoiseBuffer || this.whiteNoiseBuffer.sampleRate !== ctx.sampleRate) {
      const len = Math.floor(ctx.sampleRate * 2.0);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.whiteNoiseBuffer = buf;
    }
    return this.whiteNoiseBuffer;
  }

  /**
   * Helper: schedules a rich chime/bell tone with fundamental + warm harmonic overtone.
   */
  private scheduleBellNote(
    ctx: AudioContext,
    out: AudioNode,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number = 0.24,
    overtoneRatio: number = 2.0,
    overtoneGainRatio: number = 0.22,
    mainType: OscillatorType = 'sine'
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = mainType;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc.connect(gain);
    gain.connect(out);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);

    if (overtoneGainRatio > 0) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * overtoneRatio, startTime);

      const otDur = duration * 0.55;
      gain2.gain.setValueAtTime(0.0001, startTime);
      gain2.gain.linearRampToValueAtTime(peakGain * overtoneGainRatio, startTime + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0005, startTime + otDur);

      osc2.connect(gain2);
      gain2.connect(out);
      osc2.start(startTime);
      osc2.stop(startTime + otDur + 0.04);
    }
  }

  /**
   * Centralized dispatcher for all 32 building IDs across TownNavigator and TownModelInspector.
   */
  public playForBuilding(buildingId: string) {
    if (this.muted) return;

    switch (buildingId) {
      case 'SCHOOL':
        this.playSchoolBell();
        break;
      case 'JUNIOR_HIGH_SCHOOL':
        this.playJuniorHighBell();
        break;
      case 'DEPARTMENT_STORE':
        this.playDepartmentStoreChime();
        break;
      case 'SWIMMING_POOL':
        this.playSwimmingPoolSound();
        break;
      case 'STATION':
        this.playStationMelody();
        break;
      case 'STADIUM':
        this.playStadiumCheer();
        break;
      case 'CONVENIENCE_STORE':
        this.playConvenienceStoreChime();
        break;
      case 'POST_OFFICE':
        this.playPostOfficeChime();
        break;
      case 'POLICE_BOX':
        this.playPoliceBoxWhistle();
        break;
      case 'POLICE_STATION':
        this.playPoliceWhistle();
        break;
      case 'HOSPITAL':
        this.playHospitalChime();
        break;
      case 'FIRE_STATION':
        this.playEmergencySiren();
        break;
      case 'SUPERMARKET':
        this.playSupermarketChime();
        break;
      case 'RESTAURANT':
        this.playRestaurantChime();
        break;
      case 'BOOKSTORE':
        this.playBookstoreChime();
        break;
      case 'FLOWER_SHOP':
        this.playFlowerShopChime();
        break;
      case 'BUS_STOP':
        this.playBusStopChime();
        break;
      case 'CITY_HALL':
        this.playCityHallChime();
        break;
      case 'LIBRARY':
        this.playLibraryChime();
        break;
      case 'GYM':
        this.playGymBuzzer();
        break;
      case 'MUSEUM':
        this.playMuseumChime();
        break;
      case 'TEMPLE':
        this.playTempleBell();
        break;
      case 'SHRINE':
        this.playShrineChime();
        break;
      case 'PARK':
      case 'EMPTY_LOT':
        this.playPlaygroundPark();
        break;
      case 'GARDEN':
        this.playParkFountain();
        break;
      case 'CASTLE':
        this.playCastleDrums();
        break;
      case 'AMUSEMENT_PARK':
        this.playAmusementParkMusic();
        break;
      case 'AQUARIUM':
        this.playAquariumSonar();
        break;
      case 'ZOO':
        this.playZooCall();
        break;
      case 'HOUSE':
      case 'APARTMENT':
        this.playHomeIntercom();
        break;
      default:
        this.playBicycleBell();
        break;
    }
  }

  // =========================================================================
  // 1. SCHOOL (小学校): Classic Westminster Chime (キンコンカンコン)
  //    Brisk, recognizable 2-phrase cadence with proper 2-beat phrase pause
  // =========================================================================
  playSchoolBell() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Phrase 1: F4 -> A4 -> G4 -> C4 (hold)
    // Phrase 2: F4 -> G4 -> A4 -> F4 (hold)
    const notes = [
      { f: 349.23, t: 0.00, d: 0.75 }, // F4
      { f: 440.00, t: 0.40, d: 0.75 }, // A4
      { f: 392.00, t: 0.80, d: 0.75 }, // G4
      { f: 261.63, t: 1.20, d: 1.05 }, // C4 (phrase hold)
      { f: 349.23, t: 2.00, d: 0.75 }, // F4
      { f: 392.00, t: 2.40, d: 0.75 }, // G4
      { f: 440.00, t: 2.80, d: 0.75 }, // A4
      { f: 349.23, t: 3.20, d: 1.15 }, // F4 (final hold)
    ];

    notes.forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.24, 2.76, 0.18, 'sine');
    });
  }

  // =========================================================================
  // 2. STATION (駅): JR East Style Eki-Melo (駅メロディ - Celesta & Warm Pad)
  // =========================================================================
  playStationMelody() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Warm backing chord pad (Fmaj7 -> G7 -> Cmaj9)
    const chords = [
      { freqs: [349.23, 440.00, 523.25], t: 0.00, d: 0.75 },
      { freqs: [392.00, 493.88, 587.33], t: 0.75, d: 0.75 },
      { freqs: [261.63, 329.63, 392.00, 587.33], t: 1.50, d: 0.90 },
    ];
    chords.forEach(({ freqs, t, d }) => {
      freqs.forEach((f) => {
        this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.06, 2.0, 0.08, 'sine');
      });
    });

    // Bright sparkling departure bell melody
    const melody = [
      { f: 523.25, d: 0.28, t: 0.00 }, // C5
      { f: 659.25, d: 0.28, t: 0.18 }, // E5
      { f: 783.99, d: 0.28, t: 0.36 }, // G5
      { f: 880.00, d: 0.42, t: 0.54 }, // A5
      { f: 783.99, d: 0.28, t: 0.88 }, // G5
      { f: 987.77, d: 0.28, t: 1.06 }, // B5
      { f: 1046.50, d: 0.75, t: 1.26 }, // C6
    ];

    melody.forEach(({ f, d, t }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.21, 3.0, 0.15, 'triangle');
    });
  }

  // =========================================================================
  // 3. CONVENIENCE STORE (コンビニ): Iconic 11-Note Door Chime (Panasonic EC5227WP)
  //    Authentic D-major 11-note melody without the duplicate A5 stutter
  // =========================================================================
  playConvenienceStoreChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Phrase 1 (6 notes): F#5, D5, A4, D5, E5, A5 (held over D5 harmony)
    // Phrase 2 (5 notes): E5, F#5, E5, A4, D5 (held over F#4/A4 harmony)
    const notes = [
      { f: 739.99, d: 0.24, t: 0.00 }, // F#5
      { f: 587.33, d: 0.24, t: 0.18 }, // D5
      { f: 440.00, d: 0.24, t: 0.36 }, // A4
      { f: 587.33, d: 0.24, t: 0.54 }, // D5
      { f: 659.25, d: 0.24, t: 0.72 }, // E5
      { f: 880.00, d: 0.52, t: 0.90 }, // A5 (hold)

      { f: 659.25, d: 0.24, t: 1.42 }, // E5
      { f: 739.99, d: 0.24, t: 1.60 }, // F#5
      { f: 659.25, d: 0.24, t: 1.78 }, // E5
      { f: 440.00, d: 0.24, t: 1.96 }, // A4
      { f: 587.33, d: 0.60, t: 2.14 }, // D5 (final hold)
    ];

    notes.forEach(({ f, d, t }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.22, 2.0, 0.18, 'triangle');
    });

    // Subtle lower-harmony accompaniment on the two phrase resolutions
    this.scheduleBellNote(ctx, out, 587.33, t0 + 0.90, 0.50, 0.09, 2.0, 0.1, 'sine'); // D5 under A5
    this.scheduleBellNote(ctx, out, 369.99, t0 + 2.14, 0.58, 0.09, 2.0, 0.1, 'sine'); // F#4 under D5
  }

  // =========================================================================
  // 4. POST OFFICE (郵便局): Double Cancel-Stamp Thud + Warm Counter Bell
  // =========================================================================
  playPostOfficeChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Rubber Date-Stamper "PON-PON!" (ink pad + envelope cancel)
    [0.0, 0.16].forEach((offset, idx) => {
      const sTime = t0 + offset;
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(idx === 0 ? 155 : 130, sTime);
      thudOsc.frequency.exponentialRampToValueAtTime(48, sTime + 0.08);

      thudGain.gain.setValueAtTime(idx === 0 ? 0.28 : 0.36, sTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.09);

      thudOsc.connect(thudGain);
      thudGain.connect(out);
      thudOsc.start(sTime);
      thudOsc.stop(sTime + 0.1);
    });

    // 2. Warm Service Counter Desk Bell "CHING!" (non-piercing brass frequencies)
    const bellTime = t0 + 0.36;
    const partials = [
      { freq: 1567.98, amp: 0.22, decay: 0.75 }, // G6 fundamental
      { freq: 3135.96, amp: 0.08, decay: 0.45 }, // 2x octave
      { freq: 4280.00, amp: 0.04, decay: 0.25 }, // metallic shimmer
    ];
    partials.forEach(({ freq, amp, decay }) => {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(freq, bellTime);

      bGain.gain.setValueAtTime(0.0001, bellTime);
      bGain.gain.linearRampToValueAtTime(amp, bellTime + 0.006);
      bGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + decay);

      bOsc.connect(bGain);
      bGain.connect(out);
      bOsc.start(bellTime);
      bOsc.stop(bellTime + decay + 0.04);
    });
  }

  // =========================================================================
  // 5A. POLICE BOX / KOBAN (交番): Friendly Officer Two-Pip Pea Whistle + Bike Bell
  // =========================================================================
  playPoliceBoxWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Short friendly 2-pip officer traffic whistle (Pip! Pip-peet!)
    const pips = [
      { t: 0.00, d: 0.13 },
      { t: 0.19, d: 0.28 },
    ];
    pips.forEach(({ t, d }) => {
      const pTime = t0 + t;
      [2150, 2320].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        lfo.frequency.setValueAtTime(26, pTime);
        lfoGain.gain.setValueAtTime(45, pTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, pTime);

        gain.gain.setValueAtTime(0.0001, pTime);
        gain.gain.linearRampToValueAtTime(0.14, pTime + 0.015);
        gain.gain.setValueAtTime(0.14, pTime + d - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0005, pTime + d);

        osc.connect(gain);
        gain.connect(out);
        lfo.start(pTime);
        osc.start(pTime);
        lfo.stop(pTime + d + 0.02);
        osc.stop(pTime + d + 0.02);
      });
    });
  }

  // =========================================================================
  // 5B. POLICE STATION (警察署): Officer Pea Whistle + Patrol Radio Squelch Chirp
  // =========================================================================
  playPoliceWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Pea Whistle (warmed with lowpass filter so it is never shrill on iPads)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, t0);
    filter.connect(out);

    [2150, 2340].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.setValueAtTime(25, t0);
      lfoGain.gain.setValueAtTime(52, t0);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.15, t0 + 0.025);
      gain.gain.setValueAtTime(0.15, t0 + 0.34);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.44);

      osc.connect(gain);
      gain.connect(filter);

      lfo.start(t0);
      osc.start(t0);
      lfo.stop(t0 + 0.46);
      osc.stop(t0 + 0.46);
    });

    // 2. Dispatch Radio PTT Digital Chirp + Squelch Tail
    const radioTime = t0 + 0.52;
    [
      { f: 1580, t: 0.00, d: 0.045 },
      { f: 1920, t: 0.055, d: 0.055 },
    ].forEach(({ f, t, d }) => {
      const rOsc = ctx.createOscillator();
      const rGain = ctx.createGain();
      rOsc.type = 'sine';
      rOsc.frequency.setValueAtTime(f, radioTime + t);
      rGain.gain.setValueAtTime(0.14, radioTime + t);
      rGain.gain.exponentialRampToValueAtTime(0.001, radioTime + t + d);
      rOsc.connect(rGain);
      rGain.connect(out);
      rOsc.start(radioTime + t);
      rOsc.stop(radioTime + t + d + 0.01);
    });

    // Short bandpass radio static squelch tail ("kshh!")
    const sqTime = radioTime + 0.12;
    const noise = ctx.createBufferSource();
    noise.buffer = this.getWhiteNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1950, sqTime);
    bp.Q.setValueAtTime(2.5, sqTime);
    const sqGain = ctx.createGain();
    sqGain.gain.setValueAtTime(0.12, sqTime);
    sqGain.gain.exponentialRampToValueAtTime(0.001, sqTime + 0.09);

    noise.connect(bp);
    bp.connect(sqGain);
    sqGain.connect(out);
    noise.start(sqTime, 0, 0.1);
    noise.stop(sqTime + 0.1);
  }

  // =========================================================================
  // 6. HOSPITAL (病院): Authentic Japanese PA 4-Tone Chime (ピンポンパンポン)
  //    High -> Low -> Mid -> Low contour (F5 -> D5 -> E5 -> C5)
  // =========================================================================
  playHospitalChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Pin (F5) - Pon (D5) - Pan (E5) - Pon (C5)
    const notes = [
      { f: 698.46, t: 0.00, d: 0.55 }, // F5 (ピン)
      { f: 587.33, t: 0.34, d: 0.55 }, // D5 (ポン)
      { f: 659.25, t: 0.68, d: 0.55 }, // E5 (パン)
      { f: 523.25, t: 1.02, d: 0.85 }, // C5 (ポン)
    ];

    notes.forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.24, 2.0, 0.16, 'sine');
    });
  }

  // =========================================================================
  // 7. FIRE STATION (消防署): Metallic Brass Fire Bell (カンカン！) + Siren (ウー！)
  // =========================================================================
  playEmergencySiren() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Inharmonic Brass Fire Engine Bell Clangs: Kan! Kan! Kan!
    [0.0, 0.26, 0.52].forEach((offset) => {
      const startTime = t0 + offset;
      const partials = [
        { freq: 1180, amp: 0.22, decay: 0.25 },
        { freq: 2740, amp: 0.12, decay: 0.18 },
        { freq: 4120, amp: 0.06, decay: 0.11 },
      ];
      partials.forEach(({ freq, amp, decay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(amp, startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0005, startTime + decay);

        osc.connect(gain);
        gain.connect(out);
        osc.start(startTime);
        osc.stop(startTime + decay + 0.02);
      });
    });

    // 2. Smooth Japanese Fire Engine Siren Horn Sweep ("Ūūūū...")
    const sirenStart = t0 + 0.82;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, sirenStart);
    osc.frequency.exponentialRampToValueAtTime(780, sirenStart + 0.65);
    osc.frequency.exponentialRampToValueAtTime(520, sirenStart + 1.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1450, sirenStart);

    gain.gain.setValueAtTime(0.0001, sirenStart);
    gain.gain.linearRampToValueAtTime(0.18, sirenStart + 0.18);
    gain.gain.setValueAtTime(0.18, sirenStart + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0005, sirenStart + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(sirenStart);
    osc.stop(sirenStart + 1.45);
  }

  // =========================================================================
  // 8. SUPERMARKET (スーパー): Barcode Scanner Beep + Checkout Register Jingle
  // =========================================================================
  playSupermarketChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Laser barcode scanner "PI-PI!"
    [0.0, 0.14].forEach((offset) => {
      const beepTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1920, beepTime);

      gain.gain.setValueAtTime(0.22, beepTime);
      gain.gain.setValueAtTime(0.22, beepTime + 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.075);

      osc.connect(gain);
      gain.connect(out);
      osc.start(beepTime);
      osc.stop(beepTime + 0.085);
    });

    // 2. Cheerful POS payment confirmation jingle: E5 -> G#5 -> B5 -> E6
    [
      { f: 659.25, t: 0.32, d: 0.28 },
      { f: 830.61, t: 0.45, d: 0.28 },
      { f: 987.77, t: 0.58, d: 0.28 },
      { f: 1318.51, t: 0.71, d: 0.45 },
    ].forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.2, 2.0, 0.15, 'triangle');
    });
  }

  // =========================================================================
  // 9. RESTAURANT (レストラン): Teppan Grill Sizzle + Brass Order Service Bell
  // =========================================================================
  playRestaurantChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Sizzling skillet noise burst (reusing cached noise buffer)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getWhiteNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3100, t0);
    filter.Q.setValueAtTime(1.8, t0);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(t0, 0, 0.45);
    noise.stop(t0 + 0.45);

    // 2. Authentic Double-Tap Brass Counter Bell "CHIN-CHIN!"
    [0.22, 0.36].forEach((offset, idx) => {
      const bellTime = t0 + offset;
      const partials = [
        { freq: 1760.0, amp: idx === 1 ? 0.24 : 0.18, decay: 0.65 }, // A6 dome fundamental
        { freq: 3820.0, amp: 0.09, decay: 0.32 }, // inharmonic brass partial
        { freq: 5450.0, amp: 0.04, decay: 0.14 }, // clapper strike transient
      ];
      partials.forEach(({ freq, amp, decay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, bellTime);

        gain.gain.setValueAtTime(0.0001, bellTime);
        gain.gain.linearRampToValueAtTime(amp, bellTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, bellTime + decay);

        osc.connect(gain);
        gain.connect(out);
        osc.start(bellTime);
        osc.stop(bellTime + decay + 0.03);
      });
    });
  }

  // =========================================================================
  // 10. BOOKSTORE (本屋): Crisp Page Turn + Warm Arpeggiated Rhodes Chord
  // =========================================================================
  playBookstoreChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Crisp Paper Page Turn (swept bandpass noise)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getWhiteNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, t0);
    filter.frequency.exponentialRampToValueAtTime(4800, t0 + 0.16);
    filter.Q.setValueAtTime(1.5, t0);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, t0);
    nGain.gain.linearRampToValueAtTime(0.18, t0 + 0.04);
    nGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(out);
    noise.start(t0, 0.2, 0.2);
    noise.stop(t0 + 0.2);

    // 2. Gently Rolled Acoustic Rhodes/Vibraphone Cmaj9 Arpeggio
    const notes = [
      { f: 261.63, t: 0.15, d: 1.1 }, // C4
      { f: 329.63, t: 0.22, d: 1.05 }, // E4
      { f: 392.00, t: 0.29, d: 1.0 }, // G4
      { f: 493.88, t: 0.36, d: 0.95 }, // B4
      { f: 587.33, t: 0.43, d: 0.95 }, // D5
    ];
    notes.forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.13, 2.0, 0.18, 'sine');
    });
  }

  // =========================================================================
  // 11. FLOWER SHOP (花屋): Edo Glass Wind Chime (江戸風鈴 - Fūrin)
  // =========================================================================
  playFlowerShopChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Japanese Ryukyu/Yo-scale crystal glass wind-chime tinkles with delicate overtone shimmer
    const glassNotes = [
      { f: 1567.98, t: 0.00, d: 0.65 }, // G6
      { f: 1760.00, t: 0.14, d: 0.65 }, // A6
      { f: 2093.00, t: 0.30, d: 0.70 }, // C7
      { f: 2349.32, t: 0.44, d: 0.75 }, // D7
      { f: 2093.00, t: 0.66, d: 0.85 }, // C7
    ];

    glassNotes.forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.18, 2.42, 0.12, 'sine');
    });
  }

  // =========================================================================
  // 12. BUS STOP (バス停): Pneumatic Air-Brake Release + "Tsugi Tomarimasu" Chime
  // =========================================================================
  playBusStopChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Bus pneumatic air-brake valve release hiss ("Pshhhh!")
    const noise = ctx.createBufferSource();
    noise.buffer = this.getWhiteNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, t0);
    filter.frequency.exponentialRampToValueAtTime(1200, t0 + 0.3);
    filter.Q.setValueAtTime(1.2, t0);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.22, t0);
    nGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(out);
    noise.start(t0, 0.5, 0.35);
    noise.stop(t0 + 0.35);

    // 2. Iconic Japanese Bus "Next Stop" (次止まります) 2-Tone Ding-Dong (F#5 -> D5)
    [
      { f: 739.99, t: 0.28, d: 0.48 }, // F#5 (ピン)
      { f: 587.33, t: 0.54, d: 0.68 }, // D5  (ポーン)
    ].forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.25, 2.0, 0.2, 'sine');
    });
  }

  // =========================================================================
  // 13. CITY HALL (市役所): 5 PM Municipal Broadcast Chime (夕焼け小焼け - Yūyake Koyake)
  //     Authentic opening melody of Shin Kusakawa's "Yūyake Koyake" in F major:
  //     C5-C5-D5-C5 | C5-C5-A4-F4 | G4-A4-G4-F4 (ソソラソ ソソミド レミレド)
  // =========================================================================
  playCityHallChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Gentle outdoor town-speaker bandpass warmth
    const notes = [
      // "Yū-ya-ke ko-ya-ke de" (ソソラソ ソソミド)
      { f: 523.25, t: 0.00, d: 0.32 }, // C5 (ソ)
      { f: 523.25, t: 0.22, d: 0.32 }, // C5 (ソ)
      { f: 587.33, t: 0.44, d: 0.32 }, // D5 (ラ)
      { f: 523.25, t: 0.66, d: 0.45 }, // C5 (ソ)

      { f: 523.25, t: 0.98, d: 0.32 }, // C5 (ソ)
      { f: 523.25, t: 1.20, d: 0.32 }, // C5 (ソ)
      { f: 440.00, t: 1.42, d: 0.32 }, // A4 (ミ)
      { f: 349.23, t: 1.64, d: 0.48 }, // F4 (ド)

      // "Hi ga ku-re-te" (レミレド)
      { f: 392.00, t: 2.00, d: 0.32 }, // G4 (レ)
      { f: 440.00, t: 2.22, d: 0.32 }, // A4 (ミ)
      { f: 392.00, t: 2.44, d: 0.32 }, // G4 (レ)
      { f: 349.23, t: 2.66, d: 0.78 }, // F4 (ド - hold)
    ];

    notes.forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.22, 2.0, 0.24, 'sine');
    });
  }

  // =========================================================================
  // 14. LIBRARY (図書館): Wooden Pendulum Clock Tick-Tock + Contemplative Celesta
  // =========================================================================
  playLibraryChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Quiet Reading-Room Wooden Pendulum Clock: "Tick... Tock..."
    [
      { freq: 1150, t: 0.00 },
      { freq: 860, t: 0.26 },
    ].forEach(({ freq, t }) => {
      const tickTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, tickTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, tickTime + 0.025);

      gain.gain.setValueAtTime(0.22, tickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.035);

      osc.connect(gain);
      gain.connect(out);
      osc.start(tickTime);
      osc.stop(tickTime + 0.04);
    });

    // 2. Soft Contemplative Celesta Arpeggio: D4 -> F#4 -> A4 -> C#5 -> F#5
    [
      { f: 293.66, t: 0.48, d: 0.9 }, // D4
      { f: 369.99, t: 0.64, d: 0.85 }, // F#4
      { f: 440.00, t: 0.80, d: 0.8 }, // A4
      { f: 554.37, t: 0.96, d: 0.75 }, // C#5
      { f: 739.99, t: 1.12, d: 0.95 }, // F#5
    ].forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.18, 3.0, 0.14, 'sine');
    });
  }

  // =========================================================================
  // 15. GYM (体育館): Sneaker Squeak + Basketball Dribble + Scoreboard Buzzer
  // =========================================================================
  playGymBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Basketball floor bounces: thud... thud... thud
    [0.0, 0.20, 0.38].forEach((offset, idx) => {
      const bTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(125 + idx * 14, bTime);
      osc.frequency.exponentialRampToValueAtTime(48, bTime + 0.085);

      gain.gain.setValueAtTime(0.36 - idx * 0.06, bTime);
      gain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.095);

      osc.connect(gain);
      gain.connect(out);
      osc.start(bTime);
      osc.stop(bTime + 0.1);
    });

    // Quick gym-floor sneaker squeak before the buzzer
    const sqTime = t0 + 0.46;
    const sqOsc = ctx.createOscillator();
    const sqGain = ctx.createGain();
    sqOsc.type = 'sine';
    sqOsc.frequency.setValueAtTime(2450, sqTime);
    sqOsc.frequency.exponentialRampToValueAtTime(3100, sqTime + 0.045);
    sqOsc.frequency.exponentialRampToValueAtTime(2100, sqTime + 0.09);
    sqGain.gain.setValueAtTime(0.001, sqTime);
    sqGain.gain.linearRampToValueAtTime(0.11, sqTime + 0.02);
    sqGain.gain.exponentialRampToValueAtTime(0.001, sqTime + 0.095);
    sqOsc.connect(sqGain);
    sqGain.connect(out);
    sqOsc.start(sqTime);
    sqOsc.stop(sqTime + 0.1);

    // 2. Gymnasium Electric Scoreboard Horn Buzzer (dual detuned sawtooth)
    const buzzTime = t0 + 0.62;
    [130.81, 134.5].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, buzzTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(920, buzzTime);

      gain.gain.setValueAtTime(0.15, buzzTime);
      gain.gain.setValueAtTime(0.15, buzzTime + 0.34);
      gain.gain.exponentialRampToValueAtTime(0.001, buzzTime + 0.42);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(buzzTime);
      osc.stop(buzzTime + 0.45);
    });
  }

  // =========================================================================
  // 16. MUSEUM (博物館): Spacious Exhibition Hall Vibraphone & Echoing Bell
  // =========================================================================
  playMuseumChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Resonant gallery acoustic chime with natural hall echo tap (A3 -> E4 -> B4 -> C#5 -> E5)
    const notes = [
      { f: 220.00, t: 0.00, d: 1.8 }, // A3
      { f: 329.63, t: 0.12, d: 1.7 }, // E4
      { f: 493.88, t: 0.24, d: 1.6 }, // B4
      { f: 554.37, t: 0.36, d: 1.6 }, // C#5
      { f: 659.25, t: 0.48, d: 1.8 }, // E5
    ];

    notes.forEach(({ f, t, d }) => {
      // Direct note
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.14, 2.75, 0.12, 'sine');
      // Soft marble-hall reflection echo (+180ms)
      this.scheduleBellNote(ctx, out, f, t0 + t + 0.18, d * 0.85, 0.05, 2.0, 0.08, 'sine');
    });
  }

  // =========================================================================
  // 17. TEMPLE (お寺): Deep Bronze Temple Bell (梵鐘 - Bonshō)
  //     Non-clipping gain staging + wooden shumoku strike + slow Unari beating
  // =========================================================================
  playTempleBell() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const startTime = ctx.currentTime;

    // 1. Wooden Shumoku Log Striker Thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'triangle';
    thumpOsc.frequency.setValueAtTime(185, startTime);
    thumpOsc.frequency.exponentialRampToValueAtTime(62, startTime + 0.09);
    thumpGain.gain.setValueAtTime(0.28, startTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(out);
    thumpOsc.start(startTime);
    thumpOsc.stop(startTime + 0.11);

    // 2. Bronze Bonshō Partials (sum = 0.64, zero clipping, detuned pair creates authentic ~1.2 Hz Unari wave)
    const baseFreq = 130.81; // Deep C3 (audible on both iPads and TV speakers)
    const harmonics = [
      { freq: baseFreq, vol: 0.18, decay: 3.4 }, // Fundamental A
      { freq: baseFreq + 1.25, vol: 0.14, decay: 3.3 }, // Detuned twin for slow Unari beating
      { freq: baseFreq * 1.498, vol: 0.13, decay: 2.6 }, // Fifth partial
      { freq: baseFreq * 2.0, vol: 0.10, decay: 2.2 }, // Octave (strong on small speakers)
      { freq: baseFreq * 2.76, vol: 0.06, decay: 1.5 }, // Bronze minor-third Tierce
      { freq: baseFreq * 4.15, vol: 0.03, decay: 0.8 }, // Metallic strike ring
    ];

    harmonics.forEach(({ freq, vol, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0002, startTime + decay);

      osc.connect(gain);
      gain.connect(out);

      osc.start(startTime);
      osc.stop(startTime + decay + 0.05);
    });
  }

  // =========================================================================
  // 18. SHRINE (神社): Crisp Hardwood Hyōshigi Clappers + Multi-Shake Brass Suzu Bell
  // =========================================================================
  playShrineChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Hardwood Hyōshigi /柏手 Claps (Kan! Kan!) — sharp wood transient + resonant cavity
    [0.0, 0.25].forEach((offset) => {
      const cTime = t0 + offset;

      // Crisp wood-impact click
      const noise = ctx.createBufferSource();
      noise.buffer = this.getWhiteNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2100, cTime);
      bp.Q.setValueAtTime(4.5, cTime);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.28, cTime);
      nGain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.045);
      noise.connect(bp);
      bp.connect(nGain);
      nGain.connect(out);
      noise.start(cTime, 0.1, 0.05);
      noise.stop(cTime + 0.05);

      // Hardwood resonant pitch body
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1420, cTime);
      osc.frequency.exponentialRampToValueAtTime(680, cTime + 0.045);

      gain.gain.setValueAtTime(0.24, cTime);
      gain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.06);

      osc.connect(gain);
      gain.connect(out);
      osc.start(cTime);
      osc.stop(cTime + 0.065);
    });

    // 2. Shinto Brass Suzu Rope-Shake Rattle ("Sharan-sharan-sharan!")
    const shakeOffsets = [0.50, 0.62, 0.74, 0.87];
    const suzuFreqs = [2480, 3120, 3860];
    shakeOffsets.forEach((sOff, sIdx) => {
      const bTime = t0 + sOff;
      const decay = sIdx === shakeOffsets.length - 1 ? 0.55 : 0.22;
      suzuFreqs.forEach((freq, fIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + sIdx * 18, bTime);

        const amp = (0.09 - fIdx * 0.018) * (sIdx === 3 ? 1.1 : 0.85);
        gain.gain.setValueAtTime(0.0001, bTime);
        gain.gain.linearRampToValueAtTime(amp, bTime + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0005, bTime + decay);

        osc.connect(gain);
        gain.connect(out);
        osc.start(bTime);
        osc.stop(bTime + decay + 0.02);
      });
    });
  }

  // =========================================================================
  // 19A. GARDEN (日本庭園): Bamboo Shishi-odoshi (鹿威し)
  //      Real upward Minnaert water-bubble plops + hollow resonant bamboo knock
  // =========================================================================
  playParkFountain() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Real acoustic water droplets (Minnaert bubble resonance sweeps UPWARD!)
    [
      { fStart: 580, fEnd: 1380, t: 0.00 },
      { fStart: 640, fEnd: 1520, t: 0.17 },
      { fStart: 540, fEnd: 1320, t: 0.33 },
    ].forEach(({ fStart, fEnd, t }) => {
      const dTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fStart, dTime);
      osc.frequency.exponentialRampToValueAtTime(fEnd, dTime + 0.055);

      gain.gain.setValueAtTime(0.001, dTime);
      gain.gain.linearRampToValueAtTime(0.18, dTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, dTime + 0.065);

      osc.connect(gain);
      gain.connect(out);
      osc.start(dTime);
      osc.stop(dTime + 0.07);
    });

    // 2. Hollow Bamboo Tube Striking Wet Stone: "KA-PON!"
    const strikeTime = t0 + 0.54;
    // Stone click transient ("KA-")
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1280, strikeTime);
    clickOsc.frequency.exponentialRampToValueAtTime(520, strikeTime + 0.028);
    clickGain.gain.setValueAtTime(0.25, strikeTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.035);
    clickOsc.connect(clickGain);
    clickGain.connect(out);
    clickOsc.start(strikeTime);
    clickOsc.stop(strikeTime + 0.04);

    // Hollow bamboo cavity resonance ("-PON!")
    [420, 635].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, strikeTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.86, strikeTime + 0.16);

      gain.gain.setValueAtTime(idx === 0 ? 0.32 : 0.14, strikeTime);
      gain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.22);

      osc.connect(gain);
      gain.connect(out);
      osc.start(strikeTime);
      osc.stop(strikeTime + 0.24);
    });
  }

  // =========================================================================
  // 19B. PARK & POCKET PARK (公園・広場): Morning Birdsong Chirps + Wooden Marimba
  // =========================================================================
  playPlaygroundPark() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Cheerful Songbird Double-Tweet ("Chun-chun! Piyo-piyo!")
    const chirps = [
      { f1: 2400, f2: 3300, f3: 2750, t: 0.00, d: 0.11 },
      { f1: 2550, f2: 3500, f3: 2900, t: 0.14, d: 0.13 },
    ];
    chirps.forEach(({ f1, f2, f3, t, d }) => {
      const cTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f1, cTime);
      osc.frequency.exponentialRampToValueAtTime(f2, cTime + d * 0.5);
      osc.frequency.exponentialRampToValueAtTime(f3, cTime + d);

      gain.gain.setValueAtTime(0.001, cTime);
      gain.gain.linearRampToValueAtTime(0.16, cTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, cTime + d);

      osc.connect(gain);
      gain.connect(out);
      osc.start(cTime);
      osc.stop(cTime + d + 0.02);
    });

    // 2. Playful Wooden Playground Xylophone Motif (G5 -> A5 -> B5 -> D6)
    [
      { f: 783.99, t: 0.34, d: 0.22 }, // G5
      { f: 880.00, t: 0.48, d: 0.22 }, // A5
      { f: 987.77, t: 0.62, d: 0.22 }, // B5
      { f: 1174.66, t: 0.76, d: 0.45 }, // D6
    ].forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.20, 3.0, 0.1, 'triangle');
    });
  }

  // =========================================================================
  // 20. STADIUM (スタジアム): Trilled Referee Whistle + Brass Horn Fanfare + Crowd Roar
  // =========================================================================
  playStadiumCheer() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Trilled Referee Match Whistle (short-long: "Prit! Preeeet!")
    [
      { t: 0.00, d: 0.11 },
      { t: 0.15, d: 0.26 },
    ].forEach(({ t, d }) => {
      const wTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.setValueAtTime(28, wTime);
      lfoGain.gain.setValueAtTime(65, wTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2550, wTime);

      gain.gain.setValueAtTime(0.001, wTime);
      gain.gain.linearRampToValueAtTime(0.20, wTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, wTime + d);

      osc.connect(gain);
      gain.connect(out);
      lfo.start(wTime);
      osc.start(wTime);
      lfo.stop(wTime + d + 0.02);
      osc.stop(wTime + d + 0.02);
    });

    // 2. Stadium Vuvuzela / Brass Victory Chord Swell (C4 + G4 + C5)
    const hornStart = t0 + 0.42;
    [261.63, 392.00, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, hornStart);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1350, hornStart);

      const peak = idx === 2 ? 0.12 : 0.09;
      gain.gain.setValueAtTime(0.001, hornStart);
      gain.gain.linearRampToValueAtTime(peak, hornStart + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, hornStart + 1.05);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(out);
      osc.start(hornStart);
      osc.stop(hornStart + 1.1);
    });

    // 3. Multi-Formant Stadium Crowd Roar
    const noiseStart = t0 + 0.38;
    [550, 1150].forEach((centerFreq, idx) => {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getWhiteNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(centerFreq, noiseStart);
      filter.Q.setValueAtTime(1.4, noiseStart);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, noiseStart);
      noiseGain.gain.linearRampToValueAtTime(idx === 0 ? 0.16 : 0.11, noiseStart + 0.25);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, noiseStart + 1.25);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);

      noise.start(noiseStart, idx * 0.3, 1.3);
      noise.stop(noiseStart + 1.3);
    });
  }

  // =========================================================================
  // 21. CASTLE (お城): Samurai Ō-Daiko Drum Cadence + Koto Sakura Flourish
  //     Engineered with leather-head slap & 220 Hz body harmonics so it punches
  //     through small iPad and laptop speakers!
  // =========================================================================
  playCastleDrums() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Taiko Cadence: DON... DON... DOKO-DON!
    const strikes = [
      { t: 0.00, accent: 0.85, rim: false }, // DON
      { t: 0.30, accent: 0.85, rim: false }, // DON
      { t: 0.56, accent: 0.65, rim: true },  // DO- (ka)
      { t: 0.70, accent: 0.70, rim: true },  // -KO
      { t: 0.86, accent: 1.00, rim: false }, // DON!
    ];

    strikes.forEach(({ t, accent, rim }) => {
      const sTime = t0 + t;

      // Low barrel boom (115 -> 55 Hz)
      const lowOsc = ctx.createOscillator();
      const lowGain = ctx.createGain();
      lowOsc.type = 'sine';
      lowOsc.frequency.setValueAtTime(rim ? 165 : 120, sTime);
      lowOsc.frequency.exponentialRampToValueAtTime(rim ? 85 : 54, sTime + 0.20);
      lowGain.gain.setValueAtTime(0.32 * accent, sTime);
      lowGain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.24);
      lowOsc.connect(lowGain);
      lowGain.connect(out);
      lowOsc.start(sTime);
      lowOsc.stop(sTime + 0.25);

      // iPad-audible mid-bass drumhead punch (260 -> 115 Hz triangle)
      const midOsc = ctx.createOscillator();
      const midGain = ctx.createGain();
      midOsc.type = 'triangle';
      midOsc.frequency.setValueAtTime(rim ? 380 : 255, sTime);
      midOsc.frequency.exponentialRampToValueAtTime(rim ? 180 : 110, sTime + 0.11);
      midGain.gain.setValueAtTime(0.24 * accent, sTime);
      midGain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.13);
      midOsc.connect(midGain);
      midGain.connect(out);
      midOsc.start(sTime);
      midOsc.stop(sTime + 0.14);

      // Bachi wooden drumstick leather slap transient
      const noise = ctx.createBufferSource();
      noise.buffer = this.getWhiteNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(rim ? 1850 : 950, sTime);
      bp.Q.setValueAtTime(2.2, sTime);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.22 * accent, sTime);
      nGain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.045);
      noise.connect(bp);
      bp.connect(nGain);
      nGain.connect(out);
      noise.start(sTime, 0.4, 0.05);
      noise.stop(sTime + 0.05);
    });

    // 2. Crisp Japanese Koto In-Scale (Sakura) Plucked Flourish (A4 -> Bb4 -> D5 -> E5)
    [
      { f: 440.00, t: 0.92, d: 0.35 }, // A4
      { f: 466.16, t: 1.03, d: 0.35 }, // Bb4
      { f: 587.33, t: 1.14, d: 0.35 }, // D5
      { f: 659.25, t: 1.25, d: 0.55 }, // E5
    ].forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.16, 2.0, 0.25, 'triangle');
    });
  }

  // =========================================================================
  // 22. AMUSEMENT PARK (遊園地): Merry-Go-Round Carousel Steam Calliope Waltz
  // =========================================================================
  playAmusementParkMusic() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. 3/4 Waltz "Oom-Pah-Pah" Organ Accompaniment
    const bassSteps = [
      { freqs: [261.63], t: 0.00, d: 0.18 },         // Oom (C4)
      { freqs: [392.00, 493.88], t: 0.22, d: 0.15 }, // Pah (G4+B4)
      { freqs: [392.00, 493.88], t: 0.44, d: 0.15 }, // Pah (G4+B4)
      { freqs: [196.00], t: 0.66, d: 0.18 },         // Oom (G3)
      { freqs: [392.00, 523.25], t: 0.88, d: 0.35 }, // Pah (C-chord)
    ];
    bassSteps.forEach(({ freqs, t, d }) => {
      freqs.forEach((f) => {
        this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.10, 2.0, 0.12, 'triangle');
      });
    });

    // 2. Cheerful Calliope Flute Melody with gentle vibrato
    const melody = [
      { f: 783.99, d: 0.20, t: 0.00 }, // G5
      { f: 659.25, d: 0.20, t: 0.22 }, // E5
      { f: 523.25, d: 0.20, t: 0.44 }, // C5
      { f: 659.25, d: 0.14, t: 0.66 }, // E5
      { f: 783.99, d: 0.14, t: 0.77 }, // G5
      { f: 1046.50, d: 0.48, t: 0.88 }, // C6
    ];

    melody.forEach(({ f, d, t }) => {
      const startTime = t0 + t;
      this.scheduleBellNote(ctx, out, f, startTime, d, 0.21, 2.0, 0.22, 'triangle');
    });
  }

  // =========================================================================
  // 23. AQUARIUM (水族館): Sparkling Underwater Harp Glissando + Dolphin Chirps + Bubbles
  // =========================================================================
  playAquariumSonar() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Shimmering Underwater Aqua Harp Glissando (C5 -> E5 -> G5 -> B5 -> D6)
    [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((f, idx) => {
      this.scheduleBellNote(ctx, out, f, t0 + idx * 0.08, 0.85, 0.14, 2.0, 0.15, 'sine');
    });

    // 2. Friendly Bottlenose Dolphin Double-Chirp ("Kiii-kiii!")
    [0.42, 0.58].forEach((offset, idx) => {
      const cTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850 + idx * 150, cTime);
      osc.frequency.exponentialRampToValueAtTime(3400 + idx * 200, cTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(2400, cTime + 0.12);

      gain.gain.setValueAtTime(0.001, cTime);
      gain.gain.linearRampToValueAtTime(0.16, cTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.13);

      osc.connect(gain);
      gain.connect(out);
      osc.start(cTime);
      osc.stop(cTime + 0.14);
    });

    // 3. Rising Water Bubbles (blub... bloop... blip!)
    [
      { f: 420, t: 0.78 },
      { f: 580, t: 0.90 },
      { f: 780, t: 1.02 },
    ].forEach(({ f, t }) => {
      const bTime = t0 + t;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();

      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(f, bTime);
      bOsc.frequency.exponentialRampToValueAtTime(f * 1.85, bTime + 0.075);

      bGain.gain.setValueAtTime(0.18, bTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.085);

      bOsc.connect(bGain);
      bGain.connect(out);
      bOsc.start(bTime);
      bOsc.stop(bTime + 0.095);
    });
  }

  // =========================================================================
  // 24. ZOO (動物園): Wooden Safari Marimba Rhythm + Playful Elephant Trumpet Call
  // =========================================================================
  playZooCall() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Upbeat Wooden Marimba Safari Motif (C5 -> D5 -> E5 -> G5 -> A5 -> G5)
    const marimba = [
      { f: 523.25, t: 0.00, d: 0.15 }, // C5
      { f: 587.33, t: 0.13, d: 0.15 }, // D5
      { f: 659.25, t: 0.26, d: 0.18 }, // E5
      { f: 783.99, t: 0.42, d: 0.22 }, // G5
    ];
    marimba.forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.20, 4.0, 0.12, 'triangle');
    });

    // 2. Playful Baby Elephant Brass Trumpet Call ("Paoooon!")
    const eStart = t0 + 0.62;
    [523.25, 526.5].forEach((baseF) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseF * 0.85, eStart);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.45, eStart + 0.14);
      osc.frequency.setValueAtTime(baseF * 1.42, eStart + 0.34);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.05, eStart + 0.58);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, eStart);
      filter.frequency.exponentialRampToValueAtTime(1850, eStart + 0.18);
      filter.Q.setValueAtTime(1.8, eStart);

      gain.gain.setValueAtTime(0.001, eStart);
      gain.gain.linearRampToValueAtTime(0.18, eStart + 0.04);
      gain.gain.setValueAtTime(0.18, eStart + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.001, eStart + 0.60);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      osc.start(eStart);
      osc.stop(eStart + 0.62);
    });
  }

  // =========================================================================
  // 25. JUNIOR HIGH SCHOOL (中学校): Electronic Homeroom Arpeggio + Track Club Whistle
  //     Clearly distinct from Elementary School's Westminster chime!
  // =========================================================================
  playJuniorHighBell() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Modern Japanese Middle School Electronic Chime (rising-falling Bbmaj7 phrase)
    const notes = [
      { f: 466.16, d: 0.45, t: 0.00 }, // Bb4
      { f: 587.33, d: 0.45, t: 0.22 }, // D5
      { f: 698.46, d: 0.45, t: 0.44 }, // F5
      { f: 880.00, d: 0.55, t: 0.66 }, // A5
      { f: 932.33, d: 0.75, t: 0.90 }, // Bb5
    ];

    notes.forEach(({ f, d, t }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.21, 2.0, 0.16, 'sine');
    });

    // 2. After-School Track & Field Club (Bukatsu) Coach Pea Whistle ("Pwee-pweet!")
    [
      { t: 1.48, d: 0.10, f: 2450 },
      { t: 1.62, d: 0.24, f: 2620 },
    ].forEach(({ t, d, f }) => {
      const wTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.setValueAtTime(27, wTime);
      lfoGain.gain.setValueAtTime(50, wTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, wTime);

      gain.gain.setValueAtTime(0.001, wTime);
      gain.gain.linearRampToValueAtTime(0.16, wTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, wTime + d);

      osc.connect(gain);
      gain.connect(out);
      lfo.start(wTime);
      osc.start(wTime);
      lfo.stop(wTime + d + 0.02);
      osc.stop(wTime + d + 0.02);
    });
  }

  // =========================================================================
  // 26. DEPARTMENT STORE (デパート): Luxurious Depāto Elevator Welcome Chime
  // =========================================================================
  playDepartmentStoreChime() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Warm, silky Japanese department-store 3-tone tubular chime (G#5 -> E5 -> B5)
    const tones = [
      { f: 830.61, d: 0.85, t: 0.00 }, // G#5
      { f: 659.25, d: 0.85, t: 0.32 }, // E5
      { f: 987.77, d: 1.25, t: 0.66 }, // B5
    ];

    tones.forEach(({ f, d, t }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.23, 2.0, 0.16, 'sine');
    });
  }

  // =========================================================================
  // 27. SWIMMING POOL (プール): Starting Block Dive Beep + Water Splash & Bubbles
  // =========================================================================
  playSwimmingPoolSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // 1. Crisp Lifeguard / Swim-Meet Start Whistle ("Pweet!")
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2480, t0);
    osc.frequency.exponentialRampToValueAtTime(2760, t0 + 0.16);

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.20);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t0);
    osc.stop(t0 + 0.22);

    // 2. Pool Water Dive Splash (swept lowpass noise surge)
    const splashStart = t0 + 0.26;
    const noise = ctx.createBufferSource();
    noise.buffer = this.getWhiteNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, splashStart);
    filter.frequency.exponentialRampToValueAtTime(480, splashStart + 0.65);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, splashStart);
    nGain.gain.linearRampToValueAtTime(0.28, splashStart + 0.035);
    nGain.gain.exponentialRampToValueAtTime(0.001, splashStart + 0.70);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(out);
    noise.start(splashStart, 0.8, 0.75);
    noise.stop(splashStart + 0.75);

    // 3. Post-dive surfacing bubbles
    [
      { f: 460, t: 0.58 },
      { f: 640, t: 0.70 },
      { f: 860, t: 0.82 },
    ].forEach(({ f, t }) => {
      const bTime = t0 + t;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(f, bTime);
      bOsc.frequency.exponentialRampToValueAtTime(f * 1.75, bTime + 0.07);
      bGain.gain.setValueAtTime(0.16, bTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.08);
      bOsc.connect(bGain);
      bGain.connect(out);
      bOsc.start(bTime);
      bOsc.stop(bTime + 0.09);
    });
  }

  // =========================================================================
  // 28. HOUSE & APARTMENT (家・アパート): Classic Japanese Home Intercom (ピンポーン)
  // =========================================================================
  playHomeIntercom() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.beginJingleBus(ctx);
    const t0 = ctx.currentTime;

    // Classic Panasonic/Aiphone Japanese front-door intercom: E5 (Pin) -> C5 (Pōn)
    [
      { f: 659.25, t: 0.00, d: 0.45 }, // E5 (ピン)
      { f: 523.25, t: 0.30, d: 0.75 }, // C5 (ポーン)
    ].forEach(({ f, t, d }) => {
      this.scheduleBellNote(ctx, out, f, t0 + t, d, 0.25, 2.0, 0.2, 'sine');
    });
  }

  // =========================================================================
  // 29. BICYCLE BELL (自転車ベル - チリンチリン) & VENDING MACHINE
  // =========================================================================
  playBicycleBell() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getMasterOutput(ctx);
    const t0 = ctx.currentTime;

    // Double mechanical rotary striker ring: "Chirin-chirin!"
    [0.0, 0.11].forEach((offset, idx) => {
      const startTime = t0 + offset;
      const partials = [
        { freq: 2380, amp: idx === 1 ? 0.22 : 0.18, decay: 0.28 },
        { freq: 4920, amp: 0.07, decay: 0.14 },
      ];
      partials.forEach(({ freq, amp, decay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(amp, startTime + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0005, startTime + decay);

        osc.connect(gain);
        gain.connect(out);

        osc.start(startTime);
        osc.stop(startTime + decay + 0.02);
      });
    });
  }

  playVendingCan() {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getMasterOutput(ctx);
    const startTime = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, startTime);
    osc.frequency.exponentialRampToValueAtTime(90, startTime + 0.15);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

    osc.connect(gain);
    gain.connect(out);

    osc.start(startTime);
    osc.stop(startTime + 0.25);
  }

  // =========================================================================
  // 30. SUZUKA MICRO-KART ENGINE SYNTHESIZER
  // =========================================================================
  private kartOsc: OscillatorNode | null = null;
  private kartGain: GainNode | null = null;

  startKartEngine() {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || this.kartOsc) return;

    try {
      const out = this.getMasterOutput(ctx);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start();
      this.kartOsc = osc;
      this.kartGain = gain;
    } catch {
      // Ignore autoplay policy restriction
    }
  }

  updateKartEngine(isMoving: boolean, speedRatio: number = 1.0) {
    if (!this.kartOsc || !this.kartGain || !this.ctx) return;
    const targetFreq = isMoving ? 85 + speedRatio * 35 : 55;
    const targetGain = isMoving ? 0.07 : 0.025;
    this.kartOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.kartGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  stopKartEngine() {
    if (this.kartOsc) {
      try {
        this.kartOsc.stop();
        this.kartOsc.disconnect();
      } catch {}
      this.kartOsc = null;
    }
    if (this.kartGain) {
      try {
        this.kartGain.disconnect();
      } catch {}
      this.kartGain = null;
    }
  }
}

export const townAudio = new TownAudioSynthesizer();
