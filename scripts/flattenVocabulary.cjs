const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/data/vocabulary.json');
const outputPath = path.join(__dirname, '../src/data/flat_vocabulary.json');

const rawData = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(rawData);

const grades = [];
const units = [];
const words = [];

// Clean empty strings helper
const cleanEmptyStrings = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== "") {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Parse deeply nested JSON
for (const [gradeId, gradeObj] of Object.entries(data)) {
  // Push Grade
  grades.push({
    id: gradeId,
    name_en: gradeObj.name_en,
    name_ja: gradeObj.name_ja
  });

  if (gradeObj.units) {
    for (const [unitId, unitObj] of Object.entries(gradeObj.units)) {
      const flatUnitId = `${gradeId}_${unitId}`;
      
      // Phase 2: Curriculum Enrichment Hooks (target_sentences)
      units.push({
        id: flatUnitId,
        grade_id: gradeId,
        name_en: unitObj.name_en,
        name_ja: unitObj.name_ja,
        target_sentences: [] // Hook for future grammar ties
      });

      if (unitObj.words && Array.isArray(unitObj.words)) {
        for (const wordObj of unitObj.words) {
          // Add flat unit ID
          const newWord = {
            ...wordObj,
            unit_id: flatUnitId
          };
          // Phase 1 Cleanup: Remove empty strings
          words.push(cleanEmptyStrings(newWord));
        }
      }
    }
  }
}

const flatDb = {
  grades,
  units,
  words
};

fs.writeFileSync(outputPath, JSON.stringify(flatDb, null, 2), 'utf8');
console.log(`Successfully flattened vocabulary!`);
console.log(`- ${grades.length} Grades`);
console.log(`- ${units.length} Units`);
console.log(`- ${words.length} Words`);
