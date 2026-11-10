import os
import sys
import glob
import csv
import concurrent.futures
import numpy as np
import soundfile as sf
import librosa
from tabulate import tabulate

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Known vocal / lyric keywords to categorize appropriately
VOCAL_KEYWORDS = [
    "feat.", "vocal", "full spec", "karaoke", "singing", "lyrics", "cover",
    "last surprise", "rivers in the desert", "life will change", "wake up, get up",
    "whims of fate", "tokyo daylight", "beneath the mask", "take over", "colors flying high",
    "i believe", "throw away your mask", "no more what ifs", "daredevil", "you are stronger",
    "axe to grind", "counter strike", "towards a dream", "groove", "super eurobeat", "d selection",
    "vocal album"
]
EXEMPT_KEYWORDS = ["instrumental", "in-game ver", "remix", "tech trance", "arrange", "bgm", "ost", "backing track", "karaoke ver"]

# Functional arcade screen keywords (Menus, Entry, Tuning vs Podium, Results)
LOBBY_KEYWORDS = [
    "entry", "select", "course select", "menu", "garage", "tuning", 
    "the story starts here", "prologue", "lobby", "waiting", "setup", 
    "option", "character select", "mode select", "title"
]

PODIUM_KEYWORDS = [
    "result", "ranking", "ending", "victory", "triumph", "winner", 
    "staff roll", "credit", "ceremony", "congratulation"
]

# Cutscene, somber narrative, and non-gameplay keywords to eliminate
NARRATIVE_KEYWORDS = [
    "suspicion", "interrogation", "tragedy", "conspiracy", "sadness", "memory", 
    "game over", "crisis", "quiet", "conversation", "event", "cinema", "banter", 
    "cutscene", "epilogue", "defeat", "sorrow", "darkness", "dungeon", 
    "depressive", "funeral", "grave", "loss", "gloom", "investigation", "mystery"
]

# Krumhansl-Schmuckler Key Profiles for Tonal Harmony Analysis
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

