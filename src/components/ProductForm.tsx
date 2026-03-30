import React, { useState, useEffect } from 'react';
import { ProductInfo, VideoRatio, Language, AdScript } from '../types';
import { Info, X, Sparkles, Save, Upload, Layout, Clock, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '../i18n';

interface ProductFormProps {
  onSubmit: (data: ProductInfo) => void;
  onSaveTemplate: (data: ProductInfo) => void;
  onChange?: (data: Partial<ProductInfo>) => void;
  isLoading: boolean;
  initialValue?: ProductInfo | null;
  language: Language;
  currentScript?: AdScript | null;
}

const initialData: ProductInfo = {
  name: '',
  category: '',
  ratio: '9:16',
  videoType: 'review',
  totalLength: 30,
  additionalRequirements: '',
  referenceImages: [],
};

export const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, onSaveTemplate, onChange, isLoading, initialValue, language, currentScript }) => {
  const [formData, setFormData] = useState<ProductInfo>(initialData);
  const { t } = useTranslation(language);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lastInitialValueRef = React.useRef<string>('');

  useEffect(() => {
    if (initialValue) {
      const initialValueStr = JSON.stringify(initialValue);
      if (initialValueStr !== lastInitialValueRef.current) {
        setFormData(initialValue);
        lastInitialValueRef.current = initialValueStr;
      }
    }
  }, [initialValue]);

  const updateFormData = (updates: Partial<ProductInfo>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      // Update ref immediately to prevent loop if parent re-renders
      lastInitialValueRef.current = JSON.stringify(newData);
      if (onChange) {
        onChange(updates);
      }
      return newData;
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = language === 'vi' ? 'Tên sản phẩm là bắt buộc' : 'Product name is required';
    if (!formData.referenceImages || formData.referenceImages.length === 0) {
      newErrors.referenceImages = language === 'vi' ? 'Cần ít nhất một ảnh sản phẩm' : 'At least one product image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentImages = [...(formData.referenceImages || [])];
    const newImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          updateFormData({ referenceImages: [...currentImages, ...newImages] });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.referenceImages || [])];
    newImages.splice(index, 1);
    updateFormData({ referenceImages: newImages });
  };

  const renderImageGrid = (images: string[], onRemove: (idx: number) => void, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, error?: string) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group bg-zinc-100 dark:bg-zinc-900">
            <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
          <Upload className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 mb-1" />
          <span className="text-[10px] text-zinc-500 font-medium">{t('uploadReferenceDesc').split('.')[0]}</span>
          <input type="file" multiple accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-10 pb-32 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Layout className="w-7 h-7 text-indigo-600" />
            {t('productInfo')}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">{language === 'vi' ? 'Cung cấp thông tin và hình ảnh để AI xây dựng kịch bản tối ưu.' : 'Provide info and images for AI to build an optimized script.'}</p>
        </div>
        <button
          type="button"
          onClick={() => onSaveTemplate(formData)}
          className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
        >
          <Save className="w-4 h-4" />
          {t('saveTemplate')}
        </button>
      </div>

      {/* Section 1: Basic Info */}
      <section className="space-y-6 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
          <Info className="w-4 h-4" />
          {language === 'vi' ? 'Thông tin cơ bản' : 'Basic Information'}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t('productName')} *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => updateFormData({ name: e.target.value })}
              className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${errors.name ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
              placeholder={language === 'vi' ? 'VD: Máy cho ăn PetPurr' : 'e.g. PetPurr Feeder'}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t('category')}</label>
            <input
              type="text"
              value={formData.category || ''}
              onChange={(e) => updateFormData({ category: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder={language === 'vi' ? 'VD: Đồ dùng thú cưng' : 'e.g. Pet Supplies'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              {t('totalLength')} (s)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="6"
                max="60"
                step="6"
                value={formData.totalLength || 30}
                onChange={(e) => updateFormData({ totalLength: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-lg font-bold text-indigo-600 w-12 text-center">
                {formData.totalLength || 30}s
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 italic">
              {language === 'vi' 
                ? `Tương đương ${Math.ceil((formData.totalLength || 30) / 6)} phân cảnh (6s/phân cảnh)`
                : `Equivalent to ${Math.ceil((formData.totalLength || 30) / 6)} segments (6s/segment)`}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t('ratio')} *</label>
            <div className="grid grid-cols-3 gap-4">
              {(['9:16', '1:1', '16:9'] as VideoRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updateFormData({ ratio: r })}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-3 ${
                    formData.ratio === r
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:border-indigo-300'
                  }`}
                >
                  <div className={`border-2 rounded ${
                    r === '9:16' ? 'w-3 h-5' : r === '1:1' ? 'w-4 h-4' : 'w-5 h-3'
                  } ${formData.ratio === r ? 'border-white' : 'border-zinc-400'}`} />
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t('videoType')} *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {(['review', 'cinematic', 'vlog', 'unboxing', 'tutorial'] as const).map((vt) => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => updateFormData({ videoType: vt })}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center text-center px-2 ${
                    formData.videoType === vt
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:border-indigo-300'
                  }`}
                >
                  {t(`videoType${vt.charAt(0).toUpperCase() + vt.slice(1)}` as any)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Main Product Images */}
      <section className="space-y-6 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
          <ImageIcon className="w-4 h-4" />
          {t('productReferenceImage')} *
        </div>
        {renderImageGrid(formData.referenceImages || [], (i) => removeImage(i), (e) => handleImageUpload(e), errors.referenceImages)}
      </section>

      {/* Section 4: Requirements */}
      <section className="space-y-6 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
          <Sparkles className="w-4 h-4" />
          {t('additionalRequirements')}
        </div>
        <textarea
          value={formData.additionalRequirements || ''}
          onChange={(e) => updateFormData({ additionalRequirements: e.target.value })}
          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32 resize-none"
          placeholder={language === 'vi' ? 'Nhập thêm các yêu cầu, phong cách hoặc lưu ý cho kịch bản...' : 'Enter additional requirements, style or notes for the script...'}
        />
      </section>

      {/* Floating Submit Button */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-2xl transition-all flex items-center justify-center gap-4 ${
              isLoading 
                ? 'bg-zinc-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-indigo-200 dark:shadow-none'
            }`}
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-lg uppercase tracking-tight">{t('nextStep')}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
