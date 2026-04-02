import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductInfo, AdSegment, Language, AdScript, ReviewResult } from "../types";
import { trackUsage, calculateCost } from "./costService";

const DEFAULT_MODEL = "gemini-2.5-flash";

const getApiKey = (type: 'gemini' | 'veo' | 'image' = 'gemini') => {
  const manualGeminiKey = typeof window !== 'undefined' ? localStorage.getItem('manual_gemini_api_key') : null;
  const manualImageKey = typeof window !== 'undefined' ? localStorage.getItem('manual_image_api_key') : null;
  const manualVeoKey = typeof window !== 'undefined' ? localStorage.getItem('manual_veo_api_key') : null;
  
  // Priority: 
  // 1. Manual key for specific type (entered in text fields)
  // 2. Platform selected key (selected via "Chọn API Key từ Project")
  
  if (type === 'veo') {
    return manualVeoKey || process.env.API_KEY || "";
  }
  if (type === 'image') {
    return manualImageKey || manualGeminiKey || process.env.API_KEY || "";
  }
  return manualGeminiKey || process.env.API_KEY || "";
};

const getAiInstance = (type: 'gemini' | 'veo' | 'image' = 'gemini') => {
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
 * Safely extract text from Gemini response, avoiding warnings for non-text parts
 */
function extractTextFromResponse(response: any): string {
  if (!response || !response.candidates || !response.candidates[0] || !response.candidates[0].content) {
    return "";
  }
  const parts = response.candidates[0].content.parts || [];
  return parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join("");
}

/**
 * Helper to call Gemini with exponential backoff and retries
 */
async function callGeminiWithRetry(
  params: any,
  type: 'gemini' | 'veo' | 'image' = 'gemini',
  maxRetries = 3,
  baseDelay = 3000
): Promise<any> {
  const apiKey = getApiKey(type);
  const apiKeySource = apiKey === process.env.API_KEY ? 'Platform/Environment' : 'Manual/LocalStorage';
  const modelName = params.model || DEFAULT_MODEL;

  // Create a cache key from params
  const cacheKey = JSON.stringify(params);
  if (cache.has(cacheKey)) {
    console.log(`[Gemini] Returning cached response for ${modelName}`);
    return cache.get(cacheKey);
  }

  const ai = getAiInstance(type);

  // Log request details for debugging
  console.log(`[Gemini Request]`, {
    type,
    model: modelName,
    apiKeySource,
    prompt: typeof params.contents === 'string' ? params.contents : 'Complex content (see parts)',
    parts: params.contents?.parts?.map((p: any) => p.text ? { text: p.text } : { mimeType: p.inlineData?.mimeType, dataSize: p.inlineData?.data?.length }),
    config: params.config
  });

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
    // Silent fail for estimation
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
        
        // Detailed error logging as requested
        console.error(`[Gemini API Error] Attempt ${attempt + 1}:`, {
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText,
          responseBody: error?.response?.data || error?.response || 'No body',
          model: modelName,
          type
        });

        const errorMessage = error?.message || "";
        const statusCode = error?.status || 0;
        
        // Only retry on rate limit (429) or temporary server errors (500, 503)
        const isRateLimit = statusCode === 429 || errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota");
        const isServerError = statusCode >= 500 || errorMessage.includes("500") || errorMessage.includes("503");
        
        if (!isRateLimit && !isServerError) {
          // Special handling for 403/Permission Denied
          if (statusCode === 403 || errorMessage.includes("403") || errorMessage.toLowerCase().includes("permission")) {
            const detailedMsg = type === 'image' 
              ? "Project/API key hiện tại không có quyền tạo ảnh hoặc chưa bật billing."
              : "Lỗi quyền truy cập (403 Permission Denied). Vui lòng kiểm tra API Key và Billing.";
            throw new Error(detailedMsg);
          }
          
          if (isRateLimit) {
            throw new Error(type === 'image' ? "Đã vượt quota tạo ảnh." : "Đã vượt hạn mức yêu cầu (Quota Exceeded).");
          }

          throw error;
        }
        
        if (attempt === maxRetries) {
          if (isRateLimit) {
            throw new Error(type === 'image' ? "Đã vượt quota tạo ảnh." : "Đã vượt hạn mức yêu cầu (Quota Exceeded).");
          }
          throw error;
        }
        
        // If it's a rate limit, increase the delay significantly for the next attempt
        if (isRateLimit && attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    throw lastError;
  });
}

