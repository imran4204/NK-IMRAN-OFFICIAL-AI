import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppLanguage, AIGuidelines, ChatSession } from '../types';
import { translations } from '../utils/translations';
import { 
  Settings, 
  Brain, 
  History, 
  ShieldCheck, 
  Sliders, 
  LogOut, 
  Trash2, 
  Plus, 
  MessageSquare, 
  Clock, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Crown, 
  Lock, 
  Globe, 
  User,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsPageProps {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  onNavigateToChat: (sessionId?: string) => void;
  onStartNewChat: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  language,
  setLanguage,
  onNavigateToChat,
  onStartNewChat,
}) => {
  const t = translations[language];
  const { 
    user, 
    otpEmailUser, 
    profile, 
    chatSessions, 
    deleteChatSession, 
    clearAllChatSessions, 
    updateProfile, 
    deleteAccount, 
    signOut, 
    getIdToken 
  } = useAuth();

  const userEmail = (user?.email || otpEmailUser?.email || '').toLowerCase().trim();
  const isOwner = userEmail === 'nuhubabu84@gmail.com';

  // Active section tab
  const [activeSection, setActiveSection] = useState<'guidelines' | 'history' | 'profile' | 'privacy'>('history');

  // AI Guidelines state
  const [guidelinesData, setGuidelinesData] = useState<AIGuidelines | null>(null);
  const [guidelinesText, setGuidelinesText] = useState('');
  const [originalGuidelinesText, setOriginalGuidelinesText] = useState('');
  const [isLoadingGuidelines, setIsLoadingGuidelines] = useState(false);
  const [isSavingGuidelines, setIsSavingGuidelines] = useState(false);
  const [isResettingGuidelines, setIsResettingGuidelines] = useState(false);

  // Profile state
  const [preferredName, setPreferredName] = useState(profile?.preferredName || '');
  const [interests, setInterests] = useState(profile?.interests || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Modal / Confirm state
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch guidelines from server
  const fetchGuidelines = async () => {
    setIsLoadingGuidelines(true);
    setErrorMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/guidelines', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to load guidelines');
      const data: AIGuidelines = await res.json();
      setGuidelinesData(data);
      setGuidelinesText(data.guidelines);
      setOriginalGuidelinesText(data.guidelines);
    } catch (err: any) {
      console.error('Error fetching guidelines:', err);
      setErrorMessage(language === 'bn' ? 'গাইডলাইন লোড করতে সমস্যা হয়েছে।' : 'Failed to load AI guidelines.');
    } finally {
      setIsLoadingGuidelines(false);
    }
  };

  useEffect(() => {
    fetchGuidelines();
  }, []);

  // Save AI Guidelines (Owner only)
  const handleSaveGuidelines = async () => {
    if (!guidelinesText.trim()) return;
    setIsSavingGuidelines(true);
    setErrorMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/guidelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ guidelines: guidelinesText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save guidelines');
      }

      setGuidelinesData((prev) => (prev ? { ...prev, guidelines: data.guidelines, updatedAt: data.updatedAt } : null));
      setOriginalGuidelinesText(data.guidelines);
      showToast(language === 'bn' ? 'মালিকানাধীন এআই গাইডলাইন সফলভাবে সংরক্ষিত ও কার্যকর হয়েছে!' : 'AI Guidelines successfully saved and active!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving guidelines');
    } finally {
      setIsSavingGuidelines(false);
    }
  };

  // Reset Guidelines (Owner only)
  const handleResetGuidelines = async () => {
    setIsResettingGuidelines(true);
    setErrorMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/guidelines/reset', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');

      setGuidelinesText(data.guidelines);
      setOriginalGuidelinesText(data.guidelines);
      setGuidelinesData((prev) => (prev ? { ...prev, guidelines: data.guidelines, updatedAt: data.updatedAt, isDefault: true } : null));
      showToast(language === 'bn' ? 'ডিফল্ট এআই গাইডলাইন সফলভাবে পুনরুদ্ধার করা হয়েছে।' : 'Default guidelines restored.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset guidelines');
    } finally {
      setIsResettingGuidelines(false);
    }
  };

  // Save user profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        preferredName: preferredName.trim(),
        interests: interests.trim(),
        preferredLanguage: language,
      });
      showToast(language === 'bn' ? 'প্রোফাইল সফলভাবে আপডেট হয়েছে!' : 'Profile updated successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Clear all conversations
  const handleClearAllHistory = async () => {
    setIsClearingHistory(true);
    try {
      await clearAllChatSessions();
      setShowClearHistoryConfirm(false);
      showToast(language === 'bn' ? 'সকল কথোপকথন সফলভাবে মুছে ফেলা হয়েছে।' : 'All chat history deleted.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error(err);
      setIsDeletingAccount(false);
    }
  };

  const hasGuidelineChanges = guidelinesText !== originalGuidelinesText;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Settings Top Header */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c1018]/90">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-sky-500/30 to-blue-600/40 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Settings className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                NK IMRAN OFFICIAL AI
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {language === 'bn' ? 'সেটিংস' : 'Settings'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {userEmail} {isOwner && <span className="text-amber-400 font-semibold">• Authorized Owner</span>}
            </p>
          </div>
        </div>

        {/* Quick New Chat Button */}
        <button
          onClick={onStartNewChat}
          className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-2 transition shadow-sm shadow-cyan-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'bn' ? 'নতুন চ্যাট শুরু করুন' : 'Start New Chat'}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Offline PWA Installation Banner */}
      <PWAInstallButton language={language} variant="banner" />

      {/* Settings Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveSection('history')}
          className={`p-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition border ${
            activeSection === 'history'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'glass-panel text-slate-400 hover:text-white border-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{language === 'bn' ? 'চ্যাট হিস্ট্রি' : 'Chat History'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
            {chatSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('guidelines')}
          className={`p-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition border ${
            activeSection === 'guidelines'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'glass-panel text-slate-400 hover:text-white border-white/5'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>{language === 'bn' ? 'এআই গাইডলাইনস' : 'AI Guidelines'}</span>
        </button>

        <button
          onClick={() => setActiveSection('profile')}
          className={`p-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition border ${
            activeSection === 'profile'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'glass-panel text-slate-400 hover:text-white border-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{language === 'bn' ? 'প্রোফাইল ও ভাষা' : 'Profile & Language'}</span>
        </button>

        <button
          onClick={() => setActiveSection('privacy')}
          className={`p-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition border ${
            activeSection === 'privacy'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'glass-panel text-slate-400 hover:text-white border-white/5'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{language === 'bn' ? 'প্রাইভেসি ও ডেটা' : 'Privacy & Data'}</span>
        </button>
      </div>

      {/* Main Content Sections */}
      <div className="glass-panel rounded-2xl border border-white/10 p-5 sm:p-7 bg-[#0b0f17]/90">
        
        {/* ==================================================== */}
        {/* SECTION 1: CHAT HISTORY (LIKE CHATGPT) */}
        {/* ==================================================== */}
        {activeSection === 'history' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>{language === 'bn' ? 'স্বয়ংক্রিয় চ্যাট হিস্ট্রি' : 'Automatic Chat History'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'bn'
                    ? 'আপনার প্রতিটি কথোপকথন ডেটাবেসে স্থায়ীভাবে জমা থাকে। যেকোনো কথোপকথনে ট্যাপ করে সরাসরি তা চ্যাটে খুলুন।'
                    : 'Every conversation is automatically persisted to the database. Tap any conversation to load it directly.'}
                </p>
              </div>

              {chatSessions.length > 0 && (
                <button
                  onClick={() => setShowClearHistoryConfirm(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সব হিস্ট্রি মুছুন' : 'Clear All History'}</span>
                </button>
              )}
            </div>

            {/* Clear All Confirmation Box */}
            {showClearHistoryConfirm && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-rose-200">
                      {language === 'bn' ? 'আপনি কি নিশ্চিত সব কথোপকথন মুছে ফেলতে চান?' : 'Delete all conversation history?'}
                    </h4>
                    <p className="text-[11px] text-rose-300/80 mt-1">
                      {language === 'bn'
                        ? 'এটি আপনার অ্যাকাউন্টের সকল পূর্ববর্তী চ্যাট ও বার্তা ডেটাবেস থেকে স্থায়ীভাবে ডিলিট করবে।'
                        : 'This will permanently remove all saved chats from your cloud database account.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowClearHistoryConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleClearAllHistory}
                    disabled={isClearingHistory}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {isClearingHistory && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{language === 'bn' ? 'হ্যাঁ, সম্পূর্ণ মুছুন' : 'Yes, Delete All'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Conversations List */}
            {chatSessions.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-60" />
                <p className="text-sm font-medium text-slate-400">
                  {language === 'bn' ? 'এখনও কোনো কথোপকথন হিস্ট্রি নেই।' : 'No saved conversations yet.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'bn' ? 'AI Chat-এ মেসেজ পাঠানো শুরু করলেই স্বয়ংক্রিয়ভাবে অর্থবহ শিরোনামসহ এখানে জমা হবে।' : 'Start talking in AI Chat to automatically build your conversation history.'}
                </p>
                <button
                  onClick={onStartNewChat}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'প্রথম চ্যাট শুরু করুন' : 'Start First Chat'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/30 transition flex items-center justify-between gap-3 group"
                  >
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onNavigateToChat(session.id)}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                        <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-cyan-300 transition truncate">
                          {session.title || (language === 'bn' ? 'কথোপকথন' : 'Conversation')}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(session.updatedAt || session.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </span>
                        <span>•</span>
                        <span>{session.messages?.length || 0} {language === 'bn' ? 'বার্তা' : 'messages'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onNavigateToChat(session.id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 text-xs font-medium transition flex items-center gap-1"
                        title="Open in Chat"
                      >
                        <span>{language === 'bn' ? 'খুলুন' : 'Open'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteChatSession(session.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title={language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* SECTION 2: OWNER-CONTROLLED AI GUIDELINES */}
        {/* ==================================================== */}
        {activeSection === 'guidelines' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    {language === 'bn' ? 'মালিকানাধীন এআই গাইডলাইনস' : 'Owner-Controlled AI Guidelines'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Highest Priority
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'bn'
                    ? 'এই নির্দেশনাবলী প্রতিটি এআই রিকোয়েস্টে সর্বোচ্চ অগ্রাধিকার (Highest Customizable Priority) হিসেবে কার্যকর হয়।'
                    : 'These instructions act as the authoritative single source of customizable behavior for all model requests.'}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="text-emerald-300 font-mono text-[11px]">
                  {language === 'bn' ? 'সার্ভারে সক্রিয়' : 'Active on Server'}
                </span>
              </div>
            </div>

            {/* Permission Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              isOwner 
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' 
                : 'bg-white/[0.02] border-white/10 text-slate-300'
            }`}>
              {isOwner ? (
                <>
                  <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="text-white">অনুমোদিত ওয়েবসাইট মালিক (Owner Verified): </strong>
                    {language === 'bn'
                      ? 'আপনি সাইটের অনুমোদিত মালিক হিসেবে যেকোনো সময় এই গাইডলাইন পরিবর্তন করতে পারেন। সেভ করার সাথে সাথে প্রতিটি নতুন চ্যাট ও কোড তৈরিতে এটি প্রতিফলিত হবে।'
                      : 'You are authenticated as the authorized owner. You can update global guidelines anytime with instant server-wide reflection.'}
                  </div>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="text-white">পঠনযোগ্য মোড (Read-Only Mode): </strong>
                    {language === 'bn'
                      ? `শুধুমাত্র অনুমোদিত ওয়েবসাইট মালিক (${guidelinesData?.updatedBy || 'nuhubabu84@gmail.com'}) গ্লোবাল গাইডলাইন সম্পাদন করতে পারেন। সাধারণ ব্যবহারকারীরা শুধু সক্রিয় নির্দেশনা দেখতে পারবেন।`
                      : `Only the authorized website owner (${guidelinesData?.updatedBy || 'nuhubabu84@gmail.com'}) can edit global AI guidelines.`}
                  </div>
                </>
              )}
            </div>

            {/* Guidelines Editor / Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="font-semibold text-slate-200">
                  {language === 'bn' ? 'সার্বভৌম এআই নির্দেশনা টেক্সট:' : 'Authoritative AI Guidelines Text:'}
                </label>
                {guidelinesData?.updatedAt && (
                  <span className="text-[11px] font-mono text-slate-500">
                    {language === 'bn' ? 'সর্বশেষ আপডেট: ' : 'Last Updated: '}
                    {new Date(guidelinesData.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <textarea
                rows={10}
                value={guidelinesText}
                onChange={(e) => setGuidelinesText(e.target.value)}
                disabled={!isOwner || isSavingGuidelines}
                placeholder="মডেলের ব্যক্তিত্ব, কোডিং স্ট্যান্ডার্ড, আউটপুট ফরম্যাট এবং কাজের নিয়ম সংক্রান্ত সুনির্দিষ্ট নির্দেশনা এখানে লিখুন..."
                className={`w-full p-4 rounded-xl border text-xs sm:text-sm font-mono leading-relaxed resize-y focus:outline-none transition ${
                  isOwner
                    ? 'bg-black/40 border-white/15 text-slate-100 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60'
                    : 'bg-black/20 border-white/10 text-slate-300 cursor-not-allowed opacity-90'
                }`}
              />
            </div>

            {/* Action Buttons for Owner */}
            {isOwner && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetGuidelines}
                  disabled={isResettingGuidelines || isSavingGuidelines}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition flex items-center gap-1.5"
                >
                  {isResettingGuidelines ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>{language === 'bn' ? 'ডিফল্ট পুনরুদ্ধার করুন' : 'Restore Default'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {hasGuidelineChanges && (
                    <button
                      type="button"
                      onClick={() => setGuidelinesText(originalGuidelinesText)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveGuidelines}
                    disabled={isSavingGuidelines || !hasGuidelineChanges}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSavingGuidelines ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{language === 'bn' ? 'গাইডলাইন সংরক্ষণ করুন' : 'Save Guidelines'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* SECTION 3: PROFILE & LANGUAGE */}
        {/* ==================================================== */}
        {activeSection === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
            <div className="pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>{language === 'bn' ? 'প্রোফাইল ও পছন্দের সেটিংস' : 'Profile & Preferences'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'bn' ? 'এআই উত্তর প্রদানের সময় এই পছন্দগুলো মনে রেখে ব্যক্তিগতকৃত অভিজ্ঞতা দেবে।' : 'Customize your profile attributes to guide personal AI responses.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {language === 'bn' ? 'আপনার ডাকনাম বা পছন্দের নাম' : 'Preferred Name'}
              </label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="যেমন: ইমরান ভাই"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {language === 'bn' ? 'চ্যাটে আপনাকে এই নামে সম্মানসহ সম্বোধন করা হবে।' : 'The model uses this name when addressing you.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {language === 'bn' ? 'ইন্টারফেস ভাষা নির্বাচন' : 'Interface Language'}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('bn')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition border flex items-center justify-center gap-2 ${
                    language === 'bn'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>বাংলা (Bengali)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition border flex items-center justify-center gap-2 ${
                    language === 'en'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>English</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {language === 'bn' ? 'আপনার কাজের ক্ষেত্র ও টেকনিক্যাল আগ্রহ' : 'Interests & Technical Domains'}
              </label>
              <textarea
                rows={3}
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="যেমন: ফুলস্ট্যাক ওয়েব ডেভেলপমেন্ট, পাইথন, অ্যান্ড্রয়েড অ্যাপস"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-cyan-500/20"
            >
              {isSavingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{language === 'bn' ? 'প্রোফাইল সংরক্ষণ করুন' : 'Save Profile'}</span>
            </button>
          </form>
        )}

        {/* ==================================================== */}
        {/* SECTION 4: PRIVACY & DATA CONTROLS */}
        {/* ==================================================== */}
        {activeSection === 'privacy' && (
          <div className="space-y-6 max-w-xl">
            <div className="pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>{language === 'bn' ? 'ডেটা নিরাপত্তা ও নিয়ন্ত্রণ' : 'Privacy & Data Controls'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'bn' ? 'আপনার ডেটার সম্পূর্ণ মালিকানা আপনার। আপনি যেকোনো সময় সম্পূর্ণ তথ্য মুছে ফেলতে পারেন।' : 'You retain full sovereignty over your conversation and account data.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                • <strong className="text-white">এনক্রিপ্টেড আইসোলেশন:</strong> আপনার সেশনসমূহ শুধুমাত্র আপনার ভেরিফাইড ইউজার আইডির অধীনে সংরক্ষিত।
              </p>
              <p>
                • <strong className="text-white">সুরক্ষিত নিয়মাবলী:</strong> Firestore ABAC হার্ডেন্ড রুলসের মাধ্যমে অন্য কোনো অ্যাকাউন্ট আপনার তথ্য পড়তে পারবে না।
              </p>
              <p>
                • <strong className="text-white">লগআউট সুরক্ষা:</strong> লগআউট করলে ব্রাউজার ক্যাশ ও সেশন তাৎক্ষণিকভাবে বন্ধ হয়ে যায়।
              </p>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <h4 className="text-xs font-semibold text-rose-300">
                {language === 'bn' ? 'অ্যাকাউন্ট ও সম্পূর্ণ ডেটা অপসারণ' : 'Danger Zone'}
              </h4>

              {showDeleteAccountConfirm ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <p className="text-xs text-rose-200">
                    {language === 'bn'
                      ? 'আপনি কি নিশ্চিত? এটি আপনার অ্যাকাউন্ট, সংরক্ষিত সকল কথোপকথন এবং প্রোফাইল তথ্য স্থায়ীভাবে মুছে দেবে।'
                      : 'Are you sure? This permanently deletes your account and all conversations from the database.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteAccountConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {isDeletingAccount && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{language === 'bn' ? 'হ্যাঁ, স্থায়ীভাবে অ্যাকাউন্ট মুছুন' : 'Permanently Delete Account'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountConfirm(true)}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'অ্যাকাউন্ট ও সব ডেটা মুছে ফেলুন' : 'Delete Account & All Data'}</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* 4. VISIBLE LOGOUT BUTTON AT THE VERY BOTTOM */}
      {/* ==================================================== */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          NK IMRAN OFFICIAL AI • {userEmail}
        </div>

        <button
          onClick={async () => {
            await signOut();
          }}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/30 hover:border-rose-500/50 text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 group"
        >
          <LogOut className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>{language === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
        </button>
      </div>

    </div>
  );
};
