export type CharacterId = 'escalito' | 'lupi' | 'ana' | 'luz' | 'mateo' | 'roko';
export type Mood = 'alegre' | 'tranquilo' | 'triste' | 'enojado' | 'preocupado';
export type IconId = 'home' | 'heart' | 'story' | 'help' | 'path' | 'family' | 'gear' | 'voice' | 'leaf' | 'back' | 'play' | 'check' | 'lock' | 'sun';

export interface Choice {
  text: string;
  helpful: boolean;
  feedback: string;
}
export interface Challenge {
  question: string;
  choices: Choice[];
}
export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  icon: IconId;
  color: string;
  scene: 'garden' | 'school';
  actors: CharacterId[];
  paragraphs: string[];
  narration: string;
  challenges: Challenge[];
  practice: string;
  adult: string;
  bible: string;
}

export const characters: Record<CharacterId, { name: string; description: string; color: string }> = {
  escalito: { name: 'Escalito', description: 'Un amigo que escucha y aprende contigo.', color: '#ffbb65' },
  lupi: { name: 'Lupi', description: 'Nuestro compañero tierno y juguetón.', color: '#ffdb82' },
  ana: { name: 'Ana', description: 'Tiene muchas ideas y le gusta dibujar.', color: '#d4b1f0' },
  luz: { name: 'Luz', description: 'Comparte su alegría y acompaña a sus amigos.', color: '#ffe170' },
  mateo: { name: 'Mateo', description: 'Observa, pregunta y busca maneras de ayudar.', color: '#b7d788' },
  roko: { name: 'Roko', description: 'Le gustan las bromas y está aprendiendo a cuidar a los demás.', color: '#ffad91' },
};

export const moods: { id: Mood; label: string; message: string; color: string }[] = [
  { id: 'alegre', label: 'Alegre', message: 'Puedes compartir tu alegría y escuchar cómo se sienten tus amigos.', color: '#ffe06f' },
  { id: 'tranquilo', label: 'Tranquilo', message: 'Disfruta este momento. Puedes acompañar a alguien que necesite hablar.', color: '#b7deae' },
  { id: 'triste', label: 'Triste', message: 'La tristeza también merece ser escuchada. Puedes contarle a un adulto que te cuide.', color: '#d2bbef' },
  { id: 'enojado', label: 'Enojado', message: 'Puedes sentir enojo y expresarlo con palabras. Aléjate de la situación si necesitas espacio y busca apoyo.', color: '#ffb08c' },
  { id: 'preocupado', label: 'Preocupado', message: 'No tienes que resolverlo a solas. Busca a un adulto de confianza y cuéntale lo que ocurre.', color: '#f6c6a5' },
];

