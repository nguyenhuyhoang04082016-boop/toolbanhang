import React, { useState, useEffect } from 'react';
import { UsageStats, Language } from '../types';
import { getUsageStats } from '../services/costService';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, DollarSign, Zap, TrendingUp, TrendingDown, Clock, X } from 'lucide-react';
import { useTranslation } from '../i18n';

export const UsageDashboard: React.FC<{ language: Language }> = ({ language }) => {
  const [stats, setStats] = useState<UsageStats>(getUsageStats());
  const { t } = useTranslation(language);
  const [estimate, setEstimate] = useState<any>(null);
  const [actual, setActual] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleEstimate = (e: any) => {
      setEstimate(e.detail);
      setActual(null);
      setShowNotification(true);
    };

    const handleActual = (e: any) => {
      setActual(e.detail);
      setStats(getUsageStats());
      // Keep notification visible for a few seconds after actual result
      setTimeout(() => setShowNotification(false), 8000);
    };

    window.addEventListener('gemini_cost_estimate', handleEstimate);
    window.addEventListener('gemini_cost_actual', handleActual);

    return () => {
      window.removeEventListener('gemini_cost_estimate', handleEstimate);
      window.removeEventListener('gemini_cost_actual', handleActual);
    };
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(val);
  };

  const formatTokens = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val);
  };

  return (
    <>
      {/* Global Stats Bar */}
      <div className="bg-zinc-900 text-white px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-indigo-400" />
            <span>{t('totalUsage')}</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">{t('in')}:</span>
              <span className="text-white">{formatTokens(stats.totalInputTokens)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">{t('out')}:</span>
              <span className="text-white">{formatTokens(stats.totalOutputTokens)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          <DollarSign className="w-3 h-3 text-indigo-400" />
          <span className="text-indigo-400">{t('totalCost')}:</span>
          <span className="text-white">{formatCurrency(stats.totalCost)}</span>
        </div>
      </div>

      {/* Real-time Cost Notification */}
      <AnimatePresence>
        {showNotification && estimate && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[200] w-full max-w-md"
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t('apiTracker')}</span>
                </div>
                <button onClick={() => setShowNotification(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{t('model')}</span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{estimate.model}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{t('status')}</span>
                    <p className={`text-sm font-bold ${actual ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {actual ? t('completed') : t('processing')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">{t('inputTokens')}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-zinc-900 dark:text-white">
                        {actual ? formatTokens(actual.actualInputTokens) : formatTokens(estimate.inputTokens)}
                      </span>
                      {actual && (
                        <span className={`text-[10px] font-bold ${actual.actualInputTokens > estimate.inputTokens ? 'text-red-500' : 'text-emerald-500'}`}>
                          {actual.actualInputTokens > estimate.inputTokens ? '+' : ''}
                          {((actual.actualInputTokens - estimate.inputTokens) / estimate.inputTokens * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">{t('outputTokens')}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-zinc-900 dark:text-white">
                        {actual ? formatTokens(actual.actualOutputTokens) : '---'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase opacity-70">{t('estimatedCost')}</span>
                    <span className="text-sm font-bold">{formatCurrency(estimate.estimatedCost)}</span>
                  </div>
                  {actual && (
                    <>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-[10px] font-bold uppercase">{t('actualCost')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{formatCurrency(actual.actualCost)}</span>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${actual.actualCost > estimate.estimatedCost ? 'bg-red-500' : 'bg-emerald-500'}`}>
                            {actual.actualCost > estimate.estimatedCost ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs((actual.actualCost - estimate.estimatedCost) / estimate.estimatedCost * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
