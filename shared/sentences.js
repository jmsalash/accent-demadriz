// The accents to practise and the fixed practice sentences, grouped by the sound each one trains.

export const ACCENTS = Object.freeze([
  { id: 'en-GB', label: 'British English', language: 'English',
    voiceNote: 'Speak with a clear, natural British Received Pronunciation accent, like a BBC newsreader: non-rhotic, with British vowels.' },
  { id: 'en-US', label: 'American English', language: 'English',
    voiceNote: 'Speak with a clear, natural General American accent, like a US national newsreader: rhotic, with American vowels and the flap t.' },
  { id: 'es-ES', label: 'Spanish (Spain)', language: 'Spanish',
    voiceNote: 'Speak the Spanish of Spain with a clear, natural Castilian accent, like a newsreader from Madrid, with the "th" sound for z and ce/ci.' },
  { id: 'es-419', label: 'Spanish (Latin America)', language: 'Spanish',
    voiceNote: 'Speak neutral Latin American Spanish with a clear, natural accent, like an international newsreader, with seseo (z and ce/ci sound like s).' },
  { id: 'fr-FR', label: 'French (France)', language: 'French',
    voiceNote: 'Speak the French of France with a clear, natural Parisian accent, like a newsreader on French national radio, with the uvular r and clear nasal vowels.' },
  { id: 'nl-NL', label: 'Dutch (Netherlands)', language: 'Dutch',
    voiceNote: 'Speak the Dutch of the Netherlands with a clear, natural standard accent, like a newsreader on Dutch national television, with the harsh g and ch of the Randstad.' },
  { id: 'it-IT', label: 'Italian (Italy)', language: 'Italian',
    voiceNote: 'Speak standard Italian with a clear, natural accent, like a newsreader on Italian national television, with rolled r and clearly held double consonants.' },
]);

export const NATIVE_LANGUAGES = Object.freeze([
  'Arabic', 'Bengali', 'Catalan', 'Chinese (Cantonese)', 'Chinese (Mandarin)', 'Dutch', 'English', 'French', 'German',
  'Greek', 'Hindi', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Persian', 'Polish', 'Portuguese', 'Romanian',
  'Russian', 'Spanish', 'Swedish', 'Tagalog', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese',
]);

const ENGLISH = [
  ['th (think, this)', [
    'I think three of them were there on Thursday.',
    'This is the thing my brother thought about.',
    'They threw the ball through the window.',
    'Both of those clothes are worth thirty pounds.',
    'My mother and father gather together in the north.',
  ]],
  ['ship/sheep vowels', [
    'Please sit in this seat for a bit.',
    'The ship will leave the beach at six.',
    'He will feel ill if he eats it.',
    'Live here and leave the green hill in peace.',
    'Fill the bin with clean sheets.',
  ]],
  ['r', [
    'Robert ran right around the red rock.',
    'Rachel really likes rice and fresh bread.',
    'The rain in the river reached the road.',
    'Try to write a short report every Friday.',
    'Grandma brought three bright green apples.',
  ]],
  ['v vs b and w', [
    'Very few visitors visit the village in winter.',
    'Vicky bought a big black van.',
    'We walked over to the vet with the wet dog.',
    'Bill voted for the best value of the evening.',
    'The vine by the window was very well watered.',
  ]],
  ['h', [
    'Harry hopes to have his house ready by half past.',
    'How high is the hill behind the hotel?',
    'Her husband hurt his hand at home.',
    'Have a happy holiday in Hawaii.',
    'He held the heavy hammer in his hand.',
  ]],
  ['schwa and word stress', [
    'I went to the countryside to pick up flowers.',
    'The photographer took a photograph of the banana.',
    'A cup of tea and a piece of chocolate, please.',
    'The comfortable vegetable restaurant opens at seven.',
    'Today we are going to the doctor about the problem.',
  ]],
  ['final consonants', [
    'I asked him to fix the desk next week.',
    'She cooked and cleaned and walked the dog.',
    'The cats jumped on the bed last night.',
    'He looked at the old red car and laughed.',
    'Six lists of texts were sent on the first.',
  ]],
];

const ENGLISH_GB = ['non-rhotic r and t in water', [
  'The water in the bottle is better than butter.',
  'Her father parked the car near the farm.',
  'Can I ask for a glass of water after dinner?',
  'The weather forecast is for a dark afternoon.',
  'Peter started a new chapter of his book in March.',
]];

const ENGLISH_US = ['flap t and r after vowels', [
  'The water in the bottle is better than butter.',
  'Her father parked the car near the farm.',
  'A little bit of city traffic made us late.',
  'The weather forecast is for a dark afternoon.',
  'Turn the computer on later, after the party.',
]];

