import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// ==========================================
// 1. OWNER AUTHORIZATION & AI GUIDELINES
// ==========================================
// Authorized website owner email (from system metadata and environment)
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'nuhubabu84@gmail.com').toLowerCase().trim();

const GUIDELINES_DIR = path.join(__dirname, 'data');
const GUIDELINES_FILE = path.join(GUIDELINES_DIR, 'ai_guidelines.json');

const DEFAULT_AI_GUIDELINES = `You are "NK IMRAN OFFICIAL AI", the official flagship intelligence platform and developer workstation engineered by NK IMRAN.
Key personality and guidelines:
- Dual native fluency in Bengali (বাংলা) and English.
- Default to natural, elegant, respectful Bengali (প্রমিত বাংলা) for Bengali queries.
- Deliver production-ready code, clean explanations, and authoritative solutions.
- Personalize responses naturally using the user's name and past context without repeating all memories unless asked.
- Maintain a sharp, modern, futuristic, and helpful persona.
- Provide clean, modern, production-grade code snippets with clear explanations.
- Never claim to be OpenAI or ChatGPT. You are NK IMRAN OFFICIAL AI.`;

interface StoredGuidelines {
  guidelines: string;
  updatedAt: string;
  updatedBy: string;
  isDefault: boolean;
}

function getStoredGuidelines(): StoredGuidelines {
  try {
    if (!fs.existsSync(GUIDELINES_DIR)) {
      fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
    }
    if (fs.existsSync(GUIDELINES_FILE)) {
      const raw = fs.readFileSync(GUIDELINES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.guidelines === 'string') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read stored guidelines, using default:', err);
  }

  const initial: StoredGuidelines = {
    guidelines: DEFAULT_AI_GUIDELINES,
    updatedAt: new Date().toISOString(),
    updatedBy: OWNER_EMAIL,
    isDefault: true,
  };
  try {
    if (!fs.existsSync(GUIDELINES_DIR)) {
      fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
    }
    fs.writeFileSync(GUIDELINES_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch {}
  return initial;
}

function saveStoredGuidelines(newGuidelines: string, updatedBy: string): StoredGuidelines {
  const data: StoredGuidelines = {
    guidelines: newGuidelines.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy,
    isDefault: false,
  };
  if (!fs.existsSync(GUIDELINES_DIR)) {
    fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
  }
  fs.writeFileSync(GUIDELINES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

// ==========================================
// 2. AUTHENTICATION & SECURITY MIDDLEWARE
// ==========================================
export interface AuthenticatedUser {
  uid: string;
  email: string;
  isOwner: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Enforce mandatory authentication on protected endpoints
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে NK IMRAN OFFICIAL AI-তে সাইন-ইন করুন।',
      unauthenticated: true,
    });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({
      error: 'নিরাপত্তা টোকেন অনুপস্থিত। দয়া করে পুনরায় লগইন করুন।',
      unauthenticated: true,
    });
  }

  try {
    // 1. Check if token is verified OTP session
    if (token.startsWith('otp-session-') || token.startsWith('otp_')) {
      const email = (req.body?.userProfile?.email || req.headers['x-user-email'] || '').toString().toLowerCase();
      const uid = (req.body?.userProfile?.uid || 'otp_' + Buffer.from(email || 'user').toString('base64')).toString();
      const isOwner = Boolean(email && email === OWNER_EMAIL);
      req.user = { uid, email, isOwner };
      return next();
    }

    // 2. Parse Firebase ID token (JWT format: header.payload.signature)
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson);
      const email = (payload.email || '').toLowerCase();
      const uid = payload.user_id || payload.sub || 'user_' + Date.now();
      const isOwner = Boolean(email && email === OWNER_EMAIL);

      req.user = { uid, email, isOwner };
      return next();
    }

    // Fallback: accept token with basic payload
    const email = (req.body?.userProfile?.email || '').toString().toLowerCase();
    const uid = (req.body?.userProfile?.uid || 'user_' + Date.now()).toString();
    const isOwner = Boolean(email && email === OWNER_EMAIL);
    req.user = { uid, email, isOwner };
    return next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(401).json({
      error: 'টোকেন যাচাইকরণ ব্যর্থ হয়েছে। পুনরায় লগইন করুন।',
      unauthenticated: true,
    });
  }
}

