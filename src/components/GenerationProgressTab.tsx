import React from 'react';
import { AdScript, AdSegment, Language } from '../types';
import { motion } from 'motion/react';
import { Image as ImageIcon, Video as VideoIcon, CheckCircle2, Loader2, AlertCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '../i18n';

interface GenerationProgressTabProps {
  script: AdScript | null;
  progress: Record<string, { 
    startImage: 'pending' | 'loading' | 'done' | 'error', 
    endImage: 'pending' | 'loading' | 'done' | 'error',
    video: 'pending' | 'loading' | 'done' | 'error',
    videoUrl?: string 
  }>;
  language: Language;
  onNext: () => void;
  onRegenerate: () => void;
}

export const GenerationProgressTab: React.FC<GenerationProgressTabProps> = ({
  script,
  progress,
  language,
  onNext,
  onRegenerate
}) => {
  const { t } = useTranslation(language);

  if (!script) return null;

  const allDone = script.segments.every(s => 
    progress[s.id]?.startImage === 'done' && 
    progress[s.id]?.endImage === 'done' && 
    progress[s.id]?.video === 'done'
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {t('generationProgress')}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {t('automationDesc')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRegenerate}
              className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              {language === 'vi' ? 'Tạo kịch bản khác' : 'Generate another script'}
            </button>
            {allDone && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={onNext}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
              >
                <PlayCircle className="w-5 h-5" />
                {t('createVideo')}
              </motion.button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {script.segments.map((segment, index) => {
            const status = progress[segment.id] || { image: 'pending', video: 'pending' };
            
            return (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-6 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-sm">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {segment.voiceover || segment.visualDirection}
                  </p>
                </div>

                <div className="flex items-center gap-8">
                  {/* Start Image Generation Progress */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      status.startImage === 'done' ? 'bg-emerald-100 text-emerald-600' :
                      status.startImage === 'loading' ? 'bg-indigo-100 text-indigo-600' :
                      status.startImage === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-zinc-100 text-zinc-400'
                    }`}>
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {language === 'vi' ? 'Ảnh đầu' : 'Start Img'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {status.startImage === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                        {status.startImage === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {status.startImage === 'error' && <AlertCircle className="w-3 h-3 text-red-600" />}
                        <span className={`text-xs font-bold ${
                          status.startImage === 'done' ? 'text-emerald-600' :
                          status.startImage === 'loading' ? 'text-indigo-600' :
                          status.startImage === 'error' ? 'text-red-600' :
                          'text-zinc-400'
                        }`}>
                          {status.startImage === 'done' ? (language === 'vi' ? 'Xong' : 'Done') :
                           status.startImage === 'loading' ? (language === 'vi' ? '...' : '...') :
                           status.startImage === 'error' ? (language === 'vi' ? 'Lỗi' : 'Err') :
                           (language === 'vi' ? 'Chờ' : 'Wait')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* End Image Generation Progress */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      status.endImage === 'done' ? 'bg-emerald-100 text-emerald-600' :
                      status.endImage === 'loading' ? 'bg-indigo-100 text-indigo-600' :
                      status.endImage === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-zinc-100 text-zinc-400'
                    }`}>
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {language === 'vi' ? 'Ảnh cuối' : 'End Img'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {status.endImage === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                        {status.endImage === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {status.endImage === 'error' && <AlertCircle className="w-3 h-3 text-red-600" />}
                        <span className={`text-xs font-bold ${
                          status.endImage === 'done' ? 'text-emerald-600' :
                          status.endImage === 'loading' ? 'text-indigo-600' :
                          status.endImage === 'error' ? 'text-red-600' :
                          'text-zinc-400'
                        }`}>
                          {status.endImage === 'done' ? (language === 'vi' ? 'Xong' : 'Done') :
                           status.endImage === 'loading' ? (language === 'vi' ? '...' : '...') :
                           status.endImage === 'error' ? (language === 'vi' ? 'Lỗi' : 'Err') :
                           (language === 'vi' ? 'Chờ' : 'Wait')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Video Generation Progress */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      status.video === 'done' ? 'bg-emerald-100 text-emerald-600' :
                      status.video === 'loading' ? 'bg-indigo-100 text-indigo-600' :
                      status.video === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-zinc-100 text-zinc-400'
                    }`}>
                      <VideoIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {language === 'vi' ? 'Video' : 'Video'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {status.video === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                        {status.video === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {status.video === 'error' && <AlertCircle className="w-3 h-3 text-red-600" />}
                        <span className={`text-xs font-bold ${
                          status.video === 'done' ? 'text-emerald-600' :
                          status.video === 'loading' ? 'text-indigo-600' :
                          status.video === 'error' ? 'text-red-600' :
                          'text-zinc-400'
                        }`}>
                          {status.video === 'done' ? (language === 'vi' ? 'Hoàn tất' : 'Done') :
                           status.video === 'loading' ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') :
                           status.video === 'error' ? (language === 'vi' ? 'Lỗi' : 'Error') :
                           (language === 'vi' ? 'Chờ...' : 'Pending')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
