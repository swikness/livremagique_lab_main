/**
 * Map sheet row payload to UserInput and final theme for Lovers books.
 */

const StoryStyle = {
  ANIMATION_3D: '3D Animation',
  SEMI_REALISTIC: 'Semi-Realistic',
  VECTOR_ART: 'Vector Illustration',
};

const TargetAudience = { LOVERS: 'Lovers' };

const langMap = {
  'Français': 'French',
  'French': 'French',
  'Arabe': 'Arabic',
  'Arabic': 'Arabic',
  'Anglais': 'English',
  'English': 'English',
  'Espagnol': 'Spanish',
  'Spanish': 'Spanish',
};

function normalizeStyle(s) {
  const str = String(s || '').trim();
  if (str.includes('3D') || str === StoryStyle.ANIMATION_3D) return StoryStyle.ANIMATION_3D;
  if (str.toLowerCase().includes('semi') || str === StoryStyle.SEMI_REALISTIC) return StoryStyle.SEMI_REALISTIC;
  if (str.toLowerCase().includes('vector') || str === StoryStyle.VECTOR_ART) return StoryStyle.VECTOR_ART;
  return StoryStyle.ANIMATION_3D;
}

/**
 * @param {object} row - row from GAS payload (row.buyerName, row.partner1Name, etc.)
 * @returns {{ userInput: object, theme: string }}
 */
export function mapRowToUserInput(row) {
  const recipient = (row.recipient || 'HER').toUpperCase();
  const language = langMap[String(row.language || 'Français').trim()] || 'French';
  const optionsList = String(row.optionsList || '').trim();
  const options = optionsList ? optionsList.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const bookName = String(row.bookName || '').trim();
  const years = String(row.years || '2').trim();
  const customNote = String(row.customNote || '').trim();
  const customTitle = String(row.customTitle || '').trim() || undefined;
  // Column O (optionsList) = scenes description / what the book is about, for ALL book types including Sur Mesure.
  // Column M (customTitle) = cover title for Sur Mesure; also passed so cover generator uses it.

  const scenesDescription = optionsList || (options.length ? options.join(', ') : '');
  const scenesDescForTheme = scenesDescription || 'Our love story';

  let theme;
  if (bookName.includes("Sur Mesure") || bookName.includes("100%")) {
    theme = `Story Type: CUSTOM_STORY. What the book is about (scenes description): "${scenesDescForTheme}". ${customNote ? `Additional context: "${customNote}".` : ''} This is a personalized love story; generate 15 distinct story scenes based on this description.`;
  } else if (bookName.includes("Années") || bookName.includes("Amour")) {
    theme = `Story Type: LOVE_STORY. Specifically covering ${years} years of love. Recipient: ${recipient}. What the book is about / scenes description: ${scenesDescForTheme}`;
  } else if (bookName.includes("Liste") || bookName.includes("Rêves")) {
    theme = `Story Type: BUCKET_LIST. Recipient: ${recipient}. What the book is about / scenes description: ${scenesDescForTheme}`;
  } else {
    theme = `Story Type: 10_REASONS. Recipient: ${recipient}. What the book is about / scenes description: ${scenesDescForTheme}`;
  }

  const userInput = {
    name: String(row.partner1Name || '').trim() || 'Lui',
    age: String(row.partner1Age ?? '').trim() || '30',
    gender: 'Male',
    photoBase64: row.himPhotoBase64 || undefined,
    partnerName: String(row.partner2Name || '').trim() || 'Elle',
    partnerAge: String(row.partner2Age ?? '').trim() || '30',
    partnerGender: 'Female',
    partnerPhotoBase64: row.herPhotoBase64 || undefined,
    audience: TargetAudience.LOVERS,
    theme,
    selectedThemes: options.length ? options : ['Amour'],
    style: normalizeStyle(row.style),
    extras: [],
    language,
    wordsPerScene: 15,
    yearsCount: years || undefined,
    recipient: (row.recipient || 'HER').toUpperCase() === 'HIM' ? 'HIM' : 'HER',
    customTitle,
    customNote: customNote || undefined,
    /** Book type for app UI: 10_REASONS | LOVE_STORY | BUCKET_LIST | CUSTOM_STORY */
    loversStoryType: bookName.includes("Sur Mesure") || bookName.includes("100%") ? 'CUSTOM_STORY'
      : bookName.includes("Années") || bookName.includes("Amour") ? 'LOVE_STORY'
      : bookName.includes("Liste") || bookName.includes("Rêves") ? 'BUCKET_LIST'
      : '10_REASONS',
  };

  return { userInput, theme };
}
