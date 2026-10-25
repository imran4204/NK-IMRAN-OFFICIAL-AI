import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppLanguage } from '../types';
import { X, Mail, ShieldCheck, Sparkles, AlertCircle, RefreshCw, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, language }) => {
  const { user, signInWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Close modal when user signs in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage(language === 'bn' ? 'লগইন পপআপ বন্ধ করা হয়েছে।' : 'Sign in popup was closed.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          language === 'bn'
            ? 'এই ডোমেইনটি ফায়ারবেসে অথরাইজড নয়। অনুগ্রহ করে Firebase Console-এ গিয়ে এই ডোমেনটি Authorized Domains তালিকায় যুক্ত করুন।'
            : 'This domain is not in Firebase Authorized Domains. Please add this domain in Firebase Console.'
        );
      } else {
        setErrorMessage(err.message || (language === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Sign-in failed.'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSendingOtp || cooldown > 0) return;

    setIsSendingOtp(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowConfigNotice(false);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), language }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.providerNotConfigured) {
          setShowConfigNotice(true);
        }
        throw new Error(data.error || (language === 'bn' ? 'কোড পাঠাতে ব্যর্থ হয়েছে।' : 'Failed to send OTP code.'));
      }

      setStep('otp');
      setCooldown(60);
      setSuccessMessage(data.message || (language === 'bn' ? 'যাচাইকরণ কোড পাঠানো হয়েছে।' : 'Verification code sent.'));
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP request failed.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || isVerifyingOtp) return;

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
        throw new Error(data.error || (language === 'bn' ? 'কোড যাচাই ব্যর্থ হয়েছে।' : 'Verification failed.'));
      }

      setSuccessMessage(language === 'bn' ? 'ইমেইল সফলভাবে যাচাই হয়েছে!' : 'Email successfully verified!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-white/15 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition"
          aria-label="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-sky-500/30 to-blue-600/40 border border-cyan-500/40 items-center justify-center shadow-lg shadow-cyan-500/10 mb-1">
            <span className="font-extrabold text-sm tracking-wider text-cyan-300">NK</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {language === 'bn' ? 'লগইন ও ব্যক্তিগত মেমোরি' : 'Sign In & AI Memory'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {language === 'bn'
              ? 'সুরক্ষিত জিমেইল অথেন্টিকেশন দিয়ে আপনার ব্যক্তিগত এআই মেমোরি সক্রিয় করুন।'
              : 'Sign in with verified Google credentials to unlock persistent personal AI memory.'}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1 whitespace-pre-wrap">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action 1: Google Sign In (Primary OAuth) */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-white text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-slate-100 transition shadow-lg shadow-white/5 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{language === 'bn' ? 'গুগল দিয়ে চালিয়ে যান' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">
              {language === 'bn' ? 'অথবা ইমেইল কোড' : 'OR EMAIL OTP'}
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Action 2: Email Verification OTP */}
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === 'bn' ? 'আপনার ইমেইল এড্রেস:' : 'Your Email Address:'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!email.trim() || isSendingOtp || cooldown > 0}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'bn' ? 'কোড পাঠানো হচ্ছে...' : 'Sending Code...'}</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>{language === 'bn' ? `অপেক্ষা করুন (${cooldown}s)` : `Wait (${cooldown}s)`}</span>
                ) : (
                  <>
                    <span>{language === 'bn' ? 'যাচাইকরণ কোড পাঠান' : 'Send Verification Code'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {language === 'bn' ? '৬-ডিজিটের কোড লিখুন:' : 'Enter 6-Digit Code:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    {language === 'bn' ? 'ইমেইল পরিবর্তন' : 'Change Email'}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-center font-mono tracking-widest text-base text-cyan-200 placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={otpCode.length !== 6 || isVerifyingOtp}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition disabled:opacity-40 shadow-lg shadow-cyan-500/20"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <span>{language === 'bn' ? 'কোড যাচাই করুন' : 'Verify & Continue'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Privacy & Transparency disclosure per Requirement 14 */}
          <div className="pt-3 border-t border-white/5 space-y-1.5">
            <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                {language === 'bn'
                  ? 'নিরাপত্তা প্রতিশ্রুতি: আমরা অপ্রয়োজনীয় ব্যক্তিগত তথ্য সংগ্রহ করি না। অনুমোদিত মেমোরি শুধুমাত্র আপনার ভেরিফাইড আইডি দিয়ে ফায়ারস্টোর ডাটাবেসে সুরক্ষিত থাকে।'
                  : 'Zero-Knowledge Storage: Only explicitly approved memories are retained under your unique verified ID in Firestore.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
