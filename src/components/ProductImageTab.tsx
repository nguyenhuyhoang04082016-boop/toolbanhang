import React, { useState } from 'react';
import { AdScript, AdSegment, Language } from '../types';
import { Image as ImageIcon, Sparkles, Loader2, RefreshCw, Download, Languages, Send, Upload, X as XIcon } from 'lucide-react';
import { generateImage, refineImagePrompt } from '../services/geminiService';
import { useTranslation } from '../i18n';

interface ProductImageTabProps {
  script: AdScript | null;
  onUpdateSegment: (segmentId: string, updates: Partial<AdSegment>) => void;
  onGenerateAnother: () => void;
  language: Language;
  isGenerating?: boolean;
}

export const ProductImageTab: React.FC<ProductImageTabProps> = ({ 
  script, 
  onUpdateSegment, 
  onGenerateAnother,
  language,
  isGenerating = false
}) => {
  const { t } = useTranslation(language);
  const [viPrompts, setViPrompts] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

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
      // Clear the instruction after successful refinement
      setViPrompts(prev => ({ ...prev, [segmentId]: '' }));
    } catch (error) {
      console.error("Refinement error:", error);
    } finally {
      setIsTranslating(prev => ({ ...prev, [segmentId]: false }));
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: string[] = [];
      const fileList = Array.from(files) as File[];
      
      let processed = 0;
      fileList.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          processed++;
          if (processed === fileList.length) {
            setReferenceImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateImages = async (segment: AdSegment) => {
    if (!segment.imagePrompt || !script) return;
    
    onUpdateSegment(segment.id, { 
      isGeneratingStart: true, 
      isGeneratingEnd: true 
    });

    try {
      // Generate both images
      const [startUrl, endUrl] = await Promise.all([
        generateImage(segment.imagePrompt + ", start of the scene, high quality", script.productInfo.ratio, referenceImages.length > 0 ? referenceImages : undefined),
        generateImage(segment.imagePrompt + ", end of the scene, high quality", script.productInfo.ratio, referenceImages.length > 0 ? referenceImages : undefined)
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

  return (
    <div className="p-4 overflow-x-auto space-y-6">
      {/* Reference Image Upload Section */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              {t('productReferenceImage')}
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {t('uploadReferenceDesc')} (Max 5)
            </p>
          </div>
          
          <div className="w-full md:w-2/3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                  <img src={img} alt={`Reference ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => removeReferenceImage(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {referenceImages.length < 5 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                  <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-zinc-400" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500">{language === 'vi' ? 'Thêm ảnh' : 'Add Image'}</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleReferenceUpload} />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Script Display Section */}
      <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {t('seamlessVoiceoverScript')}
          </h3>
          <button
            onClick={onGenerateAnother}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {t('createAnotherScript')}
          </button>
        </div>
        <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap italic">
          "{script.seamlessScript}"
        </div>
      </div>

      <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t('editImagePrompt')}
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
              {t('editImagePromptDesc')}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{t('ratio')}</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{script.productInfo.ratio}</span>
          </div>
        </div>
      </div>

      <table className="w-full text-left border-collapse min-w-[1200px]">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-12">#</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32">{t('segment')}</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-64">{t('content')}</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('geminiPrompt')}</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('veo3Prompt')}</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32 text-center">{t('startImage')}</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32 text-center">{t('endImage')}</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-40 text-center">{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {script.segments.map((segment) => (
            <tr key={segment.id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors align-top">
              <td className="py-6 px-3 text-sm font-medium text-zinc-400">{segment.index}</td>
              <td className="py-6 px-3">
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">{t('segment')} {segment.index}</span>
                <span className="text-[10px] text-zinc-400 font-medium">{segment.startTime}s - {segment.endTime}s</span>
              </td>
              <td className="py-6 px-3 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{t('visualDirection')}</label>
                  <textarea
                    value={segment.visualDirection}
                    onChange={(e) => onUpdateSegment(segment.id, { visualDirection: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-600 dark:text-zinc-400 focus:ring-1 focus:ring-indigo-500 outline-none h-24 resize-none"
                  />
                </div>
              </td>
              <td className="py-6 px-3">
                <div className="flex flex-col gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      {language === 'vi' ? "Chỉnh sửa bằng Tiếng Việt" : "Refine with Vietnamese"}
                    </label>
                    <div className="relative group">
                      <textarea
                        value={viPrompts[segment.id] || ''}
                        onChange={(e) => setViPrompts(prev => ({ ...prev, [segment.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleRefinePrompt(segment.id);
                          }
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 pr-10 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none shadow-sm transition-all"
                        placeholder={language === 'vi' ? "Nhập yêu cầu chỉnh sửa (VD: thêm ánh nắng, đổi màu áo...)" : "Enter edit request (e.g. add sunlight, change shirt color...)"}
                      />
                      <button
                        onClick={() => handleRefinePrompt(segment.id)}
                        disabled={isTranslating[segment.id] || !viPrompts[segment.id]}
                        className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md disabled:opacity-50 disabled:bg-zinc-400 transition-all shadow-sm flex items-center gap-1"
                        title={language === 'vi' ? "Nộp" : "Submit"}
                      >
                        {isTranslating[segment.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-bold uppercase">{language === 'vi' ? "Nộp" : "Submit"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{t('geminiPrompt')} (English)</label>
                    <textarea
                      value={segment.imagePrompt || ''}
                      onChange={(e) => onUpdateSegment(segment.id, { imagePrompt: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none shadow-sm"
                      placeholder="Enter image prompt in English..."
                    />
                  </div>
                </div>
              </td>
              <td className="py-6 px-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{t('veo3Prompt')}</label>
                  <textarea
                    value={segment.videoPrompt || ''}
                    onChange={(e) => onUpdateSegment(segment.id, { videoPrompt: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-44 resize-none shadow-sm"
                    placeholder="Enter Veo 3 prompt..."
                  />
                </div>
              </td>
              <td className="py-6 px-3">
                <div className="aspect-[9/16] w-24 mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group">
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
              <td className="py-6 px-3">
                <div className="aspect-[9/16] w-24 mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group">
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
              <td className="py-6 px-3">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => handleGenerateImages(segment)}
                    disabled={segment.isGeneratingStart || segment.isGeneratingEnd}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      (segment.startImageUrl && segment.endImageUrl)
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                    } disabled:opacity-50`}
                  >
                    {segment.isGeneratingStart || segment.isGeneratingEnd ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('generating')}
                      </>
                    ) : (segment.startImageUrl && segment.endImageUrl) ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        {t('regenerateImages')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t('generateImages')}
                      </>
                    )}
                  </button>
                  {(segment.startImageUrl && segment.endImageUrl) && (
                    <span className="text-[9px] text-emerald-500 font-bold uppercase">{t('imagesReady')}</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
