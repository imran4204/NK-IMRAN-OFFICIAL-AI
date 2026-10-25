import React, { useState } from 'react';
import { AppLanguage, GeneratedProject, ProjectFile } from '../types';
import { translations } from '../utils/translations';
import { Code2, Play, Download, Copy, Check, FileCode, Sparkles, RefreshCw, Layers, ExternalLink, Terminal } from 'lucide-react';
import JSZip from 'jszip';
import { useAuth } from '../context/AuthContext';

interface MakeAnythingProps {
  language: AppLanguage;
  initialPrompt?: string;
}

export const MakeAnything: React.FC<MakeAnythingProps> = ({ language, initialPrompt = '' }) => {
  const t = translations[language];
  const { getIdToken } = useAuth();

  const [prompt, setPrompt] = useState(initialPrompt || 'গ্লাস সাইবার ওয়েদার ট্র্যাকার ড্যাশবোর্ড');
  const [techStack, setTechStack] = useState('react');
  const [isGenerating, setIsGenerating] = useState(false);
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const handleGenerate = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt || prompt).trim();
    if (!targetPrompt || isGenerating) return;

    setIsGenerating(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/make-anything', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          prompt: targetPrompt,
          techStack,
          language,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data: GeneratedProject = await res.json();
      setProject(data);
      setActiveFileIndex(0);
      setPreviewKey((k) => k + 1);
    } catch (err) {
      console.error('Make Anything error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!project || !project.files[activeFileIndex]) return;
    navigator.clipboard.writeText(project.files[activeFileIndex].code);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadZip = async () => {
    if (!project) return;
    const zip = new JSZip();

    project.files.forEach((file) => {
      zip.file(file.path || file.name, file.code);
    });

    // Add setup guide
    if (project.setupInstructions && project.setupInstructions.length > 0) {
      zip.file('SETUP.txt', project.setupInstructions.join('\n'));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = (project.title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `${sanitizedTitle}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeFile: ProjectFile | undefined = project?.files[activeFileIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Prompt Generator */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <Code2 className="w-6 h-6 text-cyan-400" />
                {t.makeAnything.title}
              </h2>
              <p className="text-sm text-slate-400 mt-1">{t.makeAnything.subtitle}</p>
            </div>

            {/* Tech Stack Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">{t.makeAnything.techStack}:</span>
              <select
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                className="glass-input text-xs rounded-lg px-3 py-2 border border-white/10 bg-slate-900 text-slate-200 focus:ring-1 focus:ring-cyan-400"
              >
                <option value="react">React + TypeScript</option>
                <option value="html-js">HTML5 + CSS + Modern JS</option>
                <option value="python">Python + Flask/FastAPI</option>
                <option value="nodejs">Node.js + Express Backend</option>
              </select>
            </div>
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.makeAnything.promptPlaceholder}
              disabled={isGenerating}
              className="flex-1 glass-input rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-cyan-500/20 whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.makeAnything.generating}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.makeAnything.generateBtn}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Prompts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
            <span className="text-xs text-slate-400 shrink-0">{language === 'bn' ? 'নমুনা আইডিয়া:' : 'Presets:'}</span>
            {t.makeAnything.presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(preset);
                  handleGenerate(preset);
                }}
                className="text-xs text-slate-300 hover:text-white glass-panel-interactive px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Project Content */}
      {project && (
        <div className="space-y-6">
          {/* Project Summary Header */}
          <div className="glass-panel rounded-xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {project.techStack}
                </span>
                <h3 className="text-lg font-bold text-white">{project.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">{project.summary}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownloadZip}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-medium text-xs flex items-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.makeAnything.downloadZip}</span>
              </button>
            </div>
          </div>

          {/* Split Workspace: Files & Code (Left) and Live Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Column: Code Files Editor */}
            <div className="glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden min-h-[480px]">
              {/* File Tabs Navigation */}
              <div className="bg-slate-900/90 border-b border-white/10 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1.5">
                  {project.files.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveFileIndex(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono whitespace-nowrap transition-colors ${
                        activeFileIndex === idx
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{file.name}</span>
                    </button>
                  ))}
                </div>

                {/* Copy File Code Button */}
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition border border-white/10 shrink-0"
                >
                  {copiedFile ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-mono text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="font-mono text-[11px]">{t.makeAnything.copyCode}</span>
                    </>
                  )}
                </button>
              </div>

              {/* File Description bar */}
              {activeFile?.description && (
                <div className="px-4 py-2 bg-slate-950/40 border-b border-white/5 text-xs text-slate-400 font-mono">
                  {activeFile.path}: {activeFile.description}
                </div>
              )}

              {/* Code Pre Block */}
              <div className="flex-1 p-4 bg-[#080d1a] overflow-auto">
                <pre className="text-xs sm:text-sm font-mono text-cyan-100 leading-relaxed whitespace-pre font-normal selection:bg-cyan-500/30">
                  <code>{activeFile?.code || '// No file selected'}</code>
                </pre>
              </div>
            </div>

            {/* Right Column: Interactive Live Preview */}
            <div className="glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden min-h-[480px]">
              {/* Preview Header Bar */}
              <div className="bg-slate-900/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">{t.makeAnything.livePreview}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewKey((k) => k + 1)}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 transition border border-white/10"
                    title="Refresh Preview"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Iframe Sandbox */}
              <div className="flex-1 bg-slate-950 p-2 flex flex-col">
                <iframe
                  key={previewKey}
                  title="Interactive Project Preview"
                  srcDoc={project.previewHtml}
                  sandbox="allow-scripts allow-modals"
                  className="w-full flex-1 rounded-xl border border-white/10 bg-[#090d16]"
                />
              </div>

              {/* Setup guide footer */}
              {project.setupInstructions && (
                <div className="p-3 bg-slate-950/60 border-t border-white/10 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-1">
                    {language === 'bn' ? 'চালানোর নির্দেশনা:' : 'Setup Guide:'}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                    {project.setupInstructions.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
