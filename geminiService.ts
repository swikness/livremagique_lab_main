import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { UserInput, StoryStyle, Scene, StoryPlan, TargetAudience } from "./types";

// Always initialize with the exact API key
const getFreshAI = () => {
  // Check localStorage first
  let customKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;

  // Basic validation
  if (customKey && customKey.trim().length > 10 && customKey !== 'null' && customKey !== 'undefined') {
    return new GoogleGenerativeAI(customKey);
  }

  // Check for Vercel Environment Variable
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (envKey && typeof envKey === 'string' && envKey.startsWith('AIza')) {
    return new GoogleGenerativeAI(envKey);
  }

  console.warn("No API Key found.");
  return new GoogleGenerativeAI("MISSING_API_KEY");
};

export const setCustomApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('GEMINI_API_KEY', key);
    window.location.reload();
  }
};

export const getCustomApiKey = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
};

const STYLE_DESCRIPTIONS = {
  [StoryStyle.SEMI_REALISTIC]: "semi-realistic digital painting, high-quality concept art, illustrative style, painterly textures, natural facial proportions, cinematic lighting, atmospheric depth, soft detailed shading, dramatic composition, ArtStation trending, fantasy realism, no cartoon features, no 3D render.",
  [StoryStyle.REALISTIC]: "ultra-realistic photography style, 8k resolution, highly detailed, cinematic lighting, photorealistic characters, depth of field, sharp focus, professional photography, Fujifilm GFX 100, natural skin textures, volumetric lighting.",
  [StoryStyle.ANIMATION_3D]: "3D animation style, Pixar inspired, C4D, Octane Render, cinematic lighting, volumetric atmosphere, hyper-detailed textures, 8k, masterpiece, ray-tracing, soft studio lighting, magical realism, vibrant colors, sharp focus.",
  [StoryStyle.VECTOR_ART]: "modern commercial vector illustration, 2D flat design with soft gradient shading, cute avatar style, big head small body proportions, vibrant saturated colors, clean sharp edges, smooth vector gradients, romantic cartoon, playful and expressive, highly polished digital art"
};

