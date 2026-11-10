import os
import shutil
import zipfile

WORKSPACE_ROOT = os.path.abspath(".")
OUTPUT_DIR = os.path.join(WORKSPACE_ROOT, "math_game_txt_bundle")
ZIP_PATH = os.path.join(WORKSPACE_ROOT, "math_game_code_for_ai_studio.zip")

# List of all files related to the Math Game implementation
FILES_TO_BUNDLE = [
    # Core Math & Generation Engine
    ("src/games/quiz/mathGenerator.ts", "01_mathGenerator.ts.txt", "Core MEXT math procedural question generation engine (G1-G6)"),
    ("src/games/quiz/mathTypes.ts", "02_mathTypes.ts.txt", "TypeScript interfaces, MEXT grade metadata, and curriculum domain definitions"),
    ("src/games/quiz/types.ts", "03_quiz_types.ts.txt", "Shared quiz models, question structure, room states, and game modes"),
    ("src/games/quiz/useQuizRoom.ts", "04_useQuizRoom_networking.ts.txt", "Firebase Realtime Database live room synchronization & lifecycle"),
    ("src/games/quiz/core/quizEngine.ts", "05_quizEngine_scoring.ts.txt", "Scoring strategies, streaks, analytics computation, and trouble question aggregation"),
    ("src/games/quiz/awardsEngine.ts", "06_awardsEngine.ts.txt", "End-of-game classroom achievement awards computation"),

    # Host Screen (Front TV / Smartboard / Projector)
    ("src/games/quiz/host/QuizHostSetup.tsx", "07_QuizHostSetup.tsx.txt", "Teacher game setup UI with Subject Switcher (English vs Math), Grade tabs, and Domain filters"),
    ("src/games/quiz/host/QuizHostContainer.tsx", "08_QuizHostContainer.tsx.txt", "Host state controller managing game step transitions, play-again, and rematches"),
    ("src/games/quiz/host/QuizHostLobby.tsx", "09_QuizHostLobby.tsx.txt", "Host lobby waiting room with room PIN, math curriculum badge, and student roster"),
    ("src/games/quiz/host/QuizHostQuestion.tsx", "10_QuizHostQuestion.tsx.txt", "Host cinema presentation of math question formula, timer, and 4-choice grid"),
    ("src/games/quiz/host/QuizHostReveal.tsx", "11_QuizHostReveal.tsx.txt", "Host answer reveal screen displaying question, correct answer, and student score changes"),
    ("src/games/quiz/host/QuizHostLeaderboard.tsx", "12_QuizHostLeaderboard.tsx.txt", "Intermission leaderboard showing top ranks and hot streaks"),
    ("src/games/quiz/host/QuizHostGameOver.tsx", "13_QuizHostGameOver.tsx.txt", "End of game podium celebration, classroom awards, and trouble-question review"),
    ("src/games/quiz/host/QuizHostSprint.tsx", "14_QuizHostSprint.tsx.txt", "Host F1 Sprint speed race leaderboard and progress tracking"),
    ("src/games/quiz/host/QuizHostGrandPrix3D.tsx", "15_QuizHostGrandPrix3D.tsx.txt", "Host 3D Suzuka Grand Prix circuit view driven by math answers"),
    ("src/games/quiz/host/QuizHostTugOfWar.tsx", "16_QuizHostTugOfWar.tsx.txt", "Host Red vs White Tug of War rope battle driven by class math accuracy"),
    ("src/games/quiz/host/QuizHostVolleyball.tsx", "17_QuizHostVolleyball.tsx.txt", "Host Volleyball / Tamaire rally stage powered by student arithmetic answers"),

    # Student Screen (1:1 Student iPads / Touch Devices)
    ("src/games/quiz/student/QuizStudentContainer.tsx", "18_QuizStudentContainer.tsx.txt", "Student iPad root container & route switcher"),
    ("src/games/quiz/student/QuizStudentLobby.tsx", "19_QuizStudentLobby.tsx.txt", "Student iPad lobby while waiting for the teacher to start the quiz"),
    ("src/games/quiz/student/QuizStudentQuestion.tsx", "20_QuizStudentQuestion.tsx.txt", "Student iPad answering UI (EYES_UP shape symbols & MIRRORED formula cards)"),
    ("src/games/quiz/student/QuizStudentFeedback.tsx", "21_QuizStudentFeedback.tsx.txt", "Student iPad instant post-question feedback and streak rewards"),
    ("src/games/quiz/student/QuizStudentSprint.tsx", "22_QuizStudentSprint.tsx.txt", "Student iPad Sprint race answering screen with 2.5s Pit Stop penalty"),
    ("src/games/quiz/student/QuizStudentGrandPrix3D.tsx", "23_QuizStudentGrandPrix3D.tsx.txt", "Student iPad 3D kart cockpit gameplay"),
    ("src/games/quiz/student/QuizStudentTugOfWar.tsx", "24_QuizStudentTugOfWar.tsx.txt", "Student iPad Tug of War team pull screen"),
    ("src/games/quiz/student/QuizStudentVolleyball.tsx", "25_QuizStudentVolleyball.tsx.txt", "Student iPad Volleyball / Tamaire bean bag toss screen"),
    ("src/games/quiz/student/QuizStudentGameOver.tsx", "26_QuizStudentGameOver.tsx.txt", "Student iPad final game summary, XP gain, and personal results"),
]

