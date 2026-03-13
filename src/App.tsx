import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Image as ImageIcon, Bookmark, Globe } from 'lucide-react';

import { SettingsBar } from './components/SettingsBar';
import { ProductForm } from './components/ProductForm';
import { ProductImageTab } from './components/ProductImageTab';
import { SavedTemplatesTab } from './components/SavedTemplatesTab';
import { AffiliateChannelTab } from './components/AffiliateChannelTab';
import { ApiKeyGuard, ApiKeySettings } from './components/ApiKeyGuard';
import { UsageDashboard } from './components/UsageDashboard';

import {
  AdScript,
  AdSegment,
  Language,
  Tone,
  ProductInfo,
  SavedTemplate,
  AffiliateIdea,
} from './types';
import {
  generateAdScript,
  generateCharacterProfile,
  generateImagePrompts,
  generateVideoPrompts,
} from './services/geminiService';
import { useTranslation } from './i18n';

type AppTab = 'form' | 'affiliate' | 'images' | 'templates';

const STORAGE_KEYS = {
  history: 'adscript_history',
  templates: 'adscript_templates',
  currentScript: 'current_adscript',
} as const;

const MAX_HISTORY_ITEMS = 5;

const createId = () => Math.random().toString(36).slice(2, 11);

const safeParseJSON = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
};

const safeGetStorage = (key: string): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}"`, error);
    return null;
  }
};

const safeSetStorage = (key: string, value: unknown) => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}"`, error);
  }
};