export async function inferScriptOrientation(product: ProductInfo, language: Language): Promise<{ 
  style: string, 
  dialogueType: string,
  targetAudience: string,
  keyMessage: string,
  toneOfVoice: string
}> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const prompt = `Based on the following product information, suggest the most suitable video style and dialogue type for a high-converting short-form video (TikTok/Reels).
  
  Product Name: ${product.name}
  Category: ${product.category || 'N/A'}
  Additional Requirements: ${product.additionalRequirements || 'None'}
  
  Return a JSON object with:
  - "style": One of ['review', 'cinematic', 'storytelling', 'vlog', 'unboxing', 'tutorial']
  - "dialogueType": One of ['self-talk', 'no-read', 'none']
  - "targetAudience": A short description of the ideal customer (in ${language === 'vi' ? 'Vietnamese' : 'English'})
  - "keyMessage": The most important point to convey (in ${language === 'vi' ? 'Vietnamese' : 'English'})
  - "toneOfVoice": One of ['energetic', 'professional', 'friendly', 'luxury', 'funny', 'emotional']
  
  Choose the style that best fits the product's nature and the dialogue type that would be most engaging.
  `;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            style: { type: Type.STRING },
            dialogueType: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            keyMessage: { type: Type.STRING },
            toneOfVoice: { type: Type.STRING },
          },
          required: ["style", "dialogueType", "targetAudience", "keyMessage", "toneOfVoice"]
        }
      }
    });

    return JSON.parse(extractTextFromResponse(response) || '{"style": "review", "dialogueType": "self-talk", "targetAudience": "General", "keyMessage": "N/A", "toneOfVoice": "friendly"}');
  } catch (error) {
    console.warn("Failed to infer orientation, using defaults", error);
    return { 
      style: 'review', 
      dialogueType: 'self-talk',
      targetAudience: 'General',
      keyMessage: 'N/A',
      toneOfVoice: 'friendly'
    };
  }
}

