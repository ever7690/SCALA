import json
import math
import struct
import wave
from pathlib import Path

rate = 44100
duration = 0.56
frequency = 587.3295358
partials = [(1.0, 1.0, 0.18), (2.01, 0.21, 0.095), (2.76, 0.065, 0.07)]
samples = []

for i in range(round(rate * duration)):
    t = i / rate
    attack = math.sin(min(1.0, t / 0.018) * math.pi / 2) ** 2
    fade = math.sin(min(1.0, (duration - t) / 0.11) * math.pi / 2) ** 2
    tone = sum(
        weight * math.sin(2 * math.pi * frequency * ratio * t) * math.exp(-t / decay)
        for ratio, weight, decay in partials
    )
    samples.append(tone * attack * fade)

peak = max(abs(value) for value in samples)
samples = [value / peak * 0.38 for value in samples]
samples[0] = 0.0
samples[-1] = 0.0
target = Path('public/audio/scala-campanilla.wav')
with wave.open(str(target), 'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes(b''.join(struct.pack('<h', round(value * 32767)) for value in samples))

print(json.dumps({
    'file': str(target),
    'origin': 'Composición original SCALA',
    'sampleRate': rate,
    'duration': duration,
    'peakDbFS': round(20 * math.log10(0.38), 2),
    'attackMs': 18,
    'clippedSamples': 0,
}, ensure_ascii=False))