def analyze_single_track(file_path: str) -> dict:
    filename = os.path.basename(file_path)
    parent_folder = os.path.basename(os.path.dirname(file_path))
    clean_title = os.path.splitext(filename)[0]
    title_lower = clean_title.lower()

    try:
        # 1. Full Duration from metadata (instant)
        info = sf.info(file_path)
        full_dur = info.duration
        mins = int(full_dur // 60)
        secs = int(full_dur % 60)
        duration_str = f"{mins}:{secs:02d}"

        # Reject jingles (<45s) and sprawling ambient background (>8m)
        if full_dur < 45 or full_dur > 480:
            return {"error": f"Duration out of bounds ({duration_str})", "filename": filename}

        # 2. Deep Audio Sampling: First 240 seconds (4 full minutes) covering entire classroom quiz lifecycle
        load_dur = min(240.0, full_dur)
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=load_dur)
    except Exception as e:
        return {"error": str(e), "filename": filename}

    # 3. Tempo / BPM
    try:
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = round(float(np.atleast_1d(tempo)[0]), 1)
    except Exception:
        bpm = 120.0

    # 4. Harmonic-Percussive Source Separation (HPSS)
    try:
        y_harm, y_perc = librosa.effects.hpss(y)
        total_energy = float(np.sum(y**2)) + 1e-6
        perc_ratio = float(np.sum(y_perc**2)) / total_energy
    except Exception:
        perc_ratio = 0.4
        y_perc = y

    # 5. RMS Energy, Intro Punch & Lulls (Across entire 4-minute window)
    hop_length = 512
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    median_rms = float(np.median(rms)) if len(rms) > 0 else 0.1

    # Intro Punch Latency (seconds to 45% median energy)
    punch_threshold = median_rms * 0.45
    punch_indices = np.where(rms >= punch_threshold)[0]
    intro_punch = round(float(frame_times[punch_indices[0]]), 2) if len(punch_indices) > 0 else 0.0

    # Lulls (>3s drops below 25% median across entire 4 minutes)
    frame_dur = hop_length / sr
    min_lull_frames = int(3.0 / frame_dur)
    low_frames = rms < (median_rms * 0.25)
    lull_count = 0
    run = 0
    for is_low in low_frames:
        if is_low:
            run += 1
        else:
            if run >= min_lull_frames:
                lull_count += 1
            run = 0
    if run >= min_lull_frames:
        lull_count += 1

    # 6. Spectral Flatness (Harshness / Distortion vs Clean Tone)
    flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))

    # 7. Tonal Musical Harmony & Anti-Industrial (Krumhansl-Schmuckler correlation)
    try:
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_avg = np.mean(chroma, axis=1)
        maj_corrs = [np.corrcoef(chroma_avg, np.roll(MAJOR_PROFILE, i))[0, 1] for i in range(12)]
        min_corrs = [np.corrcoef(chroma_avg, np.roll(MINOR_PROFILE, i))[0, 1] for i in range(12)]
        tonal_strength = float(max(max(maj_corrs), max(min_corrs)))
    except Exception:
        tonal_strength = 0.50

    # 8. TV Speaker Bass Warmth (60Hz - 280Hz Foundation)
    stft = np.abs(librosa.stft(y, n_fft=1024, hop_length=hop_length))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=1024)
    bass_bins = (freqs >= 60) & (freqs <= 280)
    all_energy = float(np.sum(stft**2)) + 1e-6
    bass_ratio = float(np.sum(stft[bass_bins, :]**2)) / all_energy

    # 9. Dynamic Engagement & Anti-Monotony
    try:
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        dynamic_flux = float(np.std(onset_env))
    except Exception:
        dynamic_flux = 1.0

    # 10. Integrated Loudness (dBFS)
    avg_rms = float(np.sqrt(np.mean(y**2)))
    loudness_db = round(20 * np.log10(avg_rms + 1e-6), 1)

    # 11. Tail Silence & Seamless Loop Readiness Check (End 6 seconds)
    tail_dur = min(6.0, full_dur)
    tail_offset = max(0.0, full_dur - tail_dur)
    try:
        y_tail, _ = librosa.load(file_path, sr=22050, mono=True, offset=tail_offset, duration=tail_dur)
        tail_rms = librosa.feature.rms(y=y_tail, hop_length=512)[0]
        consec = 0
        for f in reversed(tail_rms):
            if f < 0.008:
                consec += 1
            else:
                break
        tail_silence = round((consec * 512) / 22050, 1)
    except Exception:
        tail_silence = 0.0

    # 12. Longest Drumless Breakdown Window
    try:
        perc_rms = librosa.feature.rms(y=y_perc, hop_length=1024)[0]
        perc_thresh = np.median(perc_rms) * 0.22
        breakdown_frames = perc_rms < perc_thresh
        max_consec = 0
        cur_consec = 0
        for b in breakdown_frames:
            if b:
                cur_consec += 1
                if cur_consec > max_consec:
                    max_consec = cur_consec
            else:
                cur_consec = 0
        longest_breakdown = round((max_consec * 1024) / sr, 1)
    except Exception:
        longest_breakdown = 0.0

    # ========================================================
    # ARCADE GAMEPLAY SCORING ENGINE (100 Points Max)
    # ========================================================

    # A. Arcade Drive & Rhythm (25 pts max)
    groove_score = 0
    if 118 <= bpm <= 165:
        groove_score += 15
    elif 100 <= bpm < 118 or 165 < bpm <= 175:
        groove_score += 8
    else:
        groove_score += 2

    if 0.30 <= perc_ratio <= 0.70:
        groove_score += 10
    elif 0.20 <= perc_ratio < 0.30 or 0.70 < perc_ratio <= 0.80:
        groove_score += 6
    else:
        groove_score += 2

    # B. Tonal Musical Harmony & Anti-Industrial (25 pts max)
    tonal_score = 0
    if tonal_strength >= 0.58:
        tonal_score = 25
    elif tonal_strength >= 0.48:
        tonal_score = 18
    elif tonal_strength >= 0.42:
        tonal_score = 10
    else:
        tonal_score = 0

    # C. TV Speaker Warmth & Audio Fidelity (20 pts max)
    tv_score = 0
    if bass_ratio >= 0.16:
        tv_score += 10
    elif bass_ratio >= 0.10:
        tv_score += 6
    else:
        tv_score += 2

    if flatness < 0.035:
        tv_score += 10
    elif flatness < 0.055:
        tv_score += 7
    elif flatness < 0.075:
        tv_score += 4
    else:
        tv_score += 1

    # D. Dynamic Variety & Anti-Monotony (15 pts max)
    dyn_score = 0
    if dynamic_flux >= 1.2:
        dyn_score = 15
    elif dynamic_flux >= 0.8:
        dyn_score = 10
    else:
        dyn_score = 4

    # E. Instant Intro Punch (15 pts max)
    punch_score = 0
    if intro_punch <= 0.5:
        punch_score = 15
    elif intro_punch <= 1.2:
        punch_score = 11
    elif intro_punch <= 2.2:
        punch_score = 6
    elif intro_punch <= 3.5:
        punch_score = 2
    else:
        punch_score = 0

    raw_score = groove_score + tonal_score + tv_score + dyn_score + punch_score

    # Penalties
    # 1. Industrial / Atonal Penalty (-25 pts)
    if tonal_strength < 0.40:
        raw_score -= 25

    # 2. Cutscene / Gloom Narrative Penalty (-25 pts)
    is_narrative = any(nk in title_lower for nk in NARRATIVE_KEYWORDS)
    if is_narrative:
        raw_score -= 25

    # 3. Mid-Game Lulls (>3s dead-air volume drop)
    if lull_count > 0:
        raw_score -= min(24, lull_count * 8)

    # 4. Long Drumless Breakdown Penalty (>15s dead air without beat)
    if longest_breakdown > 15.0:
        raw_score -= min(15, int((longest_breakdown - 15.0) * 1.5))

    # 5. Tail Silence Loop Penalty (>2.0s silence at track end)
    if tail_silence > 2.0:
        raw_score -= 6

    # 6. Low Volume Penalty (whisper tracks < -21 dBFS)
    if loudness_db < -21.0:
        raw_score -= 10

    final_score = max(10, min(100, raw_score))

    # Vocal Detection (Checking both track title and parent folder)
    title_and_album = f"{title_lower} {parent_folder.lower()}"
    is_vocal = any(vk in title_and_album for vk in VOCAL_KEYWORDS)
    is_exempt = any(ek in title_lower for ek in EXEMPT_KEYWORDS)
    has_vocals = is_vocal and not is_exempt

    # Functional Arcade Screen-Intent Check (Menus/Select vs Victory/Results)
    is_lobby = any(lk in title_lower for lk in LOBBY_KEYWORDS)
    is_podium = any(pk in title_lower for pk in PODIUM_KEYWORDS)

    # Category classification into 5 Master Profiles
    # STRICT INVARIANT: 🎷 Tactical Groove (MCQ) must be 100% INSTRUMENTAL ONLY.
    # Menu, entry, and story prologue tracks MUST route to ☕ Lobby. Results MUST route to 🏆 Podium.
    if final_score < 70 or intro_punch > 3.0 or tonal_strength < 0.40 or is_narrative:
        if tonal_strength < 0.40:
            category = "⚠️ Industrial / Atonal Noise"
        elif is_narrative:
            category = "⚠️ Story Cue / Cutscene Gloom"
        else:
            category = "⚠️ Needs Trim / Slow Intro"
    elif is_lobby:
        category = "☕ Lobby & Waiting Room"
    elif is_podium:
        category = "🏆 Victory Podium & Awards"
    elif has_vocals:
        if bpm >= 135:
            category = "🏎️ High-Speed Rush (Vocal Hype)"
        else:
            category = "🎤 Vocal Pop (Excluded from MCQ)"
    elif bpm >= 148 and dynamic_flux >= 1.2:
        category = "🔥 Boss Battle / Raid"
    elif bpm >= 138:
        category = "🏎️ High-Speed Rush (Instrumental)"
    elif bpm >= 130:
        category = "⚡ Blitz & Tension (Timed Rush)"
    elif bpm >= 118:
        category = "🎷 Tactical Groove (MCQ / Volleyball)"
    else:
        category = "☕ Lobby & Waiting Room"

    return {
        "file_path": file_path,
        "album": parent_folder,
        "title": clean_title,
        "duration": duration_str,
        "duration_sec": round(full_dur, 1),
        "bpm": bpm,
        "intro_punch": intro_punch,
        "perc_ratio": round(perc_ratio, 2),
        "flatness": round(flatness, 4),
        "lulls": lull_count,
        "loudness_db": loudness_db,
        "tail_silence": tail_silence,
        "breakdown_sec": longest_breakdown,
        "score": final_score,
        "category": category
    }

