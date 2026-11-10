import torch
import librosa
import numpy as np
from transformers import AutoProcessor, ClapModel

print("Loading cached LAION-CLAP model...")
model_id = "laion/clap-htsat-unfused"
processor = AutoProcessor.from_pretrained(model_id)
model = ClapModel.from_pretrained(model_id)
model.eval()

files = {
    "Sweatshop (Industrial/Dark)": r"E:\Music\Persona 5 Original Soundtrack\Disc 3\05. Sweatshop.mp3",
    "Life Will Change (Heist/Joy)": r"E:\Music\Persona 5 Original Soundtrack\Disc 1\24. Life Will Change -Instrumental Version-.mp3",
    "Layer Cake (Funky Groove)": r"E:\Music\Persona 5 Original Soundtrack\Disc 1\23. Layer Cake.mp3"
}

text_queries = [
    "Kahoot style upbeat casual quiz game background music",
    "Tense suspenseful countdown timer music",
    "Celebratory energetic victory music",
    "Pure instrumental background music with no vocals",
    "Song with human singing and voice lyrics",
    "Happy, positive, uplifting mood",
    "Dark, sad, depressing mood",
    "Intense, high energy, fast-paced action",
    "Calm, relaxing, slow ambient music"
]

inputs_text = processor(text=text_queries, return_tensors="pt", padding=True)
with torch.no_grad():
    text_out = model.get_text_features(**inputs_text)
    text_embeds = text_out.pooler_output
    text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)

for name, path in files.items():
    dur = librosa.get_duration(path=path)
    offset = max(0, (dur / 2) - 15)
    y, _ = librosa.load(path, sr=48000, offset=offset, duration=30.0)
    
    inputs_audio = processor(audio=[y], sampling_rate=48000, return_tensors="pt")
    with torch.no_grad():
        audio_out = model.get_audio_features(**inputs_audio)
        audio_embeds = audio_out.pooler_output
        audio_embeds = audio_embeds / audio_embeds.norm(dim=-1, keepdim=True)
        scores = (audio_embeds @ text_embeds.T).squeeze(0).tolist()
    
    res = dict(zip(text_queries, [round(s, 3) for s in scores]))
    val = res["Happy, positive, uplifting mood"] - res["Dark, sad, depressing mood"]
    aro = res["Intense, high energy, fast-paced action"] - res["Calm, relaxing, slow ambient music"]
    inst = res["Pure instrumental background music with no vocals"] - res["Song with human singing and voice lyrics"]
    
    print(f"=== {name} ===")
    print(f"  Valence Index (Joy vs Gloom): {val:+.3f}")
    print(f"  Arousal Index (Action vs Calm): {aro:+.3f}")
    print(f"  Instrumental Purity: {inst:+.3f} (is_inst: {inst > 0})")
    print(f"  Quiz Game Match: {res['Kahoot style upbeat casual quiz game background music']:.3f}")
    print(f"  Tense Countdown Match: {res['Tense suspenseful countdown timer music']:.3f}\n")
