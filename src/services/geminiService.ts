import { GoogleGenAI, Type } from "@google/genai";
import { ProductInfo, AdSegment, Language, Tone } from "../types";
import { trackUsage, calculateCost } from "./costService";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_VEO_MODEL = "veo-3.1-fast-generate-preview";
const MAX_CACHE_SIZE = 50;
const MAX_CONCURRENT_API_CALLS = 2;

type AiType = "gemini" | "veo";

const safeLocalStorageGet = (key: string): string | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`Cannot read localStorage key "${key}"`, error);
    return null;
  }
};

const safeDispatchWindowEvent = (eventName: string, detail: Record<string, unknown>) => {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch (error) {
    console.warn(`Failed to dispatch event "${eventName}"`, error);
  }
};

const getEnvApiKey = (type: AiType): string => {
  try {
    if (type === "veo") {
      return (
        import.meta.env.VITE_VEO_API_KEY ||
        import.meta.env.VITE_API_KEY ||
        ""
      );
    }

    return (
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_API_KEY ||
      ""
    );
  } catch {
    return "";
  }
};

const getApiKey = (type: AiType = "gemini"): string => {
  const manualGeminiKey = safeLocalStorageGet("manual_gemini_api_key");
  const manualVeoKey = safeLocalStorageGet("manual_veo_api_key");

  const key =
    type === "veo"
      ? manualVeoKey || getEnvApiKey("veo")
      : manualGeminiKey || getEnvApiKey("gemini");

  if (!key) {
    throw new Error(
      type === "veo"
        ? "Chưa cấu hình Veo API Key. Vui lòng nhập key thủ công hoặc thiết lập VITE_VEO_API_KEY."
        : "Chưa cấu hình Gemini API Key. Vui lòng nhập key thủ công hoặc thiết lập VITE_GEMINI_API_KEY."
    );
  }

  return key;
};

const getAiInstance = (type: AiType = "gemini") => {
  return new GoogleGenAI({ apiKey: getApiKey(type) });
};

class TaskQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = Math.max(1, maxConcurrent);
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
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

  private process() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) return;

      this.running++;

      task()
        .catch((error) => {
          console.error("TaskQueue task failed:", error);
        })
        .finally(() => {
          this.running--;
          this.process();
        });
    }
  }
}

const apiQueue = new TaskQueue(MAX_CONCURRENT_API_CALLS);
const cache = new Map<string, unknown>();