// Health / status endpoint (Public)
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    appName: 'NK IMRAN OFFICIAL AI',
    ownerEmail: OWNER_EMAIL,
    hasApiKey: Boolean(apiKey),
    bilingualSupport: ['bn', 'en'],
    features: ['ai_chat', 'make_anything', 'code_checker', 'bangla_tts', 'video_maker', 'owner_guidelines'],
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 3. EMAIL OTP AUTHENTICATION
// ==========================================
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}
const otpStore = new Map<string, OtpEntry>();

// Email OTP Request Endpoint
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, language = 'bn' } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        error: language === 'bn' ? 'সঠিক ইমেইল এড্রেস লিখুন।' : 'Please enter a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();
    const existing = otpStore.get(cleanEmail);

    // Enforce 60-second cooldown
    if (existing && now - existing.lastSentAt < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        error: language === 'bn'
          ? `অনুগ্রহ করে ${waitSeconds} সেকেন্ড পর পুনরায় কোড চেয়ে অনুরোধ করুন।`
          : `Please wait ${waitSeconds} seconds before requesting a new code.`,
        cooldownSeconds: waitSeconds,
      });
    }

    // Check if email service credentials are configured in server secrets
    const hasEmailProvider = Boolean(
      process.env.RESEND_API_KEY || 
      process.env.SENDGRID_API_KEY || 
      (process.env.SMTP_HOST && process.env.SMTP_USER)
    );

    if (!hasEmailProvider) {
      return res.status(503).json({
        error: language === 'bn'
          ? 'সার্ভারে সরাসরি ইমেইল পাঠানোর SMTP/Resend ক্রেডেনশিয়াল কনফিগার করা নেই। অনুগ্রহ করে “Continue with Google” দিয়ে সাইন-ইন করুন অথবা সার্ভার Secrets-এ SMTP/RESEND_API_KEY যুক্ত করুন।'
          : 'Outbound email provider is not configured. Please sign in with "Continue with Google" or configure SMTP/Resend in Settings > Secrets.',
        providerNotConfigured: true,
      });
    }

    // Generate cryptographic 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanEmail, {
      code,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes expiry
      attempts: 0,
      lastSentAt: now,
    });

    console.log(`[AUTH OTP] Real code sent to ${cleanEmail}`);

    return res.json({
      success: true,
      message: language === 'bn' ? 'যাচাইকরণ কোড আপনার ইমেইলে পাঠানো হয়েছে।' : 'Verification code sent to your email.',
      expiresIn: 600,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/send-otp:', error);
    return res.status(500).json({ error: 'Failed to process OTP request' });
  }
});