const getSystemDarkMode = () => {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('form');
  const [language, setLanguage] = useState<Language>('vi');
  const [tone, setTone] = useState<Tone>('Informative');
  const [brandVoice, setBrandVoice] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => getSystemDarkMode());
  const [isLoading, setIsLoading] = useState(false);

  const [currentScript, setCurrentScript] = useState<AdScript | null>(null);
  const [history, setHistory] = useState<AdScript[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ProductInfo | null>(null);

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const { t } = useTranslation(language);

  const hasCurrentScript = useMemo(() => Boolean(currentScript), [currentScript]);

  useEffect(() => {
    const savedHistory = safeParseJSON<AdScript[]>(
      safeGetStorage(STORAGE_KEYS.history),
      []
    );
    const savedTemplatesData = safeParseJSON<SavedTemplate[]>(
      safeGetStorage(STORAGE_KEYS.templates),
      []
    );
    const savedCurrentScript = safeParseJSON<AdScript | null>(
      safeGetStorage(STORAGE_KEYS.currentScript),
      null
    );

    setHistory(Array.isArray(savedHistory) ? savedHistory.slice(0, MAX_HISTORY_ITEMS) : []);
    setSavedTemplates(Array.isArray(savedTemplatesData) ? savedTemplatesData : []);
    setCurrentScript(savedCurrentScript);

    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setDarkMode(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleThemeChange);
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleThemeChange);
      return () => mediaQuery.removeListener(handleThemeChange);
    }
  }, []);

  useEffect(() => {
    if (currentScript) {
      safeSetStorage(STORAGE_KEYS.currentScript, currentScript);
    }
  }, [currentScript]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.history, history.slice(0, MAX_HISTORY_ITEMS));
  }, [history]);

  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.templates, savedTemplates);
  }, [savedTemplates]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleGenerate = async (product: ProductInfo) => {
    setIsLoading(true);
    setActiveTab('form');

    try {
      const { segments, seamlessScript } = await generateAdScript(
        product,
        language,
        tone,
        brandVoice
      );

      const characterProfile = await generateCharacterProfile(product);
      const imagePrompts = await generateImagePrompts(
        segments,
        characterProfile,
        product.name
      );
      const videoPrompts = await generateVideoPrompts(
        segments,
        characterProfile,
        product.name
      );

      const segmentsWithPrompts: AdSegment[] = segments.map((segment, index) => ({
        ...segment,
        imagePrompt: imagePrompts[index] || '',
        videoPrompt: videoPrompts[index] || '',
      }));

      const newScript: AdScript = {
        id: createId(),
        timestamp: Date.now(),
        language,
        tone,
        segments: segmentsWithPrompts,
        seamlessScript,
        productInfo: product,
        characterProfile,
      };

      setCurrentScript(newScript);
      setHistory((prev) => [newScript, ...prev].slice(0, MAX_HISTORY_ITEMS));
      setEditingTemplate(null);
      setActiveTab('images');
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        'Không thể tạo kịch bản. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSegment = (segmentId: string, updates: Partial<AdSegment>) => {
    setCurrentScript((prev) => {
      if (!prev) return null;

      return {
        ...prev,
        segments: prev.segments.map((segment) =>
          segment.id === segmentId ? { ...segment, ...updates } : segment
        ),
      };
    });
  };

  const handleSendToImages = (idea: AffiliateIdea) => {
    const totalScenes = Array.isArray(idea.scenes) ? idea.scenes.length : 0;
    const segmentLength = totalScenes > 0 ? Math.max(4, Math.round(30 / totalScenes)) : 5;

    const newScript: AdScript = {
      id: idea.id || createId(),
      timestamp: Date.now(),
      language,
      tone: 'Informative',
      productInfo: {
        name: idea.conceptTitle || 'Affiliate Idea',
        category: idea.topic || '',
        targetUser: idea.contentAngle || '',
        benefits: [],
        customBenefit: '',
        features: [],
        price: 0,
        currency: 'VND',
        showPrice: false,
        promotion: '',
        audienceDesc: '',
        painPoint: '',
        emotion: '',
        positioning: 'mid',
        platform: (idea.platform as ProductInfo['platform']) || 'tiktok',
        ratio: '9:16',
        totalLength: Math.max(30, totalScenes * segmentLength),
        hookStyle: 'question',
        ctaType: 'click link',
        forbiddenClaims: '',
        brandName: '',
        brandSlogan: '',
        keywordsInclude: '',
        keywordsAvoid: '',
        musicVibe: '',
        characterType: 'real',
        voiceoverStyle: 'neutral',
        voiceoverSpeed: 'normal',
        hasVoiceover: true,
        onScreenText: true,
        productImages: [],
        usageImages: [],
      },
      segments: (idea.scenes || []).map((scene) => ({
        id: `${idea.id || 'idea'}-${scene.scene}`,
        index: scene.scene,
        startTime: (scene.scene - 1) * segmentLength,
        endTime: scene.scene * segmentLength,
        visualDirection: scene.visualDescription || '',
        onScreenText: '',
        voiceover: scene.script || '',
        sfx: '',
        cameraNotes: '',
        imagePrompt: scene.imagePrompt || '',
        videoPrompt: scene.videoPrompt || '',
      })),
      seamlessScript: (idea.scenes || []).map((scene) => scene.script || '').join(' ').trim(),
      characterProfile: '',
    };

    setCurrentScript(newScript);
    setActiveTab('images');
  };

  const handleRegenerate = () => {
    if (currentScript?.productInfo) {
      handleGenerate(currentScript.productInfo);
    }
  };

  const handleSaveTemplate = (data: ProductInfo) => {
    if (!data.name?.trim()) {
      alert('Vui lòng nhập tên sản phẩm trước khi lưu mẫu.');
      return;
    }

    const newTemplate: SavedTemplate = {
      id: createId(),
      name: data.name.trim(),
      timestamp: Date.now(),
      data: { ...data },
    };

    setSavedTemplates((prev) => [newTemplate, ...prev]);
    alert('Đã lưu mẫu thành công!');
  };

  const handleLoadTemplate = (template: SavedTemplate) => {
    setEditingTemplate({ ...template.data });
    setActiveTab('form');
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa mẫu này?')) {
      setSavedTemplates((prev) => prev.filter((template) => template.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <UsageDashboard language={language} />

      <SettingsBar
        language={language}
        setLanguage={setLanguage}
        tone={tone}
        setTone={setTone}
        brandVoice={brandVoice}
        setBrandVoice={setBrandVoice}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode((prev) => !prev)}
        onOpenApiKeySettings={() => setShowApiKeyModal(true)}
      />

      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-w-xl w-full"
            >
              <ApiKeySettings
                onSave={() => setShowApiKeyModal(false)}
                onCancel={() => setShowApiKeyModal(false)}
                language={language}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex flex-col min-h-[calc(100vh-64px)]">
        <div className="w-full bg-white dark:bg-zinc-950 flex flex-col min-h-[calc(100vh-64px)]">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-950 z-40">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'form'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Info className="w-4 h-4" />
              {t('productInfo')}
            </button>

            <button
              onClick={() => setActiveTab('affiliate')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'affiliate'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Globe className="w-4 h-4" />
              {t('affiliateChannel')}
            </button>

            <button
              onClick={() => setActiveTab('images')}
              disabled={!hasCurrentScript}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                !hasCurrentScript
                  ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                  : activeTab === 'images'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              {t('productImages')}
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'templates'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              {t('savedTemplates')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-12 space-y-6 min-h-[400px]"
                >
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/50">
                          <span className="text-white font-bold">AI</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {t('generatingScript')}
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-xs">{t('aiAnalyzing')}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full"
                >
                  {activeTab === 'form' ? (
                    <div className="max-w-4xl mx-auto">
                      <ProductForm
                        onSubmit={handleGenerate}
                        onSaveTemplate={handleSaveTemplate}
                        isLoading={isLoading}
                        initialValue={editingTemplate}
                        language={language}
                        currentScript={currentScript}
                      />
                    </div>
                  ) : activeTab === 'affiliate' ? (
                    <div className="max-w-7xl mx-auto">
                      <AffiliateChannelTab
                        language={language}
                        onSendToImages={handleSendToImages}
                        onSendToVideo={handleSendToImages}
                      />
                    </div>
                  ) : activeTab === 'images' ? (
                    <ApiKeyGuard language={language}>
                      <div className="max-w-6xl mx-auto">
                        <ProductImageTab
                          script={currentScript}
                          onUpdateSegment={handleUpdateSegment}
                          onGenerateAnother={handleRegenerate}
                          language={language}
                          isGenerating={isLoading}
                        />
                      </div>
                    </ApiKeyGuard>
                  ) : (
                    <div className="max-w-4xl mx-auto">
                      <SavedTemplatesTab
                        templates={savedTemplates}
                        onLoad={handleLoadTemplate}
                        onDelete={handleDeleteTemplate}
                        language={language}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
