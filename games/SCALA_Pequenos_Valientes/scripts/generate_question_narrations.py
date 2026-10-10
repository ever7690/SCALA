import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

os.environ.update(HF_HUB_OFFLINE="1", HF_HUB_DISABLE_TELEMETRY="1", TRANSFORMERS_OFFLINE="1", DO_NOT_TRACK="1")

def network_guard(event, args):
    if event in {"socket.connect", "socket.getaddrinfo"}:
        raise RuntimeError("La generación de voces debe permanecer sin conexión.")

sys.addaudithook(network_guard)
import numpy as np
import soundfile as sf
import torch
import espeakng_loader
from misaki import espeak
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from kokoro import KModel, KPipeline

root = Path(__file__).resolve().parent.parent
assets = root / "artwork/audio/kokoro-torch"
model_path = assets / "kokoro-v1_0.pth"
expected = "496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4"
assert hashlib.sha256(model_path.read_bytes()).hexdigest() == expected
torch.set_num_threads(2)
torch.set_num_interop_threads(2)
scripts = json.loads((root / "artwork/question-narration-scripts.json").read_text())
records = []
with tempfile.TemporaryDirectory(prefix="pv-es-") as short_data:
    shutil.copytree(espeakng_loader.get_data_path(), Path(short_data) / "espeak-ng-data")
    EspeakWrapper.set_data_path(str(Path(short_data) / "espeak-ng-data"))
    model = KModel(repo_id="hexgrad/Kokoro-82M", config=str(assets / "config.json"), model=str(model_path)).to("cpu").eval()
    pipeline = KPipeline(lang_code="e", repo_id="hexgrad/Kokoro-82M", model=model, device="cpu")
    voice = str(assets / "ef_dora.pt")
    for index, item in enumerate(scripts):
        target = root / "public-runtime/audio" / item["file"]
        if not target.exists():
            segments = []
            for segment in re.split(r"(?<=[.!?])\s+", item["text"]):
                if not segment.strip():
                    continue
                for result in pipeline(segment, voice=voice, speed=.96):
                    if result.audio is None:
                        raise RuntimeError("No se generó una frase de la pregunta.")
                    segments.append(result.audio.detach().cpu().numpy())
                    segments.append(np.zeros(7680, dtype=np.float32))
            waveform = np.concatenate(segments)
            with tempfile.NamedTemporaryFile(suffix=".wav") as temporary:
                sf.write(temporary.name, waveform, 24000)
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", temporary.name, "-af", "loudnorm=I=-18:TP=-2:LRA=7", "-ar", "44100", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "128k", str(target)], check=True, timeout=45)
        duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(target)], text=True, timeout=15))
        records.append({"file": item["file"], "lessonId": item["lessonId"], "step": item["step"], "textSHA256": hashlib.sha256(item["text"].encode()).hexdigest(), "sha256": hashlib.sha256(target.read_bytes()).hexdigest(), "bytes": target.stat().st_size, "duration": duration})
        (root / "artwork/question-narration-manifest.json").write_text(json.dumps({"engine": "Kokoro 0.9.4 / PyTorch CPU", "voice": "ef_dora", "speed": .96, "modelSHA256": expected, "networkDisabled": True, "externalCredits": 0, "files": records}, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps({"completed": index + 1, "total": len(scripts), "file": item["file"], "duration": duration}), flush=True)