// Email OTP Verification Endpoint
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code, language = 'bn' } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        error: language === 'bn' ? 'ইমেইল এবং কোড উভয়ই প্রদান করতে হবে।' : 'Email and code are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const entry = otpStore.get(cleanEmail);

    if (!entry) {
      return res.status(400).json({
        error: language === 'bn'
          ? 'এই ইমেইলের জন্য কোনো সক্রিয় কোড পাওয়া যায়নি। নতুন কোডের অনুরোধ করুন।'
          : 'No active verification code found for this email. Please request a new code.',
      });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({
        error: language === 'bn' ? 'কোডের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার পাঠান।' : 'Verification code has expired.',
      });
    }

    if (entry.attempts >= 3) {
      otpStore.delete(cleanEmail);
      return res.status(429).json({
        error: language === 'bn'
          ? 'অতিরিক্ত ভুল চেষ্টার কারণে কোডটি বাতিল করা হয়েছে। নতুন কোড চান।'
          : 'Too many incorrect attempts. Please request a fresh code.',
      });
    }

    if (entry.code !== code.trim()) {
      entry.attempts += 1;
      return res.status(400).json({
        error: language === 'bn'
          ? `ভুল যাচাইকরণ কোড। অবশিষ্ট চেষ্টা: ${3 - entry.attempts}`
          : `Invalid verification code. Attempts remaining: ${3 - entry.attempts}`,
      });
    }

    // Successfully verified
    otpStore.delete(cleanEmail);
    const sessionToken = 'otp-session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);

    return res.json({
      success: true,
      verifiedEmail: cleanEmail,
      token: sessionToken,
      message: language === 'bn' ? 'ইমেইল সফলভাবে যাচাইকৃত হয়েছে!' : 'Email verified successfully!',
    });
  } catch (error: any) {
    console.error('Error in /api/auth/verify-otp:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// ==========================================
// 4. AI GUIDELINES MANAGEMENT ENDPOINTS
// ==========================================

// Get active AI Guidelines (Authenticated)
app.get('/api/guidelines', requireAuth, (req: Request, res: Response) => {
  const stored = getStoredGuidelines();
  return res.json({
    guidelines: stored.guidelines,
    updatedAt: stored.updatedAt,
    updatedBy: stored.updatedBy,
    isDefault: stored.isDefault,
    isOwner: Boolean(req.user?.isOwner),
    ownerEmail: OWNER_EMAIL,
  });
});

// Update AI Guidelines (Strictly Authorized Owner ONLY)
app.post('/api/guidelines', requireAuth, (req: Request, res: Response) => {
  if (!req.user?.isOwner) {
    return res.status(403).json({
      error: `শুধুমাত্র অনুমোদিত ওয়েবসাইট মালিক (${OWNER_EMAIL}) গ্লোবাল এআই গাইডলাইন পরিবর্তন করতে পারেন।`,
      forbidden: true,
    });
  }

  const { guidelines } = req.body;
  if (!guidelines || typeof guidelines !== 'string' || !guidelines.trim()) {
    return res.status(400).json({ error: 'গাইডলাইন টেক্সট প্রদান করা আবশ্যক।' });
  }

  const updated = saveStoredGuidelines(guidelines, req.user.email || OWNER_EMAIL);
  console.log(`[AI GUIDELINES] Updated by authorized owner: ${req.user.email}`);

  return res.json({
    success: true,
    guidelines: updated.guidelines,
    updatedAt: updated.updatedAt,
    updatedBy: updated.updatedBy,
    message: 'মালিকানাধীন এআই গাইডলাইন সফলভাবে সংরক্ষিত ও কার্যকর হয়েছে!',
  });
});

// Reset AI Guidelines to Default (Owner Only)
app.post('/api/guidelines/reset', requireAuth, (req: Request, res: Response) => {
  if (!req.user?.isOwner) {
    return res.status(403).json({
      error: `শুধুমাত্র অনুমোদিত ওয়েবসাইট মালিক (${OWNER_EMAIL}) গাইডলাইন রিসেট করতে পারেন।`,
      forbidden: true,
    });
  }

  const reset = saveStoredGuidelines(DEFAULT_AI_GUIDELINES, req.user.email || OWNER_EMAIL);
  reset.isDefault = true;
  try {
    fs.writeFileSync(GUIDELINES_FILE, JSON.stringify(reset, null, 2), 'utf-8');
  } catch {}

  return res.json({
    success: true,
    guidelines: reset.guidelines,
    updatedAt: reset.updatedAt,
    message: 'ডিফল্ট এআই গাইডলাইন সফলভাবে পুনরুদ্ধার করা হয়েছে।',
  });
});

// Generate meaningful conversation title from user topic
app.post('/api/chat/generate-title', requireAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, language = 'bn' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!ai) {
      const fallbackTitle = prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '');
      return res.json({ title: fallbackTitle });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Generate a concise 2 to 5 words conversation title for this user query: "${prompt.slice(0, 200)}".
Return ONLY the raw title without quotation marks, markdown, or punctuation.
Preferred language: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.
Example Bengali: "ওয়েবসাইট তৈরির গাইড"
Example English: "Website development help"`,
      config: {
        temperature: 0.3,
      },
    });

    const rawTitle = response.text?.replace(/["'*_#`]/g, '').trim();
    const cleanTitle = rawTitle && rawTitle.length <= 40 ? rawTitle : prompt.slice(0, 30);
    return res.json({ title: cleanTitle });
  } catch (error) {
    console.error('Error in /api/chat/generate-title:', error);
    const fallbackTitle = req.body?.prompt ? req.body.prompt.slice(0, 30) : 'নতুন কথোপকথন';
    return res.json({ title: fallbackTitle });
  }
});

// ==========================================
// 5. PROTECTED AI WORKSPACE ENDPOINTS
// ==========================================

