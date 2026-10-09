import json
import random
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def normalize(word):
    word = word.lower().replace("ñ", "\u0001")
    return "".join(c for c in unicodedata.normalize("NFD", word) if not unicodedata.combining(c)).replace("\u0001", "ñ")


CHAPTERS = [
    ("primeros-pasos", "Primeros pasos", "Un corazón que aprende", "✦", "amor dios paz vida alma luz fe orar rey gracia santo salmo amigo cielo pan hijo padre cruz bondad gozo verdad"),
    ("creacion", "La creación", "Todo comienza con la luz", "☀", "edén adán eva tierra cielo agua luz día noche sol luna árbol fruto jardín mar ave semilla vida bueno"),
    ("promesa", "Una promesa", "Camina con esperanza", "⛵", "noé arca lluvia nube arco pacto abraham sara isaac jacob hijo tienda camino familia promesa arena estrella"),
    ("libertad", "Camino a la libertad", "La fe abre caminos", "◇", "moisés aarón éxodo maná desierto roca agua mar pueblo monte ley tablas nube fuego pascua vara libertad"),
    ("valientes", "Corazones valientes", "Pequeños pasos, gran fe", "♜", "josué jericó muro trompeta rut noemí ester david saúl rey pastor oveja honda león valor firme fuerza"),
    ("salmos", "Cantos de esperanza", "Encuentra descanso", "♫", "salmo canto alabanza gozo paz alma refugio roca pastor senda amparo amor santo gloria gracias oración bondad"),
    ("profetas", "Voces de esperanza", "Escucha y confía", "✧", "elías eliseo isaías daniel jonás profeta fuego león horno ciudad ballena verdad justicia fe sueño palabra"),
    ("jesus", "Los pasos de Jesús", "El amor se hace cercano", "✝", "jesús maría josé belén nazaret galilea pesebre estrella ángel hijo maestro luz camino vida verdad amor milagro"),
    ("parabolas", "Semillas del Reino", "El bien crece en ti", "❧", "semilla sembrar trigo tierra fruto viña rama oveja pastor moneda tesoro perla prójimo perdón padre hijo pan pez"),
    ("comunidad", "Una vida edificada", "Comparte lo que has recibido", "⌂", "pedro pablo juan lucas marcos mateo iglesia reino espíritu santo fe amor paz gozo bondad gracia servir unión esperanza"),
]

