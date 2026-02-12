/**
 * Backend Gemini: generateStoryPlan + generateSceneImage using process.env.GEMINI_API_KEY.
 */
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const GEMINI_TEXT = 'gemini-3-pro-preview';
const GEMINI_IMAGE = 'gemini-3-pro-image-preview';

const STYLE_DESCRIPTIONS = {
  'Semi-Realistic': 'semi-realistic digital painting, high-quality concept art, illustrative style, painterly textures, natural facial proportions, cinematic lighting, atmospheric depth, soft detailed shading, dramatic composition, ArtStation trending, fantasy realism, no cartoon features, no 3D render.',
  '3D Animation': '3D animation style, Pixar inspired, C4D, Octane Render, cinematic lighting, volumetric atmosphere, hyper-detailed textures, 8k, masterpiece, ray-tracing, soft studio lighting, magical realism, vibrant colors, sharp focus. CHARACTER CONSISTENCY: The characters MUST look exactly like the reference photos in every single frame.',
  'Vector Illustration': 'modern commercial vector illustration, 2D flat design with soft gradient shading, cute avatar style, big head small body proportions, vibrant saturated colors, clean sharp edges, smooth vector gradients, romantic cartoon, playful and expressive, highly polished digital art. CHARACTER CONSISTENCY: Maintain exact facial features and hair style from the reference photos in a vector style.',
};

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.length < 10) throw new Error('GEMINI_API_KEY not set or invalid');
  return new GoogleGenerativeAI(key);
}

