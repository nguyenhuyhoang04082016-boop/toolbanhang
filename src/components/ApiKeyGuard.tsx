import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, AlertCircle, ExternalLink, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { useTranslation } from '../i18n';

interface ApiKeyGuardProps {
  children: React.ReactNode;
  language: Language;
}

export const ApiKeySettings: React.FC<{ onSave: () => void; onCancel?: () => void; language: Language }> = ({ onSave, onCancel, language }) => {
  const { t } = useTranslation(language);
  const [geminiKey, setGeminiKey] = useState<string>(localStorage.getItem('manual_gemini_api_key') || '');
  const [imageKey, setImageKey] = useState<string>(localStorage.getItem('manual_image_api_key') || '');
  const [veoKey, setVeoKey] = useState<string>(localStorage.getItem('manual_veo_api_key') || '');
  const [geminiModel, setGeminiModel] = useState<string>(localStorage.getItem('selected_gemini_model') || 'gemini-2.5-flash');
  const [imageModel, setImageModel] = useState<string>(localStorage.getItem('selected_image_model') || 'gemini-3.1-flash-image-preview');
  const [veoModel, setVeoModel] = useState<string>(localStorage.getItem('selected_veo_model') || 'veo-3.1-fast-generate-preview');
  const [mockMode, setMockMode] = useState<boolean>(localStorage.getItem('mock_mode') === 'true');

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success to avoid race condition with hasSelectedApiKey
      localStorage.setItem('selected_key_triggered', 'true');
      onSave();
    }
  };

  const handleSaveKeys = () => {
    if (geminiKey.trim()) {
      localStorage.setItem('manual_gemini_api_key', geminiKey.trim());
    }
    if (imageKey.trim()) {
      localStorage.setItem('manual_image_api_key', imageKey.trim());
    }
    if (veoKey.trim()) {
      localStorage.setItem('manual_veo_api_key', veoKey.trim());
    }
    localStorage.setItem('selected_gemini_model', geminiModel);
    localStorage.setItem('selected_image_model', imageModel);
    localStorage.setItem('selected_veo_model', veoModel);
    localStorage.setItem('mock_mode', String(mockMode));
    onSave();
  };

  const handleClearKeys = () => {
    localStorage.removeItem('manual_gemini_api_key');
    localStorage.removeItem('manual_image_api_key');
    localStorage.removeItem('manual_veo_api_key');
    localStorage.removeItem('selected_gemini_model');
    localStorage.removeItem('selected_image_model');
    localStorage.removeItem('selected_veo_model');
    localStorage.removeItem('mock_mode');
    setGeminiKey('');
    setImageKey('');
    setVeoKey('');
    setGeminiModel('gemini-2.5-flash');
    setImageModel('gemini-3.1-flash-image-preview');
    setVeoModel('veo-3.1-fast-generate-preview');
    setMockMode(false);
    onSave();
  };

  return (
    <div className="p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto">
        <Key className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('apiConfig')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t('apiConfigDesc')}
        </p>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{t('mockMode')}</p>
            <p className="text-[10px] text-zinc-500">{t('mockModeDesc')}</p>
          </div>
          <button
            onClick={() => setMockMode(!mockMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              mockMode ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                mockMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4 text-left flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">{t('freeAccountNote')}</p>
          <p className="text-xs text-amber-700 dark:text-amber-300/70 leading-relaxed">
            {language === 'vi' 
              ? 'Lưu ý: Veo 3 và Gemini 3.1 yêu cầu tài khoản Google Cloud Trả phí (Paid). Nếu bạn dùng gói Miễn phí, vui lòng chọn Gemini 2.5 Flash trong phần cài đặt.' 
              : 'Note: Veo 3 and Gemini 3.1 require a Paid Google Cloud account. If you are using a Free plan, please select Gemini 2.5 Flash in settings.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 text-left">
          {/* Text Generation Section */}
          <div className="space-y-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {language === 'vi' ? 'Cấu hình API Văn bản' : 'Text Generation API'}
              </h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">
                {language === 'vi' ? 'API Key (Gemini)' : 'API Key (Gemini)'}
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập API Key cho tạo kịch bản...' : 'Enter API Key for text generation...'}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[10px] text-amber-600 font-medium px-1">
                {t('apiPermissionTip')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">{t('geminiVersion')}</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash ({t('default')})</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash ({t('fastEfficient')})</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro ({t('smartSlower')})</option>
              </select>
            </div>
          </div>

          {/* Image Generation Section */}
          <div className="space-y-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/50 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-pink-600" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {language === 'vi' ? 'Cấu hình API Hình ảnh' : 'Image Generation API'}
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">
                {language === 'vi' ? 'API Key (Gemini)' : 'API Key (Gemini)'}
              </label>
              <input
                type="password"
                value={imageKey}
                onChange={(e) => setImageKey(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập API Key cho tạo ảnh...' : 'Enter API Key for image generation...'}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">
                {t('imageVersion')}
              </label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image ({t('highQuality')})</option>
                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image ({t('stable')})</option>
              </select>
            </div>
          </div>

          {/* Video Generation Section */}
          <div className="space-y-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {language === 'vi' ? 'Cấu hình API Video (Veo 3)' : 'Video Generation API (Veo 3)'}
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">
                {language === 'vi' ? 'API Key (Veo 3)' : 'API Key (Veo 3)'}
              </label>
              <input
                type="password"
                value={veoKey}
                onChange={(e) => setVeoKey(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập API Key cho tạo video...' : 'Enter API Key for video generation...'}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">{t('veoVersion')}</label>
              <select
                value={veoModel}
                onChange={(e) => setVeoModel(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast ({t('speed')})</option>
                <option value="veo-3.1-generate-preview">Veo 3.1 High Quality ({t('highQuality')})</option>
              </select>
            </div>
          </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveKeys}
                disabled={!geminiKey.trim() && !imageKey.trim() && !veoKey.trim()}
                className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 rounded-xl font-bold text-sm transition-all"
              >
                {t('saveApiConfig')}
              </button>
              {(localStorage.getItem('manual_gemini_api_key') || localStorage.getItem('manual_image_api_key') || localStorage.getItem('manual_veo_api_key')) && (
                <button
                  onClick={handleClearKeys}
                  className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm transition-all"
                >
                  {t('clearAll')}
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-sm transition-all"
                >
                  {t('close')}
                </button>
              )}
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">{t('orUseProject')}</span>
            </div>
          </div>

        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all group"
        >
          {t('getFreeApiKey')}
          <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </a>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">{t('or')}</span>
          </div>
        </div>

        <button
          onClick={handleSelectKey}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all group"
        >
          {t('selectApiKeyFromProject')}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        </div>
        
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-indigo-500 transition-colors"
        >
          {t('learnAboutBilling')} <ExternalLink className="w-3 h-3" />
        </a>
      </div>
  );
};

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children, language }) => {
  const { t } = useTranslation(language);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const checkApiKey = async () => {
    const geminiKey = localStorage.getItem('manual_gemini_api_key');
    const veoKey = localStorage.getItem('manual_veo_api_key');
    const isMockMode = localStorage.getItem('mock_mode') === 'true';
    const isTriggered = localStorage.getItem('selected_key_triggered') === 'true';
    
    // If Mock Mode is enabled, we allow access
    if (isMockMode) {
      setHasApiKey(true);
      return;
    }

    // If both manual keys are set, or if we just triggered a key selection, we are good
    if ((geminiKey && veoKey) || isTriggered) {
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
          <ApiKeySettings onSave={checkApiKey} language={language} />
          
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">{t('securityPrivacy')}</p>
                <p className="text-[10px] text-zinc-500">{t('securityPrivacyDesc')}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">{t('haveUltraAccount')}</p>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                {t('haveUltraAccountDesc')}
              </p>
            </div>
            
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">{t('permissionDeniedError')}</p>
              <ul className="text-[10px] text-zinc-500 list-disc ml-4 space-y-1">
                <li>{t('permissionDeniedStep1')}</li>
                <li>{t('permissionDeniedStep2')}</li>
                <li>{t('permissionDeniedStep3')}</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};
