import React, { useState } from 'react';
import { Download, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppLanguage } from '../types';

interface PWAInstallButtonProps {
  language: AppLanguage;
  variant?: 'header' | 'settings' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const [justInstalled, setJustInstalled] = useState(false);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 3000);
    }
  };

  if (isInstalled || justInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>
            {language === 'bn'
              ? 'NK IMRAN OFFICIAL AI ফোনে ইনস্টল করা আছে'
              : 'NK IMRAN OFFICIAL AI is installed on this device'}
          </span>
        </div>
      );
    }
    return null;
  }

  // If browser doesn't support deferred prompt (e.g. Chrome already showing native or on desktop), show subtle button in Settings or when installable
  if (!isInstallable && variant !== 'settings') {
    return null;
  }

  if (variant === 'header') {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition shadow-sm"
        title={language === 'bn' ? 'হোম স্ক্রিনে ইনস্টল করুন' : 'Install to Home screen'}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {language === 'bn' ? 'ইনস্টল করুন' : 'Install App'}
        </span>
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900/60 border border-cyan-500/30 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              {language === 'bn' ? 'অফলাইন ও অ্যান্ড্রয়েড অ্যাপ ইনস্টলেশন' : 'Offline & Android App Install'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {language === 'bn'
                ? 'ফোনে কোনো অ্যাপ স্টোর ছাড়া সরাসরি ইনস্টল করুন এবং অফলাইনে ব্যবহার করুন।'
                : 'Install directly on your phone and run offline with fast access.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'ইনস্টল' : 'Install'}</span>
        </button>
      </div>
    </div>
  );
};