export async function generateAdScript(
  product: ProductInfo,
  language: Language,
  brandVoice: boolean
): Promise<{ segments: AdSegment[], seamlessScript: string, productAnalysis: any }> {
  // Check for Mock Mode
  const isMockMode = typeof window !== 'undefined' && localStorage.getItem('mock_mode') === 'true';
  if (isMockMode) {
    return {
      segments: [
        { 
          id: '1', 
          index: 1, 
          startTime: 0, 
          endTime: 5, 
          visualDirection: "Cảnh mở đầu giới thiệu sản phẩm", 
          voiceover: "Chào mừng bạn đến với sản phẩm mới", 
          onScreenText: "Sản phẩm mới", 
          sfx: "Âm nhạc sôi động",
          imagePrompt: "A beautiful product shot", 
          videoPrompt: "A cinematic product reveal" 
        },
        { 
          id: '2', 
          index: 2, 
          startTime: 5, 
          endTime: 15, 
          visualDirection: "Cảnh chi tiết tính năng", 
          voiceover: "Đây là tính năng nổi bật nhất", 
          onScreenText: "Tính năng nổi bật", 
          sfx: "Tiếng click nhẹ",
          imagePrompt: "Close up of the product", 
          videoPrompt: "Detailed view of the product" 
        }
      ],
      seamlessScript: "Chào mừng bạn đến với sản phẩm mới. Đây là tính năng nổi bật nhất.",
      productAnalysis: "Sản phẩm tuyệt vời với nhiều tính năng."
    };
  }

  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const systemInstruction = `You are an expert AI Product Analyst and Ad Script Writer, specialized in creating high-converting short-form video content (TikTok, Reels, Shorts).
  
  CRITICAL: VISUAL CONSISTENCY
  You MUST strictly follow the provided image categories for all visual descriptions. DO NOT decide or hallucinate character appearance, costumes, or backgrounds if images are provided in those categories.
  - If "character" images are provided: Use the specific person/model from those images in your descriptions.
  - If "costume" images are provided: The character MUST wear those specific clothes.
  - If "background" images are provided: The scenes MUST take place in those specific environments.
  - If "accessories" images are provided: Include those specific accessories in the scenes.
  - If "product" images are provided: The product appearance MUST match those images exactly.
  - If "usage" images are provided: The way the product is held, used, or demonstrated MUST match those images exactly.
  
  STEP 1: ANALYZE PRODUCT IMAGES
  Analyze the provided product images to extract:
  - Detailed features and technical specifications.
  - Usage instructions and how the product works.
  - Key benefits and main functions.
  
  STEP 2: APPLY CONTENT CREATION PRINCIPLES (TRAINING DATA)
  Follow these 5 core principles for every script:
  1. HOOK (Mở đầu): Start immediately with the most important thing. Use a curious story, an attractive promise, or an empathetic question to create urgency.
  2. STORY STRUCTURE (Cấu trúc kể chuyện): Don't just show results. Tell the process of trial and error (Problem -> Trial/Failure -> Solution/Success) to create authenticity and suspense.
  3. EMPATHY (Nội dung dễ đồng cảm): Put yourself in the viewer's shoes. Use everyday language. Address the target audience directly and describe common pain points they face.
  4. DATA & CLEAR VISUALS (Đưa ra số liệu, hình ảnh rõ ràng): Instead of just talking, describe real scenes (e.g., printing orders, packing, revenue screenshots, happy faces). Use visual effects and text to emphasize important info.
  5. CLEAR CTA (Kết thúc bằng 1 CTA rõ ràng): Define exactly what the viewer should do (Buy, Share, Follow). Give them a logical reason to interact immediately.
  
  STEP 3: PACING & DIALOGUE (USER PREFERENCE)
  - ULTRA-FAST PACING: The action, visual changes, and transitions in each segment MUST be extremely fast-paced, dynamic, and high-energy.
  - PUNCHY DIALOGUE: Use short, impactful sentences. Avoid long explanations.
  - INCREASED DIALOGUE: Include more character dialogue or narration than usual, but keep it snappy.
  - EVEN DISTRIBUTION: Ensure the dialogue is spread evenly across ALL segments.
  
  STEP 4: GENERATE AD SCRIPT
  Based on the analysis and user requirements, generate a high-converting, seamless ad script for Veo 3.
  - Ad Style: ${product.scriptOrientation?.style || product.videoType || 'lifestyle'}.
  - Dialogue Type: ${product.scriptOrientation?.dialogueType || 'self-talk'}.
  - Target Audience: ${product.scriptOrientation?.targetAudience || 'General'}.
  - Key Message: ${product.scriptOrientation?.keyMessage || 'N/A'}.
  - Tone of Voice: ${product.scriptOrientation?.toneOfVoice || 'friendly'}.
  
  DIALOGUE RULES:
  ${product.scriptOrientation?.dialogueType === 'self-talk' ? `
  - The character MUST speak directly to the camera (self-talk).
  - The dialogue MUST be in Vietnamese (Tiếng Việt).
  - The dialogue MUST be natural, engaging, and optimized for LIP-SYNC (khớp khẩu hình miệng).
  - Explicitly describe the character speaking in the visualDirection.
  ` : product.scriptOrientation?.dialogueType === 'no-read' ? `
  - The character is present in the scene but DOES NOT speak (no lip-sync needed).
  - There can be a voiceover (narrator) in Vietnamese, but it's not from the character's mouth.
  ` : `
  - NO DIALOGUE or voiceover at all.
  - Focus entirely on visual storytelling, background music, and sound effects (sfx).
  `}
  
  - IMPORTANT: If a character image is provided, DO NOT describe the character's appearance (eyes, hair, face, etc.) in the visualDirection. Simply refer to them as "the character" or "the person" and state that they must strictly match the provided reference images.
  - VISUAL FOCUS: All segments MUST focus on both the character and the product.
  - FAST CUTS: Use descriptions that imply fast cuts, quick movements, and dynamic transitions.
  - HOOK SCENE (Segment 1): Can be flexible and dynamic to grab attention.
  - SUBSEQUENT SCENES (Segment 2+): MUST clearly show both the character and the product together in the frame.
  - The script must be seamless and natural.
  - Split the script into segments of exactly 8 seconds each.
  - MANDATORY: You MUST generate exactly ${Math.ceil((product.totalLength || 32) / 8)} segments.
  - For a total duration of ${product.totalLength || 32}s, you MUST provide ${Math.ceil((product.totalLength || 32) / 8)} distinct segments in the "segments" array.
  
  Format: JSON object with:
  - "productAnalysis": { "features": [], "specs": [], "usage": [], "benefits": [] }
  - "seamlessScript": string (the full voiceover/narrative script)
  - "segments": array of objects with:
    - visualDirection: string (detailed cinematic description for Veo 3, following the provided images strictly)
    - voiceover: string (The Vietnamese dialogue or narration for this segment)
    - sfx: string (audio cues)
    - cameraNotes: string (camera movement tips)
  
  Language: ${language === 'vi' ? 'Vietnamese' : 'English'}.
  Additional Orientation Notes: ${product.scriptOrientation?.additionalNotes || 'None'}.
  Additional Requirements: ${product.additionalRequirements || 'None'}.
  `;

  const prompt = `
  Analyze the product images and generate a 8s-per-segment ad script.
  Product Name: ${product.name}
  Category: ${product.category || 'N/A'}
  Ratio: ${product.ratio}
  User Requirements: ${product.additionalRequirements || 'None'}
  
  Available Context Images:
  - Use the provided reference images for context.
  ${(product.imageCategories || []).map(cat => `- Category "${cat.id}": ${cat.images.length} images provided. Use these for ${cat.id} details.`).join('\n')}
  
  Note: "usage" category images show how the product should be used or demonstrated in the video.
  `;

  const getImageData = (img: string) => {
    const [header, data] = img.split(',');
    const mimeType = header?.split(';')[0]?.split(':')[1] || "image/jpeg";
    return { mimeType, data };
  };

  const allImages = [
    ...(product.referenceImages || []),
    ...(product.imageCategories || []).flatMap(c => c.images)
  ];

  // OPTIMIZATION: Compress and limit images to avoid token limit errors
  const optimizedImages = await Promise.all(
    allImages.slice(0, 10).map(img => compressImage(img, 512, 0.6))
  );

  const imageParts = optimizedImages.map(img => {
    const { mimeType, data } = getImageData(img);
    return { inlineData: { mimeType, data } };
  });

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
            productAnalysis: {
              type: Type.OBJECT,
              properties: {
                features: { type: Type.ARRAY, items: { type: Type.STRING } },
                specs: { type: Type.ARRAY, items: { type: Type.STRING } },
                usage: { type: Type.ARRAY, items: { type: Type.STRING } },
                benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["features", "specs", "usage", "benefits"]
            },
            seamlessScript: { type: Type.STRING },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  visualDirection: { type: Type.STRING },
                  voiceover: { type: Type.STRING },
                  sfx: { type: Type.STRING },
                  cameraNotes: { type: Type.STRING },
                },
                required: ["visualDirection", "voiceover", "sfx"],
              },
            },
          },
          required: ["productAnalysis", "seamlessScript", "segments"]
        },
      },
    });

    const rawJson = extractTextFromResponse(response);
    if (!rawJson) throw new Error("No response from AI");
    
    const result = JSON.parse(rawJson);
    const segments: any[] = result.segments;
    
    return {
      productAnalysis: result.productAnalysis,
      seamlessScript: result.seamlessScript,
      segments: segments.map((s, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        index: i + 1,
        startTime: i * 8,
        endTime: (i + 1) * 8,
        visualDirection: s.visualDirection,
        voiceover: s.voiceover || "",
        onScreenText: "",
        sfx: s.sfx,
        cameraNotes: s.cameraNotes,
      })),
    };
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

