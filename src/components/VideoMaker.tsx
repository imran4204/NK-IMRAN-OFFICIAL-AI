import React, { useState, useEffect, useRef } from 'react';
import { AppLanguage, VideoStoryboard, VideoScene } from '../types';
import { translations } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { 
  Clapperboard, Play, Pause, RotateCcw, Volume2, Download, Sparkles, RefreshCw, 
  Film, Camera, Video, Compass, Music, Disc, Upload, Image, AlertCircle, 
  CheckCircle2, X, Info, Settings
} from 'lucide-react';

interface VideoMakerProps {
  language: AppLanguage;
}

export const VideoMaker: React.FC<VideoMakerProps> = ({ language }) => {
  const t = translations[language];
  const { getIdToken } = useAuth();

  const [activeMode, setActiveMode] = useState<'storyboard' | 'text-to-video' | 'image-to-video'>('storyboard');
  const [concept, setConcept] = useState('ঢাকার আকাশে ২০৫০ সালের সাইবার সিটি ও ড্রোন রেস');
  const [style, setStyle] = useState('Cinematic 4K');
  const [duration, setDuration] = useState('30s');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyboard, setStoryboard] = useState<VideoStoryboard | null>(null);

  // Image-to-Video states
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [animationPrompt, setAnimationPrompt] = useState('বাতাসে চুল উড়ছে এবং ক্যামেরা ধীরে ধীরে জুম ইন করছে');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Real Video Generation Job State
  const [videoJobResult, setVideoJobResult] = useState<any | null>(null);

  // Playback states for Storyboard
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [narratingScene, setNarratingScene] = useState<number | null>(null);
  const playbackTimerRef = useRef<any>(null);

  // Image File Handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'bn' ? 'অনুগ্রহ করে একটি ইমেজ ফাইল নির্বাচন করুন (JPEG/PNG)।' : 'Please select a valid image file (JPEG/PNG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'bn' ? 'ফাইলের আকার ১০ মেগাবাইটের কম হতে হবে।' : 'Image size must be under 10MB.');
      return;
    }

    setUploadedImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImageBase64(null);
    setUploadedImageName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Main Generation Handler
  const handleGenerate = async () => {
    setIsGenerating(true);
    setVideoJobResult(null);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/video-maker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: activeMode,
          concept: activeMode === 'image-to-video' ? animationPrompt : concept,
          style,
          duration,
          aspectRatio,
          language,
          imageData: activeMode === 'image-to-video' ? uploadedImageBase64 : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Video generation failed');
      }

      if (activeMode === 'storyboard') {
        setStoryboard(data);
        setActiveSceneIndex(0);
        setProgress(0);
        setIsPlaying(false);
      } else {
        // Text-to-Video or Image-to-Video job response
        setVideoJobResult(data);
      }
    } catch (err: any) {
      console.error('Video maker error:', err);
      setVideoJobResult({
        status: 'error',
        error: err.message || (language === 'bn' ? 'ভিডিও জেনারেশনে ত্রুটি হয়েছে।' : 'Video generation request failed.'),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Storyboard playback simulation loop
  useEffect(() => {
    if (isPlaying && storyboard && storyboard.scenes.length > 0) {
      playbackTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          const next = prev + 1;
          const sceneCount = storyboard.scenes.length;
          const currentIdx = Math.min(Math.floor((next / 100) * sceneCount), sceneCount - 1);
          setActiveSceneIndex(currentIdx);
          return next;
        });
      }, 300);
    } else {
      clearInterval(playbackTimerRef.current);
    }
    return () => clearInterval(playbackTimerRef.current);
  }, [isPlaying, storyboard]);

  const handleTogglePlay = () => {
    if (!storyboard || storyboard.scenes.length === 0) return;
    if (progress >= 100) {
      setProgress(0);
      setActiveSceneIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    setActiveSceneIndex(0);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setNarratingScene(null);
  };

  const handleNarrate = (sceneNum: number, voiceoverText: string) => {
    if (!('speechSynthesis' in window)) return;
    if (narratingScene === sceneNum) {
      window.speechSynthesis.cancel();
      setNarratingScene(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voiceoverText);
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.onend = () => setNarratingScene(null);
    utterance.onerror = () => setNarratingScene(null);

    setNarratingScene(sceneNum);
    window.speechSynthesis.speak(utterance);
  };

  const currentScene: VideoScene | undefined = storyboard?.scenes[activeSceneIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Header Card */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden bg-[#0c1018]/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clapperboard className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                NK IMRAN <span className="text-cyan-400 font-medium">AI VIDEO MAKER</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {language === 'bn' 
                ? 'সিনেমাটিক স্টোরিবোর্ড, টেক্সট-টু-ভিডিও এবং ইমেজ অ্যানিমেশনের পূর্ণাঙ্গ স্টুডিও।' 
                : 'Cinematic storyboard director, text-to-video and reference image animation studio.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveMode('storyboard');
                setVideoJobResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeMode === 'storyboard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'স্টোরিবোর্ড ও স্ক্রিপ্ট' : 'Storyboard'}
            </button>

            <button
              onClick={() => {
                setActiveMode('text-to-video');
                setVideoJobResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeMode === 'text-to-video'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'টেক্সট-টু-ভিডিও' : 'Text to Video'}
            </button>

            <button
              onClick={() => {
                setActiveMode('image-to-video');
                setVideoJobResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeMode === 'image-to-video'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'ইমেজ-টু-ভিডিও' : 'Image to Video'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Video Prompt & Settings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4 bg-[#0e131d]/90">
            
            {/* Mode A & B: Text prompt inputs */}
            {activeMode !== 'image-to-video' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === 'bn' ? 'ভিডিওর বিষয়বস্তু বা কনসেপ্ট' : 'Video Concept or Narrative'}
                </label>
                <textarea
                  rows={3}
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="যেমন: গভীর সমুদ্রের নিচে আলো ছড়ানো একটি ভবিষ্যৎ সাইবার সিটি..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
                />
              </div>
            ) : (
              /* Mode C: Image-to-Video Uploader */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {language === 'bn' ? 'রেফারেন্স ইমেজ আপলোড করুন' : 'Upload Reference Image'}
                  </label>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {uploadedImageBase64 ? (
                    <div className="relative rounded-xl border border-cyan-500/40 p-2 bg-black/40 overflow-hidden group">
                      <img
                        src={uploadedImageBase64}
                        alt="Uploaded preview"
                        className="w-full h-44 object-cover rounded-lg"
                      />
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-md bg-black/70 hover:bg-black text-cyan-300 text-xs font-medium backdrop-blur-sm border border-white/20"
                        >
                          {language === 'bn' ? 'পরিবর্তন' : 'Replace'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-1.5 px-1 text-[11px] text-slate-400 truncate">
                        {uploadedImageName}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/15 hover:border-cyan-500/40 rounded-xl p-6 text-center cursor-pointer transition hover:bg-white/[0.02] group"
                    >
                      <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 mx-auto mb-2 transition-colors" />
                      <p className="text-xs font-semibold text-slate-300">
                        {language === 'bn' ? 'ফোন থেকে ছবি সিলেক্ট করুন' : 'Tap to select an image from phone'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">PNG, JPEG, WEBP (Max 10MB)</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {language === 'bn' ? 'অ্যানিমেশন বা ক্যামেরার গতিবিধির বর্ণনা' : 'Animation & Motion Prompt'}
                  </label>
                  <textarea
                    rows={2}
                    value={animationPrompt}
                    onChange={(e) => setAnimationPrompt(e.target.value)}
                    placeholder="যেমন: ব্যাকগ্রাউন্ডের আলো জ্বলছে-নিভছে এবং বাতাসে পর্দা নড়ছে..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Cinematic Style & Aspect Ratio Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {language === 'bn' ? 'সিনেমাটিক স্টাইল' : 'Visual Style'}
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="Cinematic 4K">Cinematic 4K UHD</option>
                  <option value="Cyberpunk Neon">Cyberpunk Neon</option>
                  <option value="Anime Studio Ghibli">Anime Studio Style</option>
                  <option value="Photorealistic Drone">Photorealistic Drone</option>
                  <option value="Vintage 35mm Grain">Vintage 35mm Film</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {language === 'bn' ? 'দিক অনুপাত (Aspect Ratio)' : 'Aspect Ratio'}
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="16:9">16:9 (Landscape / YouTube)</option>
                  <option value="9:16">9:16 (Portrait / Reels / TikTok)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="21:9">21:9 (Anamorphic Cinema)</option>
                </select>
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (activeMode === 'image-to-video' && !uploadedImageBase64)}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {language === 'bn' ? 'ভিডিও প্যাকেজ প্রস্তুত হচ্ছে...' : 'Processing video generation...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>
                    {activeMode === 'storyboard' 
                      ? (language === 'bn' ? 'স্টোরিবোর্ড তৈরি করুন' : 'Generate Production Storyboard')
                      : (language === 'bn' ? 'ভিডিও রেন্ডার শুরু করুন' : 'Submit Video Render Job')}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Display / Player / Status */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Case 1: Real Text-to-Video / Image-to-Video Status Display */}
          {activeMode !== 'storyboard' && videoJobResult && (
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4 bg-[#0e131d]/90">
              
              {/* Honest Not Configured Status */}
              {videoJobResult.status === 'not_configured' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                    <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">
                        {videoJobResult.title}
                      </h3>
                      <p className="text-xs text-amber-300/90 leading-relaxed">
                        {videoJobResult.message}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>{language === 'bn' ? 'অ্যান্ড্রয়েড ফোন থেকে সেটআপের ধাপসমূহ:' : 'Phone Setup Steps:'}</span>
                    </h4>
                    <ul className="text-xs text-slate-300 space-y-2 list-none">
                      {videoJobResult.instructions?.map((step: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Status */}
              {videoJobResult.status === 'error' && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{videoJobResult.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Case 2: Storyboard Player & Scene Viewer */}
          {(!videoJobResult || activeMode === 'storyboard') && (
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden bg-[#0c1018]/90">
              
              {storyboard ? (
                <div>
                  {/* Cinematic Video Monitor Canvas */}
                  <div className="relative aspect-video bg-black/80 flex items-center justify-center border-b border-white/10 overflow-hidden">
                    {/* Scene Glow / Cyber Visual background */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/40 via-blue-950/30 to-purple-950/40 opacity-80" />
                    
                    <div className="relative z-10 text-center p-6 max-w-lg space-y-3">
                      <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
                        SCENE {currentScene?.sceneNumber || 1} • {currentScene?.timeframe}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {storyboard.title}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                        {currentScene?.visualPrompt}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Playback Toolbar */}
                  <div className="p-4 flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTogglePlay}
                        className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition font-bold"
                        title={isPlaying ? 'Pause' : 'Play Director Review'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      <button
                        onClick={handleReset}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
                        title="Reset Timeline"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {currentScene && (
                        <button
                          onClick={() => handleNarrate(currentScene.sceneNumber, currentScene.voiceover)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                            narratingScene === currentScene.sceneNumber
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'ভয়েসওভার শুনুন' : 'Narrate Voiceover'}</span>
                        </button>
                      )}
                    </div>

                    <div className="text-xs font-mono text-cyan-400">
                      {Math.floor(progress)}% • {storyboard.scenes.length} Scenes
                    </div>
                  </div>

                  {/* Scene Breakdown List */}
                  <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
                    <h4 className="text-xs font-bold text-slate-300 tracking-wide uppercase">
                      {language === 'bn' ? 'দৃশ্য ও শট বিভাজন (Scene Breakdown)' : 'Scene Sequence'}
                    </h4>

                    {storyboard.scenes.map((scene, idx) => (
                      <div
                        key={scene.sceneNumber}
                        onClick={() => {
                          setActiveSceneIndex(idx);
                          setProgress((idx / storyboard.scenes.length) * 100);
                        }}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                          activeSceneIndex === idx
                            ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-cyan-300">
                            Scene {scene.sceneNumber}: {scene.timeframe}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {scene.cameraMovement}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {scene.visualPrompt}
                        </p>
                        <div className="text-[11px] text-slate-400 italic bg-black/20 p-2 rounded-lg">
                          🎤 Voiceover: "{scene.voiceover}"
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ) : (
                /* Empty Placeholder */
                <div className="p-16 text-center text-slate-500 text-xs">
                  <Film className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-60" />
                  <p className="text-sm font-medium text-slate-400">
                    {language === 'bn' ? 'এখনও কোনো ভিডিও প্রস্তুত করা হয়নি।' : 'No video project generated yet.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'bn' 
                      ? 'বাম পাশের ফর্ম থেকে আপনার আইডিয়া দিয়ে জেনারেট করুন।' 
                      : 'Enter your concept and click generate to create a cinematic package.'}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

    </div>
  );
};
