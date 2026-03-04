import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, AlertCircle, ExternalLink, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeySettings: React.FC<{ onSave: () => void; onCancel?: () => void }> = ({ onSave, onCancel }) => {
  const [geminiKey, setGeminiKey] = useState<string>(localStorage.getItem('manual_gemini_api_key') || '');
  const [veoKey, setVeoKey] = useState<string>(localStorage.getItem('manual_veo_api_key') || '');
  const [geminiModel, setGeminiModel] = useState<string>(localStorage.getItem('selected_gemini_model') || 'gemini-3-flash-preview');
  const [veoModel, setVeoModel] = useState<string>(localStorage.getItem('selected_veo_model') || 'veo-3.1-fast-generate-preview');

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      onSave();
    }
  };

  const handleSaveKeys = () => {
    if (geminiKey.trim()) {
      localStorage.setItem('manual_gemini_api_key', geminiKey.trim());
    }
    if (veoKey.trim()) {
      localStorage.setItem('manual_veo_api_key', veoKey.trim());
    }
    localStorage.setItem('selected_gemini_model', geminiModel);
    localStorage.setItem('selected_veo_model', veoModel);
    onSave();
  };

  const handleClearKeys = () => {
    localStorage.removeItem('manual_gemini_api_key');
    localStorage.removeItem('manual_veo_api_key');
    localStorage.removeItem('selected_gemini_model');
    localStorage.removeItem('selected_veo_model');
    setGeminiKey('');
    setVeoKey('');
    setGeminiModel('gemini-3-flash-preview');
    setVeoModel('veo-3.1-fast-generate-preview');
    onSave();
  };

  return (
    <div className="p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto">
        <Key className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Cấu hình API</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Nhập API Key riêng biệt cho Gemini (Tạo ảnh/văn bản) và Veo (Tạo video).
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4 text-left flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Lưu ý về Tài khoản Miễn phí</p>
          <p className="text-xs text-amber-700 dark:text-amber-300/70 leading-relaxed">
            Các tính năng <b>Tạo ảnh</b> và <b>Tạo video (Veo)</b> thường yêu cầu tài khoản Google Cloud đã bật thanh toán (Paid). Tài khoản miễn phí có thể gặp lỗi "Permission Denied".
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 text-left">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Gemini API Key (Ảnh & Văn bản)</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Dán Gemini API Key (AIZA...) vào đây..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Phiên bản Gemini</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (Nhanh, Hiệu quả)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Thông minh, Chậm hơn)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ổn định)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Veo API Key (Video)</label>
              <input
                type="password"
                value={veoKey}
                onChange={(e) => setVeoKey(e.target.value)}
                placeholder="Dán Veo API Key (AIZA...) vào đây..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Phiên bản Veo</label>
              <select
                value={veoModel}
                onChange={(e) => setVeoModel(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Tốc độ)</option>
                <option value="veo-3.1-generate-preview">Veo 3.1 High Quality (Chất lượng cao)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveKeys}
                disabled={!geminiKey.trim() && !veoKey.trim()}
                className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 rounded-xl font-bold text-sm transition-all"
              >
                Lưu cấu hình API
              </button>
              {(localStorage.getItem('manual_gemini_api_key') || localStorage.getItem('manual_veo_api_key')) && (
                <button
                  onClick={handleClearKeys}
                  className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm transition-all"
                >
                  Xóa hết
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-sm transition-all"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">Hoặc sử dụng Project</span>
            </div>
          </div>

        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all group"
        >
          Lấy API Key Miễn phí tại Google AI Studio
          <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </a>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">Hoặc</span>
          </div>
        </div>

        <button
          onClick={handleSelectKey}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all group"
        >
          Chọn API Key từ Project (Dành cho Paid/Veo)
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        </div>
        
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-indigo-500 transition-colors"
        >
          Tìm hiểu về cách thức thanh toán <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const checkApiKey = async () => {
    const geminiKey = localStorage.getItem('manual_gemini_api_key');
    const veoKey = localStorage.getItem('manual_veo_api_key');
    
    // If both manual keys are set, we are good
    if (geminiKey && veoKey) {
      setHasApiKey(true);
      return;
    }

    // Fallback to project key if manual keys are not fully set
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected || (!!geminiKey || !!veoKey));
    } else {
      setHasApiKey(!!geminiKey || !!veoKey);
    }
  };

  useEffect(() => {
    checkApiKey();
    window.addEventListener('focus', checkApiKey);
    return () => window.removeEventListener('focus', checkApiKey);
  }, []);

  if (hasApiKey === null) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl"
        >
          <ApiKeySettings onSave={checkApiKey} />
          
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Bảo mật & Riêng tư</p>
                <p className="text-[10px] text-zinc-500">Key của bạn được quản lý an toàn bởi nền tảng AI Studio và không bao giờ được lưu trữ trực tiếp trong mã nguồn ứng dụng.</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Bạn gặp lỗi "Không được cho phép" (403)?</p>
              <ul className="text-[10px] text-zinc-500 list-disc ml-4 space-y-1">
                <li>Đảm bảo bạn đã chọn API Key từ một <b>Project có bật thanh toán (Paid)</b>.</li>
                <li>Kiểm tra xem Project của bạn đã kích hoạt <b>Generative AI API</b> chưa.</li>
                <li>Thử nhấn nút "Chọn API Key từ Project" một lần nữa để làm mới phiên làm việc.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};
