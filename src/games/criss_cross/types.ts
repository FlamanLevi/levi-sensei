export type SweepAxis = 'ROW' | 'COLUMN' | 'CRISS_CROSS' | 'RANDOM_SINGLE';

export type ClearRule = 'LINE_CLEARS' | 'SINGLE_CLEARS';

export type DeskStatus = 'STANDING' | 'SEATED' | 'EMPTY';

export type AisleLayout = 'PAIRED' | 'SINGLE';

export interface DeskState {
  id: string;
  row: number;    // 0 to rows - 1
  col: number;    // 0 to cols - 1
  label: string;  // e.g. "R1-C1" or "#1"
  status: DeskStatus;
}

export type CrissCrossPhase =
  | 'IDLE_GRID'       // Ready to sweep
  | 'SWEEPING'        // Laser sweeping across rows/cols with sound effects
  | 'QUESTION_ACTIVE' // Line selected, question prompt on screen
  | 'CELEBRATING_SIT' // Students sitting down with fanfare
  | 'ALL_CLEARED';    // All students seated! Victory!

export interface CrissCrossConfig {
  rows: number; // typically 5 or 6
  cols: number; // typically 5 or 6
  axisMode: 'RANDOM_MIX' | 'ROW_ONLY' | 'COL_ONLY' | 'CRISS_CROSS_ONLY';
  clearRule: ClearRule;
}
