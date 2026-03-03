import React from 'react';
import { Moon, Sun, Languages, Zap, ShieldCheck, Key } from 'lucide-react';
import { Language, Tone } from '../types';

interface SettingsBarProps {
  language: Language;
  setLanguage: (l: Language) => void;
  tone: Tone;
  setTone: (t: Tone) => void;
  brandVoice: boolean;
  setBrandVoice: (b: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onOpenApiKeySettings: () => void;
}

const tones: Tone[] = ['Funny', 'Premium', 'Urgent', 'Warm', 'Informative'];

export const SettingsBar: React.FC<SettingsBarProps> = ({
  language,
  setLanguage,
  tone,
  setTone,
  brandVoice,
  setBrandVoice,
  darkMode,
  toggleDarkMode,
  onOpenApiKeySettings,
}) => {
  return (
    <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Zap className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          AdScript <span className="text-indigo-600">Pro</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* API Key Settings */}
        <button
          onClick={onOpenApiKeySettings}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all"
          title="Cấu hình API Gemini"
        >
          <Key className="w-4 h-4" />
          <span className="hidden md:inline">Cấu hình API</span>
        </button>

        {/* Language Switch */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-1">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              language === 'en'
                ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600'
                : 'text-zinc-500'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('vi')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              language === 'vi'
                ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600'
                : 'text-zinc-500'
            }`}
          >
            VI
          </button>
        </div>

        {/* Tone Dropdown */}
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
          className="bg-zinc-100 dark:bg-zinc-900 border-none rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
        >
          {tones.map((t) => (
            <option key={t} value={t}>
              Tông: {t === 'Funny' ? 'Hài hước' : t === 'Premium' ? 'Sang trọng' : t === 'Urgent' ? 'Khẩn cấp' : t === 'Warm' ? 'Ấm áp' : 'Thông tin'}
            </option>
          ))}
        </select>

        {/* Brand Voice Toggle */}
        <button
          onClick={() => setBrandVoice(!brandVoice)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            brandVoice
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 border border-transparent'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Giọng thương hiệu
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
