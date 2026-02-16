/**
 * Fixed Ramadan kids story template. No Gemini for story — same scenes every time.
 * Only the child's name, pronoun, and face (via reference photo) change.
 * Single-character rule: only the kid appears in every image; family exists in text only.
 */
import type { UserInput, StoryPlan, Scene } from './types';

export const RAMADAN_INNER_SCENES = 6;
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

/** Synopsis template per language */
const SYNOPSIS: Record<Lang, string> = {
  French:
    "{{name}} découvre le Ramadan : les préparatifs, le premier suhoor, l'iftar en famille, les moments partagés, le don et la générosité, puis la fête de l'Eid. Une histoire bienveillante où {{pronoun}} vit chaque étape avec le cœur.",
  English:
    "{{name}} discovers Ramadan: preparing for the month, first suhoor, iftar with family, moments together, giving and generosity, and Eid celebration. A heartwarming story where {{pronoun}} lives each step with an open heart.",
  Arabic:
    "{{name}} يكتشف رمضان: الاستعداد والشوق، أول سحور، إفطار مع العائلة، لحظات معاً، العطاء والكرم، ثم عيد الفطر. قصة دافئة يعيش فيها {{pronoun}} كل خطوة بقلب مفتوح.",
  Spanish:
    "{{name}} descubre el Ramadán: los preparativos, el primer suhur, el iftar en familia, los momentos juntos, dar y generosidad, y la fiesta del Eid. Una historia entrañable donde {{pronoun}} vive cada paso con el corazón abierto.",
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

/** Fixed scene templates: 6 inner scenes. Content per language; prompt same for all (composition only). */
const RAMADAN_SCENES: RamadanSceneTemplate[] = [
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
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in festive but modest clothing, smiling, in a bright cheerful setting (e.g. home or soft outdoor). Eid celebration mood. Only the child in frame.',
      'LEFT'
    ),
    content: {
      French: {
        title: "La fête de l'Eid",
        description: "{{name}} fête l'Eid",
        storyText:
          "Le Ramadan s'achève. C'est l'Eid ! {{name}} est heureux. {{pronounCap}} a vécu un beau mois : patience, partage et gratitude. {{name}} garde tout ça dans son cœur et fête avec joie la fin de ce voyage.",
      },
      English: {
        title: 'Eid celebration',
        description: "{{name}} celebrates Eid",
        storyText:
          "Ramadan has ended. It's Eid! {{name}} is happy. {{pronounCap}} lived a beautiful month: patience, sharing and gratitude. {{name}} keeps all of that in {{pronounPossessive}} heart and celebrates the end of this journey with joy.",
      },
      Arabic: {
        title: 'عيد الفطر',
        description: '{{name}} يحتفل بالعيد',
        storyText:
          "انتهى رمضان. إنه العيد! {{name}} سعيد. {{pronounCap}} عاش شهراً جميلاً: صبر ومشاركة وشكر. {{name}} يحتفظ بكل ذلك في قلبه ويحتفل بنهاية هذه الرحلة بفرح.",
      },
      Spanish: {
        title: 'La fiesta del Eid',
        description: '{{name}} celebra el Eid',
        storyText:
          "El Ramadán termina. ¡Es el Eid! {{name}} está feliz. {{pronounCap}} vivió un mes hermoso: paciencia, compartir y gratitud. {{name}} guarda todo eso en su corazón y celebra con alegría el final de este viaje.",
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

  // Inner scenes (1 to 6)
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

  // Back cover (index 7)
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