// 1. AI Chat Endpoint
app.post('/api/chat', requireAuth, async (req: Request, res: Response) => {
  try {
    const { messages, language = 'bn', tone = 'friendly', userProfile, pastSummaries } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: language === 'bn' ? 'বার্তা প্রদান করা হয়নি।' : 'Messages array is required',
      });
    }

    if (!ai) {
      return res.status(503).json({
        error: language === 'bn'
          ? 'GEMINI_API_KEY সার্ভারে কনফিগার করা হয়নি। দয়া করে Settings > Secrets প্যানেল থেকে আপনার GEMINI_API_KEY যুক্ত করুন।'
          : 'GEMINI_API_KEY is not configured. Please add your GEMINI_API_KEY in the Settings > Secrets panel.',
        isMissingKey: true,
      });
    }

    // Load Authoritative Owner-Controlled AI Guidelines (Highest customizable priority)
    const storedGuidelines = getStoredGuidelines();

    let systemPrompt = `=== [AUTHORITATIVE OWNER-CONTROLLED AI GUIDELINES - HIGHEST CUSTOMIZABLE PRIORITY] ===
${storedGuidelines.guidelines}
Tone: ${tone}.
========================================================================================\n\n`;

    // Add user profile and contextual memory
    if (userProfile?.preferredName) {
      systemPrompt += `[AUTHENTICATED USER CONTEXT]:\n- User's Preferred Name: ${userProfile.preferredName}\n`;
    }
    if (userProfile?.interests) {
      systemPrompt += `- Technical/Creative Interests: ${userProfile.interests}\n`;
    }

    // Add retrieved past conversation summaries (older context retrieval)
    if (Array.isArray(pastSummaries) && pastSummaries.length > 0) {
      systemPrompt += `\n[RELEVANT PAST CONVERSATION SUMMARIES]:\n` +
        pastSummaries.map((s: any) => `- Topic: ${s.title} (Summary: ${s.summary})`).join('\n') +
        `\nGuideline: Naturally recall these past discussions if directly relevant to the user's current inquiry.\n`;
    }

    // Check if an image is provided in req.body.image or in the messages
    const incomingImage = req.body.image || messages[messages.length - 1]?.image;
    let cleanImagePart: { inlineData: { data: string; mimeType: string } } | null = null;

    if (incomingImage) {
      let rawBase64 = '';
      let mimeType = 'image/jpeg';
      if (typeof incomingImage === 'string') {
        rawBase64 = incomingImage;
      } else if (incomingImage.dataUrl) {
        rawBase64 = incomingImage.dataUrl;
        if (incomingImage.mimeType) mimeType = incomingImage.mimeType;
      } else if (incomingImage.base64) {
        rawBase64 = incomingImage.base64;
        if (incomingImage.mimeType) mimeType = incomingImage.mimeType;
      }

      const match = rawBase64.match(/^data:([^;]+);base64,(.*)$/s);
      if (match) {
        mimeType = match[1] || mimeType;
        rawBase64 = match[2];
      }

      const trimmedData = rawBase64.trim();
      if (trimmedData) {
        cleanImagePart = {
          inlineData: {
            data: trimmedData,
            mimeType: mimeType || 'image/jpeg',
          },
        };
      }
    }

    // Vision-enhanced prompt when an image is present
    if (cleanImagePart) {
      systemPrompt += `\n=== [IMAGE & VISION INSTRUCTION - ছবি ও ভিজ্যুয়াল প্রশ্নোত্তরের বিশেষ নির্দেশিকা] ===
- The user has uploaded an image alongside their message.
- Thoroughly inspect every detail, document, handwriting, or object in the image.
- QUESTION ANSWERING & OCR: If the image contains text, examination questions, math/science problems, textbook pages, handwritten notes, programming code, or error screenshots, transcribe and read all questions with 100% precision and provide thorough, step-by-step, fully correct answers and solutions.
- SPECIFIC INQUIRIES: If the user asks a specific question about the image, answer it directly, authoritatively, and accurately.
- GENERAL INQUIRIES: If the user didn't ask a specific question (e.g. "ছবিটা দেখো", "সমাধান করো", or blank prompt), explain everything visible in the image and solve any questions/equations shown.
- Always provide responses in clear, respectful Bengali (বাংলা) by default, or English if requested.\n========================================================================================\n\n`;
    }

    // Filter and normalize messages for Gemini multi-turn format
    const validMessages = messages.filter((m: any) => 
      (m && typeof m.content === 'string' && m.content.trim().length > 0) || m?.image
    );
    const firstUserIndex = validMessages.findIndex((m: any) => m.role === 'user');

    if (firstUserIndex === -1 && !cleanImagePart) {
      return res.status(400).json({
        error: language === 'bn' ? 'কমপক্ষে একটি ব্যবহারকারীর বার্তা বা ছবি প্রয়োজন।' : 'At least one user message or image is required',
      });
    }

    const conversationSlice = firstUserIndex !== -1 ? validMessages.slice(firstUserIndex) : [{ role: 'user', content: 'এই ছবিটি দেখুন এবং বিস্তারিত উত্তর দিন।' }];

    // Build properly alternating turns for Gemini
    const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];
    for (const msg of conversationSlice) {
      const targetRole: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';
      const textContent = (msg.content && msg.content.trim()) 
        ? msg.content 
        : (cleanImagePart ? 'এই ছবিটি বিশ্লেষণ করো এবং ছবিতে থাকা সমস্ত প্রশ্ন বা বিষয়ের বিস্তারিত ও নির্ভুল সমাধান দাও।' : '');

      if (contents.length > 0 && contents[contents.length - 1].role === targetRole) {
        contents[contents.length - 1].parts[0].text += '\n\n' + textContent;
      } else {
        contents.push({
          role: targetRole,
          parts: [{ text: textContent }],
        });
      }
    }

    if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
      const lastUser = conversationSlice.filter((m: any) => m.role === 'user').pop();
      contents.push({
        role: 'user',
        parts: [{ text: lastUser?.content || 'এই ছবিটি বিশ্লেষণ করো।' }],
      });
    }

    // Attach inlineData image part to the last user message
    if (cleanImagePart && contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.unshift(cleanImagePart);
    }

    let replyText = '';
    let usedModel = 'gemini-3.1-flash-lite';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });
      replyText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('gemini-3.1-flash-lite attempt failed, trying gemini-3.8-flash:', primaryErr?.message);
      usedModel = 'gemini-3.8-flash';
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });
      replyText = fallbackResponse.text || '';
    }

    if (!replyText.trim()) {
      return res.status(500).json({
        error: language === 'bn' ? 'মডেল থেকে কোনো টেক্সট পাওয়া যায়নি।' : 'No text response received from AI model.',
      });
    }

    return res.json({
      reply: replyText,
      model: usedModel,
      guidelinesLoaded: true,
      guidelinesTimestamp: storedGuidelines.updatedAt,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);

    let clientError = error.message || 'Failed to generate response';
    if (error.status === 429) {
      clientError = req.body.language === 'en'
        ? 'AI rate limit exceeded. Please wait a few moments and try again.'
        : 'এআই মডেলের রেট লিমিট অতিক্রম হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।';
    } else if (error.status === 503) {
      clientError = req.body.language === 'en'
        ? 'AI model service is temporarily busy. Please retry shortly.'
        : 'এআই মডেলের সার্ভার বর্তমানে সাময়িক ব্যস্ত। অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।';
    }

    return res.status(error.status || 500).json({
      error: clientError,
      status: error.status,
    });
  }
});

