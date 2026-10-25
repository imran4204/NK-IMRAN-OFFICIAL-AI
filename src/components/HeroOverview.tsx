import React from 'react';
import { ActiveTab, AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { MessageSquare, Code2, ShieldAlert, Volume2, Clapperboard, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface HeroOverviewProps {
  language: AppLanguage;
  setActiveTab: (tab: ActiveTab) => void;
}

export const HeroOverview: React.FC<HeroOverviewProps> = ({ language, setActiveTab }) => {
  const t = translations[language];

  const features: {
    id: ActiveTab;
    title: string;
    description: string;
    icon: React.ReactNode;
    tag: string;
  }[] = [
    {
      id: 'chat',
      title: t.tabs.chat,
      description: language === 'bn'
        ? 'প্রমিত বাংলা এবং ইংরেজিতে বুদ্ধিমান এআই কথোপকথন ও প্রম্পট সমাধান।'
        : 'Fluent bilingual conversational intelligence with voice synthesis readback.',
      icon: <MessageSquare className="w-5 h-5 text-cyan-400" />,
      tag: 'Bilingual AI',
    },
    {
      id: 'make_anything',
      title: t.tabs.make_anything,
      description: language === 'bn'
        ? 'যেকোনো আইডিয়া থেকে তাৎক্ষণিক সম্পূর্ণ প্রজেক্ট কোড এবং লাইভ প্রিভিউ।'
        : 'Generate full multi-file projects, interactive previews, and ZIP archives.',
      icon: <Code2 className="w-5 h-5 text-sky-400" />,
      tag: 'Code Generator',
    },
    {
      id: 'code_checker',
      title: t.tabs.code_checker,
      description: language === 'bn'
        ? 'কোড অডিট, বাগ সমাধান, সিনট্যাক্স অ্যানালাইসিস এবং বাংলায় ব্যাখ্যা।'
        : 'Detect syntax errors, security vulnerabilities, and receive refactored code.',
      icon: <ShieldAlert className="w-5 h-5 text-emerald-400" />,
      tag: 'Code Auditor',
    },
    {
      id: 'bangla_tts',
      title: t.tabs.bangla_tts,
      description: language === 'bn'
        ? 'বাংলা ও ইংরেজি টেক্সটকে রূপান্তর করুন স্পষ্ট ও স্বাভাবিক ভয়েসে।'
        : 'Convert Bengali and English text into natural spoken neural audio.',
      icon: <Volume2 className="w-5 h-5 text-blue-400" />,
      tag: 'Neural Voice',
    },
    {
      id: 'video_maker',
      title: t.tabs.video_maker,
      description: language === 'bn'
        ? 'সিনেম্যাটিক ভিডিও আইডিয়া থেকে দৃশ্যপট, ক্যামেরা মুভমেন্ট ও ভয়েসওভার স্ক্রিপ্ট।'
        : 'Create cinematic AI video storyboards, camera directions, and voiceover cues.',
      icon: <Clapperboard className="w-5 h-5 text-indigo-400" />,
      tag: 'Cinematic Studio',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero Visual Card with Scrim */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 glass-panel min-h-[380px] sm:min-h-[440px] flex items-center">
        {/* Background Image */}
        <img
          src="/src/assets/images/hero_ai_workstation_1792744743597.jpg"
          alt="NK IMRAN OFFICIAL AI Workstation"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40 scale-100 transition-transform duration-700 hover:scale-105"
        />

        {/* Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#090b10] via-[#090b10]/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-transparent to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-2xl p-6 sm:p-10 lg:p-12 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'অফিসিয়াল এআই ওয়ার্কস্টেশন' : 'Official AI Workstation'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            NK IMRAN <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
              OFFICIAL AI
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {language === 'bn'
              ? 'বাংলা ভাষাভাষী ডেভেলপার, কন্টেন্ট ক্রিয়েটর ও প্রযুক্তপ্রেমীদের জন্য এক অনন্য ডার্ক আধুনিক এআই প্ল্যাটফর্ম। কৃত্রিম বুদ্ধিমত্তার অপার শক্তি এখন এক ক্লিকে।'
              : 'A modern, dark-themed AI intelligence suite engineered for high-performance development, bilingual Bengali workflows, and cinematic multimedia generation.'}
          </p>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              onClick={() => setActiveTab('chat')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/25"
            >
              <span>{language === 'bn' ? 'এআই চ্যাট শুরু করুন' : 'Launch AI Chat'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('make_anything')}
              className="px-6 py-3 rounded-xl glass-panel-interactive border border-white/10 text-slate-200 hover:text-white font-medium text-sm flex items-center gap-2 transition"
            >
              <span>{language === 'bn' ? 'কোড জেনারেটর' : 'Make Anything'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Navigation Bento Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {language === 'bn' ? 'প্রধান মডিউলসমূহ' : 'Core Capabilities'}
          </h2>
          <span className="text-xs text-slate-400">5 Powerful AI Tools</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat) => (
            <div
              key={feat.id}
              onClick={() => setActiveTab(feat.id)}
              className="glass-panel-interactive rounded-2xl p-6 border border-white/10 cursor-pointer flex flex-col justify-between space-y-4 group transition-all hover:scale-[1.01]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-400/40 transition-colors">
                    {feat.icon}
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15">
                    {feat.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
              </div>

              <div className="flex items-center text-xs font-semibold text-cyan-400 gap-1.5 pt-2 border-t border-white/5">
                <span>{language === 'bn' ? 'টুলটি খুলুন' : 'Open Studio'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