export const generateStoryPlan = async (input: UserInput): Promise<StoryPlan> => {
  const genAI = getFreshAI();
  // UPGRADE: Using gemini-3-pro for superior reasoning
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: {
      responseMimeType: "application/json",
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
                characterSide: { type: SchemaType.STRING }
              },
              required: ["id", "type", "title", "storyText", "description", "prompt"]
            }
          }
        },
        required: ["synopsis", "scenes"]
      }
    }
  });

  const themesStr = input.selectedThemes.join(', ');
  const char1Info = `${input.name} (Age: ${input.age}, Gender: ${input.gender})`;
  const char2Info = input.audience === TargetAudience.LOVERS ? ` and ${input.partnerName} (Age: ${input.partnerAge}, Gender: ${input.partnerGender})` : '';
  const mainCharacterContext = input.audience === TargetAudience.LOVERS
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
    Target Language for ALL TEXT: ${input.language}
    STORY TEXT RULE: Each scene text MUST be exactly or very close to ${input.wordsPerScene} words in ${input.language}.
    
    CULTURAL CONTEXT: The story setting should reflect the visual style of the reference photos provided. Do not enforce any specific country unless obvious from the reference. Mix contemporary lifestyles with traditional touches if appropriate to the style. Keep the tone respectful and family-friendly.
    
    STRICT CHARACTER RULE: The story MUST focus EXCLUSIVELY on the defined Main Character(s). Do NOT invent any new supporting characters, parents, friends, guides, or talking animals unless they are explicitly requested in the 'Story Concept' or inputs. If the input does not mention other characters, the story must rely solely on the main protagonists and their environment. NO BACKGROUND CHARACTERS unless specified.

    PROMPT GENERATION RULE: In the 'prompt' field for scenes, YOU MUST NOT use the names of the characters (like '${input.name}'). Instead, use generic terms like "The Main Character", "The Man", "The Woman", "The Couple", or "reference photo". The AI image generator does not know the names.
    
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
      1. IF Theme is '10 Reasons to Love You': Title MUST be "10 RAISONS POUR LESQUELLES JE T'AIME ${input.partnerName || input.name}" (or whichever name is the recipient).
      2. IF Theme is 'Our Love Story': Title MUST be "${input.name} & ${input.partnerName} : DEUX ANS D'AMOUR DEJA" (or similar relevant duration).
      3. IF Theme is 'Bucket List': Title MUST be "${input.name} & ${input.partnerName} : NOTRE LISTE DE RÊVES".
    - The names "${input.name}" and "${input.partnerName}" are MANDATORY in the title.
    - Generate a prompt using this template:
      "{STYLE_INSTRUCTION} COMPOSITION: [Describe a dynamic, central composition]. TEXT PLACEMENT & READABILITY: The title text must be placed on a CLEAN, UNCLUTTERED area of the background (such as clear sky, soft ground, or a uniform texture). This area must be free of complex details, characters, or heavy patterns to ensure the text is perfectly legible. COMPOSITION: Arrange the scene so that there is ample negative space available for the text. CHARACTERS: [Describe "The Main Character" ${input.audience === TargetAudience.LOVERS ? 'and "The Partner"' : ''} in specific NEW outfits related to the story concept. THEY MUST BE FACING THE CAMERA.]. [Describe allies/extras]. LOGO PLACEMENT: Leave a small clear area at the bottom center for the book logo. TYPOGRAPHY: Use a BOLD, ELEGANT font that contrasts strongly with the background. The text must pop and be easily readable. HEADLINE TEXT: [Generated Title in ${input.language}]"

    RULES FOR INDEX 1-15 (STORY SCENES):
    - Generate 'storyText': Exactly or close to ${input.wordsPerScene} words in ${input.language}.
    - Generate a 'prompt' using this EXACT TEMPLATE:
      "you are a professional digital illustrator. STYLE: {STYLE_INSTRUCTION}. 
      COMPOSITION RULE: STRICT SIDE-BY-SIDE LAYOUT.
      - You MUST choose ONE of these two layouts for this scene:
          Option A: [Characters on LEFT 40%] + [Uncluttered Background on RIGHT 60% for Text]
          Option B: [Characters on RIGHT 40%] + [Uncluttered Background on LEFT 60% for Text]
      - CENTER SAFETY: The exact vertical center (50%) is the book spine. Do NOT place important faces or text here.
      - TEXT AREA: The 'Uncluttered Background' must be a seamless part of the scene (e.g., open sky, blurry wall, distant landscape). DO NOT use plain white/black.
      
      CHARACTER SAFETY: Use a WIDE SHOT (Medium-Long Shot). Leave 10-15% margin around the characters' heads and arms. Do NOT cut them off at the edge.
      [Further scene details].
      LAYOUT: Maintain a seamless continuous background across the entire width. 
      TEXT PLACEMENT: Place the text strictly in the 'Uncluttered Background' area. CRITICAL: The text block must be at least 15% away from the EXACT VERTICAL CENTER (spine) and 10% away from the outer edges to avoid cut-off. Center the text block vertically within the available space.
      TYPOGRAPHY: You MUST incorporate the [STORY_TEXT] into the image. Use a SIMPLE, CLEAN, STANDARD FONT (like Serif or Sans-Serif) that is highly readable. Do NOT use cursive, handwriting, or fancy decorative fonts. The font style must be consistent across all scenes.
      TEXT: [STORY_TEXT]"

    RULES FOR INDEX 16 (BACK COVER):
    - Summary of the book (in ${input.language}).
    - Title of the book mentioned.
    - PROMPT INSTRUCTION:
      "Design a clean, elegant Back Cover.
      COMPOSITION:
      - TOP 30% area: Reserved for the SYNOPSIS text. Background must be uncluttered (sky, soft texture) to ensure text readability.
      - MIDDLE 50% area: The main characters (Front View) looking at the camera, waving goodbye or smiling warmly.
      - BOTTOM 20% area: Reserved for BRANDING text. Background must be uncluttered.
      
      TEXT INSTRUCTION:
      1. AT THE TOP CENTER: Place the Story Synopsis. Use a readable font.
      2. AT THE BOTTOM CENTER: Place the text 'Chez Livre Magique, nous faisons de votre enfant le héros de son propre conte.' (in a small, elegant font).
      
      NO LOGO/QR CODE: Do not include any logo or QR code placeholders."
    - CRITICAL: Characters MUST BE FACING THE CAMERA (Front View).
    
    CRITICAL: All content within 'synopsis', 'title', 'storyText', and 'HEADLINE TEXT' must be written in ${input.language}.
    Return JSON format.
  `;

  console.log(`Generating Plan... Theme: ${input.theme}`);

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  const raw = JSON.parse(responseText || '{}');
  console.log("Plan Generated Successfully.");
  return {
    synopsis: raw.synopsis,
    scenes: raw.scenes.map((s: any, idx: number) => ({
      ...s,
      history: [],
      status: 'idle',
      // UPGRADE: 16:9 for scenes, 1:1 for covers
      aspectRatio: (idx === 0 || idx === 16) ? '1:1' : '16:9',
      generationRatio: (idx === 0 || idx === 16) ? '1:1' : '16:9'
    }))
  };
};

export const generateSceneImage = async (scene: Scene, baseStyle: StoryStyle, mainCharacterPhoto?: string, partnerPhoto?: string, logoBase64?: string, isRandomize: boolean = false): Promise<string> => {
  const genAI = getFreshAI();
  const activeStyle = scene.overrideStyle || baseStyle;
  const styleKeywords = STYLE_DESCRIPTIONS[activeStyle];

  let finalPrompt = scene.prompt;
  if (finalPrompt.includes('{STYLE_INSTRUCTION}')) {
    finalPrompt = finalPrompt.replace('{STYLE_INSTRUCTION}', styleKeywords);
  } else {
    finalPrompt = `STYLE: ${styleKeywords}. ${finalPrompt}`;
  }

  const parts: any[] = [
    {
      text: `${finalPrompt} 
      FACIAL CONSISTENCY: The faces of the characters must strictly match the attached facial reference photos.
      ORIENTATION RULE: Characters must be facing the FRONT/CAMERA as much as possible to ensure likeness visibility.
      SIDE CHARACTER RULE: If there are other characters mentioned who are NOT the main protagonists, they must be facing AWAY from the camera or have their faces obscured/blurred/in shadow. Only the Main Characters (whose photos are attached) should have visible faces.
      ${isRandomize ? 'RANDOMIZATION INSTRUCTION: You MUST change the clothing and the background environment to be completely different from what might be expected, while keeping the scene context valid. Be creative with outfits and setting details.' : 'CLOTHING RULE: Do NOT use the clothing from the reference photos. Only use the clothing described in the prompt.'}
      TEXT RENDERING: If the prompt contains a TEXT: instruction, you MUST render that text exactly as written, clearly and elegantly within the image as described.
      SAFETY MARGINS: Ensure the characters are fully visible with space above their heads and around their arms. Do NOT cut off features at the edge. ZOOM OUT slightly if needed. NO BORDERS. NO FRAMES. RENDER THE SCENE DIRECTLY.` }
  ];

  if (mainCharacterPhoto) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: mainCharacterPhoto.split(',')[1]
      }
    });
  }

  if (partnerPhoto) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: partnerPhoto.split(',')[1]
      }
    });
  }



  // LOGO LOGIC: Only add logo if it's NOT the back cover
  if (logoBase64 && scene.type !== 'back-cover') {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: logoBase64.split(',')[1]
      }
    });
    parts[0].text += " LOGO INSTRUCTION: Place the provided LOGO image at the bottom center of the book cover. It should be clearly visible and integrated naturally.";
  }

  console.log(`Generating Image for scene... Style: ${activeStyle}`);

  // UPGRADE: Using gemini-3-pro for images as requested
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

  // Append Aspect Ratio to the prompt manually since it's an experimental model
  const aspectRatioIntruction = scene.aspectRatio === '1:1' ? 'Aspect Ratio: 1:1 Square' : 'Aspect Ratio: 16:9 Wide';
  const finalPromptWithRatio = `${activeStyle}. ${aspectRatioIntruction}. ${finalPrompt}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: finalPromptWithRatio }, ...parts.slice(1)] }]
    });

    const candidates = result.response.candidates;
    if (!candidates || candidates.length === 0) throw new Error("No image data returned.");

    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }

  throw new Error("No image generated.");
};

