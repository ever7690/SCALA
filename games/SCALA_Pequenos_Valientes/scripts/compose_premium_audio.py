from pathlib import Path
import math
import subprocess
import wave
import numpy as np

root = Path(__file__).resolve().parents[1]
destination = root / 'public-runtime' / 'audio'
temporary = root / 'artwork' / 'audio'
temporary.mkdir(parents=True, exist_ok=True)
rate = 44100
beat = 60 / 72
duration = 32 * 4 * beat
total = round(duration * rate)
music = np.zeros((total, 2), dtype=np.float64)
rng = np.random.default_rng(71230)

def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)

def add_note(note, start, length, level, pan, kind='piano'):
    t = np.arange(round(length * rate)) / rate
    hz = frequency(note)
    if kind == 'pad':
        envelope = np.minimum(1, t / .65) * np.minimum(1, (length - t) / 1.2)
        sound = envelope * (np.sin(2 * math.pi * hz * t) + .22 * np.sin(2 * math.pi * hz * 2 * t))
    else:
        sound = np.zeros_like(t)
        for partial in range(1, 9):
            decay = (1.0 + partial * .50) / (1.4 if kind == 'piano' else 1)
            amplitude = 1 / partial ** 2.3
            resonance = hz * partial * math.sqrt(1 + .00016 * partial ** 2)
            sound += amplitude * np.exp(-t * decay) * np.sin(2 * math.pi * resonance * t)
        envelope = np.minimum(1, t / .024) * np.minimum(1, (length - t) / .25)
        sound *= envelope
    sound *= level
    offsets = (np.arange(len(sound)) + round(start * rate)) % total
    music[offsets, 0] += sound * math.sqrt((1 - pan) / 2)
    music[offsets, 1] += sound * math.sqrt((1 + pan) / 2)

chords = [[53, 57, 60, 64], [48, 55, 60, 62], [45, 52, 57, 60], [43, 55, 59, 62]]
melodies = [[76, 74, 72, 69], [67, 69, 72, 74], [76, 79, 76, 72], [74, 72, 71, 67], [69, 72, 76, 74], [72, 67, 69, 72], [76, 74, 72, 69], [67, 71, 74, 72]]
for bar in range(32):
    start = bar * 4 * beat
    chord = chords[bar % 4]
    for j, note in enumerate(chord):
        add_note(note, start + j * .045, 5.8, .020, -.3 + j * .2, 'pad')
    add_note(chord[0] - 12, start + .01, 4.5, .042, -.35)
    for j in range(4):
        note = chord[(j + 1) % len(chord)] + 12
        add_note(note, start + j * beat + float(rng.uniform(-.008, .008)), 3.4, .026 + float(rng.uniform(-.003, .003)), -.45 + j * .3)
    phrase = melodies[bar % 8]
    for j, note in enumerate(phrase):
        if (bar % 8 == 7 and j in [2, 3]) or (bar % 8 == 3 and j == 1):
            continue
        add_note(note, start + (j + .15) * beat, 3.5, .045 if bar < 16 else .040, .10 + j * .04)
dry = music.copy()
for delay, gain in [(.079, .10), (.137, .07), (.239, .045), (.413, .028), (.661, .016)]:
    music += np.roll(dry, round(delay * rate), axis=0)[:, ::-1] * gain
music = np.tanh(music * 1.25)
music *= .58 / np.max(np.abs(music))

def write_pcm(filename, audio):
    with wave.open(str(filename), 'wb') as output:
        output.setnchannels(1 if audio.ndim == 1 else audio.shape[1])
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes((np.clip(audio, -.99, .99) * 32767).astype('<i2').tobytes())

master = temporary / 'jardin-tierno-master.wav'
write_pcm(master, music)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(master), '-af', 'loudnorm=I=-22:TP=-3:LRA=7', '-ar', str(rate), '-c:a', 'libvorbis', '-q:a', '5', str(destination / 'valientes-jardin-tierno.ogg')], check=True, timeout=60)
melodies = {'home':[72,76,79], 'feel':[69,72], 'story':[67,72,76], 'help':[65,69,72], 'path':[60,64,67], 'family':[62,65,69], 'settings':[64,67], 'back':[72,67], 'select':[76], 'practice':[69,74], 'complete':[60,64,67,72], 'voice':[65,72], 'lock':[57,64,69], 'toggle':[74], 'calm':[60,67,71], 'kindness':[64,69,76], 'scala':[65,72,77]}
for cue, notes in melodies.items():
    spacing = .10 if cue == 'complete' else .085
    length = .48 + spacing * (len(notes) - 1)
    t = np.arange(round(length * rate)) / rate
    sound = np.zeros_like(t)
    for i, note in enumerate(notes):
        age = t - i * spacing
        positive = np.maximum(age, 0)
        envelope = np.clip(positive / .022, 0, 1) * np.exp(-positive * 9.5) * np.clip((.48 - positive) / .10, 0, 1)
        envelope[age < 0] = 0
        hz = frequency(note)
        sound += .090 * envelope * (np.sin(2 * math.pi * hz * positive) + .085 * np.sin(2 * math.pi * hz * 2 * positive) + .020 * np.sin(2 * math.pi * hz * 3 * positive))
    write_pcm(destination / f'valientes-{cue}.wav', sound)
print('Jardín tierno: 106 segundos en bucle; 17 sonidos originales suaves.', flush=True)