const trimCacheIfNeeded = () => {
  while (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

const setCache = (key: string, value: unknown) => {
  trimCacheIfNeeded();
  cache.set(key, value);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getSelectedModel = (storageKey: string, fallback: string): string => {
  return safeLocalStorageGet(storageKey) || fallback;
};

const getImageData = (img: string): { mimeType: string; data: string } | null => {
  if (!img || typeof img !== "string") return null;
  const parts = img.split(",");
  if (parts.length < 2) return null;

  const header = parts[0];
  const data = parts[1];
  const mimeType = header.split(";")[0]?.split(":")[1] || "image/jpeg";

  if (!data) return null;
  return { mimeType, data };
};

const buildInlineImageParts = (images: string[], limit: number) => {
  return images
    .slice(0, limit)
    .map((img) => getImageData(img))
    .filter((item): item is { mimeType: string; data: string } => Boolean(item))
    .map(({ mimeType, data }) => ({
      inlineData: { mimeType, data },
    }));
};

const extractResponseText = (response: any): string => {
  if (!response) return "";

  if (typeof response.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  if (typeof response.text === "function") {
    try {
      const value = response.text();
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    } catch (error) {
      console.warn("Failed to read response.text()", error);
    }
  }

  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const joined = parts
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();

    if (joined) return joined;
  }

  return "";
};

const isRetryableError = (error: any): boolean => {
  const message = String(error?.message || "").toLowerCase();
  const statusCode = Number(error?.status || 0);

  const isRateLimit =
    statusCode === 429 ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit");

  const isServerError =
    statusCode >= 500 ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("internal") ||
    message.includes("unavailable") ||
    message.includes("temporarily");

  return isRateLimit || isServerError;
};

async function callGeminiWithRetry(
  params: any,
  type: AiType = "gemini",
  maxRetries = 3,
  baseDelay = 3000
): Promise<any> {
  const cacheKey = `${type}:${JSON.stringify(params)}`;
  if (cache.has(cacheKey)) {
    console.log("Returning cached AI response");
    return cache.get(cacheKey);
  }

  const ai = getAiInstance(type);
  const modelName = params.model || DEFAULT_MODEL;

  let estimatedInputTokens = 0;
  const estimatedOutputTokens = 1000;

  try {
    if (params.contents) {
      const countResult = await ai.models.countTokens({
        model: modelName,
        contents: params.contents,
      });
      estimatedInputTokens = countResult?.totalTokens || 0;
    }
  } catch (error) {
    console.warn("Failed to estimate tokens", error);
  }

  safeDispatchWindowEvent("gemini_cost_estimate", {
    model: modelName,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    estimatedCost: calculateCost(estimatedInputTokens, estimatedOutputTokens),
  });

  return apiQueue.add(async () => {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const retryDelay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Retry attempt ${attempt} after ${retryDelay}ms...`);
          await delay(retryDelay);
        }

        const response = await ai.models.generateContent(params);

        const actualInputTokens =
          response?.usageMetadata?.promptTokenCount || estimatedInputTokens;
        const actualOutputTokens =
          response?.usageMetadata?.candidatesTokenCount || 0;

        trackUsage(
          modelName,
          estimatedInputTokens,
          estimatedOutputTokens,
          actualInputTokens,
          actualOutputTokens
        );

        safeDispatchWindowEvent("gemini_cost_actual", {
          model: modelName,
          actualInputTokens,
          actualOutputTokens,
          actualCost: calculateCost(actualInputTokens, actualOutputTokens),
        });

        setCache(cacheKey, response);
        return response;
      } catch (error: any) {
        lastError = error;

        if (!isRetryableError(error)) {
          throw error;
        }

        console.warn(`AI API retryable error (Attempt ${attempt + 1}):`, error?.message);

        if (attempt === maxRetries) {
          break;
        }

        const message = String(error?.message || "").toLowerCase();
        if (message.includes("429") || message.includes("quota")) {
          await delay(5000);
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
): Promise<{ segments: AdSegment[]; seamlessScript: string }> {
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const totalLength = Number(product.totalLength || 0);
  const segmentDuration = 4;
  const segmentCount = Math.max(1, Math.ceil(totalLength / segmentDuration));

  const systemInstruction = `You are an expert short-form ad script writer.
Generate a high-converting ad script split into segments of approximately 4 seconds each.
Structure: approximately ${segmentCount} segments.
Format: JSON object with "segments" (array) and "seamlessScript" (string).
Language: ${language === "vi" ? "Vietnamese" : "English"}.
Tone: ${tone}.
Character Type: ${
    product.characterType === "real"
      ? "Real Person (Photorealistic)"
      : "Cartoon/Animation/3D Style"
  }.
Brand Voice: ${brandVoice ? "Enabled (more professional and consistent)" : "Disabled"}.

Structure Strategy: Use AIDA (Attention, Interest, Desire, Action) or PAS (Problem, Agitation, Solution).
- Segment 1: Strong hook.
- Middle segments: Benefits, proof, objection handling.
- Final segment: Offer and Call to Action.

Compliance: Avoid unrealistic medical claims.

Each segment object must have:
- visualDirection: string
- sfx: string
- cameraNotes: string (optional)

The "seamlessScript" should be the full voiceover script combined into one smooth, natural paragraph.`;

  const prompt = `
Product Details:
- Name: ${product.name}
- Category: ${product.category}
- Target: ${product.targetUser}
- Benefits: ${product.benefits.join(", ")} ${product.customBenefit || ""}
- Features: ${product.features.join(", ")}
${product.showPrice ? `- Price: ${product.price} ${product.currency}` : "- Price: Do not mention price"}
- Promotion: ${product.promotion || "None"}
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
- Forbidden: ${product.forbiddenClaims || "None"}

Creative Assets:
- Brand: ${product.brandName || "N/A"}
- Slogan: ${product.brandSlogan || "N/A"}
- Keywords to include: ${product.keywordsInclude || "N/A"}
- Keywords to avoid: ${product.keywordsAvoid || "N/A"}
- Music vibe: ${product.musicVibe || "N/A"}

Generate segments of around 4 seconds each.
`;

  const imageParts = [
    ...buildInlineImageParts(product.productImages || [], 3),
    ...buildInlineImageParts(product.usageImages || [], 3),
  ];

  const contents =
    imageParts.length > 0
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
                  sfx: { type: Type.STRING },
                  cameraNotes: { type: Type.STRING },
                },
                required: ["visualDirection", "sfx"],
              },
            },
            seamlessScript: { type: Type.STRING },
          },
          required: ["segments", "seamlessScript"],
        },
      },
    });

    const rawJson = extractResponseText(response);
    if (!rawJson) throw new Error("No response from AI");

    const result = JSON.parse(rawJson);
    const segments: any[] = Array.isArray(result?.segments) ? result.segments : [];
    const seamlessScript: string = typeof result?.seamlessScript === "string" ? result.seamlessScript : "";

    return {
      segments: segments.map((s, i) => ({
        id: Math.random().toString(36).slice(2, 11),
        index: i + 1,
        startTime: i * segmentDuration,
        endTime: Math.min((i + 1) * segmentDuration, totalLength || (i + 1) * segmentDuration),
        visualDirection: s.visualDirection || "",
        voiceover: "",
        onScreenText: "",
        sfx: s.sfx || "",
        cameraNotes: s.cameraNotes || "",
      })),
      seamlessScript,
    };
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

export async function generateCharacterProfile(product: ProductInfo): Promise<string> {
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const prompt = `Based on this product and target audience, create a detailed visual description of a recurring character or mascot for the ad campaign to ensure visual consistency.
Product: ${product.name}
Character Type: ${product.characterType === "real" ? "Real Person" : "Cartoon/Animation"}
Audience: ${product.audienceDesc}
Tone: ${product.emotion}

Describe appearance, clothing, and key features in 2-3 sentences.`;

  const imageParts = [
    ...buildInlineImageParts(product.productImages || [], 2),
    ...buildInlineImageParts(product.usageImages || [], 2),
  ];

  const contents =
    imageParts.length > 0
      ? { parts: [{ text: prompt }, ...imageParts] }
      : prompt;

  const response = await callGeminiWithRetry({
    model,
    contents,
  });

  return extractResponseText(response) || "A friendly person using the product.";
}

export async function generateImagePrompts(
  segments: AdSegment[],
  characterProfile: string,
  productName: string
): Promise<string[]> {
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const isCartoonStyle =
    characterProfile.toLowerCase().includes("cartoon") ||
    characterProfile.toLowerCase().includes("animation");

  const prompt = `For each of the following ad segments, generate a high-quality, detailed image generation prompt.

CRITICAL: Visual Consistency
- Character Profile: ${characterProfile}
- Character Style: ${isCartoonStyle ? "Cartoon/3D Animation" : "Photorealistic/Real Person"}
- The character described above MUST be the main subject in every image.
- Keep the same clothing, hair, and facial features throughout.
- Product: ${productName}

Segments:
${segments.map((s) => `Segment ${s.index}: ${s.visualDirection}`).join("\n")}

Return a JSON array of strings, one for each segment. Each prompt should be in English and optimized for image generation.`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  const text = extractResponseText(response);
  return JSON.parse(text || "[]");
}

export async function generateImage(
  prompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9",
  base64Images?: string[]
): Promise<string> {
  return apiQueue.add(async () => {
    try {
      const aiImage = getAiInstance("gemini");
      const parts: any[] = [{ text: prompt }];

      if (Array.isArray(base64Images) && base64Images.length > 0) {
        const imageParts = base64Images
          .map((img) => getImageData(img))
          .filter((item): item is { mimeType: string; data: string } => Boolean(item))
          .map(({ mimeType, data }) => ({
            inlineData: { mimeType, data },
          }));

        parts.unshift(...imageParts);
      }

      const response = await aiImage.models.generateContent({
        model: DEFAULT_IMAGE_MODEL,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio,
          },
        },
      });

      const candidate = response?.candidates?.[0];

      if (candidate?.finishReason === "SAFETY") {
        throw new Error("Nội dung bị chặn bởi bộ lọc an toàn.");
      }

      for (const part of candidate?.content?.parts || []) {
        if (part?.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      const responseText = extractResponseText(response).toLowerCase();
      if (
        responseText.includes("not allowed") ||
        responseText.includes("permission denied") ||
        responseText.includes("forbidden")
      ) {
        throw new Error(
          "Tài khoản hiện tại không hỗ trợ tạo ảnh qua API. Bạn cần API Key từ Project có bật thanh toán."
        );
      }

      throw new Error("Không thể tạo ảnh từ câu lệnh này. Có thể do giới hạn model hoặc tài khoản.");
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();

      if (
        message.includes("403") ||
        message.includes("permission") ||
        message.includes("forbidden")
      ) {
        throw new Error(
          "Tài khoản Gemini hiện tại không hỗ trợ tạo ảnh qua API. Vui lòng dùng API Key từ Project có bật thanh toán."
        );
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
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const isCartoonStyle =
    characterProfile.toLowerCase().includes("cartoon") ||
    characterProfile.toLowerCase().includes("animation");

  const prompt = `You are an expert AI Video Director specializing in Veo.
Your task is to analyze the following ad segments and create highly detailed cinematic video generation prompts for each.

ANALYSIS GOALS:
1. Visual Continuity: Ensure the character and environment remain consistent across all segments.
2. Dynamic Motion: Describe specific camera movements and subject actions.
3. Lighting & Atmosphere: Define the mood, color palette, and lighting style.
4. Optimization: Use high-fidelity descriptive language.

INPUT DATA:
- Product Name: ${productName}
- Character Profile: ${characterProfile}
- Character Style: ${isCartoonStyle ? "Cartoon/3D Animation" : "Photorealistic/Real Person"}

SEGMENTS TO ANALYZE:
${segments
  .map(
    (s) => `
Segment ${s.index}:
- Visual Direction: ${s.visualDirection}
- Voiceover: ${s.voiceover}
- On-Screen Text: ${s.onScreenText}
`
  )
  .join("\n")}

OUTPUT REQUIREMENTS:
- Return a JSON array of strings.
- Each string is a comprehensive video prompt in English for the corresponding segment.
- Include details about textures, materials, and subtle environmental effects.`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  const text = extractResponseText(response);
  return JSON.parse(text || "[]");
}

export async function generateVideo(
  prompt: string,
  startImage?: string,
  endImage?: string,
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<string> {
  return apiQueue.add(async () => {
    const aiVideo = getAiInstance("veo");

    const payload: any = {
      model: getSelectedModel("selected_veo_model", DEFAULT_VEO_MODEL),
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio,
      },
    };

    const startFrame = getImageData(startImage || "");
    const endFrame = getImageData(endImage || "");

    if (startFrame) {
      payload.image = {
        imageBytes: startFrame.data,
        mimeType: startFrame.mimeType,
      };
    }

    if (endFrame) {
      payload.config.lastFrame = {
        imageBytes: endFrame.data,
        mimeType: endFrame.mimeType,
      };
    }

    let operation: any;
    let lastError: any;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await delay(5000 * attempt);
        }

        operation = await aiVideo.models.generateVideos(payload);
        break;
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || "").toLowerCase();

        if (
          msg.includes("requested entity was not found") ||
          msg.includes("403") ||
          msg.includes("permission") ||
          msg.includes("forbidden")
        ) {
          throw new Error(
            "Lỗi quyền truy cập Veo: Project của bạn có thể chưa bật API cần thiết hoặc chưa có billing."
          );
        }

        if (!isRetryableError(error)) {
          throw error;
        }
      }
    }

    if (!operation) {
      throw lastError || new Error("Không thể khởi tạo tác vụ tạo video.");
    }

    const maxPolls = 60;
    let pollCount = 0;

    while (!operation.done && pollCount < maxPolls) {
      pollCount++;
      await delay(10000);

      try {
        operation = await aiVideo.operations.getVideosOperation({ operation });
      } catch (error: any) {
        console.warn("Polling error, retrying...", error?.message);
      }
    }

    if (!operation.done) {
      throw new Error("Hết thời gian chờ tạo video.");
    }

    const downloadLink = operation?.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation failed.");
    }

    const veoApiKey = getApiKey("veo");
    const response = await fetch(downloadLink, {
      method: "GET",
      headers: {
        "x-goog-api-key": veoApiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Requested entity was not found.");
      }
      throw new Error(`Failed to download video. HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  });
}

export async function refineImagePrompt(
  currentPrompt: string,
  instruction: string,
  characterProfile = ""
): Promise<string> {
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const prompt = `You are an AI image prompt engineer.
Your task is to refine or modify an existing image generation prompt based on a user's instruction.

CURRENT PROMPT: "${currentPrompt}"
USER INSTRUCTION: "${instruction}"
CHARACTER PROFILE (for consistency): "${characterProfile}"

RULES:
1. The output must be a single, high-quality, detailed image generation prompt in English.
2. Incorporate the user's instruction into the current prompt.
3. Maintain visual consistency with the character profile if provided.
4. Focus on photorealistic, cinematic details.
5. Return ONLY the refined English prompt.`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
  });

  return extractResponseText(response) || currentPrompt;
}

export async function translatePrompt(
  text: string,
  targetLanguage: "English" | "Vietnamese" = "English"
): Promise<string> {
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const prompt = `Translate the following image generation prompt to ${targetLanguage}.
Keep technical terms, artistic styles, and descriptive details accurate for AI image generation.
Return ONLY the translated text.

Text: ${text}`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
  });

  return extractResponseText(response) || text;
}

