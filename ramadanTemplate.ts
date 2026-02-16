/**
 * Fixed Ramadan kids story template. No Gemini for story — same scenes every time.
 * Only the child's name, pronoun, and face (via reference photo) change.
 * Single-character rule: only the kid appears in every image; family exists in text only.
 */
import type { UserInput, StoryPlan, Scene } from './types';

export const RAMADAN_INNER_SCENES = 15;
const TOTAL_SCENES = RAMADAN_INNER_SCENES + 2; // front cover + back cover
const BACK_COVER_INDEX = RAMADAN_INNER_SCENES + 1;

type Lang = 'French' | 'English' | 'Arabic' | 'Spanish';

interface SceneContent {
  title: string;
  storyText: string;
  description: string;
}

interface RamadanSceneTemplate {
  /** Image prompt template; use {{STORY_TEXT}} for the resolved scene text. Same composition every time; only the child. */
  promptTemplate: string;
  /** Per-language content */
  content: Record<Lang, SceneContent>;
}

const SINGLE_CHARACTER_RULE =
  'Only the main character (the child) must appear; no other people or faces in the scene.';

function getPronouns(
  language: string,
  gender: string
): { pronoun: string; pronounCap: string; pronounPossessive: string } {
  const isFemale = (gender || '').toLowerCase().includes('female') || (gender || '').toLowerCase() === 'f';
  switch (language) {
    case 'French':
      return {
        pronoun: isFemale ? 'elle' : 'il',
        pronounCap: isFemale ? 'Elle' : 'Il',
        pronounPossessive: isFemale ? 'sa' : 'son',
      };
    case 'Arabic':
      return {
        pronoun: isFemale ? 'هي' : 'هو',
        pronounCap: isFemale ? 'هي' : 'هو',
        pronounPossessive: isFemale ? 'ها' : 'ه',
      };
    case 'Spanish':
      return {
        pronoun: isFemale ? 'ella' : 'él',
        pronounCap: isFemale ? 'Ella' : 'Él',
        pronounPossessive: isFemale ? 'su' : 'su',
      };
    case 'English':
    default:
      return {
        pronoun: isFemale ? 'she' : 'he',
        pronounCap: isFemale ? 'She' : 'He',
        pronounPossessive: isFemale ? 'her' : 'his',
      };
  }
}

function resolvePlaceholders(
  text: string,
  name: string,
  pronoun: string,
  pronounCap: string,
  pronounPossessive: string
): string {
  return text
    .replace(/\{\{name\}\}/g, name || '')
    .replace(/\{\{pronounCap\}\}/g, pronounCap)
    .replace(/\{\{pronounPossessive\}\}/g, pronounPossessive)
    .replace(/\{\{pronoun\}\}/g, pronoun);
}

/** Synopsis template per language (chronological 15-scene journey: prepare, moon, suhoor, iftar, through the month to Eid) */
const SYNOPSIS: Record<Lang, string> = {
  French:
    "{{name}} découvre le Ramadan du début à l'Eid : préparatifs et lune, premier suhoor et iftar, patience, calme, entraide et moments en famille, lecture, don et partage, soirées, mi-parcours, derniers jours, puis la fête de l'Eid. Une histoire bienveillante où {{pronoun}} vit chaque étape avec le cœur.",
  English:
    "{{name}} discovers Ramadan from start to Eid: preparing and the moon, first suhoor and iftar, patience, quiet moments, helping and family, reading, giving and sharing, evenings, halfway through, last days, then Eid celebration. A heartwarming story where {{pronoun}} lives each step with an open heart.",
  Arabic:
    "{{name}} يكتشف رمضان من البداية إلى العيد: الاستعداد والقمر وأول سحور وإفطار والصبر والهدوء والمساعدة ولحظات العائلة والقراءة والعطاء والمشاركة والليالي ومنتصف الطريق والأيام الأخيرة ثم العيد. قصة دافئة يعيش فيها {{pronoun}} كل خطوة بقلب مفتوح.",
  Spanish:
    "{{name}} descubre el Ramadán del inicio al Eid: preparativos y luna, primer suhur e iftar, paciencia, calma, ayuda y momentos en familia, lectura, dar y compartir, noches, mitad del camino, últimos días, luego la fiesta del Eid. Una historia entrañable donde {{pronoun}} vive cada paso con el corazón abierto.",
};

