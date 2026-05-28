const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../src/data/flat_vocabulary.json');
const outputFile = path.join(__dirname, '../src/data/normalized_vocabulary.json');

function parseUnitId(unitId) {
    const match = unitId.match(/grade(\d+)_unit(\d+)/);
    if (match) {
        return {
            gradeNum: parseInt(match[1], 10),
            unitNum: parseInt(match[2], 10)
        };
    }
    return { gradeNum: 0, unitNum: 0 };
}

function normalizeVocabulary() {
    console.log(`Reading from: ${inputFile}`);
    let data;
    try {
        const rawData = fs.readFileSync(inputFile, 'utf-8');
        data = JSON.parse(rawData);
    } catch (e) {
        console.error(`Failed to read input file: ${e.message}`);
        return;
    }

    const words = data.words || [];
    const grades = data.grades || [];
    const units = data.units || [];

    console.log(`Found ${words.length} word instances. Normalizing...`);
    const entities = {};

    for (const word of words) {
        const en = word.en;
        if (!en) continue;

        const unitId = word.unit_id || '';
        const { gradeNum, unitNum } = parseUnitId(unitId);

        if (!entities[en]) {
            // Initialize new entity
            entities[en] = {
                id: `vocab_${en.replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase()}`,
                en: en,
                tags: new Set(word.tags || []),
                target_curriculum: {},
                highest_grade: gradeNum,
                ja_kanji: word.ja_kanji,
                ja_hiragana: word.ja_hiragana,
                en_katakana: word.en_katakana,
                img_path: word.img_path,
                part_of_speech: word.part_of_speech,
                audio_lang: word.audio_lang
            };
            if (gradeNum > 0) {
                entities[en].target_curriculum[`grade${gradeNum}`] = [unitNum];
            }
        } else {
            const entity = entities[en];

            // Merge curriculum
            if (gradeNum > 0) {
                const gradeKey = `grade${gradeNum}`;
                if (!entity.target_curriculum[gradeKey]) {
                    entity.target_curriculum[gradeKey] = [];
                }
                if (!entity.target_curriculum[gradeKey].includes(unitNum)) {
                    entity.target_curriculum[gradeKey].push(unitNum);
                }
            }

            // Merge tags
            if (word.tags) {
                for (const tag of word.tags) {
                    entity.tags.add(tag);
                }
            }

            // Merge metadata (prefer higher grade)
            const isHigherGrade = gradeNum > entity.highest_grade;
            const fieldsToMerge = ['ja_kanji', 'ja_hiragana', 'en_katakana', 'img_path', 'part_of_speech', 'audio_lang'];
            
            for (const field of fieldsToMerge) {
                const val = word[field];
                if (val) {
                    if (!entity[field]) {
                        entity[field] = val;
                    } else if (isHigherGrade && entity[field] !== val) {
                        entity[field] = val;
                    }
                }
            }

            if (isHigherGrade) {
                entity.highest_grade = gradeNum;
            }
        }
    }

    // Finalize format
    const finalWords = [];
    for (const [en, entity] of Object.entries(entities)) {
        // Convert tags to sorted array
        entity.tags = Array.from(entity.tags).sort();

        // Sort target_curriculum keys and values
        const sortedCurriculum = {};
        const gradeKeys = Object.keys(entity.target_curriculum).sort((a, b) => {
            return parseInt(a.replace('grade', '')) - parseInt(b.replace('grade', ''));
        });

        for (const grade of gradeKeys) {
            sortedCurriculum[grade] = entity.target_curriculum[grade].sort((a, b) => a - b);
        }
        entity.target_curriculum = sortedCurriculum;

        // Clean up temporary highest_grade
        delete entity.highest_grade;

        // Remove empty or undefined fields
        for (const field in entity) {
            if (entity[field] === undefined || entity[field] === null) {
                delete entity[field];
            }
        }

        finalWords.push(entity);
    }

    // Create final output structure
    const outputData = {
        grades: grades,
        units: units,
        words: finalWords
    };

    try {
        fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf-8');
        console.log(`Successfully normalized into ${finalWords.length} unique entities.`);
        console.log(`Saved to: ${outputFile}`);
    } catch (e) {
        console.error(`Failed to save output file: ${e.message}`);
    }
}

normalizeVocabulary();
