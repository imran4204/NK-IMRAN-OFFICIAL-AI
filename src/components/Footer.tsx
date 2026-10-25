import React from 'react';
import { AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { Sparkles, Terminal } from 'lucide-react';

interface FooterProps {
  language: AppLanguage;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = translations[language];

  return (
    <footer className="w-full glass-panel border-t border-white/10 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 font-extrabold text-[10px]">
            NK
          </div>
          <span className="font-semibold text-slate-200">NK IMRAN OFFICIAL AI</span>
          <span className="text-slate-600">·</span>
          <span>{t.tagline}</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span>{t.footer.copyright}</span>
        </div>
      </div>
    </footer>
  );
};
