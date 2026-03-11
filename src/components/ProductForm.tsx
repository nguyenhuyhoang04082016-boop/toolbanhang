import React, { useState, useEffect } from 'react';
import { ProductInfo, Platform, VideoRatio, HookStyle, CTAType, VoiceoverStyle, VoiceoverSpeed, Language, AdScript } from '../types';
import { Info, Plus, X, AlertCircle, Sparkles, Save, Upload, Image as ImageIcon, Video } from 'lucide-react';
import { useTranslation } from '../i18n';

interface ProductFormProps {
  onSubmit: (data: ProductInfo) => void;
  onSaveTemplate: (data: ProductInfo) => void;
  isLoading: boolean;
  initialValue?: ProductInfo | null;
  language: Language;
  currentScript?: AdScript | null;
}

const initialData: ProductInfo = {
  name: '',
  category: '',
  targetUser: '',
  benefits: [],
  customBenefit: '',
  features: [],
  price: 0,
  currency: 'USD',
  audienceDesc: '',
  painPoint: '',
  emotion: 'Excited',
  positioning: 'mid',
  platform: 'TikTok',
  ratio: '9:16',
  totalLength: 32,
  hookStyle: 'problem-solution',
  ctaType: 'buy now',
  characterType: 'real',
  voiceoverStyle: 'neutral',
  voiceoverSpeed: 'normal',
  hasVoiceover: true,
  onScreenText: true,
};

const benefitOptionsVi = ['Tiết kiệm thời gian', 'Tiết kiệm chi phí', 'Chất lượng cao', 'Thân thiện môi trường', 'Dễ sử dụng', 'Sáng tạo'];
const benefitOptionsEn = ['Time-saving', 'Cost-saving', 'High quality', 'Eco-friendly', 'Easy to use', 'Creative'];

