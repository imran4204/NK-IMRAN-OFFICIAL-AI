import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppLanguage } from '../types';
import { 
  ShieldCheck, 
  Sparkles, 
  Mail, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Globe,
  Bot,
  Brain
} from 'lucide-react';

interface LoginPageProps {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ language, setLanguage }) => {
  const { signInWithGoogle, signInWithOtpVerified } = useAuth();
  
  const [activeMethod, setActiveMethod] = useState<'google' | 'email'>('google');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'enter_email' | 'enter_code'>('enter_email');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cooldown timer tick
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage(language === 'bn' ? 'লগইন পপআপ বন্ধ করা হয়েছে।' : 'Sign-in popup was closed.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          language === 'bn'
            ? 'এই ডোমেইনটি Firebase-এ অনুমোদিত নয়। দয়া করে Firebase Console-এ Authorized Domains তালিকায় বর্তমান ডোমেনটি যুক্ত করুন।'
            : 'This domain is not in Firebase Authorized Domains. Please authorize this domain in Firebase Console.'
        );
      } else {
        setErrorMessage(err.message || (language === 'bn' ? 'Google সাইন-ইন ব্যর্থ হয়েছে।' : 'Google Sign-In failed.'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage(language === 'bn' ? 'একটি সঠিক ইমেইল এড্রেস লিখুন।' : 'Please enter a valid email address.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), language }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || (language === 'bn' ? 'কোড পাঠানো সম্ভব হয়নি।' : 'Failed to send verification code.'));
        return;
      }

      setSuccessMessage(data.message || (language === 'bn' ? 'ভেরিফিকেশন কোড পাঠানো হয়েছে।' : 'Code sent.'));
      setOtpStep('enter_code');
      setCooldown(60);
    } catch (err: any) {
      setErrorMessage(language === 'bn' ? 'সার্ভারে সংযোগ স্থাপন করা সম্ভব হয়নি।' : 'Server connection failed.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage(language === 'bn' ? '৬ ডিজিটের সঠিক যাচাইকরণ কোড লিখুন।' : 'Please enter the 6-digit code.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim(), language }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || (language === 'bn' ? 'কোড যাচাই ব্যর্থ হয়েছে।' : 'Verification failed.'));
        return;
      }

      // Success: grant access via verified session token
      const sessionToken = data.token || 'otp-session-' + Date.now();
      await signInWithOtpVerified(email.trim(), sessionToken);
    } catch (err: any) {
      setErrorMessage(language === 'bn' ? 'কোড যাচাইয়ের সময় ত্রুটি ঘটেছে।' : 'Verification request error.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100 flex flex-col justify-between relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Ambient Glows */}
      <div
        aria-hidden="true"
        className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[650px] max-h-[650px] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[650px] max-h-[650px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none -z-10"
      />

      {/* Top Bar with Language Selector */}
      <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500/20 via-sky-500/30 to-blue-600/40 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <span className="font-extrabold text-xs tracking-wider text-cyan-300">NK</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            NK IMRAN <span className="text-cyan-400 font-medium">OFFICIAL AI</span>
          </span>
        </div>

        <button
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel hover:bg-white/10 transition text-xs font-medium text-slate-300 border border-white/10"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
        </button>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md glass-panel rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl relative backdrop-blur-2xl bg-[#0d121c]/80">
          
          {/* Brand Wordmark & Security Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'সুরক্ষিত ক্লাউড প্ল্যাটফর্ম' : 'Secure Cloud Intelligence'}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              NK IMRAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">OFFICIAL AI</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {language === 'bn'
                ? 'আপনার ব্যক্তিগত এআই ওয়ার্কস্পেস ও স্বয়ংক্রিয় মেমোরিতে প্রবেশ করতে অনুগ্রহ করে সাইন-ইন করুন।'
                : 'Please sign in to access your personal AI workstation and automatic persistent memory.'}
            </p>
          </div>

          {/* Authentication Method Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveMethod('google');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeMethod === 'google'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z" />
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z" />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMethod('email');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeMethod === 'email'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ইমেইল ওটিপি' : 'Email OTP'}</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Method 1: Google OAuth */}
          {activeMethod === 'google' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-800" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z" />
                  </svg>
                )}
                <span>
                  {isGoogleLoading
                    ? (language === 'bn' ? 'সাইন-ইন সংযোগ হচ্ছে...' : 'Connecting to Google...')
                    : (language === 'bn' ? 'Google দিয়ে প্রবেশ করুন' : 'Continue with Google')}
                </span>
              </button>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/30 text-[11px] text-cyan-200/90 leading-relaxed flex items-start gap-2">
                <Brain className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'bn'
                    ? 'Google অ্যাকাউন্টের মাধ্যমে আপনার কথোপকথন এবং ব্যক্তিগত মেমোরি স্বয়ংক্রিয়ভাবে নিরাপদ ক্লাউডে সিঙ্ক থাকবে।'
                    : 'Your conversations and personal AI context will automatically sync securely to your Google account ID.'}
                </span>
              </div>
            </div>
          )}

          {/* Method 2: Email OTP */}
          {activeMethod === 'email' && (
            <div>
              {otpStep === 'enter_email' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {language === 'bn' ? 'আপনার জিমেইল / ইমেইল ঠিকানা' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingOtp || !email}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{language === 'bn' ? 'যাচাইকরণ কোড পাঠান' : 'Send Verification Code'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        {language === 'bn' ? '৬-ডিজিটের যাচাইকরণ কোড' : '6-Digit Verification Code'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep('enter_email');
                          setOtpCode('');
                          setErrorMessage(null);
                        }}
                        className="text-[11px] text-cyan-400 hover:underline"
                      >
                        {language === 'bn' ? 'ইমেইল পরিবর্তন' : 'Change Email'}
                      </button>
                    </div>

                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        autoFocus
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingOtp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{language === 'bn' ? 'কোড যাচাই করে প্রবেশ করুন' : 'Verify & Enter'}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    {cooldown > 0 ? (
                      <p className="text-xs text-slate-400">
                        {language === 'bn' ? `পুনরায় কোড পাঠাতে অপেক্ষা করুন: ${cooldown} সেকেন্ড` : `Resend available in ${cooldown}s`}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{language === 'bn' ? 'পুনরায় কোড পাঠান' : 'Resend Code'}</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Privacy & Automatic Memory Policy Disclosure */}
          <div className="mt-8 pt-5 border-t border-white/10 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {language === 'bn' ? (
                <>
                  লগইন করার মাধ্যমে আপনি <strong className="text-slate-200">NK IMRAN OFFICIAL AI</strong>-এর অটোমেটিক মেমোরি ও ডেটা নীতিতে সম্মতি দিচ্ছেন। আপনার ডেটা এনক্রিপ্ট থাকে এবং আপনি যেকোনো সময় সকল হিস্ট্রি মুছে ফেলতে পারবেন।
                </>
              ) : (
                <>
                  By signing in, you agree to <strong className="text-slate-200">NK IMRAN OFFICIAL AI</strong> automatic memory policy. Your conversations are isolated to your account and can be permanently deleted anytime.
                </>
              )}
            </p>
          </div>

        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} NK IMRAN OFFICIAL AI. All rights reserved.
      </footer>
    </div>
  );
};
