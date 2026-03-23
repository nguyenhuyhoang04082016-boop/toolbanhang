import React, { useState } from 'react';
import { AdScript, AdSegment, Language, ProductInfo } from '../types';
import { Image as ImageIcon, Sparkles, Loader2, RefreshCw, Download, Send, Upload, X as XIcon, CheckCircle2, List, Settings, PlayCircle, Info } from 'lucide-react';
import { generateImage, refineImagePrompt } from '../services/geminiService';
import { useTranslation } from '../i18n';

interface ProductImageTabProps {
  script: AdScript | null;
  onUpdateSegment: (segmentId: string, updates: Partial<AdSegment>) => void;
  onUpdateProductInfo: (updates: Partial<ProductInfo>) => void;
  onGenerateAnother: () => void;
  language: Language;
  isGenerating?: boolean;
}

export const ProductImageTab: React.FC<ProductImageTabProps> = ({ 
  script, 
  onUpdateSegment, 
  onUpdateProductInfo,
  onGenerateAnother,
  language,
  isGenerating = false
}) => {
  const { t } = useTranslation(language);
  const [viPrompts, setViPrompts] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});

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
    } catch (error) {
      console.error("Error generating images:", error);
      alert(language === 'vi' ? "Không thể tạo ảnh. Vui lòng thử lại." : "Could not generate images. Please try again.");
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

      {/* Segments Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-12">#</th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-40">{t('segment')}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-80">{t('visualDirection')}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-80">{t('geminiPrompt')}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-40 text-center">{t('startImage')}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-40 text-center">{t('endImage')}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-80">{t('veo3Prompt')}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-40 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {(script.segments || []).map((segment) => (
                <tr key={segment.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors align-top">
                  <td className="py-8 px-6 text-sm font-medium text-zinc-400">{segment.index}</td>
                  <td className="py-8 px-6">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white block">{t('segment')} {segment.index}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {segment.startTime}s - {segment.endTime}s
                      </span>
                    </div>
                  </td>
                  <td className="py-8 px-6">
                    <textarea
                      value={segment.visualDirection}
                      onChange={(e) => onUpdateSegment(segment.id, { visualDirection: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none transition-all"
                    />
                  </td>
                  <td className="py-8 px-6 space-y-4">
                    <div className="relative group">
                      <textarea
                        value={viPrompts[segment.id] || ''}
                        onChange={(e) => setViPrompts(prev => ({ ...prev, [segment.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleRefinePrompt(segment.id))}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pr-12 text-xs font-medium text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none shadow-sm"
                        placeholder={language === 'vi' ? "Chỉnh sửa bằng Tiếng Việt..." : "Refine with Vietnamese..."}
                      />
                      <button
                        onClick={() => handleRefinePrompt(segment.id)}
                        disabled={isTranslating[segment.id] || !viPrompts[segment.id]}
                        className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-all shadow-md"
                      >
                        {isTranslating[segment.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    <textarea
                      value={segment.imagePrompt || ''}
                      onChange={(e) => onUpdateSegment(segment.id, { imagePrompt: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-zinc-500 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                      placeholder="English image prompt..."
                    />
                  </td>
                  <td className="py-8 px-6">
                    <div className="aspect-[9/16] w-24 mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-sm">
                      {segment.startImageUrl ? (
                        <>
                          <img src={segment.startImageUrl} alt="Start" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => {
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
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-zinc-300" />
                      )}
                    </div>
                  </td>
                  <td className="py-8 px-6">
                    <div className="aspect-[9/16] w-24 mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-sm">
                      {segment.endImageUrl ? (
                        <>
                          <img src={segment.endImageUrl} alt="End" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => {
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
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-zinc-300" />
                      )}
                    </div>
                  </td>
                  <td className="py-8 px-6">
                    <textarea
                      value={segment.videoPrompt || ''}
                      onChange={(e) => onUpdateSegment(segment.id, { videoPrompt: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-44 resize-none shadow-sm"
                      placeholder="Veo 3 detailed prompt..."
                    />
                  </td>
                  <td className="py-8 px-6">
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onClick={() => handleGenerateImages(segment)}
                        disabled={segment.isGeneratingStart || segment.isGeneratingEnd}
                        className={`w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
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
                        {segment.isGeneratingStart || segment.isGeneratingEnd ? t('generating') : (segment.startImageUrl && segment.endImageUrl) ? t('regenerateImages') : t('generateImages')}
                      </button>
                      {(segment.startImageUrl && segment.endImageUrl) && (
                        <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('imagesReady')}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