/** Front cover title per language ({{name}} = child's name) */
const COVER_TITLE: Record<Lang, string> = {
  French: '{{name}} et les Valeurs du Ramadan',
  English: '{{name}} and the Values of Ramadan',
  Arabic: '{{name}} وقيم رمضان',
  Spanish: '{{name}} y los Valores del Ramadán',
};

/** Front cover image prompt: only the child, Ramadan feel via setting. */
const COVER_PROMPT = `{STYLE_INSTRUCTION} COMPOSITION: A warm, welcoming scene for a children's book. The Main Character (a child) is the ONLY person in the frame, standing or sitting in a cozy interior or soft outdoor setting with subtle Ramadan atmosphere (e.g. soft lights, a calendar or moon motif in the background, warm colors). No other people. TEXT PLACEMENT: The title text must be placed on a CLEAN, UNCLUTTERED area. Leave natural negative space for the text. CHARACTERS: Only "The Main Character" (the child from the reference photo), facing the camera, in comfortable modest clothing. ${SINGLE_CHARACTER_RULE} LOGO PLACEMENT: Space at the bottom center for the logo. TYPOGRAPHY: BOLD, ELEGANT font contrasting with the background. HEADLINE TEXT: [TITLE_PLACEHOLDER]`;

/** Back cover image prompt: only the child waving/smiling. */
const BACK_COVER_PROMPT = `Design a clean, elegant Back Cover. COMPOSITION: TOP AREA: Reserved for the SYNOPSIS text; uncluttered background. CENTER AREA: Only The Main Character (the child from the reference photo), front view, facing the camera, waving goodbye or smiling warmly. ${SINGLE_CHARACTER_RULE} BOTTOM AREA: Reserved for the BRAND MESSAGE. TEXT INSTRUCTION: 1. AT THE TOP: Render the Synopsis text as provided. 2. AT THE BOTTOM: Render the Brand Message. Use the actual text, no placeholders.`;

/** Inner scene prompt template: side-by-side layout, only the child, then TEXT: {{STORY_TEXT}} */
function scenePromptTemplate(sceneDescription: string, characterSide: 'LEFT' | 'RIGHT'): string {
  const charSide = characterSide === 'LEFT' ? 'LEFT' : 'RIGHT';
  const textSide = characterSide === 'LEFT' ? 'RIGHT' : 'LEFT';
  return `you are a professional digital illustrator. STYLE: {STYLE_INSTRUCTION}.
COMPOSITION RULE: STRICT SIDE-BY-SIDE LAYOUT.
- The Main Character (the child) on the ${charSide} side. Uncluttered background on the ${textSide} side for text (e.g. open sky, soft wall, distant landscape). Do NOT use plain white/black.
- CENTER SAFETY: The exact vertical center (50%) is the book spine. Do NOT place important faces or text here.
CHARACTER SAFETY: Use a WIDE SHOT (Medium-Long Shot). Leave margin around the character's head and arms. Do NOT cut off at the edge.
${sceneDescription}
${SINGLE_CHARACTER_RULE}
LAYOUT: Seamless continuous background across the entire width.
TEXT PLACEMENT: Place the text in the uncluttered area, away from the spine and edges. Use a SIMPLE, CLEAN, STANDARD FONT (Serif or Sans-Serif), highly readable. Do NOT use cursive or fancy fonts.
TEXT: {{STORY_TEXT}}`;
}