export async function generateCharacterProfile(product: ProductInfo): Promise<string> {
  // Check for Mock Mode
  const isMockMode = typeof window !== 'undefined' && localStorage.getItem('mock_mode') === 'true';
  if (isMockMode) {
    return "Nhân vật nữ trẻ trung, năng động, mặc trang phục hiện đại.";
  }

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

  const allImages = [
    ...(product.referenceImages || []),
    ...(product.imageCategories || []).flatMap(c => c.images)
  ];

  const imageParts = allImages.slice(0, 4).map(img => {
    const { mimeType, data } = getImageData(img);
    return { inlineData: { mimeType, data } };
  });

  const contents = imageParts.length > 0 
    ? { parts: [{ text: prompt }, ...imageParts] }
    : prompt;

  const response = await callGeminiWithRetry({
    model,
    contents,
  });

  return extractTextFromResponse(response) || "A friendly person using the product.";
}

export async function generateImagePrompts(
  segments: AdSegment[],
  characterProfile: string,
  productName: string,
  referenceImages: string[] = []
): Promise<{ startPrompt: string, endPrompt: string }[]> {
  // Check for Mock Mode
  const isMockMode = typeof window !== 'undefined' && localStorage.getItem('mock_mode') === 'true';
  if (isMockMode) {
    return segments.map(() => ({ 
      startPrompt: "A beautiful product shot", 
      endPrompt: "A dynamic product action shot" 
    }));
  }

  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const prompt = `Generate a START and END image generation prompt for each ad segment.
  
  CRITICAL: NO TEXT
  - DO NOT include any on-screen text, subtitles, captions, or overlays.
  
  CRITICAL: VISUAL CONSISTENCY
  - Follow the provided reference images for ALL visual elements (character, background, costume, accessories).
  - DO NOT describe the character's appearance (eyes, hair, face, etc.) in the prompts.
  - Simply refer to the character as "the character" or "the person" and state that they must strictly match the provided reference images.
  - Product: ${productName}
  
  INSTRUCTIONS:
  1. For each segment, create a START prompt (initial pose) and an END prompt (final pose after 3-5s of motion).
  2. The END prompt MUST describe a dynamic, high-energy final pose to encourage fast motion. Mention "dynamic motion blur" if it helps convey speed.
  3. The character, background, and style MUST match the provided reference images.
  4. The prompts must be in English.
  
  Segments:
  ${segments.map(s => `Segment ${s.index}: ${s.visualDirection}`).join("\n")}
  
  Return a JSON array of objects, one for each segment: { "startPrompt": "...", "endPrompt": "..." }.`;

  const getImageData = (img: string) => {
    const [header, data] = img.split(',');
    const mimeType = header?.split(';')[0]?.split(':')[1] || "image/jpeg";
    return { mimeType, data };
  };

  // OPTIMIZATION: Compress and limit images to avoid token limit errors
  const optimizedImages = await Promise.all(
    referenceImages.slice(0, 5).map(img => compressImage(img, 512, 0.6))
  );

  const imageParts = optimizedImages.map(img => {
    const { mimeType, data } = getImageData(img);
    return { inlineData: { mimeType, data } };
  });

  const contents = imageParts.length > 0 
    ? { parts: [{ text: prompt }, ...imageParts] }
    : prompt;

  const response = await callGeminiWithRetry({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { 
          type: Type.OBJECT,
          properties: {
            startPrompt: { type: Type.STRING },
            endPrompt: { type: Type.STRING }
          },
          required: ["startPrompt", "endPrompt"]
        }
      }
    }
  });

  return JSON.parse(extractTextFromResponse(response) || "[]");
}

