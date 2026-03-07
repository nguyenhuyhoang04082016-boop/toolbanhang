import React from 'react';
import { SavedTemplate, Language } from '../types';
import { Trash2, Play, Calendar, Package, Tag, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '../i18n';

interface SavedTemplatesTabProps {
  templates: SavedTemplate[];
  onLoad: (template: SavedTemplate) => void;
  onDelete: (id: string) => void;
  language: Language;
}

export const SavedTemplatesTab: React.FC<SavedTemplatesTabProps> = ({ templates, onLoad, onDelete, language }) => {
  const { t } = useTranslation(language);

  if (templates.length === 0) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
          <Package className="w-8 h-8 text-zinc-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('noSavedTemplates')}</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            {t('noSavedTemplatesDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-500" />
          {t('savedProductTemplates')}
        </h2>
        <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
          {templates.length} {t('templates')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-indigo-500/50 transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <h3 className="font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {template.name || (language === 'vi' ? 'Sản phẩm không tên' : 'Unnamed Product')}
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {template.data.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(template.timestamp).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                  </span>
                  {(template.data.productImages?.length || 0) + (template.data.usageImages?.length || 0) > 0 && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <ImageIcon className="w-3 h-3" />
                      {(template.data.productImages?.length || 0) + (template.data.usageImages?.length || 0)} {t('images')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDelete(template.id)}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex flex-wrap gap-1.5">
                {template.data.features.slice(0, 3).map((f, i) => (
                  <span key={i} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[10px]">
                    {f}
                  </span>
                ))}
                {template.data.features.length > 3 && (
                  <span className="text-[10px] text-zinc-400">+{template.data.features.length - 3}</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2 italic">
                "{template.data.audienceDesc}"
              </p>
            </div>

            <button
              onClick={() => onLoad(template)}
              className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {t('useThisTemplate')}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
