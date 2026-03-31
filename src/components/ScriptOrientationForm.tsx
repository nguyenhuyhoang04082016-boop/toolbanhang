import React from 'react';
import { ScriptOrientation, Language, DialogueType } from '../types';
import { useTranslation } from '../i18n';
import { Compass, MessageSquare, Video, Sparkles } from 'lucide-react';

interface ScriptOrientationFormProps {
  value: ScriptOrientation;
  onChange: (value: ScriptOrientation) => void;
  onNext: () => void;
  language: Language;
}

export const ScriptOrientationForm: React.FC<ScriptOrientationFormProps> = ({ value, onChange, onNext, language }) => {
  const { t } = useTranslation(language);

  const styles = [
    { id: 'lifestyle', label: language === 'vi' ? 'Lifestyle' : 'Lifestyle' },
    { id: 'cinematic', label: language === 'vi' ? 'Điện ảnh' : 'Cinematic' },
    { id: 'vlog', label: language === 'vi' ? 'Vlog' : 'Vlog' },
    { id: 'unboxing', label: language === 'vi' ? 'Đập hộp' : 'Unboxing' },
    { id: 'tutorial', label: language === 'vi' ? 'Hướng dẫn' : 'Tutorial' },
    { id: 'storytelling', label: language === 'vi' ? 'Kể chuyện' : 'Storytelling' },
    { id: 'comedy', label: language === 'vi' ? 'Hài hước' : 'Comedy' },
    { id: 'educational', label: language === 'vi' ? 'Giáo dục' : 'Educational' },
  ];

  const dialogueTypes: { id: DialogueType; label: string; desc: string }[] = [
    { 
      id: 'self-talk', 
      label: language === 'vi' ? 'Tự thoại' : 'Self-talk',
      desc: language === 'vi' ? 'Nhân vật nói trực tiếp trước ống kính (khớp khẩu hình).' : 'Character speaks directly to camera (lip-sync).'
    },
    { 
      id: 'no-read', 
      label: language === 'vi' ? 'Không thoại' : 'No-read',
      desc: language === 'vi' ? 'Nhân vật xuất hiện nhưng không nói (có thể có voiceover).' : 'Character appears but doesn\'t speak (may have voiceover).'
    },
    { 
      id: 'none', 
      label: language === 'vi' ? 'Chỉ hình ảnh' : 'Visual only',
      desc: language === 'vi' ? 'Không có nhân vật nói hay voiceover, tập trung vào hình ảnh.' : 'No character speaking or voiceover, focus on visuals.'
    },
  ];

  return (
    <div className="p-6 space-y-10 pb-32 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Compass className="w-7 h-7 text-indigo-600" />
            {language === 'vi' ? 'Định hướng kịch bản' : 'Script Orientation'}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {language === 'vi' 
              ? 'AI đã đề xuất định hướng dựa trên sản phẩm của bạn. Bạn có thể tùy chỉnh lại.' 
              : 'AI suggested an orientation based on your product. You can customize it.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Style Selection */}
        <section className="space-y-4">
          <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-500" />
            {language === 'vi' ? 'Phong cách video' : 'Video Style'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => onChange({ ...value, style: s.id })}
                className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all text-left ${
                  value.style === s.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* Dialogue Type Selection */}
        <section className="space-y-4">
          <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            {language === 'vi' ? 'Hình thức đối thoại' : 'Dialogue Type'}
          </label>
          <div className="space-y-3">
            {dialogueTypes.map((d) => (
              <button
                key={d.id}
                onClick={() => onChange({ ...value, dialogueType: d.id })}
                className={`w-full px-4 py-3 rounded-xl text-sm border transition-all text-left flex flex-col gap-1 ${
                  value.dialogueType === d.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300'
                }`}
              >
                <span className="font-bold">{d.label}</span>
                <span className={`text-[10px] ${value.dialogueType === d.id ? 'text-indigo-100' : 'text-zinc-500'}`}>
                  {d.desc}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Additional Notes */}
      <section className="space-y-4">
        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          {language === 'vi' ? 'Ghi chú bổ sung cho kịch bản' : 'Additional Script Notes'}
        </label>
        <textarea
          value={value.additionalNotes || ''}
          onChange={(e) => onChange({ ...value, additionalNotes: e.target.value })}
          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32 resize-none"
          placeholder={language === 'vi' ? 'Nhập thêm các lưu ý cụ thể về nội dung, tông giọng, hoặc các chi tiết bạn muốn AI tập trung vào...' : 'Enter specific notes about content, tone, or details you want AI to focus on...'}
        />
      </section>

      {/* Floating Next Button */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl font-bold text-white shadow-2xl transition-all flex items-center justify-center gap-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-indigo-200 dark:shadow-none"
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-lg uppercase tracking-tight">{language === 'vi' ? 'Tạo kịch bản ngay' : 'Generate Script Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
