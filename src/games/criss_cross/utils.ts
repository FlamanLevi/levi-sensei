import { DeskState, SweepAxis, CrissCrossConfig } from './types';
import { VocabularyItem } from '@data/types';
import { sampleCards, shuffleArray } from '@/utils/cardUtils';

export function initializeDeskGrid(rows: number, cols: number): DeskState[] {
  const desks: DeskState[] = [];
  let seatNum = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      desks.push({
        id: `desk-${r}-${c}`,
        row: r,
        col: c,
        label: `${seatNum}`,
        status: 'STANDING'
      });
      seatNum++;
    }
  }

  return desks;
}

export interface SweepSelectionResult {
  axis: SweepAxis;
  targetedDeskIds: string[];
  descriptionJa: string;
  descriptionEn: string;
}

export function pickAvailableSweep(
  desks: DeskState[],
  config: CrissCrossConfig
): SweepSelectionResult | null {
  const standingDesks = desks.filter(d => d.status === 'STANDING');
  if (standingDesks.length === 0) return null;

  const availableAxes: SweepAxis[] = [];
  if (config.axisMode === 'ROW_ONLY') availableAxes.push('ROW');
  else if (config.axisMode === 'COL_ONLY') availableAxes.push('COLUMN');
  else if (config.axisMode === 'CRISS_CROSS_ONLY') availableAxes.push('CRISS_CROSS');
  else availableAxes.push('ROW', 'COLUMN', 'CRISS_CROSS', 'RANDOM_SINGLE');

  const shuffledAxes = shuffleArray(availableAxes);

  for (const axis of shuffledAxes) {
    if (axis === 'ROW') {
      const rowIndices = Array.from(new Set(standingDesks.map(d => d.row)));
      if (rowIndices.length > 0) {
        const pickedRow = rowIndices[Math.floor(Math.random() * rowIndices.length)];
        const targets = desks.filter(d => d.row === pickedRow && d.status === 'STANDING').map(d => d.id);
        return {
          axis: 'ROW',
          targetedDeskIds: targets,
          descriptionJa: `横の列: ${pickedRow + 1} 列目！`,
          descriptionEn: `Row ${pickedRow + 1}!`
        };
      }
    }

    if (axis === 'COLUMN') {
      const colIndices = Array.from(new Set(standingDesks.map(d => d.col)));
      if (colIndices.length > 0) {
        const pickedCol = colIndices[Math.floor(Math.random() * colIndices.length)];
        const targets = desks.filter(d => d.col === pickedCol && d.status === 'STANDING').map(d => d.id);
        return {
          axis: 'COLUMN',
          targetedDeskIds: targets,
          descriptionJa: `縦の列: ${pickedCol + 1} 班！`,
          descriptionEn: `Column ${pickedCol + 1}!`
        };
      }
    }

    if (axis === 'CRISS_CROSS') {
      const diag1 = desks.filter(d => d.row === d.col && d.status === 'STANDING').map(d => d.id);
      const diag2 = desks.filter(d => d.row + d.col === config.cols - 1 && d.status === 'STANDING').map(d => d.id);
      const diags = [diag1, diag2].filter(arr => arr.length > 0);
      if (diags.length > 0) {
        const pickedDiag = diags[Math.floor(Math.random() * diags.length)];
        return {
          axis: 'CRISS_CROSS',
          targetedDeskIds: pickedDiag,
          descriptionJa: `たすき掛け・斜めの列！ (Criss-Cross)`,
          descriptionEn: `Criss-Cross Diagonal!`
        };
      }
    }

    if (axis === 'RANDOM_SINGLE') {
      const picked = standingDesks[Math.floor(Math.random() * standingDesks.length)];
      return {
        axis: 'RANDOM_SINGLE',
        targetedDeskIds: [picked.id],
        descriptionJa: `ラッキースター！ 出席 #${picked.label}`,
        descriptionEn: `Lucky Single Student: #${picked.label}!`
      };
    }
  }

  const fallback = standingDesks[0];
  return {
    axis: 'RANDOM_SINGLE',
    targetedDeskIds: [fallback.id],
    descriptionJa: `出席 #${fallback.label}`,
    descriptionEn: `Student #${fallback.label}`
  };
}

export function sampleVocabularyPrompt(
  primaryPool: VocabularyItem[],
  fallbackPool: VocabularyItem[]
): VocabularyItem {
  const sampled = sampleCards(primaryPool, 1, fallbackPool);
  return sampled[0];
}
