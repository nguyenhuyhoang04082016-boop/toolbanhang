import { UsageStats } from "../types";

// Pricing per 1 million tokens
export const PRICING = {
  INPUT_TEXT_IMAGE_VIDEO: 0.30,
  INPUT_AUDIO: 1.00,
  OUTPUT: 2.50
};

const STORAGE_KEY = 'app_usage_stats';

export const getUsageStats = (): UsageStats => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse usage stats", e);
    }
  }
  return {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0
  };
};

export const saveUsageStats = (stats: UsageStats) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const calculateCost = (inputTokens: number, outputTokens: number, isAudio: boolean = false): number => {
  const inputRate = isAudio ? PRICING.INPUT_AUDIO : PRICING.INPUT_TEXT_IMAGE_VIDEO;
  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT;
  return inputCost + outputCost;
};

export const trackUsage = (
  model: string,
  estimatedInput: number,
  estimatedOutput: number,
  actualInput: number,
  actualOutput: number,
  isAudio: boolean = false
) => {
  const stats = getUsageStats();
  
  const estimatedCost = calculateCost(estimatedInput, estimatedOutput, isAudio);
  const actualCost = calculateCost(actualInput, actualOutput, isAudio);
  
  const diffPercent = estimatedCost > 0 
    ? ((actualCost - estimatedCost) / estimatedCost) * 100 
    : 0;

  const newStats: UsageStats = {
    totalInputTokens: stats.totalInputTokens + actualInput,
    totalOutputTokens: stats.totalOutputTokens + actualOutput,
    totalCost: stats.totalCost + actualCost,
    lastAction: {
      model,
      estimatedInputTokens: estimatedInput,
      estimatedOutputTokens: estimatedOutput,
      estimatedCost,
      actualInputTokens: actualInput,
      actualOutputTokens: actualOutput,
      actualCost,
      diffPercent,
      timestamp: Date.now()
    }
  };

  saveUsageStats(newStats);
  return newStats;
};
