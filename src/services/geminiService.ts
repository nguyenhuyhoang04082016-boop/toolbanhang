import { GoogleGenAI, Type } from "@google/genai";
import { ProductInfo, AdSegment, Language, Tone, AdScript } from "../types";
import { trackUsage, calculateCost } from "./costService";

const DEFAULT_MODEL = "gemini-2.5-flash";

const getApiKey = (type: 'gemini' | 'veo' = 'gemini') => {
  const manualGeminiKey = typeof window !== 'undefined' ? localStorage.getItem('manual_gemini_api_key') : null;
  const manualVeoKey = typeof window !== 'undefined' ? localStorage.getItem('manual_veo_api_key') : null;
  
  // Priority: 
  // 1. Manual key for specific type (entered in text fields)
  // 2. Platform selected key (selected via "Chọn API Key từ Project")
  // We EXPLICITLY remove process.env.GEMINI_API_KEY to avoid "passive" usage.
  
  if (type === 'veo') {
    return manualVeoKey || process.env.API_KEY || "";
  }
  return manualGeminiKey || process.env.API_KEY || "";
};

const getAiInstance = (type: 'gemini' | 'veo' = 'gemini') => {
  return new GoogleGenAI({ apiKey: getApiKey(type) });
};

/**
 * Task Queue to limit concurrent API calls
 */
class TaskQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    this.running++;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } finally {
        this.running--;
        this.process();
      }
    }
  }
}

const apiQueue = new TaskQueue(2); // Limit to 2 concurrent calls to avoid 429s

// Simple in-memory cache to avoid redundant API calls
const cache = new Map<string, any>();

/**
 * Helper to call Gemini with exponential backoff and retries
 */
