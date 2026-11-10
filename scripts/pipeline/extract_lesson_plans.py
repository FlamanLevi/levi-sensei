import os
import sys
import json
import re
import pymupdf

# Ensure stdout uses UTF-8 to prevent Windows cp1252 errors
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LESSONS_DIR = os.path.join(BASE_DIR, "Next Week Web Lesson Plans")
OUTPUT_DIR = os.path.join(BASE_DIR, "extracted_lesson_plans")
COMBINED_TXT_DIR = os.path.join(OUTPUT_DIR, "combined_text")
INDIVIDUAL_TXT_DIR = os.path.join(OUTPUT_DIR, "individual_lessons_text")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(COMBINED_TXT_DIR, exist_ok=True)
os.makedirs(INDIVIDUAL_TXT_DIR, exist_ok=True)

print("=" * 60)
print("LEVI-SENSEI BORDERLINK LESSON PLAN EXTRACTOR")
print("=" * 60)

# ----------------------------------------------------
# 1. Extract Full-Text of Combined PDF Booklets
# ----------------------------------------------------
combined_dir = os.path.join(LESSONS_DIR, "Combined")
if os.path.exists(combined_dir):
    print("\n[1/3] Extracting Combined Mega-Booklets...")
    for fname in sorted(os.listdir(combined_dir)):
        if fname.lower().endswith(".pdf"):
            src_pdf = os.path.join(combined_dir, fname)
            out_txt_name = os.path.splitext(fname)[0] + ".txt"
            out_txt_path = os.path.join(COMBINED_TXT_DIR, out_txt_name)
            if os.path.exists(out_txt_path):
                print(f"  ✓ Already extracted '{fname}' (skipping)")
                continue
            try:
                doc = pymupdf.open(src_pdf)
                total_pages = len(doc)
                with open(out_txt_path, "w", encoding="utf-8") as f_out:
                    for p_num, page in enumerate(doc):
                        f_out.write(f"\n--- PAGE {p_num + 1} / {total_pages} ---\n")
                        f_out.write(page.get_text())
                print(f"  ✓ Extracted '{fname}' ({total_pages} pages)")
            except Exception as e:
                print(f"  ✗ Error extracting {fname}: {e}")
else:
    print(f"Combined dir not found at {combined_dir}")

# ----------------------------------------------------
# 2. Extract & Parse Structured Individual Lesson Plans
# ----------------------------------------------------
print("\n[2/3] Parsing Structured Lesson Plans across Grade Folders...")

parsed_lessons = []
grade_vocab_bank = {}

GRADE_FOLDERS = [
    ("ES_G1", "04. 小学校 ES 小学1年生 Grade 1"),
    ("ES_G2", "05. 小学校 ES 小学2年生 Grade 2"),
    ("ES_G3", "06. 小学校 ES 小学3年生 Grade 3"),
    ("ES_G4", "07. 小学校 ES 小学4年生 Grade 4"),
    ("ES_G5", "08. 小学校 ES 小学5年生 Grade 5"),
    ("ES_G6", "09. 小学校 ES 小学6年生 Grade 6"),
    ("KD_3yo", "01. 未就学児 KD 年少 3 years old"),
    ("KD_4yo", "02. 未就学児 KD 年中 4 years old"),
    ("KD_5yo", "03. 未就学児 KD 年長 5 years old"),
    ("JHS_G1", "10. 中学校 JHS 中学1年生 Grade 1"),
    ("JHS_G2", "11. 中学校 JHS 中学2年生 Grade 2"),
    ("JHS_G3", "12. 中学校 JHS 中学3年生 Grade 3")
]

def clean_extracted_field(val):
    if not val:
        return ""
    val = val.strip()
    val = re.sub(r'\s+', ' ', val)
    return val