export const editSceneImage = async (scene: Scene, instruction: string, mainCharacterPhoto?: string, partnerPhoto?: string): Promise<string> => {
  const genAI = getFreshAI();
  if (!scene.imageUrl) throw new Error("No image to edit.");

  const parts: any[] = [
    {
      inlineData: {
        mimeType: 'image/png',
        data: scene.imageUrl.split(',')[1]
      }
    },
    { text: `Modify this image according to these instructions: "${instruction}". Maintain the exact character faces and overall artistic style. Do not change the text placement if it exists.` }
  ];

  if (mainCharacterPhoto) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: mainCharacterPhoto.split(',')[1]
      }
    });
  }

  if (partnerPhoto) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: partnerPhoto.split(',')[1]
      }
    });
  }



  console.log("Editing Image...");
  // UPGRADE: Using gemini-3-pro
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }]
  });

  const candidates = result.response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("Edit failed.");

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No edited image generated.");
};

export const analyzeImage = async (imageUrl: string, prompt: string): Promise<string> => {
  const genAI = getFreshAI();
  const base64 = imageUrl.split(',')[1];

  console.log("Analyzing Image...");
  // UPGRADE: Using gemini-3-pro
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/png', data: base64 } },
    prompt
  ]);

  return result.response.text();
};

export const validateBookSpread = async (imageUrl: string): Promise<{ isValid: boolean; reason?: string; retryInstruction?: string }> => {
  const genAI = getFreshAI();
  const base64 = imageUrl.split(',')[1];
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

  const prompt = `
    Analyze this book spread image. It will be split specifically down the EXACT VERTICAL CENTER (50% width) to form two pages.
    
    CHECK FOR FATAL FLAWS:
    1. FOLD SAFETY: Is a character's face or a crucial text element located exactly on the vertical center line? (e.g., cut in half by the spine).
    2. CROP SAFETY: Are the main characters' heads or key text elements cut off at the top, bottom, or side edges?
    3. COMPOSITION: Is the image mainly empty or broken?

    Return a JSON object:
    {
      "isValid": boolean, // true if NO fatal flaws. false if faces/text are cut.
      "reason": "short explanation of the flaw",
      "retryInstruction": "specific instruction to fix it, e.g., 'Zoom out and move characters to the left to avoid the center fold'"
    }
  `;

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/png', data: base64 } },
      prompt
    ]);
    const text = result.response.text();
    // Clean JSON string if needed (remove markdown)
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Validation failed", e);
    return { isValid: true }; // Default to valid if validation fails to avoid infinite loops on error
  }
};