export async function generateStoryPlan(input) {
  const genAI = getAI();
  const model = genAI.getGenerativeModel({
    model: GEMINI_TEXT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          synopsis: { type: SchemaType.STRING },
          scenes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.NUMBER },
                type: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                storyText: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                prompt: { type: SchemaType.STRING },
                characterSide: { type: SchemaType.STRING },
              },
              required: ['id', 'type', 'title', 'storyText', 'description', 'prompt'],
            },
          },
        },
        required: ['synopsis', 'scenes'],
      },
    },
  });

  const themesStr = (input.selectedThemes || []).join(', ');
  const char1Info = `${input.name} (Age: ${input.age}, Gender: ${input.gender})`;
  const char2Info = input.audience === 'Lovers' ? ` and ${input.partnerName} (Age: ${input.partnerAge}, Gender: ${input.partnerGender})` : '';
  const mainCharacterContext = input.audience === 'Lovers'
    ? `Main Characters (A Couple): ${char1Info}${char2Info}. Focus the story on their romantic journey, bond, and shared experiences.`
    : `Main Character: ${char1Info}.`;

  const prompt = `You are a professional book editor and world-class storyteller.
Create a detailed 17-part story plan for a ${input.audience} book.
${mainCharacterContext}
Story Concept: ${input.theme}
Themes to include: ${themesStr}
Visual Style: ${input.style}
Target Language for ALL TEXT: ${input.language}
STORY TEXT RULE: Each scene text MUST be exactly or very close to ${input.wordsPerScene} words in ${input.language}.

STRICT CHARACTER RULE: The story MUST include ONLY the two main characters (the couple). Do NOT add any other people: no friends, no family, no strangers, no background characters, no extras. Every scene shows only the man and the woman.
PROMPT GENERATION RULE: In the 'prompt' field for scenes, use generic terms like "The Main Character", "The Man", "The Woman", "The Couple" - NOT the names. Describe ONLY these two characters; never mention or imply other people in the image.
NARRATIVE PERSONA: Use the Main Character's actual name (${input.name}) in storyText frequently.

Return JSON: synopsis (string) and scenes (array of 17 items). Index 0 = Front Cover, 1-15 = Story scenes, 16 = Back Cover.
For INDEX 0: title with names ${input.name} and ${input.partnerName}; prompt for cover with STYLE_INSTRUCTION placeholder.
For INDEX 1-15: Each scene must be a DISTINCT story moment (different setting, action, or composition). Only the two main characters appear; no other people in the scene or in the prompt. Do NOT repeat the cover scene or a similar cover-like image. storyText (~${input.wordsPerScene} words in ${input.language}). In the 'prompt' use {STYLE_INSTRUCTION} and include [STORY_TEXT] where the narrative text should appear. Describe only the couple; never add background characters or extras. LAYOUT: Put the narrative text on ONE side only (e.g. left half) and the two characters on the OPPOSITE side only (e.g. right half). Never put text and characters on the same side. No empty or white space; fill the frame. Describe so nothing important is in the center (image is split for book spine).
For INDEX 16: Back cover with TEXT AT THE TOP (synopsis or tagline), LOGO AT THE BOTTOM, and the two characters in the middle facing camera. Prompt must describe: text area at top, logo placement at bottom, characters in center.
All text in ${input.language}. Return JSON only.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const raw = JSON.parse(text || '{}');
  return {
    synopsis: raw.synopsis || '',
    scenes: (raw.scenes || []).map((s, idx) => ({
      ...s,
      history: [],
      status: 'idle',
      aspectRatio: idx === 0 || idx === 16 ? '1:1' : '16:9',
      generationRatio: idx === 0 || idx === 16 ? '1:1' : '16:9',
    })),
  };
}

export async function generateSceneImage(scene, baseStyle, mainCharacterPhoto, partnerPhoto, logoBase64 = null) {
  const genAI = getAI();
  const activeStyle = scene.overrideStyle || baseStyle;
  const styleKeywords = STYLE_DESCRIPTIONS[activeStyle] || STYLE_DESCRIPTIONS['3D Animation'];

  let finalPrompt = scene.prompt;
  if (finalPrompt.includes('{STYLE_INSTRUCTION}')) {
    finalPrompt = finalPrompt.replace('{STYLE_INSTRUCTION}', styleKeywords);
  } else {
    finalPrompt = `STYLE: ${styleKeywords}. ${finalPrompt}`;
  }
  // Inject actual story text so it appears on the image (replaces [STORY_TEXT] placeholder)
  const storyText = (scene.storyText || '').trim().slice(0, 400);
  if (finalPrompt.includes('[STORY_TEXT]')) {
    finalPrompt = finalPrompt.replace('[STORY_TEXT]', storyText || '(scene text)');
  }

  const singleReference = mainCharacterPhoto && !partnerPhoto;
  const refInstruction = singleReference
    ? 'CHARACTER CONSISTENCY: The two characters must look EXACTLY like the attached reference image in every detail (faces, features, hair). Use the same reference for both the man and the woman. Same couple, same faces, no variation between scenes.'
    : 'CHARACTER CONSISTENCY: The two characters must look EXACTLY like the attached reference photos. Same faces, same features, same couple in every scene. Do not deviate from the reference.';

  const isStoryScene = scene.id >= 1 && scene.id <= 15;
  const isBackCover = scene.id === 16 || scene.type === 'back-cover';
  const safeZoneRules = isStoryScene
    ? `LAYOUT - TEXT AND CHARACTERS ON OPPOSITE SIDES: Put the narrative text on the LEFT half of the image only. Put the two characters on the RIGHT half of the image only. Do NOT put text and characters on the same side. The image is split down the center for the book spine - keep nothing important in the center strip. Fill the entire frame; no white space, no empty areas, no blank margins. TYPOGRAPHY: Use the same font style, size, and weight for the narrative text. No italics, no varying sizes. Consistent, readable text.`
    : '';

  const backCoverRules = isBackCover
    ? 'BACK COVER LAYOUT: Text (synopsis or tagline) at the TOP. Logo at the BOTTOM center. The two characters in the MIDDLE facing camera. Fill the frame; no white space.'
    : '';

  const parts = [
    {
      text: `${finalPrompt}