export const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, onSaveTemplate, isLoading, initialValue, language, currentScript }) => {
  const [formData, setFormData] = useState<ProductInfo>(initialData);
  const { t } = useTranslation(language);
  const [featureInput, setFeatureInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const benefitOptions = language === 'vi' ? benefitOptionsVi : benefitOptionsEn;

  useEffect(() => {
    if (initialValue) {
      setFormData(initialValue);
    }
  }, [initialValue]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = language === 'vi' ? 'Tên sản phẩm là bắt buộc' : 'Product name is required';
    if (!formData.category) newErrors.category = language === 'vi' ? 'Danh mục là bắt buộc' : 'Category is required';
    if (!formData.targetUser) newErrors.targetUser = language === 'vi' ? 'Đối tượng mục tiêu là bắt buộc' : 'Target user is required';
    if (formData.benefits.length === 0 && !formData.customBenefit) newErrors.benefits = language === 'vi' ? 'Cần ít nhất một lợi ích' : 'At least one benefit is required';
    if (formData.features.length === 0) newErrors.features = language === 'vi' ? 'Cần ít nhất một tính năng' : 'At least one feature is required';
    if (!formData.audienceDesc) newErrors.audienceDesc = language === 'vi' ? 'Mô tả khán giả là bắt buộc' : 'Audience description is required';
    if (!formData.painPoint) newErrors.painPoint = language === 'vi' ? 'Nỗi đau chính là bắt buộc' : 'Main pain point is required';
    if (formData.price < 0) newErrors.price = language === 'vi' ? 'Giá phải lớn hơn hoặc bằng 0' : 'Price must be greater than or equal to 0';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Ensure length is multiple of 8
      const roundedLength = Math.ceil(formData.totalLength / 8) * 8;
      onSubmit({ ...formData, totalLength: roundedLength });
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...formData.features];
    newFeatures.splice(index, 1);
    setFormData({ ...formData, features: newFeatures });
  };

  const toggleBenefit = (benefit: string) => {
    const newBenefits = formData.benefits.includes(benefit)
      ? formData.benefits.filter((b) => b !== benefit)
      : [...formData.benefits, benefit];
    setFormData({ ...formData, benefits: newBenefits });
  };

  const fillSample = () => {
    if (language === 'vi') {
      setFormData({
        name: 'Máy cho thú cưng ăn tự động PetPurr',
        category: 'Phụ kiện thú cưng',
        targetUser: 'Chủ nuôi bận rộn',
        benefits: ['Tiết kiệm thời gian', 'Dễ sử dụng'],
        customBenefit: 'Đảm bảo thú cưng được ăn đúng giờ ngay cả khi bạn về muộn.',
        features: ['Điều khiển qua App', 'Ghi âm giọng nói', 'Dung tích 10L', 'Pin dự phòng'],
        price: 89.99,
        currency: 'USD',
        audienceDesc: 'Những người trẻ bận rộn đi làm cả ngày và lo lắng cho thú cưng ở nhà.',
        painPoint: 'Lịch ăn uống không đều đặn khiến thú cưng lo lắng.',
        emotion: 'An tâm',
        positioning: 'premium',
        platform: 'TikTok',
        ratio: '9:16',
        totalLength: 32,
        hookStyle: 'problem-solution',
        ctaType: 'buy now',
        characterType: 'real',
        voiceoverStyle: 'female',
        voiceoverSpeed: 'normal',
        hasVoiceover: true,
        onScreenText: true,
        brandName: 'PetPurr',
        brandSlogan: 'Chăm sóc thông minh cho thú cưng hạnh phúc',
        musicVibe: 'Chill lo-fi beats',
      });
    } else {
      setFormData({
        name: 'PetPurr Automatic Pet Feeder',
        category: 'Pet Accessories',
        targetUser: 'Busy pet owners',
        benefits: ['Time-saving', 'Easy to use'],
        customBenefit: 'Ensures pets are fed on time even when you are late.',
        features: ['App Control', 'Voice Recording', '10L Capacity', 'Backup Battery'],
        price: 89.99,
        currency: 'USD',
        audienceDesc: 'Busy young professionals working all day and worrying about their pets at home.',
        painPoint: 'Irregular feeding schedules cause pet anxiety.',
        emotion: 'Peace of mind',
        positioning: 'premium',
        platform: 'TikTok',
        ratio: '9:16',
        totalLength: 32,
        hookStyle: 'problem-solution',
        ctaType: 'buy now',
        characterType: 'real',
        voiceoverStyle: 'female',
        voiceoverSpeed: 'normal',
        hasVoiceover: true,
        onScreenText: true,
        brandName: 'PetPurr',
        brandSlogan: 'Smart care for happy pets',
        musicVibe: 'Chill lo-fi beats',
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'usage') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({
          ...prev,
          [type === 'product' ? 'productImages' : 'usageImages']: [
            ...(prev[type === 'product' ? 'productImages' : 'usageImages'] || []),
            base64String
          ]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, type: 'product' | 'usage') => {
    setFormData(prev => {
      const field = type === 'product' ? 'productImages' : 'usageImages';
      const newImages = [...(prev[field] || [])];
      newImages.splice(index, 1);
      return { ...prev, [field]: newImages };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-500" />
          {t('productInfo')}
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSaveTemplate(formData)}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            {t('saveTemplate')}
          </button>
          <button
            type="button"
            onClick={fillSample}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            {language === 'vi' ? 'Điền mẫu thử' : 'Fill sample'}
          </button>
        </div>
      </div>

      {/* Section A: Product Basics */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">A. {language === 'vi' ? 'Thông tin cơ bản' : 'Basic Info'}</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('productName')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.name ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
              placeholder={language === 'vi' ? 'VD: Máy cho ăn PetPurr' : 'e.g. PetPurr Feeder'}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('category')} *</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.category ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
              placeholder={language === 'vi' ? 'VD: Đồ dùng thú cưng' : 'e.g. Pet Supplies'}
            />
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('targetUser')} *</label>
          <input
            type="text"
            value={formData.targetUser}
            onChange={(e) => setFormData({ ...formData, targetUser: e.target.value })}
            className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.targetUser ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
            placeholder={language === 'vi' ? 'VD: Chủ nuôi mèo bận rộn' : 'e.g. Busy cat owners'}
          />
          {errors.targetUser && <p className="text-xs text-red-500 mt-1">{errors.targetUser}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('benefits')} *</label>
          <div className="flex flex-wrap gap-2">
            {benefitOptions.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => toggleBenefit(b)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  formData.benefits.includes(b)
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'
                    : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={formData.customBenefit}
            onChange={(e) => setFormData({ ...formData, customBenefit: e.target.value })}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder={language === 'vi' ? 'Thêm lợi ích khác...' : 'Add other benefits...'}
          />
          {errors.benefits && <p className="text-xs text-red-500 mt-1">{errors.benefits}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('features')} *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={language === 'vi' ? 'Thêm tính năng...' : 'Add feature...'}
            />
            <button
              type="button"
              onClick={addFeature}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.features.map((f, i) => (
              <div key={i} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-700 dark:text-zinc-300">
                {f}
                <button type="button" onClick={() => removeFeature(i)} className="text-zinc-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          {errors.features && <p className="text-xs text-red-500 mt-1">{errors.features}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('price')} *</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-2 text-sm outline-none"
              >
                <option value="USD">USD</option>
                <option value="VND">VND</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('promotion')} ({language === 'vi' ? 'Không bắt buộc' : 'Optional'})</label>
            <input
              type="text"
              value={formData.promotion || ''}
              onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={language === 'vi' ? 'VD: Giảm 20% hôm nay' : 'e.g. 20% off today'}
            />
          </div>
        </div>
      </div>

      {/* Section B: Audience & Positioning */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">B. {language === 'vi' ? 'Khán giả & Định vị' : 'Audience & Positioning'}</h3>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('audienceDesc')} *</label>
          <textarea
            value={formData.audienceDesc}
            onChange={(e) => setFormData({ ...formData, audienceDesc: e.target.value })}
            className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.audienceDesc ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20`}
            placeholder={language === 'vi' ? 'Mô tả độ tuổi, tính cách, nhu cầu...' : 'Describe age, personality, needs...'}
          />
          {errors.audienceDesc && <p className="text-xs text-red-500 mt-1">{errors.audienceDesc}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('painPoint')} *</label>
            <input
              type="text"
              value={formData.painPoint}
              onChange={(e) => setFormData({ ...formData, painPoint: e.target.value })}
              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.painPoint ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
              placeholder={language === 'vi' ? 'VD: Không có thời gian cho thú cưng ăn' : 'e.g. No time to feed pets'}
            />
            {errors.painPoint && <p className="text-xs text-red-500 mt-1">{errors.painPoint}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('emotion')} *</label>
            <input
              type="text"
              value={formData.emotion}
              onChange={(e) => setFormData({ ...formData, emotion: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={language === 'vi' ? 'VD: Dễ thương, Khẩn cấp, Sang trọng' : 'e.g. Cute, Urgent, Premium'}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('positioning')} *</label>
          <div className="grid grid-cols-3 gap-2">
            {(['budget', 'mid', 'premium'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFormData({ ...formData, positioning: p })}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  formData.positioning === p
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                }`}
              >
                {p === 'budget' ? (language === 'vi' ? 'Giá rẻ' : 'Budget') : p === 'mid' ? (language === 'vi' ? 'Tầm trung' : 'Mid-range') : (language === 'vi' ? 'Cao cấp' : 'Premium')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section C: Ad Requirements */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">C. {language === 'vi' ? 'Yêu cầu quảng cáo' : 'Ad Requirements'}</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('platform')} *</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as Platform })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="TikTok">TikTok</option>
              <option value="Reels">Instagram Reels</option>
              <option value="FB">Facebook</option>
              <option value="YouTube Shorts">YouTube Shorts</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('ratio')} *</label>
            <select
              value={formData.ratio}
              onChange={(e) => setFormData({ ...formData, ratio: e.target.value as VideoRatio })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="9:16">9:16 ({language === 'vi' ? 'Dọc' : 'Vertical'})</option>
              <option value="1:1">1:1 ({language === 'vi' ? 'Vuông' : 'Square'})</option>
              <option value="16:9">16:9 ({language === 'vi' ? 'Ngang' : 'Horizontal'})</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('totalLength')} (s) *</label>
            <input
              type="number"
              step="8"
              value={formData.totalLength}
              onChange={(e) => setFormData({ ...formData, totalLength: parseInt(e.target.value) || 32 })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
            {formData.totalLength % 8 !== 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1">
                <AlertCircle className="w-3 h-3" />
                {language === 'vi' ? `Sẽ được làm tròn thành ${Math.ceil(formData.totalLength / 8) * 8}s` : `Will be rounded to ${Math.ceil(formData.totalLength / 8) * 8}s`}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('hookStyle')} *</label>
            <select
              value={formData.hookStyle}
              onChange={(e) => setFormData({ ...formData, hookStyle: e.target.value as HookStyle })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="question">{language === 'vi' ? 'Câu hỏi' : 'Question'}</option>
              <option value="shock">{language === 'vi' ? 'Gây sốc/Bất ngờ' : 'Shock/Surprise'}</option>
              <option value="story">{language === 'vi' ? 'Kể chuyện' : 'Storytelling'}</option>
              <option value="problem-solution">{language === 'vi' ? 'Vấn đề - Giải pháp' : 'Problem - Solution'}</option>
              <option value="testimonial">{language === 'vi' ? 'Lời chứng thực' : 'Testimonial'}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('characterType')} *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['real', 'cartoon'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, characterType: type })}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  formData.characterType === type
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                }`}
              >
                {type === 'real' ? t('realPerson') : t('cartoon')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('ctaType')} *</label>
          <select
            value={formData.ctaType}
            onChange={(e) => setFormData({ ...formData, ctaType: e.target.value as CTAType })}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="buy now">{language === 'vi' ? 'Mua ngay' : 'Buy now'}</option>
            <option value="message inbox">{language === 'vi' ? 'Nhắn tin' : 'Message inbox'}</option>
            <option value="click link">{language === 'vi' ? 'Click vào link' : 'Click link'}</option>
            <option value="comment keyword">{language === 'vi' ? 'Comment từ khóa' : 'Comment keyword'}</option>
          </select>
        </div>
      </div>

      {/* Section D: Creative Assets */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">D. {language === 'vi' ? 'Tài sản sáng tạo' : 'Creative Assets'}</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('brandName')} ({language === 'vi' ? 'Opt' : 'Optional'})</label>
            <input
              type="text"
              value={formData.brandName || ''}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('brandSlogan')} ({language === 'vi' ? 'Opt' : 'Optional'})</label>
            <input
              type="text"
              value={formData.brandSlogan || ''}
              onChange={(e) => setFormData({ ...formData, brandSlogan: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('voiceoverStyle')} *</label>
            <select
              value={formData.voiceoverStyle}
              onChange={(e) => setFormData({ ...formData, voiceoverStyle: e.target.value as VoiceoverStyle })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="male">{language === 'vi' ? 'Nam' : 'Male'}</option>
              <option value="female">{language === 'vi' ? 'Nữ' : 'Female'}</option>
              <option value="neutral">{language === 'vi' ? 'Trung tính' : 'Neutral'}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('voiceoverSpeed')} *</label>
            <select
              value={formData.voiceoverSpeed}
              onChange={(e) => setFormData({ ...formData, voiceoverSpeed: e.target.value as VoiceoverSpeed })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="slow">{language === 'vi' ? 'Chậm' : 'Slow'}</option>
              <option value="normal">{language === 'vi' ? 'Bình thường' : 'Normal'}</option>
              <option value="fast">{language === 'vi' ? 'Nhanh' : 'Fast'}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('musicVibe')} ({language === 'vi' ? 'Opt' : 'Optional'})</label>
          <input
            type="text"
            value={formData.musicVibe || ''}
            onChange={(e) => setFormData({ ...formData, musicVibe: e.target.value })}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            placeholder={language === 'vi' ? 'VD: Sôi động, Chill lo-fi' : 'e.g. Energetic, Chill lo-fi'}
          />
        </div>
      </div>

      {/* Section E: Visual Context */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">E. {language === 'vi' ? 'Ảnh mẫu tham khảo' : 'Visual Context'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Direct Images */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              {language === 'vi' ? 'Ảnh trực tiếp sản phẩm' : 'Direct product images'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(formData.productImages || []).map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                  <img src={img} alt="Product" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => removeImage(i, 'product')}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all">
                <Upload className="w-5 h-5 text-zinc-400" />
                <span className="text-[10px] text-zinc-500 mt-1">{language === 'vi' ? 'Tải lên' : 'Upload'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'product')}
                />
              </label>
            </div>
          </div>

          {/* Usage Images */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {language === 'vi' ? 'Ảnh sử dụng sản phẩm' : 'Product usage images'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(formData.usageImages || []).map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                  <img src={img} alt="Usage" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => removeImage(i, 'usage')}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all">
                <Upload className="w-5 h-5 text-zinc-400" />
                <span className="text-[10px] text-zinc-500 mt-1">{language === 'vi' ? 'Tải lên' : 'Upload'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'usage')}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Submit Button */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 p-4 z-40">
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
            isLoading 
              ? 'bg-zinc-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-[8px] opacity-70">Gemini 2.5 Flash</span>
              </div>
              {t('generatingScript')}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {t('generateScript')}
            </>
          )}
        </button>
      </div>

      {/* Script Tables Section */}
      {currentScript && (
        <div className="mt-12 space-y-12 pb-24">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-500" />
              {t('videoConstructionScript')}
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-16">#</th>
                    <th className="px-4 py-3">{t('visualDirection')}</th>
                    <th className="px-4 py-3">{t('voiceover')}</th>
                    <th className="px-4 py-3">SFX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {currentScript.segments.map((segment) => (
                    <tr key={segment.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-4 font-mono text-zinc-400">{segment.index}</td>
                      <td className="px-4 py-4 text-zinc-700 dark:text-zinc-300">{segment.visualDirection}</td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400 italic">"{segment.voiceover}"</td>
                      <td className="px-4 py-4 text-zinc-500">{segment.sfx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              {t('seamlessVoiceoverScript')}
            </h3>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {currentScript.seamlessScript}
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
