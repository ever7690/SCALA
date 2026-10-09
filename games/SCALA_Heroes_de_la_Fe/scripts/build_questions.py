import argparse
import csv
import hashlib
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--bible-dir', type=Path, required=True)
args = parser.parse_args()
books = {'GEN': 'Génesis', 'EXO': 'Éxodo', 'NUM': 'Números', 'DEU': 'Deuteronomio', 'RUT': 'Rut', '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Reyes', 'EST': 'Ester', 'DAN': 'Daniel', 'MAT': 'Mateo', 'MRK': 'Marcos', 'LUK': 'Lucas', 'JHN': 'Juan', 'ACT': 'Hechos', 'ROM': 'Romanos', '1CO': '1 Corintios', '2CO': '2 Corintios', 'GAL': 'Gálatas', 'PHP': 'Filipenses', '1TI': '1 Timoteo', '2TI': '2 Timoteo', 'HEB': 'Hebreos', 'JAS': 'Santiago', '1PE': '1 Pedro'}
verses = {}
for path in sorted(args.bible_dir.glob('spa/usx/*.usx')):
    source = path.read_text()
    for match in re.finditer(r'<verse\b[^>]*\bsid="([^"]+)"[^>]*/>(.*?)<verse\b[^>]*\beid="\1"[^>]*/>', source, re.S):
        fragment = ET.fromstring('<r>' + match[2] + '</r>')
        for note in fragment.findall('.//note'):
            for parent in fragment.iter():
                if note in list(parent):
                    parent.remove(note)
                    break
        verses[match[1]] = ' '.join(''.join(fragment.itertext()).split())


def normalize(text):
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in unicodedata.normalize('NFKD', text.lower()) if not unicodedata.combining(c)))


questions = []
counts = {}
errors = []
with Path('content/questions.tsv').open(newline='') as source:
    for row in csv.DictReader(source, delimiter='\t'):
        hero = row['hero']
        counts[hero] = counts.get(hero, 0) + 1
        number = counts[hero]
        bounds = [int(value) for value in row['verses'].split('-')]
        first, last = bounds[0], bounds[-1]
        keys = [f"{row['book']} {row['chapter']}:{v}" for v in range(first, last + 1)]
        missing = [key for key in keys if key not in verses]
        if missing:
            errors.append({'question': row['prompt'], 'missing': missing})
            continue
        scripture = ' '.join(verses[key] for key in keys)
        proof = row['evidence'].split(';')
        absent = [term for term in proof if normalize(term) not in normalize(scripture)]
        if absent:
            errors.append({'question': row['prompt'], 'absentEvidence': absent, 'scripture': scripture})
        label = f"{books[row['book']]} {row['chapter']}:{row['verses']}"
        questions.append({'id': f'{hero}-{number:02d}', 'heroId': hero, 'prompt': row['prompt'], 'choices': [row[key] for key in ['correct', 'wrong1', 'wrong2', 'wrong3']], 'answer': 0, 'reference': label, 'verseKeys': keys, 'verse': scripture, 'explanation': row['explanation'], 'evidence': proof, 'difficulty': 1 + (number - 1) // 7})
if errors:
    print(json.dumps({'errors': errors}, ensure_ascii=False, indent=2))
    raise SystemExit(1)
output = Path('src/data/questions.json')
output.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + '\n')
report = {'source': 'BibleAquifer/ReinaValera1909', 'commit': '84a071324be17c7c66db17dd204d7804e66d728b', 'translation': 'Reina-Valera 1909, dominio público', 'questionOrigin': 'Redacción propia SCALA', 'questions': len(questions), 'heroes': counts, 'allReferencesResolved': True, 'allEvidencePresentInCitedPassages': True, 'questionsSHA256': hashlib.sha256(output.read_bytes()).hexdigest()}
Path('docs/fuentes-preguntas.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