export const describeAsset = async (base64Photo: string, assetType: string): Promise<{ name: string, description: string }> => {
  const genAI = getFreshAI();
  const base64 = base64Photo.split(',')[1];

  console.log(`Describing Asset: ${assetType}`);
  // UPGRADE: Using gemini-3-pro
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: { responseMimeType: "application/json" }
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
    `Analyze this ${assetType} and generate a name and one-sentence description for a story book. JSON output: {"name": "...", "description": "..."}`
  ]);

  return JSON.parse(result.response.text() || '{"name": "", "description": ""}');
};

// NEW FUNCTION: Photo Analysis
export const analyzePhotoQuality = async (base64Photo: string): Promise<{ score: number, feedback: string }> => {
  const genAI = getFreshAI();
  const base64 = base64Photo.split(',')[1];

  console.log("Analyzing Photo Quality...");
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-pro-preview',
    generationConfig: { responseMimeType: "application/json" }
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
    `Analyze this face photo for AI image generation suitability. 
    Criteria:
    1. Sharpness/Focus (must be clear)
    2. Lighting (must be balanced, no harsh shadows)
    3. Orientation (must be FRONT facing, clearly visible eyes/nose/mouth)
    4. Completeness (no cropping of major facial features)
    
    Return JSON: {"score": number (0-100), "feedback": "Short advice string"}`
  ]);

  try {
    const raw = JSON.parse(result.response.text());
    return { score: raw.score || 0, feedback: raw.feedback || "Could not analyze." };
  } catch (e) {
    return { score: 50, feedback: "Analysis error." };
  }
};
