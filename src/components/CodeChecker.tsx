import React, { useState } from 'react';
import { AppLanguage, CodeAuditResult } from '../types';
import { translations } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ShieldAlert, AlertTriangle, Info, CheckCircle2, Copy, Check, RefreshCw, Sparkles, FileText, ArrowRight } from 'lucide-react';

interface CodeCheckerProps {
  language: AppLanguage;
}

const SAMPLE_BUGGY_CODE = `function calculateTotal(items, discountCode) {
  var total = 0;
  for (var i = 0; i <= items.length; i++) {
    total = total + items[i].price;
  }
  
  if (discountCode) {
    // Dangerous evaluation of discount logic
    var finalAmount = eval(discountCode);
    console.log("Calculated total: " + finalAmount);
    return finalAmount;
  }
  return total;
}`;

export const CodeChecker: React.FC<CodeCheckerProps> = ({ language }) => {
  const t = translations[language];
  const { getIdToken } = useAuth();

  const [code, setCode] = useState(SAMPLE_BUGGY_CODE);
  const [selectedLang, setSelectedLang] = useState('javascript');
  const [mode, setMode] = useState<'comprehensive' | 'security' | 'bugs' | 'bengali_explain'>('comprehensive');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<CodeAuditResult | null>(null);
  const [copiedRefactor, setCopiedRefactor] = useState(false);

  const handleAudit = async (customCode?: string) => {
    const targetCode = (customCode || code).trim();
    if (!targetCode || isAuditing) return;

    setIsAuditing(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/code-check', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: targetCode,
          language: selectedLang,
          mode,
          outputLanguage: language,
        }),
      });

      if (!res.ok) throw new Error('Audit failed');
      const data: CodeAuditResult = await res.json();
      setAuditResult(data);
    } catch (err) {
      console.error('Audit error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCopyRefactor = () => {
    if (!auditResult?.refactoredCode) return;
    navigator.clipboard.writeText(auditResult.refactoredCode);
    setCopiedRefactor(true);
    setTimeout(() => setCopiedRefactor(false), 2000);
  };

  const handleApplyRefactor = () => {
    if (!auditResult?.refactoredCode) return;
    setCode(auditResult.refactoredCode);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header and Controls */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-cyan-400" />
              {t.codeChecker.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t.codeChecker.subtitle}</p>
          </div>

          {/* Controls: Language, Mode, Load Sample */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setCode(SAMPLE_BUGGY_CODE);
                handleAudit(SAMPLE_BUGGY_CODE);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition"
            >
              {t.codeChecker.loadSample}
            </button>

            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="glass-input text-xs rounded-lg px-3 py-2 border border-white/10 bg-slate-900 text-slate-200"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML / CSS</option>
              <option value="sql">SQL</option>
            </select>

            <select
              value={mode}
              onChange={(e: any) => setMode(e.target.value)}
              className="glass-input text-xs rounded-lg px-3 py-2 border border-white/10 bg-slate-900 text-slate-200"
            >
              <option value="comprehensive">{t.codeChecker.modes.comprehensive}</option>
              <option value="security">{t.codeChecker.modes.security}</option>
              <option value="bugs">{t.codeChecker.modes.bugs}</option>
              <option value="bengali_explain">{t.codeChecker.modes.bengali_explain}</option>
            </select>
          </div>
        </div>

        {/* Code Input Box */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#080d1a]">
          <div className="bg-slate-900/80 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">{selectedLang.toUpperCase()} SOURCE EDITOR</span>
            <span className="font-mono tabular-nums">{code.split('\n').length} lines</span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.codeChecker.codePlaceholder}
            rows={10}
            className="w-full bg-transparent p-4 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none resize-y selection:bg-cyan-500/30"
            spellCheck={false}
          />

          <div className="p-3 bg-slate-900/60 border-t border-white/10 flex items-center justify-end">
            <button
              onClick={() => handleAudit()}
              disabled={!code.trim() || isAuditing}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition shadow-md shadow-cyan-500/20"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.codeChecker.checking}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.codeChecker.checkBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results View */}
      {auditResult && (
        <div className="space-y-6">
          {/* Quality Rating Overview */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
                <span className="text-2xl font-black text-cyan-300 font-mono tracking-tight">{auditResult.rating}</span>
                <span className="text-[10px] text-slate-400 font-mono">GRADE</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{t.codeChecker.qualityScore}</h3>
                  <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {auditResult.score}/100
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">{auditResult.summary}</p>
              </div>
            </div>
          </div>

          {/* Split Column: Issues List (Left) and Refactored Code (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Column: Detected Issues */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{t.codeChecker.issuesFound}</span>
                <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">
                  {auditResult.issues.length}
                </span>
              </h3>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1">
                {auditResult.issues.map((issue, idx) => {
                  const isCritical = issue.severity === 'critical';
                  const isWarning = issue.severity === 'warning';
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        isCritical
                          ? 'bg-red-500/10 border-red-500/30 text-red-200'
                          : isWarning
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{issue.title}</span>
                        {issue.line && (
                          <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
                            Line {issue.line}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">{issue.description}</p>
                    </div>
                  );
                })}

                {auditResult.improvements && auditResult.improvements.length > 0 && (
                  <div className="pt-3 border-t border-white/10">
                    <span className="text-xs font-semibold text-slate-300 block mb-2">
                      {language === 'bn' ? 'উন্নতির সুপারিশমালা:' : 'Key Recommendations:'}
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-400">
                      {auditResult.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Refactored Code */}
            <div className="glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden">
              <div className="bg-slate-900/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">{t.codeChecker.refactoredCode}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyRefactor}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-medium transition"
                  >
                    <span>{t.codeChecker.applyRefactor}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCopyRefactor}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition border border-white/10"
                    title="Copy Refactored Code"
                  >
                    {copiedRefactor ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 bg-[#080d1a] overflow-auto">
                <pre className="text-xs sm:text-sm font-mono text-emerald-200 leading-relaxed whitespace-pre font-normal selection:bg-emerald-500/30">
                  <code>{auditResult.refactoredCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