AI_STUDIO_PROMPT = """# 📐 GOOGLE AI STUDIO CODE REVIEW: ELEMENTARY MATHEMATICS (算数) ENGINE

## 1. Project Background
You are reviewing the Elementary Mathematics (算数) procedural quiz engine built for the Levi-Sensei classroom multiplayer platform. 
The platform was originally created for elementary school English vocabulary and 40-student live classroom battles (Kahoot-style, 3D Suzuka Grand Prix, F1 Sprint, Tug-of-War, and Volleyball).

To demonstrate that the interactive multiplayer architecture is completely content-agnostic, we integrated an algorithmic Elementary Mathematics engine that generates an endless stream of grade-calibrated questions across all 6 grades without requiring static JSON databases or image downloads.

## 2. Curriculum Reference
The question generators adhere strictly to the authoritative Japanese Ministry of Education, Culture, Sports, Science and Technology (MEXT / 文部科学省) Course of Study for Elementary Mathematics across all 4 core curriculum domains:
- **Domain A: 数と計算 (Numbers and Calculations)**: Whole numbers, column arithmetic, 9x9 Ku-ku multiplication, division with remainders, decimals, fractions (like & unlike denominators, mixed fractions, reciprocal division).
- **Domain B: 量と測定 (Quantities and Measurements)**: Units of length (m, cm, mm), volume (L, dL, mL), weight (g, kg, t), time (elapsed time across hours), area (rectangles, squares, triangles, trapezoids, rhombi, a, ha, km²), circle circumference and area (pi = 3.14), speed/distance/time conversions (km/h <-> m/min <-> m/s).
- **Domain C: 図形 (Geometrical Figures)**: 2D polygons, right triangles, quadrilaterals (parallelograms, trapezoids, rhombi), circle radius/diameter/spheres, line symmetry & point symmetry.
- **Domain D: 数量関係 (Mathematical Relations)**: Order of operations with parentheses (PEMDAS), percentages and buai (割・分・厘), ratio simplification and proportional distribution, permutations and combinations.

## 3. Pedagogical Distractor Engineering
Multiple-choice mathematics is only effective if wrong answers model authentic student misconceptions and careless mistakes rather than random numbers. The generators in `01_mathGenerator.ts.txt` specifically engineer traps:
- Adding denominators directly in fractions: 1/2 + 1/3 -> 2/5
- Neglecting operator precedence: 15 + 5 * 4 -> 80 instead of 35
- Forgetting to divide by 2 in triangle area: 8 * 6 = 48 cm² instead of 24 cm²
- Confusing radius and diameter in circle area: r^2 * pi vs d^2 * pi vs 2 * r * pi
- Unit conversions without proper scaling: 72 km/h -> 720 m/min instead of 1200 m/min

## 4. Key Review Questions for You (The AI Reviewer)
Please perform a deep, comprehensive review of the code files provided:
1. **Mathematical Accuracy & Edge Cases**:
   - Are all mathematical derivations, algorithms (GCD, LCM, fractions), and formulas 100% exact?
   - Are there any edge cases (e.g. division by zero, non-positive denominators, remainder >= divisor, rounding edge cases) that need tightening?
2. **Japanese MEXT Curriculum Fidelity**:
   - Does the grade-by-grade topic distribution (G1 to G6) accurately match the authentic Japanese elementary progression?
   - Are the Japanese mathematical terms, notations (e.g. 7 あまり 1, 割・分・厘, 筆算), and furigana appropriate for each grade level?
3. **Pedagogical Distractor Quality**:
   - Are the distractors challenging and realistic for elementary students?
   - Can you suggest additional common student misconception traps for any of the 48 topics?
4. **Code Architecture & Clean Code**:
   - Evaluate the TypeScript types, state management, and separation of concerns between `mathGenerator.ts`, `QuizHostSetup.tsx`, and `QuizHostContainer.tsx`.
   - Are there opportunities for performance optimization, better modularity, or cleaner abstractions?
5. **Creative Classroom Gameplay Opportunities**:
   - What additional interactive math formats or visual aids (e.g. number lines, fraction bars, 2D geometry canvases) would enhance classroom engagement?
"""