async function callGeminiWithRetry(
  params: any,
  type: 'gemini' | 'veo' = 'gemini',
  maxRetries = 3,
  baseDelay = 3000
): Promise<any> {
  // Create a cache key from params
  const cacheKey = JSON.stringify(params);
  if (cache.has(cacheKey)) {
    console.log("Returning cached Gemini response");
    return cache.get(cacheKey);
  }

  const ai = getAiInstance(type);
  const modelName = params.model || DEFAULT_MODEL;

  // Estimation phase
  let estimatedInputTokens = 0;
  let estimatedOutputTokens = 1000; // Default estimate for output
  
  try {
    const countResult = await ai.models.countTokens({
      model: modelName,
      contents: params.contents
    });
    estimatedInputTokens = countResult.totalTokens || 0;
  } catch (e) {
    console.warn("Failed to count tokens for estimation", e);
  }

  // Notify UI about estimation (we'll use a custom event)
  const estimateEvent = new CustomEvent('gemini_cost_estimate', {
    detail: {
      model: modelName,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      estimatedCost: calculateCost(estimatedInputTokens, estimatedOutputTokens)
    }
  });
  window.dispatchEvent(estimateEvent);

  return apiQueue.add(async () => {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 3s, 6s, 12s...
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Retry attempt ${attempt} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const response = await ai.models.generateContent(params);
        
        // Tracking actual usage
        const actualInputTokens = response.usageMetadata?.promptTokenCount || estimatedInputTokens;
        const actualOutputTokens = response.usageMetadata?.candidatesTokenCount || 0;
        
        trackUsage(
          modelName,
          estimatedInputTokens,
          estimatedOutputTokens,
          actualInputTokens,
          actualOutputTokens
        );

        // Notify UI about actual cost
        const actualEvent = new CustomEvent('gemini_cost_actual', {
          detail: {
            model: modelName,
            actualInputTokens,
            actualOutputTokens,
            actualCost: calculateCost(actualInputTokens, actualOutputTokens)
          }
        });
        window.dispatchEvent(actualEvent);

        // Cache the successful response
        cache.set(cacheKey, response);
        return response;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || "";
        const statusCode = error?.status || 0;
        
        // Only retry on rate limit (429) or temporary server errors (500, 503)
        const isRateLimit = statusCode === 429 || errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota");
        const isServerError = statusCode >= 500 || errorMessage.includes("500") || errorMessage.includes("503");
        
        if (!isRateLimit && !isServerError) {
          throw error;
        }
        
        console.warn(`Gemini API error (Attempt ${attempt + 1}):`, errorMessage);
        
        // If it's a rate limit, increase the delay significantly for the next attempt
        if (isRateLimit && attempt === 0) {
           // Wait a bit longer on the first 429
           await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    throw lastError;
  });
}

export async function generateAdScript(
  product: ProductInfo,
  language: Language,
  tone: Tone,
  brandVoice: boolean
): Promise<{ segments: AdSegment[], seamlessScript: string }> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const systemInstruction = `You are an expert short-form ad script writer. 
  Generate a high-converting ad script split into segments of 6-8 seconds each.
  Structure: approximately ${Math.ceil(product.totalLength / 7)} segments.
  Format: JSON object with "segments" (array) and "seamlessScript" (string).
  Language: ${language === 'vi' ? 'Vietnamese' : 'English'}.
  Tone: ${tone}.
  Character Type: ${product.characterType === 'real' ? 'Real Person (Photorealistic)' : 'Cartoon/Animation/3D Style'}.
  Brand Voice: ${brandVoice ? 'Enabled (more professional and consistent)' : 'Disabled'}.
  Voiceover: Enabled. Generate natural, persuasive dialogue.
  Structure Strategy: Use AIDA (Attention, Interest, Desire, Action) or PAS (Problem, Agitation, Solution).
  - Segment 1: Strong hook.
  - Middle segments: Benefits, proof, objection handling.
  - Final segment: Offer and Call to Action.
  
  Compliance: Avoid unrealistic medical claims.
  
  Each segment object must have:
  - visualDirection: string (what viewers see)
  - onScreenText: string (text on screen)
  - voiceover: string (natural, persuasive dialogue)
  - sfx: string (short audio cues)
  - cameraNotes: string (optional camera/edit tips)

  The "seamlessScript" should be the full voiceover script combined into one smooth, natural paragraph.
  `;

  const prompt = `
  Product Details:
  - Name: ${product.name}
  - Category: ${product.category}
  - Target: ${product.targetUser}
  - Benefits: ${product.benefits.join(", ")} ${product.customBenefit}
  - Features: ${product.features.join(", ")}
  - Price: ${product.price} ${product.currency}
  - Promotion: ${product.promotion || 'None'}
  - Audience: ${product.audienceDesc}
  - Pain Point: ${product.painPoint}
  - Emotion: ${product.emotion}
  - Positioning: ${product.positioning}
  
  Ad Requirements:
  - Platform: ${product.platform}
  - Ratio: ${product.ratio}
  - Total Length: ${product.totalLength}s
  - Hook Style: ${product.hookStyle}
  - CTA: ${product.ctaType}
  - Forbidden: ${product.forbiddenClaims || 'None'}
  
  Creative Assets:
  - Brand: ${product.brandName || 'N/A'}
  - Slogan: ${product.brandSlogan || 'N/A'}
  - Keywords to include: ${product.keywordsInclude || 'N/A'}
  - Keywords to avoid: ${product.keywordsAvoid || 'N/A'}
  - Voiceover: ${product.hasVoiceover ? `${product.voiceoverStyle}, ${product.voiceoverSpeed} speed` : 'None'}
  - Music vibe: ${product.musicVibe || 'N/A'}
  
  Generate exactly ${product.totalLength / 8} segments of 8 seconds each.
  `;

  const getImageData = (img: string) => {
    const [header, data] = img.split(',');
    const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
    return { mimeType, data };
  };

  const imageParts = [
    ...(product.productImages || []).slice(0, 3).map(img => {
      const { mimeType, data } = getImageData(img);
      return { inlineData: { mimeType, data } };
    }),
    ...(product.usageImages || []).slice(0, 3).map(img => {
      const { mimeType, data } = getImageData(img);
      return { inlineData: { mimeType, data } };
    })
  ];

  const contents = imageParts.length > 0 
    ? { parts: [{ text: prompt }, ...imageParts] }
    : prompt;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  visualDirection: { type: Type.STRING },
                  onScreenText: { type: Type.STRING },
                  voiceover: { type: Type.STRING },
                  sfx: { type: Type.STRING },
                  cameraNotes: { type: Type.STRING },
                },
                required: ["visualDirection", "onScreenText", "voiceover", "sfx"],
              },
            },
            seamlessScript: { type: Type.STRING }
          },
          required: ["segments", "seamlessScript"]
        },
      },
    });

    const rawJson = response.text;
    if (!rawJson) throw new Error("No response from AI");
    
    const result = JSON.parse(rawJson);
    const segments: any[] = result.segments;
    const seamlessScript: string = result.seamlessScript;
    
    return {
      segments: segments.map((s, i) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        index: i + 1,
        startTime: i * 8,
        endTime: (i + 1) * 8,
      })),
      seamlessScript
    };
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