const SPANISH = [
  ['tapped r and rr', [
    'El perro corre por la carretera.',
    'Pero el perro del barrio es muy rápido.',
    'Ramón compró una guitarra roja en Roma.',
    'El carro rojo para cerca del río.',
    'Tres tristes tigres tragaban trigo en un trigal.',
  ]],
  ['five pure vowels', [
    'Ana va a casa a cenar con su mamá.',
    'El bebé de Pepe tiene sed.',
    'Mi primo vive en Lima y pinta mucho.',
    'Todo lo que tomó Paco fue poco.',
    'Una luna oscura cubre el cielo de agosto.',
  ]],
  ['j and soft g', [
    'Jorge juega en el jardín con su hijo.',
    'El general dejó la jaula junto al gimnasio.',
    'Mi jefe trabaja los jueves en Jerez.',
    'La gente joven bebe jugo de naranja.',
    'José dijo que el viaje fue genial.',
  ]],
  ['ll and y', [
    'Yo me llamo Guillermo y llego mañana.',
    'La lluvia llena la calle de agua.',
    'Ayer vi una estrella brillante en la playa.',
    'El pollo amarillo está en la silla.',
    'Ya llevo la llave del castillo.',
  ]],
  ['soft d between vowels', [
    'Todo el mundo ha comido helado.',
    'Mi madre ha cocinado un pescado delicioso.',
    'Cada día estudio en la ciudad.',
    'Los soldados han cansado al dragón.',
    'Ha pedido nada más que un vaso de agua.',
  ]],
  ['ñ', [
    'El niño pequeño sueña con la montaña.',
    'Mañana voy a España con mi cuñado.',
    'La araña se esconde en el baño.',
    'Este año la señora enseña a bailar.',
    'El otoño en la montaña es muy extraño.',
  ]],
  ['b and v as one sound', [
    'Vamos a ver a Beatriz en el barco.',
    'El vino blanco viene de Valencia.',
    'Víctor bebe agua con las uvas.',
    'La vaca vive en el valle verde.',
    'Bueno, vale, vuelvo el viernes.',
  ]],
];

const SPANISH_ES = ['z and ce/ci (Spain)', [
  'La cerveza de Zaragoza está en la cocina.',
  'Cinco zorros cazan cerca del pozo.',
  'Hace calor en el centro de la ciudad.',
  'Necesito un vaso de zumo para la cena.',
  'La princesa cruzó la plaza con zapatos azules.',
]];

const SPANISH_419 = ['z and ce/ci as s (seseo)', [
  'La cerveza de Zaragoza está en la cocina.',
  'Cinco zorros cazan cerca del pozo.',
  'Hace calor en el centro de la ciudad.',
  'Necesito un vaso de jugo para la cena.',
  'La princesa cruzó la plaza con zapatos azules.',
]];

const FRENCH = [
  ['French r', [
    'Le rat rouge court dans la rue.',
    'Robert regarde la rivière à Paris.',
    'Trois frères arrivent par le train.',
    'Il faut prendre la route vers la mer.',
    'Je préfère rester ici ce soir.',
  ]],
  ['u and ou', [
    'Tu as vu la tortue dans la rue ?',
    'Tout le monde joue sous la lune.',
    'Il a bu du jus sur le mur.',
    'Où est le bus pour Toulouse ?',
    'Je voudrais une soupe et du sucre.',
  ]],
  ['nasal vowels', [
    'Un bon vin blanc pour maman.',
    'Le pain du matin est encore chaud.',
    'Mon oncle chante dans le jardin.',
    'Il prend le train de cinq heures.',
    'Nous avons vingt ans au printemps.',
  ]],
  ['é, è and the soft e', [
    'Le bébé a été réveillé très tôt.',
    'Mon père préfère la crème fraîche.',
    'Je le demande à ce petit garçon.',
    'Elle est née en février dernier.',
    'Ce matin, le chemin était mouillé.',
  ]],
  ['eu and œu', [
    'Mon neveu a les yeux bleus.',
    'Ma sœur a peur de leur chien.',
    'Il pleut un peu sur le feu.',
    'Deux œufs pour le jeune docteur.',
    'Le vieux monsieur est heureux.',
  ]],
  ['s and z', [
    'Le poisson et le poison ne sont pas pareils.',
    'Nous avons choisi une maison rose.',
    'Le dessert est sur la chaise.',
    'Ils ont onze cousins à Toulouse.',
    'La saison des roses commence en mai.',
  ]],
  ['j and ch', [
    'Je joue avec le chat de Jacques.',
    'Le chef cherche un joli jardin.',
    'Jean mange des choux chaque jeudi.',
    'Ce jeune chien est très gentil.',
    'Charlotte achète un joli chapeau rouge.',
  ]],
  ['gn and ill', [
    'La montagne est magnifique en juin.',
    'Ma fille a trouvé une feuille jaune.',
    'Le champagne vient de cette campagne.',
    'Il travaille avec une bouteille de vin.',
    'Agnès signe le papier au soleil.',
  ]],
];