COMMON = """
fe da ve va es en el la lo un al de se si su tu yo mi me te os nos
amo ama amar amas amó amé ora orar oras oro oído oye oír oigo dio dar das dan dona don dona doy era eras ser sea son soy somos será salen sale sal sol sola solo solos
mar mares remo remos ramo ramos roma rosa rosas rojo roja risa risas río ríos reír rey reyes ley leyes luz luces paz pez peces pan panes par pares pie pies piel peso pesa paso pasa pasan pasas paso pasos pico piso pisos poso por pro para pero pera peras papa
ala alas ave aves aves aves alto alta altos alba albas alma almas asno asnos años año niño niños niña niñas nido nidos nave naves nada nadar nadan mano manos mono mesa mesas masa masas mes meses meta metas mata matas mató mimo mima mina minas misa modo modos moda modo muro muros mudo muda mundo manto mantos monte montes
vida vidas vid vides vía vías vino vinos viña viñas viene veo ver veas ves vela velas velo velos valle valles valor vals vara varas verde verdes verdad virtud vital vacío valle va voz voces voto votos vaso vasos vasto
casa casas cosa cosas caso casos saco sacos seca seco secar saco cima cimas cita citas cito cota copa copas capa capas cabo cabos cama camas cara caras caro clara claro clima coma come comer comen comí como coro coros cura curas curar cruz cruza cruce cubo cubos culto cultos cuenta cuidar cuida calma calmar calor campo campos canal canto cantar canta cantó canta canta carro carta cartas costa cobre casco cesta cisne cerca cerco cera cena cenas cenar cerro cerros centro cielo cielos ciervo ciudad ciclo cinco chico chica cien ciento ciclo
agua aguas aguda ayuda ayudar apoya apoyo apego aire aires arco arcos arca arcas arena arenas arado ara arma armas aro aros arte artes arde arder arpa arpas atar ata atan acto actos apto amor amigo amigos amiga amigas amado amada amable amén ante antes andar anda andan ancla anclas ángel ángeles ánimo ágil aquí abrir abre abril avisa aviso acaso ayer autor ambos ansia
bueno buena buenos bien bienes busco busca besar beso besos bello bella belén barca barcas barco barcos barro base bases basta baúl beca bebé boca bocas boda bodas bola bolas bajo baja banco bancos basta brisa brillo brilla brazo brazos breve bondad buey burro
día días dado dados dato datos dedo dedos debe debes deber dicen decir dice dicha digno digna divina divino dulce duda dudas desde dentro deseo deseas desea dolor donde doble doce dos dura duro duerme deuda deudas dueño dueña don dones dote dotes danza danzar densa denso
eco ecos edad eras esas esta este esto esas esos está están estar etapa eterno eterna evento evito elevo eleva eje ejes elige elegir enero entrar entra envío envía espada espejo espera esperar estrella estima éxodo
faro faros fase fases fama familia fiel fieles fino fina fin fines fila filas firma firme flor flores forma formas fondo fuente fuego favor feliz feroz fruto frutos fría frío fauna falta fuerza frase frente fiesta fiera fibra figura futuro
gana ganar ganas gano gas gato gatos guía guías guiar gozo gota gotas gran grado grano granos grande gracia gracias gloria grupo guardar guarda gesto germen gusta gusto
hijo hijos hija hijas hago hacer haces hace hacia harina habla hablar hablo halo han has haya hay he haz heno hielo hilo hilos hoja hojas hora horas hoy humor huerto hueso hogar honra honrar héroe honda horno
ir ira irá irás iban idea ideas igual iglesia inicio invito invita imán isla islas justo justa juntos junta junto juego jugar joven juez jabón jardín jacob josé jesús joel juan job
lago lagos lado lados lana lanas lavar lava lazo lazos lee leer lees lema lemas león leones letra letras libro libros libre lindo linda lirio lirios liso lisa listo lista llama llama llamar llave llano llevar llueve lluvia luna lunar lino loma lomas largo larga lento lenta logro logra lucha lugar
madre madres padre padres mayor maná mal males malta manta mantas medio media menos menor mérito miel miedo mira mirar miro miran misión misa mil mito mitos mucho mucha mujer música muerte muelle mueve
nace nacer nada nadie nombre norma norte nota notas noé noemí noche noches nube nubes nuevo nueva nueve neto neta noble noble nivel norma
obra obras obrar orbe ocho olivo olivos otoño oveja ovejas odio onda ondas orden oreja orejas orilla oración océano ofrenda ofrecer oferta óleo
palo palos pala palas paño paños patio patria pacto pactos pago pagos paloma palabra pareja parar parque parte partir prado pasto pastor piedra piedras planta plantar plaza plena pleno pluma pobre poder podrá pongo poner posada pote potes pozo pozos presa preso prisa primo prima primo prueba pueblo puerto puerta puertas punto pura puro perla perlas polvo pecho pesca pescar plato platos perfil pensar pienso perdón piloto pilar pinto piedad profeta profetas profecía promesa promete prójimo propio pronta pronto
queda quedar queso quieto quinta quiero quita quitar quien quizá
rama ramas raza razas raíz raíces rato ratos real reina reino reinar reto retos red redes rema remar remo renace regalo regala regla reunir región rodea ronda rostro rubí ruta rutas rut roca rocas rosal rosal rio río roba roba roble rocas rubio rural razón rápido recibe reciba recto recta ruego rosa rocas rico rica rito ritos reina rescate respiro respeto reposo repite remoto
sabio sabia saber sabes sabe salmo salmos salta salto salsa salva salvar salvo sana sano sanar sanas sara santo santa santos sacro seguir semilla señor seno senda sendas sentar sereno servir siervo siete sierra silla signo sitio sión sobre subir sube sur suma sumar sumo sueño sueños suave suerte suelo suena sonido segura seguro señor sí sin sabe saúl sano santa sabiduría semana señal señales sueño soñar sagrado sincero silencio sonrisa sandía sentía sentir sentido
tal tela telas tema temas temo temor tener tengo tiene todo toda todos todas toro toros torre torres tomar toma tomas tono tonos tesoro tierra tiras tira tía tío tipo tipos trigo tribu tramo tren tres trece trato tratar texto templo tienda tiempos tiempo tarea tarde taza tazas toca tocar topa tope tus túnica tabla tablas techo tinta tanta tanto tarea tesón tibia tierno tierna total testigo
uno una unos unas unir unión unido unidad uva uvas uso usa usar útil único última usted
vela velar venir viaje viaja viajero vivir vive vigor vista visto vuela vuelo vuelta viento villa violín verde venado vencer vence vestir vista verbo vecino virtud victor viga vigas
zacarías zarza zorro zona zonas zuma zumo zapato zapato
adán eva moisés aarón abel caín enoc set isaac isaías elías eliseo ester daniel david goliat josué jericó jeremías samuel saúl pedro pablo mateo lucas marcos timoteo tito lázaro marta maría magdala nazaret caná sinai sinaí egipto israel judá judas jacobo andrés felipe tomás bernabé esdras nehemías ezequiel
"""

LEXICON = sorted({normalize(word) for word in COMMON.split()} | {normalize(word) for chapter in CHAPTERS for word in chapter[4].split()})
LEXICON = [word for word in LEXICON if 2 <= len(word) <= 9 and all(c.isalpha() for c in word)]


def fits(word, bag):
    return not (Counter(word) - bag)


