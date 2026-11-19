/**
 * Sequential Azure Neural Voice Player for 3D Town Navigator (Stream A & Stream B).
 * Picks one consistent US/Canadian Azure Neural voice per round from
 * `/media/town_directions/manifest.json` and chains the pre-generated MP3 clips
 * seamlessly, falling back to browser SpeechSynthesis if clips aren't available.
 */

const BASE_URL = '/media/town_directions';

interface VoiceManifest {
  voices: string[];
  phraseCount?: number;
}

const PHRASE_TO_KEY: Record<string, string> = {
  'Go straight for one block.': 'straight_1',
  'Go straight for two blocks.': 'straight_2',
  'Go straight for three blocks.': 'straight_3',
  'Go straight for four blocks.': 'straight_4',
  'Turn around and go straight for one block.': 'turn_around_straight_1',
  'Turn around and go straight for two blocks.': 'turn_around_straight_2',
  'Turn around and go straight for three blocks.': 'turn_around_straight_3',
  'Turn around and go straight for four blocks.': 'turn_around_straight_4',
  'Turn left and go straight for one block.': 'turn_left_straight_1',
  'Turn left and go straight for two blocks.': 'turn_left_straight_2',
  'Turn left and go straight for three blocks.': 'turn_left_straight_3',
  'Turn left and go straight for four blocks.': 'turn_left_straight_4',
  'Turn right and go straight for one block.': 'turn_right_straight_1',
  'Turn right and go straight for two blocks.': 'turn_right_straight_2',
  'Turn right and go straight for three blocks.': 'turn_right_straight_3',
  'Turn right and go straight for four blocks.': 'turn_right_straight_4',
  'Turn left at the corner and go straight for one block.': 'corner_left_straight_1',
  'Turn left at the corner and go straight for two blocks.': 'corner_left_straight_2',
  'Turn left at the corner and go straight for three blocks.': 'corner_left_straight_3',
  'Turn left at the corner and go straight for four blocks.': 'corner_left_straight_4',
  'Turn right at the corner and go straight for one block.': 'corner_right_straight_1',
  'Turn right at the corner and go straight for two blocks.': 'corner_right_straight_2',
  'Turn right at the corner and go straight for three blocks.': 'corner_right_straight_3',
  'Turn right at the corner and go straight for four blocks.': 'corner_right_straight_4',
  'Turn left at the corner.': 'corner_left',
  'Turn right at the corner.': 'corner_right',
  'You can see it on your left.': 'arrive_left',
  'You can see it on your right.': 'arrive_right',
  'You can see it on the corner, on your left.': 'arrive_corner_left',
  'You can see it on the corner, on your right.': 'arrive_corner_right',
  'Look around! The destination is right here.': 'arrive_here',
};

let manifestPromise: Promise<VoiceManifest | null> | null = null;
let cachedVoices: string[] = [];
let voiceDeck: string[] = [];
let activeAudio: HTMLAudioElement | null = null;
let playbackToken = 0;

function loadManifest(): Promise<VoiceManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${BASE_URL}/manifest.json`)
      .then((res) => (res.ok ? (res.json() as Promise<VoiceManifest>) : null))
      .then((data) => {
        if (data?.voices && data.voices.length > 0) {
          cachedVoices = data.voices;
          return data;
        }
        return null;
      })
      .catch(() => null);
  }
  return manifestPromise;
}

/**
 * Picks one consistent US/CA Azure voice from a non-repeating shuffled deck.
 */
function pickNextVoice(): string | null {
  if (cachedVoices.length === 0) return null;
  if (voiceDeck.length === 0) {
    voiceDeck = [...cachedVoices];
    for (let i = voiceDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [voiceDeck[i], voiceDeck[j]] = [voiceDeck[j], voiceDeck[i]];
    }
  }
  return voiceDeck.pop() ?? cachedVoices[0];
}

export function stopDirectionVoice(): void {
  playbackToken++;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

function speakWithBrowserFallback(fullText: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(fullText);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /Natural|Online/i.test(v.name) && /^en-(US|CA)/i.test(v.lang)) ||
      voices.find((v) => /Google US English/i.test(v.name)) ||
      voices.find((v) => /^en-(US|CA)/i.test(v.lang));
    if (preferred) utter.voice = preferred;
    window.speechSynthesis.speak(utter);
  } catch {
    // Ignore restricted browser TTS errors
  }
}

function playSingleClip(url: string, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (token !== playbackToken) {
      resolve(false);
      return;
    }
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });
}

/**
 * Speaks a full suite of MEXT directions using ONE consistent Azure Neural voice.
 */
export async function speakDirectionSuite(options: {
  startBuildingId?: string;
  startNameEn?: string;
  stepsEn: string[];
  isMuted?: boolean;
  /** Optional pinned voiceId (e.g., when re-playing the same round's directions) */
  voiceId?: string;
}): Promise<string | null> {
  if (options.isMuted) return null;
  stopDirectionVoice();
  const token = playbackToken;

  const fallbackText = [
    options.startNameEn ? `Start at the ${options.startNameEn}.` : '',
    ...options.stepsEn,
  ]
    .filter(Boolean)
    .join(' ');

  await loadManifest();
  const voice = options.voiceId && cachedVoices.includes(options.voiceId)
    ? options.voiceId
    : pickNextVoice();

  if (!voice) {
    speakWithBrowserFallback(fallbackText);
    return null;
  }

  const keys: string[] = [];
  if (options.startBuildingId) {
    keys.push(`start_${options.startBuildingId}`);
  }
  for (const step of options.stepsEn) {
    const key = PHRASE_TO_KEY[step.trim()];
    if (!key) {
      // Unknown custom phrase -> use browser fallback cleanly
      speakWithBrowserFallback(fallbackText);
      return null;
    }
    keys.push(key);
  }

  for (const key of keys) {
    if (token !== playbackToken) return voice;
    const ok = await playSingleClip(`${BASE_URL}/${voice}/${key}.mp3`, token);
    if (!ok) {
      if (token === playbackToken) {
        speakWithBrowserFallback(fallbackText);
      }
      return null;
    }
  }

  return voice;
}
