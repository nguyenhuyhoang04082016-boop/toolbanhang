import React from 'react';
import { ProductInfo, ScriptOrientation, DialogueType, Language } from '../types';
import { Sparkles, MessageSquare, Mic, MicOff, Video, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n';
import { motion } from 'motion/react';

interface ScriptOrientationTabProps {
  product: ProductInfo;
  onUpdate: (updates: Partial<ProductInfo>) => void;
  onGenerate: () => void;
  onNext?: () => void;
  isLoading: boolean;
  language: Language;
}

export const ScriptOrientationTab: React.FC<ScriptOrientationTabProps> = ({
  product,
  onUpdate,
  onGenerate,
  onNext,
  isLoading,
  language
}) => {
  const { t } = useTranslation(language);

  const orientation = product.scriptOrientation || {
    style: 'review',
    dialogueType: 'self-talk',
    targetAudience: '',
    keyMessage: '',
    toneOfVoice: 'friendly'
  };

  const updateOrientation = (updates: Partial<ScriptOrientation>) => {
    onUpdate({
      scriptOrientation: { ...orientation, ...updates }
    });
  };

  const styles = [
    { id: 'review', label: language === 'vi' ? 'Đánh giá sản phẩm' : 'Product Review', icon: <Video className="w-5 h-5" /> },
    { id: 'cinematic', label: language === 'vi' ? 'Điện ảnh / Nghệ thuật' : 'Cinematic / Artistic', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'storytelling', label: language === 'vi' ? 'Kể chuyện' : 'Storytelling', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'vlog', label: language === 'vi' ? 'Vlog cá nhân' : 'Personal Vlog', icon: <Video className="w-5 h-5" /> },
    { id: 'unboxing', label: language === 'vi' ? 'Đập hộp' : 'Unboxing', icon: <Video className="w-5 h-5" /> },
    { id: 'tutorial', label: language === 'vi' ? 'Hướng dẫn sử dụng' : 'Tutorial', icon: <Video className="w-5 h-5" /> },
  ];

  const dialogueTypes: { id: DialogueType; label: string; desc: string; icon: React.ReactNode }[] = [
    { 
      id: 'self-talk', 
      label: language === 'vi' ? 'Nhân vật tự thoại' : 'Character Self-talk', 
      desc: language === 'vi' ? 'Nhân vật nói trực tiếp và khớp khẩu hình.' : 'Character speaks directly with lip-sync.',
      icon: <Mic className="w-5 h-5" />
    },
    { 
      id: 'no-read', 
      label: language === 'vi' ? 'Nhân vật không đọc thoại' : 'Character doesn\'t read', 
      desc: language === 'vi' ? 'Có lời thoại nhưng nhân vật không mấp máy môi.' : 'Dialogue exists but character doesn\'t speak.',
      icon: <MicOff className="w-5 h-5" />
    },
    { 
      id: 'none', 
      label: language === 'vi' ? 'Không có thoại' : 'No dialogue', 
      desc: language === 'vi' ? 'Video chỉ có âm nhạc và hiệu ứng âm thanh.' : 'Video only has music and sound effects.',
      icon: <MicOff className="w-5 h-5" />
    },
  ];

  const tones = [
    { id: 'energetic', label: language === 'vi' ? 'Năng động' : 'Energetic' },
    { id: 'professional', label: language === 'vi' ? 'Chuyên nghiệp' : 'Professional' },
    { id: 'friendly', label: language === 'vi' ? 'Thân thiện' : 'Friendly' },
    { id: 'luxury', label: language === 'vi' ? 'Sang trọng' : 'Luxury' },
    { id: 'funny', label: language === 'vi' ? 'Hài hước' : 'Funny' },
    { id: 'emotional', label: language === 'vi' ? 'Cảm xúc' : 'Emotional' },
  ];

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-indigo-600" />
          {language === 'vi' ? 'Định hướng kịch bản' : 'Script Orientation'}
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          {language === 'vi' 
            ? 'Xác định phong cách và cách thức thể hiện lời thoại cho video của bạn.' 
            : 'Define the style and dialogue approach for your video.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-500" />
              {language === 'vi' ? 'Phong cách quảng cáo' : 'Ad Style'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => updateOrientation({ style: style.id })}
                  className={`p-4 rounded-2xl border-2 transition-all text-left space-y-2 ${
                    orientation.style === style.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                      : 'border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/50'
                  }`}
                >
                  <div className={orientation.style === style.id ? 'text-indigo-600' : 'text-zinc-400'}>
                    {style.icon}
                  </div>
                  <div className="text-sm font-bold">{style.label}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-500" />
              {language === 'vi' ? 'Kịch bản lời thoại' : 'Dialogue Script'}
            </h3>
            <div className="space-y-3">
              {dialogueTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => updateOrientation({ dialogueType: type.id })}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                    orientation.dialogueType === type.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    orientation.dialogueType === type.id ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${orientation.dialogueType === type.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-900 dark:text-white'}`}>
                      {type.label}
                    </div>
                    <div className="text-xs text-zinc-500">{type.desc}</div>
                  </div>
                  {orientation.dialogueType === type.id && (
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              {language === 'vi' ? 'Nội dung bổ sung' : 'Additional Content'}
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase">{language === 'vi' ? 'Đối tượng mục tiêu' : 'Target Audience'}</label>
                <input
                  type="text"
                  value={orientation.targetAudience || ''}
                  onChange={(e) => updateOrientation({ targetAudience: e.target.value })}
                  placeholder={language === 'vi' ? 'VD: Mẹ bỉm sữa, Gen Z, Dân văn phòng...' : 'e.g. Busy moms, Gen Z, Office workers...'}
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase">{language === 'vi' ? 'Thông điệp chính' : 'Key Message'}</label>
                <input
                  type="text"
                  value={orientation.keyMessage || ''}
                  onChange={(e) => updateOrientation({ keyMessage: e.target.value })}
                  placeholder={language === 'vi' ? 'VD: Giải pháp tiết kiệm thời gian tối ưu...' : 'e.g. The ultimate time-saving solution...'}
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase">{language === 'vi' ? 'Tông giọng' : 'Tone of Voice'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {tones.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => updateOrientation({ toneOfVoice: tone.id })}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                        orientation.toneOfVoice === tone.id
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:border-indigo-300'
                      }`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              {language === 'vi' ? 'Ghi chú đặc biệt' : 'Special Notes'}
            </h3>
            <textarea
              value={orientation.additionalNotes || ''}
              onChange={(e) => updateOrientation({ additionalNotes: e.target.value })}
              placeholder={language === 'vi' ? 'Nhập thêm yêu cầu đặc biệt cho kịch bản...' : 'Enter special requirements for the script...'}
              className="w-full h-24 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
            />
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-3xl mx-auto flex gap-4">
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-2xl transition-all flex items-center justify-center gap-4 ${
              isLoading 
                ? 'bg-zinc-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-indigo-200 dark:shadow-none'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <div className="text-left">
                  <div className="text-sm font-bold">{t('generatingScript')}</div>
                  <div className="text-[10px] font-normal opacity-70">Gemini 3 Flash • {t('aiAnalyzing')}</div>
                </div>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span className="text-lg uppercase tracking-tight">{t('generateScript')}</span>
              </>
            )}
          </button>

          {product.scriptOrientation && !isLoading && (
            <button
              onClick={onNext}
              className="px-8 py-4 rounded-2xl font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg uppercase tracking-tight">{t('next') || 'Tiếp theo'}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          )}
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
