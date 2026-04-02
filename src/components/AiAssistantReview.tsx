import React from 'react';
import { ReviewResult } from '../types';
import { ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AiAssistantReviewProps {
  review: ReviewResult | null;
  isReviewing: boolean;
  onRefine?: () => void;
  language: 'en' | 'vi';
  type: 'script' | 'image';
}

export function AiAssistantReview({ review, isReviewing, onRefine, language, type }: AiAssistantReviewProps) {
  const t = {
    vi: {
      title: type === 'script' ? 'Trợ lý AI: Kiểm tra Kịch bản' : 'Trợ lý AI: Kiểm tra Hình ảnh',
      working: 'Trợ lý AI đang phân tích nội dung...',
      score: 'Điểm chất lượng',
      feedback: 'Đánh giá chi tiết',
      suggestions: 'Gợi ý cải thiện',
      refine: 'Tự động tối ưu kịch bản',
      autoFixed: 'Đã tự động sửa lỗi',
      status: {
        excellent: 'Xuất sắc',
        good: 'Tốt',
        'needs-improvement': 'Cần cải thiện',
        poor: 'Kém'
      }
    },
    en: {
      title: type === 'script' ? 'AI Assistant: Script Review' : 'AI Assistant: Image Review',
      working: 'AI Assistant is analyzing content...',
      score: 'Quality Score',
      feedback: 'Detailed Review',
      suggestions: 'Improvement Suggestions',
      refine: 'Auto-refine Script',
      autoFixed: 'Auto-fixed issues',
      status: {
        excellent: 'Excellent',
        good: 'Good',
        'needs-improvement': 'Needs Improvement',
        poor: 'Poor'
      }
    }
  }[language];

  if (isReviewing) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-100">{t.title}</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 animate-pulse">{t.working}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!review) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'good': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'needs-improvement': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'poor': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden mb-6 shadow-sm"
    >
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(review.status)}`}>
          {t.status[review.status as keyof typeof t.status]}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col items-center justify-center border-r border-zinc-100 dark:border-zinc-800 pr-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-zinc-100 dark:text-zinc-800"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * review.score) / 100}
                  strokeLinecap="round"
                  className={getScoreColor(review.score)}
                />
              </svg>
              <span className={`absolute text-xl font-bold ${getScoreColor(review.score)}`}>
                {review.score}
              </span>
            </div>
            <span className="text-xs text-zinc-500 mt-2 uppercase tracking-wider font-semibold">{t.score}</span>
          </div>

          <div className="md:col-span-3">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {t.feedback}
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {review.feedback}
              </p>
            </div>

            {review.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  {t.suggestions}
                </h4>
                <ul className="space-y-2">
                  {review.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-1.5 shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.autoFixed && (
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4" />
                {t.autoFixed}
              </div>
            )}

            {type === 'script' && review.score < 90 && !review.autoFixed && onRefine && (
              <button
                onClick={onRefine}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
              >
                <Wand2 className="w-4 h-4" />
                {t.refine}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