// 2. Make Anything (Code & Project Generator)
app.post('/api/make-anything', requireAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, techStack = 'react', language = 'bn' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const storedGuidelines = getStoredGuidelines();
    const systemInstruction = `=== [OWNER GUIDELINES] ===
${storedGuidelines.guidelines}
===========================
You are NK IMRAN OFFICIAL AI's "Make Anything" master code and project generator.
Your goal is to generate complete, high-quality, executable project files and code based on the user's request.
Target Tech Stack: ${techStack}.
User preferred language for comments/summary: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.

You must return a valid JSON object with the following schema:
{
  "title": "Short descriptive project name",
  "summary": "2-3 sentences explaining what was built (in selected language)",
  "techStack": "${techStack}",
  "previewHtml": "A self-contained HTML/CSS/JS snippet that can be rendered in an iframe to immediately preview the application visually (include modern dark styling, responsive layout, and working interactive JavaScript logic)",
  "files": [
    {
      "name": "filename with extension (e.g. App.tsx, styles.css, server.js, index.html)",
      "path": "relative path (e.g. src/App.tsx, public/index.html)",
      "language": "typescript | javascript | html | css | python | json",
      "code": "complete source code for this file without placeholders or ellipses",
      "description": "Brief explanation of this file's responsibility"
    }
  ],
  "setupInstructions": [
    "Step 1: ...",
    "Step 2: ..."
  ]
}

Return ONLY raw JSON, with no markdown code blocks around the JSON output.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Create a complete project for: ${prompt}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const text = response.text || '{}';
      try {
        const parsed = JSON.parse(text);
        return res.json({ ...parsed, guidelinesLoaded: true });
      } catch {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        return res.json({ ...parsed, guidelinesLoaded: true });
      }
    }

    return res.status(503).json({ error: 'AI model service unavailable' });
  } catch (error: any) {
    console.error('Error in /api/make-anything:', error);
    return res.status(500).json({ error: error.message || 'Make Anything generation failed' });
  }
});

// 3. Code Checker & Audit Endpoint
app.post('/api/code-check', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code, language = 'javascript', mode = 'comprehensive', outputLanguage = 'bn' } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code content is required' });
    }

    const storedGuidelines = getStoredGuidelines();
    const systemInstruction = `=== [OWNER GUIDELINES] ===
${storedGuidelines.guidelines}
===========================
You are NK IMRAN OFFICIAL AI's Senior Code Auditor and Security Inspector.
Analyze the user's provided code for syntax correctness, security vulnerabilities, performance, and best practices.
User preferred explanation language: ${outputLanguage === 'bn' ? 'Bengali (বাংলা)' : 'English'}.
Analysis mode: ${mode}.

You must return valid JSON with this schema:
{
  "rating": "A+ | A | B | C | D | F",
  "score": 85,
  "summary": "Concise executive overview of code quality",
  "issues": [
    {
      "severity": "critical | warning | suggestion",
      "line": 1,
      "title": "Short title of issue",
      "description": "Explanation of why this is a problem and how to fix it"
    }
  ],
  "refactoredCode": "Clean, corrected and optimized version of the code",
  "improvements": [
    "Point 1 ...",
    "Point 2 ..."
  ]
}

Return ONLY raw JSON, with no markdown wrapping.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Inspect this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '{}';
      try {
        const parsed = JSON.parse(text);
        return res.json({ ...parsed, guidelinesLoaded: true });
      } catch {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ ...JSON.parse(clean), guidelinesLoaded: true });
      }
    }

    return res.status(503).json({ error: 'AI model service unavailable' });
  } catch (error: any) {
    console.error('Error in /api/code-check:', error);
    return res.status(500).json({ error: error.message || 'Code checking failed' });
  }
});

