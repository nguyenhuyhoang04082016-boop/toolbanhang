import React, { useState, useEffect } from 'react';
import { AffiliateChannelInfo, AffiliateIdea, Language } from '../types';
import { 
  LayoutDashboard, 
  Target, 
  Users, 
  Zap, 
  Sparkles, 
  Send, 
  Copy, 
  Download, 
  RefreshCw, 
  Plus, 
  X, 
  Check,
  ChevronRight,
  Globe,
  Video,
  Image as ImageIcon,
  Trash2,
  Loader2
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { generateAffiliateIdeas } from '../services/geminiService';

interface AffiliateChannelTabProps {
  language: Language;
  onSendToImages: (idea: AffiliateIdea) => void;
  onSendToVideo: (idea: AffiliateIdea) => void;
}

const INITIAL_STATE: AffiliateChannelInfo = {
  platform: 'TikTok',
  channelType: 'Kênh review sản phẩm',
  channelGoal: 'Kiếm hoa hồng affiliate',
  channelName: '',
  channelDescription: '',
  mainTopic: '',
  subTopics: [],
  targetAudience: [],
  customerInsight: '',
  customerPainPoints: '',
  productBenefits: '',
  contentStyle: [],
  contentTone: 'Thân thiện',
  targetVideoLength: '30 giây',
  postingFrequency: '1 video/ngày',
  hookType: [],
  scriptStructure: 'Hook → Vấn đề → Giải pháp → CTA',
  ideaCount: 5,
  segmentCount: 5,
  diversityLevel: 'Medium',
  ctaText: '',
  specialRequirements: ''
};

export const AffiliateChannelTab: React.FC<AffiliateChannelTabProps> = ({ 
  language, 
  onSendToImages, 
  onSendToVideo 
}) => {
  const { t } = useTranslation(language);
  const [formData, setFormData] = useState<AffiliateChannelInfo>(() => {
    const saved = localStorage.getItem('affiliate_channel_data');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  const [newSubTopic, setNewSubTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<AffiliateIdea[]>(() => {
    const saved = localStorage.getItem('affiliate_results');
    return saved ? JSON.parse(saved) : [];
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('affiliate_channel_data', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem('affiliate_results', JSON.stringify(results));
  }, [results]);

  const handleInputChange = (field: keyof AffiliateChannelInfo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMultiSelect = (field: 'targetAudience' | 'contentStyle' | 'hookType', value: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const addSubTopic = () => {
    if (newSubTopic.trim() && !formData.subTopics.includes(newSubTopic.trim())) {
      handleInputChange('subTopics', [...formData.subTopics, newSubTopic.trim()]);
      setNewSubTopic('');
    }
  };

  const removeSubTopic = (topic: string) => {
    handleInputChange('subTopics', formData.subTopics.filter(t => t !== topic));
  };

  const handleReset = () => {
    if (confirm(t('confirmDelete'))) {
      setFormData(INITIAL_STATE);
      setResults([]);
      localStorage.removeItem('affiliate_channel_data');
      localStorage.removeItem('affiliate_results');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const ideas = await generateAffiliateIdeas(formData, language);
      setResults(ideas);
    } catch (error) {
      console.error("Error generating affiliate ideas:", error);
      alert(language === 'vi' ? "Có lỗi xảy ra khi tạo kịch bản. Vui lòng thử lại." : "Error generating scripts. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAll = (idea: AffiliateIdea) => {
    const text = `
Concept: ${idea.conceptTitle}
Platform: ${idea.platform}
Topic: ${idea.topic}
Hook: ${idea.hookText}
CTA: ${idea.cta}

Script:
${idea.scenes.map(s => `Scene ${s.scene}:
Script: ${s.script}
Visual: ${s.visualDescription}`).join('\n\n')}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopiedId(idea.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const platforms = ['Facebook', 'TikTok', 'YouTube Shorts', 'Instagram Reels', 'Shopee Video', 'Đa nền tảng'];
  const channelTypes = ['Kênh cá nhân', 'Kênh review sản phẩm', 'Kênh giải trí', 'Kênh kể chuyện', 'Kênh chia sẻ mẹo vặt', 'Kênh AI content', 'Kênh viral', 'Kênh bán hàng trực tiếp'];
  const channelGoals = ['Tăng đơn hàng', 'Tăng lượt xem', 'Xây thương hiệu cá nhân', 'Thu hút traffic', 'Kiếm hoa hồng affiliate', 'Nuôi page / nuôi kênh lâu dài'];
  const audiences = ['Nam', 'Nữ', '18-24', '25-34', '35-44', '45+', 'Mẹ bỉm sữa', 'Dân văn phòng', 'Người nuôi thú cưng', 'Sinh viên', 'Người nội trợ', 'Người thích săn deal'];
  const contentStyles = ['Hài hước', 'Chân thật', 'Viral', 'Storytelling', 'So sánh', 'Review trải nghiệm', 'Chuyên gia tư vấn', 'Bắt trend', 'POV', 'Drama nhẹ', 'Giật tít cuốn hút'];
  const tones = ['Thân thiện', 'Gần gũi', 'Bán hàng mạnh', 'Chuyên nghiệp', 'Hài hước', 'Năng lượng cao', 'Tò mò, kích thích xem tiếp'];
  const videoLengths = ['8 giây', '15 giây', '30 giây', '45 giây', '60 giây'];
  const frequencies = ['1 video/ngày', '2 video/ngày', '3 video/ngày', '5 video/tuần', 'linh hoạt'];
  const hookTypes = ['Câu hỏi gây tò mò', 'Sự thật bất ngờ', 'Sai lầm thường gặp', 'Tình huống thực tế', 'Before / After', 'So sánh trực diện', 'Drama ngắn', 'Hook bán hàng mạnh', 'Hook kiểu review thật', 'Hook kiểu bắt trend'];
  const structures = ['Hook → Vấn đề → Giải pháp → CTA', 'Hook → Review nhanh → CTA', 'Hook → Story → Chốt đơn', 'Hook → So sánh → Kết luận → CTA', 'Hook → Demo sản phẩm → CTA', 'Hook → Pain point → Reveal → CTA'];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Globe className="w-6 h-6 text-white" />
            </div>
            {t('affiliateChannel')}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {t('affiliateStrategyDesc')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('resetForm')}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t('generateAffiliateScript')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Block A: Platform Info */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">{t('platformInfo')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('selectPlatform')}</label>
              <select
                value={formData.platform}
                onChange={(e) => handleInputChange('platform', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('channelType')}</label>
              <select
                value={formData.channelType}
                onChange={(e) => handleInputChange('channelType', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {channelTypes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('channelGoal')}</label>
              <select
                value={formData.channelGoal}
                onChange={(e) => handleInputChange('channelGoal', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {channelGoals.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('channelName')}</label>
              <input
                type="text"
                value={formData.channelName}
                onChange={(e) => handleInputChange('channelName', e.target.value)}
                placeholder="e.g. Review đồ gia dụng thông minh"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('channelDescription')}</label>
            <textarea
              value={formData.channelDescription}
              onChange={(e) => handleInputChange('channelDescription', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
              placeholder="Mô tả phong cách tổng thể, định vị nội dung..."
            />
          </div>
        </div>

        {/* Block B: Content Direction */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">{t('contentDirection')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('mainTopic')}</label>
              <input
                type="text"
                value={formData.mainTopic}
                onChange={(e) => handleInputChange('mainTopic', e.target.value)}
                placeholder="e.g. đồ gia dụng, mỹ phẩm..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('subTopics')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubTopic}
                  onChange={(e) => setNewSubTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSubTopic()}
                  placeholder="Thêm chủ đề phụ..."
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <button
                  onClick={addSubTopic}
                  className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.subTopics.map(topic => (
                  <span key={topic} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-2 border border-emerald-100 dark:border-emerald-800">
                    {topic}
                    <button onClick={() => removeSubTopic(topic)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">{t('targetAudience')}</label>
            <div className="flex flex-wrap gap-2">
              {audiences.map(a => (
                <button
                  key={a}
                  onClick={() => toggleMultiSelect('targetAudience', a)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    formData.targetAudience.includes(a)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('customerInsight')}</label>
              <textarea
                value={formData.customerInsight}
                onChange={(e) => handleInputChange('customerInsight', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
                placeholder="Thích giá rẻ nhưng vẫn cần chất lượng..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('customerPainPoints')}</label>
              <textarea
                value={formData.customerPainPoints}
                onChange={(e) => handleInputChange('customerPainPoints', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
                placeholder="Sợ mua hàng không đúng như quảng cáo..."
              />
            </div>
          </div>
        </div>

        {/* Block C: Script Setup */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">{t('affiliateScriptSetup')}</h3>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">{t('hookType')}</label>
            <div className="flex flex-wrap gap-2">
              {hookTypes.map(h => (
                <button
                  key={h}
                  onClick={() => toggleMultiSelect('hookType', h)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    formData.hookType.includes(h)
                      ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-amber-500'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('scriptStructure')}</label>
              <select
                value={formData.scriptStructure}
                onChange={(e) => handleInputChange('scriptStructure', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {structures.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('contentTone')}</label>
              <select
                value={formData.contentTone}
                onChange={(e) => handleInputChange('contentTone', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                {tones.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('ideaCount')}</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.ideaCount}
                onChange={(e) => handleInputChange('ideaCount', parseInt(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('segmentCount')}</label>
              <input
                type="number"
                min="3"
                max="8"
                value={formData.segmentCount}
                onChange={(e) => handleInputChange('segmentCount', parseInt(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('ctaText')}</label>
            <input
              type="text"
              value={formData.ctaText}
              onChange={(e) => handleInputChange('ctaText', e.target.value)}
              placeholder="e.g. Link sản phẩm ở bio, Comment để nhận link..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('specialRequirements')}</label>
            <textarea
              value={formData.specialRequirements}
              onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
              placeholder="Ví dụ: ưu tiên nội dung viral kiểu TikTok, tránh nói quá lộ bán hàng..."
            />
          </div>
        </div>

        {/* Block D: Results Display */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">{t('outputResults')}</h3>
            </div>
            {results.length > 0 && (
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `affiliate-scripts-${Date.now()}.json`;
                  a.click();
                }}
                className="text-xs font-bold text-zinc-500 hover:text-emerald-600 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('exportJson')}
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-zinc-300" />
              </div>
              <p className="text-zinc-500 text-sm">{t('resultsWillShowHereAffiliate')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((idea) => (
                <div key={idea.id} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-emerald-500/50 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{idea.platform} • {idea.topic}</span>
                      <h4 className="font-bold text-zinc-900 dark:text-white">{idea.conceptTitle}</h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyAll(idea)}
                        className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-emerald-600 transition-all"
                        title={t('copyAll')}
                      >
                        {copiedId === idea.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">{t('hook')}</span>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium italic">"{idea.hookText}"</p>
                    </div>

                    <div className="space-y-2">
                      {idea.scenes.slice(0, 2).map((scene) => (
                        <div key={scene.scene} className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                          <span className="font-bold text-zinc-400 mr-2">{scene.scene}.</span>
                          {scene.script}
                        </div>
                      ))}
                      {idea.scenes.length > 2 && <div className="text-[10px] text-zinc-400 font-bold italic">+{idea.scenes.length - 2} scenes more...</div>}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-2">
                    <button
                      onClick={() => onSendToImages(idea)}
                      className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-3 h-3" />
                      {t('sendToImages')}
                    </button>
                    <button
                      onClick={() => onSendToVideo(idea)}
                      className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-3 h-3" />
                      {t('sendToVideo')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
