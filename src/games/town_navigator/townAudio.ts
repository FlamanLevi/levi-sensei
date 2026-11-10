/**
 * Town Ambient Audio Synthesizer (Zero-Download Web Audio API)
 * Synthesizes authentic Japanese classroom, town, and facility audio cues:
 * - Westminster School Bell (キンコンカンコン) for SCHOOL
 * - Station Departure Melody (駅メロディ) for STATION
 * - Convenience Store Doorbell Chime (ファミマ風チャイム) for CONVENIENCE_STORE
 * - Post Office Stamp & Register (スタンプ＆レジ) for POST_OFFICE
 * - Police Officer Whistle & Radio (警察笛＆無線) for POLICE_STATION
 * - Medical Clinic 4-Tone Chime (ピンポンパンポン) for HOSPITAL
 * - Fire Station Emergency Siren (カンカン・ウー) for FIRE_STATION
 * - Supermarket Barcode Scanner Beep (バーコードスキャン) for SUPERMARKET
 * - Restaurant Sizzle & Service Bell (鉄板＆呼び鈴) for RESTAURANT
 * - Bookstore Acoustic Page & Chime (ページめくり＆チャイム) for BOOKSTORE
 * - Flower Shop Glass Wind Chimes (風鈴) for FLOWER_SHOP
 * - Bus Stop Air-Brake & Chime (エアブレーキ＆降車ボタン) for BUS_STOP
 * - City Hall 5 PM Municipal Broadcast Chime (夕焼け小焼け・防災無線) for CITY_HALL
 * - Library Gentle Ticking & Celesta (振り子時計＆チェレスタ) for LIBRARY
 * - Gymnasium Basketball Bounces & Buzzer (バスケドリブル＆ブザー) for GYM
 * - Museum Echoing Acoustic Gong (美術館残響チャイム) for MUSEUM
 * - Buddhist Temple Bronze Bell (梵鐘・除夜の鐘) for TEMPLE
 * - Shinto Shrine Clappers & Bell (拍子木＆鈴) for SHRINE
 * - Japanese Garden Bamboo Fountain (鹿威し・ししおどし) for PARK & GARDEN
 * - Stadium Match Whistle & Cheering (ホイッスル＆歓声) for STADIUM
 * - Castle Samurai Taiko Drum Roll (太鼓連打) for CASTLE
 * - Amusement Park Carousel Calliope (メリーゴーランド) for AMUSEMENT_PARK
 * - Aquarium Sonar Ping & Bubble Burst (水中ソナー＆気泡) for AQUARIUM
 * - Zoo Safari Fanfare (サファリファンファーレ) for ZOO
 * - Bicycle Bell Ping (チリンチリン) for AVATAR
 */

class TownAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
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

  // =========================================================================
  // 1. SCHOOL (学校): Classic Westminster Chime (キンコンカンコン)
  // =========================================================================
  playSchoolBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [349.23, 440.0, 392.0, 261.63, 349.23, 392.0, 440.0, 349.23];
    const times = [0, 0.65, 1.3, 1.95, 2.75, 3.4, 4.05, 4.7];

    notes.forEach((freq, i) => {
      const startTime = ctx.currentTime + times[i];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.76, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.1);

      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(0.07, startTime + 0.03);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      osc2.connect(gain2);
      gain.connect(ctx.destination);
      gain2.connect(ctx.destination);

      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + 1.2);
      osc2.stop(startTime + 0.6);
    });
  }

  // =========================================================================
  // 2. STATION (駅): Japanese Train Departure Melody (駅メロ - Eki Mero)
  // =========================================================================
  playStationMelody() {
    const ctx = this.getContext();
    if (!ctx) return;

    const melody = [
      { f: 523.25, d: 0.22, t: 0 },
      { f: 659.25, d: 0.22, t: 0.22 },
      { f: 783.99, d: 0.22, t: 0.44 },
      { f: 880.0, d: 0.38, t: 0.66 },
      { f: 783.99, d: 0.22, t: 1.06 },
      { f: 659.25, d: 0.22, t: 1.28 },
      { f: 523.25, d: 0.55, t: 1.50 },
    ];

    melody.forEach(({ f, d, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d);
    });
  }

  // =========================================================================
  // 3. CONVENIENCE STORE (コンビニ): Iconic Japanese Store Door Chime
  // =========================================================================
  playConvenienceStoreChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Famous 2-phrase electronic greeting:
    // Phrase 1: F#5, D5, A4, D5, E5, A5
    // Phrase 2: A5, E5, F#5, E5, A4, D5
    const notes = [
      { f: 739.99, d: 0.18, t: 0.00 },
      { f: 587.33, d: 0.18, t: 0.18 },
      { f: 440.00, d: 0.18, t: 0.36 },
      { f: 587.33, d: 0.18, t: 0.54 },
      { f: 659.25, d: 0.18, t: 0.72 },
      { f: 880.00, d: 0.35, t: 0.90 },

      { f: 880.00, d: 0.18, t: 1.35 },
      { f: 659.25, d: 0.18, t: 1.53 },
      { f: 739.99, d: 0.18, t: 1.71 },
      { f: 659.25, d: 0.18, t: 1.89 },
      { f: 440.00, d: 0.18, t: 2.07 },
      { f: 587.33, d: 0.45, t: 2.25 },
    ];

    notes.forEach(({ f, d, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d);
    });
  }

  // =========================================================================
  // 4. POST OFFICE (郵便局): Date-Stamper Thud + Counter Bell Ring
  // =========================================================================
  playPostOfficeChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Heavy Rubber Date-Stamper "THUD" (Pon!)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(140, t0);
    thudOsc.frequency.exponentialRampToValueAtTime(45, t0 + 0.08);

    thudGain.gain.setValueAtTime(0.45, t0);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(t0);
    thudOsc.stop(t0 + 0.1);

    // 2. Cheerful Service Counter Desk Bell "CHING!"
    const bellTime = t0 + 0.18;
    const bellFrequencies = [2400, 3600, 5200];
    bellFrequencies.forEach((freq, idx) => {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(freq, bellTime);

      const amp = idx === 0 ? 0.35 : 0.15;
      bGain.gain.setValueAtTime(0, bellTime);
      bGain.gain.linearRampToValueAtTime(amp, bellTime + 0.005);
      bGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 0.9);

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(bellTime);
      bOsc.stop(bellTime + 0.95);
    });
  }

  // =========================================================================
  // 5. POLICE STATION (交番): Officer Pea Whistle + Radio Squelch
  // =========================================================================
  playPoliceWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // Pea Whistle: 2 close frequencies modulated by a fast vibrato (trill)
    const f1 = 2600;
    const f2 = 2850;

    [f1, f2].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.setValueAtTime(22, t0); // 22Hz trill flutter
      lfoGain.gain.setValueAtTime(60, t0);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.04);
      gain.gain.setValueAtTime(0.22, t0 + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(t0);
      osc.start(t0);
      lfo.stop(t0 + 0.62);
      osc.stop(t0 + 0.62);
    });
  }

  // =========================================================================
  // 6. HOSPITAL (病院): Medical Clinic 4-Tone Chime (ピンポンパンポン)
  // =========================================================================
  playHospitalChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    // The universal Japanese medical clinic PA chime: G4 -> B4 -> D5 -> G5
    const notes = [
      { f: 392.00, t: 0.00 }, // G4
      { f: 493.88, t: 0.40 }, // B4
      { f: 587.33, t: 0.80 }, // D5
      { f: 783.99, t: 1.20 }, // G5
    ];

    notes.forEach(({ f, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.32, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.75);
    });
  }

  // =========================================================================
  // 7. FIRE STATION (消防署): Japanese Fire Bell Clangs + Siren Sweep
  // =========================================================================
  playEmergencySiren() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Fire bell clangs: Kan! Kan! Kan!
    [0, 0.35, 0.7].forEach((offset) => {
      const startTime = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    // Rising Siren Horn
    const sirenStart = ctx.currentTime + 1.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, sirenStart);
    osc.frequency.linearRampToValueAtTime(860, sirenStart + 0.8);
    osc.frequency.linearRampToValueAtTime(560, sirenStart + 1.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;

    gain.gain.setValueAtTime(0, sirenStart);
    gain.gain.linearRampToValueAtTime(0.2, sirenStart + 0.25);
    gain.gain.linearRampToValueAtTime(0.001, sirenStart + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(sirenStart);
    osc.stop(sirenStart + 1.9);
  }

  // =========================================================================
  // 8. SUPERMARKET (スーパー): Barcode Scanner Beep + Register Jingle
  // =========================================================================
  playSupermarketChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Laser barcode scanner "PI-PI!"
    [0, 0.15].forEach((offset) => {
      const beepTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1860, beepTime);

      gain.gain.setValueAtTime(0.28, beepTime);
      gain.gain.setValueAtTime(0.28, beepTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(beepTime);
      osc.stop(beepTime + 0.09);
    });

    // 2. Cheerful grocery receipt jingle: E5 -> G#5 -> B5
    [
      { f: 659.25, t: 0.35 },
      { f: 830.61, t: 0.50 },
      { f: 987.77, t: 0.65 },
    ].forEach(({ f, t }) => {
      const startTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  }

  // =========================================================================
  // 9. RESTAURANT (レストラン): Hot Grill Sizzle + Dinner Service Bell
  // =========================================================================
  playRestaurantChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Sizzling skillet noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.18;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2800;
    filter.Q.value = 2.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + 0.4);

    // 2. Brass Service Counter Bell "DING!"
    const bellTime = t0 + 0.25;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2150, bellTime);

    gain.gain.setValueAtTime(0, bellTime);
    gain.gain.linearRampToValueAtTime(0.35, bellTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 0.85);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(bellTime);
    osc.stop(bellTime + 0.9);
  }

  // =========================================================================
  // 10. BOOKSTORE (本屋): Paper Page Turn + Warm Acoustic Chime
  // =========================================================================
  playBookstoreChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Paper Page Flutter
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3500;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.15, t0);
    nGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + 0.2);

    // 2. Warm Electric Piano Major 7th Chord: C4, E4, G4, B4
    const chordTime = t0 + 0.12;
    [261.63, 329.63, 392.00, 493.88].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, chordTime);

      gain.gain.setValueAtTime(0, chordTime);
      gain.gain.linearRampToValueAtTime(0.14, chordTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(chordTime);
      osc.stop(chordTime + 1.3);
    });
  }

  // =========================================================================
  // 11. FLOWER SHOP (花屋): Japanese Glass Wind Chimes (風鈴 - Fūrin)
  // =========================================================================
  playFlowerShopChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    // High sparkling crystal glass pentatonic tinkles
    const glassNotes = [
      { f: 1567.98, t: 0.00 }, // G6
      { f: 1760.00, t: 0.15 }, // A6
      { f: 2093.00, t: 0.32 }, // C7
      { f: 2349.32, t: 0.48 }, // D7
      { f: 1760.00, t: 0.70 }, // A6
    ];

    glassNotes.forEach(({ f, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.85);
    });
  }

  // =========================================================================
  // 12. BUS STOP (バス停): Pneumatic Air Brake Release + Boarding Chime
  // =========================================================================
  playBusStopChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Bus air-brake release hiss (Pshhhh-clack!)
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.22;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1.0;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.22, t0);
    nGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + 0.35);

    // 2. Bus Stop Ding-Dong Departure Chime
    [
      { f: 698.46, t: 0.28 }, // F5
      { f: 523.25, t: 0.58 }, // C5
    ].forEach(({ f, t }) => {
      const startTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.32, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }

  // =========================================================================
  // 13. CITY HALL (市役所): 5 PM Municipal Broadcast Chime (夕焼け小焼け)
  // =========================================================================
  playCityHallChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Opening melody of famous Japanese municipal 5 PM broadcast (Bousai Musen):
    // G4 -> E4 -> D4 -> E4 -> G4 -> A4
    const notes = [
      { f: 392.00, d: 0.30, t: 0.00 }, // G4
      { f: 329.63, d: 0.30, t: 0.32 }, // E4
      { f: 293.66, d: 0.30, t: 0.64 }, // D4
      { f: 329.63, d: 0.30, t: 0.96 }, // E4
      { f: 392.00, d: 0.30, t: 1.28 }, // G4
      { f: 440.00, d: 0.60, t: 1.60 }, // A4
    ];

    notes.forEach(({ f, d, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d + 0.1);
    });
  }

  // =========================================================================
  // 14. LIBRARY (図書館): Quiet Clock Tick + Contemplative Celesta
  // =========================================================================
  playLibraryChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // Soft library celesta arpeggio: D4 -> A4 -> F#5
    [
      { f: 293.66, t: 0.00 },
      { f: 440.00, t: 0.35 },
      { f: 739.99, t: 0.70 },
    ].forEach(({ f, t }) => {
      const startTime = t0 + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0005, startTime + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.95);
    });
  }

  // =========================================================================
  // 15. GYM (体育館): Basketball Dribble + Gymnasium Buzzer
  // =========================================================================
  playGymBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Basketball floor bounces: thud... thud.. thud
    [0.0, 0.22, 0.42].forEach((offset, idx) => {
      const bTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110 + idx * 15, bTime);
      osc.frequency.exponentialRampToValueAtTime(45, bTime + 0.08);

      gain.gain.setValueAtTime(0.4 - idx * 0.08, bTime);
      gain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(bTime);
      osc.stop(bTime + 0.1);
    });

    // 2. Gymnasium Electric Game Buzzer
    const buzzTime = t0 + 0.65;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, buzzTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850;

    gain.gain.setValueAtTime(0.25, buzzTime);
    gain.gain.setValueAtTime(0.25, buzzTime + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, buzzTime + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(buzzTime);
    osc.stop(buzzTime + 0.45);
  }

  // =========================================================================
  // 16. MUSEUM (博物館): Echoing Acoustic Hall Gong
  // =========================================================================
  playMuseumChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // Grand harmonic hall chime (A3, E4, A4, C#5)
    [220.0, 329.63, 440.0, 554.37].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);

      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.2 - idx * 0.03, t0 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 2.5);
    });
  }

  // =========================================================================
  // 17. TEMPLE (お寺): Deep Bronze Temple Bell Gong (梵鐘 - Bonshō)
  // =========================================================================
  playTempleBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;
    const baseFreq = 110; // Low deep A2 resonance

    const harmonics = [
      { ratio: 1.0, vol: 0.55, decay: 5.5 },
      { ratio: 1.414, vol: 0.32, decay: 4.0 },
      { ratio: 2.02, vol: 0.22, decay: 3.0 },
      { ratio: 2.78, vol: 0.14, decay: 2.2 },
      { ratio: 4.12, vol: 0.07, decay: 1.4 },
    ];

    harmonics.forEach(({ ratio, vol, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + decay);
    });
  }

  // =========================================================================
  // 18. SHRINE (神社): Wooden Hyōshigi Clappers + Suzu Prayer Bell
  // =========================================================================
  playShrineChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Wooden Hyōshigi Clapper (Clack! Clack!)
    [0.0, 0.28].forEach((offset) => {
      const cTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(820, cTime);
      osc.frequency.exponentialRampToValueAtTime(320, cTime + 0.04);

      gain.gain.setValueAtTime(0.4, cTime);
      gain.gain.exponentialRampToValueAtTime(0.001, cTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(cTime);
      osc.stop(cTime + 0.07);
    });

    // 2. Brass Suzu Rattle Bells
    const bellTime = t0 + 0.55;
    [2800, 3400, 4200].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, bellTime);

      gain.gain.setValueAtTime(0, bellTime);
      gain.gain.linearRampToValueAtTime(0.2, bellTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(bellTime);
      osc.stop(bellTime + 0.85);
    });
  }

  // =========================================================================
  // 19. PARK & GARDEN (公園・庭園): Bamboo Water Fountain (鹿威し - Shishi-odoshi)
  // =========================================================================
  playParkFountain() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Water Drip Trickles
    [0.0, 0.18, 0.35].forEach((offset) => {
      const dTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, dTime);
      osc.frequency.exponentialRampToValueAtTime(900, dTime + 0.05);

      gain.gain.setValueAtTime(0.18, dTime);
      gain.gain.exponentialRampToValueAtTime(0.001, dTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(dTime);
      osc.stop(dTime + 0.07);
    });

    // 2. Resonant Hollow Bamboo Strike: "KAPON!"
    const strikeTime = t0 + 0.52;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, strikeTime);
    osc.frequency.exponentialRampToValueAtTime(180, strikeTime + 0.12);

    gain.gain.setValueAtTime(0.5, strikeTime);
    gain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(strikeTime);
    osc.stop(strikeTime + 0.3);
  }

  // =========================================================================
  // 20. STADIUM (スタジアム): Match Whistle + Stadium Crowd Roar
  // =========================================================================
  playStadiumCheer() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Double whistle (pweee-pweet!)
    [0, 0.22].forEach((offset) => {
      const startTime = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, startTime);
      osc.frequency.exponentialRampToValueAtTime(2800, startTime + 0.12);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.38, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });

    // Warm Crowd Cheering Noise
    const noiseStart = ctx.currentTime + 0.35;
    const bufferSize = Math.floor(ctx.sampleRate * 1.6);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.14;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, noiseStart);
    noiseGain.gain.linearRampToValueAtTime(0.24, noiseStart + 0.35);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, noiseStart + 1.5);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(noiseStart);
    noise.stop(noiseStart + 1.6);
  }

  // =========================================================================
  // 21. CASTLE (お城): Samurai Taiko Drum Cadence (太鼓連打)
  // =========================================================================
  playCastleDrums() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // Taiko cadence: DON... DON... DOKO-DON!
    const strikes = [0.0, 0.32, 0.58, 0.76];
    strikes.forEach((offset, idx) => {
      const sTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, sTime);
      osc.frequency.exponentialRampToValueAtTime(45, sTime + 0.22);

      const amp = idx === 3 ? 0.55 : 0.42;
      gain.gain.setValueAtTime(amp, sTime);
      gain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(sTime);
      osc.stop(sTime + 0.3);
    });
  }

  // =========================================================================
  // 22. AMUSEMENT PARK (遊園地): Merry-Go-Round Carousel Calliope
  // =========================================================================
  playAmusementParkMusic() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Upbeat waltz calliope music box: G5 -> E5 -> C5 -> E5 -> G5 -> C6
    const notes = [
      { f: 783.99, d: 0.16, t: 0.00 },
      { f: 659.25, d: 0.16, t: 0.16 },
      { f: 523.25, d: 0.16, t: 0.32 },
      { f: 659.25, d: 0.16, t: 0.48 },
      { f: 783.99, d: 0.16, t: 0.64 },
      { f: 1046.50, d: 0.45, t: 0.80 },
    ];

    notes.forEach(({ f, d, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d);
    });
  }

  // =========================================================================
  // 23. AQUARIUM (水族館): Sonar Ping & Bubble Burst
  // =========================================================================
  playAquariumSonar() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Deep Submarine Sonar Ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, t0);
    osc.frequency.exponentialRampToValueAtTime(1160, t0 + 0.8);

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.35, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 1.45);

    // 2. Rising Water Bubbles (blub... bloop... blip!)
    [
      { f: 380, t: 0.4 },
      { f: 520, t: 0.6 },
      { f: 720, t: 0.8 },
    ].forEach(({ f, t }) => {
      const bTime = t0 + t;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();

      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(f, bTime);
      bOsc.frequency.exponentialRampToValueAtTime(f * 1.8, bTime + 0.08);

      bGain.gain.setValueAtTime(0.2, bTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.09);

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(bTime);
      bOsc.stop(bTime + 0.1);
    });
  }

  // =========================================================================
  // 24. ZOO (動物園): Safari Fanfare
  // =========================================================================
  playZooCall() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Upbeat brass safari fanfare: C4 -> E4 -> G4 -> C5
    const notes = [
      { f: 261.63, d: 0.15, t: 0.00 },
      { f: 329.63, d: 0.15, t: 0.15 },
      { f: 392.00, d: 0.18, t: 0.30 },
      { f: 523.25, d: 0.55, t: 0.48 },
    ];

    notes.forEach(({ f, d, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + d);
    });
  }

  // =========================================================================
  // 25. JUNIOR HIGH SCHOOL (中学校): Resonant Middle School Chime & Sports Whistle
  // =========================================================================
  playJuniorHighBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Resonant Japanese middle school 4-bell chime (Bb4 -> D5 -> C5 -> F4)
    const notes = [
      { f: 466.16, d: 0.7, t: 0.0 }, // Bb4
      { f: 587.33, d: 0.7, t: 0.55 }, // D5
      { f: 523.25, d: 0.7, t: 1.10 }, // C5
      { f: 349.23, d: 1.2, t: 1.65 }, // F4
    ];

    notes.forEach(({ f, d, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(f * 2.75, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.32, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(0.06, startTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + d * 0.5);

      osc.connect(gain);
      osc2.connect(gain2);
      gain.connect(ctx.destination);
      gain2.connect(ctx.destination);

      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + d + 0.1);
      osc2.stop(startTime + d * 0.5 + 0.1);
    });
  }

  // =========================================================================
  // 26. DEPARTMENT STORE (デパート): Japanese Elevator Welcome Chime
  // =========================================================================
  playDepartmentStoreChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Luxurious Japanese department store 2-tone elevator chime (High E6 -> Low B5)
    const tones = [
      { f: 1318.51, d: 1.2, t: 0.0 }, // E6
      { f: 987.77, d: 1.8, t: 0.45 }, // B5
    ];

    tones.forEach(({ f, d, t }) => {
      const startTime = ctx.currentTime + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      // Warm tubular bell overtone
      const oscHarm = ctx.createOscillator();
      const gainHarm = ctx.createGain();
      oscHarm.type = 'sine';
      oscHarm.frequency.setValueAtTime(f * 3.01, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + d);

      gainHarm.gain.setValueAtTime(0, startTime);
      gainHarm.gain.linearRampToValueAtTime(0.08, startTime + 0.015);
      gainHarm.gain.exponentialRampToValueAtTime(0.0001, startTime + d * 0.6);

      osc.connect(gain);
      oscHarm.connect(gainHarm);
      gain.connect(ctx.destination);
      gainHarm.connect(ctx.destination);

      osc.start(startTime);
      oscHarm.start(startTime);
      osc.stop(startTime + d + 0.1);
      oscHarm.stop(startTime + d * 0.6 + 0.1);
    });
  }

  // =========================================================================
  // 27. SWIMMING POOL (プール): Lifeguard Whistle & Pool Water Splash
  // =========================================================================
  playSwimmingPoolSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    // 1. Sharp Lifeguard Whistle blast (Pweee-pweet!)
    [0.0, 0.22].forEach((offset) => {
      const wTime = t0 + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2600, wTime);
      osc.frequency.exponentialRampToValueAtTime(3100, wTime + 0.14);

      gain.gain.setValueAtTime(0, wTime);
      gain.gain.linearRampToValueAtTime(0.35, wTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, wTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(wTime);
      osc.stop(wTime + 0.18);
    });

    // 2. Water Splash & Dive Sound (filtered noise surge)
    const splashStart = t0 + 0.42;
    const bufferSize = Math.floor(ctx.sampleRate * 0.8);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, splashStart);
    filter.frequency.exponentialRampToValueAtTime(450, splashStart + 0.6);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0, splashStart);
    nGain.gain.linearRampToValueAtTime(0.35, splashStart + 0.04);
    nGain.gain.exponentialRampToValueAtTime(0.001, splashStart + 0.75);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(splashStart);
    noise.stop(splashStart + 0.8);
  }

  // =========================================================================
  // 28. BICYCLE BELL & VENDING MACHINE
  // =========================================================================
  playBicycleBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    [0, 0.12].forEach((offset) => {
      const startTime = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.28);
    });
  }

  playVendingCan() {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, startTime);
    osc.frequency.exponentialRampToValueAtTime(90, startTime + 0.15);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.26);
  }

  // =========================================================================
  // 29. SUZUKA MICRO-KART ENGINE SYNTHESIZER
  // =========================================================================
  private kartOsc: OscillatorNode | null = null;
  private kartGain: GainNode | null = null;

  startKartEngine() {
    const ctx = this.getContext();
    if (!ctx || this.kartOsc) return;

    try {
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
      gain.connect(ctx.destination);

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
