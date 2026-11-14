/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * 3D Undokai Tamaire — Zero-Asset WebAudio Counting Ceremony Synthesizer
 * ============================================================================
 */

import { soundEffects } from '@/services/soundEffects';

let sharedAudioCtx: AudioContext | null = null;

function getCeremonyAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = win.AudioContext || win.webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playTamaireCeremonySound(
  kind: 'WHISTLE' | 'COUNT_BEAT' | 'DRUMROLL' | 'CLIMAX_BAG' | 'VICTORY_FANFARE',
  pitchSemitones = 0,
  isSlowdown = false
): void {
  if (soundEffects.isMuted()) return;
  const ctx = getCeremonyAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    if (kind === 'WHISTLE') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2820, now);
      for (let i = 0; i < 12; i++) {
        osc.frequency.setValueAtTime(i % 2 === 0 ? 2960 : 2740, now + i * 0.045);
      }
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
      return;
    }

    if (kind === 'COUNT_BEAT') {
      const freq = 440 * Math.pow(2, pitchSemitones / 12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);

      const drum = ctx.createOscillator();
      const dGain = ctx.createGain();
      drum.type = 'sine';
      drum.frequency.setValueAtTime(isSlowdown ? 115 : 145, now);
      drum.frequency.exponentialRampToValueAtTime(48, now + 0.18);
      dGain.gain.setValueAtTime(isSlowdown ? 0.28 : 0.14, now);
      dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      drum.connect(dGain);
      dGain.connect(ctx.destination);
      drum.start(now);
      drum.stop(now + 0.22);
      return;
    }

    if (kind === 'DRUMROLL') {
      const hits = 14;
      for (let i = 0; i < hits; i++) {
        const t = now + i * 0.082;
        const progress = i / hits;
        const tom = ctx.createOscillator();
        const tGain = ctx.createGain();
        tom.type = 'sine';
        tom.frequency.setValueAtTime(130 + (i % 2) * 18 + progress * 35, t);
        tom.frequency.exponentialRampToValueAtTime(52, t + 0.075);
        tGain.gain.setValueAtTime(0.06 + progress * 0.18, t);
        tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        tom.connect(tGain);
        tGain.connect(ctx.destination);
        tom.start(t);
        tom.stop(t + 0.085);
      }
      return;
    }

    if (kind === 'CLIMAX_BAG') {
      const baseFreq = 587.33 * Math.pow(2, (pitchSemitones - 10) / 12);
      [1, 1.25, 1.5].forEach((mult, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * mult, now + idx * 0.04);
        gain.gain.setValueAtTime(0.14, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.36);
      });
      return;
    }

    if (kind === 'VICTORY_FANFARE') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((nFreq, idx) => {
        const startT = now + idx * 0.11;
        const dur = idx === notes.length - 1 ? 0.65 : 0.22;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(nFreq, startT);
        gain.gain.setValueAtTime(0.18, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + dur + 0.02);
      });
    }
  } catch {
    // Ignore audio context autoplay restrictions in headless browsers
  }
}