${refInstruction}
ONLY TWO CHARACTERS: Show ONLY the couple (the man and the woman from the reference). No other people, no background characters, no extras, no strangers. The image must contain exactly these two characters and nothing else human.
ORIENTATION RULE: Characters must be facing the FRONT/CAMERA.
CLOTHING RULE: Do NOT use the clothing from the reference photos. Only use the clothing described in the prompt.
IMAGE QUALITY: The image MUST be sharp, in focus, and high detail. No blur, no motion blur, no soft focus. Crisp and clear throughout. Fill the entire frame with content; no white space, no empty areas, no blank margins.
${isStoryScene ? 'SCENE RULE: This is a story scene illustration, NOT the book cover. Create a clearly different composition, setting, and moment from the cover.' : ''}
${safeZoneRules}
${backCoverRules}
TEXT RENDERING: Render any story text clearly and legibly. Same font style and size throughout. SAFETY MARGINS: Full visibility, no cut-off. NO BORDERS.`,
    },
  ];

  if (mainCharacterPhoto) {
    const b64 = mainCharacterPhoto.includes(',') ? mainCharacterPhoto.split(',')[1] : mainCharacterPhoto;
    const mime = mainCharacterPhoto.includes('image/png') ? 'image/png' : 'image/jpeg';
    parts.push({ inlineData: { mimeType: mime, data: b64 } });
  }
  if (partnerPhoto && partnerPhoto !== mainCharacterPhoto) {
    const b64 = partnerPhoto.includes(',') ? partnerPhoto.split(',')[1] : partnerPhoto;
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } });
  }
  if (logoBase64) {
    const b64 = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
    parts.push({ inlineData: { mimeType: 'image/png', data: b64 } });
    parts[0].text += isBackCover
      ? ' LOGO INSTRUCTION: Place the provided LOGO image at the bottom center of the back cover.'
      : ' LOGO INSTRUCTION: Place the provided LOGO image at the bottom center of the book cover.';
  }

  const model = genAI.getGenerativeModel({ model: GEMINI_IMAGE });
  const aspectRatioInstruction = scene.aspectRatio === '1:1' ? 'Aspect Ratio: 1:1 Square' : 'Aspect Ratio: 16:9 Wide';
  const fullText = `${activeStyle}. ${aspectRatioInstruction}.\n\n${parts[0].text}`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullText }, ...parts.slice(1)] }],
      });
      const candidates = result.response.candidates;
      if (!candidates?.length) throw new Error('No image data returned');
      const content = candidates[0].content;
      const responseParts = content?.parts;
      const partsList = Array.isArray(responseParts) ? responseParts : (responseParts ? [responseParts] : []);
      for (const part of partsList) {
        if (part?.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
      }
      if (partsList.length === 0) throw new Error('Response has no parts');
    } catch (err) {
      if (attempt > maxRetries) throw err;
      const wait = 2000 * Math.pow(2, attempt - 1);
      console.warn(`Image attempt ${attempt} failed, retry in ${wait}ms:`, err.message);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error('No image generated');
}

/**
 * Verify a generated scene image: no white space, nothing important in center, character consistency (if reference provided).
 * @param {string} imageBase64 - data URL or raw base64 of the generated image
 * @param {string|null} referenceBase64 - optional reference image (cover) for consistency check
 * @returns {Promise<boolean>} true if image passes checks
 */
export async function verifySceneImage(imageBase64, referenceBase64 = null) {
  const genAI = getAI();
  const model = genAI.getGenerativeModel({ model: GEMINI_TEXT });
  const b64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const parts = [
    {
      text: `You are checking an illustration for a book. Look at the attached image carefully.
Answer with exactly YES or NO (one word only).
(1) Is there NO large white or empty blank areas? The image should be filled with content, no weird empty space.
(2) Is there NO important content (text, faces, key elements) in the center vertical strip (middle third)? Important content should be on the left or right side only.
${referenceBase64 ? '(3) Do the two people in this image look like the same two people in the reference image (second attachment)? Same faces, consistent with reference.' : ''}
If ALL of the above are true, respond YES. If any is false, respond NO.`,
    },
    { inlineData: { mimeType: 'image/png', data: b64 } },
  ];
  if (referenceBase64) {
    const refB64 = referenceBase64.includes(',') ? referenceBase64.split(',')[1] : referenceBase64;
    parts.push({ inlineData: { mimeType: 'image/png', data: refB64 } });
  }
  try {
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const text = (result.response.text() || '').trim().toUpperCase();
    return text.startsWith('YES') || (text.includes('YES') && !text.startsWith('NO'));
  } catch (e) {
    console.warn('verifySceneImage error:', e.message);
    return false;
  }
}
