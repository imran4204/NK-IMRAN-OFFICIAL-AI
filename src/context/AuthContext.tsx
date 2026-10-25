import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  deleteUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { UserProfile, ChatSession, AppLanguage, ConversationSummary } from '../types';

interface AuthContextType {
  user: User | null;
  otpEmailUser: { uid: string; email: string; token: string } | null;
  effectiveUid: string | null;
  profile: UserProfile | null;
  chatSessions: ChatSession[];
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithOtpVerified: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  giveConsent: () => Promise<void>;
  toggleAutoMemory: (enabled: boolean) => Promise<void>;
  saveChatSession: (session: ChatSession) => Promise<void>;
  deleteChatSession: (sessionId: string) => Promise<void>;
  clearAllChatSessions: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  getPastConversationSummaries: () => ConversationSummary[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OTP_SESSION_STORAGE_KEY = 'nk_imran_ai_otp_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [otpEmailUser, setOtpEmailUser] = useState<{ uid: string; email: string; token: string } | null>(() => {
    try {
      const stored = localStorage.getItem(OTP_SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const effectiveUid = user?.uid || otpEmailUser?.uid || null;

  const getLocalChatsKey = (uid: string) => `nk_imran_ai_chats_${uid}`;
  const getLocalProfileKey = (uid: string) => `nk_imran_ai_profile_${uid}`;

  // Load user chats from local cache first, then sync from Firestore if online
  const loadUserChats = useCallback(async (uid: string) => {
    // 1. Immediately hydrate from offline local cache
    try {
      const cached = localStorage.getItem(getLocalChatsKey(uid));
      if (cached) {
        const parsed: ChatSession[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatSessions(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading local chat cache:', e);
    }

    // 2. If online, fetch latest from Firestore and update local cache
    try {
      const chatsRef = collection(db, 'users', uid, 'chats');
      const q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const loaded: ChatSession[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as ChatSession;
        loaded.push({ ...data, id: d.id });
      });

      if (loaded.length > 0) {
        setChatSessions(loaded);
        try {
          localStorage.setItem(getLocalChatsKey(uid), JSON.stringify(loaded));
        } catch {}
      }
    } catch (err) {
      console.warn('Network offline or could not reach Firestore; using cached chats:', err);
    }
  }, []);

  // Sync or create user profile in Firestore with local cache fallback
  const syncUserProfile = useCallback(async (uid: string, email: string, displayName?: string, photoURL?: string) => {
    // Check local profile cache first
    try {
      const cachedProfile = localStorage.getItem(getLocalProfileKey(uid));
      if (cachedProfile) {
        setProfile(JSON.parse(cachedProfile));
      }
    } catch {}

    const userDocRef = doc(db, 'users', uid);
    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        localStorage.setItem(getLocalProfileKey(uid), JSON.stringify(data));
      } else {
        const initialProfile: UserProfile = {
          uid,
          email: email || '',
          displayName: displayName || (email ? email.split('@')[0] : 'User'),
          photoURL: photoURL || '',
          preferredName: displayName || (email ? email.split('@')[0] : 'User'),
          preferredLanguage: 'bn',
          interests: 'Web Development, Artificial Intelligence, Automation',
          consentGiven: true, // Default consented upon signing in
          autoMemoryEnabled: true, // Automatic conversation memory on by default
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, initialProfile);
        setProfile(initialProfile);
        localStorage.setItem(getLocalProfileKey(uid), JSON.stringify(initialProfile));
      }
      await loadUserChats(uid);
    } catch (err) {
      console.warn('Could not sync user profile online; utilizing offline local profile:', err);
      await loadUserChats(uid);
    }
  }, [loadUserChats]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setOtpEmailUser(null);
        localStorage.removeItem(OTP_SESSION_STORAGE_KEY);
        await syncUserProfile(currentUser.uid, currentUser.email || '', currentUser.displayName || undefined, currentUser.photoURL || undefined);
      } else if (otpEmailUser) {
        // Fallback to verified OTP session if active
        await syncUserProfile(otpEmailUser.uid, otpEmailUser.email);
      } else {
        setProfile(null);
        setChatSessions([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [otpEmailUser, syncUserProfile]);

  // Google Sign-In via Firebase
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setOtpEmailUser(null);
        localStorage.removeItem(OTP_SESSION_STORAGE_KEY);
        await syncUserProfile(
          result.user.uid, 
          result.user.email || '', 
          result.user.displayName || undefined, 
          result.user.photoURL || undefined
        );
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  // Sign-In with verified OTP
  const signInWithOtpVerified = async (email: string, token: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const uid = 'otp_' + btoa(cleanEmail).replace(/=/g, '').slice(0, 32);
    const sessionData = { uid, email: cleanEmail, token };
    localStorage.setItem(OTP_SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    setOtpEmailUser(sessionData);
    await syncUserProfile(uid, cleanEmail);
  };

  // Sign out cleanly
  const signOut = async () => {
    try {
      if (user) {
        await firebaseSignOut(auth);
      }
      setOtpEmailUser(null);
      localStorage.removeItem(OTP_SESSION_STORAGE_KEY);
      setUser(null);
      setProfile(null);
      setChatSessions([]);
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  };

  // Get current Bearer token for server-side API authentication
  const getIdToken = async (): Promise<string | null> => {
    if (user) {
      return await user.getIdToken();
    }
    if (otpEmailUser?.token) {
      return otpEmailUser.token;
    }
    return null;
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!effectiveUid || !profile) return;
    const userDocRef = doc(db, 'users', effectiveUid);
    const updatedData: UserProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(userDocRef, updatedData as any);
      setProfile(updatedData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${effectiveUid}`);
    }
  };

  // Consent handler
  const giveConsent = async () => {
    await updateProfile({ consentGiven: true, autoMemoryEnabled: true });
  };

  // Toggle Automatic Memory
  const toggleAutoMemory = async (enabled: boolean) => {
    await updateProfile({ autoMemoryEnabled: enabled });
  };

  // Automatically save chat session to persistent Firestore and local cache
  const saveChatSession = async (session: ChatSession) => {
    if (!effectiveUid) return;
    const isAutoMemoryActive = profile ? profile.autoMemoryEnabled !== false : true;
    if (!isAutoMemoryActive) return;

    const now = new Date().toISOString();
    const userMessages = session.messages.filter((m) => m.role === 'user');
    const firstQuery = userMessages[0]?.content?.slice(0, 80) || session.title;
    const summary = session.summary || `আলোচ্য বিষয়: ${firstQuery}`;

    const toPersist: ChatSession = {
      ...session,
      userId: effectiveUid,
      summary,
      updatedAt: now,
    };

    // 1. Immediately update React state and local storage cache (works offline)
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== session.id);
      const updated = [toPersist, ...filtered];
      try {
        localStorage.setItem(getLocalChatsKey(effectiveUid), JSON.stringify(updated));
      } catch (e) {
        console.warn('Local storage quota or write error:', e);
      }
      return updated;
    });

    // 2. If online, sync to Firestore
    try {
      const chatDocRef = doc(db, 'users', effectiveUid, 'chats', session.id);
      await setDoc(chatDocRef, toPersist, { merge: true });
    } catch (err) {
      console.warn('Could not auto-save to Firestore (will remain in offline local cache):', err);
    }
  };

  // Delete a specific chat session
  const deleteChatSession = async (sessionId: string) => {
    if (!effectiveUid) return;

    // Remove from local cache and state
    setChatSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem(getLocalChatsKey(effectiveUid), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Remove from Firestore if online
    try {
      const chatDocRef = doc(db, 'users', effectiveUid, 'chats', sessionId);
      await deleteDoc(chatDocRef);
    } catch (err) {
      console.warn('Could not delete from Firestore online:', err);
    }
  };

  // Clear all saved chat history
  const clearAllChatSessions = async () => {
    if (!effectiveUid) return;

    setChatSessions([]);
    try {
      localStorage.removeItem(getLocalChatsKey(effectiveUid));
    } catch {}

    try {
      const chatsRef = collection(db, 'users', effectiveUid, 'chats');
      const snap = await getDocs(chatsRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (err) {
      console.warn('Could not clear Firestore chats online:', err);
    }
  };

  // Delete user account and all personal data
  const deleteAccount = async () => {
    if (!effectiveUid) return;
    const uid = effectiveUid;
    try {
      // 1. Delete all chat sessions
      const chatsRef = collection(db, 'users', uid, 'chats');
      const snap = await getDocs(chatsRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      // 2. Delete user profile doc
      await deleteDoc(doc(db, 'users', uid));

      // 3. Delete Firebase Auth user if applicable
      if (user) {
        await deleteUser(user);
      }

      await signOut();
    } catch (err) {
      console.error('Account deletion error:', err);
      throw err;
    }
  };

  // Extract recent conversation summaries for memory retrieval (older context)
  const getPastConversationSummaries = (): ConversationSummary[] => {
    return chatSessions
      .slice(0, 5) // Last 5 sessions
      .map((s) => ({
        sessionId: s.id,
        title: s.title,
        summary: s.summary || s.title,
        lastActive: s.updatedAt,
      }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        otpEmailUser,
        effectiveUid,
        profile,
        chatSessions,
        isLoading,
        signInWithGoogle,
        signInWithOtpVerified,
        signOut,
        getIdToken,
        updateProfile,
        giveConsent,
        toggleAutoMemory,
        saveChatSession,
        deleteChatSession,
        clearAllChatSessions,
        deleteAccount,
        getPastConversationSummaries,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
