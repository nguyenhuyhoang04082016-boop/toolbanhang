import React, { useState, useEffect } from 'react';
import { AdSegment, Language, AdScript } from '../types';
import { Video, Play, Trash2, Plus, ArrowRight, Sparkles, Image as ImageIcon, Edit3, Save, X, Download, Loader2, AlertCircle, RefreshCw, Music, Mic, Volume2, CheckCircle2, Share2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { motion, AnimatePresence } from 'motion/react';
import { generateVideo, generateVoiceover } from '../services/geminiService';
import { mergeSceneVideos } from '../services/videoService';

const MUSIC_OPTIONS = [
  { id: 'upbeat', name: 'Upbeat & Energetic', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=upbeat-corporate-11270.mp3' },
  { id: 'calm', name: 'Calm & Professional', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a7315b.mp3?filename=calm-commercial-11036.mp3' },
  { id: 'modern', name: 'Modern Tech', url: 'https://cdn.pixabay.com/download/audio/2022/01/21/audio_31743c5825.mp3?filename=modern-technology-11356.mp3' },
];

interface VideoGenerationTabProps {
  script: AdScript | null;
  onUpdateSegments: (segments: AdSegment[]) => void;
  onOpenApiKeySettings?: () => void;
  language: Language;
  initialMergedVideoUrl?: string | null;
}

export const VideoGenerationTab: React.FC<VideoGenerationTabProps> = ({
  script,
  onUpdateSegments,
  onOpenApiKeySettings,
  language,
  initialMergedVideoUrl = null
}) => {
  const { t } = useTranslation(language);
  const [videoSegments, setVideoSegments] = useState<AdSegment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  
  // Merge & Export states
  const [addVoiceover, setAddVoiceover] = useState(true);
  const [addMusic, setAddMusic] = useState(true);
  const [selectedMusicUrl, setSelectedMusicUrl] = useState(MUSIC_OPTIONS[0].url);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(initialMergedVideoUrl);

  useEffect(() => {
    if (initialMergedVideoUrl) {
      setMergedVideoUrl(initialMergedVideoUrl);
    }
  }, [initialMergedVideoUrl]);
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);

  useEffect(() => {
    if (script && videoSegments.length === 0) {
      const initialSegments = script.segments.map(s => ({ ...s }));
      setVideoSegments(initialSegments);
      if (initialSegments.length > 0) {
        setSelectedSegmentId(initialSegments[0].id);
      }
    }
  }, [script]);

  const selectedSegment = videoSegments.find(s => s.id === selectedSegmentId);

  const handleUpdateSegment = (id: string, updates: Partial<AdSegment>) => {
    setVideoSegments(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteSegment = (id: string) => {
    if (videoSegments.length <= 1) {
      alert(language === 'vi' ? 'Phải có ít nhất một phân đoạn.' : 'Must have at least one segment.');
      return;
    }
    setVideoSegments(prev => prev.filter(s => s.id !== id));
  };

  const handleAddSegment = (index: number) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newSegment: AdSegment = {
      id: newId,
      index: index + 1,
      startTime: 0,
      endTime: 5,
      visualDirection: '',
      onScreenText: '',
      voiceover: '',
      sfx: '',
      videoPrompt: '',
    };
    
    const newSegments = [...videoSegments];
    newSegments.splice(index + 1, 0, newSegment);
    
    // Update indices
    const updatedSegments = newSegments.map((s, i) => ({ ...s, index: i + 1 }));
    setVideoSegments(updatedSegments);
    setEditingId(newId);
  };

  const handleGenerateVideo = async (segment: AdSegment) => {
    if (!segment.videoPrompt) {
      alert(language === 'vi' ? 'Vui lòng nhập câu lệnh video.' : 'Please enter a video prompt.');
      return;
    }

    handleUpdateSegment(segment.id, { isGeneratingVideo: true });
    try {
      const videoUrl = await generateVideo(
        segment.videoPrompt,
        segment.startImageUrl,
        segment.endImageUrl,
        script?.productInfo.ratio || '9:16'
      );
      handleUpdateSegment(segment.id, { videoUrl, isGeneratingVideo: false });
    } catch (error: any) {
      console.error('Error generating video:', error);
      const msg = error.message || 'Unknown error';
      if (msg.includes("Lỗi quyền truy cập Veo 3") || msg.includes("Paid") || msg.includes("permission")) {
        if (confirm(msg + (language === 'vi' ? "\n\nBạn có muốn mở phần Cài đặt để chọn API Key khác không?" : "\n\nWould you like to open Settings to select a different API Key?"))) {
          onOpenApiKeySettings?.();
        }
      } else {
        alert(t('errorGeneratingVideo') + ": " + msg);
      }
      handleUpdateSegment(segment.id, { isGeneratingVideo: false });
    }
  };

  const handleMergeAndExport = async () => {
    const segmentsWithVideo = videoSegments.filter(s => s.videoUrl);
    if (segmentsWithVideo.length === 0) {
      alert(language === 'vi' ? 'Vui lòng tạo ít nhất một video trước khi xuất.' : 'Please generate at least one video before exporting.');
      return;
    }

    setIsMerging(true);
    setMergeProgress(0);
    setMergedVideoUrl(null);

    try {
      let voiceUrl: string | undefined = undefined;
      if (addVoiceover) {
        setIsGeneratingVoiceover(true);
        const fullScript = videoSegments.map(s => s.voiceover).filter(Boolean).join(' ');
        if (fullScript) {
          voiceUrl = await generateVoiceover(fullScript, language);
        }
        setIsGeneratingVoiceover(false);
      }

      const finalUrl = await mergeSceneVideos(videoSegments, {
        voiceUrl,
        musicUrl: addMusic ? selectedMusicUrl : undefined,
        onProgress: (p) => setMergeProgress(Math.round(p * 100))
      });

      setMergedVideoUrl(finalUrl);
    } catch (error: any) {
      console.error('Error merging videos:', error);
      alert((language === 'vi' ? 'Lỗi khi xuất video: ' : 'Error exporting video: ') + error.message);
    } finally {
      setIsMerging(false);
      setIsGeneratingVoiceover(false);
    }
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (const segment of videoSegments) {
      if (!segment.videoUrl && !segment.isGeneratingVideo) {
        await handleGenerateVideo(segment);
      }
    }
    setIsGeneratingAll(false);
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Video className="w-7 h-7 text-indigo-600" />
            {t('videoGeneration')}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {language === 'vi' 
              ? 'Chỉnh sửa câu lệnh, ảnh đầu/cuối và tạo video cho từng phân đoạn.' 
              : 'Edit prompts, start/end images and generate video for each segment.'}
          </p>
        </div>
        <button
          onClick={handleGenerateAll}
          disabled={isGeneratingAll}
          className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-500 disabled:bg-zinc-400 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          {isGeneratingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {t('generateAllMotion')}
        </button>
      </div>

      {/* Segment Selection Icons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">{t('segments')}</h3>
          <button
            onClick={() => handleAddSegment(videoSegments.length - 1)}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            {t('addSegment')}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 px-2">
          {videoSegments.map((segment) => (
            <button
              key={segment.id}
              onClick={() => setSelectedSegmentId(segment.id)}
              className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all border-2 overflow-hidden ${
                selectedSegmentId === segment.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-110 z-10'
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-indigo-300'
              }`}
            >
              {/* Thumbnail background if available */}
              {segment.videoUrl ? (
                <video src={segment.videoUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" />
              ) : segment.startImageUrl ? (
                <img src={segment.startImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" referrerPolicy="no-referrer" />
              ) : null}

              <span className="relative z-10 text-xs font-black">{segment.index}</span>
              
              {/* Status Dots */}
              <div className="absolute bottom-1.5 flex gap-1 z-10">
                {segment.startImageUrl && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />}
                {segment.endImageUrl && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />}
                {segment.videoUrl && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm" />}
              </div>

              {selectedSegmentId === segment.id && (
                <motion.div
                  layoutId="activeVideoSegment"
                  className="absolute -bottom-1 w-full h-1 bg-indigo-600 z-20"
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
                <div className="flex items-center gap-6">
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

                  <div className="flex items-center gap-4 border-l border-zinc-100 dark:border-zinc-800 pl-6">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative group">
                        {selectedSegment.startImageUrl ? (
                          <img src={selectedSegment.startImageUrl} alt="Start" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-zinc-300" />
                        )}
                      </div>
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">{t('startImage')}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative group">
                        {selectedSegment.endImageUrl ? (
                          <img src={selectedSegment.endImageUrl} alt="End" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-zinc-300" />
                        )}
                      </div>
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">{t('endImage')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleDeleteSegment(selectedSegment.id)}
                    className="p-3 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleGenerateVideo(selectedSegment)}
                    disabled={selectedSegment.isGeneratingVideo}
                    className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      selectedSegment.videoUrl
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                    } disabled:opacity-50`}
                  >
                    {selectedSegment.isGeneratingVideo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedSegment.videoUrl ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {selectedSegment.isGeneratingVideo 
                      ? t('generating') 
                      : selectedSegment.videoUrl 
                        ? t('regenerateVideo') 
                        : t('generateVideo')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Edit3 className="w-3 h-3" />
                      {t('visualDirection')}
                    </label>
                    <textarea
                      value={selectedSegment.visualDirection}
                      onChange={(e) => handleUpdateSegment(selectedSegment.id, { visualDirection: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      {t('videoPrompt')}
                    </label>
                    <textarea
                      value={selectedSegment.videoPrompt || ''}
                      onChange={(e) => handleUpdateSegment(selectedSegment.id, { videoPrompt: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none shadow-sm"
                      placeholder="Enter video generation prompt..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('startTime')}</label>
                      <input
                        type="number"
                        value={selectedSegment.startTime}
                        onChange={(e) => handleUpdateSegment(selectedSegment.id, { startTime: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('endTime')}</label>
                      <input
                        type="number"
                        value={selectedSegment.endTime}
                        onChange={(e) => handleUpdateSegment(selectedSegment.id, { endTime: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center block">
                      {t('videoPreview')}
                    </label>
                    <div className="aspect-[9/16] w-full max-w-[300px] mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative group shadow-inner">
                      {selectedSegment.videoUrl ? (
                        <>
                          <video src={selectedSegment.videoUrl} controls className="w-full h-full object-cover" />
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = selectedSegment.videoUrl!;
                                a.download = `segment-${selectedSegment.index}-video.mp4`;
                                a.click();
                              }}
                              className="p-3 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white hover:bg-white/30 transition-all"
                            >
                              <Download className="w-6 h-6" />
                            </button>
                          </div>
                        </>
                      ) : selectedSegment.isGeneratingVideo ? (
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                          <span className="text-xs font-bold text-indigo-500 animate-pulse">{t('generating')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-zinc-300">
                          <Video className="w-12 h-12" />
                          <span className="text-xs font-bold">{t('noVideoYet')}</span>
                        </div>
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
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Export Options */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAddVoiceover(!addVoiceover)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  addVoiceover 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span className="text-sm font-medium">{language === 'vi' ? 'Thuyết minh' : 'Voiceover'}</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${addVoiceover ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${addVoiceover ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </button>

              <button
                onClick={() => setAddMusic(!addMusic)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  addMusic 
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400' 
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                <Music className="w-4 h-4" />
                <span className="text-sm font-medium">{language === 'vi' ? 'Nhạc nền' : 'Music'}</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${addMusic ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${addMusic ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </button>
            </div>

            {addMusic && (
              <select
                value={selectedMusicUrl}
                onChange={(e) => setSelectedMusicUrl(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {MUSIC_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.url}>{opt.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-4">
            {mergedVideoUrl && (
              <a
                href={mergedVideoUrl}
                download="final_ad_video.mp4"
                className="flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl font-bold transition-all border border-zinc-200 dark:border-zinc-800"
              >
                <Download className="w-5 h-5" />
                {language === 'vi' ? 'Tải xuống' : 'Download'}
              </a>
            )}

            <button
              onClick={handleMergeAndExport}
              disabled={isMerging || videoSegments.filter(s => s.videoUrl).length === 0}
              className={`px-10 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${
                mergedVideoUrl 
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {isGeneratingVoiceover 
                      ? (language === 'vi' ? 'Đang tạo thuyết minh...' : 'Generating voiceover...') 
                      : (language === 'vi' ? `Đang xuất ${mergeProgress}%` : `Exporting ${mergeProgress}%`)}
                  </span>
                </>
              ) : mergedVideoUrl ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>{language === 'vi' ? 'Xuất lại' : 'Re-export'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{language === 'vi' ? 'Ghép & Xuất Video' : 'Merge & Export'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (confirm(language === 'vi' ? 'Bạn có chắc chắn muốn hoàn tất? Video đã xuất sẽ không được lưu.' : 'Are you sure you want to finish? Exported video will not be saved.')) {
                  window.location.reload();
                }
              }}
              className="p-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title={language === 'vi' ? 'Hoàn tất' : 'Finish'}
            >
              <CheckCircle2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Check = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);
