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

STRICT CHARACTER RULE: The story MUST focus EXCLUSIVELY on the defined Main Character(s). Do NOT invent any new supporting characters unless explicitly requested.
PROMPT GENERATION RULE: In the 'prompt' field for scenes, use generic terms like "The Main Character", "The Man", "The Woman", "The Couple" - NOT the names.
NARRATIVE PERSONA: Use the Main Character's actual name (${input.name}) in storyText frequently.

Return JSON: synopsis (string) and scenes (array of 17 items). Index 0 = Front Cover, 1-15 = Story scenes, 16 = Back Cover.
For INDEX 0: title with names ${input.name} and ${input.partnerName}; prompt for cover with STYLE_INSTRUCTION placeholder.
For INDEX 1-15: storyText (~${input.wordsPerScene} words), prompt with {STYLE_INSTRUCTION} and [STORY_TEXT] placeholders, side-by-side layout for text.
For INDEX 16: Back cover prompt, synopsis area, characters facing camera.
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

  const singleReference = mainCharacterPhoto && !partnerPhoto;
  const refInstruction = singleReference
    ? 'FACIAL CONSISTENCY: The characters must strictly match the ONE attached reference image (use it for both protagonists).'
    : 'FACIAL CONSISTENCY: The faces of the characters must strictly match the attached facial reference photos.';

  const parts = [
    {
      text: `${finalPrompt}
${refInstruction}
ORIENTATION RULE: Characters must be facing the FRONT/CAMERA. SIDE CHARACTER RULE: Others facing AWAY or obscured.
CLOTHING RULE: Do NOT use the clothing from the reference photos. Only use the clothing described in the prompt.
TEXT RENDERING: If the prompt contains a TEXT: instruction, render that text exactly. SAFETY MARGINS: Full visibility, no cut-off. NO BORDERS.`,
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
  if (logoBase64 && scene.type !== 'back-cover') {
    const b64 = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
    parts.push({ inlineData: { mimeType: 'image/png', data: b64 } });
    parts[0].text += ' LOGO INSTRUCTION: Place the provided LOGO image at the bottom center of the book cover.';
  }

  const model = genAI.getGenerativeModel({ model: GEMINI_IMAGE });
  const aspectRatioInstruction = scene.aspectRatio === '1:1' ? 'Aspect Ratio: 1:1 Square' : 'Aspect Ratio: 16:9 Wide';
  const finalPromptWithRatio = `${activeStyle}. ${aspectRatioInstruction}. ${finalPrompt}`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: finalPromptWithRatio }, ...parts.slice(1)] }],
      });
      const candidates = result.response.candidates;
      if (!candidates?.length) throw new Error('No image data returned');
      const content = candidates[0].content;
      const parts = content?.parts;
      const partsList = Array.isArray(parts) ? parts : (parts ? [parts] : []);
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
