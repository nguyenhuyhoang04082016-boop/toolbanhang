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
  forbiddenClaims?: string;
  
  brandName?: string;
  brandSlogan?: string;
  keywordsInclude?: string;
  keywordsAvoid?: string;
  voiceoverStyle: VoiceoverStyle;
  voiceoverSpeed: VoiceoverSpeed;
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
  isGeneratingStart?: boolean;
  isGeneratingEnd?: boolean;
  isGeneratingVideo?: boolean;
}

export interface AdScript {
  id: string;
  timestamp: number;
  language: Language;
  tone: Tone;
  segments: AdSegment[];
  productInfo: ProductInfo;
  characterProfile?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  timestamp: number;
  data: ProductInfo;
}
