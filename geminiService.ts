import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { UserInput, StoryStyle, Scene, StoryPlan, TargetAudience } from "./types";

// Always initialize with the exact API key
const getFreshAI = () => {
  // Check localStorage first
  let customKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;

  // Basic validation: must be string, not empty, not 'null', not 'undefined', and reasonable length (e.g. > 10 chars)
  if (customKey && customKey.trim().length > 10 && customKey !== 'null' && customKey !== 'undefined') {
    console.log(`Initializing Gemini Client with CUSTOM KEY from localStorage (Ends with: ${customKey.slice(-4)})`);
    return new GoogleGenerativeAI(customKey);
  }

  // Check for Vercel Environment Variable
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (envKey && typeof envKey === 'string' && envKey.startsWith('AIza')) {
    console.log("Initializing Gemini Client with ENV key (VITE_GEMINI_API_KEY)...");
    return new GoogleGenerativeAI(envKey);
  }

  console.warn("No API Key found in LocalStorage or Environment Variables.");
  // Fallback or Error - Ideally we throw here or return a dummy client that errors on use, 
  // but for now let's let it fail naturally if called.
  return new GoogleGenerativeAI("MISSING_API_KEY");
};

export const setCustomApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('GEMINI_API_KEY', key);
    window.location.reload(); // Reload to ensure services pick it up
  }
};

export const getCustomApiKey = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
};

const STYLE_DESCRIPTIONS = {
  [StoryStyle.SEMI_REALISTIC]: "semi-realistic digital painting, high-quality concept art, illustrative style, painterly textures, natural facial proportions, cinematic lighting, atmospheric depth, soft detailed shading, dramatic composition, ArtStation trending, fantasy realism, no cartoon features, no 3D render.",
  [StoryStyle.ANIMATION_3D]: "3D animation style, Pixar inspired, C4D, Octane Render, cinematic lighting, volumetric atmosphere, hyper-detailed textures, 8k, masterpiece, ray-tracing, soft studio lighting, magical realism, vibrant colors, sharp focus.",
  [StoryStyle.VECTOR_ART]: "modern commercial vector illustration, 2D flat design with soft gradient shading, cute avatar style, big head small body proportions, vibrant saturated colors, clean sharp edges, smooth vector gradients, romantic cartoon, playful and expressive, highly polished digital art"
};

export const generateStoryPlan = async (input: UserInput): Promise<StoryPlan> => {
  const genAI = getFreshAI();
  // Using gemini-1.5-pro as it is the stable web-supported model that supports JSON schema well.
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
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
    Extras: ${input.extras.map(e => `${e.type}: ${e.name} (${e.description})`).join(', ')}
    STORY TEXT RULE: Each scene text MUST be exactly or very close to ${input.wordsPerScene} words in ${input.language}.
    
    CRITICAL CULTURAL RULE: This story is for a Moroccan audience. STRICTLY EXCLUDE any references to Christmas (Noël), Alcohol, Pork, Dating that violates traditional values, or any religious holidays not common in Morocco. Focus on universal themes of love, family, and respect.

    Return a JSON structure containing:
    1. A synopsis of the story (in ${input.language}).
    2. An array of 17 components:
       - Index 0: Front Cover
       - Index 1 to 15: Story scenes (Double-page spread compositions)
       - Index 16: Back Cover

    RULES FOR INDEX 0 (FRONT COVER):
    - Title must reflect the relationship if it's a couple.
    - Generate a prompt using this template:
      "{STYLE_INSTRUCTION} COMPOSITION: [Describe a dynamic, central composition]. CHARACTERS: [Describe ${input.name} ${input.audience === TargetAudience.LOVERS ? 'and ' + input.partnerName : ''} in specific NEW outfits related to the story concept]. [Describe allies/extras]. SETTING & ATMOSPHERE: [Describe the background]. TEXT ELEMENT: The headline must be placed prominently at the top. TYPOGRAPHY: Use bold, fancy, textured, and decorative typography for the title. HEADLINE TEXT: [Generated Title in ${input.language}]"

    RULES FOR INDEX 1-15 (STORY SCENES):
    - Determine a 'characterSide' ('LEFT' or 'RIGHT').
    - Generate 'storyText': Exactly or close to ${input.wordsPerScene} words in ${input.language}.
    - Generate a 'prompt' using this EXACT TEMPLATE:
      "you are a professional digital illustrator. STYLE: {STYLE_INSTRUCTION}. 
      COMPOSITION RULE: Create a wide, continuous scene. The main characters (${input.name} and ${input.partnerName || ''}) are positioned on the [SIDE] side [Describe specific action and NEW clothing]. [Further scene details].
      LAYOUT: Maintain a seamless continuous background across the entire width. Keep the EXACT VERTICAL CENTER clear of characters, faces, or important focal points. 
      TEXT PLACEMENT: The text must be placed strictly on the opposite side of the characters (the [OPPOSITE_SIDE] side), avoiding the center.
      TYPOGRAPHY: Use clean, simple, highly legible, standard font for the story text. DO NOT use fancy effects.
      TEXT: [STORY_TEXT]"

    RULES FOR INDEX 16 (BACK COVER):
    - Summary of the book (in ${input.language}).
    - Title of the book mentioned.
    - Prompt follows the Front Cover logic but is a "closing scene".

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
      aspectRatio: (idx === 0 || idx === 16) ? '1:1' : '16:9'
    }))
  };
};

export const generateSceneImage = async (scene: Scene, baseStyle: StoryStyle, mainCharacterPhoto?: string, partnerPhoto?: string): Promise<string> => {
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
      CLOTHING RULE: Do NOT use the clothing from the reference photos. Only use the clothing described in the prompt.
      TEXT RENDERING: If the prompt contains a TEXT: instruction, you MUST render that text exactly as written, clearly and elegantly within the image as described.` }
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

  console.log(`Generating Image for scene... Style: ${activeStyle}`);

  // Try to use the user's specific image model via the new SDK.
  // Assuming 'gemini-3-pro-image-preview' accepts standard generateContent calls.
  // If not, this might need adjustment, but this is the best path forward for browser compatibility.
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }]
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/png', data: base64 } },
    prompt
  ]);

  return result.response.text() || "No analysis available.";
};

export const describeAsset = async (base64Photo: string, assetType: string): Promise<{ name: string, description: string }> => {
  const genAI = getFreshAI();
  const base64 = base64Photo.split(',')[1];

  console.log(`Describing Asset: ${assetType}`);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: "application/json" }
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
    `Analyze this ${assetType} and generate a name and one-sentence description for a story book. JSON output: {"name": "...", "description": "..."}`
  ]);

  return JSON.parse(result.response.text() || '{"name": "", "description": ""}');
};
