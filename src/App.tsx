/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActiveTab, AppLanguage } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { AIChat } from './components/AIChat';
import { MakeAnything } from './components/MakeAnything';
import { CodeChecker } from './components/CodeChecker';
import { BanglaTTS } from './components/BanglaTTS';
import { VideoMaker } from './components/VideoMaker';
import { SettingsPage } from './components/SettingsPage';
import { HeroOverview } from './components/HeroOverview';
import { Footer } from './components/Footer';
import { MessageSquare, Code2, ShieldAlert, Volume2, Clapperboard, Home, Settings, RefreshCw, Brain } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { translations } from './utils/translations';

function MainAppContent() {
  const isOnline = useOnlineStatus();
  const { user, otpEmailUser, isLoading } = useAuth();
  const [language, setLanguage] = useState<AppLanguage>('bn');
  const [activeTab, setActiveTab] = useState<ActiveTab | 'home'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [makeAnythingPrompt, setMakeAnythingPrompt] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const t = translations[language];

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-sky-500/30 to-blue-600/40 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4 animate-pulse">
          <Brain className="w-6 h-6 text-cyan-400" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight mb-2">
          NK IMRAN <span className="text-cyan-400">OFFICIAL AI</span>
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>{language === 'bn' ? 'সুরক্ষিত ক্লাউড সেশন যাচাই করা হচ্ছে...' : 'Verifying secure session...'}</span>
        </div>
      </div>
    );
  }

  // 2. Mandatory Authentication Gate: Unauthenticated visitors ONLY see LoginPage
  if (!user && !otpEmailUser) {
    return (
      <LoginPage
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  // 3. Authenticated App Experience
  const handleNavigateToMakeAnything = (prompt: string) => {
    setMakeAnythingPrompt(prompt);
    setActiveTab('make_anything');
  };

  const handleNavigateToChat = (sessionId?: string) => {
    if (sessionId) {
      setSelectedSessionId(sessionId);
    }
    setActiveTab('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartNewChat = () => {
    setSelectedSessionId(null);
    setActiveTab('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient Glow Gradients for Glassmorphism Depth */}
      <div
        aria-hidden="true"
        className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="fixed top-[40%] right-[20%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none -z-10"
      />

      {/* Top Header */}
      <Header
        activeTab={activeTab === 'home' ? 'chat' : activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        language={language}
        setLanguage={setLanguage}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Offline Status Alert Banner */}
      <OfflineIndicator language={language} isOnline={isOnline} />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-8">
        {activeTab === 'home' && (
          <HeroOverview
            language={language}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'chat' && (
          <AIChat
            language={language}
            onNavigateToMakeAnything={handleNavigateToMakeAnything}
            onNavigateToSettings={() => {
              setActiveTab('settings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            selectedSessionId={selectedSessionId}
            onSelectSession={(sid) => setSelectedSessionId(sid)}
          />
        )}

        {activeTab === 'make_anything' && (
          <MakeAnything
            language={language}
            initialPrompt={makeAnythingPrompt}
          />
        )}

        {activeTab === 'code_checker' && (
          <CodeChecker language={language} />
        )}

        {activeTab === 'bangla_tts' && (
          <BanglaTTS language={language} />
        )}

        {activeTab === 'video_maker' && (
          <VideoMaker language={language} />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            language={language}
            setLanguage={setLanguage}
            onNavigateToChat={handleNavigateToChat}
            onStartNewChat={handleStartNewChat}
          />
        )}
      </main>

      {/* Mobile Bottom Quick Navigation Dock (Accessible from every page) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/10 px-2 py-1.5 flex items-center justify-around backdrop-blur-xl bg-[#090b10]/95">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] transition ${
            activeTab === 'home' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>হোম</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] transition ${
            activeTab === 'chat' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t.tabs.chat}</span>
        </button>

        <button
          onClick={() => setActiveTab('make_anything')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] transition ${
            activeTab === 'make_anything' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>{t.tabs.make_anything}</span>
        </button>

        <button
          onClick={() => setActiveTab('code_checker')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] transition ${
            activeTab === 'code_checker' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t.tabs.code_checker}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[10px] transition ${
            activeTab === 'settings' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
          title="সেটিংস ও কন্ট্রোল প্যানেল"
        >
          <Settings className="w-4 h-4" />
          <span>{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
        </button>
      </div>

      {/* Footer */}
      <Footer language={language} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