export async function generateCharacterProfile(product: ProductInfo): Promise<string> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  const prompt = `Based on this product and target audience, create a detailed visual description of a recurring character or mascot for the ad campaign to ensure visual consistency. 
  Product: ${product.name}
  Character Type: ${product.characterType === 'real' ? 'Real Person' : 'Cartoon/Animation'}
  Audience: ${product.audienceDesc}
  Tone: ${product.emotion}
  
  Describe their appearance, clothing, and key features in 2-3 sentences.`;

  const getImageData = (img: string) => {
    const [header, data] = img.split(',');
    const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
    return { mimeType, data };
  };

  const imageParts = [
    ...(product.productImages || []).slice(0, 2).map(img => {
      const { mimeType, data } = getImageData(img);
      return { inlineData: { mimeType, data } };
    }),
    ...(product.usageImages || []).slice(0, 2).map(img => {
      const { mimeType, data } = getImageData(img);
      return { inlineData: { mimeType, data } };
    })
  ];

  const contents = imageParts.length > 0 
    ? { parts: [{ text: prompt }, ...imageParts] }
    : prompt;

  const response = await callGeminiWithRetry({
    model,
    contents,
  });

  return response.text || "A friendly person using the product.";
}

export async function generateImagePrompts(
  segments: AdSegment[],
  characterProfile: string,
  productName: string
): Promise<string[]> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  const prompt = `For each of the following ad segments, generate a high-quality, detailed image generation prompt. 
  
  CRITICAL: Visual Consistency
  - Character Profile: ${characterProfile}
  - Character Style: ${characterProfile.toLowerCase().includes('cartoon') || characterProfile.toLowerCase().includes('animation') ? 'Cartoon/3D Animation' : 'Photorealistic/Real Person'}
  - The character described above MUST be the main subject in every image.
  - Keep the same clothing, hair, and facial features throughout.
  - Product: ${productName}
  
  Segments:
  ${segments.map(s => `Segment ${s.index}: ${s.visualDirection}`).join("\n")}
  
  Return a JSON array of strings, one for each segment. Each prompt should be in English and optimized for image generation (photorealistic, 8k, highly detailed, specific lighting). The prompt should describe the general scene for that segment.`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function generateImage(
  prompt: string, 
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9",
  base64Image?: string
): Promise<string> {
  const apiKey = getApiKey('gemini');
  const aiImage = new GoogleGenAI({ apiKey });

  return apiQueue.add(async () => {
    try {
      const parts: any[] = [{ text: prompt }];
      
      if (base64Image) {
        const [header, data] = base64Image.split(',');
        const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
        parts.unshift({
          inlineData: {
            mimeType,
            data
          }
        });
      }

      const response = await aiImage.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts,
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });

      const candidate = response.candidates?.[0];
      
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error("Nội dung bị chặn bởi bộ lọc an toàn.");
      }

      // Handle permission errors
      if (response.text?.includes("not allowed") || response.text?.includes("permission denied")) {
        throw new Error("Tài khoản Gemini Miễn phí không hỗ trợ tạo ảnh qua API. Bạn cần nâng cấp lên gói trả phí (Paid) trong Google Cloud để sử dụng tính năng này.");
      }

      for (const part of candidate?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("Không thể tạo ảnh từ câu lệnh này. Có thể do giới hạn của tài khoản miễn phí.");
    } catch (error: any) {
      if (error?.message?.includes("403") || error?.message?.includes("permission")) {
        throw new Error("Tài khoản Gemini Miễn phí không hỗ trợ tạo ảnh qua API. Vui lòng sử dụng API Key từ một Project có bật thanh toán (Paid).");
      }
      throw error;
    }
  });
}