def run_stage2_clap_verification(results: list) -> list:
    """
    Stage 2: LAION-CLAP Neural Zero-Shot Verification
    Processes finalists (score >= 70, excluding obvious atonal noise or gloom).
    Validates instrumental purity, joy vs gloom, urgency vs calm, and arcade profile semantic fit.
    """
    try:
        import torch
        from transformers import AutoProcessor, ClapModel
    except ImportError:
        print("⚠️ transformers/torch not installed; skipping Stage 2 CLAP verification.")
        return results

    finalists = [
        r for r in results 
        if r["score"] >= 70 and not r["category"].startswith("⚠️ Industrial") and not r["category"].startswith("⚠️ Story Cue")
    ]
    
    if not finalists:
        return results

    print("\n" + "=" * 100)
    print(f"🧠 STAGE 2: LAION-CLAP NEURAL ZERO-SHOT VERIFICATION ({len(finalists)} finalists)")
    print("Evaluating: Instrumental Purity | Joy vs Gloom | Action vs Calm | Profile Semantic Alignment")
    print("=" * 100)

    model_id = "laion/clap-htsat-unfused"
    processor = AutoProcessor.from_pretrained(model_id)
    model = ClapModel.from_pretrained(model_id)
    model.eval()

    clap_queries = [
        "Kahoot style upbeat casual quiz game background music",
        "Tense suspenseful countdown timer music",
        "Epic intense boss battle soundtrack with heavy drums and guitars",
        "High speed fast arcade racing electronic eurobeat driving music",
        "Casual video game main menu lobby background music",
        "Celebratory energetic victory podium award ceremony music",
        "Pure instrumental background music with no vocals",
        "Song with human singing voice and vocal lyrics",
        "Happy, positive, uplifting mood",
        "Dark, sad, depressing, gloomy mood",
        "Intense, high energy, fast-paced action",
        "Calm, relaxing, slow ambient quiet music"
    ]

    inputs_text = processor(text=clap_queries, return_tensors="pt", padding=True)
    with torch.no_grad():
        text_out = model.get_text_features(**inputs_text)
        text_embeds = text_out.pooler_output
        text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)

    batch_size = 8
    total_finalists = len(finalists)

    for i in range(0, total_finalists, batch_size):
        chunk = finalists[i:i + batch_size]
        audios = []
        valid_items = []

        for item in chunk:
            p = item["file_path"]
            try:
                dur = item.get("duration_sec", 60.0)
                offset = max(0.0, (dur / 2.0) - 15.0)
                y, _ = librosa.load(p, sr=48000, offset=offset, duration=30.0)
                if len(y) < 48000 * 5:
                    continue
                audios.append(y)
                valid_items.append(item)
            except Exception:
                continue

        if not audios:
            continue

        try:
            inputs_audio = processor(audio=audios, sampling_rate=48000, return_tensors="pt", padding=True)
            with torch.no_grad():
                audio_out = model.get_audio_features(**inputs_audio)
                audio_embeds = audio_out.pooler_output
                audio_embeds = audio_embeds / audio_embeds.norm(dim=-1, keepdim=True)
                sims = (audio_embeds @ text_embeds.T).tolist()

            for item, scores in zip(valid_items, sims):
                res = dict(zip(clap_queries, [round(s, 3) for s in scores]))

                val = round(res["Happy, positive, uplifting mood"] - res["Dark, sad, depressing, gloomy mood"], 3)
                aro = round(res["Intense, high energy, fast-paced action"] - res["Calm, relaxing, slow ambient quiet music"], 3)
                inst_bias = round(res["Pure instrumental background music with no vocals"] - res["Song with human singing voice and vocal lyrics"], 3)

                quiz_sim = res["Kahoot style upbeat casual quiz game background music"]
                blitz_sim = res["Tense suspenseful countdown timer music"]
                boss_sim = res["Epic intense boss battle soundtrack with heavy drums and guitars"]
                rush_sim = res["High speed fast arcade racing electronic eurobeat driving music"]
                menu_sim = res["Casual video game main menu lobby background music"]
                podium_sim = res["Celebratory energetic victory podium award ceremony music"]

                item["clap_valence"] = val
                item["clap_arousal"] = aro
                item["clap_inst_bias"] = inst_bias
                item["clap_quiz_sim"] = quiz_sim
                item["clap_blitz_sim"] = blitz_sim
                item["clap_boss_sim"] = boss_sim
                item["clap_rush_sim"] = rush_sim
                item["clap_menu_sim"] = menu_sim
                item["clap_podium_sim"] = podium_sim

                # 1. STRICT MCQ VOCAL ISOLATION INVARIANT:
                # If in Tactical Groove (MCQ), verify instrumental purity.
                if item["category"].startswith("🎷 Tactical Groove"):
                    if inst_bias < 0.10 or res["Song with human singing voice and vocal lyrics"] > 0.15:
                        if item["bpm"] >= 135:
                            item["category"] = "🏎️ High-Speed Rush (Vocal Hype)"
                        else:
                            item["category"] = "🎤 Vocal Pop (Excluded from MCQ)"

                # 2. MENU / EXPOSITORY ROUTING:
                if menu_sim >= blitz_sim + 0.05 and item["category"].startswith("⚡ Blitz & Tension"):
                    item["category"] = "☕ Lobby & Waiting Room"

                # 3. GLOOM / DEPRESSIVE FILTER:
                if val < -0.05 and res["Dark, sad, depressing, gloomy mood"] > 0.25:
                    item["score"] = max(10, item["score"] - 15)
                    item["category"] = "⚠️ Story Cue / Cutscene Gloom"

                # 4. PROFILE-ALIGNED NEURAL BOOST (+/- 4 pts)
                boost = 0
                cat = item["category"]
                if cat.startswith("🔥 Boss"):
                    if boss_sim >= 0.45: boost += 4
                elif cat.startswith("🏎️ High-Speed"):
                    if rush_sim >= 0.50: boost += 4
                elif cat.startswith("⚡ Blitz"):
                    if blitz_sim >= 0.40: boost += 4
                elif cat.startswith("🎷 Tactical"):
                    if quiz_sim >= 0.22 and inst_bias >= 0.20: boost += 4
                elif cat.startswith("☕ Lobby"):
                    if menu_sim >= 0.35: boost += 4
                elif cat.startswith("🏆 Victory"):
                    if podium_sim >= 0.30: boost += 4

                item["score"] = min(100, item["score"] + boost)

        except Exception as e:
            print(f"Batch processing error: {e}")

        done = min(i + batch_size, total_finalists)
        print(f"Stage 2 Progress: [{done}/{total_finalists}] finalists verified...", end="\r", flush=True)

    print(f"\n✅ Stage 2 complete! Verified {len(finalists)} finalists with LAION-CLAP.")
    return results

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "public/media/bgm"
    max_workers = min(7, max(1, (os.cpu_count() or 4) - 1))

    print("=" * 100)
    print("🎵 LEVI-SENSEI GAME BGM AUDIO ANALYZER (ARCADE TV CLASSROOM ENGINE)")
    print(f"Scanning target: {target_dir}")
    print(f"Metrics: Arcade Drive (35) + TV Clarity (25) + Intro Punch (20) + Duration Fit (20)")
    print(f"Audio Feature: Automatic TTS Ducking Enabled (Full-spectrum melodies welcomed)")
    print(f"Parallel Workers: {max_workers} CPU cores")
    print("=" * 100)

    audio_extensions = ("*.mp3", "*.flac", "*.wav", "*.m4a", "*.ogg")
    audio_files = []
    for ext in audio_extensions:
        audio_files.extend(glob.glob(os.path.join(target_dir, "**", ext), recursive=True))
    audio_files = sorted(list(set(audio_files)))
    total_files = len(audio_files)

    if total_files == 0:
        print(f"No audio files (MP3/FLAC/WAV/M4A/OGG) found in {target_dir}")
        return

    print(f"Found {total_files} audio tracks. Starting acoustic analysis...")

    results = []
    processed = 0

    with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_file = {executor.submit(analyze_single_track, f): f for f in audio_files}
        for future in concurrent.futures.as_completed(future_to_file):
            processed += 1
            if processed % 50 == 0 or processed == total_files:
                pct = int((processed / total_files) * 100)
                print(f"Progress: [{processed}/{total_files}] ({pct}%) analyzed...", end="\r", flush=True)
            
            try:
                res = future.result()
                if "error" not in res:
                    results.append(res)
            except Exception:
                pass

    print(f"\n✅ Stage 1 DSP complete! Successfully evaluated {len(results)} valid tracks.")

    # Run Stage 2 LAION-CLAP Neural Verification on finalists
    results = run_stage2_clap_verification(results)

    # Sort results strictly by Game Score descending, then BPM descending
    results.sort(key=lambda x: (x["score"], x["bpm"]), reverse=True)

    # Save complete dataset to CSV
    os.makedirs("reports", exist_ok=True)
    output_arg = sys.argv[2] if len(sys.argv) > 2 else None
    if output_arg:
        csv_path = output_arg if output_arg.endswith(".csv") else os.path.join("reports", f"{output_arg}.csv")
    else:
        base = os.path.basename(os.path.normpath(target_dir)).lower().replace(" ", "_")
        csv_path = os.path.join("reports", f"bgm_{base}_analysis.csv") if base not in ("bgm", "media") else os.path.join("reports", "bgm_candidates_analysis.csv")

    with open(csv_path, mode="w", newline="", encoding="utf-8") as csvfile:
        fieldnames = [
            "title", "album", "score", "category", "bpm", "intro_punch", 
            "duration", "duration_sec", "perc_ratio", "flatness", 
            "loudness_db", "tail_silence", "breakdown_sec", "lulls",
            "clap_valence", "clap_arousal", "clap_inst_bias",
            "clap_quiz_sim", "clap_blitz_sim", "clap_boss_sim", "clap_rush_sim", "clap_menu_sim", "clap_podium_sim",
            "file_path"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    print(f"📄 Master scorecard saved to: {csv_path}\n")

    # Score Distribution Summary
    s90 = len([r for r in results if r["score"] >= 90])
    s80 = len([r for r in results if 80 <= r["score"] < 90])
    s70 = len([r for r in results if 70 <= r["score"] < 80])
    sUnder70 = len([r for r in results if r["score"] < 70])

    print("📊 STRICT SCORE DISTRIBUTION:")
    print(f" • Elite Tier  (Score ≥ 90): {s90} tracks ({s90/len(results)*100:.1f}%) 🌟")
    print(f" • Strong Tier (Score 80-89): {s80} tracks ({s80/len(results)*100:.1f}%) 👍")
    print(f" • Usable Tier (Score 70-79): {s70} tracks ({s70/len(results)*100:.1f}%)")
    print(f" • Sub-optimal (Score < 70) : {sUnder70} tracks ({sUnder70/len(results)*100:.1f}%) ⚠️\n")

    def format_rows(track_list):
        return [
            [
                t["title"][:26],
                t["album"][:18],
                f"{t['bpm']:.1f}",
                f"{t['intro_punch']:.2f}s",
                t["duration"],
                f"{t['loudness_db']}dB",
                f"{t['tail_silence']}s" if t.get('tail_silence', 0) > 0 else "0s",
                f"{t['score']}/100"
            ]
            for t in track_list
        ]

    headers = ["Track Title", "Album / Game", "BPM", "Intro", "Duration", "Volume", "Tail Gap", "Score"]

    # 1. Boss Battle / Raid
    boss_top = [r for r in results if r["score"] >= 88 and r["category"].startswith("🔥")][:8]
    if boss_top:
        print("=" * 105)
        print("🔥 1. BOSS BATTLE / RAID CANDIDATES (Classroom Raid Boss | 140–160 BPM):")
        print("=" * 105)
        print(tabulate(format_rows(boss_top), headers=headers, tablefmt="github"))
        print("\n")

    # 2. High-Speed Rush & Relay
    rush_top = [r for r in results if r["score"] >= 88 and r["category"].startswith("🏎️")][:10]
    if rush_top:
        print("=" * 105)
        print("🏎️ 2. HIGH-SPEED RUSH CANDIDATES (F1 Sprint Race & Baton Relay | 138–165 BPM):")
        print("=" * 105)
        print(tabulate(format_rows(rush_top), headers=headers, tablefmt="github"))
        print("\n")

    # 3. Blitz & Tension
    blitz_top = [r for r in results if r["score"] >= 88 and r["category"].startswith("⚡")][:8]
    if blitz_top:
        print("=" * 105)
        print("⚡ 3. BLITZ & TENSION CANDIDATES (Timed Rush 1–5 Min & Bomb Defusal | 130–148 BPM):")
        print("=" * 105)
        print(tabulate(format_rows(blitz_top), headers=headers, tablefmt="github"))
        print("\n")

    # 4. Tactical Groove
    groove_top = [r for r in results if r["score"] >= 88 and r["category"].startswith("🎷")][:10]
    if groove_top:
        print("=" * 105)
        print("🎷 4. TACTICAL GROOVE CANDIDATES (MCQ Arena, Volleyball, Gold Rush | 118–132 BPM | 100% Instrumental):")
        print("=" * 105)
        print(tabulate(format_rows(groove_top), headers=headers, tablefmt="github"))
        print("\n")

    # 5. Lobby & Waiting Room
    lobby_top = [r for r in results if r["score"] >= 80 and r["category"].startswith("☕")][:8]
    if lobby_top:
        print("=" * 105)
        print("☕ 5. LOBBY & WAITING ROOM CANDIDATES (iPad Linking 100–136 BPM | Welcoming / Pre-Game):")
        print("=" * 105)
        print(tabulate(format_rows(lobby_top), headers=headers, tablefmt="github"))
        print("\n")

    # 6. Victory Podium & Awards
    podium_top = [r for r in results if r["score"] >= 75 and r["category"].startswith("🏆")][:6]
    if podium_top:
        print("=" * 105)
        print("🏆 6. VICTORY PODIUM & AWARDS CANDIDATES (Post-Game Results | Triumphant Fanfare):")
        print("=" * 105)
        print(tabulate(format_rows(podium_top), headers=headers, tablefmt="github"))
        print("\n")

if __name__ == "__main__":
    main()
