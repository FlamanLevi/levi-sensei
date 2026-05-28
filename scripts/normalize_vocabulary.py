import json
import re
from collections import defaultdict
import os

input_file = r'C:\Users\levif\Documents\Borderlink\Github\levi-sensei\src\data\flat_vocabulary.json'
output_file = r'C:\Users\levif\Documents\Borderlink\Github\levi-sensei\src\data\normalized_vocabulary.json'

def parse_unit_id(unit_id):
    # e.g., "grade5_unit25"
    match = re.match(r'grade(\d+)_unit(\d+)', unit_id)
    if match:
        return int(match.group(1)), int(match.group(2))
    return 0, 0

def normalize_vocabulary():
    print(f"Reading from: {input_file}")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to read input file: {e}")
        return
        
    words = data.get('words', [])
    grades = data.get('grades', [])
    units = data.get('units', [])
    
    print(f"Found {len(words)} word instances. Normalizing...")
    entities = {}
    
    for word in words:
        en = word.get('en')
        if not en:
            continue
            
        unit_id = word.get('unit_id', '')
        grade_num, unit_num = parse_unit_id(unit_id)
        
        if en not in entities:
            # Initialize new entity
            entities[en] = {
                "id": f"vocab_{en.replace(' ', '_').replace('-', '_').lower()}",
                "en": en,
                "tags": set(word.get('tags', [])),
                "target_curriculum": defaultdict(list),
                "highest_grade": grade_num,
                # Store original data to merge carefully
                "ja_kanji": word.get('ja_kanji'),
                "ja_hiragana": word.get('ja_hiragana'),
                "en_katakana": word.get('en_katakana'),
                "img_path": word.get('img_path'),
                "part_of_speech": word.get('part_of_speech'),
                "audio_lang": word.get('audio_lang')
            }
            if grade_num > 0:
                entities[en]["target_curriculum"][f"grade{grade_num}"].append(unit_num)
        else:
            entity = entities[en]
            
            # Merge curriculum
            if grade_num > 0:
                grade_key = f"grade{grade_num}"
                if unit_num not in entity["target_curriculum"][grade_key]:
                    entity["target_curriculum"][grade_key].append(unit_num)
                    
            # Merge tags
            if word.get('tags'):
                entity["tags"].update(word['tags'])
                
            # Merge metadata (prefer higher grade)
            is_higher_grade = grade_num > entity["highest_grade"]
            
            fields_to_merge = ['ja_kanji', 'ja_hiragana', 'en_katakana', 'img_path', 'part_of_speech', 'audio_lang']
            for field in fields_to_merge:
                val = word.get(field)
                if val:
                    # If entity doesn't have it, or this is a higher grade and has a conflicting/better string
                    if not entity[field]:
                        entity[field] = val
                    elif is_higher_grade and entity[field] != val:
                        entity[field] = val
                        
            if is_higher_grade:
                entity["highest_grade"] = grade_num

    # Finalize format
    final_words = []
    for en, entity in entities.items():
        # Convert tags to sorted list
        entity["tags"] = sorted(list(entity["tags"]))
        
        # Format target_curriculum, sort units
        curriculum = {}
        # Sort by grade
        for grade in sorted(entity["target_curriculum"].keys(), key=lambda x: int(x.replace('grade', ''))):
            curriculum[grade] = sorted(entity["target_curriculum"][grade])
            
        entity["target_curriculum"] = curriculum
        
        # Clean up temporary highest_grade
        del entity["highest_grade"]
        
        # Remove empty fields
        for field in list(entity.keys()):
            if entity[field] is None:
                del entity[field]
                
        final_words.append(entity)
        
    # Create final output structure
    output_data = {
        "grades": grades,
        "units": units,
        "words": final_words
    }
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"Successfully normalized into {len(final_words)} unique entities.")
        print(f"Saved to: {output_file}")
    except Exception as e:
        print(f"Failed to save output file: {e}")

if __name__ == "__main__":
    normalize_vocabulary()
