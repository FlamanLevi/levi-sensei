import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { useClassroom } from './ClassroomContext';

export type VocabularyScope = 'CURRENT' | 'GRADE_ALL' | 'PRIOR_REVIEW' | 'ALL_ELEMENTARY';

export const PRIOR_GRADES_MAP: Record<GradeLevel, GradeLevel[]> = {
  'KD_3yo': [],
  'KD_4yo': ['KD_3yo'],
  'KD_5yo': ['KD_3yo', 'KD_4yo'],
  'ES_G1': [],
  'ES_G2': ['ES_G1'],
  'ES_G3': ['ES_G1', 'ES_G2'],
  'ES_G4': ['ES_G1', 'ES_G2', 'ES_G3'],
  'ES_G5': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4'],
  'ES_G6': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5'],
  'JHS_G1': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6'],
  'JHS_G2': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1'],
  'JHS_G3': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1', 'JHS_G2'],
};

export const CUMULATIVE_GRADES_MAP: Record<GradeLevel, GradeLevel[]> = {
  'KD_3yo': ['KD_3yo'],
  'KD_4yo': ['KD_3yo', 'KD_4yo'],
  'KD_5yo': ['KD_3yo', 'KD_4yo', 'KD_5yo'],
  'ES_G1': ['ES_G1'],
  'ES_G2': ['ES_G1', 'ES_G2'],
  'ES_G3': ['ES_G1', 'ES_G2', 'ES_G3'],
  'ES_G4': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4'],
  'ES_G5': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5'],
  'ES_G6': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6'],
  'JHS_G1': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1'],
  'JHS_G2': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1', 'JHS_G2'],
  'JHS_G3': ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1', 'JHS_G2', 'JHS_G3'],
};

export interface VocabularyClueEntry {
  three_hints?: VocabularyItem['three_hints'];
  target_dialogues?: VocabularyItem['target_dialogues'];
  target_sentences?: VocabularyItem['target_sentences'];
}

interface VocabularyManifest {
  version: string;
  coreHash: string;
  cluesHash: string;
  wordCount: number;
}

const VOCAB_CACHE_NAME = 'levi-sensei-vocab-v1';
const CORE_URL = '/data/master_vocabulary.json';
const CLUES_URL = '/data/vocabulary_clues.json';
const MANIFEST_URL = '/data/vocabulary_manifest.json';
const LS_CORE_HASH_KEY = 'levi_vocab_core_hash';
const LS_CLUES_HASH_KEY = 'levi_vocab_clues_hash';

let cachedCluesData: Record<string, VocabularyClueEntry> | null = null;
let cluesFetchPromise: Promise<Record<string, VocabularyClueEntry>> | null = null;

function normalizeVocabularyItem(w: VocabularyItem, clue?: VocabularyClueEntry): VocabularyItem {
  const enTrimmed = (w.english || '').trim();
  const alphaOnly = enTrimmed.replace(/[^a-zA-Z]/g, '');
  const suite = w.audio_suite || {};
  const mediaByGradeImage = w.media_by_grade
    ? Object.values(w.media_by_grade).find(m => m?.card_image)?.card_image || ''
    : '';
  return {
    ...w,
    primary_audio: w.primary_audio || w.sound_file || suite.en_jenny || suite.jenny || '',
    primary_image: w.primary_image || w.card_image || w.hwg_card_illust || mediaByGradeImage || w.hwg_card_full || '',
    letter_count: w.letter_count ?? (alphaOnly.length || enTrimmed.length),
    first_letter: w.first_letter || (alphaOnly.charAt(0) || enTrimmed.charAt(0)).toUpperCase(),
    normalized_english: w.normalized_english || enTrimmed.toLowerCase(),
    canonical_key: w.canonical_key || enTrimmed.toLowerCase(),
    three_hints: clue?.three_hints || w.three_hints,
    target_dialogues: clue?.target_dialogues || w.target_dialogues || [],
    target_sentences: clue?.target_sentences || w.target_sentences || []
  };
}