export async function generateAffiliateIdeas(info: any, language: string): Promise<any[]> {
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const prompt = `You are a world-class Affiliate Marketing Strategist and Content Creator.
Based on the following channel strategy, generate ${info.ideaCount} diverse and highly engaging content ideas/scripts for an affiliate channel.

CHANNEL STRATEGY:
- Platform: ${info.platform}
- Channel Type: ${info.channelType}
- Goal: ${info.channelGoal}
- Channel Name: ${info.channelName}
- Description: ${info.channelDescription}
- Main Topic: ${info.mainTopic}
- Sub Topics: ${info.subTopics.join(", ")}
- Target Audience: ${info.targetAudience.join(", ")}
- Customer Insight: ${info.customerInsight}
- Pain Points: ${info.customerPainPoints}
- Style: ${info.contentStyle.join(", ")}
- Tone: ${info.contentTone}
- Video Length: ${info.targetVideoLength}
- Hook Types: ${info.hookType.join(", ")}
- Script Structure: ${info.scriptStructure}
- Segment Count: ${info.segmentCount}
- Special Requirements: ${info.specialRequirements}

REQUIREMENTS:
1. Analyze the chosen platform's algorithm and create content optimized for it.
2. Generate diverse content angles.
3. Each script must have a strong hook within the first 3 seconds.
4. Each script must be divided into ${info.segmentCount} clear scenes.
5. For each scene, provide:
   - script
   - visualDescription
   - imagePrompt
   - videoPrompt

OUTPUT FORMAT:
Return ONLY a JSON array of objects with this structure:
[
  {
    "id": "unique_id",
    "conceptTitle": "Catchy title",
    "platform": "${info.platform}",
    "topic": "Specific topic angle",
    "contentAngle": "Strategy behind this idea",
    "hookType": "Type of hook used",
    "hookText": "The actual hook text",
    "cta": "${info.ctaText || "Link in bio"}",
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

Language for script and descriptions: ${language === "vi" ? "Vietnamese" : "English"}.
Prompts (imagePrompt, videoPrompt) must ALWAYS be in English.`;

  const response = await callGeminiWithRetry({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(extractResponseText(response) || "[]");
  } catch (error) {
    console.error("Failed to parse affiliate ideas JSON:", error);
    return [];
  }
}

export async function generateMotionPrompt(
  currentScene: any,
  context: { before: any[]; after: any[] },
  imageUrl: string,
  language: Language = "vi"
): Promise<{ prompt: string; title: string }> {
  const model = getSelectedModel("selected_gemini_model", DEFAULT_MODEL);

  const titleLanguage = language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `You are a cinematic motion director and AI video prompt engineer.
Your task is to generate a highly detailed motion prompt for an AI video model.

The prompt must follow this structure:
1. Start Frame
2. Camera Movement
3. Character/Subject Motion
4. Environmental Interaction
5. End Frame

CRITICAL REQUIREMENTS:
- Duration: balanced for a 6-10 second clip.
- Detail: describe foreground elements, visual gateway, and sense of discovery.
- Consistency: ensure art style, textures, and lighting match the provided image.
- Output: Return a JSON object with:
  - prompt: The full, detailed English motion prompt.
  - title: A short, catchy summary in ${titleLanguage} (5-10 words).`;

  const prompt = `
CONTEXT:
- Previous Scenes: ${context.before.map((s) => s.visualDirection || s.prompt || "").join(" | ")}
- CURRENT SCENE: ${currentScene.visualDirection || currentScene.prompt || ""}
- Next Scenes: ${context.after.map((s) => s.visualDirection || s.prompt || "").join(" | ")}

IMAGE ANALYSIS:
The provided image represents the END FRAME of this sequence. Analyze its style, lighting, and composition.

TASK:
Generate a cinematic motion prompt that leads into this END FRAME.
Use the "discovery" approach: start with a wider or partially hidden view, then move the camera to reveal the scene in the image.
`;

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

    const text = extractResponseText(response);
    const parsed = JSON.parse(text || "{}");

    return {
      prompt:
        typeof parsed?.prompt === "string" && parsed.prompt.trim()
          ? parsed.prompt
          : "Cinematic camera movement revealing the subject with smooth transitions and professional lighting.",
      title:
        typeof parsed?.title === "string" && parsed.title.trim()
          ? parsed.title
          : language === "vi"
          ? "Chuyển động điện ảnh mượt mà"
          : "Smooth cinematic motion",
    };
  } catch (error) {
    console.error("Error generating motion prompt:", error);
    return {
      prompt:
        "Cinematic camera movement revealing the subject with smooth transitions and professional lighting.",
      title: language === "vi" ? "Chuyển động điện ảnh mượt mà" : "Smooth cinematic motion",
    };
  }
}
