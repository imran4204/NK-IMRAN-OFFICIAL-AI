import React from 'react';
import { ActiveTab, AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Code2, 
  ShieldAlert, 
  Volume2, 
  Clapperboard, 
  Globe, 
  Menu, 
  X, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';

import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const t = translations[language];
  const { user, otpEmailUser, profile, signOut } = useAuth();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: t.tabs.chat, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'make_anything', label: t.tabs.make_anything, icon: <Code2 className="w-4 h-4" /> },
    { id: 'code_checker', label: t.tabs.code_checker, icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'bangla_tts', label: t.tabs.bangla_tts, icon: <Volume2 className="w-4 h-4" /> },
    { id: 'video_maker', label: t.tabs.video_maker, icon: <Clapperboard className="w-4 h-4" /> },
    { id: 'settings', label: language === 'bn' ? 'সেটিংস' : 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const displayName = profile?.preferredName || user?.displayName || otpEmailUser?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 backdrop-blur-xl bg-[#090b10]/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        
        {/* Zone 1: Brand Wordmark */}
        <div 
          onClick={() => setActiveTab('chat')}
          className="flex items-center gap-3 cursor-pointer shrink-0 group select-none"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500/20 via-sky-500/30 to-blue-600/40 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-colors">
            <span className="font-extrabold text-xs tracking-wider text-cyan-300">NK</span>
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            NK IMRAN <span className="text-cyan-400 font-medium">OFFICIAL AI</span>
          </span>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs lg:text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* PWA Android Install Button */}
          <PWAInstallButton language={language} variant="header" />

          {/* Settings / User pill */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border transition text-xs font-medium ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
            title={language === 'bn' ? 'সেটিংস ও কন্ট্রোল প্যানেল' : 'Settings & Controls'}
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="max-w-[85px] sm:max-w-[120px] truncate font-medium">
              {displayName}
            </span>
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg glass-panel hover:bg-white/10 text-slate-200 transition-all border border-white/10"
            title="Language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-cyan-300">{language === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Quick Sign Out Button */}
          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
            title={language === 'bn' ? 'লগআউট' : 'Sign Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 glass-panel px-4 py-3 space-y-2 bg-[#090b10]/95">
          <div 
            onClick={() => {
              setActiveTab('settings');
              setIsMobileMenuOpen(false);
            }}
            className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">
                {displayName}
              </span>
            </div>
            <span className="text-[11px] text-cyan-300 font-medium">
              {language === 'bn' ? 'সেটিংস ও কন্ট্রোল' : 'Settings'}
            </span>
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              signOut();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>{language === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
          </button>
        </div>
      )}
    </header>
  );
};
