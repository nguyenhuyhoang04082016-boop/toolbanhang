import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Plus, 
  Wand2, 
  Layout, 
  Share2, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  Edit3, 
  RefreshCw, 
  Maximize2, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Play,
  Save,
  Clock,
  Camera,
  Layers,
  Image as ImageIcon,
  Info,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18n';
import { AdScript, VideoScene, Language } from '../types';
import { generateMotionPrompt, generateVideoPrompts } from '../services/geminiService';

interface VideoGenerationTabProps {
  currentScript: AdScript | null;
  language: Language;
}

export const VideoGenerationTab: React.FC<VideoGenerationTabProps> = ({ 
  currentScript, 
  language 
}) => {
  const { t } = useTranslation(language);
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'build' | 'export'>('build');
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // sceneId or 'bulk'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFullPromptModal, setShowFullPromptModal] = useState<string | null>(null); // sceneId
  const [editingPrompt, setEditingPrompt] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load scenes from script or local storage
  useEffect(() => {
    const savedScenes = localStorage.getItem('video_scenes');
    if (savedScenes) {
      try {
        setScenes(JSON.parse(savedScenes));
      } catch (e) {
        console.error('Failed to parse saved scenes', e);
      }
    } else if (currentScript) {
      const init = async () => {
        await handleAutoGenerate();
      };
      init();
    }
  }, [currentScript]);

  // Sync scenes to local storage
  useEffect(() => {
    if (scenes.length > 0) {
      localStorage.setItem('video_scenes', JSON.stringify(scenes));
    }
  }, [scenes]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!currentScript && scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-3xl flex items-center justify-center animate-pulse">
            <Video className="w-10 h-10 text-zinc-300" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
            <Wand2 className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('noContentYet')}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t('pleaseCreateScript')}
          </p>
        </div>
      </div>
    );
  }

  const handleAutoGenerate = async () => {
    if (!currentScript) return;
    
    if (scenes.length > 0) {
      if (!window.confirm(t('confirmAutoGenerate'))) {
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      // Generate high-quality Veo 3 prompts for all segments
      const veo3Prompts = await generateVideoPrompts(
        currentScript.segments,
        currentScript.characterProfile || "",
        currentScript.productInfo.name
      );

      const newScenes: VideoScene[] = currentScript.segments.map((seg, idx) => ({
        id: seg.id,
        index: idx + 1,
        startTime: formatTime(seg.startTime),
        endTime: formatTime(seg.endTime),
        durationSec: seg.endTime - seg.startTime,
        prompt: veo3Prompts[idx] || seg.videoPrompt || seg.visualDirection || "",
        visualDirection: seg.visualDirection,
        voiceover: seg.voiceover,
        onScreenText: seg.onScreenText,
        negativePrompt: "blurry, watermark, distorted, low quality",
        camera: seg.cameraNotes || "",
        lighting: "",
        style: "",
        notes: "",
        approved: false,
        selected: false,
        imageUrl: seg.startImageUrl || "",
        startImageUrl: seg.startImageUrl || "",
        endImageUrl: seg.endImageUrl || ""
      }));
      setScenes(newScenes);
      if (newScenes.length > 0) setSelectedSceneId(newScenes[0].id);
      showToast(t('veo3PromptsGenerated'));
    } catch (error) {
      console.error("Failed to generate Veo 3 prompts:", error);
      showToast(t('aiError'), 'error');
      
      // Fallback to basic generation if AI fails
      const fallbackScenes: VideoScene[] = currentScript.segments.map((seg, idx) => ({
        id: seg.id,
        index: idx + 1,
        startTime: formatTime(seg.startTime),
        endTime: formatTime(seg.endTime),
        durationSec: seg.endTime - seg.startTime,
        prompt: seg.videoPrompt || seg.visualDirection || "",
        visualDirection: seg.visualDirection,
        voiceover: seg.voiceover,
        onScreenText: seg.onScreenText,
        negativePrompt: "blurry, watermark, distorted, low quality",
        camera: seg.cameraNotes || "",
        lighting: "",
        style: "",
        notes: "",
        approved: false,
        selected: false,
        imageUrl: seg.startImageUrl || "",
        startImageUrl: seg.startImageUrl || "",
        endImageUrl: seg.endImageUrl || ""
      }));
      setScenes(fallbackScenes);
      if (fallbackScenes.length > 0) setSelectedSceneId(fallbackScenes[0].id);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddScene = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const lastScene = scenes[scenes.length - 1];
    const startTime = lastScene ? lastScene.endTime : "0:00";
    
    const newScene: VideoScene = {
      id: newId,
      index: scenes.length + 1,
      startTime,
      endTime: startTime,
      durationSec: 5,
      prompt: "",
      negativePrompt: "blurry, watermark, distorted, low quality",
      camera: "",
      lighting: "",
      style: "",
      notes: "",
      approved: false,
      selected: false
    };
    
    setScenes([...scenes, newScene]);
    setSelectedSceneId(newId);
  };

  const handleDeleteScene = (id: string) => {
    if (window.confirm(t('confirmDeleteScene'))) {
      const updated = scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, index: i + 1 }));
      setScenes(updated);
      if (selectedSceneId === id) setSelectedSceneId(updated[0]?.id || null);
    }
  };

  const handleToggleApprove = (id: string) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, approved: !s.approved } : s));
  };

  const handleGenerateMotion = async (sceneId: string) => {
    const sceneIdx = scenes.findIndex(s => s.id === sceneId);
    if (sceneIdx === -1) return;

    const scene = scenes[sceneIdx];
    if (!scene.imageUrl && !scene.startImageUrl) {
      showToast(t('pleaseGenerateImageFirst'), 'error');
      return;
    }

    setIsGenerating(sceneId);
    try {
      const context = {
        before: scenes.slice(Math.max(0, sceneIdx - 3), sceneIdx),
        after: scenes.slice(sceneIdx + 1, Math.min(scenes.length, sceneIdx + 4))
      };

      const result = await generateMotionPrompt(
        scene,
        context,
        scene.imageUrl || scene.startImageUrl || "",
        language
      );

      setScenes(scenes.map(s => s.id === sceneId ? { 
        ...s, 
        motionPrompt: result.prompt, 
        motionTitle: result.title 
      } : s));
      
      showToast(t('motionPromptGenerated'));
    } catch (error) {
      console.error('Failed to generate motion prompt', error);
      showToast(t('aiError'), 'error');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateBulkMotion = async () => {
    const scenesWithImages = scenes.filter(s => s.imageUrl || s.startImageUrl);
    if (scenesWithImages.length === 0) {
      showToast(t('noImagesToGenerateMotion'), 'error');
      return;
    }

    if (!window.confirm(t('confirmBulkMotion'))) return;

    setIsGenerating('bulk');
    try {
      for (const scene of scenesWithImages) {
        const idx = scenes.findIndex(s => s.id === scene.id);
        const context = {
          before: scenes.slice(Math.max(0, idx - 3), idx),
          after: scenes.slice(idx + 1, Math.min(scenes.length, idx + 4))
        };

        const result = await generateMotionPrompt(
          scene,
          context,
          scene.imageUrl || scene.startImageUrl || "",
          language
        );

        setScenes(prev => prev.map(s => s.id === scene.id ? { 
          ...s, 
          motionPrompt: result.prompt, 
          motionTitle: result.title 
        } : s));
      }
      showToast(t('bulkMotionGenerated'));
    } catch (error) {
      console.error('Failed bulk motion generation', error);
      showToast(t('aiError'), 'error');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t('copiedToClipboard'));
  };

  const handleSaveEditedPrompt = () => {
    if (showFullPromptModal) {
      setScenes(scenes.map(s => s.id === showFullPromptModal ? { ...s, motionPrompt: editingPrompt } : s));
      setShowFullPromptModal(null);
      showToast(t('promptSaved'));
    }
  };

  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  const selectedSegment = currentScript?.segments.find(s => s.id === selectedSceneId);

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <Video className="w-12 h-12 mb-4 opacity-20" />
        <p>{currentScript ? t('autoGeneratedScenes') : t('pleaseCreateScriptOrAddScene')}</p>
        <div className="flex gap-4 mt-6">
          {currentScript && (
            <button 
              onClick={handleAutoGenerate}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Wand2 className="w-4 h-4" />
              {t('autoGenerateFromScript')}
            </button>
          )}
          <button 
            onClick={handleAddScene}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('addFirstScene')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-zinc-50 dark:bg-zinc-950 min-h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
            <Video className="w-8 h-8 text-indigo-600" />
            {t('buildVideo')}
          </h2>
          <p className="text-sm text-zinc-500">{t('autoGeneratedScenes')}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAutoGenerate}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('syncAndAnalyzeVeo3')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-12">#</th>
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-1/4">{t('scriptContent')}</th>
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-1/3">{t('productImages')}</th>
              <th className="py-4 px-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t('visualDirection')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {scenes.map((scene) => {
              const segment = currentScript?.segments.find(s => s.id === scene.id);
              return (
                <tr key={scene.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20 transition-colors align-top">
                  <td className="py-6 px-6 text-sm font-mono text-zinc-400">{scene.index}</td>
                  <td className="py-6 px-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{t('content')}</label>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{segment?.visualDirection || scene.visualDirection}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{t('voiceover')}</label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">"{segment?.voiceover || scene.voiceover}"</p>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block text-center">{t('startImage')}</span>
                        <div className="aspect-[9/16] w-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 relative group">
                          {scene.startImageUrl ? (
                            <>
                              <img src={scene.startImageUrl} alt="Start" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button 
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = scene.startImageUrl!;
                                  a.download = `scene-${scene.index}-start.png`;
                                  a.click();
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block text-center">{t('endImage')}</span>
                        <div className="aspect-[9/16] w-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 relative group">
                          {scene.endImageUrl ? (
                            <>
                              <img src={scene.endImageUrl} alt="End" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <button 
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = scene.endImageUrl!;
                                  a.download = `scene-${scene.index}-end.png`;
                                  a.click();
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <textarea 
                      value={scene.prompt}
                      onChange={(e) => setScenes(scenes.map(s => s.id === scene.id ? { ...s, prompt: e.target.value } : s))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none min-h-[120px]"
                      placeholder={t('promptPlaceholder')}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 ${toast.type === 'success' ? 'bg-zinc-900 text-white' : 'bg-red-600 text-white'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