const DUTCH = [
  ['g and ch', [
    'Goedemorgen, ik ga graag naar Groningen.',
    'De grote hond ligt in het gras.',
    'Acht lachende kinderen zingen een liedje.',
    'Gisteren regende het de hele dag.',
    'Het is gezellig op de gracht in Gouda.',
  ]],
  ['ui', [
    'Het huis staat buiten bij de tuin.',
    'De muis zit onder de luie stoel.',
    'Ik zie een bruine duif op het dak.',
    'Mijn buurman drinkt sap uit een kruik.',
    'Er ligt een ui in de keuken.',
  ]],
  ['ij and ei', [
    'Mijn klein meisje is blij.',
    'Wij rijden naar het ijs in mei.',
    'De trein is weer op tijd.',
    'Ik schrijf een brief met een pen van mijn vriend.',
    'Wij eten een ei bij het ontbijt.',
  ]],
  ['eu', [
    'De deur van de keuken is geel.',
    'Mijn neus jeukt een beetje.',
    'Wat een mooie kleur heeft die bloem!',
    'De sleutel ligt in de keuken.',
    'Ik heb geen keus, zei de reus.',
  ]],
  ['long and short vowels', [
    'De man heeft de maan gezien.',
    'Ik zat op de zaak bij de bakker.',
    'De pot staat naast de boot.',
    'Ik heb een pen en een peen gekocht.',
    'Wil je een vis of een vies broodje?',
  ]],
  ['oe and u', [
    'Het boek ligt op de bus.',
    'De koe staat in de groene wei.',
    'Mijn moeder zoekt de bus naar Utrecht.',
    'Ik zoek mijn hoed in de bus.',
    'De jurk is duur, maar de schoen is goedkoop.',
  ]],
  ['v, f and w', [
    'Vier vissen zwemmen in het water.',
    'Mijn vader fietst elke woensdag.',
    'Wat wil je vandaag voor de vrouw kopen?',
    'De wind waait door het venster.',
    'Femke woont in een warm, fijn huis.',
  ]],
  ['sch', [
    'Het schip vaart naar Scheveningen.',
    'De school heeft een schone schoorsteen.',
    'Ik schrijf op een schoon schrift.',
    'Schaatsen is mijn favoriete sport.',
    'Het schaap staat bij de schuur.',
  ]],
];

const ITALIAN = [
  ['double consonants', [
    'La nonna mangia la pasta alle otto.',
    'Il gatto è sopra il letto.',
    'Anna ha comprato una bella borsa rossa.',
    'Domani faccio un viaggio in treno.',
    'La pizza è troppo calda per mangiarla.',
  ]],
  ['rolled r', [
    'Roberto corre verso la torre.',
    'Il ramarro rosso è sul muro.',
    'Tre treni arrivano a Roma stasera.',
    'Ricordo il mare e la terra di Sardegna.',
    'Il carro porta ferro e terra.',
  ]],
  ['gl', [
    'Mio figlio mangia l\'aglio.',
    'La famiglia beve un bicchiere di latte con la paglia.',
    'Le foglie cadono dagli alberi a luglio.',
    'Voglio una bottiglia di olio.',
    'La moglie sceglie il biglietto.',
  ]],
  ['gn', [
    'Ogni giorno mangio gli gnocchi.',
    'Il signore legge in montagna.',
    'Il bagno è vicino alla vigna.',
    'Sogno la Spagna e la Sardegna.',
    'Il ragno disegna una rete sul legno.',
  ]],
  ['hard and soft c', [
    'Il cane mangia la cena in cucina.',
    'Ciao, la cioccolata è sul cuscino.',
    'Chiara cerca le chiavi della casa.',
    'Cento amici vanno al cinema.',
    'Il cuoco cucina i ceci con il riso.',
  ]],
  ['hard and soft g', [
    'Giorgio gioca nel giardino con il gatto.',
    'Il gelato ha un gusto di gianduia.',
    'I ghiri dormono sotto i funghi.',
    'Gina gira per la galleria.',
    'Oggi il gelataio regala un gelato.',
  ]],
  ['open and closed e and o', [
    'Il bene e la pesca sono sul tavolo.',
    'La rosa è bella, ma la corsa è lunga.',
    'Pietro beve il tè con il pepe.',
    'Ho visto un poco di sole sul colle.',
    'Il cuore del nonno è forte e buono.',
  ]],
  ['z and sc', [
    'La zia mangia lo zucchero sulla piazza.',
    'Lo zaino della ragazza è pieno di pezzi.',
    'Esco con la sciarpa e scendo le scale.',
    'Il pesce nuota vicino alla scogliera.',
    'Conosci la scienza della pizza?',
  ]],
];

