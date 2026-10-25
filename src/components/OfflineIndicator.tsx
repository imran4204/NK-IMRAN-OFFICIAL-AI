import React from 'react';
import { WifiOff, HardDrive, RefreshCw } from 'lucide-react';
import { AppLanguage } from '../types';

interface OfflineIndicatorProps {
  language: AppLanguage;
  isOnline: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language, isOnline }) => {
  if (isOnline) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-amber-600/20 border-b border-amber-500/30 px-3 py-2 text-xs text-amber-200 flex items-center justify-between gap-2 shadow-lg backdrop-blur-md animate-fadeIn">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
          <WifiOff className="w-3 h-3" />
        </div>
        <p className="leading-snug">
          <strong className="font-semibold text-amber-100">
            {language === 'bn' ? 'অফলাইন মোড সক্রিয়:' : 'Offline Mode Active:'}
          </strong>{' '}
          {language === 'bn'
            ? 'ইন্টারনেট সংযোগ নেই। পূর্বের সমস্ত সংরক্ষিত চ্যাট হিস্ট্রি পড়া যাচ্ছে। সংযোগ এলে নতুন বার্তা স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।'
            : 'No internet connection. Past conversations are available locally. Messages will sync when connection returns.'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-amber-300">
          <HardDrive className="w-3 h-3" />
          <span>{language === 'bn' ? 'লোকাল ক্যাশ' : 'Local Cache'}</span>
        </span>
        <button
          onClick={() => window.location.reload()}
          className="p-1 rounded hover:bg-amber-500/20 text-amber-300 transition"
          title={language === 'bn' ? 'পুনরায় সংযোগ পরীক্ষা করুন' : 'Retry connection'}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