def place_crossword(words, rng):
    grid = {}
    directions = {}
    placed = []
    for word in words:
        possibilities = [(0, 0, 0, 1)] if not placed else []
        if placed:
            for (r, c), char in grid.items():
                for i, letter in enumerate(word):
                    if char != letter:
                        continue
                    for dr, dc in [(0, 1), (1, 0)]:
                        if (dr, dc) in directions[(r, c)]:
                            continue
                        possibilities.append((r - dr * i, c - dc * i, dr, dc))
        rng.shuffle(possibilities)
        best = None
        for r, c, dr, dc in possibilities:
            path = [(r + dr * i, c + dc * i) for i in range(len(word))]
            if (r - dr, c - dc) in grid or (r + dr * len(word), c + dc * len(word)) in grid:
                continue
            crossings = 0
            valid = True
            for pos, letter in zip(path, word):
                if pos in grid:
                    if grid[pos] != letter or (dr, dc) in directions[pos]:
                        valid = False
                        break
                    crossings += 1
                elif (pos[0] + dc, pos[1] + dr) in grid or (pos[0] - dc, pos[1] - dr) in grid:
                    valid = False
                    break
            if not valid or (placed and crossings == 0):
                continue
            all_positions = list(grid) + path
            height = max(p[0] for p in all_positions) - min(p[0] for p in all_positions) + 1
            width = max(p[1] for p in all_positions) - min(p[1] for p in all_positions) + 1
            if max(height, width) > 11:
                continue
            score = height * width - crossings * 6 + rng.random()
            if best is None or score < best[0]:
                best = (score, path, dr, dc)
        if best is None:
            continue
        _, path, dr, dc = best
        for pos, char in zip(path, word):
            grid[pos] = char
            directions.setdefault(pos, set()).add((dr, dc))
        placed.append({"text": word, "path": path})
    min_row = min(p[0] for p in grid)
    min_col = min(p[1] for p in grid)
    for answer in placed:
        answer["path"] = [[r - min_row, c - min_col] for r, c in answer["path"]]
    return placed, max(p[0] for p in grid) - min_row + 1, max(p[1] for p in grid) - min_col + 1


def build():
    rng = random.Random(20261009)
    levels = []
    chapters = []
    seen = set()
    signature_seen = set()
    for chapter_index, (chapter_id, title, subtitle, symbol, raw_seeds) in enumerate(CHAPTERS):
        seeds = [normalize(w) for w in raw_seeds.split() if 3 <= len(normalize(w)) <= 8]
        attempts = 0
        chunk = []
        while len(chunk) < 100:
            attempts += 1
            if attempts > 20000:
                raise ValueError(f"Insufficient unique levels: {title}, {len(chunk)}")
            local_index = len(chunk)
            seed = seeds[local_index % len(seeds)] if attempts <= 30 else rng.choice(seeds)
            wheel = list(seed)
            if levels:
                additions = rng.choice([0, 1, 1, 2])
                wheel += rng.choices("aaeeoorsnltdi", k=min(additions, 8 - len(seed)))
            bag = Counter(wheel)
            wheel_signature = "".join(sorted(wheel))
            if wheel_signature in seen:
                continue
            candidates = [w for w in LEXICON if len(w) >= 3 and fits(w, bag) and w != seed]
            candidates.sort(key=lambda w: (-len(w), rng.random()))
            target_count = 3 if len(levels) < 10 else min(7, 3 + len(wheel) // 2)
            selected, rows, cols = place_crossword([seed] + candidates, rng)
            selected = selected[:target_count]
            if len(selected) < 3:
                continue
            grid_signature = tuple(sorted(w["text"] for w in selected))
            if grid_signature in signature_seen:
                continue
            all_positions = [p for a in selected for p in a["path"]]
            min_row, min_col = min(p[0] for p in all_positions), min(p[1] for p in all_positions)
            for answer in selected:
                answer["path"] = [[r - min_row, c - min_col] for r, c in answer["path"]]
            rows = max(p[0] for p in all_positions) - min_row + 1
            cols = max(p[1] for p in all_positions) - min_col + 1
            rng.shuffle(wheel)
            number = len(levels) + 1
            level = {
                "id": str(number), "number": number, "rows": rows, "cols": cols, "walls": {},
                "letterWheel": wheel, "answers": selected,
                "bonusWords": [w for w in LEXICON if fits(w, bag) and w not in {a["text"] for a in selected}],
                "groupId": chapter_id, "groupIndex": chapter_index, "indexInGroup": local_index,
                "focusWord": seed,
            }
            chunk.append(level)
            levels.append(level)
            seen.add(wheel_signature)
            signature_seen.add(grid_signature)
        chapters.append({"id": chapter_id, "index": chapter_index, "title": title, "subtitle": subtitle, "symbol": symbol, "wheelSize": 0, "levelCount": 100, "file": "", "start": chapter_index * 100 + 1, "end": (chapter_index + 1) * 100})
    data = {"version": 1, "chapters": chapters, "levels": levels, "lexiconSize": len(LEXICON)}
    (ROOT / "src/data").mkdir(parents=True, exist_ok=True)
    (ROOT / "src/data/bible-levels.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (ROOT / "src/data/spanish-lexicon.json").write_text(json.dumps(LEXICON, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"levels": len(levels), "chapters": len(chapters), "words": len(LEXICON), "maxBoard": max(max(l["rows"], l["cols"]) for l in levels), "minimumAnswers": min(len(l["answers"]) for l in levels), "firstLevel": levels[0]}, ensure_ascii=False))


if __name__ == "__main__":
    build()
