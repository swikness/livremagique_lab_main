
export enum AppStep {
  INPUT = 'INPUT',
  PLANNING = 'PLANNING',
  CREATION = 'CREATION'
}

export enum StoryStyle {
  ANIMATION_3D = '3D Animation',
  SEMI_REALISTIC = 'Semi-Realistic',
  VECTOR_ART = 'Vector Illustration'
}

// Added LOVERS to audience segments
export enum TargetAudience {
  KIDS = 'Kids',
  ADULTS = 'Adults',
  LOVERS = 'Lovers'
}

export interface ExtraAsset {
  id: string;
  type: string; // 'character', 'place', 'object'
  name: string;
  description: string;
  photoBase64?: string;
}

export interface Scene {
  id: number;
  type: 'front-cover' | 'back-cover' | 'scene';
  title: string;
  description: string;
  prompt: string;
  storyText?: string;
  imageUrl?: string;
  history: string[];
  status: 'idle' | 'loading' | 'done' | 'error';
  correctionAnalysis?: string;
  aspectRatio: '1:1' | '16:9' | '2:1'; // Current state of the image
  generationRatio?: '1:1' | '16:9'; // Original generation ratio
  printRatio?: '1:1' | '2:1'; // Target ratio for printing/splitting
  overrideStyle?: StoryStyle;
  characterSide?: 'LEFT' | 'RIGHT';
  editInstruction?: string;
  splitImages?: [string, string]; // Resulting 1:1 pages after split
  historyIndex?: number;
  approved?: boolean;
}

export interface StoryPlan {
  synopsis: string;
  scenes: Scene[];
}

export interface UserInput {
  name: string;
  age: string;
  gender: string;
  photoBase64?: string;
  // Second character for Lovers mode
  partnerName?: string;
  partnerAge?: string;
  partnerGender?: string;
  partnerPhotoBase64?: string;

  audience: TargetAudience;
  theme: string;
  selectedThemes: string[];
  style: StoryStyle;
  extras: ExtraAsset[];
  language: string;
  wordsPerScene: number;
  yearsCount?: string;
}