for grade_tag, folder_name in GRADE_FOLDERS:
    folder_path = os.path.join(LESSONS_DIR, folder_name)
    if not os.path.exists(folder_path):
        continue

    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".pdf")]
    lesson_files = [f for f in files if "lesson" in f.lower() or "tableofcontents" in f.lower()]
    
    print(f"  Scanning {grade_tag} ({len(files)} total files, {len(lesson_files)} lesson plans)...")
    
    grade_vocab_bank[grade_tag] = {}

    for fname in sorted(files):
        pdf_path = os.path.join(folder_path, fname)
        txt_sub_dir = os.path.join(INDIVIDUAL_TXT_DIR, grade_tag)
        os.makedirs(txt_sub_dir, exist_ok=True)
        txt_out_path = os.path.join(txt_sub_dir, os.path.splitext(fname)[0] + ".txt")
        
        try:
            doc = pymupdf.open(pdf_path)
            full_text = ""
            for p in doc:
                full_text += p.get_text() + "\n"
            
            with open(txt_out_path, "w", encoding="utf-8") as f_txt:
                f_txt.write(full_text)
                
            # If it's a lesson plan, parse structured data
            is_english_plan = fname.startswith("EN_") or "Lesson" in fname or "Grade" in fname
            if is_english_plan and "worksheet" not in fname.lower() and "bingo" not in fname.lower() and "search" not in fname.lower():
                # Flexible regex patterns
                theme_match = re.search(r'Theme:\s*([^\n\r]+)', full_text)
                
                # Check Target vocab, Vocabulary, or Target Language
                vocab_match = re.search(r'(?:Target vocab(?:/language)?|Vocabulary):\s*([^\n\r]+)', full_text, re.IGNORECASE)
                target_lang_match = re.search(r'Target Language:\s*([^\n\r]+)', full_text, re.IGNORECASE)
                
                time_match = re.search(r'Time:\s*([^\n\r]+)', full_text)
                materials_match = re.search(r'Materials:\s*([^\n\r]+)', full_text)
                
                # Check textbook unit tags (e.g. LT1-Unit 3, HWG5, etc.)
                unit_tag_match = re.search(r'(LT\d-Unit\s*\d+|Unit\s*\d+)', full_text, re.IGNORECASE)
                
                # Extract lesson number from filename
                lesson_num_match = re.search(r'Lesson(\d+)', fname, re.IGNORECASE)
                lesson_num = int(lesson_num_match.group(1)) if lesson_num_match else None
                
                theme = clean_extracted_field(theme_match.group(1)) if theme_match else ""
                vocab_raw = clean_extracted_field(vocab_match.group(1)) if vocab_match else ""
                target_lang = clean_extracted_field(target_lang_match.group(1)) if target_lang_match else ""
                materials = clean_extracted_field(materials_match.group(1)) if materials_match else ""
                unit_tag = clean_extracted_field(unit_tag_match.group(1)) if unit_tag_match else ""
                
                words = []
                # Combine vocabulary items
                combined_vocab_str = f"{vocab_raw} {target_lang}".strip()
                if combined_vocab_str:
                    raw_items = [w.strip() for w in re.split(r'[,/、;]+', combined_vocab_str) if w.strip()]
                    for item in raw_items:
                        # Clean item
                        item_clean = re.sub(r'[()（）\d.]+', '', item).strip()
                        if item_clean and len(item_clean) > 1 and not item_clean.lower().startswith("let's") and not item_clean.lower().startswith("procedure"):
                            words.append(item_clean)
                    
                    if theme:
                        if theme not in grade_vocab_bank[grade_tag]:
                            grade_vocab_bank[grade_tag][theme] = []
                        for w in words:
                            if w not in grade_vocab_bank[grade_tag][theme]:
                                grade_vocab_bank[grade_tag][theme].append(w)

                activities = []
                for act_match in re.finditer(r'(?:Practice \d+|Warm-up|Intro|Use|Game|Activity \d*):\s*([^\n\r]+)', full_text):
                    act_name = clean_extracted_field(act_match.group(1))
                    if act_name and act_name not in activities:
                        activities.append(act_name)
                        
                parsed_lessons.append({
                    "grade": grade_tag,
                    "lesson_number": lesson_num,
                    "unit_tag": unit_tag,
                    "filename": fname,
                    "theme": theme,
                    "target_vocab_raw": vocab_raw,
                    "target_language": target_lang,
                    "target_vocab_words": words,
                    "materials": materials,
                    "activities": activities,
                    "page_count": len(doc)
                })
        except Exception as e:
            pass

# ----------------------------------------------------
# 3. Save Structured Databases
# ----------------------------------------------------
print("\n[3/3] Saving JSON Databases & Summary...")

lessons_json_path = os.path.join(OUTPUT_DIR, "borderlink_lessons.json")
with open(lessons_json_path, "w", encoding="utf-8") as f_json:
    json.dump(parsed_lessons, f_json, ensure_ascii=False, indent=2)

vocab_json_path = os.path.join(OUTPUT_DIR, "borderlink_vocab_by_grade.json")
with open(vocab_json_path, "w", encoding="utf-8") as f_json:
    json.dump(grade_vocab_bank, f_json, ensure_ascii=False, indent=2)

print(f"  ✓ Saved {len(parsed_lessons)} parsed lessons to '{lessons_json_path}'")
print(f"  ✓ Saved Grade Vocabulary bank to '{vocab_json_path}'")

summary_path = os.path.join(OUTPUT_DIR, "EXTRACTION_REPORT.md")
with open(summary_path, "w", encoding="utf-8") as f_sum:
    f_sum.write("# Borderlink Lesson Plans Extraction Report\n\n")
    f_sum.write(f"- **Total Parsed Lessons:** {len(parsed_lessons)}\n")
    f_sum.write(f"- **Output Text Files in `combined_text/`:** {len(os.listdir(COMBINED_TXT_DIR))}\n\n")
    f_sum.write("## Vocabulary Extracted by Grade Level\n\n")
    for grade, themes in grade_vocab_bank.items():
        total_words = sum(len(w) for w in themes.values())
        f_sum.write(f"### {grade} ({len(themes)} themes, {total_words} unique words)\n\n")
        for th, words in themes.items():
            if words:
                f_sum.write(f"- **{th or 'General'}**: {', '.join(words)}\n")
        f_sum.write("\n")

print(f"  ✓ Saved Extraction Report to '{summary_path}'")
print("\nExtraction complete!")
