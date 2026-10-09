import json
import math
import random
import struct
import wave
from pathlib import Path

rate = 44100


def envelope(t, duration, attack, fade):
    return math.sin(min(1.0, t / attack) * math.pi / 2) ** 2 * math.sin(min(1.0, (duration - t) / fade) * math.pi / 2) ** 2


def write_sound(name, samples, peak):
    maximum = max(abs(value) for value in samples)
    frames = [round(value / maximum * peak * 32767) for value in samples]
    frames[0] = 0
    frames[-1] = 0
    target = Path('public/audio') / name
    with wave.open(str(target), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(b''.join(struct.pack('<h', value) for value in frames))
    return {'file': str(target), 'duration': len(frames) / rate, 'sampleRate': rate, 'peakDbFS': round(20 * math.log10(peak), 2), 'clippedSamples': 0}


duration = 0.14
frequency = 698.4564629
touch = []
for i in range(round(rate * duration)):
    t = i / rate
    tone = math.sin(2 * math.pi * frequency * t) * math.exp(-t / 0.048)
    tone += 0.12 * math.sin(2 * math.pi * frequency * 2.01 * t) * math.exp(-t / 0.032)
    touch.append(tone * envelope(t, duration, 0.012, 0.028))

duration = 0.28
rng = random.Random(113)
fast = 0.0
slow = 0.0
fast_alpha = 1 - math.exp(-2 * math.pi * 1850 / rate)
slow_alpha = 1 - math.exp(-2 * math.pi * 260 / rate)
shuffle = []
for i in range(round(rate * duration)):
    t = i / rate
    noise = rng.uniform(-1, 1)
    fast += fast_alpha * (noise - fast)
    slow += slow_alpha * (noise - slow)
    sweep = math.sin(math.pi * t / duration) ** 1.7
    shimmer = 0.028 * math.sin(2 * math.pi * (440 * t + 90 * t * t / duration))
    shuffle.append((fast - slow + shimmer) * sweep * envelope(t, duration, 0.038, 0.075))

results = [write_sound('scala-toque.wav', touch, 0.28), write_sound('scala-mezcla.wav', shuffle, 0.32)]
print(json.dumps({'origin': 'Síntesis original SCALA', 'sounds': results}, ensure_ascii=False))