def main():
    print(f"Preparing Math Game TXT Bundle in: {OUTPUT_DIR}")
    
    # Clean output directory
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 1. Write the AI Studio Prompt
    prompt_file = os.path.join(OUTPUT_DIR, "00_AI_STUDIO_PROMPT_TEMPLATE.txt")
    with open(prompt_file, "w", encoding="utf-8") as f:
        f.write(AI_STUDIO_PROMPT)
    print(f"Created: 00_AI_STUDIO_PROMPT_TEMPLATE.txt")

    # 2. Copy and convert each source file to .txt
    manifest_entries = []
    
    for rel_path, txt_name, description in FILES_TO_BUNDLE:
        src_path = os.path.join(WORKSPACE_ROOT, rel_path)
        dest_path = os.path.join(OUTPUT_DIR, txt_name)
        
        if not os.path.exists(src_path):
            print(f"[ERROR] Source file missing: {src_path}")
            continue
            
        with open(src_path, "r", encoding="utf-8", errors="replace") as sf:
            content = sf.read()
            
        header = f"""// ============================================================================
// FILE: {txt_name}
// ORIGINAL PATH: {rel_path}
// PURPOSE: {description}
// LEVI-SENSEI PLATFORM - ELEMENTARY MATHEMATICS (算数)
// ============================================================================

"""
        with open(dest_path, "w", encoding="utf-8") as df:
            df.write(header + content)
            
        size_kb = os.path.getsize(dest_path) / 1024
        print(f"Bundled [{size_kb:6.1f} KB]: {txt_name} <- {rel_path}")
        manifest_entries.append((txt_name, rel_path, description, size_kb))

    # 3. Create a README index in the bundle
    index_file = os.path.join(OUTPUT_DIR, "INDEX.txt")
    with open(index_file, "w", encoding="utf-8") as f:
        f.write("LEVI-SENSEI PLATFORM - ELEMENTARY MATHEMATICS REVIEW BUNDLE\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Total Files Bundled: {len(manifest_entries) + 1}\n\n")
        f.write(f"{'TXT Filename':<35} {'Size':<10} {'Original Path':<40}\n")
        f.write("-" * 85 + "\n")
        for txt_name, rel_path, desc, size_kb in manifest_entries:
            f.write(f"{txt_name:<35} {size_kb:6.1f} KB  {rel_path:<40}\n")
        f.write("\n" + "=" * 70 + "\n")

    # 4. Create the ZIP archive
    print(f"\nCompressing into ZIP archive: {ZIP_PATH}")
    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)

    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(OUTPUT_DIR):
            for file in sorted(files):
                full_path = os.path.join(root, file)
                arcname = file  # Store flat in the root of the zip archive for instant AI Studio drag & drop
                zipf.write(full_path, arcname=arcname)
                
    zip_size_mb = os.path.getsize(ZIP_PATH) / (1024 * 1024)
    print(f"\n[SUCCESS] ZIP created successfully: {ZIP_PATH} ({zip_size_mb:.2f} MB)")
    print(f"Total files in bundle: {len(os.listdir(OUTPUT_DIR))}")

if __name__ == "__main__":
    main()
