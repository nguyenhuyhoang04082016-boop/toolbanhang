import React, { useState } from 'react';
import { AdScript, AdSegment, Language, ProductInfo, ReviewResult } from '../types';
import { Image as ImageIcon, Sparkles, Loader2, RefreshCw, Download, Send, Upload, X as XIcon, CheckCircle2, List, Settings, PlayCircle, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateImage, refineImagePrompt, generateVideo } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { AiAssistantReview } from './AiAssistantReview';

interface ProductImageTabProps {
  script: AdScript | null;
  onUpdateSegment: (segmentId: string, updates: Partial<AdSegment>) => void;
  onUpdateProductInfo: (updates: Partial<ProductInfo>) => void;
  onGenerateAnother: () => void;
  onNext: () => void;
  onOpenApiKeySettings?: () => void;
  language: Language;
  isGenerating?: boolean;
  imageReview: ReviewResult | null;
  isReviewingImages: boolean;
  onReviewImages: () => void;
}

export const ProductImageTab: React.FC<ProductImageTabProps> = ({ 
  script, 
  onUpdateSegment, 
  onUpdateProductInfo,
  onGenerateAnother,
  onNext,
  onOpenApiKeySettings,
  language,
  isGenerating = false,
  imageReview,
  isReviewingImages,
  onReviewImages
}) => {
  const { t } = useTranslation(language);
  const [viPrompts, setViPrompts] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

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

  const handleGenerateStartImage = async (segment: AdSegment) => {
    if (!segment.imagePrompt || !script) return;
    
    try {
      const ratio = script?.productInfo?.ratio || '9:16';
      const referenceImages = [
        ...(script?.productInfo?.referenceImages || []),
        ...(script?.productInfo?.imageCategories || []).flatMap(c => c.images)
      ];
      const limitedRefs = referenceImages.slice(0, 5);
      
      onUpdateSegment(segment.id, { isGeneratingStart: true });
      const startUrl = await generateImage(segment.imagePrompt + ", start of the scene, high quality", ratio, limitedRefs);
      onUpdateSegment(segment.id, { 
        startImageUrl: startUrl,
        isGeneratingStart: false 
      });
    } catch (error: any) {
      console.error("Error generating start image:", error);
      const msg = error?.message || "";
      if (msg.includes("403") || msg.includes("Project/API key") || msg.includes("permission") || msg.includes("billing")) {
        if (confirm(msg + (language === 'vi' ? "\n\nBạn có muốn mở phần Cài đặt để chọn API Key khác không?" : "\n\nWould you like to open Settings to select a different API Key?"))) {
          onOpenApiKeySettings?.();
        }
      } else if (msg.includes("429") || msg.includes("quota")) {
        alert(msg);
      } else {
        alert(msg || (language === 'vi' ? "Không thể tạo ảnh. Vui lòng thử lại." : "Could not generate images. Please try again."));
      }
      onUpdateSegment(segment.id, { isGeneratingStart: false });
    }
  };

  const handleGenerateEndImage = async (segment: AdSegment) => {
    if (!segment.imagePrompt || !script) return;
    
    try {
      const ratio = script?.productInfo?.ratio || '9:16';
      const referenceImages = [
        ...(script?.productInfo?.referenceImages || []),
        ...(script?.productInfo?.imageCategories || []).flatMap(c => c.images)
      ];
      const limitedRefs = referenceImages.slice(0, 5);
      
      onUpdateSegment(segment.id, { isGeneratingEnd: true });
      const endUrl = await generateImage(
        segment.imagePrompt + ", end of the scene, high quality", 
        ratio, 
        limitedRefs,
        segment.startImageUrl || undefined
      );
      onUpdateSegment(segment.id, { 
        endImageUrl: endUrl,
        isGeneratingEnd: false 
      });
    } catch (error: any) {
      console.error("Error generating end image:", error);
      const msg = error?.message || "";
      if (msg.includes("403") || msg.includes("Project/API key") || msg.includes("permission") || msg.includes("billing")) {
        if (confirm(msg + (language === 'vi' ? "\n\nBạn có muốn mở phần Cài đặt để chọn API Key khác không?" : "\n\nWould you like to open Settings to select a different API Key?"))) {
          onOpenApiKeySettings?.();
        }
      } else if (msg.includes("429") || msg.includes("quota")) {
        alert(msg);
      } else {
        alert(msg || (language === 'vi' ? "Không thể tạo ảnh. Vui lòng thử lại." : "Could not generate images. Please try again."));
      }
      onUpdateSegment(segment.id, { isGeneratingEnd: false });
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
      {/* AI Assistant Review Section */}
      <AiAssistantReview 
        review={imageReview} 
        isReviewing={isReviewingImages} 
        language={language}
        type="image"
      />

      {!imageReview && !isReviewingImages && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={onReviewImages}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <ShieldCheck className="w-5 h-5" />
            {language === 'vi' ? 'Trợ lý AI: Kiểm tra Hình ảnh' : 'AI Assistant: Review Images'}
          </button>
        </div>
      )}

      {/* Product Analysis Section - Hidden as requested */}
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
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">{t('segments')}</h3>
        </div>
        <div className="flex flex-wrap gap-4 px-2">
          {script.segments.map((segment) => (
            <button
              key={segment.id}
              onClick={() => {
                setSelectedSegmentId(segment.id);
                const element = document.getElementById(`segment-${segment.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
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

      {/* All Segments List View */}
      <div className="space-y-12">
        {script.segments.map((segment) => (
          <motion.div
            key={segment.id}
            id={`segment-${segment.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className={`bg-white dark:bg-zinc-950 rounded-3xl border transition-all duration-500 ${
              selectedSegmentId === segment.id 
                ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10 scale-[1.02] z-10' 
                : 'border-zinc-200 dark:border-zinc-800 shadow-xl'
            } overflow-hidden`}
            onClick={() => setSelectedSegmentId(segment.id)}
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black transition-colors ${
                      selectedSegmentId === segment.id ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
                    }`}>
                      {segment.index}
                    </span>
                    {t('segment')} {segment.index}
                  </h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {segment.startTime}s - {segment.endTime}s
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateStartImage(segment);
                      handleGenerateEndImage(segment);
                    }}
                    disabled={segment.isGeneratingStart || segment.isGeneratingEnd}
                    className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      (segment.startImageUrl && segment.endImageUrl)
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                    } disabled:opacity-50`}
                  >
                    {segment.isGeneratingStart || segment.isGeneratingEnd ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (segment.startImageUrl && segment.endImageUrl) ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {segment.isGeneratingStart || segment.isGeneratingEnd 
                      ? t('generating') 
                      : (segment.startImageUrl && segment.endImageUrl) 
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
                      value={segment.visualDirection}
                      onChange={(e) => onUpdateSegment(segment.id, { visualDirection: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
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
                          value={viPrompts[segment.id] || ''}
                          onChange={(e) => setViPrompts(prev => ({ ...prev, [segment.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleRefinePrompt(segment.id))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 pr-14 text-sm font-medium text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none shadow-sm"
                          placeholder={language === 'vi' ? "Chỉnh sửa bằng Tiếng Việt..." : "Refine with Vietnamese..."}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefinePrompt(segment.id);
                          }}
                          disabled={isTranslating[segment.id] || !viPrompts[segment.id]}
                          className="absolute bottom-4 right-4 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-all shadow-md"
                        >
                          {isTranslating[segment.id] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </div>
                      <textarea
                        value={segment.imagePrompt || ''}
                        onChange={(e) => onUpdateSegment(segment.id, { imagePrompt: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-500 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                        placeholder="English image prompt..."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center block">
                      {t('startImage')}
                    </label>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!segment.startImageUrl && !segment.isGeneratingStart) {
                          handleGenerateStartImage(segment);
                        }
                      }}
                      className="aspect-[9/16] w-full max-w-[160px] mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-inner cursor-pointer"
                    >
                      {segment.startImageUrl ? (
                        <>
                          <img src={segment.startImageUrl} alt="Start" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const a = document.createElement('a');
                                a.href = segment.startImageUrl!;
                                a.download = `segment-${segment.index}-start.png`;
                                a.click();
                              }}
                              className="p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white hover:bg-white/30 transition-all"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : segment.isGeneratingStart ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                          <span className="text-[8px] font-bold text-indigo-500 animate-pulse">{t('generating')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <ImageIcon className="w-6 h-6 text-zinc-300" />
                          <span className="text-[8px] text-zinc-400 font-bold uppercase">{t('generate')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center block">
                      {t('endImage')}
                    </label>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!segment.endImageUrl && !segment.isGeneratingEnd) {
                          handleGenerateEndImage(segment);
                        }
                      }}
                      className="aspect-[9/16] w-full max-w-[160px] mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-inner cursor-pointer"
                    >
                      {segment.endImageUrl ? (
                        <>
                          <img src={segment.endImageUrl} alt="End" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const a = document.createElement('a');
                                a.href = segment.endImageUrl!;
                                a.download = `segment-${segment.index}-end.png`;
                                a.click();
                              }}
                              className="p-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white hover:bg-white/30 transition-all"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : segment.isGeneratingEnd ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                          <span className="text-[8px] font-bold text-indigo-500 animate-pulse">{t('generating')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <ImageIcon className="w-6 h-6 text-zinc-300" />
                          <span className="text-[8px] text-zinc-400 font-bold uppercase">{t('generate')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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
