import React, { useState } from 'react';
import { ProductInfo, VisualTemplate, Language, ImageCategory } from '../types';
import { Sparkles, Upload, X, ShoppingCart, Trash2, Plus, Image as ImageIcon, Check, Layout } from 'lucide-react';
import { useTranslation } from '../i18n';
import { motion, AnimatePresence } from 'motion/react';

interface ProductAssetsTabProps {
  product: ProductInfo;
  visualTemplates: VisualTemplate[];
  onUpdate: (updates: Partial<ProductInfo>) => void;
  onDeleteTemplate: (id: string) => void;
  onUseTemplate: (template: VisualTemplate) => void;
  onNext: () => void;
  isLoading: boolean;
  language: Language;
}

export const ProductAssetsTab: React.FC<ProductAssetsTabProps> = ({ 
  product, 
  visualTemplates, 
  onUpdate, 
  onDeleteTemplate, 
  onUseTemplate, 
  onNext, 
  isLoading, 
  language 
}) => {
  const { t } = useTranslation(language);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const handleImageUpload = (categoryId: ImageCategory['id'], e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentCategories = [...(product.imageCategories || [])];
        const categoryIdx = currentCategories.findIndex(c => c.id === categoryId);

        if (categoryIdx > -1) {
          currentCategories[categoryIdx].images.push(base64String);
        } else {
          currentCategories.push({ id: categoryId, images: [base64String] });
        }

        onUpdate({ imageCategories: currentCategories });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (categoryId: ImageCategory['id'], index: number) => {
    const currentCategories = [...(product.imageCategories || [])];
    const categoryIdx = currentCategories.findIndex(c => c.id === categoryId);

    if (categoryIdx > -1) {
      currentCategories[categoryIdx].images.splice(index, 1);
      onUpdate({ imageCategories: currentCategories });
    }
  };

  const getCategoryImages = (categoryId: ImageCategory['id']) => {
    return product.imageCategories?.find(c => c.id === categoryId)?.images || [];
  };

  const selectedTemplate = visualTemplates.find(t => t.id === product.selectedTemplateId);

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <ImageIcon className="w-7 h-7 text-indigo-600" />
            {t('productImages')}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {language === 'vi' 
              ? 'Chọn mẫu nhân vật & bối cảnh, sau đó tải lên ảnh sản phẩm để tạo kịch bản.' 
              : 'Select character & environment template, then upload product images to generate script.'}
          </p>
        </div>
        <button
          onClick={() => setShowTemplateManager(true)}
          className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 text-sm font-semibold flex items-center gap-2 hover:bg-indigo-100 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {t('visualTemplateManager')}
          {visualTemplates.length > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
              {visualTemplates.length}
            </span>
          )}
        </button>
      </div>

      {/* Selected Template Preview */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
          <Sparkles className="w-4 h-4" />
          {t('selectedVisualTemplate')}
        </div>
        {selectedTemplate ? (
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white dark:border-zinc-800 shadow-sm">
                <img 
                  src={selectedTemplate.categories[0]?.images[0]} 
                  alt={selectedTemplate.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white">{selectedTemplate.name}</h4>
                <p className="text-xs text-zinc-500">
                  {selectedTemplate.categories.reduce((acc, cat) => acc + cat.images.length, 0)} {t('images')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTemplateManager(true)}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              {t('change')}
            </button>
          </div>
        ) : (
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm text-zinc-500">{t('noTemplateSelected')}</p>
            <button
              onClick={() => setShowTemplateManager(true)}
              className="px-6 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 transition-all"
            >
              {t('selectTemplate')}
            </button>
          </div>
        )}
      </section>

      {/* Product Specific Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
            <Layout className="w-4 h-4" />
            {t('product')}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {getCategoryImages('product').map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  onClick={() => removeImage('product', i)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
              <Upload className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 mb-1" />
              <span className="text-[10px] text-zinc-500 font-medium">{t('upload')}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload('product', e)} />
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
            <ImageIcon className="w-4 h-4" />
            {t('usage')}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {getCategoryImages('usage').map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  onClick={() => removeImage('usage', i)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
              <Upload className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 mb-1" />
              <span className="text-[10px] text-zinc-500 font-medium">{t('upload')}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload('usage', e)} />
            </label>
          </div>
        </div>
      </div>

      {/* Template Manager Dialog */}
      <AnimatePresence>
        {showTemplateManager && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-indigo-600" />
                  {t('visualTemplateManager')}
                </h3>
                <button onClick={() => setShowTemplateManager(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {visualTemplates.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingCart className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-zinc-500">{t('noTemplatesYet')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visualTemplates.map((template) => (
                      <div 
                        key={template.id}
                        className={`group relative border rounded-2xl p-4 transition-all ${
                          product.selectedTemplateId === template.id
                            ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                            <img 
                              src={template.categories[0]?.images[0]} 
                              alt={template.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-zinc-900 dark:text-white truncate">{template.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-1">
                              {new Date(template.timestamp).toLocaleDateString()}
                            </p>
                            <div className="flex gap-2 mt-2">
                              {product.selectedTemplateId === template.id ? (
                                <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  {t('selected')}
                                </span>
                              ) : (
                                <button
                                  onClick={() => onUseTemplate(template)}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500"
                                >
                                  {t('use')}
                                </button>
                              )}
                              <button
                                onClick={() => onDeleteTemplate(template.id)}
                                className="text-[10px] font-bold text-red-500 hover:text-red-400 ml-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <button
                  onClick={() => setShowTemplateManager(false)}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all"
                >
                  {t('done')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={onNext}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-2xl transition-all flex items-center justify-center gap-4 ${
              isLoading 
                ? 'bg-zinc-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-indigo-200 dark:shadow-none'
            }`}
          >
            <span className="text-lg uppercase tracking-tight">{t('next') || 'Tiếp theo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