async function fetchJsonWithCache<T>(
  url: string,
  expectedHash: string | null,
  lsHashKey: string
): Promise<T> {
  const canUseCache = typeof window !== 'undefined' && 'caches' in window;
  if (canUseCache && expectedHash) {
    try {
      const storedHash = localStorage.getItem(lsHashKey);
      if (storedHash === expectedHash) {
        const cache = await window.caches.open(VOCAB_CACHE_NAME);
        const cachedRes = await cache.match(url);
        if (cachedRes) {
          return (await cachedRes.json()) as T;
        }
      }
    } catch {
      // Fallback to network fetch
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP status ${res.status} for ${url}`);

  if (canUseCache) {
    try {
      const cache = await window.caches.open(VOCAB_CACHE_NAME);
      await cache.put(url, res.clone());
      if (expectedHash) {
        localStorage.setItem(lsHashKey, expectedHash);
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  return (await res.json()) as T;
}

export async function loadVocabularyCluesMap(): Promise<Record<string, VocabularyClueEntry>> {
  if (cachedCluesData) return cachedCluesData;
  if (!cluesFetchPromise) {
    cluesFetchPromise = (async () => {
      try {
        const expectedHash = typeof window !== 'undefined' ? localStorage.getItem(LS_CLUES_HASH_KEY) : null;
        const data = await fetchJsonWithCache<Record<string, VocabularyClueEntry>>(
          CLUES_URL,
          expectedHash,
          LS_CLUES_HASH_KEY
        );
        cachedCluesData = data || {};
        return cachedCluesData;
      } catch (err) {
        console.warn('Failed to load vocabulary clues:', err);
        cachedCluesData = {};
        return cachedCluesData;
      }
    })();
  }
  return cluesFetchPromise;
}

export interface VocabularyContextType {
  allWords: VocabularyItem[];
  filteredWords: VocabularyItem[];
  rawFilteredWords: VocabularyItem[];
  gradeWords: VocabularyItem[];
  scopedWords: VocabularyItem[];
  vocabularyScope: VocabularyScope;
  setVocabularyScope: (scope: VocabularyScope) => void;
  getWordsForScope: (scope: VocabularyScope, targetGrade?: GradeLevel) => VocabularyItem[];
  getWordsForUnits: (units: string[], targetGrade?: GradeLevel) => VocabularyItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  availableUnits: string[];
  totalWordsCount: number;
  isLoading: boolean;
  areCluesLoaded: boolean;
  ensureCluesLoaded: () => Promise<void>;
  // Word Pool Curation (Lesson Basket)
  excludedWordIds: string[];
  toggleWordExcluded: (id: string) => void;
  includeAllWords: () => void;
  excludeAllWords: () => void;
  selectRandomWords: (count: number) => void;
  selectSingularWordsOnly: () => void;
  selectPluralWordsOnly: () => void;
  selectUppercaseOnly: () => void;
  selectLowercaseOnly: () => void;
  selectLetterRange: (fromChar: string, toChar: string) => void;
  selectTextbookHalf: (half: 'FIRST_HALF' | 'SECOND_HALF') => void;
  isWordExcluded: (id: string) => boolean;
  isWordFilterModalOpen: boolean;
  setIsWordFilterModalOpen: (open: boolean) => void;
  openWordFilterModal: () => void;
  closeWordFilterModal: () => void;
}

const VocabularyContext = createContext<VocabularyContextType | null>(null);

export const VocabularyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeGrade, activeCategory, activeUnit, selectedUnits } = useClassroom();
  const [allWords, setAllWords] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [areCluesLoaded, setAreCluesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vocabularyScope, setVocabularyScope] = useState<VocabularyScope>('CURRENT');
  const [excludedWordIds, setExcludedWordIds] = useState<string[]>([]);
  const [isWordFilterModalOpen, setIsWordFilterModalOpen] = useState<boolean>(false);

  const ensureCluesLoaded = useCallback(async () => {
    const cluesMap = await loadVocabularyCluesMap();
    if (Object.keys(cluesMap).length > 0) {
      setAllWords(prev =>
        prev.map(w => {
          const clue = cluesMap[w.id];
          if (!clue) return w;
          return {
            ...w,
            three_hints: clue.three_hints || w.three_hints,
            target_dialogues: clue.target_dialogues || w.target_dialogues || [],
            target_sentences: clue.target_sentences || w.target_sentences || []
          };
        })
      );
      setAreCluesLoaded(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const canUseCache = typeof window !== 'undefined' && 'caches' in window;

    async function initVocabulary() {
      let servedFromCache = false;

      // 1. Instant Stale-While-Revalidate read from Cache Storage if available
      if (canUseCache) {
        try {
          const cache = await window.caches.open(VOCAB_CACHE_NAME);
          const cachedRes = await cache.match(CORE_URL);
          if (cachedRes) {
            const cachedData = (await cachedRes.json()) as VocabularyItem[];
            if (mounted && Array.isArray(cachedData) && cachedData.length > 0) {
              setAllWords(cachedData.map(w => normalizeVocabularyItem(w, cachedCluesData?.[w.id])));
              setIsLoading(false);
              servedFromCache = true;
            }
          }
        } catch {
          // Ignore cache read error
        }
      }

      // 2. Check lightweight manifest to verify hash or fetch fresh payload
      try {
        let manifest: VocabularyManifest | null = null;
        try {
          const mRes = await fetch(MANIFEST_URL, { cache: 'no-cache' });
          if (mRes.ok) {
            manifest = (await mRes.json()) as VocabularyManifest;
          }
        } catch {
          // Offline or manifest missing
        }

        const storedCoreHash = typeof window !== 'undefined' ? localStorage.getItem(LS_CORE_HASH_KEY) : null;
        const needsFreshCore = !servedFromCache || (manifest?.coreHash && manifest.coreHash !== storedCoreHash);

        if (manifest?.cluesHash) {
          const storedCluesHash = localStorage.getItem(LS_CLUES_HASH_KEY);
          if (storedCluesHash && storedCluesHash !== manifest.cluesHash) {
            cachedCluesData = null;
            cluesFetchPromise = null;
          }
        }

        if (needsFreshCore) {
          const freshData = await fetchJsonWithCache<VocabularyItem[]>(
            CORE_URL,
            manifest?.coreHash || null,
            LS_CORE_HASH_KEY
          );
          if (mounted) {
            setAllWords(freshData.map(w => normalizeVocabularyItem(w, cachedCluesData?.[w.id])));
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (!servedFromCache) {
          console.error('Failed to load master vocabulary:', err);
          if (mounted) setIsLoading(false);
        }
      }

      // 3. Low-priority idle pre-warming of pedagogical clues after initial UI paint
      const scheduleIdle =
        typeof window !== 'undefined' && 'requestIdleCallback' in window
          ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 3000 })
          : (cb: () => void) => setTimeout(cb, 1500);

      scheduleIdle(() => {
        if (mounted) {
          ensureCluesLoaded();
        }
      });
    }

    initVocabulary();
    return () => {
      mounted = false;
    };
  }, [ensureCluesLoaded]);

  // 1. Filter by Active Grade
  const gradeWords = useMemo(() => {
    return allWords.filter(w => w.grades && w.grades.includes(activeGrade));
  }, [allWords, activeGrade]);

  // 2. Discover available units for this grade with natural numerical sorting
  const availableUnits = useMemo(() => {
    const unitsSet = new Set<string>();
    gradeWords.forEach(w => {
      const gm = w.media_by_grade && w.media_by_grade[activeGrade];
      if (gm && gm.unit) {
        unitsSet.add(gm.unit);
      }
    });
    return Array.from(unitsSet).sort((a, b) => {
      const matchA = a.match(/^Unit\s+(\d+)/i);
      const matchB = b.match(/^Unit\s+(\d+)/i);
      if (matchA && matchB) {
        return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
      }
      return a.localeCompare(b);
    });
  }, [gradeWords, activeGrade]);

  // Cumulative words learned up to and including activeGrade
  const cumulativeGradeWords = useMemo(() => {
    const allowedGrades = CUMULATIVE_GRADES_MAP[activeGrade] || [activeGrade];
    return allWords.filter(w => w.grades && w.grades.some(g => allowedGrades.includes(g as GradeLevel)));
  }, [allWords, activeGrade]);

  // 3. Raw Filtered Words (Grade + Category + Unit + Search before exclusion)
  const rawFilteredWords = useMemo(() => {
    const isUnitLocked = (selectedUnits && selectedUnits.length > 0) || activeUnit !== 'ALL';
    const isCategoryOrSearchActive = activeCategory !== 'ALL' || searchQuery.trim().length > 0;

    // If a specific textbook unit is selected, stay strictly within activeGrade.
    // If browsing a Thematic Category (e.g. Food, Animals) or Searching with Unit='ALL',
    // include all words learned up through activeGrade!
    const basePool = (!isUnitLocked && isCategoryOrSearchActive) ? cumulativeGradeWords : gradeWords;

    return basePool.filter(w => {
      // Category match
      if (activeCategory !== 'ALL' && w.category !== activeCategory) {
        return false;
      }
      // Multi-Unit or Single-Unit match (official textbook chapter)
      if (selectedUnits && selectedUnits.length > 0) {
        const gm = w.media_by_grade && w.media_by_grade[activeGrade];
        if (!gm || !gm.unit || !selectedUnits.includes(gm.unit)) return false;
      } else if (activeUnit !== 'ALL') {
        const gm = w.media_by_grade && w.media_by_grade[activeGrade];
        if (!gm || gm.unit !== activeUnit) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEn = w.english.toLowerCase().includes(q);
        const matchesJp = (w.ja_kanji && w.ja_kanji.includes(q)) || (w.ja_hiragana && w.ja_hiragana.includes(q));
        const matchesKat = w.en_katakana && w.en_katakana.includes(q);
        if (!matchesEn && !matchesJp && !matchesKat) return false;
      }
      return true;
    });
  }, [gradeWords, cumulativeGradeWords, activeCategory, activeUnit, selectedUnits, searchQuery, activeGrade]);

  // 4. Reset exclusions whenever curriculum unit, grade, category, or selected bundles change
  useEffect(() => {
    setExcludedWordIds([]);
  }, [activeGrade, activeCategory, activeUnit, selectedUnits]);

  // 5. Active Filtered Words (omitting any excluded cards in the lesson basket)
  const filteredWords = useMemo(() => {
    if (excludedWordIds.length === 0) return rawFilteredWords;
    const excludedSet = new Set(excludedWordIds);
    return rawFilteredWords.filter(w => !excludedSet.has(w.id));
  }, [rawFilteredWords, excludedWordIds]);

  // 6. Word Curation Actions
  const toggleWordExcluded = useCallback((id: string) => {
    setExcludedWordIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const includeAllWords = useCallback(() => {
    setExcludedWordIds([]);
  }, []);

  const excludeAllWords = useCallback(() => {
    setExcludedWordIds(rawFilteredWords.map(w => w.id));
  }, [rawFilteredWords]);

  const selectRandomWords = useCallback((count: number) => {
    if (rawFilteredWords.length <= count) {
      setExcludedWordIds([]);
      return;
    }
    const shuffled = [...rawFilteredWords].sort(() => Math.random() - 0.5);
    const chosenIds = new Set(shuffled.slice(0, count).map(w => w.id));
    const toExclude = rawFilteredWords.filter(w => !chosenIds.has(w.id)).map(w => w.id);
    setExcludedWordIds(toExclude);
  }, [rawFilteredWords]);

  const selectSingularWordsOnly = useCallback(() => {
    const toExclude = rawFilteredWords.filter(w => w.is_plural).map(w => w.id);
    setExcludedWordIds(toExclude);
  }, [rawFilteredWords]);

  const selectPluralWordsOnly = useCallback(() => {
    const toExclude = rawFilteredWords.filter(w => !w.is_plural).map(w => w.id);
    setExcludedWordIds(toExclude);
  }, [rawFilteredWords]);

  const selectUppercaseOnly = useCallback(() => {
    const toExclude = rawFilteredWords.filter(w => {
      const isLetter = w.category === '16_alphabet' || (w.english.length === 1 && /^[a-zA-Z]$/.test(w.english));
      return !(isLetter && w.english === w.english.toUpperCase());
    }).map(w => w.id);
    setExcludedWordIds(toExclude);
  }, [rawFilteredWords]);

  const selectLowercaseOnly = useCallback(() => {
    const toExclude = rawFilteredWords.filter(w => {
      const isLetter = w.category === '16_alphabet' || (w.english.length === 1 && /^[a-zA-Z]$/.test(w.english));
      return !(isLetter && w.english === w.english.toLowerCase());
    }).map(w => w.id);
    setExcludedWordIds(toExclude);
  }, [rawFilteredWords]);

  const selectLetterRange = useCallback((fromChar: string, toChar: string) => {
    const fromCode = fromChar.toLowerCase().charCodeAt(0);
    const toCode = toChar.toLowerCase().charCodeAt(0);

    // Check if user currently has filtered strictly to uppercase or lowercase
    const letterWords = rawFilteredWords.filter(w => w.category === '16_alphabet' || (w.english.length === 1 && /^[a-zA-Z]$/.test(w.english)));
    const activeLetterWords = letterWords.filter(w => !excludedWordIds.includes(w.id));
    const onlyUpperActive = activeLetterWords.length > 0 && activeLetterWords.every(w => w.english === w.english.toUpperCase());
    const onlyLowerActive = activeLetterWords.length > 0 && activeLetterWords.every(w => w.english === w.english.toLowerCase());

    const toExclude = rawFilteredWords.filter(w => {
      const isLetter = w.category === '16_alphabet' || (w.english.length === 1 && /^[a-zA-Z]$/.test(w.english));
      if (!isLetter) return true;
      const code = w.english.toLowerCase().charCodeAt(0);
      if (code < fromCode || code > toCode) return true;
      if (onlyUpperActive && w.english !== w.english.toUpperCase()) return true;
      if (onlyLowerActive && w.english !== w.english.toLowerCase()) return true;
      return false;
    }).map(w => w.id);
    setExcludedWordIds(toExclude);
  }, [rawFilteredWords, excludedWordIds]);

  const selectTextbookHalf = useCallback((half: 'FIRST_HALF' | 'SECOND_HALF') => {
    if (half === 'FIRST_HALF') {
      selectLetterRange('a', 'm');
    } else {
      selectLetterRange('n', 'z');
    }
  }, [selectLetterRange]);

  const isWordExcluded = useCallback((id: string) => {
    return excludedWordIds.includes(id);
  }, [excludedWordIds]);

  const openWordFilterModal = useCallback(() => setIsWordFilterModalOpen(true), []);
  const closeWordFilterModal = useCallback(() => setIsWordFilterModalOpen(false), []);

  // 7. Reset Vocabulary Scope to 'CURRENT' whenever the active grade changes
  useEffect(() => {
    setVocabularyScope('CURRENT');
  }, [activeGrade]);

  // 8. Compute Words by Specific Units
  const getWordsForUnits = useCallback((units: string[], targetGrade: GradeLevel = activeGrade): VocabularyItem[] => {
    if (!units || units.length === 0) return [];
    return allWords.filter(w => {
      if (!w.grades || !w.grades.includes(targetGrade)) return false;
      const gm = w.media_by_grade && w.media_by_grade[targetGrade];
      return Boolean(gm && gm.unit && units.includes(gm.unit));
    });
  }, [allWords, activeGrade]);

  // 9. Compute Words by Scope
  const getWordsForScope = useCallback((scope: VocabularyScope, targetGrade: GradeLevel = activeGrade): VocabularyItem[] => {
    if (scope === 'CURRENT') {
      return filteredWords.length > 0 ? filteredWords : gradeWords;
    }
    if (scope === 'GRADE_ALL') {
      return allWords.filter(w => w.grades && w.grades.includes(targetGrade));
    }
    if (scope === 'PRIOR_REVIEW') {
      const priorGrades = PRIOR_GRADES_MAP[targetGrade] || [];
      if (priorGrades.length === 0) return gradeWords;
      return allWords.filter(w => w.grades && w.grades.some(g => priorGrades.includes(g as GradeLevel)));
    }
    if (scope === 'ALL_ELEMENTARY') {
      const cumGrades: GradeLevel[] = ['ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6'];
      return allWords.filter(w => w.grades && w.grades.some(g => cumGrades.includes(g as GradeLevel)));
    }
    return gradeWords;
  }, [allWords, filteredWords, gradeWords, activeGrade]);

  const scopedWords = useMemo(() => {
    return getWordsForScope(vocabularyScope, activeGrade);
  }, [getWordsForScope, vocabularyScope, activeGrade]);

  return (
    <VocabularyContext.Provider value={{
      allWords,
      filteredWords,
      rawFilteredWords,
      gradeWords,
      scopedWords,
      vocabularyScope,
      setVocabularyScope,
      getWordsForScope,
      getWordsForUnits,
      searchQuery,
      setSearchQuery,
      availableUnits,
      totalWordsCount: allWords.length,
      isLoading,
      areCluesLoaded,
      ensureCluesLoaded,
      excludedWordIds,
      toggleWordExcluded,
      includeAllWords,
      excludeAllWords,
      selectRandomWords,
      selectSingularWordsOnly,
      selectPluralWordsOnly,
      selectUppercaseOnly,
      selectLowercaseOnly,
      selectLetterRange,
      selectTextbookHalf,
      isWordExcluded,
      isWordFilterModalOpen,
      setIsWordFilterModalOpen,
      openWordFilterModal,
      closeWordFilterModal
    }}>
      {children}
    </VocabularyContext.Provider>
  );
};

export const useVocabulary = () => {
  const context = useContext(VocabularyContext);
  if (!context) throw new Error('useVocabulary must be used within VocabularyProvider');
  return context;
};
