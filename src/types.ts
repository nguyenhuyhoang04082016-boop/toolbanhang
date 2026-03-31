export type Language = 'en' | 'vi';
export type Platform = 'TikTok' | 'Reels' | 'FB' | 'YouTube Shorts';
export type VideoRatio = '9:16' | '1:1' | '16:9';
export type VideoType = 'review' | 'cinematic' | 'vlog' | 'unboxing' | 'tutorial';
export type HookStyle = 'question' | 'shock' | 'story' | 'problem-solution' | 'testimonial';
export type CTAType = 'buy now' | 'message inbox' | 'click link' | 'comment keyword';
export type VoiceoverStyle = 'male' | 'female' | 'neutral';
export type VoiceoverSpeed = 'fast' | 'normal' | 'slow';

export interface ImageCategory {
  id: string;
  name: string;
  images: string[];
}

export interface VisualTemplate {
  id: string;
  name: string;
  timestamp: number;
  categories: ImageCategory[];
}

export type DialogueType = 'self-talk' | 'no-read' | 'none';

export interface ScriptOrientation {
  style: string;
  dialogueType: DialogueType;
  targetAudience?: string;
  keyMessage?: string;
  toneOfVoice?: string;
  additionalNotes?: string;
}

export interface ProductInfo {
  name: string;
  category?: string;
  ratio: VideoRatio;
  videoType?: VideoType;
  additionalRequirements?: string;
  referenceImages?: string[];
  imageCategories?: ImageCategory[];
  selectedTemplateId?: string;
  scriptOrientation?: ScriptOrientation;
  
  // Legacy fields for compatibility if needed, but we'll focus on the above
  targetUser?: string;
  benefits?: string[];
  features?: string[];
  price?: number;
  currency?: string;
  showPrice?: boolean;
  audienceDesc?: string;
  painPoint?: string;
  emotion?: string;
  positioning?: 'budget' | 'mid' | 'premium';
  platform?: Platform;
  totalLength?: number;
  hookStyle?: HookStyle;
  ctaType?: CTAType;
  characterType?: 'real' | 'cartoon';
  voiceoverStyle?: VoiceoverStyle;
  voiceoverSpeed?: VoiceoverSpeed;
  hasVoiceover?: boolean;
  onScreenText?: boolean;
}

export interface AdSegment {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  visualDirection: string;
  onScreenText: string;
  voiceover: string;
  sfx: string;
  cameraNotes?: string;
  imagePrompt?: string;
  startImageUrl?: string;
  endImageUrl?: string;
  videoUrl?: string;
  videoPrompt?: string;
  motionPrompt?: string;
  motionTitle?: string;
  isGeneratingStart?: boolean;
  isGeneratingEnd?: boolean;
  isGeneratingVideo?: boolean;
}

export interface VideoScene {
  id: string;
  index: number;
  startTime: string;
  endTime: string;
  durationSec: number;
  prompt: string;
  visualDirection?: string;
  voiceover?: string;
  onScreenText?: string;
  negativePrompt: string;
  camera: string;
  lighting: string;
  style: string;
  notes: string;
  motionPrompt?: string;
  motionTitle?: string;
  approved: boolean;
  selected?: boolean;
  imageUrl?: string;
  startImageUrl?: string;
  endImageUrl?: string;
}

export interface UsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  lastAction?: {
    model: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: number;
    actualInputTokens: number;
    actualOutputTokens: number;
    actualCost: number;
    diffPercent: number;
    timestamp: number;
  };
}

export interface AdScript {
  id: string;
  timestamp: number;
  language: Language;
  segments: AdSegment[];
  seamlessScript?: string;
  productAnalysis?: {
    features: string[];
    specs: string[];
    usage: string[];
    benefits: string[];
  };
  productInfo: ProductInfo;
  characterProfile?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  timestamp: number;
  data: ProductInfo;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