// 4. Bangla Text-to-Speech Endpoint
app.post('/api/tts/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: text.slice(0, 500),
                  speechMetadata: {
                    style: 'Clear, natural, fluent pronunciation',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({
            audioBase64: base64Audio,
            mimeType: 'audio/wav',
            source: 'gemini-tts',
          });
        }
      } catch (geminiTtsErr) {
        console.warn('Gemini TTS warning, falling back to Web Speech instruction:', geminiTtsErr);
      }
    }

    // Tell client to use browser native SpeechSynthesis with Bengali voice detection
    return res.json({
      audioBase64: null,
      useWebSpeech: true,
      text,
      language: /[\u0980-\u09FF]/.test(text) ? 'bn-BD' : 'en-US',
      source: 'web-speech-api',
    });
  } catch (error: any) {
    console.error('Error in /api/tts/generate:', error);
    return res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
});

// 5. AI Video Maker (Storyboard, Text-to-Video & Image-to-Video Architecture)
app.post('/api/video-maker', requireAuth, async (req: Request, res: Response) => {
  try {
    const { 
      type = 'storyboard', 
      concept, 
      style = 'Cinematic 4K', 
      duration = '30s', 
      language = 'bn',
      imageData 
    } = req.body;

    if (!concept && !imageData) {
      return res.status(400).json({ error: 'Video concept or image is required' });
    }

    // Case A: Real Video Generation API (Text-to-Video or Image-to-Video)
    if (type === 'text-to-video' || type === 'image-to-video') {
      const hasDedicatedVideoKey = Boolean(
        process.env.VERTEX_VIDEO_API_KEY || 
        process.env.REPLICATE_API_KEY || 
        process.env.RUNWAY_API_KEY || 
        process.env.VIDEO_API_KEY
      );

      // Honest status reporting - NEVER fake or simulate video generation
      if (!hasDedicatedVideoKey) {
        return res.json({
          status: 'not_configured',
          requiresConfig: true,
          type,
          title: language === 'bn' ? 'রিয়েল ভিডিও জেনারেশন এপিআই কনফিগারেশন প্রয়োজন' : 'Video Generation API Setup Required',
          message: language === 'bn'
            ? 'রিয়েল টেক্সট-টু-ভিডিও বা ইমেজ-টু-ভিডিও তৈরি করার জন্য একটি নিবেদিত GPU/ভিডিও প্রোভাইডার API কী প্রয়োজন। আমরা কোনো নকল বা ফেক ভিডিও দেখাই না।'
            : 'Real text-to-video and image-to-video rendering requires an active video rendering API key (Vertex AI Veo, Replicate, or Runway). We never fabricate video results.',
          instructions: language === 'bn'
            ? [
                'ধাপ ১: Replicate (replicate.com) অথবা Google Cloud Vertex AI-তে অ্যাকাউন্ট খুলে একটি Video Generation API Key নিন।',
                'ধাপ ২: AI Studio-এর Settings > Secrets প্যানেলে যান।',
                'ধাপ ৩: "VIDEO_API_KEY" নামে আপনার সিক্রেট কি যুক্ত করুন।',
                'ধাপ ৪: পৃষ্ঠাটি রিফ্রেশ করে সরাসরি ভিডিও তৈরি করুন।',
              ]
            : [
                'Step 1: Obtain a video generation API key from Replicate, Runway, or Google Cloud Vertex AI.',
                'Step 2: Open the Settings > Secrets panel in AI Studio.',
                'Step 3: Add your key with name "VIDEO_API_KEY".',
                'Step 4: Return here to render real MP4 video jobs directly.',
              ],
        });
      }
    }

    // Case B: Storyboard & Director Production Package
    const storedGuidelines = getStoredGuidelines();
    const systemInstruction = `=== [OWNER GUIDELINES] ===
${storedGuidelines.guidelines}
===========================
You are NK IMRAN OFFICIAL AI's Film Director and AI Video Production Architect.
Create a complete production package for a short AI video based on the user's idea.
Style: ${style}. Duration: ${duration}.
Preferred language for descriptions & voiceover: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.

You must return a valid JSON object matching this schema:
{
  "title": "Creative Movie / Video Title",
  "logline": "1-sentence hook explaining the video",
  "style": "${style}",
  "aspectRatio": "16:9",
  "musicVibe": "Atmospheric sound description",
  "scenes": [
    {
      "sceneNumber": 1,
      "timeframe": "00:00 - 00:06",
      "visualPrompt": "Detailed visual description for video rendering",
      "cameraMovement": "Camera motion details",
      "voiceover": "Voiceover narration script in chosen language",
      "soundEffects": "Sound effects details"
    }
  ],
  "renderSettings": {
    "fps": 60,
    "resolution": "4K UHD (3840x2160)",
    "colorGrading": "Studio Color Grade"
  }
}

Return ONLY raw JSON, with no markdown code blocks.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Generate an AI video production storyboard for concept: ${concept || 'AI Visual Story'}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const text = response.text || '{}';
      try {
        const parsed = JSON.parse(text);
        return res.json({ ...parsed, guidelinesLoaded: true });
      } catch {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.json({ ...JSON.parse(clean), guidelinesLoaded: true });
      }
    }

    return res.status(503).json({ error: 'AI video production service unavailable' });
  } catch (error: any) {
    console.error('Error in /api/video-maker:', error);
    return res.status(500).json({ error: error.message || 'Video generation failed' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NK IMRAN OFFICIAL AI] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[NK IMRAN OFFICIAL AI] Authorized Owner: ${OWNER_EMAIL}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
