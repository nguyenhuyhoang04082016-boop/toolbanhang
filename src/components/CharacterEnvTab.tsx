import React, { useState } from 'react';
import { ProductInfo, ImageCategory, Language, VisualTemplate } from '../types';
import { Sparkles, Upload, X, Save, ArrowRight, User, Shirt, Image as ImageIcon, Briefcase, ShoppingCart, Trash2, Check, Plus } from 'lucide-react';
import { useTranslation } from '../i18n';

interface CharacterEnvTabProps {
  product: ProductInfo;
  visualTemplates: VisualTemplate[];
  onUpdate: (updates: Partial<ProductInfo>) => void;
  onSaveTemplate: (name: string) => void;
  onDeleteTemplate: (id: string) => void;
  onUseTemplate: (template: VisualTemplate) => void;
  onNext: () => void;
  language: Language;
}

const CATEGORIES: { id: ImageCategory['id']; icon: any }[] = [
  { id: 'character', icon: User },
  { id: 'costume', icon: Shirt },
  { id: 'background', icon: ImageIcon },
  { id: 'accessories', icon: Briefcase },
  { id: 'product', icon: ShoppingCart },
];

export const CharacterEnvTab: React.FC<CharacterEnvTabProps> = ({ 
  product, 
  visualTemplates,
  onUpdate, 
  onSaveTemplate, 
  onDeleteTemplate,
  onUseTemplate,
  onNext, 
  language 
}) => {
  const { t } = useTranslation(language);
  const [templateName, setTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

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

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            {t('characterAndEnv')}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {language === 'vi' 
              ? 'Tải lên hình ảnh nhân vật, trang phục và bối cảnh để AI tạo kịch bản bám sát thực tế.' 
              : 'Upload character, costume, and background images for AI to create a realistic script.'}
          </p>
        </div>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
        >
          <Save className="w-4 h-4" />
          {t('saveVisualTemplate')}
        </button>
      </div>

      {/* Visual Template Shopping Cart Section */}
      {visualTemplates.length > 0 && (
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {t('visualTemplateCart')}
              </h3>
            </div>
            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
              {visualTemplates.length} {language === 'vi' ? 'mẫu sẵn có' : 'templates available'}
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {visualTemplates.map((template) => (
              <div 
                key={template.id}
                className={`flex-shrink-0 w-64 snap-start group relative bg-white dark:bg-zinc-900 border rounded-2xl p-4 transition-all hover:shadow-lg ${
                  product.selectedTemplateId === template.id 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate pr-2">{template.name}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(template.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => onDeleteTemplate(template.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {template.categories.flatMap(c => c.images).slice(0, 4).map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
                      <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  {template.categories.flatMap(c => c.images).length === 0 && (
                    <div className="col-span-2 aspect-square bg-zinc-50 dark:bg-zinc-800/50 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-zinc-400 italic">{t('noImageYet')}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onUseTemplate(template)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    product.selectedTemplateId === template.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none'
                  }`}
                >
                  {product.selectedTemplateId === template.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {language === 'vi' ? 'Đã thêm' : 'Added'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      {language === 'vi' ? 'Thêm vào dự án' : 'Add to project'}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map(({ id, icon: Icon }) => (
          <div key={id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-wider text-xs">
              <Icon className="w-4 h-4" />
              {t(id as any)}
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {getCategoryImages(id).map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                  <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    onClick={() => removeImage(id, i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                <Upload className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 mb-1" />
                <span className="text-[10px] text-zinc-500 font-medium">{t('upload')}</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(id, e)} />
              </label>
            </div>
          </div>
        ))}
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('saveVisualTemplate')}</h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t('templateName')}</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder={language === 'vi' ? 'VD: Mẫu nhân vật công sở' : 'e.g. Office Character Template'}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-50 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  onSaveTemplate(templateName);
                  setShowSaveDialog(false);
                  setTemplateName('');
                }}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-2xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
          >
            <span className="text-lg uppercase tracking-tight">{t('nextStep')}</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
