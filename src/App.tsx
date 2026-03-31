import React, { useState, useEffect } from 'react';
import { SettingsBar } from './components/SettingsBar';
import { ProductForm } from './components/ProductForm';
import { CharacterEnvTab } from './components/CharacterEnvTab';
import { ProductAssetsTab } from './components/ProductAssetsTab';
import { ProductImageTab } from './components/ProductImageTab';
import { ScriptOrientationTab } from './components/ScriptOrientationTab';
import { VideoGenerationTab } from './components/VideoGenerationTab';
import { SavedTemplatesTab } from './components/SavedTemplatesTab';
import { ApiKeyGuard, ApiKeySettings } from './components/ApiKeyGuard';
import { AdScript, AdSegment, Language, ProductInfo, SavedTemplate, VisualTemplate } from './types';
import { generateAdScript, generateCharacterProfile, generateImagePrompts, generateVideoPrompts, inferScriptOrientation } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Image as ImageIcon, Bookmark, Globe, Sparkles, ShoppingCart, Trash2, Plus, List, PlayCircle } from 'lucide-react';

import { UsageDashboard } from './components/UsageDashboard';
import { useTranslation } from './i18n';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'characterEnv' | 'productImages' | 'orientation' | 'results' | 'videoGen' | 'templates'>('form');
  const [language, setLanguage] = useState<Language>('vi');
  const { t } = useTranslation(language);
  const [brandVoice, setBrandVoice] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentScript, setCurrentScript] = useState<AdScript | null>(null);
  const [history, setHistory] = useState<AdScript[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [visualTemplates, setVisualTemplates] = useState<VisualTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ProductInfo | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Temporary state for the current product info being built
  const [productDraft, setProductDraft] = useState<ProductInfo>({
    name: '',
    category: '',
    ratio: '9:16',
    totalLength: 32,
    additionalRequirements: '',
    referenceImages: [],
    imageCategories: [],
    hasVoiceover: true,
    scriptOrientation: {
      style: 'lifestyle',
      dialogueType: 'self-talk',
      targetAudience: '',
      keyMessage: '',
      toneOfVoice: 'friendly',
      additionalNotes: ''
    }
  });

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

    const savedVisualTmpls = localStorage.getItem('visual_templates');
    if (savedVisualTmpls) {
      try {
        setVisualTemplates(JSON.parse(savedVisualTmpls));
      } catch (e) {
        console.error('Failed to parse visual templates', e);
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

  // Helper to strip large base64 images from data before saving to localStorage
  const stripImages = (data: any, superAggressive: boolean = false): any => {
    if (!data) return data;
    const cloned = JSON.parse(JSON.stringify(data));
    
    const cleanImageCategories = (categories: any[]) => {
      if (!categories) return [];
      return categories.map((cat: any) => ({
        ...cat,
        images: [] // Strip all images
      }));
    };

    const cleanProductInfo = (info: any) => {
      if (info.referenceImages) info.referenceImages = [];
      if (info.imageCategories) {
        info.imageCategories = cleanImageCategories(info.imageCategories);
      }
      // Also strip base64 from scriptOrientation if any (though unlikely)
    };

    const cleanScript = (script: any) => {
      if (!script) return;
      if (script.productInfo) cleanProductInfo(script.productInfo);
      if (script.segments) {
        script.segments = script.segments.map((seg: any) => ({
          ...seg,
          startImageUrl: undefined,
          endImageUrl: undefined,
          videoUrl: undefined,
          // Also strip prompts if they are huge, but usually they are fine
        }));
      }
    };

    const cleanVisualTemplate = (template: any) => {
      if (template.categories) {
        // For visual templates, we might want to keep at least ONE image for preview
        // but for "stripping" we'll remove all to be safe or keep only the first one
        template.categories = template.categories.map((cat: any) => ({
          ...cat,
          // If super aggressive, strip all images. Otherwise keep at most 1.
          images: !superAggressive && cat.images && cat.images.length > 0 ? [cat.images[0]] : []
        }));
      }
    };

    if (Array.isArray(cloned)) {
      cloned.forEach(item => {
        if (item.categories) cleanVisualTemplate(item); // For visual templates
        else if (item.data) cleanProductInfo(item.data); // For saved templates
        else cleanScript(item); // For history
      });
    } else {
      if (cloned.segments) cleanScript(cloned);
      else if (cloned.data) cleanProductInfo(cloned.data);
      else if (cloned.categories) cleanVisualTemplate(cloned);
    }
    
    return cloned;
  };

  const safeSetItem = (key: string, value: any, shouldStrip: boolean = false) => {
    try {
      const dataToSave = shouldStrip ? stripImages(value) : value;
      localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn(`LocalStorage quota exceeded for ${key}. Attempting cleanup.`);
        try {
          // 1. Try clearing history and templates first as they are less critical
          localStorage.removeItem('adscript_history');
          localStorage.removeItem('adscript_templates');
          localStorage.removeItem('current_adscript');
          
          try {
            localStorage.setItem(key, JSON.stringify(shouldStrip ? stripImages(value) : value));
          } catch (retry1) {
            // 2. If still fails, try stripping more aggressively
            console.warn(`Still exceeding quota for ${key}. Stripping more aggressively.`);
            
            if (key === 'visual_templates') {
              // For visual templates, keep only the 2 most recent ones and strip ALL images
              if (Array.isArray(value)) {
                const limited = value.slice(0, 2);
                localStorage.setItem(key, JSON.stringify(stripImages(limited, true)));
              }
            } else if (key === 'current_adscript' || key === 'adscript_history') {
              // For scripts and history, strip all images
              localStorage.setItem(key, JSON.stringify(stripImages(value, true)));
            } else {
              // For others, just try saving a very small version
              if (Array.isArray(value)) {
                localStorage.setItem(key, JSON.stringify(stripImages(value.slice(0, 1), true)));
              }
            }
          }
        } catch (retryError) {
          console.error(`Failed to save ${key} even after aggressive cleanup`, retryError);
          // Last ditch effort: clear everything except essential settings
          try {
            localStorage.removeItem('adscript_history');
            localStorage.removeItem('adscript_templates');
            localStorage.removeItem('visual_templates');
            localStorage.removeItem('current_adscript');
            
            // Try saving the current one again (completely stripped)
            localStorage.setItem(key, JSON.stringify(stripImages(value, true)));
          } catch (finalError) {
            console.error(`Critical failure saving to localStorage`, finalError);
          }
        }
      } else {
        console.error(`Failed to save ${key} to localStorage`, e);
      }
    }
  };

  // Sync current script to local storage - Re-enabled with stripping
  useEffect(() => {
    if (currentScript) {
      safeSetItem('current_adscript', currentScript, true);
    }
  }, [currentScript]);

  // Sync history to local storage
  useEffect(() => {
    safeSetItem('adscript_history', history.slice(0, 5), true);
  }, [history]);

  // Sync templates to local storage
  useEffect(() => {
    safeSetItem('adscript_templates', savedTemplates, true);
  }, [savedTemplates]);

  // Sync visual templates to local storage
  useEffect(() => {
    safeSetItem('visual_templates', visualTemplates, false); // Don't strip by default, let safeSetItem handle it if it fails
  }, [visualTemplates]);

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
    try {
      // Ensure orientation is set
      let finalProduct = { ...product };
      if (!finalProduct.scriptOrientation || !finalProduct.scriptOrientation.style) {
        const inferred = await inferScriptOrientation(product, language);
        finalProduct.scriptOrientation = {
          ...finalProduct.scriptOrientation,
          style: inferred.style,
          dialogueType: inferred.dialogueType as any,
          targetAudience: inferred.targetAudience,
          keyMessage: inferred.keyMessage,
          toneOfVoice: inferred.toneOfVoice
        };
        setProductDraft(finalProduct);
      }

      // 1. Generate Script
      const { segments, seamlessScript, productAnalysis } = await generateAdScript(finalProduct, language, brandVoice);
      
      // 2. Generate Character Profile for consistency
      const characterProfile = await generateCharacterProfile(product);
      
      const allImages = [
        ...(product.referenceImages || []),
        ...(product.imageCategories || []).flatMap(c => c.images)
      ];

      // 3. Generate Image Prompts for each segment
      const imagePrompts = await generateImagePrompts(segments, characterProfile, product.name, allImages);
      
      // 3.5 Generate Video Prompts
      const videoPrompts = await generateVideoPrompts(segments, characterProfile, product.name, allImages);
      
      const segmentsWithPrompts = segments.map((s, i) => ({
        ...s,
        imagePrompt: imagePrompts[i] || "",
        videoPrompt: videoPrompts[i] || ""
      }));

      const newScript: AdScript = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        language,
        segments: segmentsWithPrompts,
        seamlessScript,
        productAnalysis,
        productInfo: product,
        characterProfile,
      };
      
      setCurrentScript(newScript);
      setHistory((prev) => [newScript, ...prev].slice(0, 5));
      setActiveTab('results'); // Switch to results tab to review prompts

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

  const handleUpdateProductInfo = (updates: Partial<ProductInfo>) => {
    setCurrentScript(prev => {
      if (!prev) return null;
      return {
        ...prev,
        productInfo: { ...prev.productInfo, ...updates }
      };
    });
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

  const handleSaveVisualTemplate = (name: string) => {
    if (!name) {
      alert("Vui lòng nhập tên mẫu trước khi lưu.");
      return;
    }
    const characterEnvCategories = productDraft.imageCategories?.filter(c => 
      ['character', 'costume', 'background', 'accessories'].includes(c.id)
    ) || [];

    if (characterEnvCategories.length === 0 || characterEnvCategories.every(c => c.images.length === 0)) {
      alert("Vui lòng upload ít nhất một ảnh nhân vật hoặc bối cảnh trước khi lưu mẫu.");
      return;
    }

    const newTemplate: VisualTemplate = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      timestamp: Date.now(),
      categories: characterEnvCategories.map(c => ({
        ...c,
        images: c.images.slice(0, 3) // Limit to 3 images per category to save space
      }))
    };
    setVisualTemplates(prev => [newTemplate, ...prev]);
    alert(t('templateSaved'));
  };

  const handleDeleteVisualTemplate = (id: string) => {
    if (confirm(t('confirmDelete'))) {
      setVisualTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleUseVisualTemplate = (template: VisualTemplate) => {
    setProductDraft(prev => {
      const otherCategories = prev.imageCategories?.filter(c => 
        !['character', 'costume', 'background', 'accessories'].includes(c.id)
      ) || [];
      return {
        ...prev,
        selectedTemplateId: template.id,
        imageCategories: [...otherCategories, ...template.categories]
      };
    });
    alert(t('useTemplate') + ": " + template.name);
  };

  const handleLoadTemplate = (template: SavedTemplate) => {
    setProductDraft({ ...template.data });
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
          {/* Workflow Stepper */}
          <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-zinc-100 dark:bg-zinc-800 -z-10" />
                <div 
                  className="absolute top-5 left-0 h-0.5 bg-indigo-600 transition-all duration-500 -z-10" 
                  style={{ 
                    width: `${(['form', 'characterEnv', 'productImages', 'orientation', 'results', 'videoGen'].indexOf(activeTab) / 5) * 100}%` 
                  }} 
                />

                {[
                  { id: 'form', icon: Info, label: t('productInfo') },
                  { id: 'characterEnv', icon: Sparkles, label: t('characterAndEnv') },
                  { id: 'productImages', icon: ImageIcon, label: t('productImages') },
                  { id: 'orientation', icon: Sparkles, label: t('scriptOrientation') },
                  { id: 'results', icon: List, label: t('scriptAndImages'), disabled: !currentScript },
                  { id: 'videoGen', icon: PlayCircle, label: t('createVideo'), disabled: !currentScript }
                ].map((step, index) => {
                  const Icon = step.icon;
                  const isActive = activeTab === step.id;
                  const isCompleted = ['form', 'characterEnv', 'productImages', 'orientation', 'results', 'videoGen'].indexOf(activeTab) > index;
                  const isDisabled = step.disabled;

                  return (
                    <button
                      key={step.id}
                      disabled={isDisabled}
                      onClick={() => setActiveTab(step.id as any)}
                      className={`flex flex-col items-center gap-2 group transition-all ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-110' 
                          : isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 group-hover:border-indigo-300'
                      }`}>
                        {isCompleted ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        ) : (
                          <span className="text-sm font-black">{index + 1}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        isActive ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-zinc-400'
                      }`}>
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation & Utility Bar */}
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {activeTab !== 'form' && activeTab !== 'templates' && (
                <button
                  onClick={() => {
                    const steps: any[] = ['form', 'characterEnv', 'productImages', 'orientation', 'results', 'videoGen'];
                    const currentIndex = steps.indexOf(activeTab);
                    if (currentIndex > 0) setActiveTab(steps[currentIndex - 1]);
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-indigo-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {language === 'vi' ? 'Quay lại' : 'Back'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('templates')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'templates'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                {t('savedTemplates')}
              </button>
            </div>
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
                        onSubmit={async (data) => {
                          setIsLoading(true);
                          try {
                            const inferred = await inferScriptOrientation(data, language);
                            setProductDraft(prev => ({
                              ...prev,
                              ...data,
                              scriptOrientation: {
                                ...prev.scriptOrientation,
                                style: inferred.style,
                                dialogueType: inferred.dialogueType as any,
                                targetAudience: inferred.targetAudience,
                                keyMessage: inferred.keyMessage,
                                toneOfVoice: inferred.toneOfVoice
                              }
                            }));
                            setActiveTab('characterEnv');
                          } catch (error) {
                            console.error("Failed to infer orientation", error);
                            setActiveTab('characterEnv');
                          } finally {
                            setIsLoading(false);
                          }
                        }} 
                        onSaveTemplate={(data) => {
                          const newTemplate: SavedTemplate = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: data.name,
                            timestamp: Date.now(),
                            data: { ...data }
                          };
                          setSavedTemplates(prev => [newTemplate, ...prev]);
                          alert(t('templateSaved'));
                        }}
                        isLoading={isLoading} 
                        initialValue={productDraft}
                        onChange={(updates) => setProductDraft(prev => ({ ...prev, ...updates }))}
                        language={language}
                        currentScript={currentScript}
                      />
                    </div>
                  ) : activeTab === 'characterEnv' ? (
                    <div className="max-w-4xl mx-auto">
                      <CharacterEnvTab
                        product={productDraft}
                        onUpdate={(updates) => setProductDraft(prev => ({ ...prev, ...updates }))}
                        onSaveTemplate={handleSaveVisualTemplate}
                        onNext={() => setActiveTab('productImages')}
                        language={language}
                      />
                    </div>
                  ) : activeTab === 'productImages' ? (
                    <div className="max-w-4xl mx-auto">
                      <ProductAssetsTab
                        product={productDraft}
                        visualTemplates={visualTemplates}
                        onUpdate={(updates) => setProductDraft(prev => ({ ...prev, ...updates }))}
                        onDeleteTemplate={handleDeleteVisualTemplate}
                        onUseTemplate={handleUseVisualTemplate}
                        onNext={() => setActiveTab('orientation')}
                        isLoading={isLoading}
                        language={language}
                      />
                    </div>
                  ) : activeTab === 'orientation' ? (
                    <div className="max-w-4xl mx-auto">
                      <ScriptOrientationTab
                        product={productDraft}
                        onUpdate={(updates) => setProductDraft(prev => ({ ...prev, ...updates }))}
                        onGenerate={() => handleGenerate(productDraft)}
                        onNext={() => setActiveTab('results')}
                        isLoading={isLoading}
                        language={language}
                      />
                    </div>
                  ) : activeTab === 'results' ? (
                    <ApiKeyGuard language={language}>
                      <div className="max-w-6xl mx-auto">
                        <ProductImageTab 
                          script={currentScript} 
                          onUpdateSegment={handleUpdateSegment} 
                          onUpdateProductInfo={handleUpdateProductInfo}
                          onGenerateAnother={handleRegenerate}
                          onNext={() => setActiveTab('videoGen')}
                          onOpenApiKeySettings={() => setShowApiKeyModal(true)}
                          language={language}
                          isGenerating={isLoading}
                        />
                      </div>
                    </ApiKeyGuard>
                  ) : activeTab === 'videoGen' ? (
                    <ApiKeyGuard language={language}>
                      <div className="max-w-6xl mx-auto">
                        <VideoGenerationTab
                          script={currentScript}
                          onUpdateSegments={handleUpdateSegments}
                          onOpenApiKeySettings={() => setShowApiKeyModal(true)}
                          language={language}
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
