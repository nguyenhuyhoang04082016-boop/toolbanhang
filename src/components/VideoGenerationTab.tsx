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
  Info
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
    const savedScenes = sessionStorage.getItem('video_scenes');
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
      try {
  sessionStorage.setItem('video_scenes', JSON.stringify(scenes));
} catch (e) {
  console.error('Failed to save video scenes', e);
}
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
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('build')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'build' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            <Layout className="w-4 h-4" />
            {t('buildVideo')}
          </button>
          <button 
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'export' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            <Share2 className="w-4 h-4" />
            {t('exportPrompts')}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleAutoGenerate}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('syncAndAnalyzeVeo3')}</span>
          </button>
          <button 
            onClick={handleGenerateBulkMotion}
            disabled={isGenerating === 'bulk'}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {isGenerating === 'bulk' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('generateAllMotion')}</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Scenes</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">{scenes.length}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Scene List */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto">
          <div className="p-4 space-y-2">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setSelectedSceneId(scene.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-2xl transition-all text-left group ${selectedSceneId === scene.id ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${selectedSceneId === scene.id ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {scene.index}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{scene.startTime} - {scene.endTime}</span>
                    {scene.approved && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-white line-clamp-2 leading-relaxed">
                    {currentScript?.segments.find(seg => seg.id === scene.id)?.visualDirection || scene.prompt || t('noContentYet')}
                  </p>
                  {scene.motionTitle && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full w-fit">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      {scene.motionTitle}
                    </div>
                  )}
                </div>
              </button>
            ))}
            
            <button 
              onClick={handleAddScene}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              {t('addNewScene')}
            </button>
          </div>
        </div>

        {/* Main Content: Scene Editor */}
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-8">
          {selectedScene ? (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Scene Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {t('sceneEditor')} <span className="text-indigo-600">#{selectedScene.index}</span>
                  </h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {selectedScene.startTime} - {selectedScene.endTime} ({selectedScene.durationSec}s)
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleApprove(selectedScene.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedScene.approved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedScene.approved ? t('approved') : t('markApproved')}
                  </button>
                  <button 
                    onClick={() => handleDeleteScene(selectedScene.id)}
                    className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Content */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{t('visualReference')}</span>
                      </div>
                    </div>
                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative group">
                      {selectedScene.imageUrl || selectedScene.startImageUrl ? (
                        <>
                          <img 
                            src={selectedScene.imageUrl || selectedScene.startImageUrl} 
                            alt="Scene visual" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 p-6 text-center">
                            {selectedScene.motionPrompt ? (
                              <>
                                <div className="text-white font-black text-sm drop-shadow-lg">
                                  {selectedScene.motionTitle}
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleCopyPrompt(selectedScene.motionPrompt || "")}
                                    className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/30 transition-all border border-white/20"
                                    title={t('copyMotionPrompt')}
                                  >
                                    <Copy className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setEditingPrompt(selectedScene.motionPrompt || "");
                                      setShowFullPromptModal(selectedScene.id);
                                    }}
                                    className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/30 transition-all border border-white/20"
                                    title={t('viewFull')}
                                  >
                                    <Maximize2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button 
                                onClick={() => handleGenerateMotion(selectedScene.id)}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-100 transition-all shadow-xl"
                              >
                                <Wand2 className="w-4 h-4" />
                                {t('generateMotion')}
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
                          <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                          <p className="text-xs font-medium">{t('noImageYet')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t('visualDirection')}</label>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm text-zinc-600 dark:text-zinc-400 italic">
                        {selectedSegment?.visualDirection || selectedScene.visualDirection || t('noContentYet')}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('voiceover')}</label>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-600 dark:text-zinc-400">
                          {selectedSegment?.voiceover || selectedScene.voiceover || t('noContentYet')}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('onScreenText')}</label>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-600 dark:text-zinc-400">
                          {selectedSegment?.onScreenText || selectedScene.onScreenText || t('noContentYet')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Veo 3 Video Prompt</label>
                    <textarea 
                      value={selectedScene.prompt}
                      onChange={(e) => setScenes(scenes.map(s => s.id === selectedScene.id ? { ...s, prompt: e.target.value } : s))}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none min-h-[120px]"
                      placeholder={t('promptPlaceholder')}
                    />
                  </div>
                </div>

                {/* Motion Content */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{t('motionPrompt')}</span>
                      </div>
                      <button 
                        onClick={() => handleGenerateMotion(selectedScene.id)}
                        disabled={isGenerating === selectedScene.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all disabled:opacity-50"
                      >
                        {isGenerating === selectedScene.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        {selectedScene.motionPrompt ? t('regenerate') : t('generate')}
                      </button>
                    </div>

                    {selectedScene.motionPrompt ? (
                      <div className="space-y-4">
                        {selectedScene.motionTitle && (
                          <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-xl">
                            {selectedScene.motionTitle}
                          </div>
                        )}
                        <div className="relative">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 italic">
                            "{selectedScene.motionPrompt}"
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <button 
                              onClick={() => {
                                setEditingPrompt(selectedScene.motionPrompt || "");
                                setShowFullPromptModal(selectedScene.id);
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-indigo-600 transition-all"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              {t('viewFull')}
                            </button>
                            <button 
                              onClick={() => handleCopyPrompt(selectedScene.motionPrompt || "")}
                              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-indigo-600 transition-all ml-auto"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {t('copyPrompt')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-zinc-400 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                        <Play className="w-8 h-8 mb-2 opacity-10" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{t('noMotionPromptYet')}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('camera')}</label>
                      <input 
                        type="text"
                        value={selectedScene.camera}
                        onChange={(e) => setScenes(scenes.map(s => s.id === selectedScene.id ? { ...s, camera: e.target.value } : s))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-white outline-none"
                        placeholder="e.g. Close-up, Pan right"
                      />
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('style')}</label>
                      <input 
                        type="text"
                        value={selectedScene.style}
                        onChange={(e) => setScenes(scenes.map(s => s.id === selectedScene.id ? { ...s, style: e.target.value } : s))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-white outline-none"
                        placeholder="e.g. Cinematic, 8k"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <Video className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-bold text-lg">{t('selectSceneToEdit')}</p>
              <p className="text-sm opacity-60">{t('orAutoGenerate')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Full Prompt Modal */}
      <AnimatePresence>
        {showFullPromptModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullPromptModal(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                      {t('fullMotionPrompt')}
                    </h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      {scenes.find(s => s.id === showFullPromptModal)?.motionTitle || t('cinematicMotion')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFullPromptModal(null)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('editMotionPrompt')}</label>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleGenerateMotion(showFullPromptModal)}
                        disabled={isGenerating === showFullPromptModal}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGenerating === showFullPromptModal ? 'animate-spin' : ''}`} />
                        {t('regenerate')}
                      </button>
                      <button 
                        onClick={() => handleCopyPrompt(editingPrompt)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        {t('copyPrompt')}
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    className="w-full h-80 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-mono leading-relaxed"
                  />
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <p className="text-xs text-indigo-900/70 dark:text-indigo-300/70 leading-relaxed">
                      {t('motionPromptTip')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <button 
                  onClick={() => setShowFullPromptModal(null)}
                  className="px-6 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSaveEditedPrompt}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Save className="w-4 h-4" />
                  {t('saveChanges')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
