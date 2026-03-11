export type Language = 'en' | 'vi';
export type Tone = 'Funny' | 'Premium' | 'Urgent' | 'Warm' | 'Informative';
export type Platform = 'TikTok' | 'Reels' | 'FB' | 'YouTube Shorts';
export type VideoRatio = '9:16' | '1:1' | '16:9';
export type HookStyle = 'question' | 'shock' | 'story' | 'problem-solution' | 'testimonial';
export type CTAType = 'buy now' | 'message inbox' | 'click link' | 'comment keyword';
export type VoiceoverStyle = 'male' | 'female' | 'neutral';
export type VoiceoverSpeed = 'fast' | 'normal' | 'slow';

export interface ProductInfo {
  name: string;
  category: string;
  targetUser: string;
  benefits: string[];
  customBenefit: string;
  features: string[];
  materials?: string;
  sizes?: string;
  price: number;
  currency: string;
  promotion?: string;
  stock?: string;
  shipping?: string;
  warranty?: string;
  
  audienceDesc: string;
  painPoint: string;
  emotion: string;
  positioning: 'budget' | 'mid' | 'premium';
  
  platform: Platform;
  ratio: VideoRatio;
  totalLength: number;
  hookStyle: HookStyle;
  ctaType: CTAType;
  characterType: 'real' | 'cartoon';
  forbiddenClaims?: string;
  
  brandName?: string;
  brandSlogan?: string;
  keywordsInclude?: string;
  keywordsAvoid?: string;
  voiceoverStyle: VoiceoverStyle;
  voiceoverSpeed: VoiceoverSpeed;
  hasVoiceover: boolean;
  onScreenText: boolean;
  musicVibe?: string;
  productImages?: string[];
  usageImages?: string[];
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
  tone: Tone;
  segments: AdSegment[];
  seamlessScript?: string;
  productInfo: ProductInfo;
  characterProfile?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  timestamp: number;
  data: ProductInfo;
}

export interface AffiliateChannelInfo {
  platform: string;
  channelType: string;
  channelGoal: string;
  channelName: string;
  channelDescription: string;
  
  mainTopic: string;
  subTopics: string[];
  targetAudience: string[];
  customerInsight: string;
  customerPainPoints: string;
  productBenefits: string;
  contentStyle: string[];
  contentTone: string;
  targetVideoLength: string;
  postingFrequency: string;
  
  hookType: string[];
  scriptStructure: string;
  ideaCount: number;
  segmentCount: number;
  diversityLevel: 'Low' | 'Medium' | 'High';
  ctaText: string;
  specialRequirements: string;
}

export interface AffiliateIdea {
  id: string;
  conceptTitle: string;
  platform: string;
  topic: string;
  contentAngle: string;
  hookType: string;
  hookText: string;
  cta: string;
  scenes: {
    scene: number;
    script: string;
    visualDescription: string;
    imagePrompt: string;
    videoPrompt: string;
  }[];
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
