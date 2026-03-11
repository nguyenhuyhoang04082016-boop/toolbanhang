import React, { useState, useEffect } from 'react';
import { SettingsBar } from './components/SettingsBar';
import { ProductForm } from './components/ProductForm';
import { ProductImageTab } from './components/ProductImageTab';
import { SavedTemplatesTab } from './components/SavedTemplatesTab';
import { ScriptViewer } from './components/ScriptViewer';
import { VideoGenerationTab } from './components/VideoGenerationTab';
import { AffiliateChannelTab } from './components/AffiliateChannelTab';
import { ApiKeyGuard, ApiKeySettings } from './components/ApiKeyGuard';
import { AdScript, AdSegment, Language, Tone, ProductInfo, SavedTemplate, AffiliateIdea } from './types';
import { generateAdScript, generateCharacterProfile, generateImagePrompts, generateImage, generateVideoPrompts } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Image as ImageIcon, Bookmark, Video, Globe } from 'lucide-react';

import { UsageDashboard } from './components/UsageDashboard';
import { useTranslation } from './i18n';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'affiliate' | 'images' | 'templates' | 'video'>('form');
  const [language, setLanguage] = useState<Language>('vi');
  const { t } = useTranslation(language);
  const [tone, setTone] = useState<Tone>('Informative');
  const [brandVoice, setBrandVoice] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentScript, setCurrentScript] = useState<AdScript | null>(null);
  const [history, setHistory] = useState<AdScript[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ProductInfo | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Load history and saved templates from local storage
  useEffect(() => {
    const savedHistory = localStorage.getItem('adscript_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }

    const savedTmpls = localStorage.getItem('adscript_templates');
    if (savedTmpls) {
      try {
        setSavedTemplates(JSON.parse(savedTmpls));
      } catch (e) {
        console.error('Failed to parse templates', e);
      }
    }

    const savedCurrentScript = localStorage.getItem('current_adscript');
    if (savedCurrentScript) {
      try {
        setCurrentScript(JSON.parse(savedCurrentScript));
      } catch (e) {
        console.error('Failed to parse current script', e);
      }
    }
    
    // Check dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // Sync current script to local storage
  useEffect(() => {
    if (currentScript) {
      localStorage.setItem('current_adscript', JSON.stringify(currentScript));
    }
  }, [currentScript]);

  // Sync history to local storage
  useEffect(() => {
    localStorage.setItem('adscript_history', JSON.stringify(history.slice(0, 5)));
  }, [history]);

  // Sync templates to local storage
  useEffect(() => {
    localStorage.setItem('adscript_templates', JSON.stringify(savedTemplates));
  }, [savedTemplates]);

  // Apply dark mode class
  useEffect(() => {
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
      // 1. Generate Script
      const { segments, seamlessScript } = await generateAdScript(product, language, tone, brandVoice);
      
      // 2. Generate Character Profile for consistency
      const characterProfile = await generateCharacterProfile(product);
      
      // 3. Generate Image Prompts for each segment
      const imagePrompts = await generateImagePrompts(segments, characterProfile, product.name);
      
      // 3.5 Generate Video Prompts
      const videoPrompts = await generateVideoPrompts(segments, characterProfile, product.name);
      
      const segmentsWithPrompts = segments.map((s, i) => ({
        ...s,
        imagePrompt: imagePrompts[i] || "",
        videoPrompt: videoPrompts[i] || ""
      }));

      const newScript: AdScript = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        language,
        tone,
        segments: segmentsWithPrompts,
        seamlessScript,
        productInfo: product,
        characterProfile,
      };
      
      setCurrentScript(newScript);
      setHistory((prev) => [newScript, ...prev].slice(0, 5));
      setActiveTab('images'); // Switch to images tab to review prompts

    } catch (error: any) {
      const errorMessage = error?.message || 'Không thể tạo kịch bản. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSegment = (segmentId: string, updates: Partial<AdSegment>) => {
    setCurrentScript(prev => {
      if (!prev) return null;
      return {
        ...prev,
        segments: prev.segments.map(s => 
          s.id === segmentId ? { ...s, ...updates } : s
        )
      };
    });
  };

  const handleSendToImages = (idea: AffiliateIdea) => {
    const newScript: AdScript = {
      id: idea.id,
      timestamp: Date.now(),
      language: language,
      tone: 'Informative',
      productInfo: {
        name: idea.conceptTitle,
        category: idea.topic,
        targetUser: idea.contentAngle,
        benefits: [],
        customBenefit: '',
        features: [],
        price: 0,
        currency: 'VND',
        audienceDesc: '',
        painPoint: '',
        emotion: '',
        positioning: 'mid',
        platform: idea.platform as any,
        ratio: '9:16',
        totalLength: 30,
        hookStyle: 'question',
        ctaType: 'click link',
        characterType: 'real',
        voiceoverStyle: 'neutral',
        voiceoverSpeed: 'normal',
        hasVoiceover: true,
        onScreenText: true
      },
      segments: idea.scenes.map(s => ({
        id: `${idea.id}-${s.scene}`,
        index: s.scene,
        startTime: (s.scene - 1) * 5,
        endTime: s.scene * 5,
        visualDirection: s.visualDescription,
        onScreenText: '',
        voiceover: s.script,
        sfx: '',
        imagePrompt: s.imagePrompt,
        videoPrompt: s.videoPrompt
      }))
    };
    setCurrentScript(newScript);
    setActiveTab('images');
  };

  const handleSendToVideo = (idea: AffiliateIdea) => {
    handleSendToImages(idea);
    setActiveTab('video');
  };

  const handleUpdateSegments = (newSegments: AdSegment[]) => {
    if (currentScript) {
      setCurrentScript({ ...currentScript, segments: newSegments });
    }
  };

  const handleRegenerate = () => {
    if (currentScript) {
      handleGenerate(currentScript.productInfo);
    }
  };

  const handleSaveTemplate = (data: ProductInfo) => {
    if (!data.name) {
      alert("Vui lòng nhập tên sản phẩm trước khi lưu mẫu.");
      return;
    }
    const newTemplate: SavedTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      timestamp: Date.now(),
      data: { ...data }
    };
    setSavedTemplates(prev => [newTemplate, ...prev]);
    alert("Đã lưu mẫu thành công!");
  };

  const handleLoadTemplate = (template: SavedTemplate) => {
    setEditingTemplate(template.data);
    setActiveTab('form');
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa mẫu này?")) {
      setSavedTemplates(prev => prev.filter(t => t.id !== id));
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
        toggleDarkMode={() => setDarkMode(!darkMode)}
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
        {/* Main Content: Form & Images */}
        <div className="w-full bg-white dark:bg-zinc-950 flex flex-col min-h-[calc(100vh-64px)]">
          {/* Tabs Header */}
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
              disabled={!currentScript}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                !currentScript 
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
              onClick={() => setActiveTab('video')}
              disabled={!currentScript}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                !currentScript 
                  ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed' 
                  : activeTab === 'video'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Video className="w-4 h-4" />
              {t('buildVideo')}
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
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('generatingScript')}</h3>
                    <p className="text-sm text-zinc-500 max-w-xs">
                      {t('aiAnalyzing')}
                    </p>
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
                        onSendToVideo={handleSendToVideo}
                      />
                    </div>
                  ) : activeTab === 'images' ? (
                    <ApiKeyGuard language={language}>
                      <div className="max-w-6xl mx-auto">
                        <ProductImageTab 
                          script={currentScript} 
                          onUpdateSegment={handleUpdateSegment} 
                          language={language}
                        />
                      </div>
                    </ApiKeyGuard>
                  ) : activeTab === 'video' ? (
                    <ApiKeyGuard language={language}>
                      <VideoGenerationTab currentScript={currentScript} language={language} />
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
