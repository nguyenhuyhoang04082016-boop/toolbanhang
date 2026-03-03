import React, { useState, useEffect } from 'react';
import { ProductInfo, Platform, VideoRatio, HookStyle, CTAType, VoiceoverStyle, VoiceoverSpeed } from '../types';
import { Info, Plus, X, AlertCircle, Sparkles, Save, Upload, Image as ImageIcon } from 'lucide-react';

interface ProductFormProps {
  onSubmit: (data: ProductInfo) => void;
  onSaveTemplate: (data: ProductInfo) => void;
  isLoading: boolean;
  initialValue?: ProductInfo | null;
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
  voiceoverStyle: 'neutral',
  voiceoverSpeed: 'normal',
  onScreenText: true,
};

const benefitOptions = ['Tiết kiệm thời gian', 'Tiết kiệm chi phí', 'Chất lượng cao', 'Thân thiện môi trường', 'Dễ sử dụng', 'Sáng tạo'];

export const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, onSaveTemplate, isLoading, initialValue }) => {
  const [formData, setFormData] = useState<ProductInfo>(initialData);
  const [featureInput, setFeatureInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialValue) {
      setFormData(initialValue);
    }
  }, [initialValue]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Tên sản phẩm là bắt buộc';
    if (!formData.category) newErrors.category = 'Danh mục là bắt buộc';
    if (!formData.targetUser) newErrors.targetUser = 'Đối tượng mục tiêu là bắt buộc';
    if (formData.benefits.length === 0 && !formData.customBenefit) newErrors.benefits = 'Cần ít nhất một lợi ích';
    if (formData.features.length === 0) newErrors.features = 'Cần ít nhất một tính năng';
    if (!formData.audienceDesc) newErrors.audienceDesc = 'Mô tả khán giả là bắt buộc';
    if (!formData.painPoint) newErrors.painPoint = 'Nỗi đau chính là bắt buộc';
    if (formData.price < 0) newErrors.price = 'Giá phải lớn hơn hoặc bằng 0';
    
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
      voiceoverStyle: 'female',
      voiceoverSpeed: 'normal',
      onScreenText: true,
      brandName: 'PetPurr',
      brandSlogan: 'Chăm sóc thông minh cho thú cưng hạnh phúc',
      musicVibe: 'Chill lo-fi beats',
    });
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
          Thông tin sản phẩm
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSaveTemplate(formData)}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            Lưu mẫu
          </button>
          <button
            type="button"
            onClick={fillSample}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Điền mẫu thử
          </button>
        </div>
      </div>

      {/* Section A: Product Basics */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">A. Thông tin cơ bản</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tên sản phẩm *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.name ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
              placeholder="VD: Máy cho ăn PetPurr"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Danh mục *</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.category ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
              placeholder="VD: Đồ dùng thú cưng"
            />
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Đối tượng mục tiêu *</label>
          <input
            type="text"
            value={formData.targetUser}
            onChange={(e) => setFormData({ ...formData, targetUser: e.target.value })}
            className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.targetUser ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
            placeholder="VD: Chủ nuôi mèo bận rộn"
          />
          {errors.targetUser && <p className="text-xs text-red-500 mt-1">{errors.targetUser}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Lợi ích chính *</label>
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
            placeholder="Thêm lợi ích khác..."
          />
          {errors.benefits && <p className="text-xs text-red-500 mt-1">{errors.benefits}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tính năng nổi bật *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Thêm tính năng..."
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
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Giá *</label>
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
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Khuyến mãi (Không bắt buộc)</label>
            <input
              type="text"
              value={formData.promotion || ''}
              onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="VD: Giảm 20% hôm nay"
            />
          </div>
        </div>
      </div>

      {/* Section B: Audience & Positioning */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">B. Khán giả & Định vị</h3>
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mô tả khán giả *</label>
          <textarea
            value={formData.audienceDesc}
            onChange={(e) => setFormData({ ...formData, audienceDesc: e.target.value })}
            className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.audienceDesc ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20`}
            placeholder="Mô tả độ tuổi, tính cách, nhu cầu..."
          />
          {errors.audienceDesc && <p className="text-xs text-red-500 mt-1">{errors.audienceDesc}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nỗi đau chính *</label>
            <input
              type="text"
              value={formData.painPoint}
              onChange={(e) => setFormData({ ...formData, painPoint: e.target.value })}
              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.painPoint ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
              placeholder="VD: Không có thời gian cho thú cưng ăn"
            />
            {errors.painPoint && <p className="text-xs text-red-500 mt-1">{errors.painPoint}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cảm xúc mong muốn *</label>
            <input
              type="text"
              value={formData.emotion}
              onChange={(e) => setFormData({ ...formData, emotion: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="VD: Dễ thương, Khẩn cấp, Sang trọng"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Định vị thương hiệu *</label>
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
                {p === 'budget' ? 'Giá rẻ' : p === 'mid' ? 'Tầm trung' : 'Cao cấp'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section C: Ad Requirements */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">C. Yêu cầu quảng cáo</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nền tảng *</label>
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
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tỷ lệ video *</label>
            <select
              value={formData.ratio}
              onChange={(e) => setFormData({ ...formData, ratio: e.target.value as VideoRatio })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="9:16">9:16 (Dọc)</option>
              <option value="1:1">1:1 (Vuông)</option>
              <option value="16:9">16:9 (Ngang)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tổng thời lượng (s) *</label>
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
                Sẽ được làm tròn thành {Math.ceil(formData.totalLength / 8) * 8}s
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Kiểu Hook *</label>
            <select
              value={formData.hookStyle}
              onChange={(e) => setFormData({ ...formData, hookStyle: e.target.value as HookStyle })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="question">Câu hỏi</option>
              <option value="shock">Gây sốc/Bất ngờ</option>
              <option value="story">Kể chuyện</option>
              <option value="problem-solution">Vấn đề - Giải pháp</option>
              <option value="testimonial">Lời chứng thực</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Loại CTA *</label>
          <select
            value={formData.ctaType}
            onChange={(e) => setFormData({ ...formData, ctaType: e.target.value as CTAType })}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="buy now">Mua ngay</option>
            <option value="message inbox">Nhắn tin</option>
            <option value="click link">Click vào link</option>
            <option value="comment keyword">Comment từ khóa</option>
          </select>
        </div>
      </div>

      {/* Section D: Creative Assets */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">D. Tài sản sáng tạo</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tên thương hiệu (Opt)</label>
            <input
              type="text"
              value={formData.brandName || ''}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Slogan (Opt)</label>
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
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Giới tính giọng đọc *</label>
            <select
              value={formData.voiceoverStyle}
              onChange={(e) => setFormData({ ...formData, voiceoverStyle: e.target.value as VoiceoverStyle })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="neutral">Trung tính</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tốc độ đọc *</label>
            <select
              value={formData.voiceoverSpeed}
              onChange={(e) => setFormData({ ...formData, voiceoverSpeed: e.target.value as VoiceoverSpeed })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <option value="slow">Chậm</option>
              <option value="normal">Bình thường</option>
              <option value="fast">Nhanh</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cho phép chữ trên màn hình?</label>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, onScreenText: !formData.onScreenText })}
            className={`w-12 h-6 rounded-full transition-all relative ${
              formData.onScreenText ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
              formData.onScreenText ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Vibe âm nhạc (Opt)</label>
          <input
            type="text"
            value={formData.musicVibe || ''}
            onChange={(e) => setFormData({ ...formData, musicVibe: e.target.value })}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none"
            placeholder="VD: Sôi động, Chill lo-fi"
          />
        </div>
      </div>

      {/* Section E: Visual Context */}
      <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">E. Ảnh mẫu tham khảo</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Direct Images */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              Ảnh trực tiếp sản phẩm
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
                <span className="text-[10px] text-zinc-500 mt-1">Tải lên</span>
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
              Ảnh sử dụng sản phẩm
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
                <span className="text-[10px] text-zinc-500 mt-1">Tải lên</span>
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
                <span className="text-[8px] opacity-70">Gemini 3 Flash</span>
              </div>
              Đang tạo kịch bản...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Tạo kịch bản quảng cáo
            </>
          )}
        </button>
      </div>
    </form>
  );
};
