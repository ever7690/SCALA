import math
import struct
import wave
from pathlib import Path

RATE = 22050
DURATION = 32
CHORDS = [(48, 60, 64, 67), (45, 57, 60, 64), (41, 53, 57, 60), (43, 55, 59, 62)]
samples = [0.0] * (RATE * DURATION)


def note(midi, start, length, volume):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    for i in range(min(int(length * RATE), len(samples) - int(start * RATE))):
        t = i / RATE
        envelope = (1 - math.exp(-t * 70)) * math.exp(-t * 1.25) * min(1, (length - t) * 4)
        tone = math.sin(2 * math.pi * frequency * t) + 0.3 * math.sin(2 * math.pi * frequency * 2 * t) * math.exp(-t * 2) + 0.09 * math.sin(2 * math.pi * frequency * 3 * t) * math.exp(-t * 4)
        samples[int(start * RATE) + i] += tone * envelope * volume


for measure in range(8):
    chord = CHORDS[measure % 4]
    start = measure * 4
    note(chord[0], start, 3.8, 0.15)
    for beat, index in enumerate([1, 2, 3, 2]):
        note(chord[index], start + beat, 3.0, 0.11)
    if measure % 2 == 1:
        note(chord[3] + 12, start + 2.5, 2.7, 0.025)

peak = max(abs(sample) for sample in samples)
for i in range(len(samples)):
    fade = min(1, i / (RATE * 0.2), (len(samples) - i - 1) / (RATE * 1.3))
    samples[i] = samples[i] / peak * 0.65 * fade

target = Path('public/audio/scala-amanecer.wav')
with wave.open(str(target), 'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(b''.join(struct.pack('<h', int(sample * 32767)) for sample in samples))
print(f'Composición original: {target}, {DURATION} segundos, pico -3.7 dBFS')