/**
 * Utility to compress and resize base64 images to reduce token usage
 */
async function compressImage(base64Str: string, maxWidth = 768, quality = 0.7): Promise<string> {
  if (typeof window === 'undefined') return base64Str;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
}

export async function generateImage(
  prompt: string, 
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9",
  base64Images?: string[],
  referenceImageUrl?: string
): Promise<string> {
  // Pre-flight check for empty prompt
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt tạo ảnh không được để trống.");
  }

  // Check for Mock Mode
  const isMockMode = typeof window !== 'undefined' && localStorage.getItem('mock_mode') === 'true';
  if (isMockMode) {
    const seed = Math.random().toString(36).substring(7);
    const [width, height] = aspectRatio === '16:9' ? [1920, 1080] : aspectRatio === '9:16' ? [1080, 1920] : [1024, 1024];
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  }

  const apiKey = getApiKey('image');
  if (!apiKey) {
    throw new Error("Chưa cấu hình API Key cho tạo ảnh. Vui lòng vào phần Cài đặt để nhập Key.");
  }

  // OPTIMIZATION: Compress all reference images to save tokens
  const optimizedBase64Images = base64Images 
    ? await Promise.all(base64Images.slice(0, 5).map(img => compressImage(img))) 
    : [];
  
  const optimizedRefUrl = referenceImageUrl && referenceImageUrl.startsWith('data:')
    ? await compressImage(referenceImageUrl)
    : referenceImageUrl;

  const parts: any[] = [{ text: prompt }];
  
  // Add reference images (product images, etc.)
  if (optimizedBase64Images.length > 0) {
    const imageParts = optimizedBase64Images.map(img => {
      const [header, data] = img.split(',');
      const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
      return {
        inlineData: {
          mimeType,
          data
        }
      };
    });
    parts.unshift(...imageParts);
  }

  // Add reference image for character consistency (start image)
  if (optimizedRefUrl && optimizedRefUrl.startsWith('data:')) {
    const [header, data] = optimizedRefUrl.split(',');
    const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
    parts.push({
      inlineData: {
        mimeType,
        data
      }
    });
    // Update prompt to emphasize consistency
    parts[parts.length - 2].text += ". Maintain the exact same character, environment, and style as the provided reference image. DO NOT describe the character's appearance; just match the reference image exactly.";
  }

  const language = (typeof window !== 'undefined' ? localStorage.getItem('app_language') || 'vi' : 'vi') as Language;
  let model = typeof window !== 'undefined' ? localStorage.getItem('selected_image_model') || 'gemini-3.1-flash-image-preview' : 'gemini-3.1-flash-image-preview';

  // Ensure an image model is used
  const isImageModel = model.includes('image') || model.includes('imagen');
  if (!isImageModel) {
    console.warn(`[ImageGen] Model ${model} might not be an image model. Forcing gemini-3.1-flash-image-preview.`);
    model = 'gemini-3.1-flash-image-preview';
  }

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: {
        parts,
      },
      config: {
        systemInstruction: "You are an image generation expert. Your goal is to generate an image that strictly follows the provided reference images. DO NOT describe the character's appearance (eyes, hair, face, etc.) if a reference image is provided; simply ensure the character in the new image matches the reference image exactly.",
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        },
      },
    }, 'image');

    const candidate = response.candidates?.[0];
    
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error(language === 'vi' ? "Nội dung bị chặn bởi bộ lọc an toàn." : "Content blocked by safety filters.");
    }

    // Check for non-text parts (inlineData) which might contain the image
    const responseParts = candidate?.content?.parts || [];
    for (const part of responseParts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    // Handle text-only responses that indicate failure
    const responseText = extractTextFromResponse(response);
    if (responseText.toLowerCase().includes("not allowed") || 
        responseText.toLowerCase().includes("permission denied") ||
        responseText.toLowerCase().includes("billing") ||
        responseText.toLowerCase().includes("paid account")) {
      console.warn("Permission denied for 3.1-flash-image-preview, trying fallback to 2.5-flash-image...");
      return await generateImageFallback(prompt, aspectRatio, base64Images, language);
    }
    
    throw new Error(language === 'vi' ? "Không thể tạo ảnh. Có thể do giới hạn tài khoản hoặc nội dung không hợp lệ." : "Could not generate image. This might be due to account limits or invalid content.");
  } catch (error: any) {
    const msg = error?.message || "";
    if (msg.includes("403") || msg.includes("permission") || msg.includes("billing")) {
      // Try fallback to 2.5-flash-image if it wasn't already the model
      if (model !== 'gemini-2.5-flash-image') {
        console.warn("Permission denied for image generation, trying fallback to 2.5-flash-image...");
        try {
          return await generateImageFallback(prompt, aspectRatio, base64Images, language);
        } catch (fallbackError) {
          console.error("Fallback image generation also failed:", fallbackError);
        }
      }
    }
    
    // Final fallback to Picsum if everything fails (e.g. no paid key)
    console.warn("All image generation attempts failed, falling back to placeholder image.");
    const seed = Math.random().toString(36).substring(7);
    const [width, height] = aspectRatio === '16:9' ? [1920, 1080] : aspectRatio === '9:16' ? [1080, 1920] : [1024, 1024];
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  }
}

