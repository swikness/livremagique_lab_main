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

/** Arabic needs separate male/female content for correct verb conjugation and possessives. */
interface ArabicContentByGender {
  male: SceneContent;
  female: SceneContent;
}

interface RamadanSceneTemplate {
  /** Image prompt template; use {{STORY_TEXT}} for the resolved scene text. Same composition every time; only the child. */
  promptTemplate: string;
  /** Per-language content. For Arabic, use male/female variants. */
  content: Record<Exclude<Lang, 'Arabic'>, SceneContent> & { Arabic: ArabicContentByGender };
}

const SINGLE_CHARACTER_RULE =
  'Only the main character (the child) must appear; no other people or faces in the scene.';

function getPronouns(
  language: string,
  gender: string
): { pronoun: string; pronounCap: string; pronounPossessive: string } {
  const g = (gender || '').toLowerCase();
  const isFemale = g.includes('female') || g === 'f' || g === 'femme';
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

/** Returns true if the string contains Arabic script. */
function hasArabicScript(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s || '');
}

/**
 * Transliterate a Latin-script name to Arabic for display when language is Arabic.
 * If the name already contains Arabic script, returns it as-is.
 */
function nameForArabic(latinName: string): string {
  const n = (latinName || '').trim();
  if (!n) return n;
  if (hasArabicScript(n)) return n;

  const one: Record<string, string> = {
    a: 'ا', b: 'ب', t: 'ت', j: 'ج', h: 'ه', d: 'د', r: 'ر', z: 'ز', s: 'س', f: 'ف', q: 'ق',
    k: 'ك', l: 'ل', m: 'م', n: 'ن', w: 'و', y: 'ي', e: 'ي', i: 'ي', o: 'و', u: 'و',
    c: 'ك', p: 'ب', v: 'ف', g: 'غ', '\'': 'ع', ' ': ' ',
  };
  const digraphs: [string, string][] = [['th', 'ث'], ['sh', 'ش'], ['ch', 'ش'], ['gh', 'غ'], ['dh', 'ذ'], ['kh', 'خ']];

  let out = '';
  const lower = n.toLowerCase();
  let i = 0;
  while (i < lower.length) {
    let found = false;
    for (const [dig, ar] of digraphs) {
      if (lower.slice(i, i + dig.length) === dig) {
        out += ar;
        i += dig.length;
        found = true;
        break;
      }
    }
    if (found) continue;
    const c = lower[i];
    if (i === 0 && c === 'a') out += 'آ'; // alef with madda (e.g. Adam → آدم)
    else if (i === 0 && (c === 'e' || c === 'i')) out += 'إ'; // alef with hamza below
    else
      out += one[c] ?? c;
    i++;
  }
  return out || n;
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

/** Synopsis template per language (chronological 15-scene journey). Arabic has male/female for verb agreement. */
const SYNOPSIS: Record<Exclude<Lang, 'Arabic'>, string> = {
  French:
    "{{name}} vit le Ramadan du début à l'Eid : une intention sincère, la lune et le calendrier, le premier suhoor et iftar, la patience et la gratitude, la prière, l'entraide et les moments en famille, le Coran, le don et la sadaqa, le pardon, les soirées, la mi-parcours, Laylat Al-Qadr et les derniers jours, puis la joie de l'Eid. Une histoire bienveillante où {{pronoun}} découvre les valeurs de ce mois avec le cœur.",
  English:
    "{{name}} lives Ramadan from start to Eid: a sincere intention, the moon and the calendar, first suhoor and iftar, patience and gratitude, prayer, helping and family time, the Quran, giving and sadaqa, forgiveness, peaceful evenings, the halfway point, the last days and Laylat Al-Qadr, then the joy of Eid. A heartwarming story where {{pronoun}} discovers the values of this month with an open heart.",
  Spanish:
    "{{name}} vive el Ramadán del inicio al Eid: una intención sincera, la luna y el calendario, el primer suhur e iftar, la paciencia y la gratitud, la oración, ayuda y momentos en familia, el Corán, dar y sadaqa, el perdón, noches tranquilas, la mitad del camino, los últimos días y Laylat Al-Qadr, y luego la alegría del Eid. Una historia entrañable donde {{pronoun}} descubre los valores de este mes con el corazón abierto.",
};

const SYNOPSIS_ARABIC: { male: string; female: string } = {
  male:
    "{{name}} يعيش رمضان من البداية إلى العيد: نية صادقة والقمر والتقويم وأول سحور وإفطار والصبر والشكر والصلاة والمساعدة ولحظات العائلة والقرآن والعطاء والصدقة والمغفرة والليالي الهادئة ومنتصف الطريق والأيام الأخيرة وليلة القدر ثم فرح العيد. قصة دافئة يكتشف فيها {{pronoun}} قيم هذا الشهر بقلب مفتوح.",
  female:
    "{{name}} تعيش رمضان من البداية إلى العيد: نية صادقة والقمر والتقويم وأول سحور وإفطار والصبر والشكر والصلاة والمساعدة ولحظات العائلة والقرآن والعطاء والصدقة والمغفرة والليالي الهادئة ومنتصف الطريق والأيام الأخيرة وليلة القدر ثم فرح العيد. قصة دافئة تكتشف فيها {{pronoun}} قيم هذا الشهر بقلب مفتوح.",
};

/** Front cover title per language ({{name}} = child's name) */
const COVER_TITLE: Record<Lang, string> = {
  French: '{{name}} et les Valeurs du Ramadan',
  English: '{{name}} and the Values of Ramadan',
  Arabic: '{{name}} وقيم رمضان',
  Spanish: '{{name}} y los Valores del Ramadán',
};

/** Front cover image prompt: only the child, Ramadan ftour at sunset; main table only (chbakia, dates, water, big + small soupière); title styled to blend with design. */
const COVER_PROMPT = `{STYLE_INSTRUCTION} COMPOSITION: A warm, welcoming scene for a children's book. The Main Character (a child) is the ONLY person in the frame, standing or sitting in the center. TIME OF DAY: Ftour at DUSK or SUNSET (golden hour). Warm golden-orange or soft evening light; cozy evening mood. SETTING: MODERN, CONTEMPORARY home—clean living room or kitchen, simple furniture, neutral or soft walls. Avoid over-stereotyped décor. FOOD AND TABLE: All food is on ONE main table only (no food elsewhere). On the main Moroccan ftour table: a LARGE Moroccan soupière (soup tureen) with harira in the CENTER of the table; chbakia, dates, and a glass of water on the table. Next to the child, a SMALLER soupière bowl with harira (personal serving). Elegant and inviting, not cluttered. COVER DESIGN: Subtle Ramadan touches (e.g. small crescent moon or star motif, tasteful Ramadan text). Modern and clean overall. No other people. TITLE STYLING: Style the title so it BLENDS with the cover design—elegant, distinctive typography that feels part of the scene (e.g. warm tones, integrated with the layout or subtle Ramadan feel), not a plain overlay. Keep it readable and child-friendly but visually integrated and nice. TITLE PLACEMENT: Place the title at the TOP-CENTER (top middle) of the cover, horizontally centered, with safe margin from the top edge. Keep this top-center area clean and uncluttered for maximum legibility. CHARACTERS: Only "The Main Character" (the child from the reference photo), facing the camera, in comfortable modest clothing. ${SINGLE_CHARACTER_RULE} LOGO PLACEMENT: Space at the bottom center for the logo. HEADLINE TEXT: [TITLE_PLACEHOLDER]`;

/** Back cover image prompt: only the child waving/smiling. {{SYNOPSIS}} is replaced with the actual story synopsis. */
const BACK_COVER_PROMPT_TEMPLATE = `Design a clean, elegant Back Cover. COMPOSITION: TOP AREA: Uncluttered background. Render this EXACT text at the top. TYPOGRAPHY: Soft rounded sans-serif – warm, friendly, child-appropriate and highly readable. Text: "{{SYNOPSIS}}" CENTER AREA: Only The Main Character (the child from the reference photo), front view, facing the camera, waving goodbye or smiling warmly. ${SINGLE_CHARACTER_RULE} BOTTOM AREA: Leave uncluttered or minimal space for a logo; do NOT add any other text or brand message.`;

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
TEXT PLACEMENT: Place the text in the uncluttered area, away from the spine and edges. TYPOGRAPHY: Soft rounded sans-serif – warm, friendly, child-appropriate and highly readable. Do NOT use cursive or fancy fonts.
TEXT: {{STORY_TEXT}}`;
}

/**
 * Fixed scene templates: 15 inner scenes in chronological order.
 * Scene index → value + environment (for maintenance):
 * 1: Intention (niyyah) / preparation — room with calendar, soft dawn light
 * 2: Lunar calendar / anticipation — balcony or large window at night, crescent moon
 * 3: Gratitude (shukr) — kitchen or dining nook at dawn, suhoor
 * 4: Gratitude at iftar — dining area at dusk, table set for iftar
 * 5: Patience (sabr) — garden, park bench, or sunny backyard
 * 6: Prayer (Salat) — prayer mat, bedroom/living room at sunset
 * 7: Kindness / helping — kitchen or hallway, setting table
 * 8: Family / togetherness — living room with cushions, evening
 * 9: The Quran — small table with open Quran, warm evening light
 * 10: Sadaqa (giving) — porch or doorstep with basket
 * 11: Forgiveness — softly lit room, thoughtful, hands together or note
 * 12: Evening gratitude — balcony or window, evening lights
 * 13: Perseverance — sunny bedroom or window seat, mid-month
 * 14: Laylat Al-Qadr — window/balcony at night, star-filled sky, hands in prayer
 * 15: Eid joy — front step or yard, morning light, festive clothes
 */
const RAMADAN_SCENES: RamadanSceneTemplate[] = [
  // 1: Preparing for Ramadan (intention / niyyah)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a room at home with a calendar on the wall and gentle dawn light through the window. Warm, hopeful mood. The child is the only person visible.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Se préparer pour le Ramadan',
        description: '{{name}} se prépare pour le Ramadan',
        storyText:
          "C'est bientôt le Ramadan ! {{name}} regarde le calendrier et compte les jours avec joie. Ce mois, on jeûne, on réfléchit et on fait de son mieux pour être gentil. {{pronounCap}} a décidé de vivre cette aventure avec un cœur sincère. {{name}} a appris que bien commencer, c'est déjà une belle intention.",
      },
      English: {
        title: 'Preparing for Ramadan',
        description: '{{name}} prepares for Ramadan',
        storyText:
          "Ramadan is almost here! {{name}} looks at the calendar and counts the days with joy. This month we fast, reflect and try our best to be kind. {{pronounCap}} has decided to live this adventure with a sincere heart. {{name}} learned that starting with a good intention is already a beautiful step.",
      },
      Arabic: {
        male: {
          title: 'الاستعداد لرمضان',
          description: '{{name}} يستعد لرمضان',
          storyText:
            "رمضان قريب! {{name}} ينظر إلى التقويم ويعد الأيام بفرح. في هذا الشهر نصوم ونفكر ونحاول أن نكون لطيفين. {{pronounCap}} قرر أن يعيش هذه المغامرة بقلب صادق. تعلم {{name}} أن البدء بنية حسنة هو خطوة جميلة.",
        },
        female: {
          title: 'الاستعداد لرمضان',
          description: '{{name}} تستعد لرمضان',
          storyText:
            "رمضان قريب! {{name}} تنظر إلى التقويم وتعد الأيام بفرح. في هذا الشهر نصوم ونفكر ونحاول أن نكون لطيفين. {{pronounCap}} قررت أن تعيش هذه المغامرة بقلب صادق. تعلمت {{name}} أن البدء بنية حسنة هو خطوة جميلة.",
        },
      },
      Spanish: {
        title: 'Prepararse para el Ramadán',
        description: '{{name}} se prepara para el Ramadán',
        storyText:
          "¡Pronto es Ramadán! {{name}} mira el calendario y cuenta los días con alegría. Este mes ayunamos, reflexionamos y hacemos lo posible por ser amables. {{pronounCap}} ha decidido vivir esta aventura con el corazón sincero. {{name}} aprendió que empezar con buena intención es ya un paso hermoso.",
      },
    },
  },
  // 2: Moon and calendar (lunar calendar, anticipation)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child on a balcony or by a large window at night, the crescent moon visible in the sky. Calm, hopeful mood. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'La lune et le calendrier',
        description: '{{name}} compte les jours',
        storyText:
          "{{name}} a appris que le Ramadan suit la lune. Chaque soir {{pronoun}} guette le croissant dans le ciel. Quand on le voit, un nouveau jour de jeûne commence. {{pronounCap}} aime cette attente et compte les jours jusqu'à l'Eid. {{name}} se sent faire partie de quelque chose de plus grand.",
      },
      English: {
        title: 'The moon and the calendar',
        description: '{{name}} counts the days',
        storyText:
          "{{name}} learned that Ramadan follows the moon. Each evening {{pronoun}} looks for the crescent in the sky. When we see it, a new day of fasting begins. {{pronounCap}} loves this waiting and counts the days until Eid. {{name}} feels part of something bigger.",
      },
      Arabic: {
        male: {
          title: 'القمر والتقويم',
          description: '{{name}} يعد الأيام',
          storyText:
            "تعلم {{name}} أن رمضان يتبع القمر. كل مساء {{pronoun}} يبحث عن الهلال في السماء. عندما نراه، يبدأ يوم جديد من الصيام. {{pronounCap}} يحب هذا الانتظار ويعد الأيام حتى العيد. {{name}} يشعر بأنه جزء من شيء أكبر.",
        },
        female: {
          title: 'القمر والتقويم',
          description: '{{name}} تعد الأيام',
          storyText:
            "تعلمت {{name}} أن رمضان يتبع القمر. كل مساء {{pronoun}} تبحث عن الهلال في السماء. عندما نراه، يبدأ يوم جديد من الصيام. {{pronounCap}} تحب هذا الانتظار وتعد الأيام حتى العيد. {{name}} تشعر بأنها جزء من شيء أكبر.",
        },
      },
      Spanish: {
        title: 'La luna y el calendario',
        description: '{{name}} cuenta los días',
        storyText:
          "{{name}} aprendió que el Ramadán sigue la luna. Cada noche {{pronoun}} busca el creciente en el cielo. Cuando lo vemos, empieza un nuevo día de ayuno. {{pronounCap}} ama esta espera y cuenta los días hasta el Eid. {{name}} siente que es parte de algo más grande.",
      },
    },
  },
  // 3: First suhoor (gratitude – shukr)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a kitchen or dining nook at NIGHT TIME, moments before sunrise (pre-dawn suhoor). The table is set in Moroccan style: a Moroccan tabla (round metal tray), dates in a small bowl, water, chbakia or other Moroccan pastries, mint tea optional. Soft, dim pre-dawn lighting—one warm lamp or candlelight, dark blue/navy through the window, no bright daylight. Peaceful, intimate atmosphere. The child is the only person in the scene.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Le premier suhoor',
        description: "Le premier suhoor de {{name}}",
        storyText:
          "Ce matin, {{name}} s'est réveillé avant le soleil pour le suhoor, le repas du petit matin qu'on partage en famille avant de jeûner. {{pronounCap}} a mangé des dattes et bu de l'eau. {{name}} a dit merci dans son cœur pour ce repas et pour la chance de vivre ce mois. {{pronounCap}} a appris que la gratitude rend chaque bouchée plus précieuse.",
      },
      English: {
        title: 'First suhoor',
        description: "{{name}}'s first suhoor",
        storyText:
          "This morning {{name}} woke up before the sun for suhoor, the early meal we share with family before we fast. {{pronounCap}} had dates and water. {{name}} said thank you in {{pronounPossessive}} heart for this meal and for the chance to live this month. {{pronounCap}} learned that gratitude makes every bite more precious.",
      },
      Arabic: {
        male: {
          title: 'أول سحور',
          description: 'أول سحور لـ {{name}}',
          storyText:
            "هذا الصباح استيقظ {{name}} قبل الشمس للسحور، وجبة الفجر التي نتشاركها مع العائلة قبل الصيام. {{pronounCap}} أكل التمر وشرب الماء. {{name}} شكر في قلبه على هذه الوجبة وعلى فرصة عيش هذا الشهر. تعلم {{pronoun}} أن الشكر يجعل كل لقمة أثمن.",
        },
        female: {
          title: 'أول سحور',
          description: 'أول سحور لـ {{name}}',
          storyText:
            "هذا الصباح استيقظت {{name}} قبل الشمس للسحور، وجبة الفجر التي نتشاركها مع العائلة قبل الصيام. {{pronounCap}} أكلت التمر وشربت الماء. {{name}} شكرت في قلبها على هذه الوجبة وعلى فرصة عيش هذا الشهر. تعلمت {{pronoun}} أن الشكر يجعل كل لقمة أثمن.",
        },
      },
      Spanish: {
        title: 'El primer suhur',
        description: 'El primer suhur de {{name}}',
        storyText:
          "Esta mañana {{name}} se despertó antes del sol para el suhur, la comida del alba que compartimos en familia antes de ayunar. {{pronounCap}} tomó dátiles y agua. {{name}} dio las gracias en su corazón por esta comida y por la oportunidad de vivir este mes. {{pronounCap}} aprendió que la gratitud hace cada bocado más precioso.",
      },
    },
  },
  // 4: First iftar (gratitude at breaking the fast)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a dining area at dusk, table set for iftar in Moroccan style: Moroccan tabla (round metal tray), dates in a bowl, water, chbakia (honey-sesame cookies), mint tea in a teapot with glasses, optional harira or pastries. Warm evening light. The child is alone at the table, smiling, as if about to break the fast. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: "Le premier iftar",
        description: "{{name}} rompt le jeûne",
        storyText:
          "Le soleil se couche. C'est l'heure de l'iftar ! {{name}} a rompu le jeûne avec une datte et de l'eau, comme on le fait en famille. {{pronounCap}} a senti la joie et la gratitude après une journée de patience. {{name}} a compris que dire merci pour ce moment remplit le cœur de paix.",
      },
      English: {
        title: 'First iftar',
        description: "{{name}} breaks the fast",
        storyText:
          "The sun sets. It's time for iftar! {{name}} broke the fast with a date and water, the way we do with family. {{pronounCap}} felt joy and gratitude after a day of patience. {{name}} understood that being thankful for this moment fills the heart with peace.",
      },
      Arabic: {
        male: {
          title: 'أول إفطار',
          description: '{{name}} يفطر',
          storyText:
            "غربت الشمس. حان وقت الإفطار! {{name}} أفطر بتمرة وماء، كما نفعل مع العائلة. {{pronounCap}} شعر بفرحة وشكر بعد يوم من الصبر. {{name}} فهم أن الشكر على هذه اللحظة يملأ القلب سلاماً.",
        },
        female: {
          title: 'أول إفطار',
          description: '{{name}} تفطر',
          storyText:
            "غربت الشمس. حان وقت الإفطار! {{name}} أفطرت بتمرة وماء، كما نفعل مع العائلة. {{pronounCap}} شعرت بفرحة وشكر بعد يوم من الصبر. {{name}} فهمت أن الشكر على هذه اللحظة يملأ القلب سلاماً.",
        },
      },
      Spanish: {
        title: 'El primer iftar',
        description: '{{name}} rompe el ayuno',
        storyText:
          "El sol se pone. ¡Es la hora del iftar! {{name}} rompió el ayuno con un dátil y agua, como hacemos en familia. {{pronounCap}} sintió alegría y gratitud después de un día de paciencia. {{name}} entendió que agradecer este momento llena el corazón de paz.",
      },
    },
  },
  // 5: Patience during the day (sabr)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a garden, on a park bench, or in a sunny backyard in the daytime. Calm, patient expression. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'La patience en journée',
        description: '{{name}} reste patient',
        storyText:
          "En plein jour, {{name}} a parfois soif ou faim. C'est normal pendant le jeûne. {{pronounCap}} choisit la patience et pense à ceux qui n'ont pas toujours de quoi manger. {{name}} a appris que la patience rend le cœur plus fort et nous rapproche des autres.",
      },
      English: {
        title: 'Patience during the day',
        description: '{{name}} stays patient',
        storyText:
          "In the middle of the day {{name}} sometimes feels thirsty or hungry. That's part of fasting. {{pronounCap}} chooses patience and thinks of those who don't always have enough to eat. {{name}} learned that patience makes the heart stronger and brings us closer to others.",
      },
      Arabic: {
        male: {
          title: 'الصبر في النهار',
          description: '{{name}} يتحلى بالصبر',
          storyText:
            "في منتصف النهار يشعر {{name}} أحياناً بالعطش أو الجوع. هذا جزء من الصيام. {{pronounCap}} يختار الصبر ويفكر في من لا يجدون ما يأكلون. تعلم {{name}} أن الصبر يقوي القلب ويقربنا من الآخرين.",
        },
        female: {
          title: 'الصبر في النهار',
          description: '{{name}} تتحلى بالصبر',
          storyText:
            "في منتصف النهار تشعر {{name}} أحياناً بالعطش أو الجوع. هذا جزء من الصيام. {{pronounCap}} تختار الصبر وتفكر في من لا يجدون ما يأكلون. تعلمت {{name}} أن الصبر يقوي القلب ويقربنا من الآخرين.",
        },
      },
      Spanish: {
        title: 'Paciencia durante el día',
        description: '{{name}} mantiene la paciencia',
        storyText:
          "A mediodía {{name}} a veces tiene sed o hambre. Es parte del ayuno. {{pronounCap}} elige la paciencia y piensa en quienes no siempre tienen qué comer. {{name}} aprendió que la paciencia fortalece el corazón y nos acerca a los demás.",
      },
    },
  },
  // 6: Prayer (Salat) — replaced "Quiet moment"
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child standing or kneeling on a small prayer mat in a softly lit bedroom or living room at sunset. Warm golden light enters through the window. Calm, focused and peaceful expression. The atmosphere should feel serene, gentle and safe.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'La prière (Salat)',
        description: '{{name}} prie',
        storyText:
          "Pendant le Ramadan, {{name}} apprend aussi à prier. La prière est un moment spécial pour parler à Allah avec le cœur. {{pronounCap}} se sent calme et concentré. {{name}} a appris que la prière aide à garder le cœur en paix et fort.",
      },
      English: {
        title: 'Prayer (Salat)',
        description: '{{name}} prays',
        storyText:
          "During Ramadan, {{name}} also learns to pray. Prayer is a special moment to speak to Allah with the heart. {{pronounCap}} feels calm and focused. {{name}} learned that prayer helps keep the heart peaceful and strong.",
      },
      Arabic: {
        male: {
          title: 'الصلاة',
          description: '{{name}} يصلي',
          storyText:
            "في رمضان يتعلم {{name}} أيضاً الصلاة. الصلاة لحظة خاصة للتحدث إلى الله بالقلب. {{pronounCap}} يشعر بالهدوء والتركيز. تعلم {{name}} أن الصلاة تساعد القلب أن يبقى مطمئناً وقوياً.",
        },
        female: {
          title: 'الصلاة',
          description: '{{name}} تصلي',
          storyText:
            "في رمضان تتعلم {{name}} أيضاً الصلاة. الصلاة لحظة خاصة للتحدث إلى الله بالقلب. {{pronounCap}} تشعر بالهدوء والتركيز. تعلمت {{name}} أن الصلاة تساعد القلب أن يبقى مطمئناً وقوياً.",
        },
      },
      Spanish: {
        title: 'La oración (Salat)',
        description: '{{name}} reza',
        storyText:
          "Durante el Ramadán, {{name}} también aprende a rezar. La oración es un momento especial para hablar con Allah con el corazón. {{pronounCap}} se siente tranquilo y concentrado. {{name}} aprendió que la oración ayuda a mantener el corazón en paz y fuerte.",
      },
    },
  },
  // 7: Helping at home (kindness)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a kitchen or hallway, setting the table or holding dishes. Helpful, gentle pose. Only the child visible.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Aider à la maison',
        description: '{{name}} donne un coup de main',
        storyText:
          "{{name}} aide à la maison pendant le Ramadan : mettre la table, ranger sa chambre. Ce sont de petits gestes qui font plaisir à ceux qu'on aime. {{pronounCap}} a appris que rendre service avec le cœur est une belle façon de montrer qu'on tient aux autres.",
      },
      English: {
        title: 'Helping at home',
        description: '{{name}} lends a hand',
        storyText:
          "{{name}} helps at home during Ramadan: setting the table, tidying {{pronounPossessive}} room. These are small gestures that bring joy to the people we love. {{pronounCap}} learned that helping with a kind heart is a beautiful way to show we care.",
      },
      Arabic: {
        male: {
          title: 'المساعدة في البيت',
          description: '{{name}} يساعد',
          storyText:
            "{{name}} يساعد في البيت أثناء رمضان: ترتيب المائدة أو الغرفة. حركات صغيرة تسعد من نحب. {{pronounCap}} تعلم أن المساعدة بقلب طيب طريقة جميلة لنظهر اهتمامنا.",
        },
        female: {
          title: 'المساعدة في البيت',
          description: '{{name}} تساعد',
          storyText:
            "{{name}} تساعد في البيت أثناء رمضان: ترتيب المائدة أو الغرفة. حركات صغيرة تسعد من نحب. {{pronounCap}} تعلمت أن المساعدة بقلب طيب طريقة جميلة لنظهر اهتمامنا.",
        },
      },
      Spanish: {
        title: 'Ayudar en casa',
        description: '{{name}} echa una mano',
        storyText:
          "{{name}} ayuda en casa durante el Ramadán: poner la mesa, ordenar su habitación. Son pequeños gestos que alegran a quienes queremos. {{pronounCap}} aprendió que ayudar con el corazón es una forma hermosa de mostrar que nos importan.",
      },
    },
  },
  // 8: Family moments (togetherness)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a living room with cushions and a warm lamp, evening atmosphere. Peaceful. Only the child is visible.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Les moments en famille',
        description: 'Des moments doux avec {{name}}',
        storyText:
          "Les soirées de Ramadan, {{name}} aime les moments calmes à la maison. Parfois on lit, parfois on parle. {{pronounCap}} apprend à écouter et à être présent. {{name}} a compris que ces moments avec les gens qu'on aime sont un vrai trésor.",
      },
      English: {
        title: 'Family moments',
        description: 'Quiet moments with {{name}}',
        storyText:
          "During Ramadan evenings, {{name}} loves quiet moments at home. Sometimes we read, sometimes we talk. {{pronounCap}} learns to listen and to be present. {{name}} understood that these moments with the people we love are a real treasure.",
      },
      Arabic: {
        male: {
          title: 'لحظات مع العائلة',
          description: 'لحظات هادئة مع {{name}}',
          storyText:
            "في ليالي رمضان، يحب {{name}} اللحظات الهادئة في البيت. أحياناً نقرأ، أحياناً نتحدث. {{pronounCap}} يتعلم الاستماع والحضور. {{name}} فهم أن هذه اللحظات مع من نحب كنز حقيقي.",
        },
        female: {
          title: 'لحظات مع العائلة',
          description: 'لحظات هادئة مع {{name}}',
          storyText:
            "في ليالي رمضان، تحب {{name}} اللحظات الهادئة في البيت. أحياناً نقرأ، أحياناً نتحدث. {{pronounCap}} تتعلم الاستماع والحضور. {{name}} فهمت أن هذه اللحظات مع من نحب كنز حقيقي.",
        },
      },
      Spanish: {
        title: 'Momentos en familia',
        description: 'Momentos tranquilos con {{name}}',
        storyText:
          "En las noches de Ramadán, a {{name}} le encantan los momentos tranquilos en casa. A veces leemos, a veces hablamos. {{pronounCap}} aprende a escuchar y a estar presente. {{name}} entendió que estos momentos con quienes queremos son un verdadero tesoro.",
      },
    },
  },
  // 9: The Quran — replaced "Reading and learning"
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child sitting respectfully at a small table with an open Quran in front of them. Soft warm evening light. Calm, attentive and curious expression. The atmosphere should feel peaceful and reflective.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Le Coran',
        description: '{{name}} et le Coran',
        storyText:
          "Pendant le Ramadan, {{name}} écoute et lit le Coran. Le Coran est un livre qui nous guide à être bons et justes. {{pronounCap}} apprend que ses paroles aident le cœur à devenir plus sage et plus doux.",
      },
      English: {
        title: 'The Quran',
        description: '{{name}} and the Quran',
        storyText:
          "During Ramadan, {{name}} listens to and reads from the Quran. The Quran is a book that guides us to be kind and fair. {{pronounCap}} learns that its words help the heart grow wiser and gentler.",
      },
      Arabic: {
        male: {
          title: 'القرآن',
          description: '{{name}} والقرآن',
          storyText:
            "في رمضان يستمع {{name}} ويقرأ من القرآن. القرآن كتاب يهدينا إلى اللطف والعدل. {{pronounCap}} يتعلم أن كلماته تساعد القلب أن يصبح أحكم وألطف.",
        },
        female: {
          title: 'القرآن',
          description: '{{name}} والقرآن',
          storyText:
            "في رمضان تستمع {{name}} وتقرأ من القرآن. القرآن كتاب يهدينا إلى اللطف والعدل. {{pronounCap}} تتعلم أن كلماته تساعد القلب أن يصبح أحكم وألطف.",
        },
      },
      Spanish: {
        title: 'El Corán',
        description: '{{name}} y el Corán',
        storyText:
          "Durante el Ramadán, {{name}} escucha y lee el Corán. El Corán es un libro que nos guía a ser bondadosos y justos. {{pronounCap}} aprende que sus palabras ayudan al corazón a ser más sabio y amable.",
      },
    },
  },
  // 10: Giving and sharing (sadaqa)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child on a porch or at the doorstep with a small basket or gift to give. Kind, generous mood. Only the child is visible.',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Donner et partager',
        description: '{{name}} donne avec le cœur',
        storyText:
          "Pendant le Ramadan, {{name}} apprend à donner. Donner un peu de ce qu'on a, ou du temps, ou un sourire, c'est la sadaqa. {{pronounCap}} a préparé un petit geste pour quelqu'un. {{name}} a compris que partager rend le cœur léger et que chaque geste compte.",
      },
      English: {
        title: 'Giving and sharing',
        description: "{{name}} gives from the heart",
        storyText:
          "During Ramadan, {{name}} learns to give. Giving a little of what we have, or our time, or a smile, is sadaqa. {{pronounCap}} prepared a small gesture for someone. {{name}} understood that sharing makes the heart light and that every gesture counts.",
      },
      Arabic: {
        male: {
          title: 'العطاء والمشاركة',
          description: '{{name}} يعطي من القلب',
          storyText:
            "في رمضان يتعلم {{name}} العطاء. أن نعطي قليلاً مما لدينا، أو وقتنا، أو ابتسامة، هو صدقة. {{pronounCap}} أعد لمسة صغيرة لأحد. {{name}} فهم أن المشاركة تخفف القلب وأن كل لمسة لها ثقل.",
        },
        female: {
          title: 'العطاء والمشاركة',
          description: '{{name}} تعطي من القلب',
          storyText:
            "في رمضان تتعلم {{name}} العطاء. أن نعطي قليلاً مما لدينا، أو وقتنا، أو ابتسامة، هو صدقة. {{pronounCap}} أعدت لمسة صغيرة لأحد. {{name}} فهمت أن المشاركة تخفف القلب وأن كل لمسة لها ثقل.",
        },
      },
      Spanish: {
        title: 'Dar y compartir',
        description: '{{name}} da con el corazón',
        storyText:
          "Durante el Ramadán, {{name}} aprende a dar. Dar un poco de lo que tenemos, o nuestro tiempo, o una sonrisa, es sadaqa. {{pronounCap}} preparó un pequeño gesto para alguien. {{name}} entendió que compartir aligera el corazón y que cada gesto cuenta.",
      },
    },
  },
  // 11: Forgiveness — replaced "Sharing with others"
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child sitting quietly in a softly lit room, thoughtful expression, hands gently together or holding a small note. Reflective and sincere mood.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'Le pardon',
        description: '{{name}} et le pardon',
        storyText:
          "Pendant le Ramadan, {{name}} se souvient que tout le monde peut faire des erreurs. {{pronounCap}} dit « pardon » avec sincérité et pardonne aux autres aussi. {{name}} a appris que le pardon allège le cœur et rapproche les gens.",
      },
      English: {
        title: 'Forgiveness',
        description: '{{name}} and forgiveness',
        storyText:
          "During Ramadan, {{name}} remembers that everyone makes mistakes. {{pronounCap}} says \"I'm sorry\" with sincerity and forgives others too. {{name}} learned that forgiveness makes the heart lighter and brings people closer together.",
      },
      Arabic: {
        male: {
          title: 'المغفرة',
          description: '{{name}} والمغفرة',
          storyText:
            "في رمضان يتذكر {{name}} أن الجميع يخطئ. {{pronounCap}} يقول «آسف» بصدق ويغفر للآخرين أيضاً. تعلم {{name}} أن المغفرة تخفف القلب وتقرب الناس من بعضهم.",
        },
        female: {
          title: 'المغفرة',
          description: '{{name}} والمغفرة',
          storyText:
            "في رمضان تتذكر {{name}} أن الجميع يخطئ. {{pronounCap}} تقول «آسفة» بصدق وتغفر للآخرين أيضاً. تعلمت {{name}} أن المغفرة تخفف القلب وتقرب الناس من بعضهم.",
        },
      },
      Spanish: {
        title: 'El perdón',
        description: '{{name}} y el perdón',
        storyText:
          "Durante el Ramadán, {{name}} recuerda que todos cometemos errores. {{pronounCap}} dice «lo siento» con sinceridad y perdona a los demás también. {{name}} aprendió que el perdón aligera el corazón y acerca a las personas.",
      },
    },
  },
  // 12: Ramadan evenings (gratitude, closeness)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child on a balcony or by a window with evening lights, peaceful night mood. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: "Les soirées de Ramadan",
        description: '{{name}} le soir',
        storyText:
          "Le soir, après l'iftar, l'ambiance est douce. {{name}} aime ces moments où la nuit tombe et tout est calme. {{pronounCap}} se sent proche des gens qu'{{pronoun}} aime. {{name}} a appris à dire merci pour ces soirées si précieuses.",
      },
      English: {
        title: 'Ramadan evenings',
        description: "{{name}} in the evening",
        storyText:
          "In the evening, after iftar, the mood is gentle. {{name}} loves these moments when night falls and everything is calm. {{pronounCap}} feels close to the people {{pronoun}} loves. {{name}} learned to be thankful for these precious evenings.",
      },
      Arabic: {
        male: {
          title: 'ليالي رمضان',
          description: '{{name}} في المساء',
          storyText:
            "في المساء بعد الإفطار، الأجواء هادئة. {{name}} يحب هذه اللحظات عندما يرخي الليل وكل شيء ساكن. {{pronounCap}} يشعر بالقرب ممن يحب. تعلم {{name}} أن يشكر على هذه الليالي الثمينة.",
        },
        female: {
          title: 'ليالي رمضان',
          description: '{{name}} في المساء',
          storyText:
            "في المساء بعد الإفطار، الأجواء هادئة. {{name}} تحب هذه اللحظات عندما يرخي الليل وكل شيء ساكن. {{pronounCap}} تشعر بالقرب ممن تحب. تعلمت {{name}} أن تشكر على هذه الليالي الثمينة.",
        },
      },
      Spanish: {
        title: 'Las noches de Ramadán',
        description: '{{name}} por la noche',
        storyText:
          "Por la noche, después del iftar, el ambiente es tranquilo. {{name}} ama esos momentos en que cae la noche y todo está en calma. {{pronounCap}} se siente cerca de quienes quiere. {{name}} aprendió a estar agradecido por estas noches tan preciosas.",
      },
    },
  },
  // 13: Halfway through Ramadan (perseverance)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child in a sunny bedroom or on a window seat, gentle daylight, hopeful and proud expression. Mid-Ramadan mood. Only the child in frame.',
      'LEFT'
    ),
    content: {
      French: {
        title: 'À mi-chemin du Ramadan',
        description: '{{name}} à mi-parcours',
        storyText:
          "Nous voilà à mi-chemin du Ramadan ! {{name}} est fier de ses efforts. {{pronounCap}} a jeûné, partagé et réfléchi. {{name}} continue avec le cœur plein et garde le cap jusqu'à l'Eid. {{pronounCap}} a appris que persévérer est une force.",
      },
      English: {
        title: 'Halfway through Ramadan',
        description: '{{name}} at the halfway point',
        storyText:
          "We're halfway through Ramadan! {{name}} is proud of {{pronounPossessive}} efforts. {{pronounCap}} has fasted, shared and reflected. {{name}} keeps going with a full heart toward Eid. {{pronounCap}} learned that perseverance is a strength.",
      },
      Arabic: {
        male: {
          title: 'منتصف رمضان',
          description: '{{name}} في منتصف الطريق',
          storyText:
            "ها نحن في منتصف رمضان! {{name}} فخور بما بذله. {{pronounCap}} صام وشارك وتأمل. {{name}} يواصل بقلب ممتلئ حتى العيد. {{pronounCap}} تعلم أن المثابرة قوة.",
        },
        female: {
          title: 'منتصف رمضان',
          description: '{{name}} في منتصف الطريق',
          storyText:
            "ها نحن في منتصف رمضان! {{name}} فخورة بما بذلته. {{pronounCap}} صامت وشاركت وتأملت. {{name}} تواصل بقلب ممتلئ حتى العيد. {{pronounCap}} تعلمت أن المثابرة قوة.",
        },
      },
      Spanish: {
        title: 'A mitad del Ramadán',
        description: '{{name}} a mitad de camino',
        storyText:
          "¡Estamos a mitad del Ramadán! {{name}} está orgulloso de sus esfuerzos. {{pronounCap}} ha ayunado, compartido y reflexionado. {{name}} sigue con el corazón lleno hacia el Eid. {{pronounCap}} aprendió que perseverar es una fuerza.",
      },
    },
  },
  // 14: Laylat Al-Qadr (enhanced — child by window at night, hands in prayer)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child standing by a window or on a balcony at night, looking at a star-filled sky. Soft moonlight illuminates the face. Hands gently raised in prayer. Peaceful and hopeful mood. Uncluttered night sky on the text side (stars, moonlight, soft gradient).',
      'RIGHT'
    ),
    content: {
      French: {
        title: 'Laylat Al-Qadr',
        description: '{{name}} et la Nuit du Destin',
        storyText:
          "Ce sont les dernières nuits du Ramadan. {{name}} a entendu parler de Laylat Al-Qadr, une nuit meilleure que mille mois. {{pronounCap}} fait une prière silencieuse pour sa famille et pour le monde. {{name}} a appris que certaines nuits sont remplies d'une lumière et de bénédictions spéciales.",
      },
      English: {
        title: 'Laylat Al-Qadr',
        description: '{{name}} and the Night of Power',
        storyText:
          "These are the last nights of Ramadan. {{name}} has heard about Laylat Al-Qadr, a night better than a thousand months. {{pronounCap}} makes a quiet prayer for family and for the world. {{name}} learned that some nights are filled with special light and blessings.",
      },
      Arabic: {
        male: {
          title: 'ليلة القدر',
          description: '{{name}} وليلة القدر',
          storyText:
            "هذه آخر ليالي رمضان. سمع {{name}} عن ليلة القدر، ليلة خير من ألف شهر. {{pronounCap}} يرفع دعاءً هادئاً لأسرته وللعالم. تعلم {{name}} أن بعض الليالي تملؤها نور وبركات خاصة.",
        },
        female: {
          title: 'ليلة القدر',
          description: '{{name}} وليلة القدر',
          storyText:
            "هذه آخر ليالي رمضان. سمعت {{name}} عن ليلة القدر، ليلة خير من ألف شهر. {{pronounCap}} ترفع دعاءً هادئاً لأسرتها وللعالم. تعلمت {{name}} أن بعض الليالي تملؤها نور وبركات خاصة.",
        },
      },
      Spanish: {
        title: 'Laylat Al-Qadr',
        description: '{{name}} y la Noche del Destino',
        storyText:
          "Estas son las últimas noches del Ramadán. {{name}} ha oído hablar de Laylat Al-Qadr, una noche mejor que mil meses. {{pronounCap}} hace una oración tranquila por la familia y por el mundo. {{name}} aprendió que algunas noches están llenas de una luz y bendiciones especiales.",
      },
    },
  },
  // 15: Eid (joy, gratitude after the journey)
  {
    promptTemplate: scenePromptTemplate(
      'Scene: A child on the front step or in the yard in morning light, in festive but modest clothing, smiling and ready for Eid. Joyful. Only the child in frame.',
      'RIGHT'
    ),
    content: {
      French: {
        title: "L'Eid !",
        description: "{{name}} fête l'Eid",
        storyText:
          "Le Ramadan s'achève. C'est le matin de l'Eid ! {{name}} s'est réveillé avec le cœur léger. {{pronounCap}} a mis {{pronounPossessive}} plus beaux habits et est prêt à fêter. Après un mois de patience, partage et gratitude, la joie est là. {{name}} a appris que chaque effort porté avec le cœur mène à la joie.",
      },
      English: {
        title: 'Eid!',
        description: "{{name}} celebrates Eid",
        storyText:
          "Ramadan has ended. It's Eid morning! {{name}} woke up with a light heart. {{pronounCap}} put on {{pronounPossessive}} best clothes and is ready to celebrate. After a month of patience, sharing and gratitude, joy is here. {{name}} learned that every effort made with the heart leads to joy.",
      },
      Arabic: {
        male: {
          title: 'العيد!',
          description: '{{name}} يحتفل بالعيد',
          storyText:
            "انتهى رمضان. إنه صباح العيد! استيقظ {{name}} بقلب خفيف. {{pronounCap}} ارتدى أجمل ثيابه وهو مستعد للاحتفال. بعد شهر من الصبر والمشاركة والشكر، الفرح هنا. تعلم {{name}} أن كل جهد بقلب صادق يقود إلى الفرح.",
        },
        female: {
          title: 'العيد!',
          description: '{{name}} تحتفل بالعيد',
          storyText:
            "انتهى رمضان. إنه صباح العيد! استيقظت {{name}} بقلب خفيف. {{pronounCap}} ارتدت أجمل ثيابها وهي مستعدة للاحتفال. بعد شهر من الصبر والمشاركة والشكر، الفرح هنا. تعلمت {{name}} أن كل جهد بقلب صادق يقود إلى الفرح.",
        },
      },
      Spanish: {
        title: '¡Eid!',
        description: '{{name}} celebra el Eid',
        storyText:
          "El Ramadán ha terminado. ¡Es la mañana del Eid! {{name}} se despertó con el corazón ligero. {{pronounCap}} se puso su mejor ropa y está listo para celebrar. Después de un mes de paciencia, compartir y gratitud, la alegría está aquí. {{name}} aprendió que cada esfuerzo hecho con el corazón lleva a la alegría.",
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
  const nameToUse = lang === 'Arabic' ? nameForArabic(name) : name;
  const genderLower = (input.gender || '').toLowerCase();
  const isFemale = genderLower.includes('female') || genderLower === 'f' || genderLower === 'femme';
  const { pronoun, pronounCap, pronounPossessive } = getPronouns(
    input.language || 'French',
    input.gender || ''
  );

  const resolve = (t: string) => resolvePlaceholders(t, nameToUse, pronoun, pronounCap, pronounPossessive);
  const synopsis =
    lang === 'Arabic'
      ? resolve(SYNOPSIS_ARABIC[isFemale ? 'female' : 'male'])
      : resolve(SYNOPSIS[lang] || SYNOPSIS.French);
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

  // Inner scenes (1 to RAMADAN_INNER_SCENES). For Arabic, pick male/female content for correct verbs and possessives.
  for (let i = 0; i < RAMADAN_SCENES.length; i++) {
    const t = RAMADAN_SCENES[i];
    const content =
      lang === 'Arabic'
        ? t.content.Arabic[isFemale ? 'female' : 'male']
        : (t.content[lang as Exclude<Lang, 'Arabic'>] || t.content.French);
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

  // Back cover: inject actual synopsis so the image shows the story summary, not placeholder or brand text
  const backPrompt = BACK_COVER_PROMPT_TEMPLATE.replace('{{SYNOPSIS}}', synopsis);
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
