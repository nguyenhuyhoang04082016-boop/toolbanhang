import React, { useState } from 'react';
import { AdScript, AdSegment, Language, ProductInfo } from '../types';
import { Image as ImageIcon, Sparkles, Loader2, RefreshCw, Download, Send, Upload, X as XIcon, CheckCircle2, List, Settings, PlayCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateImage, refineImagePrompt, generateVideo } from '../services/geminiService';
import { useTranslation } from '../i18n';

interface ProductImageTabProps {
  script: AdScript | null;
  onUpdateSegment: (segmentId: string, updates: Partial<AdSegment>) => void;
  onUpdateProductInfo: (updates: Partial<ProductInfo>) => void;
  onGenerateAnother: () => void;
  onNext: () => void;
  onOpenApiKeySettings?: () => void;
  language: Language;
  isGenerating?: boolean;
}

export const ProductImageTab: React.FC<ProductImageTabProps> = ({ 
  script, 
  onUpdateSegment, 
  onUpdateProductInfo,
  onGenerateAnother,
  onNext,
  onOpenApiKeySettings,
  language,
  isGenerating = false
}) => {
  const { t } = useTranslation(language);
  const [viPrompts, setViPrompts] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-3xl flex items-center justify-center animate-pulse">
            <ImageIcon className="w-10 h-10 text-zinc-300" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('noContentYet')}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t('pleaseCreateScript')}
          </p>
        </div>
      </div>
    );
  }

  // Set initial selected segment if not set
  if (!selectedSegmentId && script.segments.length > 0) {
    setSelectedSegmentId(script.segments[0].id);
  }

  const selectedSegment = script.segments.find(s => s.id === selectedSegmentId);

  const handleRefinePrompt = async (segmentId: string) => {
    const instruction = viPrompts[segmentId];
    const segment = script?.segments.find(s => s.id === segmentId);
    if (!instruction || !segment) return;

    setIsTranslating(prev => ({ ...prev, [segmentId]: true }));
    try {
      const refinedPrompt = await refineImagePrompt(
        segment.imagePrompt || '', 
        instruction,
        script?.characterProfile || ""
      );
      onUpdateSegment(segmentId, { imagePrompt: refinedPrompt });
      setViPrompts(prev => ({ ...prev, [segmentId]: '' }));
    } catch (error) {
      console.error("Refinement error:", error);
    } finally {
      setIsTranslating(prev => ({ ...prev, [segmentId]: false }));
    }
  };

  const handleGenerateImages = async (segment: AdSegment) => {
    if (!segment.imagePrompt || !script) return;
    
    onUpdateSegment(segment.id, { 
      isGeneratingStart: true, 
      isGeneratingEnd: true 
    });

    try {
      const ratio = script?.productInfo?.ratio || '9:16';
      
      // Collect all reference images
      const referenceImages = [
        ...(script?.productInfo?.referenceImages || []),
        ...(script?.productInfo?.imageCategories || []).flatMap(c => c.images)
      ];
      
      // Limit to 10 images to avoid token limits or performance issues
      const limitedRefs = referenceImages.slice(0, 10);
      
      const [startUrl, endUrl] = await Promise.all([
        generateImage(segment.imagePrompt + ", start of the scene, high quality", ratio, limitedRefs),
        generateImage(segment.imagePrompt + ", end of the scene, high quality", ratio, limitedRefs)
      ]);

      onUpdateSegment(segment.id, { 
        startImageUrl: startUrl,
        endImageUrl: endUrl,
        isGeneratingStart: false,
        isGeneratingEnd: false 
      });
    } catch (error: any) {
      console.error("Error generating images:", error);
      const msg = error?.message || "";
      if (msg.includes("Tài khoản Gemini Miễn phí") || msg.includes("Paid") || msg.includes("permission")) {
        if (confirm(msg + (language === 'vi' ? "\n\nBạn có muốn mở phần Cài đặt để chọn API Key khác không?" : "\n\nWould you like to open Settings to select a different API Key?"))) {
          onOpenApiKeySettings?.();
        }
      } else {
        alert(language === 'vi' ? "Không thể tạo ảnh. Vui lòng thử lại." : "Could not generate images. Please try again.");
      }
      onUpdateSegment(segment.id, { 
        isGeneratingStart: false, 
        isGeneratingEnd: false 
      });
    }
  };

  const handleImageUpload = (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const currentCategories = script.productInfo.imageCategories || [];
        const categoryIndex = currentCategories.findIndex(c => c.id === category);
        
        let updatedCategories;
        if (categoryIndex >= 0) {
          updatedCategories = [...currentCategories];
          updatedCategories[categoryIndex] = {
            ...updatedCategories[categoryIndex],
            images: [...updatedCategories[categoryIndex].images, base64]
          };
        } else {
          updatedCategories = [
            ...currentCategories,
            { id: category, name: category, images: [base64] }
          ];
        }
        
        onUpdateProductInfo({ imageCategories: updatedCategories });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (categoryId: string, imageIndex: number) => {
    const currentCategories = script.productInfo.imageCategories || [];
    const updatedCategories = currentCategories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          images: c.images.filter((_, i) => i !== imageIndex)
        };
      }
      return c;
    });
    onUpdateProductInfo({ imageCategories: updatedCategories });
  };

  const getCategoryImages = (categoryId: string) => {
    return script.productInfo.imageCategories?.find(c => c.id === categoryId)?.images || [];
  };

  const categories = [
    { id: 'character', label: t('characterImage'), icon: <Sparkles className="w-4 h-4" /> },
    { id: 'costume', label: t('costumeImage'), icon: <Settings className="w-4 h-4" /> },
    { id: 'background', label: t('backgroundImage'), icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'accessories', label: t('accessoryImage'), icon: <List className="w-4 h-4" /> },
    { id: 'product', label: t('productReferenceImage'), icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'usage', label: t('productUsageImage'), icon: <PlayCircle className="w-4 h-4" /> }
  ];

  const characterEnvCategories = categories.filter(c => ['character', 'costume', 'background', 'accessories'].includes(c.id));
  const productCategories = categories.filter(c => ['product', 'usage'].includes(c.id));

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Product Analysis Section */}
      {script.productAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">{t('featuresAndSpecs')}</h4>
            </div>
            <ul className="space-y-2">
              {(script.productAnalysis?.features || []).concat(script.productAnalysis?.specs || []).slice(0, 4).map((item: string, i: number) => (
                <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <PlayCircle className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">{t('usageInstructions')}</h4>
            </div>
            <ul className="space-y-2">
              {(script.productAnalysis?.usage || []).slice(0, 4).map((item: string, i: number) => (
                <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i+1}</div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">{t('keyBenefits')}</h4>
            </div>
            <ul className="space-y-2">
              {(script.productAnalysis?.benefits || []).slice(0, 4).map((item: string, i: number) => (
                <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none flex flex-col justify-between text-white">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-80">{t('ratio')}</h4>
                <div className="text-2xl font-black">{script.productInfo?.ratio || '9:16'}</div>
              </div>
              <div className="space-y-2 text-right">
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-80">{t('totalLength')}</h4>
                <div className="text-2xl font-black">{script.productInfo?.totalLength || 6}s</div>
              </div>
            </div>
            <button
              onClick={onGenerateAnother}
              disabled={isGenerating}
              className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t('createAnotherScript')}
            </button>
          </div>
        </div>
      )}

      {/* Image Categories Upload Section */}
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] px-2">{t('characterImage')} & {t('backgroundImage')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {characterEnvCategories.map(cat => (
              <div key={cat.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    {cat.icon}
                    <h4 className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</h4>
                  </div>
                  <label className="cursor-pointer p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                    <Upload className="w-3 h-3 text-zinc-600 dark:text-zinc-300" />
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(cat.id, e)}
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-3 gap-2 min-h-[60px]">
                  {getCategoryImages(cat.id).map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 group">
                      <img src={img} alt={cat.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => removeImage(cat.id, idx)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                  {getCategoryImages(cat.id).length === 0 && (
                    <div className="col-span-3 flex items-center justify-center h-full border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-lg">
                      <ImageIcon className="w-4 h-4 text-zinc-200 dark:text-zinc-800" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] px-2">{t('productImages')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {productCategories.map(cat => (
              <div key={cat.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    {cat.icon}
                    <h4 className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</h4>
                  </div>
                  <label className="cursor-pointer p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                    <Upload className="w-3 h-3 text-zinc-600 dark:text-zinc-300" />
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*"
                      onChange={(e) => handleImageUpload(cat.id, e)}
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-4 gap-2 min-h-[60px]">
                  {getCategoryImages(cat.id).map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 group">
                      <img src={img} alt={cat.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => removeImage(cat.id, idx)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                  {getCategoryImages(cat.id).length === 0 && (
                    <div className="col-span-4 flex items-center justify-center h-full border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-lg">
                      <ImageIcon className="w-4 h-4 text-zinc-200 dark:text-zinc-800" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Segment Selection Icons */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em] px-2">{t('segments')}</h3>
        <div className="flex flex-wrap gap-4 px-2">
          {script.segments.map((segment) => (
            <button
              key={segment.id}
              onClick={() => setSelectedSegmentId(segment.id)}
              className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
                selectedSegmentId === segment.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-110 z-10'
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-indigo-300'
              }`}
            >
              <span className="text-xs font-black">{segment.index}</span>
              <div className="mt-1 flex gap-0.5">
                {segment.startImageUrl && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                {segment.endImageUrl && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
              </div>
              {selectedSegmentId === segment.id && (
                <motion.div
                  layoutId="activeSegment"
                  className="absolute -bottom-2 w-1.5 h-1.5 bg-indigo-600 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Segment Detail View */}
      <AnimatePresence mode="wait">
        {selectedSegment && (
          <motion.div
            key={selectedSegment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xl"
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                    <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-black">
                      {selectedSegment.index}
                    </span>
                    {t('segment')} {selectedSegment.index}
                  </h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedSegment.startTime}s - {selectedSegment.endTime}s
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleGenerateImages(selectedSegment)}
                    disabled={selectedSegment.isGeneratingStart || selectedSegment.isGeneratingEnd}
                    className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      (selectedSegment.startImageUrl && selectedSegment.endImageUrl)
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                    } disabled:opacity-50`}
                  >
                    {selectedSegment.isGeneratingStart || selectedSegment.isGeneratingEnd ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (selectedSegment.startImageUrl && selectedSegment.endImageUrl) ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {selectedSegment.isGeneratingStart || selectedSegment.isGeneratingEnd 
                      ? t('generating') 
                      : (selectedSegment.startImageUrl && selectedSegment.endImageUrl) 
                        ? t('regenerateImages') 
                        : t('generateImages')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <List className="w-3 h-3" />
                      {t('visualDirection')}
                    </label>
                    <textarea
                      value={selectedSegment.visualDirection}
                      onChange={(e) => onUpdateSegment(selectedSegment.id, { visualDirection: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-40 resize-none transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      {t('geminiPrompt')}
                    </label>
                    <div className="space-y-4">
                      <div className="relative group">
                        <textarea
                          value={viPrompts[selectedSegment.id] || ''}
                          onChange={(e) => setViPrompts(prev => ({ ...prev, [selectedSegment.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleRefinePrompt(selectedSegment.id))}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 pr-14 text-sm font-medium text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none shadow-sm"
                          placeholder={language === 'vi' ? "Chỉnh sửa bằng Tiếng Việt..." : "Refine with Vietnamese..."}
                        />
                        <button
                          onClick={() => handleRefinePrompt(selectedSegment.id)}
                          disabled={isTranslating[selectedSegment.id] || !viPrompts[selectedSegment.id]}
                          className="absolute bottom-4 right-4 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-all shadow-md"
                        >
                          {isTranslating[selectedSegment.id] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </div>
                      <textarea
                        value={selectedSegment.imagePrompt || ''}
                        onChange={(e) => onUpdateSegment(selectedSegment.id, { imagePrompt: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-500 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                        placeholder="English image prompt..."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center block">
                      {t('startImage')}
                    </label>
                    <div className="aspect-[9/16] w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-inner">
                      {selectedSegment.startImageUrl ? (
                        <>
                          <img src={selectedSegment.startImageUrl} alt="Start" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = selectedSegment.startImageUrl!;
                                a.download = `segment-${selectedSegment.index}-start.png`;
                                a.click();
                              }}
                              className="p-3 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white hover:bg-white/30 transition-all"
                            >
                              <Download className="w-6 h-6" />
                            </button>
                          </div>
                        </>
                      ) : selectedSegment.isGeneratingStart ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                          <span className="text-[10px] font-bold text-indigo-500 animate-pulse">{t('generating')}</span>
                        </div>
                      ) : (
                        <ImageIcon className="w-10 h-10 text-zinc-300" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center block">
                      {t('endImage')}
                    </label>
                    <div className="aspect-[9/16] w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-inner">
                      {selectedSegment.endImageUrl ? (
                        <>
                          <img src={selectedSegment.endImageUrl} alt="End" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = selectedSegment.endImageUrl!;
                                a.download = `segment-${selectedSegment.index}-end.png`;
                                a.click();
                              }}
                              className="p-3 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white hover:bg-white/30 transition-all"
                            >
                              <Download className="w-6 h-6" />
                            </button>
                          </div>
                        </>
                      ) : selectedSegment.isGeneratingEnd ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                          <span className="text-[10px] font-bold text-indigo-500 animate-pulse">{t('generating')}</span>
                        </div>
                      ) : (
                        <ImageIcon className="w-10 h-10 text-zinc-300" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex justify-center z-50">
        <button
          onClick={onNext}
          className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95"
        >
          {t('next') || 'Tiếp theo'}
          <PlayCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
