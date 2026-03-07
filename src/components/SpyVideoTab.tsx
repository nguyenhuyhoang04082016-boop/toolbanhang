import React, { useState, useRef } from 'react';
import { Upload, Search, Loader2, Play, FileVideo, CheckCircle2, Copy, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeVideo } from '../services/geminiService';
import { AdScript, Language } from '../types';
import { useTranslation } from '../i18n';

interface SpyVideoTabProps {
  onUseScript: (script: Partial<AdScript>) => void;
  language: Language;
}

export const SpyVideoTab: React.FC<SpyVideoTabProps> = ({ onUseScript, language }) => {
  const { t } = useTranslation(language);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<Partial<AdScript> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        setError(language === 'vi' ? "Video quá lớn. Vui lòng chọn video dưới 100MB." : "Video too large. Please select a video under 100MB.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setAnalyzedData(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(videoFile);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await analyzeVideo(base64, videoFile.type);
        setAnalyzedData(data);
        setIsAnalyzing(false);
      };
    } catch (err) {
      console.error(err);
      setError(language === 'vi' ? "Không thể phân tích video. Vui lòng thử lại." : "Could not analyze video. Please try again.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Spy Video AI</h2>
        <p className="text-zinc-500">{t('spyVideoDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center ${
              videoPreview 
                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' 
                : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 bg-white dark:bg-zinc-900'
            }`}
          >
            {videoPreview ? (
              <video src={videoPreview} className="w-full h-full object-contain rounded-xl" controls onClick={(e) => e.stopPropagation()} />
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('chooseVideoToSpy')}</h3>
                <p className="text-sm text-zinc-500 mt-2">{t('dragAndDropVideo')}</p>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="video/*" 
              className="hidden" 
            />
          </div>

          <button
            disabled={!videoFile || isAnalyzing}
            onClick={handleAnalyze}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
          >
            {isAnalyzing ? (
              <>
                <div className="flex flex-col items-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[8px] opacity-70">Gemini 3 Flash</span>
                </div>
                {t('analyzingVideo')}
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                {t('startAnalysis')}
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-indigo-500" />
              {t('analysisResults')}
            </h3>
            {analyzedData && (
              <button
                onClick={() => onUseScript(analyzedData)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
              >
                {t('useThisScript')}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto max-h-[600px] scrollbar-hide">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center space-y-4 text-zinc-400 py-20"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-indigo-500 whitespace-nowrap">Gemini 3 Flash</span>
                  </div>
                  <p className="text-sm font-medium mt-4">{t('aiAnalyzingVideo')}</p>
                </motion.div>
              ) : analyzedData ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Product Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('productInfo')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{t('productName')}</p>
                        <p className="text-sm font-bold">{analyzedData.productInfo?.name || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{t('category')}</p>
                        <p className="text-sm font-bold">{analyzedData.productInfo?.category || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Character Profile */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('characterProfile')}</span>
                    </div>
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {analyzedData.characterProfile || (language === 'vi' ? 'Không tìm thấy thông tin nhân vật.' : 'Character profile not found.')}
                      </p>
                    </div>
                  </div>

                  {/* Segments */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('scriptStructure')}</span>
                    </div>
                    <div className="space-y-3">
                      {analyzedData.segments?.map((seg, idx) => (
                        <div key={idx} className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-600">{t('segment')} {idx + 1}</span>
                          </div>
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{seg.visualDirection}</p>
                          {seg.voiceover && (
                            <p className="text-xs text-zinc-500 italic">" {seg.voiceover} "</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-4 text-zinc-400 py-20">
                  <Play className="w-12 h-12 opacity-10" />
                  <p className="text-sm">{t('resultsWillShowHere')}</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