/** Fixed scene templates: 15 inner scenes in chronological order. Content per language; prompt same for all (composition only). */
const RAMADAN_SCENES: RamadanSceneTemplate[] = [
  // 1: Preparing for Ramadan
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a cozy room at home, looking at a calendar or window with a gentle dawn light. Warm, hopeful mood. The child is the only person visible.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Se préparer pour le Ramadan',
        description: '{{name}} se prépare pour le Ramadan',
        storyText:
          "C'est bientôt le Ramadan ! {{name}} est tout excité. {{pronounCap}} regarde le calendrier et compte les jours. Pendant ce mois, on jeûne, on réfléchit et on fait de son mieux pour être gentil. {{name}} a hâte de vivre cette aventure avec le cœur.",
      },
      English: {
        title: 'Preparing for Ramadan',
        description: '{{name}} prepares for Ramadan',
        storyText:
          "Ramadan is almost here! {{name}} is so excited. {{pronounCap}} looks at the calendar and counts the days. During this month we fast, reflect and try to be kind. {{name}} can't wait to live this adventure with an open heart.",
      },
      Arabic: {
        title: 'الاستعداد لرمضان',
        description: '{{name}} يستعد لرمضان',
        storyText:
          "رمضان قريب! {{name}} متحمس جداً. {{pronounCap}} ينظر إلى التقويم ويعد الأيام. في هذا الشهر نصوم ونفكر ونحاول أن نكون لطيفين. {{name}} لا يطيق صبراً ليعيش هذه المغامرة بقلب مفتوح.",
      },
      Spanish: {
        title: 'Prepararse para el Ramadán',
        description: '{{name}} se prepara para el Ramadán',
        storyText:
          "¡Pronto es Ramadán! {{name}} está muy emocionado. {{pronounCap}} mira el calendario y cuenta los días. En este mes ayunamos, reflexionamos y tratamos de ser amables. {{name}} no puede esperar a vivir esta aventura con el corazón abierto.",
      },
    },
  },
  // 2: Moon and calendar
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child looking at a window or outside at night, gentle moon visible or suggested. Calm, hopeful mood. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'La lune et le calendrier',
        description: '{{name}} compte les jours',
        storyText:
          "{{name}} a appris que le Ramadan suit la lune. Chaque soir, {{pronoun}} guette le croissant. Quand on le voit, c'est le début d'un nouveau jour de jeûne. {{pronounCap}} aime compter les jours jusqu'à l'Eid.",
      },
      English: {
        title: 'The moon and the calendar',
        description: '{{name}} counts the days',
        storyText:
          "{{name}} learned that Ramadan follows the moon. Each evening {{pronoun}} looks for the crescent. When we see it, a new day of fasting begins. {{pronounCap}} loves counting the days until Eid.",
      },
      Arabic: {
        title: 'القمر والتقويم',
        description: '{{name}} يعد الأيام',
        storyText:
          "تعلم {{name}} أن رمضان يتبع القمر. كل مساء {{pronoun}} يبحث عن الهلال. عندما نراه، يبدأ يوم جديد من الصيام. {{pronounCap}} يحب عد الأيام حتى العيد.",
      },
      Spanish: {
        title: 'La luna y el calendario',
        description: '{{name}} cuenta los días',
        storyText:
          "{{name}} aprendió que el Ramadán sigue la luna. Cada noche {{pronoun}} busca el creciente. Cuando lo vemos, empieza un nuevo día de ayuno. {{pronounCap}} ama contar los días hasta el Eid.",
      },
    },
  },
  // 3: First suhoor
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child at a small table at home in the early morning, with a simple breakfast (e.g. dates, water, gentle light). Dawn atmosphere. The child is the only person in the scene.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Le premier suhoor',
        description: "Le premier suhoor de {{name}}",
        storyText:
          "Ce matin, {{name}} s'est réveillé avant le soleil pour le suhoor. C'est le repas du petit matin qu'on partage en famille avant de jeûner. {{pronounCap}} a mangé des dattes et bu de l'eau. {{name}} était fier de commencer sa première journée de Ramadan.",
      },
      English: {
        title: 'First suhoor',
        description: "{{name}}'s first suhoor",
        storyText:
          "This morning {{name}} woke up before the sun for suhoor. It's the early meal we share with family before we fast. {{pronounCap}} had dates and water. {{name}} was proud to start {{pronounPossessive}} first day of Ramadan.",
      },
      Arabic: {
        title: 'أول سحور',
        description: 'أول سحور لـ {{name}}',
        storyText:
          "هذا الصباح استيقظ {{name}} قبل الشمس للسحور. إنها وجبة الفجر التي نتشاركها مع العائلة قبل الصيام. {{pronounCap}} أكل التمر وشرب الماء. {{name}} كان فخوراً أن يبدأ أول يوم له في رمضان.",
      },
      Spanish: {
        title: 'El primer suhur',
        description: 'El primer suhur de {{name}}',
        storyText:
          "Esta mañana {{name}} se despertó antes del sol para el suhur. Es la comida del alba que compartimos en familia antes de ayunar. {{pronounCap}} tomó dátiles y agua. {{name}} estaba orgulloso de empezar su primer día de Ramadán.",
      },
    },
  },
  // 4: First iftar
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child at a table set for iftar (dates, water, simple dishes). Warm evening light. The child is alone at the table, smiling, as if about to break the fast. No other people.',
      'RIGHT'
    ),
    content: {
      French: {
        title: "Le premier iftar",
        description: "{{name}} rompt le jeûne",
        storyText:
          "Le soleil se couche. C'est l'heure de l'iftar ! {{name}} a rompu le jeûne avec une datte et de l'eau, comme on le fait ensemble en famille. {{pronounCap}} a dit merci pour ce moment. {{name}} a senti la joie de partager ce repas après une journée de patience.",
      },
      English: {
        title: 'First iftar',
        description: "{{name}} breaks the fast",
        storyText:
          "The sun sets. It's time for iftar! {{name}} broke the fast with a date and water, the way we do together with family. {{pronounCap}} said thank you for this moment. {{name}} felt the joy of sharing this meal after a day of patience.",
      },
      Arabic: {
        title: 'أول إفطار',
        description: '{{name}} يفطر',
        storyText:
          "غربت الشمس. حان وقت الإفطار! {{name}} أفطر بتمرة وماء، كما نفعل مع العائلة. {{pronounCap}} شكر على هذه اللحظة. {{name}} شعر بفرحة مشاركة هذه الوجبة بعد يوم من الصبر.",
      },
      Spanish: {
        title: 'El primer iftar',
        description: '{{name}} rompe el ayuno',
        storyText:
          "El sol se pone. ¡Es la hora del iftar! {{name}} rompió el ayuno con un dátil y agua, como hacemos en familia. {{pronounCap}} dio las gracias por este momento. {{name}} sintió la alegría de compartir esta comida después de un día de paciencia.",
      },
    },
  },
  // 5: Patience during the day
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in daytime, perhaps near a window or in a room, calm and patient expression. Midday light. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'La patience en journée',
        description: '{{name}} reste patient',
        storyText:
          "En plein jour, {{name}} a parfois soif ou faim. C'est normal pendant le jeûne. {{pronounCap}} choisit la patience et pense à ceux qui n'ont pas toujours à manger. Ça donne du courage.",
      },
      English: {
        title: 'Patience during the day',
        description: '{{name}} stays patient',
        storyText:
          "In the middle of the day {{name}} sometimes feels thirsty or hungry. That's part of fasting. {{pronounCap}} chooses patience and thinks of those who don't always have enough to eat. It gives {{pronoun}} strength.",
      },
      Arabic: {
        title: 'الصبر في النهار',
        description: '{{name}} يتحلى بالصبر',
        storyText:
          "في منتصف النهار يشعر {{name}} أحياناً بالعطش أو الجوع. هذا جزء من الصيام. {{pronounCap}} يختار الصبر ويفكر في من لا يجدون ما يأكلون. ذلك يعطيه قوة.",
      },
      Spanish: {
        title: 'Paciencia durante el día',
        description: '{{name}} mantiene la paciencia',
        storyText:
          "A mediodía {{name}} a veces tiene sed o hambre. Es parte del ayuno. {{pronounCap}} elige la paciencia y piensa en quienes no siempre tienen qué comer. Eso le da fuerza.",
      },
    },
  },
  // 6: Quiet moment
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a quiet corner of a room, peaceful pose, soft light. Calm, reflective mood. Only the child in frame.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Un moment de calme',
        description: '{{name}} se recueille',
        storyText:
          "Parfois {{name}} s'assoit au calme pour réfléchir. Pendant le Ramadan, on prend le temps de dire merci et de penser aux autres. {{pronounCap}} ferme les yeux et sent la paix dans son cœur.",
      },
      English: {
        title: 'A quiet moment',
        description: '{{name}} reflects',
        storyText:
          "Sometimes {{name}} sits quietly to think. During Ramadan we take time to say thank you and think of others. {{pronounCap}} closes {{pronounPossessive}} eyes and feels peace in {{pronounPossessive}} heart.",
      },
      Arabic: {
        title: 'لحظة هدوء',
        description: '{{name}} يتأمل',
        storyText:
          "أحياناً يجلس {{name}} بهدوء ليفكر. في رمضان نأخذ وقتاً لنشكر ونتذكر الآخرين. {{pronounCap}} يغلق عينيه ويشعر بالسلام في قلبه.",
      },
      Spanish: {
        title: 'Un momento de calma',
        description: '{{name}} reflexiona',
        storyText:
          "A veces {{name}} se sienta en silencio para pensar. Durante el Ramadán dedicamos tiempo a dar las gracias y pensar en los demás. {{pronounCap}} cierra los ojos y siente paz en su corazón.",
      },
    },
  },
  // 7: Helping at home
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child tidying or setting a table at home, helpful pose. Warm family atmosphere suggested by setting; only the child visible.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Aider à la maison',
        description: '{{name}} donne un coup de main',
        storyText:
          "{{name}} aide à la maison pendant le Ramadan. Mettre la table, ranger sa chambre : de petits gestes qui font plaisir. {{pronounCap}} apprend que rendre service fait partie des belles valeurs de ce mois.",
      },
      English: {
        title: 'Helping at home',
        description: '{{name}} lends a hand',
        storyText:
          "{{name}} helps at home during Ramadan. Setting the table, tidying {{pronounPossessive}} room: small gestures that bring joy. {{pronounCap}} learns that being helpful is part of the values of this month.",
      },
      Arabic: {
        title: 'المساعدة في البيت',
        description: '{{name}} يساعد',
        storyText:
          "{{name}} يساعد في البيت أثناء رمضان. ترتيب المائدة أو الغرفة: حركات صغيرة تسعد الآخرين. {{pronounCap}} يتعلم أن المساعدة من قيم هذا الشهر.",
      },
      Spanish: {
        title: 'Ayudar en casa',
        description: '{{name}} echa una mano',
        storyText:
          "{{name}} ayuda en casa durante el Ramadán. Poner la mesa, ordenar su habitación: pequeños gestos que alegran. {{pronounCap}} aprende que ayudar es parte de los valores de este mes.",
      },
    },
  },
  // 8: Family moments
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a cozy living space, perhaps holding a book or sitting quietly. Warm, peaceful atmosphere. Family is evoked by the setting (e.g. cushions, warm light) but only the child is visible.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Les moments en famille',
        description: 'Des moments doux avec {{name}}',
        storyText:
          "Les soirées de Ramadan, {{name}} aime les moments calmes à la maison. Parfois on lit, parfois on parle. {{pronounCap}} apprend à être patient et à écouter. Ces moments avec les gens qu'on aime remplissent le cœur de {{name}}.",
      },
      English: {
        title: 'Family moments',
        description: 'Quiet moments with {{name}}',
        storyText:
          "During Ramadan evenings, {{name}} loves quiet moments at home. Sometimes we read, sometimes we talk. {{pronounCap}} learns to be patient and to listen. These moments with the people we love fill {{name}}'s heart.",
      },
      Arabic: {
        title: 'لحظات مع العائلة',
        description: 'لحظات هادئة مع {{name}}',
        storyText:
          "في ليالي رمضان، يحب {{name}} اللحظات الهادئة في البيت. أحياناً نقرأ، أحياناً نتحدث. {{pronounCap}} يتعلم الصبر والاستماع. هذه اللحظات مع من نحب تملأ قلب {{name}}.",
      },
      Spanish: {
        title: 'Momentos en familia',
        description: 'Momentos tranquilos con {{name}}',
        storyText:
          "En las noches de Ramadán, a {{name}} le encantan los momentos tranquilos en casa. A veces leemos, a veces hablamos. {{pronounCap}} aprende a ser paciente y a escuchar. Estos momentos con quienes queremos llenan el corazón de {{name}}.",
      },
    },
  },
  // 9: Reading and learning
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child with a book or looking at something with curiosity, in a cozy corner. Learning mood. Only the child in frame.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Lire et apprendre',
        description: '{{name}} découvre',
        storyText:
          "{{name}} aime lire et apprendre pendant le Ramadan. Des histoires, des mots doux, des choses sur ce mois si spécial. {{pronounCap}} pose des questions et grandit en comprenant mieux.",
      },
      English: {
        title: 'Reading and learning',
        description: '{{name}} discovers',
        storyText:
          "{{name}} loves to read and learn during Ramadan. Stories, kind words, things about this special month. {{pronounCap}} asks questions and grows by understanding more.",
      },
      Arabic: {
        title: 'القراءة والتعلم',
        description: '{{name}} يكتشف',
        storyText:
          "{{name}} يحب القراءة والتعلم في رمضان. قصص وكلمات طيبة وأشياء عن هذا الشهر الخاص. {{pronounCap}} يطرح أسئلة ويكبر بفهم أكثر.",
      },
      Spanish: {
        title: 'Leer y aprender',
        description: '{{name}} descubre',
        storyText:
          "A {{name}} le encanta leer y aprender durante el Ramadán. Historias, palabras amables, cosas sobre este mes tan especial. {{pronounCap}} hace preguntas y crece entendiendo más.",
      },
    },
  },
  // 10: Giving and sharing
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child holding a small gift, a coin box, or a bag of food to give. Kind, generous mood. Setting: home or a neutral place. Only the child is visible.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Donner et partager',
        description: '{{name}} donne avec le cœur',
        storyText:
          "Pendant le Ramadan, {{name}} apprend à donner. Donner un peu de ce qu'on a, ou du temps, ou un sourire, c'est la sadaqa. {{pronounCap}} a préparé un petit geste pour quelqu'un. {{name}} a compris que partager rend le cœur léger.",
      },
      English: {
        title: 'Giving and sharing',
        description: "{{name}} gives from the heart",
        storyText:
          "During Ramadan, {{name}} learns to give. Giving a little of what we have, or our time, or a smile, is sadaqa. {{pronounCap}} prepared a small gesture for someone. {{name}} understood that sharing makes the heart light.",
      },
      Arabic: {
        title: 'العطاء والمشاركة',
        description: '{{name}} يعطي من القلب',
        storyText:
          "في رمضان يتعلم {{name}} العطاء. أن نعطي قليلاً مما لدينا، أو وقتنا، أو ابتسامة، هو صدقة. {{pronounCap}} أعد لمسة صغيرة لأحد. {{name}} فهم أن المشاركة تخفف القلب.",
      },
      Spanish: {
        title: 'Dar y compartir',
        description: '{{name}} da con el corazón',
        storyText:
          "Durante el Ramadán, {{name}} aprende a dar. Dar un poco de lo que tenemos, o nuestro tiempo, o una sonrisa, es sadaqa. {{pronounCap}} preparó un pequeño gesto para alguien. {{name}} entendió que compartir aligera el corazón.",
      },
    },
  },
  // 11: Sharing with others
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child holding a small gift, basket, or package to give. Kind, generous expression. Only the child in frame.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Partager avec les autres',
        description: '{{name}} prépare un don',
        storyText:
          "{{name}} a préparé un petit cadeau pour quelqu'un. Donner, même un peu, rend le cœur léger. {{pronounCap}} sait que la sadaqa peut être un sourire ou un geste gentil, pas seulement de l'argent.",
      },
      English: {
        title: 'Sharing with others',
        description: '{{name}} prepares a gift',
        storyText:
          "{{name}} prepared a small gift for someone. Giving, even a little, makes the heart light. {{pronounCap}} knows that sadaqa can be a smile or a kind gesture, not only money.",
      },
      Arabic: {
        title: 'المشاركة مع الآخرين',
        description: '{{name}} يعد هدية',
        storyText:
          "أعد {{name}} هدية صغيرة لأحد. العطاء، ولو قليل، يخفف القلب. {{pronounCap}} يعرف أن الصدقة قد تكون ابتسامة أو لطفاً، وليس المال فقط.",
      },
      Spanish: {
        title: 'Compartir con los demás',
        description: '{{name}} prepara un regalo',
        storyText:
          "{{name}} preparó un pequeño regalo para alguien. Dar, aunque sea un poco, aligera el corazón. {{pronounCap}} sabe que la sadaqa puede ser una sonrisa o un gesto amable, no solo dinero.",
      },
    },
  },
  // 12: Ramadan evenings
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a cozy evening setting, soft lights, peaceful night mood. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: "Les soirées de Ramadan",
        description: '{{name}} le soir',
        storyText:
          "Le soir, après l'iftar, l'ambiance est douce. {{name}} aime ces moments où la nuit tombe et tout est calme. {{pronounCap}} se sent proche des gens qu'{{pronoun}} aime, même sans les voir dans l'image.",
      },
      English: {
        title: 'Ramadan evenings',
        description: "{{name}} in the evening",
        storyText:
          "In the evening, after iftar, the mood is gentle. {{name}} loves these moments when night falls and everything is calm. {{pronounCap}} feels close to the people {{pronoun}} loves.",
      },
      Arabic: {
        title: 'ليالي رمضان',
        description: '{{name}} في المساء',
        storyText:
          "في المساء بعد الإفطار، الأجواء هادئة. {{name}} يحب هذه اللحظات عندما يرخي الليل وكل شيء ساكن. {{pronounCap}} يشعر بالقرب ممن يحب.",
      },
      Spanish: {
        title: 'Las noches de Ramadán',
        description: '{{name}} por la noche',
        storyText:
          "Por la noche, después del iftar, el ambiente es tranquilo. {{name}} ama esos momentos en que cae la noche y todo está en calma. {{pronounCap}} se siente cerca de quienes quiere.",
      },
    },
  },
  // 13: Halfway through Ramadan
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a cozy room, gentle daylight, hopeful and proud expression. Mid-Ramadan mood. Only the child in frame.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'À mi-chemin du Ramadan',
        description: '{{name}} à mi-parcours',
        storyText:
          "Nous voilà à mi-chemin du Ramadan ! {{name}} est fier de ses efforts. {{pronounCap}} a jeûné, partagé et réfléchi. {{name}} continue avec le cœur plein et garde le cap jusqu'à l'Eid.",
      },
      English: {
        title: 'Halfway through Ramadan',
        description: '{{name}} at the halfway point',
        storyText:
          "We're halfway through Ramadan! {{name}} is proud of {{pronounPossessive}} efforts. {{pronounCap}} has fasted, shared and reflected. {{name}} keeps going with a full heart toward Eid.",
      },
      Arabic: {
        title: 'منتصف رمضان',
        description: '{{name}} في منتصف الطريق',
        storyText:
          "ها نحن في منتصف رمضان! {{name}} فخور بما بذله. {{pronounCap}} صام وشارك وتأمل. {{name}} يواصل بقلب ممتلئ حتى العيد.",
      },
      Spanish: {
        title: 'A mitad del Ramadán',
        description: '{{name}} a mitad de camino',
        storyText:
          "¡Estamos a mitad del Ramadán! {{name}} está orgulloso de sus esfuerzos. {{pronounCap}} ha ayunado, compartido y reflexionado. {{name}} sigue con el corazón lleno hacia el Eid.",
      },
    },
  },
  // 14: Last days / Laylat al-Qadr
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a hopeful, gentle night or dusk setting. Sense of specialness, last days of Ramadan. Only the child in frame.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Les derniers jours',
        description: '{{name}} et la Nuit du Destin',
        storyText:
          "Nous voilà dans les derniers jours du Ramadan. {{name}} a entendu parler de la Nuit du Destin, une nuit si précieuse. {{pronounCap}} garde l'espoir et la gratitude dans son cœur.",
      },
      English: {
        title: 'The last days',
        description: '{{name}} and the Night of Power',
        storyText:
          "We are in the last days of Ramadan. {{name}} has heard about the Night of Power, such a precious night. {{pronounCap}} keeps hope and gratitude in {{pronounPossessive}} heart.",
      },
      Arabic: {
        title: 'الأيام الأخيرة',
        description: '{{name}} وليلة القدر',
        storyText:
          "ها نحن في الأيام الأخيرة من رمضان. سمع {{name}} عن ليلة القدر، ليلة ثمينة. {{pronounCap}} يحتفظ بالأمل والشكر في قلبه.",
      },
      Spanish: {
        title: 'Los últimos días',
        description: '{{name}} y la Noche del Destino',
        storyText:
          "Estamos en los últimos días del Ramadán. {{name}} ha oído hablar de la Noche del Destino, una noche tan preciosa. {{pronounCap}} guarda esperanza y gratitud en su corazón.",
      },
    },
  },
  // 15: Eid (morning + celebration)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in festive but modest clothing, morning light, smiling and ready for Eid. Joyful. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: "L'Eid !",
        description: "{{name}} fête l'Eid",
        storyText:
          "Le Ramadan s'achève. C'est le matin de l'Eid ! {{name}} s'est réveillé avec le cœur léger. {{pronounCap}} a mis {{pronounPossessive}} plus beaux habits et est prêt à fêter. Après un mois de patience, partage et gratitude, la joie est là.",
      },
      English: {
        title: 'Eid!',
        description: "{{name}} celebrates Eid",
        storyText:
          "Ramadan has ended. It's Eid morning! {{name}} woke up with a light heart. {{pronounCap}} put on {{pronounPossessive}} best clothes and is ready to celebrate. After a month of patience, sharing and gratitude, joy is here.",
      },
      Arabic: {
        title: 'العيد!',
        description: '{{name}} يحتفل بالعيد',
        storyText:
          "انتهى رمضان. إنه صباح العيد! استيقظ {{name}} بقلب خفيف. {{pronounCap}} ارتدى أجمل ثيابه وهو مستعد للاحتفال. بعد شهر من الصبر والمشاركة والشكر، الفرح هنا.",
      },
      Spanish: {
        title: '¡Eid!',
        description: '{{name}} celebra el Eid',
        storyText:
          "El Ramadán ha terminado. ¡Es la mañana del Eid! {{name}} se despertó con el corazón ligero. {{pronounCap}} se puso su mejor ropa y está listo para celebrar. Después de un mes de paciencia, compartir y gratitud, la alegría está aquí.",
      },
    },
  },
];