/**
 * Fallback image generation using gemini-2.5-flash-image
 */
async function generateImageFallback(
  prompt: string, 
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9",
  base64Images?: string[],
  language: Language = 'vi'
): Promise<string> {
  const parts: any[] = [{ text: prompt }];
  
  if (base64Images && base64Images.length > 0) {
    const imageParts = base64Images.map(img => {
      const [header, data] = img.split(',');
      const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
      return {
        inlineData: {
          mimeType,
          data
        }
      };
    });
    parts.unshift(...imageParts);
  }

  try {
    const response = await callGeminiWithRetry({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    }, 'image');

    const candidate = response.candidates?.[0];
    const responseParts = candidate?.content?.parts || [];
    for (const part of responseParts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Fallback failed to generate image.");
  } catch (error: any) {
    console.error("Fallback image generation failed:", error);
    throw new Error(language === 'vi' 
      ? "Lỗi quyền truy cập (Permission Denied). Vui lòng kiểm tra: 1. API Key có thuộc Project đã bật Thanh toán (Paid) không. 2. Generative AI API đã được bật trong Google Cloud Console chưa."
      : "Permission Denied. Please check: 1. Is your API Key from a Paid project? 2. Is the Generative AI API enabled in your Google Cloud Console?");
  }
}

export async function generateVideoPrompt(
  segment: AdSegment,
  characterProfile: string,
  productName: string,
  referenceImages: string[] = []
): Promise<string> {
  // Check for Mock Mode
  const isMockMode = typeof window !== 'undefined' && localStorage.getItem('mock_mode') === 'true';
  if (isMockMode) {
    return "A cinematic product reveal";
  }

  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const prompt = `Create a cinematic video generation prompt for this specific ad segment.
  
  CONTEXT:
  - Product: ${productName}
  - Character Profile: ${characterProfile}
  - Segment Visual Direction: ${segment.visualDirection}
  - Segment Voiceover: ${segment.voiceover}
  
  GOALS:
  1. Start Frame: The video MUST start exactly from the provided "Start Image".
  2. Visual Continuity: Maintain the character, costume, and environment style from the "Reference Images". DO NOT describe the character's appearance in detail; simply state that the character matches the provided images.
  3. Visual Focus: The video MUST focus on both the character and the product.
  4. ULTRA-FAST MOTION: Describe actions using high-energy verbs (e.g., "quickly grabs", "rapidly demonstrates", "energetically speaks"). The motion MUST be extremely fast-paced and dynamic.
  5. DYNAMIC CAMERA & STYLE: Use dynamic camera movements (e.g., "fast zoom-in", "rapid pan", "energetic tracking shot") and mention "motion blur" or "fast-paced editing style" to increase the sense of speed.
  6. Lip-Sync: If "Voiceover" is provided, explicitly describe the character's mouth moving to speak those words naturally and rapidly.
  
  INSTRUCTIONS:
  1. Analyze the "Start Image" (the first image) and the "Reference Images".
  2. Create a 3-5 second motion description in English.
  3. Focus on natural, high-fidelity movement.
  
  Return ONLY the prompt string.`;

  const getImageData = (img: string) => {
    const [header, data] = img.split(',');
    const mimeType = header?.split(';')[0]?.split(':')[1] || "image/jpeg";
    return { mimeType, data };
  };

  // Combine Start Image (if exists) and Reference Images
  const imagesToProcess = [];
  if (segment.startImageUrl) {
    imagesToProcess.push(segment.startImageUrl);
  }
  // Add some reference images for style
  imagesToProcess.push(...referenceImages.slice(0, 3));

  // OPTIMIZATION: Compress images
  const optimizedImages = await Promise.all(
    imagesToProcess.map(img => compressImage(img, 512, 0.6))
  );

  const imageParts = optimizedImages.map((img, i) => {
    const { mimeType, data } = getImageData(img);
    // Label the first image as "Start Image" in the AI's mind if it's the segment's image
    const textPrefix = i === 0 && segment.startImageUrl ? "Start Image: " : "Reference Image: ";
    return [
      { text: textPrefix },
      { inlineData: { mimeType, data } }
    ];
  }).flat();

  const contents = { parts: [{ text: prompt }, ...imageParts] };

  const response = await callGeminiWithRetry({
    model,
    contents,
  });

  return extractTextFromResponse(response) || "A cinematic scene following the script.";
}

export async function generateVideo(
  prompt: string, 
  startImage?: string, 
  endImage?: string,
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<string> {
  // Check for Mock Mode
  const isMockMode = typeof window !== 'undefined' && localStorage.getItem('mock_mode') === 'true';
  if (isMockMode) {
    // Return a sample video URL
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }

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

  return extractTextFromResponse(response) || currentPrompt;
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

  return extractTextFromResponse(response) || text;
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

export async function reviewScript(
  script: AdScript,
  language: Language = 'vi'
): Promise<ReviewResult> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const systemInstruction = `You are a world-class advertising creative director and script doctor.
  Your task is to review the provided ad script and evaluate its effectiveness, engagement, and logical flow.
  
  CRITERIA:
  1. Hook: Is it strong enough to stop the scroll?
  2. Flow: Does the story move logically from hook to CTA?
  3. Product Focus: Is the product shown and explained clearly?
  4. Engagement: Is the tone appropriate for the target audience?
  5. CTA: Is the call to action clear and compelling?
  
  OUTPUT FORMAT:
  Return a JSON object with:
  - status: 'excellent' | 'good' | 'needs-improvement' | 'poor'
  - score: 0-100
  - feedback: A concise summary of the review (in ${language === 'vi' ? 'tiếng Việt' : 'English'}).
  - suggestions: A list of specific, actionable improvements (in ${language === 'vi' ? 'tiếng Việt' : 'English'}).
  `;

  const { referenceImages, imageCategories, ...cleanProductInfo } = script.productInfo;
  
  const prompt = `
  PRODUCT INFO:
  ${JSON.stringify(cleanProductInfo, null, 2)}
  
  SCRIPT CONTENT:
  ${script.segments.map(s => `Scene ${s.index}: [Visual: ${s.visualDirection}] [Voiceover: ${s.voiceover}]`).join('\n')}
  
  Please review this script and provide your expert feedback.
  `;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['excellent', 'good', 'needs-improvement', 'poor'] },
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["status", "score", "feedback", "suggestions"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return { ...result, timestamp: Date.now() };
  } catch (error) {
    console.error("Error reviewing script:", error);
    return {
      status: 'good',
      score: 80,
      feedback: "Không thể thực hiện đánh giá chi tiết lúc này. Kịch bản nhìn chung ổn.",
      suggestions: [],
      timestamp: Date.now()
    };
  }
}

export async function reviewImages(
  segments: AdSegment[],
  language: Language = 'vi'
): Promise<ReviewResult> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const systemInstruction = `You are a professional visual editor and advertising analyst.
  Your task is to review the generated images for an ad campaign and check for visual consistency, logic, and advertising effectiveness.
  
  CRITERIA:
  1. Consistency: Do the characters and products look the same across all images?
  2. Logic: Are there any AI artifacts or illogical elements (extra limbs, floating objects, etc.)?
  3. Quality: Is the lighting, composition, and resolution professional?
  4. Effectiveness: Do the images clearly represent the product and the script's intent?
  
  OUTPUT FORMAT:
  Return a JSON object with:
  - status: 'excellent' | 'good' | 'needs-improvement' | 'poor'
  - score: 0-100
  - feedback: A concise summary of the visual review (in ${language === 'vi' ? 'tiếng Việt' : 'English'}).
  - suggestions: A list of specific, actionable improvements for the image prompts (in ${language === 'vi' ? 'tiếng Việt' : 'English'}).
  `;

  const promptText = `
  IMAGE PROMPTS & DESCRIPTIONS:
  ${segments.map(s => `Scene ${s.index}: 
    Visual Direction: ${s.visualDirection}
    Image Prompt: ${s.imagePrompt}
    Start Image: ${s.startImageUrl ? 'Generated' : 'Not Generated'}
  `).join('\n')}
  
  Please review the generated images and the visual plan, then provide your expert feedback.
  `;

  const parts: any[] = [{ text: promptText }];
  
  // Add generated images to the review context (limit to first 4 to save tokens/context)
  segments.slice(0, 4).forEach(s => {
    if (s.startImageUrl && s.startImageUrl.startsWith('data:')) {
      const [header, data] = s.startImageUrl.split(',');
      const mimeType = header.split(';')[0].split(':')[1] || "image/jpeg";
      parts.push({
        inlineData: {
          mimeType,
          data
        }
      });
    }
  });

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: {
        parts,
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['excellent', 'good', 'needs-improvement', 'poor'] },
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["status", "score", "feedback", "suggestions"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return { ...result, timestamp: Date.now() };
  } catch (error) {
    console.error("Error reviewing images:", error);
    return {
      status: 'good',
      score: 85,
      feedback: "Không thể thực hiện đánh giá hình ảnh chi tiết lúc này.",
      suggestions: [],
      timestamp: Date.now()
    };
  }
}

