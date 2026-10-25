import React, { useState, useRef, useEffect } from 'react';
import { AppLanguage, ChatMessage, ChatSession } from '../types';
import { translations } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { 
  Send, Trash2, Volume2, VolumeX, Copy, Check, Sparkles, Bot, User, 
  Code, ArrowUpRight, Plus, History, Clock, X, MessageSquare, AlertCircle,
  Settings, Mic, MicOff, Info, ChevronRight, Image as ImageIcon, Camera, Maximize2
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface AIChatProps {
  language: AppLanguage;
  onNavigateToMakeAnything: (prompt: string) => void;
  onNavigateToSettings: () => void;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ 
  language, 
  onNavigateToMakeAnything,
  onNavigateToSettings,
  selectedSessionId,
  onSelectSession,
}) => {
  const t = translations[language];
  const { 
    user, 
    otpEmailUser, 
    profile, 
    chatSessions, 
    saveChatSession, 
    deleteChatSession,
    getIdToken, 
    getPastConversationSummaries,
    giveConsent 
  } = useAuth();

  const createInitialWelcomeMessage = (lang: AppLanguage): ChatMessage => ({
    id: 'welcome-' + Date.now(),
    role: 'assistant',
    content: lang === 'bn'
      ? `সালাম! আমি **NK IMRAN OFFICIAL AI**। আমি প্রমিত বাংলা ও ইংরেজিতে কোডিং, ফুলস্ট্যাক অ্যাপ্লিকেশন ডেভেলপমেন্ট, টেকনিক্যাল সমস্যা সমাধান এবং সৃজনশীল প্রকল্পে আপনার ক্লাউড ইন্টেলিজেন্স পার্টনার। আমাদের কথোপকথন স্বয়ংক্রিয়ভাবে মনে রাখা হচ্ছে—আজ আপনার কী সমাধান প্রয়োজন?`
      : `Hello! I am **NK IMRAN OFFICIAL AI**. I am your developer workstation and intelligence partner fluent in Bengali and English. Our conversation is automatically remembered across sessions—what are we building today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const createNewSession = (lang: AppLanguage, tone: 'friendly' | 'professional' | 'developer' | 'creative' = 'friendly'): ChatSession => {
    const id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString();
    return {
      id,
      title: lang === 'bn' ? 'নতুন কথোপকথন' : 'New Conversation',
      createdAt: now,
      updatedAt: now,
      tone,
      messages: [createInitialWelcomeMessage(lang)],
    };
  };

  // Local active session
  const [activeSession, setActiveSession] = useState<ChatSession>(() => {
    if (selectedSessionId && chatSessions) {
      const found = chatSessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    if (chatSessions && chatSessions.length > 0) {
      return chatSessions[0];
    }
    return createNewSession(language);
  });

  const [inputMessage, setInputMessage] = useState('');
  const isOnline = useOnlineStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showMicPermissionDialog, setShowMicPermissionDialog] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Attached image state for multimodal vision & question solving
  const [attachedImage, setAttachedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
    size: number;
  } | null>(null);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image file selection (from camera or gallery)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorNotice(language === 'bn' ? 'অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPEG, PNG, WebP ইত্যাদি)।' : 'Please select a valid image file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorNotice(language === 'bn' ? 'ছবির সর্বোচ্চ সাইজ ২৫ মেগাবাইট (MB) হতে পারে।' : 'Image size must be under 25MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachedImage({
        dataUrl,
        mimeType: file.type || 'image/jpeg',
        name: file.name,
        size: file.size,
      });
      setErrorNotice(null);
    };
    reader.onerror = () => {
      setErrorNotice(language === 'bn' ? 'ছবি পড়তে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Failed to read image.');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachedImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // When selectedSessionId changes from parent (e.g. from Settings), switch to that session
  useEffect(() => {
    if (selectedSessionId && chatSessions && chatSessions.length > 0) {
      const target = chatSessions.find((s) => s.id === selectedSessionId);
      if (target) {
        setActiveSession(target);
      }
    }
  }, [selectedSessionId, chatSessions]);

  // Synchronize active session if updated in background
  useEffect(() => {
    if (chatSessions && chatSessions.length > 0) {
      const current = chatSessions.find((s) => s.id === activeSession.id);
      if (current && current.updatedAt !== activeSession.updatedAt) {
        setActiveSession(current);
      }
    }
  }, [chatSessions]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession.messages, isLoading]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleStartNewChat = () => {
    const fresh = createNewSession(language, activeSession.tone);
    setActiveSession(fresh);
    setIsHistoryDrawerOpen(false);
    setErrorNotice(null);
    if (onSelectSession) onSelectSession(fresh.id);
  };

  const handleSelectSession = (sessionId: string) => {
    const selected = chatSessions.find((s) => s.id === sessionId);
    if (selected) {
      setActiveSession(selected);
      setIsHistoryDrawerOpen(false);
      setErrorNotice(null);
      if (onSelectSession) onSelectSession(sessionId);
    }
  };

  const handleToneChange = async (newTone: 'friendly' | 'professional' | 'developer' | 'creative') => {
    const updated = { ...activeSession, tone: newTone, updatedAt: new Date().toISOString() };
    setActiveSession(updated);
    await saveChatSession(updated);
  };

  const handleClearCurrentChat = async () => {
    const cleared: ChatSession = {
      ...activeSession,
      title: language === 'bn' ? 'নতুন কথোপকথন' : 'New Conversation',
      messages: [createInitialWelcomeMessage(language)],
      updatedAt: new Date().toISOString(),
    };
    setActiveSession(cleared);
    await saveChatSession(cleared);
  };

  // Submit message to real AI with multimodal vision & automatic conversation memory
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputMessage.trim() && !attachedImage) || isLoading) return;

    setErrorNotice(null);
    const textToSend = inputMessage.trim();
    const imageToSend = attachedImage;
    setInputMessage('');
    setAttachedImage(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const defaultPromptIfImageOnly = language === 'bn'
      ? 'ছবিটি ভালোভাবে পর্যবেক্ষণ করুন এবং ছবিতে থাকা সমস্ত প্রশ্ন বা বিষয়ের বিস্তারিত ও নির্ভুল সমাধান/উত্তর দিন।'
      : 'Please analyze this image thoroughly and provide accurate step-by-step answers to any questions or topics shown.';

    const effectiveText = textToSend || (imageToSend ? defaultPromptIfImageOnly : '');

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: effectiveText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: imageToSend
        ? {
            dataUrl: imageToSend.dataUrl,
            mimeType: imageToSend.mimeType,
            name: imageToSend.name,
            size: imageToSend.size,
          }
        : undefined,
    };

    const isFirstUserMessage = !activeSession.messages.some((m) => m.role === 'user');
    const initialTitle = isFirstUserMessage
      ? (textToSend ? textToSend.slice(0, 35) + (textToSend.length > 35 ? '...' : '') : (imageToSend ? (language === 'bn' ? 'ছবির বিশ্লেষণ ও প্রশ্নোত্তর' : 'Image Analysis') : activeSession.title))
      : activeSession.title;

    const updatedMessages = [...activeSession.messages, userMessage];
    const sessionWithUserMsg: ChatSession = {
      ...activeSession,
      title: initialTitle,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    setActiveSession(sessionWithUserMsg);

    // If client is currently offline, store locally and inform with helpful offline message
    if (!isOnline) {
      const offlineNoticeMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'bn'
          ? '⚠️ **অফলাইন মোড সক্রিয়**: বর্তমানে আপনার ফোনে কোনো ইন্টারনেট সংযোগ নেই। নতুন এআই উত্তরের জন্য ইন্টারনেটের প্রয়োজন, তবে আপনার বার্তা ও ছবিটি ডিভাইসের লোকাল মেমরিতে সুরক্ষিত রাখা হয়েছে। সংযোগ ফিরলে পুনরায় সেন্ড করতে পারবেন।'
          : '⚠️ **Offline Mode Active**: No internet connection detected. Your message and image are safely stored in local memory. Please reconnect to receive real-time AI responses.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const offlineSession: ChatSession = {
        ...sessionWithUserMsg,
        messages: [...updatedMessages, offlineNoticeMessage],
        updatedAt: new Date().toISOString(),
      };

      setActiveSession(offlineSession);
      await saveChatSession(offlineSession);
      return;
    }

    setIsLoading(true);

    try {
      const pastSummaries = getPastConversationSummaries().filter((s) => s.sessionId !== activeSession.id);
      const token = await getIdToken();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: updatedMessages,
          image: imageToSend
            ? {
                base64: imageToSend.dataUrl,
                mimeType: imageToSend.mimeType,
              }
            : undefined,
          language,
          tone: activeSession.tone || 'friendly',
          userProfile: profile,
          pastSummaries,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(language === 'bn' ? 'অননুমোদিত সেশন। অনুগ্রহ করে আবার সাইন-ইন করুন।' : 'Unauthorized session. Please sign in again.');
        }
        throw new Error(data.error || (language === 'bn' ? 'সার্ভার থেকে উত্তর পাওয়া যায়নি।' : 'No response from server.'));
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || (language === 'bn' ? 'কোনো উত্তর পাওয়া যায়নি।' : 'No reply received.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalSession: ChatSession = {
        ...sessionWithUserMsg,
        messages: [...updatedMessages, assistantMessage],
        summary: `আলোচ্য বিষয়: ${initialTitle}`,
        updatedAt: new Date().toISOString(),
      };

      setActiveSession(finalSession);
      await saveChatSession(finalSession);

      // Asynchronously generate a short, meaningful ChatGPT-like title if this is the first turn
      if (isFirstUserMessage) {
        fetch('/api/chat/generate-title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt: textToSend, language }),
        })
          .then((res) => res.json())
          .then((titleResult) => {
            if (titleResult.title && titleResult.title !== initialTitle) {
              const sessionWithSmartTitle: ChatSession = {
                ...finalSession,
                title: titleResult.title,
                summary: `আলোচ্য বিষয়: ${titleResult.title}`,
              };
              setActiveSession(sessionWithSmartTitle);
              saveChatSession(sessionWithSmartTitle);
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const serverErrMsg = err?.message || '';
      const fallbackMsg = language === 'bn'
        ? (serverErrMsg || 'দুঃখিত, সংযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।')
        : (serverErrMsg || 'Sorry, a temporary communication error occurred. Please try again.');

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ ${fallbackMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const errorSession: ChatSession = {
        ...sessionWithUserMsg,
        messages: [...updatedMessages, errorMessage],
        updatedAt: new Date().toISOString(),
      };

      setActiveSession(errorSession);
      await saveChatSession(errorSession);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert(language === 'bn' ? 'আপনার ব্রাউজারে স্পিচ সিন্থেসিস সমর্থিত নয়।' : 'SpeechSynthesis is not supported in this browser.');
      return;
    }

    if (currentlySpeakingId === id) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, '').replace(/⚠️/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const isBengaliText = /[\u0980-\u09FF]/.test(cleanText);

    const bnVoice = voices.find(
      (v) =>
        v.lang === 'bn-BD' ||
        v.lang === 'bn-IN' ||
        v.lang.toLowerCase().startsWith('bn') ||
        v.name.toLowerCase().includes('bangla') ||
        v.name.toLowerCase().includes('bengali')
    );

    if (isBengaliText && bnVoice) {
      utterance.voice = bnVoice;
      utterance.lang = 'bn-BD';
    } else {
      utterance.lang = isBengaliText ? 'bn-BD' : 'en-US';
    }

    utterance.rate = 1.0;
    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    setCurrentlySpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition with branded permission dialog
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorNotice(language === 'bn' ? 'আপনার ব্রাউজারে ভয়েস রিকগনিশন সমর্থিত নয়।' : 'Voice recognition not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setShowMicPermissionDialog(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorNotice(language === 'bn' ? 'NK IMRAN OFFICIAL AI-তে মাইক্রোফোন ব্যবহারের অনুমতি বাতিল করা হয়েছে।' : 'Microphone permission denied.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setShowMicPermissionDialog(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-6 flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100vh-6rem)] relative">
      
      {/* Top Banner & Control Bar */}
      <div className="glass-panel rounded-xl p-3.5 sm:p-4 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* History Drawer Toggle Button */}
          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border ${
              isHistoryDrawerOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'glass-panel border-white/10 text-slate-300 hover:text-white'
            }`}
            title={t.chat.historyTitle}
          >
            <History className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{t.chat.historyTitle}</span>
            <span className="text-[10px] font-mono bg-cyan-500/10 px-1.5 py-0.2 rounded text-cyan-300">
              {chatSessions.length}
            </span>
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleStartNewChat}
            className="px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-cyan-500/10 whitespace-nowrap"
            title={t.chat.newChat}
          >
            <Plus className="w-4 h-4" />
            <span>{t.chat.newChat}</span>
          </button>

          {/* Settings & History Direct Link */}
          <button
            onClick={onNavigateToSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition"
            title="Open Settings & Chat History"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium">
              {language === 'bn' ? 'সেটিংস ও হিস্ট্রি' : 'Settings & History'}
            </span>
          </button>
        </div>

        {/* Tone Selector & Clear Active Session */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center bg-slate-900/80 p-1 rounded-lg border border-white/10 text-xs">
            {(['friendly', 'professional', 'developer', 'creative'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleToneChange(mode)}
                className={`px-2 sm:px-2.5 py-1 rounded-md font-medium transition-all text-[11px] sm:text-xs ${
                  activeSession?.tone === mode
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.chat.tones[mode]}
              </button>
            ))}
          </div>

          <button
            onClick={handleClearCurrentChat}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-colors"
            title={t.chat.clearChat}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error notification banner if any */}
      {errorNotice && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container: Chat Screen + History Overlay / Sidebar */}
      <div className="flex-1 relative flex overflow-hidden rounded-xl border border-white/10 glass-panel">
        
        {/* History Slide-over Drawer (ChatGPT style) */}
        {isHistoryDrawerOpen && (
          <aside className="absolute inset-y-0 left-0 z-30 w-72 sm:w-80 glass-panel border-r border-white/10 shadow-2xl flex flex-col bg-[#0b0f17]/95 animate-fadeIn">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-semibold text-white">
                  {language === 'bn' ? 'সংরক্ষিত কথোপকথন' : 'Saved Chats'}
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-white/5">
              <button
                onClick={handleStartNewChat}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'নতুন চ্যাট শুরু করুন' : 'New Chat'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {chatSessions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {language === 'bn' ? 'কোনো সেশন সংরক্ষিত নেই' : 'No saved sessions'}
                </div>
              ) : (
                chatSessions.map((s) => {
                  const isCurrent = s.id === activeSession.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between gap-2 ${
                        isCurrent
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(s.updatedAt || s.createdAt).toLocaleDateString()} • {s.messages?.length || 0} বার্তা
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatSession(s.id);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-white/10 text-center">
              <button
                onClick={onNavigateToSettings}
                className="text-xs text-cyan-400 hover:underline flex items-center justify-center gap-1 w-full"
              >
                <Settings className="w-3 h-3" />
                <span>{language === 'bn' ? 'সকল হিস্ট্রি পরিচালনা করুন' : 'Manage All in Settings'}</span>
              </button>
            </div>
          </aside>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeSession?.messages.map((message) => {
            const isUser = message.role === 'user';
            const isSpeaking = currentlySpeakingId === message.id;

            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                    isUser
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                      : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-slate-100 border border-cyan-500/30 rounded-tr-none'
                      : 'glass-panel text-slate-200 border border-white/10 rounded-tl-none bg-[#0e131d]/70'
                  }`}
                >
                  {/* Attached Image Preview if present */}
                  {message.image?.dataUrl && (
                    <div className="mb-3">
                      <div
                        onClick={() => setEnlargedImageUrl(message.image!.dataUrl)}
                        className="relative group cursor-pointer max-w-xs sm:max-w-sm rounded-xl overflow-hidden border border-white/15 bg-black/50 hover:border-cyan-400/60 transition-all shadow-md"
                        title={language === 'bn' ? 'বড় করে দেখতে ক্লিক করুন' : 'Click to enlarge'}
                      >
                        <img
                          src={message.image.dataUrl}
                          alt={message.image.name || 'User uploaded image'}
                          className="w-full max-h-60 object-contain rounded-xl bg-black/40 group-hover:scale-[1.02] transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-cyan-200 font-semibold backdrop-blur-[2px]">
                          <Maximize2 className="w-4 h-4" />
                          <span>{language === 'bn' ? 'বড় করে দেখুন' : 'Enlarge view'}</span>
                        </div>
                        {message.image.name && (
                          <div className="p-1 px-2.5 bg-slate-950/90 text-[11px] text-slate-300 truncate border-t border-white/10 flex items-center justify-between">
                            <span className="truncate">{message.image.name}</span>
                            {message.image.size && (
                              <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                {(message.image.size / 1024).toFixed(0)} KB
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans break-words">{message.content}</div>

                  {/* Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-slate-500">{message.timestamp}</span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* TTS Speak Button (Assistant only) */}
                      {!isUser && (
                        <button
                          onClick={() => handleSpeak(message.id, message.content)}
                          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 transition-colors ${
                            isSpeaking ? 'text-cyan-400 font-semibold' : 'text-slate-400'
                          }`}
                          title={isSpeaking ? t.chat.stopReading : t.chat.readAloud}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span className="text-[11px]">{isSpeaking ? t.chat.stopReading : t.chat.readAloud}</span>
                        </button>
                      )}

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 text-slate-400 transition-colors"
                        title={t.chat.copy}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400">{t.chat.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">{t.chat.copy}</span>
                          </>
                        )}
                      </button>

                      {/* Make Anything Shortcut if message contains code */}
                      {!isUser && (message.content.includes('```') || message.content.toLowerCase().includes('react') || message.content.toLowerCase().includes('html')) && (
                        <button
                          onClick={() => onNavigateToMakeAnything(message.content)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] border border-cyan-500/20 transition-colors"
                          title={t.chat.openInMakeAnything}
                        >
                          <Code className="w-3 h-3" />
                          <span>{t.chat.openInMakeAnything}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="glass-panel border border-white/10 rounded-2xl rounded-tl-none p-4 max-w-[70%] bg-[#0e131d]/70">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-slate-400 ml-1">
                    {language === 'bn' ? 'NK IMRAN AI চিন্তা করছে...' : 'NK IMRAN AI is thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form Bar */}
      <div className="mt-3 shrink-0">
        {/* Attached Image Preview Card before sending */}
        {attachedImage && (
          <div className="mb-2 p-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-950/60 to-slate-900/80 border border-cyan-500/40 flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={attachedImage.dataUrl}
                alt="Selected preview"
                className="w-11 h-11 object-cover rounded-lg border border-cyan-500/40 bg-black/40 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <p className="text-xs font-semibold text-cyan-200 truncate">{attachedImage.name}</p>
                </div>
                <p className="text-[10px] text-cyan-400/80 truncate">
                  {(attachedImage.size / 1024).toFixed(0)} KB •{' '}
                  {language === 'bn'
                    ? 'এআই ছবি দেখে সমস্ত প্রশ্ন সমাধান ও বিশ্লেষণ করবে'
                    : 'AI will answer questions and explain image content'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveAttachedImage}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
              title={language === 'bn' ? 'ছবি বাতিল করুন' : 'Remove image'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hidden File Input for Image Selection (Gallery or Camera on mobile) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          id="chat-image-picker"
        />

        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end rounded-2xl glass-panel border border-white/10 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 shadow-2xl transition bg-[#0d121c]/90">
            
            {/* Image Attachment Button (Camera / Gallery) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 text-slate-400 hover:text-cyan-300 transition shrink-0 ${
                attachedImage ? 'text-cyan-400' : ''
              }`}
              title={language === 'bn' ? 'ছবি দিন (ক্যামেরা বা গ্যালারি থেকে প্রশ্ন বা ছবি আপলোড করুন)' : 'Attach image (Camera or Gallery)'}
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleMicClick}
              className={`p-3 text-slate-400 hover:text-cyan-300 transition shrink-0 ${
                isListening ? 'text-rose-400 animate-pulse' : ''
              }`}
              title={isListening ? 'Stop Listening' : 'Voice Input'}
            >
              {isListening ? <MicOff className="w-5 h-5 text-rose-400" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Auto-expanding Input Area */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                attachedImage
                  ? (language === 'bn' ? 'ছবি সম্পর্কিত প্রশ্ন লিখুন (বা সরাসরি পাঠাতে সেন্ড চাপুন)...' : 'Ask about this image (or click send to analyze)...')
                  : t.chat.inputPlaceholder
              }
              disabled={isLoading}
              className="flex-1 max-h-40 py-3.5 px-2 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none leading-relaxed"
            />

            {/* Send Button */}
            <div className="p-2 shrink-0">
              <button
                type="submit"
                disabled={(!inputMessage.trim() && !attachedImage) || isLoading}
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center transition shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed group"
                aria-label={t.chat.send}
              >
                <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 px-2">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{isOnline ? (language === 'bn' ? 'অনলাইন ও ক্লাউড সিঙ্ক সক্রিয়' : 'Online & Cloud Sync Active') : (language === 'bn' ? 'অফলাইন মোড (লোকাল ক্যাশ)' : 'Offline Mode (Local Cache)')}</span>
          </span>
          <span className="hidden sm:inline">ছবি ও দৃষ্টিশক্তি (Vision) যুক্ত</span>
        </div>
      </div>

      {/* Branded Microphone Permission Explanation Modal */}
      {showMicPermissionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-white/10 p-5 shadow-2xl bg-[#0c1018]/95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">NK IMRAN OFFICIAL AI</h4>
                <p className="text-xs text-slate-400">
                  {language === 'bn' ? 'মাইক্রোফোন পারমিশন অনুরোধ' : 'Microphone Permission'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'bn'
                ? 'NK IMRAN OFFICIAL AI আপনার ভয়েস ইনপুট টেক্সটে রূপান্তর করার জন্য মাইক্রোফোন ব্যবহার করতে চাচ্ছে। ব্রাউজার থেকে অনুমতি চাওয়া হলে “Allow” বা “অনুমতি দিন” নির্বাচন করুন।'
                : 'NK IMRAN OFFICIAL AI requires microphone access to transcribe your spoken voice into text prompts. Please select "Allow" on your browser prompt.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowMicPermissionDialog(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={startSpeechRecognition}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
              >
                {language === 'bn' ? 'মাইক্রোফোন চালু করুন' : 'Enable Microphone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-view Enlarged Image Modal */}
      {enlargedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setEnlargedImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargedImageUrl(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition"
              title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={enlargedImageUrl}
              alt="Full size view"
              className="max-h-[85vh] max-w-full object-contain rounded-xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
