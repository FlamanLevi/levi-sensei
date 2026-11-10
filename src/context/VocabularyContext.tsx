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
  const [searchQuery, setSearchQuery] = useState('');
  const [vocabularyScope, setVocabularyScope] = useState<VocabularyScope>('CURRENT');
  const [excludedWordIds, setExcludedWordIds] = useState<string[]>([]);
  const [isWordFilterModalOpen, setIsWordFilterModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetch('/data/master_vocabulary.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        return res.json();
      })
      .then((data: VocabularyItem[]) => {
        setAllWords(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load master vocabulary:', err);
        setIsLoading(false);
      });
  }, []);

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
