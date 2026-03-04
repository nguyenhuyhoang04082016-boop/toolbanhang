import { GoogleGenAI, Type } from "@google/genai";
import { ProductInfo, AdSegment, Language, Tone, AdScript } from "../types";

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
): Promise<AdSegment[]> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || "gemini-3-flash-preview" : "gemini-3-flash-preview";
  
  const systemInstruction = `You are an expert short-form ad script writer. 
  Generate a high-converting ad script split into 8-second segments.
  Structure: ${product.totalLength / 8} segments.
  Format: JSON array of objects.
  Language: ${language === 'vi' ? 'Vietnamese' : 'English'}.
  Tone: ${tone}.
  Brand Voice: ${brandVoice ? 'Enabled (more professional and consistent)' : 'Disabled'}.
  Structure Strategy: Use AIDA (Attention, Interest, Desire, Action) or PAS (Problem, Agitation, Solution).
  - Segment 1: Strong hook.
  - Middle segments: Benefits, proof, objection handling.
  - Final segment: Offer and Call to Action.
  
  Compliance: Avoid unrealistic medical claims.
  
  Each object must have:
  - visualDirection: string (what viewers see)
  - onScreenText: string (text on screen, if allowed)
  - voiceover: string (natural, persuasive dialogue)
  - sfx: string (short audio cues)
  - cameraNotes: string (optional camera/edit tips)
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
  - Voiceover: ${product.voiceoverStyle}, ${product.voiceoverSpeed} speed
  - On-screen text allowed: ${product.onScreenText ? 'Yes' : 'No'}
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
      },
    });

    const rawJson = response.text;
    if (!rawJson) throw new Error("No response from AI");
    
    const segments: any[] = JSON.parse(rawJson);
    
    return segments.map((s, i) => ({
      ...s,
      id: Math.random().toString(36).substr(2, 9),
      index: i + 1,
      startTime: i * 8,
      endTime: (i + 1) * 8,
    }));
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

export async function generateCharacterProfile(product: ProductInfo): Promise<string> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || "gemini-3-flash-preview" : "gemini-3-flash-preview";
  const prompt = `Based on this product and target audience, create a detailed visual description of a recurring character or mascot for the ad campaign to ensure visual consistency. 
  Product: ${product.name}
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
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || "gemini-3-flash-preview" : "gemini-3-flash-preview";
  const prompt = `For each of the following ad segments, generate a high-quality, detailed image generation prompt. 
  
  CRITICAL: Visual Consistency
  - Character Profile: ${characterProfile}
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

export async function generateImage(prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9"): Promise<string> {
  const apiKey = getApiKey('gemini');
  const aiImage = new GoogleGenAI({ apiKey });

  return apiQueue.add(async () => {
    try {
      const response = await aiImage.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
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
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || "gemini-3-flash-preview" : "gemini-3-flash-preview";
  const prompt = `For each of the following ad segments, generate a high-quality video generation prompt for Veo 3. 
  
  CRITICAL: Visual Consistency & Motion
  - Character Profile: ${characterProfile}
  - The character described above MUST be the main subject.
  - Product: ${productName}
  - Describe the motion, activity, and transition between the start and end of the segment.
  
  Segments:
  ${segments.map(s => `Segment ${s.index}: ${s.visualDirection}`).join("\n")}
  
  Return a JSON array of strings, one for each segment. Each prompt should be in English and optimized for video generation (cinematic, smooth motion, high detail).`;

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
          throw new Error("Tính năng tạo Video (Veo) YÊU CẦU tài khoản trả phí (Paid). Tài khoản Miễn phí không thể sử dụng tính năng này.");
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

export async function analyzeVideo(videoBase64: string, mimeType: string): Promise<Partial<AdScript>> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || "gemini-3-flash-preview" : "gemini-3-flash-preview";
  const prompt = `Analyze this advertisement video and extract the following information in JSON format:
  1. Product Name and Category
  2. Target Audience and Pain Points addressed
  3. Key Benefits and Features shown
  4. A detailed Character Profile of the person in the video (appearance, style, vibe)
  5. A breakdown of the video into segments (storyboard), including:
     - Visual Direction (what happens in the scene)
     - On-screen text
     - Voiceover script
     - Estimated timing
  
  Format the response as a JSON object that matches the structure of an AdScript, including productInfo and segments.`;

  const response = await callGeminiWithRetry({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: videoBase64, mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result;
}