function build(id, groups) {
  const out = [];
  for (const [sound, texts] of groups) for (const text of texts) out.push({ id: `${id}-${String(out.length + 1).padStart(2, '0')}`, text, sound });
  return Object.freeze(out.map(Object.freeze));
}

const LISTS = {
  'en-GB': build('en-GB', [...ENGLISH, ENGLISH_GB]),
  'en-US': build('en-US', [...ENGLISH, ENGLISH_US]),
  'es-ES': build('es-ES', [...SPANISH, SPANISH_ES]),
  'es-419': build('es-419', [...SPANISH, SPANISH_419]),
  'fr-FR': build('fr-FR', FRENCH),
  'nl-NL': build('nl-NL', DUTCH),
  'it-IT': build('it-IT', ITALIAN),
};

// A short text to read aloud first, covering the important sounds of each accent, so the coach can hear which ones
// need the most work.
const READING_EN = [
  'I think three of my brothers will visit the village this Thursday.',
  'We will leave the ship at the beach and sit on a green hill.',
  'Robert has a very heavy black bag, but he is happy to carry it.',
  'The photographer asked for a cup of tea and a piece of chocolate.',
  'Then we walked back, laughed, and looked at the bright red sky.',
];
const READINGS = {
  'en-GB': [...READING_EN, 'Her father started a new chapter, and I had a glass of water after dinner.'],
  'en-US': [...READING_EN, 'Her father started a new chapter, and a little city traffic made us later than ever.'],
  'es-ES': [
    'El perro de Ramón corre por la carretera cerca del río.',
    'Ana, Pepe, Lima, Paco y Lucía cenan juntos en una casa pequeña.',
    'Jorge y su hijo juegan en el jardín con la gente del gimnasio.',
    'Yo me llamo Guillermo, y ayer llegó la lluvia a la playa amarilla.',
    'Todo el mundo ha comido helado en la ciudad, y el niño sueña con España.',
    'Víctor bebe vino blanco, y la princesa cruzó la plaza con zapatos azules.',
  ],
};
READINGS['es-419'] = READINGS['es-ES'].map((l) => l.replace('sueña con España', 'sueña con la montaña'));
READINGS['fr-FR'] = [
  'Robert regarde la rivière rouge et prend le train pour Paris.',
  'Tu as vu tout le monde jouer sous la lune avec la tortue ?',
  'Mon oncle boit un bon vin blanc avec du pain le matin.',
  'Le bébé de mon père a été réveillé très tôt ce matin.',
  'Ma sœur a peur des deux vieux chiens aux yeux bleus.',
  'Je cherche un joli poisson rose pour la maison de Jacques, à la montagne.',
];
READINGS['nl-NL'] = [
  'Goedemorgen, ik ga graag met acht kinderen naar de gracht.',
  'Het huis van mijn buurman staat buiten bij een bruine tuin.',
  'Mijn klein meisje rijdt blij met de trein in mei.',
  'De deur van de keuken heeft een leuke gele kleur.',
  'De man zag de maan, en mijn moeder zoekt haar boek in de bus.',
  'Mijn vader fietst op woensdag met het schip naar Scheveningen.',
];
READINGS['it-IT'] = [
  'La nonna mangia la pasta alle otto con il gatto sul letto.',
  'Roberto corre verso la torre rossa di Roma.',
  'Mio figlio e la sua famiglia vanno in montagna ogni giorno.',
  'Chiara cerca le chiavi e la cioccolata in cucina.',
  'Giorgio gioca in giardino e mangia un gelato con i funghi.',
  'La zia beve il tè sulla piazza, poi esce con la sciarpa e scende le scale.',
];

export const readingFor = (accentId) => { sentencesFor(accentId); return READINGS[accentId]; };

// The sound groups of an accent, in the order they are practised.
export const soundsFor = (accentId) => [...new Set(sentencesFor(accentId).map((s) => s.sound))];

export const accentById = (id) => ACCENTS.find((a) => a.id === id) || null;

export function sentencesFor(accentId) {
  const list = LISTS[accentId];
  if (!list) throw new Error(`unknown accent: ${accentId}`);
  return list;
}

// Where to carry on: the first sentence not done yet, or -1 when all are done.
export function nextIndex(accentId, doneIds = []) {
  const done = new Set(doneIds);
  return sentencesFor(accentId).findIndex((s) => !done.has(s.id));
}