export const lessons: Lesson[] = [
  {
    id: 'mi-voz', title: 'Mi voz tiene valor', subtitle: 'Reconozco cómo me siento', icon: 'heart', color: '#ffbf94', scene: 'school', actors: ['ana', 'escalito', 'roko'],
    paragraphs: [
      'Ana muestra su dibujo. Roko hace una broma sobre él y algunos se ríen. Ana deja de sonreír.',
      'Escalito se acerca y pregunta: «¿Cómo te sientes?». Ana puede decir que está triste, enojada o preocupada. Cada sentimiento merece ser escuchado.',
      'Lo que pasó no es culpa de Ana. Hablar con un adulto que la cuide puede ayudar. Tú también puedes contar cómo te sientes.',
    ],
    narration: 'Ana muestra su dibujo. Roko hace una broma sobre él y algunos se ríen. Ana deja de sonreír. Escalito se acerca y pregunta: ¿Cómo te sientes? Ana puede decir que está triste, enojada o preocupada. Cada sentimiento merece ser escuchado. Lo que pasó no es culpa de Ana. Hablar con un adulto que la cuide puede ayudar. Tú también puedes contar cómo te sientes. En esta aventura practicamos cómo reconocer lo que sentimos. Elige las palabras que ayudarían a Ana.',
    challenges: [
      { question: '¿Qué puede decir Ana sobre lo que siente?', choices: [
        { text: '«Me siento triste y quiero hablar».', helpful: true, feedback: 'Ponerle palabras a lo que sentimos ayuda a explicarlo.' },
        { text: '«Tengo que fingir que estoy contenta».', helpful: false, feedback: 'Ana puede expresar lo que siente. No tiene que fingir alegría.' },
        { text: '«Puedo sentir enojo y decirlo con palabras».', helpful: true, feedback: 'El enojo también se puede expresar cuidándonos y buscando apoyo.' },
      ] },
      { question: '¿Quién puede escuchar y cuidar a Ana?', choices: [
        { text: 'Un adulto de confianza, como un familiar o docente.', helpful: true, feedback: 'Un adulto que la cuide puede escuchar y ayudar a actuar.' },
        { text: 'Tiene que resolverlo todo ella sola.', helpful: false, feedback: 'Pedir ayuda es una opción valiosa. Nadie tiene que resolver esto a solas.' },
      ] },
    ],
    practice: 'Con un adulto, completa: «Hoy me siento… y me gustaría contarte…».', adult: 'Escuche sin exigir una emoción concreta. Agradezca que el niño hable y pregunte qué apoyo necesita.', bible: 'Marcos 10:13–16 · Jesús recibe a los niños y les da un lugar importante.',
  },
  {
    id: 'mi-limite', title: 'Una broma que molesta', subtitle: 'Pongo un límite con palabras', icon: 'story', color: '#ffd576', scene: 'school', actors: ['escalito', 'ana', 'roko'],
    paragraphs: [
      'Roko quiere hacer reír al grupo y vuelve a bromear sobre el dibujo de Ana. Ella se siente incómoda.',
      'Escalito acompaña a Ana. Si se siente segura, Ana puede decir: «Esa broma me molesta. Por favor, para». También puede alejarse y pedir ayuda.',
      'Una broma divertida cuida a quienes participan. Cuando alguien dice que le duele, es momento de escuchar y detenerse.',
    ],
    narration: 'Roko quiere hacer reír al grupo y vuelve a bromear sobre el dibujo de Ana. Ella se siente incómoda. Escalito acompaña a Ana. Si se siente segura, Ana puede decir: Esa broma me molesta. Por favor, para. También puede alejarse y pedir ayuda. Una broma divertida cuida a quienes participan. Cuando alguien dice que le duele, es momento de escuchar y detenerse. Practiquemos una frase que ponga un límite. Si hablar en ese momento te da miedo, puedes ir directamente con un adulto que te cuide.',
    challenges: [
      { question: '¿Qué frase expresa un límite?', choices: [
        { text: '«Esa broma me molesta. Por favor, para».', helpful: true, feedback: 'Esta frase explica lo que molesta y pide que se detenga.' },
        { text: '«Voy a hacerte lo mismo».', helpful: false, feedback: 'Podemos pedir que pare, alejarnos y buscar ayuda sin devolver la burla.' },
      ] },
      { question: '¿Y si Ana no se siente segura para hablar?', choices: [
        { text: 'Puede alejarse y buscar a un adulto que la cuide.', helpful: true, feedback: 'Su seguridad importa. Puede pedir apoyo directamente.' },
        { text: 'Tiene que enfrentarse a Roko para demostrar valor.', helpful: false, feedback: 'Ser valiente también es buscar apoyo. No tiene que enfrentarse a nadie.' },
      ] },
    ],
    practice: 'Ensaya con un adulto: «Eso me molesta. Necesito que pares». También practica ir a un lugar seguro.', adult: 'No obligue al niño a confrontar a quien lo molesta. Acompañe y evalúe qué respuesta es segura en su situación.', bible: 'Lucas 10:27 · Amar al prójimo incluye cuidar cómo lo tratamos.',
  },
  {
    id: 'pido-ayuda', title: 'Puedo pedir ayuda', subtitle: 'Busco a un adulto que me cuide', icon: 'help', color: '#b8db98', scene: 'garden', actors: ['escalito', 'mateo', 'lupi'],
    paragraphs: [
      'Las bromas se repiten y Mateo está preocupado. Escalito le recuerda que no tiene que guardárselo.',
      'Mateo busca a su docente y dice: «Quiero contarte algo. Esto pasó, me siento así y necesito ayuda». Puede hablar también con su familia.',
      'Si el primer adulto no lo escucha, puede acudir a otro que lo cuide. Si siente que alguien puede hacerle daño, busca apoyo de inmediato.',
    ],
    narration: 'Las bromas se repiten y Mateo está preocupado. Escalito le recuerda que no tiene que guardárselo. Mateo busca a su docente y dice: Quiero contarte algo. Esto pasó, me siento así y necesito ayuda. Puede hablar también con su familia. Si el primer adulto no lo escucha, puede acudir a otro que lo cuide. Si siente que alguien puede hacerle daño, busca apoyo de inmediato. Pensemos en una persona adulta de confianza. Puedes pedir ayuda con pocas palabras y contar más cuando te sientas acompañado.',
    challenges: [
      { question: '¿Cómo puede empezar a pedir ayuda Mateo?', choices: [
        { text: '«Quiero contarte algo y necesito que me ayudes».', helpful: true, feedback: 'Esta frase abre una conversación. No necesita explicarlo perfectamente.' },
        { text: 'Guardárselo para no preocupar a nadie.', helpful: false, feedback: 'Las personas que lo cuidan necesitan saber qué pasa para poder ayudar.' },
      ] },
      { question: 'Si un adulto no escucha, ¿qué puede hacer?', choices: [
        { text: 'Buscar a otro adulto de confianza.', helpful: true, feedback: 'Puede seguir buscando apoyo. Su voz merece atención.' },
        { text: 'Pensar que su problema no importa.', helpful: false, feedback: 'Lo que siente importa. Puede acudir a otro adulto que lo cuide.' },
      ] },
    ],
    practice: 'Con tu familia, identifica a dos adultos a quienes puedas acudir. No necesitas escribir sus nombres aquí.', adult: 'Acuerden adultos y lugares de apoyo reales. Si hay amenazas o peligro, priorice la protección y busque ayuda local.', bible: 'Eclesiastés 4:9–10 · Acompañarnos y ayudarnos tiene valor.',
  },
  {
    id: 'acompanamos', title: 'Somos buenos amigos', subtitle: 'Acompaño sin ponerme en peligro', icon: 'family', color: '#d8b9ec', scene: 'garden', actors: ['luz', 'ana', 'mateo'],
    paragraphs: [
      'Luz ve que Ana está triste. Se acerca, escucha y le ofrece ir juntas con una persona adulta que las cuide.',
      'Mateo evita reírse de las burlas. Puede decir: «Vamos a jugar de una manera que cuide a todos». Si hay peligro, busca ayuda adulta.',
      'Jesús contó la historia del buen samaritano: una persona se detuvo para cuidar a alguien que necesitaba ayuda. También podemos acompañar con amabilidad.',
    ],
    narration: 'Luz ve que Ana está triste. Se acerca, escucha y le ofrece ir juntas con una persona adulta que las cuide. Mateo evita reírse de las burlas. Puede decir: Vamos a jugar de una manera que cuide a todos. Si hay peligro, busca ayuda adulta. Jesús contó la historia del buen samaritano: una persona se detuvo para cuidar a alguien que necesitaba ayuda. También podemos acompañar con amabilidad. Un buen amigo escucha y ayuda a buscar apoyo. Acompañar no significa ponerse en peligro.',
    challenges: [
      { question: '¿Qué puede hacer Luz para acompañar a Ana?', choices: [
        { text: 'Escucharla y ofrecer ir juntas con un adulto.', helpful: true, feedback: 'Escuchar y acompañar a buscar ayuda son formas de cuidar.' },
        { text: 'Decirle que no sea tan sensible.', helpful: false, feedback: 'Podemos tomar en serio sus sentimientos y escuchar sin juzgar.' },
      ] },
      { question: '¿Qué puede hacer Mateo si ve una situación peligrosa?', choices: [
        { text: 'Ir por ayuda de un adulto que pueda protegerlos.', helpful: true, feedback: 'La seguridad importa. Los adultos pueden intervenir y proteger.' },
        { text: 'Intervenir solo aunque pueda salir lastimado.', helpful: false, feedback: 'No tiene que ponerse en peligro para ser un buen amigo.' },
      ] },
    ],
    practice: 'Elige un gesto amable para hoy: escuchar, incluir a alguien o acompañar a buscar ayuda.', adult: 'Practiquen cómo apoyar sin asumir responsabilidades de protección que corresponden a los adultos.', bible: 'Lucas 10:25–37 · Parábola del buen samaritano, contada con palabras propias.',
  },
  {
    id: 'reparamos', title: 'Roko aprende a cuidar', subtitle: 'Escucho y reparo lo que hice', icon: 'leaf', color: '#ffa98f', scene: 'school', actors: ['roko', 'ana', 'escalito'],
    paragraphs: [
      'Roko escucha a Ana y comprende que su broma le hizo daño. Escalito lo invita a pensar cómo puede cuidar mejor al grupo.',
      'Roko dice: «Siento haberme burlado. Voy a parar». Deja la burla y pregunta cómo puede reparar lo que hizo.',
      'Ana puede necesitar tiempo. Una disculpa no obliga a aceptar otra burla ni a volver a jugar enseguida. Todos pueden aprender a tratar mejor a los demás.',
    ],
    narration: 'Roko escucha a Ana y comprende que su broma le hizo daño. Escalito lo invita a pensar cómo puede cuidar mejor al grupo. Roko dice: Siento haberme burlado. Voy a parar. Deja la burla y pregunta cómo puede reparar lo que hizo. Ana puede necesitar tiempo. Una disculpa no obliga a aceptar otra burla ni a volver a jugar enseguida. Todos pueden aprender a tratar mejor a los demás. Reparar empieza por escuchar, detener lo que lastima y cambiar nuestras acciones. Pensemos qué puede hacer Roko.',
    challenges: [
      { question: '¿Qué muestra que Roko quiere reparar lo que hizo?', choices: [
        { text: 'Escuchar, disculparse y detener las burlas.', helpful: true, feedback: 'Las acciones también cuentan: reparar incluye dejar de lastimar.' },
        { text: 'Decir «era una broma» y seguir haciéndolo.', helpful: false, feedback: 'Si una broma lastima, necesita detenerse. Roko puede escuchar y cambiar.' },
      ] },
      { question: '¿Qué puede decidir Ana después de la disculpa?', choices: [
        { text: 'Tomarse tiempo y mantener sus límites.', helpful: true, feedback: 'Puede necesitar tiempo y apoyo. Sus límites siguen importando.' },
        { text: 'Aceptar cualquier nueva burla para ser buena amiga.', helpful: false, feedback: 'La amistad cuida. Ana puede pedir respeto y mantener sus límites.' },
      ] },
    ],
    practice: 'Con un adulto, practica: «Siento haber hecho… Voy a cambiar… ¿Cómo puedo reparar?».', adult: 'Trabaje con el niño que molesta sin etiquetarlo como malo. Ayúdelo a comprender el impacto, detener la conducta y reparar.', bible: 'Efesios 4:32 · La bondad y el cuidado también se muestran con acciones.',
  },
  {
    id: 'mi-valor', title: 'Un lugar para todos', subtitle: 'Mi valor no depende de una burla', icon: 'sun', color: '#ffdf7c', scene: 'garden', actors: ['escalito', 'luz', 'lupi'],
    paragraphs: [
      'Escalito reúne a sus amigos. Cada uno tiene una manera distinta de aprender, jugar y expresar lo que siente.',
      'En el Evangelio de Marcos, Jesús recibe a los niños con cariño. Esta historia nos invita a darles un lugar y escucharlos.',
      'Una burla no decide cuánto vales. Mereces cuidado y respeto. Puedes disfrutar, poner límites y buscar a las personas adultas que te acompañan.',
    ],
    narration: 'Escalito reúne a sus amigos. Cada uno tiene una manera distinta de aprender, jugar y expresar lo que siente. En el Evangelio de Marcos, Jesús recibe a los niños con cariño. Esta historia nos invita a darles un lugar y escucharlos. Una burla no decide cuánto vales. Mereces cuidado y respeto. Puedes disfrutar, poner límites y buscar a las personas adultas que te acompañan. Recuerda tres ideas: mi voz importa, puedo pedir ayuda y también puedo cuidar a mis amigos. Ahora practiquemos lo aprendido.',
    challenges: [
      { question: '¿Qué puedes recordar si alguien se burla de ti?', choices: [
        { text: '«Merezco respeto y puedo buscar apoyo».', helpful: true, feedback: 'Tu valor no depende de una burla. Las personas que te cuidan pueden ayudar.' },
        { text: '«La burla demuestra que no valgo».', helpful: false, feedback: 'Una burla no define tu valor. Mereces ser escuchado y cuidado.' },
      ] },
      { question: '¿Qué aprendimos con Escalito y sus amigos?', choices: [
        { text: 'Expresar lo que siento, cuidar mis límites y pedir ayuda.', helpful: true, feedback: 'Estas son herramientas para practicar con personas que te cuidan.' },
        { text: 'Que ser valiente significa nunca tener miedo.', helpful: false, feedback: 'Sentir miedo no te hace menos valiente. Pedir apoyo también es valioso.' },
      ] },
    ],
    practice: 'Comparte con tu familia una frase que te ayude a pedir apoyo cuando lo necesites.', adult: 'Refuerce la dignidad del niño sin prometer que la fe o una actividad evitarán todos los problemas.', bible: 'Marcos 10:13–16 · Relato original basado en Jesús y los niños.',
  },
];

export function lessonById(id: string): Lesson | undefined {
  return lessons.find(lesson => lesson.id === id);
}
