const fs = require('fs');
const path = require('path');

const vocabFile = path.join(__dirname, '../src/data/normalized_vocabulary.json');

// Extracted vocabulary from Let's Try 1 (Grade 3) and Let's Try 2 (Grade 4)
const extractedData = [
  // Grade 3 (Let's Try 1)
  { grade: 3, unit: 1, words: ["hello", "hi", "goodbye", "see you", "friend", "I", "am"] },
  { grade: 3, unit: 2, words: ["how", "are", "me", "and", "feeling", "fine", "happy", "good", "sleepy", "hungry", "tired", "sad", "great"] },
  { grade: 3, unit: 3, words: ["many", "counter", "ball", "pencil", "eraser", "ruler", "crayon", "apple", "strawberry", "tomato", "circle", "triangle", "cross", "heart", "stroke", "yes", "no", "sorry", "that", "is", "right"] },
  { grade: 3, unit: 4, words: ["like", "do", "not", "don't", "too", "red", "blue", "green", "yellow", "pink", "black", "white", "orange", "purple", "brown", "soccer", "baseball", "basketball", "dodgeball", "swimming", "ice cream", "pudding", "milk", "orange juice", "onion", "green pepper", "cucumber", "carrot", "rainbow"] },
  { grade: 3, unit: 5, words: ["what", "color", "sport", "volleyball", "table tennis", "food", "hamburger", "pizza", "spaghetti", "steak", "salad", "cake", "noodle", "egg", "rice ball", "jam", "fruit", "grapes", "pineapple", "peach", "melon", "banana", "kiwi fruit", "lemon"] },
  { grade: 3, unit: 6, words: ["the", "card", "alphabet", "please", "here", "thank", "welcome", "book", "drum", "fish", "gorilla", "hat", "ink", "jet", "king", "monkey", "notebook", "pig", "queen", "rabbit", "sun", "tree", "umbrella", "violin", "watch", "box", "yacht"] },
  { grade: 3, unit: 7, words: ["want", "this", "a", "for", "big", "small", "square", "rectangle", "star", "diamond", "bus", "flower", "shop", "balloon", "house", "car", "candy", "dog", "cat", "panda", "mouse", "bear"] },
  { grade: 3, unit: 8, words: ["it", "sea", "elephant", "horse", "spider"] },
  { grade: 3, unit: 9, words: ["who", "cow", "dragon", "snake", "tiger", "sheep", "chicken", "wild boar", "long", "shiny", "scary", "round", "furry", "head", "eyes", "ears", "nose", "mouth", "shoulders", "knees", "toes"] },
  
  // Grade 4 (Let's Try 2)
  { grade: 4, unit: 1, words: ["morning", "afternoon", "night", "world"] },
  { grade: 4, unit: 2, words: ["weather", "sunny", "rainy", "cloudy", "snowy", "hot", "cold", "stand", "sit", "stop", "jump", "turn", "walk", "run", "look", "put", "touch", "play", "up", "down", "on", "around", "left", "let's", "today", "hand", "leg", "tag", "jump rope", "bingo", "game", "outside", "inside", "shirt", "shorts", "sweater", "pants", "boots", "cap"] },
  { grade: 4, unit: 3, words: ["day", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "mushroom", "watermelon", "soup", "pie", "sandwich", "fresh"] },
  { grade: 4, unit: 4, words: ["a.m.", "p.m.", "about", "wake-up", "breakfast", "study", "lunch", "snack", "dinner", "homework", "TV", "bath", "bed", "dream", "time"] },
  { grade: 4, unit: 5, words: ["glue stick", "scissors", "pen", "stapler", "magnet", "marker", "pencil sharpener", "pencil case", "desk", "chair", "clock", "calendar"] },
  { grade: 4, unit: 6, words: ["letter", "try", "again", "bookstore", "juice", "news", "school", "station", "taxi", "telephone"] },
  { grade: 4, unit: 7, words: ["potato", "cabbage", "corn", "cherry", "sausage"] },
  { grade: 4, unit: 8, words: ["favorite", "place", "my", "our", "go", "why", "straight", "classroom", "restroom", "science room", "music room", "arts and crafts room", "computer room", "cooking room", "school nurse's office", "school principal's office", "teachers' office", "entrance", "library", "gym", "playground"] },
  { grade: 4, unit: 9, words: ["wash my face", "go to school", "go home", "brush my teeth", "put away my futon", "check my school bag", "leave my house", "take out the garbage", "everything", "later", "boy", "girl", "yummy", "wonderful"] }
];

function mergeVocabulary() {
    console.log(`Reading from: ${vocabFile}`);
    let data;
    try {
        data = JSON.parse(fs.readFileSync(vocabFile, 'utf-8'));
    } catch (e) {
        console.error(`Failed to read vocabulary file: ${e.message}`);
        return;
    }

    const words = data.words || [];
    
    // Create a map for quick lookup
    const wordMap = new Map();
    words.forEach(w => {
        wordMap.set(w.en.toLowerCase(), w);
    });

    let newWordsAdded = 0;
    let existingWordsUpdated = 0;

    extractedData.forEach(batch => {
        const gradeKey = `grade${batch.grade}`;
        
        batch.words.forEach(wordStr => {
            const enKey = wordStr.toLowerCase();
            
            if (wordMap.has(enKey)) {
                // Update existing
                const entity = wordMap.get(enKey);
                if (!entity.target_curriculum) entity.target_curriculum = {};
                if (!entity.target_curriculum[gradeKey]) entity.target_curriculum[gradeKey] = [];
                
                if (!entity.target_curriculum[gradeKey].includes(batch.unit)) {
                    entity.target_curriculum[gradeKey].push(batch.unit);
                    entity.target_curriculum[gradeKey].sort((a, b) => a - b);
                    existingWordsUpdated++;
                }
            } else {
                // Create new
                const newId = `vocab_${enKey.replace(/[^a-z0-9]/g, '_')}`;
                const newEntity = {
                    id: newId,
                    en: wordStr,
                    tags: [],
                    target_curriculum: {
                        [gradeKey]: [batch.unit]
                    }
                };
                words.push(newEntity);
                wordMap.set(enKey, newEntity);
                newWordsAdded++;
            }
        });
    });

    // Re-sort words alphabetically by English word just to keep it tidy
    words.sort((a, b) => a.en.localeCompare(b.en));
    data.words = words;

    try {
        fs.writeFileSync(vocabFile, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`Successfully merged Let's Try data!`);
        console.log(`Added ${newWordsAdded} new words.`);
        console.log(`Updated ${existingWordsUpdated} existing words with new curriculum mapping.`);
    } catch (e) {
        console.error(`Failed to save output file: ${e.message}`);
    }
}

mergeVocabulary();
