import React from 'react';
import { AdScript, AdSegment } from '../types';
import { Image as ImageIcon, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { generateImage } from '../services/geminiService';

interface ProductImageTabProps {
  script: AdScript | null;
  onUpdateSegment: (segmentId: string, updates: Partial<AdSegment>) => void;
}

export const ProductImageTab: React.FC<ProductImageTabProps> = ({ script, onUpdateSegment }) => {
  if (!script) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
          <ImageIcon className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500">Vui lòng tạo kịch bản trước khi tạo ảnh sản phẩm.</p>
      </div>
    );
  }

  const handleGenerateImages = async (segment: AdSegment) => {
    if (!segment.imagePrompt || !script) return;
    
    onUpdateSegment(segment.id, { 
      isGeneratingStart: true, 
      isGeneratingEnd: true 
    });

    try {
      // Generate both images
      const [startUrl, endUrl] = await Promise.all([
        generateImage(segment.imagePrompt + ", start of the scene, high quality", script.productInfo.ratio),
        generateImage(segment.imagePrompt + ", end of the scene, high quality", script.productInfo.ratio)
      ]);

      onUpdateSegment(segment.id, { 
        startImageUrl: startUrl,
        endImageUrl: endUrl,
        isGeneratingStart: false,
        isGeneratingEnd: false 
      });
    } catch (error) {
      console.error("Error generating images:", error);
      alert("Không thể tạo ảnh. Vui lòng thử lại.");
      onUpdateSegment(segment.id, { 
        isGeneratingStart: false, 
        isGeneratingEnd: false 
      });
    }
  };

  return (
    <div className="p-4 overflow-x-auto">
      <div className="mb-6 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Chỉnh sửa câu lệnh hình ảnh
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
              Kiểm tra và chỉnh sửa câu lệnh Gemini cho từng phân đoạn. Sau khi nhấn "Tạo ảnh", kết quả sẽ hiển thị tại tab <b>Xây dựng Video</b>.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Tỷ lệ khung hình</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{script.productInfo.ratio}</span>
          </div>
        </div>
      </div>

      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-12">#</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32">Phân đoạn</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-64">Nội dung (Tiếng Việt)</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Câu lệnh Gemini (Có thể sửa)</th>
            <th className="py-4 px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-48 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {script.segments.map((segment) => (
            <tr key={segment.id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
              <td className="py-6 px-3 text-sm font-medium text-zinc-400">{segment.index}</td>
              <td className="py-6 px-3">
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">Phân đoạn {segment.index}</span>
                <span className="text-[10px] text-zinc-400 font-medium">{segment.startTime}s - {segment.endTime}s</span>
              </td>
              <td className="py-6 px-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  {segment.visualDirection}
                </p>
              </td>
              <td className="py-6 px-3">
                <textarea
                  value={segment.imagePrompt || ''}
                  onChange={(e) => onUpdateSegment(segment.id, { imagePrompt: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none shadow-sm"
                  placeholder="Nhập câu lệnh tạo ảnh..."
                />
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
                        ĐANG TẠO...
                      </>
                    ) : (segment.startImageUrl && segment.endImageUrl) ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        TẠO LẠI ẢNH
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        TẠO ẢNH
                      </>
                    )}
                  </button>
                  {(segment.startImageUrl && segment.endImageUrl) && (
                    <span className="text-[9px] text-emerald-500 font-bold uppercase">Đã có ảnh</span>
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
