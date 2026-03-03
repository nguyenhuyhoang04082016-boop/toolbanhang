import React, { useState } from 'react';
import { AdSegment, AdScript } from '../types';
import { Reorder, AnimatePresence } from 'motion/react';
import { Copy, Download, RotateCcw, History, FileJson, FileText, Check, GripVertical, Edit3, Save, Zap } from 'lucide-react';

interface ScriptViewerProps {
  script: AdScript | null;
  history: AdScript[];
  onRegenerate: () => void;
  onRestore: (s: AdScript) => void;
  onUpdateSegments: (segments: AdSegment[]) => void;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({
  script,
  history,
  onRegenerate,
  onRestore,
  onUpdateSegments,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (!script) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
          <FileText className="w-10 h-10 text-zinc-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Chưa có kịch bản nào được tạo</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Hãy điền thông tin vào biểu mẫu bên trái và nhấn "Tạo kịch bản" để bắt đầu.
          </p>
        </div>
      </div>
    );
  }

  const copyAll = () => {
    const text = script.segments
      .map((s) => `Phân đoạn ${s.index} (${s.startTime}-${s.endTime}s)\nLồng tiếng: ${s.voiceover}\nHình ảnh: ${s.visualDirection}\nChữ trên màn hình: ${s.onScreenText}\nSFX: ${s.sfx}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadTxt = () => {
    const text = script.segments
      .map((s) => `Phân đoạn ${s.index} (${s.startTime}-${s.endTime}s)\nLồng tiếng: ${s.voiceover}\nHình ảnh: ${s.visualDirection}\nChữ trên màn hình: ${s.onScreenText}\nSFX: ${s.sfx}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kich-ban-qc-${script.productInfo.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kich-ban-qc-${script.productInfo.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
  };

  const handleReorder = (newSegments: AdSegment[]) => {
    const updated = newSegments.map((s, i) => ({
      ...s,
      index: i + 1,
      startTime: i * 8,
      endTime: (i + 1) * 8,
    }));
    onUpdateSegments(updated);
  };

  const updateSegment = (id: string, field: keyof AdSegment, value: string) => {
    const updated = script.segments.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    onUpdateSegments(updated);
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header Actions */}
      <div className="flex items-center justify-between sticky top-0 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md py-2 z-30">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Kịch bản đã tạo</h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
            {script.segments.length} Phân đoạn
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors relative"
            title="Lịch sử"
          >
            <History className="w-5 h-5" />
            {history.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-white dark:border-zinc-950" />
            )}
          </button>
          <button
            onClick={onRegenerate}
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            title="Tạo lại"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <button
            onClick={copyAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copiedAll ? 'Đã chép!' : 'Chép tất cả'}
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all">
              <Download className="w-4 h-4" />
              Xuất file
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={downloadTxt}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left rounded-t-xl"
              >
                <FileText className="w-4 h-4" />
                Văn bản (.txt)
              </button>
              <button
                onClick={downloadJson}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left rounded-b-xl"
              >
                <FileJson className="w-4 h-4" />
                Cấu trúc (.json)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <Reorder.Group
            axis="y"
            values={history}
            onReorder={() => {}}
            className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Lịch sử phiên bản</h3>
              <button onClick={() => setShowHistory(false)} className="text-xs text-indigo-600 font-medium">Đóng</button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Chưa có phiên bản cũ</p>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    onRestore(h);
                    setShowHistory(false);
                  }}
                  className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-indigo-500 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                      {h.productInfo.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                    {h.segments.length} phân đoạn • {h.tone} • {h.language.toUpperCase()}
                  </p>
                </div>
              ))
            )}
          </Reorder.Group>
        )}
      </AnimatePresence>

      {/* Segments List */}
      <Reorder.Group axis="y" values={script.segments} onReorder={handleReorder} className="space-y-4">
        {script.segments.map((segment) => (
          <SegmentCard
            key={segment.id}
            segment={segment}
            onUpdate={(field, val) => updateSegment(segment.id, field, val)}
          />
        ))}
      </Reorder.Group>
    </div>
  );
};

interface SegmentCardProps {
  segment: AdSegment;
  onUpdate: (field: keyof AdSegment, val: string) => void;
}

const SegmentCard: React.FC<SegmentCardProps> = ({ segment, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySegment = () => {
    const text = `Phân đoạn ${segment.index} (${segment.startTime}-${segment.endTime}s)\nLồng tiếng: ${segment.voiceover}\nHình ảnh: ${segment.visualDirection}\nChữ trên màn hình: ${segment.onScreenText}\nSFX: ${segment.sfx}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Reorder.Item
      value={segment}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex">
        {/* Drag Handle */}
        <div className="w-10 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing border-r border-zinc-100 dark:border-zinc-800">
          <GripVertical className="w-4 h-4 text-zinc-400" />
        </div>

        <div className="flex-1 p-5 space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {segment.index}
              </span>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Phân đoạn {segment.index}
                </h4>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                  {segment.startTime}s — {segment.endTime}s
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors"
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </button>
              <button
                onClick={copySegment}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Card Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Hướng dẫn hình ảnh</label>
                {isEditing ? (
                  <textarea
                    value={segment.visualDirection}
                    onChange={(e) => onUpdate('visualDirection', e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm outline-none h-20"
                  />
                ) : (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {segment.visualDirection}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Chữ trên màn hình</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={segment.onScreenText}
                    onChange={(e) => onUpdate('onScreenText', e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 italic">
                    "{segment.onScreenText}"
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Lời lồng tiếng</label>
                {isEditing ? (
                  <textarea
                    value={segment.voiceover}
                    onChange={(e) => onUpdate('voiceover', e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm outline-none h-20"
                  />
                ) : (
                  <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {segment.voiceover}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">SFX/Âm nhạc</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={segment.sfx}
                      onChange={(e) => onUpdate('sfx', e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-sm outline-none"
                    />
                  ) : (
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {segment.sfx}
                    </p>
                  )}
                </div>
                {segment.cameraNotes && (
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ghi chú quay phim</label>
                    <p className="text-xs text-zinc-500 italic">{segment.cameraNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
};
