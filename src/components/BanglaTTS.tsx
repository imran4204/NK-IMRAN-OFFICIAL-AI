import React, { useState, useEffect, useRef } from 'react';
import { AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { Volume2, Play, Square, Download, Sparkles, RefreshCw, Sliders, History, Radio, Music } from 'lucide-react';

interface BanglaTTSProps {
  language: AppLanguage;
}

interface AudioHistoryItem {
  id: string;
  text: string;
  timestamp: string;
  audioUrl?: string;
}

export const BanglaTTS: React.FC<BanglaTTSProps> = ({ language }) => {
  const t = translations[language];
  const { getIdToken } = useAuth();

  const [text, setText] = useState('স্বাগতম NK IMRAN OFFICIAL AI-তে! এটি আপনার আধুনিক কৃত্রিম বুদ্ধিমত্তা হাব।');
  const [voicePersona, setVoicePersona] = useState('Kore');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<AudioHistoryItem[]>([]);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStop = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleSpeak = async (customText?: string) => {
    const targetText = (customText || text).trim();
    if (!targetText || isLoading) return;

    handleStop();
    setIsLoading(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text: targetText,
          voice: voicePersona,
        }),
      });

      if (!res.ok) throw new Error('TTS API request failed');
      const data = await res.json();

      if (data.audioBase64) {
        // High fidelity audio from Gemini 3.8 Flash-Lite TTS
        const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        setAudioUrl(audioSrc);

        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
        }

        audioElementRef.current.src = audioSrc;
        audioElementRef.current.playbackRate = speed;
        audioElementRef.current.onended = () => setIsPlaying(false);
        audioElementRef.current.onerror = () => setIsPlaying(false);

        await audioElementRef.current.play();
        setIsPlaying(true);

        // Add to history
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            text: targetText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            audioUrl: audioSrc,
          },
          ...prev.slice(0, 9),
        ]);
      } else {
        // Browser SpeechSynthesis with Bengali voice detection
        if (!window.speechSynthesis) {
          throw new Error('Speech synthesis not supported in this browser');
        }

        const utterance = new SpeechSynthesisUtterance(targetText);
        const voices = window.speechSynthesis.getVoices();
        const isBn = /[\u0980-\u09FF]/.test(targetText);
        const bnVoice = voices.find(
          (v) => v.lang.includes('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali')
        );

        if (isBn && bnVoice) {
          utterance.voice = bnVoice;
          utterance.lang = 'bn-BD';
        } else {
          utterance.lang = isBn ? 'bn-BD' : 'en-US';
        }

        utterance.rate = speed;
        utterance.pitch = pitch;

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        window.speechSynthesis.speak(utterance);

        setHistory((prev) => [
          {
            id: Date.now().toString(),
            text: targetText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (err) {
      console.error('TTS error:', err);
      // Direct Web Speech fallback if network or API failed
      if (window.speechSynthesis) {
        const fallbackUtterance = new SpeechSynthesisUtterance(targetText);
        fallbackUtterance.rate = speed;
        fallbackUtterance.onstart = () => setIsPlaying(true);
        fallbackUtterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(fallbackUtterance);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Studio Header Card */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Volume2 className="w-6 h-6 text-cyan-400" />
              {t.tts.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t.tts.subtitle}</p>
          </div>

          {/* Engine indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>GEMINI 3.8 + BANGLA NEURAL ENGINE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Text Input & Controls (Span 2) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {language === 'bn' ? 'টেক্সট ইনপুট (বাংলা অথবা ইংরেজি):' : 'Text Input (Bengali or English):'}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.tts.textPlaceholder}
              rows={5}
              className="w-full glass-input rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400 resize-y"
            />
          </div>

          {/* Preset Chips */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 block">
              {language === 'bn' ? 'জনপ্রিয় বাংলা বাক্য:' : 'Quick Bengali Presets:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {t.tts.presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setText(preset);
                    handleSpeak(preset);
                  }}
                  className="text-xs text-slate-300 hover:text-white glass-panel-interactive px-3 py-1.5 rounded-lg border border-white/10 text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Speed & Pitch & Voice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/10">
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>{t.tts.voiceSelect}</span>
                <span className="font-mono text-cyan-400">{voicePersona}</span>
              </label>
              <select
                value={voicePersona}
                onChange={(e) => setVoicePersona(e.target.value)}
                className="w-full glass-input text-xs rounded-lg px-3 py-2 bg-slate-900 border border-white/10 text-slate-200"
              >
                <option value="Kore">Kore (Clear, Natural)</option>
                <option value="Zephyr">Zephyr (Deep, Confident)</option>
                <option value="Puck">Puck (Expressive, Warm)</option>
                <option value="Fenrir">Fenrir (Authoritative)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>{t.tts.speed}</span>
                <span className="font-mono text-cyan-400">{speed}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.75"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                <span>{t.tts.pitch}</span>
                <span className="font-mono text-cyan-400">{pitch}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons & Visualizer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
            {/* Visualizer Simulation */}
            <div className="flex items-center gap-1.5 h-8">
              {[40, 75, 55, 95, 60, 85, 45, 90, 70, 50, 80, 65].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'
                  }`}
                  style={{ height: isPlaying ? `${h}%` : '20%' }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {isPlaying && (
                <button
                  onClick={handleStop}
                  className="px-4 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 font-semibold text-xs flex items-center gap-2 hover:bg-red-500/30 transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{t.tts.stopBtn}</span>
                </button>
              )}

              <button
                onClick={() => handleSpeak()}
                disabled={!text.trim() || isLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition shadow-lg shadow-cyan-500/20"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.tts.synthesizing}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>{t.tts.speakBtn}</span>
                  </>
                )}
              </button>

              {audioUrl && (
                <a
                  href={audioUrl}
                  download="bangla_speech_nk_imran_ai.wav"
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
                  title={t.tts.downloadAudio}
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Generation History & Tips */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>{language === 'bn' ? 'সম্প্রতি তৈরি স্পিচ' : 'Voice Generation History'}</span>
          </h3>

          {history.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">
              {language === 'bn' ? 'এখনও কোনো অডিও তৈরি করা হয়নি।' : 'No speech generated yet in this session.'}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setText(item.text);
                    handleSpeak(item.text);
                  }}
                  className="p-3 rounded-xl glass-panel-interactive border border-white/5 text-xs cursor-pointer group space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-mono text-[10px] tabular-nums">{item.timestamp}</span>
                    <Play className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-slate-200 line-clamp-2 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