export async function generateVideoPrompts(
  segments: AdSegment[],
  characterProfile: string,
  productName: string
): Promise<string[]> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  const prompt = `You are an expert AI Video Director specializing in Veo 3 (Google's high-end video generation model).
  Your task is to ANALYZE the following ad segments and create highly detailed, cinematic video generation prompts for each.
  
  ANALYSIS GOALS:
  1. Visual Continuity: Ensure the character and environment remain consistent across all segments.
  2. Dynamic Motion: Describe specific camera movements (dolly, pan, tilt) and subject actions.
  3. Lighting & Atmosphere: Define the mood, color palette, and lighting style (e.g., "golden hour", "soft studio lighting").
  4. Veo 3 Optimization: Use descriptive, high-fidelity language that Veo 3 understands best.
  
  INPUT DATA:
  - Product Name: ${productName}
  - Character Profile: ${characterProfile}
  - Character Style: ${characterProfile.toLowerCase().includes('cartoon') || characterProfile.toLowerCase().includes('animation') ? 'Cartoon/3D Animation' : 'Photorealistic/Real Person'}
  
  SEGMENTS TO ANALYZE:
  ${segments.map(s => `
  Segment ${s.index}:
  - Visual Direction: ${s.visualDirection}
  - Voiceover: ${s.voiceover}
  - On-Screen Text: ${s.onScreenText}
  `).join("\n")}
  
  OUTPUT REQUIREMENTS:
  - Return a JSON array of strings.
  - Each string is a comprehensive video prompt in English for the corresponding segment.
  - Focus on the "storytelling" aspect of the motion.
  - Include details about textures, materials, and subtle environmental effects.
  `;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function generateVideo(
  prompt: string, 
  startImage?: string, 
  endImage?: string,
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<string> {
  const apiKey = getApiKey('veo');
  if (!apiKey) {
    throw new Error("Chưa cấu hình Veo API Key. Vui lòng vào phần Cài đặt để nhập Key.");
  }
  const aiVideo = new GoogleGenAI({ apiKey });

  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: aspectRatio
  };

  const payload: any = {
    model: typeof window !== 'undefined' ? localStorage.getItem('selected_veo_model') || 'veo-3.1-fast-generate-preview' : 'veo-3.1-fast-generate-preview',
    prompt,
    config
  };

  if (startImage) {
    payload.image = {
      imageBytes: startImage.split(',')[1],
      mimeType: 'image/png'
    };
  }

  if (endImage) {
    payload.config.lastFrame = {
      imageBytes: endImage.split(',')[1],
      mimeType: 'image/png'
    };
  }

  return apiQueue.add(async () => {
    let operation: any;
    let lastError: any;
    
    // Initial call to generateVideos with retry
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await aiVideo.models.generateVideos(payload);
        break;
      } catch (error: any) {
        lastError = error;
        const msg = error?.message || "";
        if (msg.includes("Requested entity was not found") || msg.includes("403") || msg.includes("permission")) {
          throw new Error("Lỗi quyền truy cập Veo 3: Tài khoản của bạn có thể là gói Miễn phí hoặc chưa kích hoạt 'Generative AI API' trong Google Cloud Project. Veo 3 yêu cầu tài khoản Trả phí (Paid).");
        }
        if (!msg.includes("429")) throw error;
      }
    }
    
    if (!operation) throw lastError;

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      try {
        operation = await aiVideo.operations.getVideosOperation({ operation: operation });
      } catch (error: any) {
        // If polling fails temporarily, just wait and try again
        console.warn("Polling error, retrying...", error?.message);
      }
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Requested entity was not found.");
      }
      throw new Error("Failed to download video");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  });
}

export async function refineImagePrompt(
  currentPrompt: string, 
  instruction: string,
  characterProfile: string = ""
): Promise<string> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  const prompt = `You are an AI image prompt engineer. 
  Your task is to refine or modify an existing image generation prompt based on a user's instruction (which might be in Vietnamese).
  
  CURRENT PROMPT: "${currentPrompt}"
  USER INSTRUCTION: "${instruction}"
  CHARACTER PROFILE (for consistency): "${characterProfile}"
  
  RULES:
  1. The output must be a single, high-quality, detailed image generation prompt in English.
  2. Incorporate the user's instruction into the current prompt.
  3. Maintain visual consistency with the character profile if provided.
  4. Focus on photorealistic, 8k, cinematic details.
  5. Return ONLY the refined English prompt.
  `;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
  });

  return response.text || currentPrompt;
}

export async function translatePrompt(text: string, targetLanguage: 'English' | 'Vietnamese' = 'English'): Promise<string> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  const prompt = `Translate the following image generation prompt to ${targetLanguage}. 
  Keep technical terms, artistic styles, and descriptive details accurate for AI image generation. 
  Return ONLY the translated text.
  
  Text: ${text}`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
  });

  return response.text || text;
}

