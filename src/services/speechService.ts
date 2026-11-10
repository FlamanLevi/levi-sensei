/**
 * Speech & Pronunciation Service for Levi-Sensei English Platform
 * 
 * Provides high-quality, natural voice synthesis using Web Speech API:
 * - Prioritizes Neural / Natural / Premium voices (Edge Natural, Apple Siri/Samantha/Ava, Google US English).
 * - Automatic cleaning of hyphens/punctuation (e.g. "shichi-go-san" -> "shichi go san") to avoid robotic hyphen reading.
 * - Enunciated, student-friendly elementary rate (0.86) and warm pitch (1.02).
 * - Seamless integration with BGM ducking (duck volume on start, restore on end).
 * - Robust cross-platform fallback for iOS Safari and Chromium.
 */

export interface SpeakWordOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
  onStart?: () => void;
  onEnd?: () => void;
}

class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();
  private safetyTimer: NodeJS.Timeout | null = null;
  private pendingSpeakTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
      if (this.voices.length > 0) {
        this.voicesLoaded = true;
      }
    };

    updateVoices();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    } catch {}
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  /**
   * Return available high quality voices for diagnostics and selection
   */
  public getAvailableVoices(): { english: SpeechSynthesisVoice[]; japanese: SpeechSynthesisVoice[] } {
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return {
      english: this.voices.filter(v => v.lang.startsWith('en')),
      japanese: this.voices.filter(v => v.lang.startsWith('ja'))
    };
  }

  /**
   * Get the best English voice available on the device,
   * preferring high-quality natural/neural/online voices over robotic synthesizers.
   */
  public getBestEnglishVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    if (!this.voices.length) return null;

    // Prioritize natural / neural / premium voices on Windows, Edge, macOS, iOS, Android
    const priorityKeywords = [
      'natural',
      'online (natural)',
      'neural',
      'enhanced',
      'premium',
      'siri',
      'jenny',
      'guy',
      'aria',
      'ava',
      'samantha',
      'daniel',
      'karen',
      'moira',
      'alex',
      'google us english'
    ];

    for (const keyword of priorityKeywords) {
      const match = this.voices.find(
        v => v.lang.startsWith('en') && v.name.toLowerCase().includes(keyword)
      );
      if (match) return match;
    }

    // Secondary fallback: Any en-US voice
    const enUs = this.voices.find(v => v.lang === 'en-US');
    if (enUs) return enUs;

    // Tertiary fallback: Any English voice
    return this.voices.find(v => v.lang.startsWith('en')) || null;
  }

  /**
   * Get voice for Speaker A (Teacher / Leader persona)
   */
  public getTeacherVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    if (!this.voices.length) return null;

    const teacherKeywords = [
      'guy',
      'david',
      'alex',
      'daniel',
      'christopher',
      'mark',
      'george',
      'oliver',
      'uk english male',
      'natural'
    ];

    for (const keyword of teacherKeywords) {
      const match = this.voices.find(
        v => v.lang.startsWith('en') && v.name.toLowerCase().includes(keyword)
      );
      if (match) return match;
    }

    return this.getBestEnglishVoice();
  }

  /**
   * Get voice for Speaker B (Student / Class persona)
   * Prioritizes alternative/youthful voice distinct from Teacher
   */
  public getStudentVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    if (!this.voices.length) return null;

    const teacherVoice = this.getTeacherVoice();

    const studentKeywords = [
      'jenny',
      'samantha',
      'ava',
      'aria',
      'karen',
      'victoria',
      'zoe',
      'zira',
      'uk english female',
      'google us english'
    ];

    for (const keyword of studentKeywords) {
      const match = this.voices.find(
        v => v.lang.startsWith('en') && v.name.toLowerCase().includes(keyword) && v !== teacherVoice
      );
      if (match) return match;
    }

    const otherVoice = this.voices.find(v => v.lang.startsWith('en') && v !== teacherVoice);
    if (otherVoice) return otherVoice;

    return this.getBestEnglishVoice();
  }

  /**
   * Get the best Japanese voice available on the device.
   */
  public getBestJapaneseVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    if (!this.voices.length) return null;

    const priorityKeywords = ['google', 'natural', 'online', 'enhanced', 'kyoko', 'otoya', 'haruka', 'ayumi', 'nanami', 'keita', 'ichiro'];
    for (const keyword of priorityKeywords) {
      const match = this.voices.find(
        v => v.lang.startsWith('ja') && v.name.toLowerCase().includes(keyword)
      );
      if (match) return match;
    }

    return this.voices.find(v => v.lang.startsWith('ja')) || null;
  }

  /**
   * Clean text for elementary pronunciation:
   * Replaces hyphens and underscores with spaces so synthesizers do not say "hyphen".
   * Example: "shichi-go-san" -> "shichi go san", "t-shirt" -> "t shirt".
   */
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';
    return text
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speaks a word or sentence clearly with BGM ducking support.
   */
  public speak(text: string, options?: SpeakWordOptions): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        options?.onEnd?.();
        resolve();
        return;
      }

      const cleanText = this.cleanTextForSpeech(text);
      if (!cleanText) {
        options?.onEnd?.();
        resolve();
        return;
      }

      try {
        if (this.pendingSpeakTimer) {
          clearTimeout(this.pendingSpeakTimer);
          this.pendingSpeakTimer = null;
        }

        // Cancel any pending speech to avoid backlog or overlapping voices
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        if (this.safetyTimer) {
          clearTimeout(this.safetyTimer);
          this.safetyTimer = null;
        }

        // Small 15ms scheduling tick to let Chromium process internal cancellation before speak()
        this.pendingSpeakTimer = setTimeout(() => {
          this.pendingSpeakTimer = null;
          this.executeUtterance(cleanText, options, resolve, false);
        }, 15);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
        options?.onEnd?.();
        resolve();
      }
    });
  }

  private executeUtterance(
    cleanText: string,
    options: SpeakWordOptions | undefined,
    resolve: () => void,
    isRetryWithDefaultVoice: boolean
  ) {
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(cleanText) || options?.lang === 'ja-JP';

      if (isJapanese) {
        utterance.lang = 'ja-JP';
        if (options?.voice) {
          utterance.voice = options.voice;
        } else if (!isRetryWithDefaultVoice) {
          const jaVoice = this.getBestJapaneseVoice();
          if (jaVoice) utterance.voice = jaVoice;
        }
        utterance.rate = options?.rate ?? 0.95;
        utterance.pitch = options?.pitch ?? 1.0;
      } else {
        utterance.lang = options?.lang || 'en-US';
        if (options?.voice) {
          utterance.voice = options.voice;
        } else if (!isRetryWithDefaultVoice) {
          const enVoice = this.getBestEnglishVoice();
          if (enVoice) utterance.voice = enVoice;
        }
        // Deliberate, clear elementary enunciation
        utterance.rate = options?.rate ?? 0.86;
        utterance.pitch = options?.pitch ?? 1.02;
      }

      if (options?.volume !== undefined) {
        utterance.volume = options.volume;
      }

      let hasFinished = false;
      const cleanup = () => {
        if (hasFinished) return;
        hasFinished = true;
        if (this.safetyTimer) {
          clearTimeout(this.safetyTimer);
          this.safetyTimer = null;
        }
        this.activeUtterances.delete(utterance);
        options?.onEnd?.();
        resolve();
      };

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = cleanup;

      utterance.onerror = (err) => {
        // If an online voice failed due to network / firewall, retry once with default system voice
        if (!isRetryWithDefaultVoice && (err.error === 'network' || err.error === 'voice-unavailable' || err.error === 'synthesis-unavailable')) {
          console.warn('Speech online voice failed, falling back to local system voice:', err.error);
          this.activeUtterances.delete(utterance);
          this.executeUtterance(cleanText, options, resolve, true);
          return;
        }
        cleanup();
      };

      // Safety timeout for iOS Safari WebKit bug where onend sometimes fails to fire
      const estimatedDurationMs = Math.max(1800, (cleanText.length / 3) * 1000 + 1500);
      this.safetyTimer = setTimeout(() => {
        cleanup();
      }, estimatedDurationMs);

      // Keep utterance in Set to prevent GC in Chrome/Safari
      this.activeUtterances.add(utterance);

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Failed to speak utterance:', e);
      options?.onEnd?.();
      resolve();
    }
  }

  /**
   * Stop any active speech immediately and restore audio.
   */
  public stop() {
    this.cancel();
  }

  public cancel() {
    if (this.pendingSpeakTimer) {
      clearTimeout(this.pendingSpeakTimer);
      this.pendingSpeakTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
    }
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    this.activeUtterances.clear();
  }
}

export const speechService = new SpeechService();

export type VoiceSpeaker = 'jenny' | 'andrew' | 'ana' | 'nanami';

/**
 * Derives audio suite URL dynamically for any speaker (jenny, andrew, ana, nanami)
 */
export function getWordAudioUrl(
  word: { sound_file?: string; audio_suite?: Record<string, string> },
  speaker: VoiceSpeaker = 'jenny'
): string {
  if (word.audio_suite && word.audio_suite[speaker]) {
    return word.audio_suite[speaker];
  }
  if (!word.sound_file) return '';
  return word.sound_file.replace(/_jenny\.mp3$/i, `_${speaker}.mp3`);
}
