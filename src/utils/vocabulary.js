/**
 * Helper utility to determine if a normalized vocabulary word belongs to a specific unit.
 * 
 * @param {Object} word - The vocabulary word object containing target_curriculum.
 * @param {string} unitId - The unit ID string, formatted as "{grade_id}_unit{number}" (e.g., "grade5_unit3").
 * @returns {boolean} True if the word is taught in the given unit.
 */
export const isWordInUnit = (word, unitId) => {
  if (!word || !word.target_curriculum || !unitId) return false;
  
  const match = unitId.match(/^(grade\d+)_unit(\d+)$/);
  if (!match) return false;
  
  const gradeKey = match[1];
  const unitNum = parseInt(match[2], 10);
  
  return Array.isArray(word.target_curriculum[gradeKey]) && word.target_curriculum[gradeKey].includes(unitNum);
};