function getLang(input: UserInput): Lang {
  const l = (input.language || 'French').trim();
  if (l === 'Arabic') return 'Arabic';
  if (l === 'English') return 'English';
  if (l === 'Spanish') return 'Spanish';
  return 'French';
}

/**
 * Builds a fixed Ramadan story plan from the template. No Gemini call.
 * Only name and pronoun are substituted in text; images will show only the child (via reference photo).
 */
export function buildRamadanStoryPlan(input: UserInput): StoryPlan {
  const lang = getLang(input);
  const name = input.name?.trim() || 'Child';
  const { pronoun, pronounCap, pronounPossessive } = getPronouns(
    input.language || 'French',
    input.gender || ''
  );

  const resolve = (t: string) => resolvePlaceholders(t, name, pronoun, pronounCap, pronounPossessive);
  const synopsis = resolve(SYNOPSIS[lang] || SYNOPSIS.French);
  const coverTitle = resolve(COVER_TITLE[lang] || COVER_TITLE.French);

  const scenes: Scene[] = [];

  // Front cover (index 0)
  const coverPrompt = COVER_PROMPT.replace('[TITLE_PLACEHOLDER]', coverTitle);
  scenes.push({
    id: 0,
    type: 'front-cover',
    title: coverTitle,
    description: 'Front Cover',
    prompt: coverPrompt,
    storyText: '',
    history: [],
    status: 'idle',
    aspectRatio: '1:1',
    generationRatio: '1:1',
  });

  // Inner scenes (1 to RAMADAN_INNER_SCENES)
  for (let i = 0; i < RAMADAN_SCENES.length; i++) {
    const t = RAMADAN_SCENES[i];
    const content = t.content[lang] || t.content.French;
    const title = resolve(content.title);
    const storyText = resolve(content.storyText);
    const description = resolve(content.description);
    const prompt = t.promptTemplate.replace('{{STORY_TEXT}}', storyText);

    scenes.push({
      id: i + 1,
      type: 'scene',
      title,
      description,
      prompt,
      storyText,
      history: [],
      status: 'idle',
      aspectRatio: '16:9',
      generationRatio: '16:9',
    });
  }

  // Back cover
  const backPrompt = BACK_COVER_PROMPT;
  scenes.push({
    id: BACK_COVER_INDEX,
    type: 'back-cover',
    title: 'Back Cover',
    description: 'Back Cover',
    prompt: backPrompt,
    storyText: '',
    history: [],
    status: 'idle',
    aspectRatio: '1:1',
    generationRatio: '1:1',
  });

  return { synopsis, scenes };
}
