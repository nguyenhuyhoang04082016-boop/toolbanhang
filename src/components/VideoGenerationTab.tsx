import React, { useState, useEffect } from 'react';
import { AdScript, AdSegment } from '../types';
import { Play, Video, Loader2, AlertCircle, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { generateVideo } from '../services/geminiService';

interface VideoGenerationTabProps {
  currentScript: AdScript | null;
  onUpdateSegment: (segmentId: string, updates: Partial<AdSegment>) => void;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export const VideoGenerationTab: React.FC<VideoGenerationTabProps> = ({
  currentScript,
  onUpdateSegment,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async (segment: AdSegment) => {
    if (!segment.videoPrompt) return;
    
    onUpdateSegment(segment.id, { isGeneratingVideo: true });
    setError(null);

    try {
      const videoUrl = await generateVideo(
        segment.videoPrompt,
        segment.startImageUrl,
        segment.endImageUrl,
        currentScript?.productInfo.ratio === '16:9' ? '16:9' : '9:16'
      );
      onUpdateSegment(segment.id, { videoUrl, isGeneratingVideo: false });
    } catch (err: any) {
      console.error(err);
      let msg = "Không thể tạo video. Vui lòng thử lại.";
      if (err.message?.includes("Requested entity was not found")) {
        msg = "Vui lòng kiểm tra lại API Key (Project trả phí).";
      }
      setError(msg);
      onUpdateSegment(segment.id, { isGeneratingVideo: false });
    }
  };

  if (!currentScript) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <Video className="w-12 h-12 mb-4 opacity-20" />
        <p>Vui lòng tạo kịch bản trước khi xây dựng video.</p>
      </div>
    );
  }

  const getAspectClass = (ratio: string) => {
    switch (ratio) {
      case '9:16': return 'aspect-[9/16] w-16';
      case '1:1': return 'aspect-square w-20';
      case '16:9': return 'aspect-video w-24';
      default: return 'aspect-[9/16] w-16';
    }
  };

  return (
    <div className="space-y-8 pb-20 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-500" />
            Bảng điều khiển xây dựng Video
          </h3>
          <p className="text-sm text-zinc-500 mt-1">Tạo video từ ảnh đã thiết kế và tải về kết quả cuối cùng.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-12">#</th>
                <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32">Phân đoạn</th>
                <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-48">Prompt Video</th>
                <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32 text-center">Ảnh đầu</th>
                <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32 text-center">Ảnh cuối</th>
                <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-64 text-center">Xem trước (Video)</th>
                <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentScript.segments.map((segment) => (
                <tr key={segment.id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="py-6 px-4 text-sm font-medium text-zinc-400">{segment.index}</td>
                  <td className="py-6 px-4">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white block">Phân đoạn {segment.index}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{segment.startTime}s - {segment.endTime}s</span>
                  </td>
                  <td className="py-6 px-4">
                    <textarea
                      value={segment.videoPrompt || ''}
                      onChange={(e) => onUpdateSegment(segment.id, { videoPrompt: e.target.value })}
                      className="w-full bg-transparent text-[11px] text-zinc-600 dark:text-zinc-400 outline-none resize-none h-20 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2 focus:border-indigo-500 transition-colors"
                      placeholder="Prompt video..."
                    />
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex justify-center">
                      <div className={`${getAspectClass(currentScript.productInfo.ratio)} rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm`}>
                        {segment.startImageUrl ? (
                          <img src={segment.startImageUrl} alt="Start" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex justify-center">
                      <div className={`${getAspectClass(currentScript.productInfo.ratio)} rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm`}>
                        {segment.endImageUrl ? (
                          <img src={segment.endImageUrl} alt="End" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex justify-center">
                      <div className="aspect-[16/9] w-56 rounded-xl overflow-hidden bg-black border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative shadow-inner">
                        {segment.videoUrl ? (
                          <video
                            src={segment.videoUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : segment.isGeneratingVideo ? (
                          <div className="flex flex-col items-center gap-2 text-zinc-500">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Veo 3.1 Fast</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-zinc-700">
                            <Video className="w-6 h-6 opacity-10" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter opacity-30">Chưa có video</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex flex-col gap-2">
                      <button
                        disabled={segment.isGeneratingVideo || !segment.videoPrompt || !segment.startImageUrl}
                        onClick={() => handleGenerateVideo(segment)}
                        className={`w-full py-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-2 transition-all ${
                          segment.videoUrl 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20'
                        } disabled:opacity-50`}
                      >
                        {segment.isGeneratingVideo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : segment.videoUrl ? (
                          <RefreshCw className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {segment.isGeneratingVideo ? 'ĐANG TẠO' : segment.videoUrl ? 'TẠO LẠI' : 'TẠO VIDEO'}
                      </button>
                      
                      {segment.videoUrl && (
                        <a
                          href={segment.videoUrl}
                          download={`video-segment-${segment.index}.mp4`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-xl font-bold text-[11px] bg-zinc-900 text-white flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          TẢI VỀ
                        </a>
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
