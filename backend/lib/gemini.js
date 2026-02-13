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

  const prompt = `
    You are a professional book editor and world-class storyteller.
    Create a detailed 17-part story plan for a ${input.audience} book.
    ${mainCharacterContext}
    Story Concept: ${input.theme}
    Themes to include: ${themesStr}
    Visual Style: ${input.style}
    Target Language for ALL TEXT: ${input.language}
    STORY TEXT RULE: Each scene text MUST be exactly or very close to ${input.wordsPerScene} words in ${input.language}.

    CULTURAL CONTEXT: The story setting should reflect the visual style of the reference photos provided. Do not enforce any specific country unless obvious from the reference. Mix contemporary lifestyles with traditional touches if appropriate to the style. Keep the tone respectful and family-friendly.

    STRICT CHARACTER RULE: The story MUST focus EXCLUSIVELY on the defined Main Character(s). Do NOT invent any new supporting characters, parents, friends, guides, or talking animals unless they are explicitly requested in the 'Story Concept' or inputs. If the input does not mention other characters, the story must rely solely on the main protagonists and their environment. NO BACKGROUND CHARACTERS unless specified.

    PROMPT GENERATION RULE: In the 'prompt' field for scenes, YOU MUST NOT use the names of the characters (like '${input.name}'). Instead, use generic terms like "The Main Character", "The Man", "The Woman", "The Couple", or "reference photo". The AI image generator does not know the names.

    NARRATIVE PERSONA: You MUST frequently use the Main Character's actual name (${input.name}) in the storyText to make it feel deeply personal. Do not just say 'he' or 'she' all the time.

    MISSING REFERENCE PHOTO RULE: If a new character is mentioned or required by the story/theme but NO reference photo is provided for them in the inputs:
    1. STRICTLY LIMIT their presence. Do NOT make them a main part of the scene.
    2. NARRATIVE: Refer to them in the third person or indirectly (e.g. "The shopkeeper smiled" instead of a full dialogue).
    3. VISUAL PROMPTS: Describe them generically (e.g. "a silhouette", "background figure", "a friend seen from behind") and ENSURE they are NOT the focal point. Do NOT provide specific facial features for them.

    Return a JSON structure containing:
    1. A synopsis of the story (in ${input.language}).
    2. An array of 17 components:
       - Index 0: Front Cover
       - Index 1 to 15: Story scenes (wide cinematic shots)
       - Index 16: Back Cover

    RULES FOR INDEX 0 (FRONT COVER):
    - Title must reflect the relationship if it's a couple.
    - MANDATORY: The title text on the cover MUST follow these EXACT formats based on the story type:
      1. IF Theme is '10 Reasons to Love You': Title MUST be "RAISONS POUR LESQUELLES JE T'AIME ${input.partnerName || input.name}" (or whichever name is the recipient).
      2. IF Theme is 'Our Love Story': Title MUST be "${input.name} & ${input.partnerName} : DEUX ANS D'AMOUR DEJA" (or similar relevant duration).
      3. IF Theme is 'Bucket List': Title MUST be "${input.name} & ${input.partnerName} : NOTRE LISTE DE RÊVES".
    - The names "${input.name}" and "${input.partnerName}" are MANDATORY in the title.
    - Generate a prompt using this template:
      "{STYLE_INSTRUCTION} COMPOSITION: [Describe a dynamic, central composition]. TEXT PLACEMENT & READABILITY: The title text must be placed on a CLEAN, UNCLUTTERED area of the background. Do NOT add any background, blur, or panel behind the text. COMPOSITION: Arrange the scene so there is natural negative space for the text. CHARACTERS: Do NOT describe the characters' physical appearance; use the attached reference photo(s) for how they look. Only describe pose, clothing, and placement (e.g. standing, in [outfit type], facing the camera). THEY MUST BE FACING THE CAMERA. LOGO PLACEMENT: The logo will be placed at the bottom center. TYPOGRAPHY: Use a BOLD, ELEGANT font that contrasts with the background. HEADLINE TEXT: [Generated Title in ${input.language}]"

    RULES FOR INDEX 1-15 (STORY SCENES):
    - Generate 'storyText': Exactly or close to ${input.wordsPerScene} words in ${input.language}.
    - Generate a 'prompt' using this EXACT TEMPLATE:
      "you are a professional digital illustrator. STYLE: {STYLE_INSTRUCTION}.
      COMPOSITION RULE: STRICT SIDE-BY-SIDE LAYOUT.
      - You MUST choose ONE of these two layouts for this scene:
          Option A: [Characters on LEFT side] + [Uncluttered Background on RIGHT side for Text]
          Option B: [Characters on RIGHT side] + [Uncluttered Background on LEFT side for Text]
      - CENTER SAFETY: The exact vertical center (50%) is the book spine. Do NOT place important faces or text here.
      - TEXT: Do NOT add any background, blur, panel, or color block behind the text. Place the text over a part of the scene (e.g. open sky, distant landscape). The scene must be one continuous image; text is overlaid with no separate area behind it.
      - Do NOT describe the characters' faces or bodies in the prompt; the reference photo(s) define their appearance. Only describe pose, clothing, and placement.

      CHARACTER SAFETY: Use a WIDE SHOT (Medium-Long Shot). Leave margin around the characters' heads and arms. Do NOT cut them off at the edge.
      [Further scene details].
      LAYOUT: Maintain a seamless continuous background across the entire width.
      TEXT PLACEMENT: Place the text away from the EXACT VERTICAL CENTER (spine) and the outer edges. Do not add any background behind the text.
      TYPOGRAPHY: You MUST incorporate the [STORY_TEXT] into the image. Use a SIMPLE, CLEAN, STANDARD FONT (like Serif or Sans-Serif) that is highly readable. Do NOT use cursive, handwriting, or fancy decorative fonts. The font style must be consistent across all scenes.
      TEXT: [STORY_TEXT]"

    RULES FOR INDEX 16 (BACK COVER):
    - Summary of the book (in ${input.language}).
    - Title of the book mentioned.
    - PROMPT INSTRUCTION:
      "Design a clean, elegant Back Cover.
      COMPOSITION:
      - TOP AREA: Reserved for the SYNOPSIS text. Background must be uncluttered (sky, soft texture).
      - CENTER AREA: The main characters (Front View) looking at the camera, waving goodbye or smiling warmly.
      - BOTTOM AREA: Reserved for the BRAND MESSAGE. Background must be uncluttered.

      TEXT INSTRUCTION:
      1. AT THE TOP: Render this EXACT Synopsis text: \\"[Insert the generated Synopsis here]\\"
      2. AT THE BOTTOM: Render this EXACT Brand Message: \\"[Insert the generated Brand Message here]\\"

      CRITICAL: You MUST write the actual synopsis text and brand message text in the image. Do not use placeholders."
    - CRITICAL: Characters MUST BE FACING THE CAMERA (Front View).

    CRITICAL: All content within 'synopsis', 'title', 'storyText', and 'HEADLINE TEXT' must be written in ${input.language}.
    Return JSON format.
  `;

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
    : 'You have two reference photos: use the first for the main character and the second for the partner. CHARACTER CONSISTENCY: Both characters must look EXACTLY like their attached reference photo. Same faces, same features, same couple in every scene. Do not deviate from the reference.';

  const isStoryScene = scene.id >= 1 && scene.id <= 15;
  const isBackCover = scene.id === 16 || scene.type === 'back-cover';
  const safeZoneRules = isStoryScene
    ? `LAYOUT: Keep narrative text away from the exact vertical center (book spine). Do NOT add any background, blur, or panel behind the text. Fill the entire frame; no white space. TYPOGRAPHY: Same font style, size, and weight throughout. No italics, no varying sizes.`
    : '';

  const backCoverRules = isBackCover
    ? 'BACK COVER LAYOUT: Text (synopsis or tagline) at the TOP. Logo at the BOTTOM center. The two characters in the MIDDLE facing camera. Fill the frame; no white space.'
    : '';

  const backgroundRules = `CRITICAL - NO BACKGROUND FOR TEXT: Do NOT add any background behind the text. No blur, no semi-transparent panel, no solid color, no tint, no gradient, no text box. The entire image must be ONE continuous, sharp scene. For text readability use ONLY a very subtle shadow or outline on the letters themselves - nothing behind the text. The scene must be fully visible and sharp everywhere.`;

  const parts = [
    {
      text: `${finalPrompt}
FACIAL CONSISTENCY: The faces of the characters must strictly match the attached facial reference photos.
${refInstruction}
ORIENTATION RULE: Characters must be facing the FRONT/CAMERA as much as possible to ensure likeness visibility.
SIDE CHARACTER RULE: If there are other characters mentioned who are NOT the main protagonists, they must be facing AWAY from the camera or have their faces obscured/blurred/in shadow. Only the Main Characters (whose photos are attached) should have visible faces.
ONLY TWO CHARACTERS: Show ONLY the couple (the man and the woman from the reference). No other people, no background characters, no extras, no strangers. The image must contain exactly these two characters and nothing else human.
CLOTHING RULE: Do NOT use the clothing from the reference photos. Only use the clothing described in the prompt.
TEXT RENDERING: If the prompt contains a TEXT: instruction, you MUST render that text exactly as written, clearly and elegantly within the image as described.
SAFETY MARGINS: Ensure the characters are fully visible with space above their heads and around their arms. Do NOT cut off features at the edge. ZOOM OUT slightly if needed. NO BORDERS. NO FRAMES. RENDER THE SCENE DIRECTLY.
IMAGE QUALITY: The image MUST be sharp, in focus, and high detail everywhere. Fill the entire frame; no white space, no empty areas, no blank margins.
${backgroundRules}
${isStoryScene ? 'SCENE RULE: This is a story scene illustration, NOT the book cover. Create a clearly different composition, setting, and moment from the cover.' : ''}
${safeZoneRules}
${backCoverRules}
TYPOGRAPHY: Same font style and size throughout. Full visibility, no cut-off.`,
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