export async function generateAffiliateIdeas(info: any, language: string): Promise<any[]> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const prompt = `You are a world-class Affiliate Marketing Strategist and Content Creator. 
  Based on the following channel strategy, generate ${info.ideaCount} diverse and highly engaging content ideas/scripts for an affiliate channel.
  
  CHANNEL STRATEGY:
  - Platform: ${info.platform}
  - Channel Type: ${info.channelType}
  - Goal: ${info.channelGoal}
  - Channel Name: ${info.channelName}
  - Description: ${info.channelDescription}
  - Main Topic: ${info.mainTopic}
  - Sub Topics: ${info.subTopics.join(', ')}
  - Target Audience: ${info.targetAudience.join(', ')}
  - Customer Insight: ${info.customerInsight}
  - Pain Points: ${info.customerPainPoints}
  - Style: ${info.contentStyle.join(', ')}
  - Tone: ${info.contentTone}
  - Video Length: ${info.targetVideoLength}
  - Hook Types: ${info.hookType.join(', ')}
  - Script Structure: ${info.scriptStructure}
  - Segment Count: ${info.segmentCount}
  - Special Requirements: ${info.specialRequirements}
  
  REQUIREMENTS:
  1. Analyze the chosen platform's algorithm and create content optimized for it.
  2. Generate diverse content angles (e.g., educational, emotional, controversial, trend-based).
  3. Each script must have a strong hook within the first 3 seconds.
  4. Each script must be divided into ${info.segmentCount} clear scenes.
  5. For each scene, provide:
     - script: The spoken words or text on screen.
     - visual_description: What happens visually.
     - image_prompt: A detailed English prompt for AI image generation (Stable Diffusion/Midjourney style).
     - video_prompt: A detailed English prompt for AI video generation (Veo/Sora style).
  
  OUTPUT FORMAT:
  Return ONLY a JSON array of objects with this structure:
  [
    {
      "id": "unique_id",
      "conceptTitle": "Catchy title for the idea",
      "platform": "${info.platform}",
      "topic": "Specific topic angle",
      "contentAngle": "The strategy behind this idea",
      "hookType": "Type of hook used",
      "hookText": "The actual hook text",
      "cta": "${info.ctaText || 'Link in bio'}",
      "scenes": [
        {
          "scene": 1,
          "script": "...",
          "visualDescription": "...",
          "imagePrompt": "...",
          "videoPrompt": "..."
        }
      ]
    }
  ]
  
  Language for script and descriptions: ${language === 'vi' ? 'Vietnamese' : 'English'}.
  Prompts (imagePrompt, videoPrompt) must ALWAYS be in English.`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse affiliate ideas JSON:", e);
    return [];
  }
}

export async function generateMotionPrompt(
  currentScene: any,
  context: { before: any[], after: any[] },
  imageUrl: string,
  language: Language = 'vi'
): Promise<{ prompt: string; title: string }> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const systemInstruction = `You are a cinematic motion director and AI video prompt engineer.
  Your task is to generate a highly detailed motion prompt for an AI video model (like Veo or Kling).
  
  The prompt must follow this structure:
  1. Start Frame: Describe the initial state (based on the provided context).
  2. Camera Movement: Use cinematic terms (crane down, dolly in, pan, tilt, etc.).
  3. Character/Subject Motion: Describe how the subject moves in relation to the camera.
  4. Environmental Interaction: Describe lighting changes, parallax effects, and background motion.
  5. End Frame: Describe the final state (this should match the provided image's content).
  
  CRITICAL REQUIREMENTS:
  - Duration: The motion should be balanced for a 6-10 second clip.
  - Detail: Describe the "visual gateway", foreground elements, and the sense of discovery.
  - Consistency: Ensure the art style, textures, and lighting match the provided image.
  - Output: Return a JSON object with:
    - prompt: The full, detailed English motion prompt.
    - title: A short, catchy summary in Vietnamese (5-10 words) describing the motion.
  `;

  const prompt = `
  CONTEXT:
  - Previous Scenes: ${context.before.map(s => s.visualDirection || s.prompt).join(" | ")}
  - CURRENT SCENE: ${currentScene.visualDirection || currentScene.prompt}
  - Next Scenes: ${context.after.map(s => s.visualDirection || s.prompt).join(" | ")}
  
  IMAGE ANALYSIS:
  The provided image represents the END FRAME of this sequence. Analyze its style, lighting, and composition.
  
  TASK:
  Generate a cinematic motion prompt that leads into this END FRAME. 
  Use the "discovery" approach: start with a wide shot or a hidden view, then move the camera to reveal the scene in the image.
  `;

  const getImageData = (img: string) => {
    if (!img) return null;
    const parts = img.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const data = parts[1];
    const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
    return { mimeType, data };
  };

  const imgData = getImageData(imageUrl);
  const contents = imgData 
    ? { parts: [{ text: prompt }, { inlineData: imgData }] }
    : prompt;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            title: { type: Type.STRING },
          },
          required: ["prompt", "title"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating motion prompt:", error);
    return {
      prompt: "Cinematic camera movement revealing the subject with smooth transitions and professional lighting.",
      title: "Chuyển động điện ảnh mượt mà"
    };
  }
}
