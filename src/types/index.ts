export type AppLanguage = 'bn' | 'en';

export type ActiveTab = 'chat' | 'make_anything' | 'code_checker' | 'bangla_tts' | 'video_maker' | 'settings';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  preferredName?: string;
  preferredLanguage?: AppLanguage;
  interests?: string;
  consentGiven: boolean;
  autoMemoryEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatImageAttachment {
  dataUrl: string;
  mimeType: string;
  name?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image?: ChatImageAttachment;
}

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tone: 'friendly' | 'professional' | 'developer' | 'creative';
  summary?: string;
  messages: ChatMessage[];
}

export interface ConversationSummary {
  sessionId: string;
  title: string;
  summary: string;
  lastActive: string;
}

export interface AIGuidelines {
  guidelines: string;
  updatedAt: string;
  updatedBy: string;
  isDefault: boolean;
}

export interface ProjectFile {
  name: string;
  path: string;
  language: string;
  code: string;
  description: string;
}

export interface GeneratedProject {
  title: string;
  summary: string;
  techStack: string;
  previewHtml: string;
  files: ProjectFile[];
  setupInstructions: string[];
}

export interface CodeIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  line?: number;
  title: string;
  description: string;
}

export interface CodeAuditResult {
  rating: string;
  score: number;
  summary: string;
  issues: CodeIssue[];
  refactoredCode: string;
  improvements: string[];
}

export interface VideoScene {
  sceneNumber: number;
  timeframe: string;
  visualPrompt: string;
  cameraMovement: string;
  voiceover: string;
  soundEffects: string;
}

export interface VideoStoryboard {
  title: string;
  logline: string;
  style: string;
  aspectRatio: string;
  musicVibe: string;
  scenes: VideoScene[];
  renderSettings: {
    fps: number;
    resolution: string;
    colorGrading: string;
  };
}

export interface RealVideoJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_configured';
  prompt: string;
  videoUrl?: string;
  error?: string;
  type: 'text-to-video' | 'image-to-video';
  createdAt: string;
  completedAt?: string;
}