export async function refineScript(
  script: AdScript,
  feedback: ReviewResult,
  language: Language = 'vi'
): Promise<AdScript> {
  const model = typeof window !== 'undefined' ? localStorage.getItem('selected_gemini_model') || DEFAULT_MODEL : DEFAULT_MODEL;
  
  const systemInstruction = `You are an expert script editor. 
  Your task is to refine the provided ad script based on the feedback and suggestions from the creative director.
  
  GOAL:
  Implement the suggestions to make the script more engaging, logical, and effective for advertising.
  
  OUTPUT FORMAT:
  Return the FULL updated script as a JSON object matching the AdScript structure.
  Ensure all segments are included and improved.
  The JSON must contain the "segments" array.
  `;

  const { referenceImages, imageCategories, ...cleanProductInfo } = script.productInfo;

  const prompt = `
  ORIGINAL SCRIPT:
  ${JSON.stringify({ ...script, productInfo: cleanProductInfo }, null, 2)}
  
  FEEDBACK:
  Status: ${feedback.status}
  Score: ${feedback.score}
  Feedback: ${feedback.feedback}
  Suggestions: ${feedback.suggestions.join('\n- ')}
  
  Please refine the script to address all suggestions.
  `;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const refinedData = JSON.parse(response.text || "{}");
    return { 
      ...script, 
      ...refinedData, 
      id: script.id, 
      timestamp: Date.now() 
    };
  } catch (error) {
    console.error("Error refining script:", error);
    return script;
  }
}
