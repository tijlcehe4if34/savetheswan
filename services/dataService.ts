
import { UserRecord, Clue, GameRules, SiteContent, Report } from '../types';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  AuthError
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore';

// STORAGE KEYS (Fallback)
const KEY_CONTENT = 'sw_content';
const KEY_RULES = 'sw_rules';
const KEY_PROFILES = 'sw_profiles';
const KEY_USERS = 'sw_users';
const KEY_CLUES = 'sw_clues';
const KEY_REPORTS = 'sw_reports';
const KEY_SESSION = 'sw_session';

export const ADMIN_EMAIL = 'tijlvanherpen@icloud.com';
const ADMIN_DEFAULT_PASS = 'admin123';

const DEFAULT_CONTENT: SiteContent = {
  intro_title: "The Missing Swan",
  intro_subtitle: "The Big Mystery",
  intro_desc: "Someone has taken the city's mascot. Can you help find him?",
  intro_video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
  manifest_heading: "The Evidence Board",
  monologue_default: "The mystery started on a rainy day. Swan was gone, and I needed to find out why.",
  login_heading: "Detective Login",
  intake_heading: "New Detective Sign-In"
};

// --- HYBRID ENGINE HELPERS ---

// Circuit breaker state: If cloud fails (permissions/network), we force local mode for the session.
let forceLocalMode = false;

export const setForceLocalMode = (enabled: boolean) => {
  forceLocalMode = enabled;
  if (enabled) console.warn("Swan Ransom: System forced into Local/Offline Mode.");
};

// Check if Cloud is configured and active (API Key is not placeholder)
export const isCloudActive = () => {
  if (forceLocalMode) return false;
  return !!auth && !!db && auth.app.options.apiKey !== "YOUR_API_KEY";
};

// Helper to handle cloud errors and switch mode if necessary
const handleCloudError = (error: any) => {
  const code = error?.code;
  if (code === 'permission-denied' || code === 'unavailable' || code === 'resource-exhausted') {
    setForceLocalMode(true);
    return true; // Switched to local
  }
  return false; // Other error (e.g. invalid password)
};

// --- LOCAL STORAGE FALLBACKS ---
const getStorage = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) { return defaultVal; }
};
const setStorage = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value));

// --- AUTH SERVICES ---

// Ensures the admin account exists locally (for offline testing)
const ensureLocalAdminExists = () => {
    const users = getStorage<Record<string, string>>(KEY_USERS, {});
    users[ADMIN_EMAIL] = ADMIN_DEFAULT_PASS;
    setStorage(KEY_USERS, users);
    
    const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
    if (!profiles[ADMIN_EMAIL]) {
        profiles[ADMIN_EMAIL] = {
            email: ADMIN_EMAIL,
            name: "Chief Commissioner",
            groupName: "Headquarters",
            groupMembers: "Classified",
            loginTime: new Date().toISOString(),
            cluesUnlocked: 999
        };
        setStorage(KEY_PROFILES, profiles);
    }
};

export const loginUser = async (email: string, password: string): Promise<UserRecord> => {
    if (isCloudActive()) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Fetch profile details
            const docRef = doc(db, 'profiles', email);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as UserRecord;
                // Update login time
                await updateDoc(docRef, { loginTime: new Date().toISOString() });
                return data;
            } else {
                // Profile missing in cloud, return basic info
                return { email, name: 'Agent', groupName: 'Unknown', groupMembers: '', loginTime: new Date().toISOString() };
            }
        } catch (error: any) {
            // Check if we should fallback to local
            if (handleCloudError(error) || error.code === 'auth/network-request-failed') {
               setForceLocalMode(true);
               return loginUser(email, password); // Retry locally
            }
            throw error;
        }
    } else {
        // LOCAL MODE
        ensureLocalAdminExists();
        const users = getStorage<Record<string, string>>(KEY_USERS, {});
        const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
        
        if (users[email] && users[email] === password) {
            setStorage(KEY_SESSION, email);
            return profiles[email] || { email, name: 'Local Agent', groupName: 'N/A', groupMembers: '', loginTime: new Date().toISOString() };
        }
        throw new Error("auth/invalid-credential");
    }
};

export const registerUser = async (email: string, password: string, name: string): Promise<void> => {
    if (isCloudActive()) {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            const newUser: UserRecord = {
                email,
                name,
                groupName: 'Unassigned',
                groupMembers: 'None',
                loginTime: new Date().toISOString(),
                cluesUnlocked: 1,
                lastAction: 'Registered new account',
                lastActionTime: new Date().toISOString()
            };
            await setDoc(doc(db, 'profiles', email), newUser);
        } catch (error: any) {
            if (handleCloudError(error) || error.code === 'auth/network-request-failed') {
               setForceLocalMode(true);
               return registerUser(email, password, name); // Retry locally
            }
            throw error;
        }
    } else {
        // LOCAL MODE
        ensureLocalAdminExists();
        const users = getStorage<Record<string, string>>(KEY_USERS, {});
        if (users[email]) throw new Error("auth/email-already-in-use");
        users[email] = password;
        setStorage(KEY_USERS, users);
        
        const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
        profiles[email] = {
            email, name, groupName: 'Unassigned', groupMembers: 'None',
            loginTime: new Date().toISOString(), cluesUnlocked: 1,
            lastAction: 'Registered new account',
            lastActionTime: new Date().toISOString()
        };
        setStorage(KEY_PROFILES, profiles);
        setStorage(KEY_SESSION, email);
    }
};

export const logoutUser = async () => {
    if (isCloudActive()) {
      try {
        await signOut(auth);
      } catch (e) { console.warn("Cloud logout failed", e); }
    }
    localStorage.removeItem(KEY_SESSION);
};

export const getCurrentSession = (): string | null => {
    if (isCloudActive() && auth.currentUser) return auth.currentUser.email;
    return getStorage<string | null>(KEY_SESSION, null);
};

// --- DATA SERVICES ---

let errorListener: ((msg: string) => void) | null = null;
export const setErrorListener = (listener: (msg: string) => void) => { errorListener = listener; };

export const logUserLogin = async (userData: Omit<UserRecord, 'id' | 'loginTime'>) => {
  const timestamp = new Date().toISOString();
  if (isCloudActive()) {
      try {
        const ref = doc(db, 'profiles', userData.email);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            await updateDoc(ref, { 
              ...userData, 
              loginTime: timestamp,
              lastAction: 'Clocked in for duty',
              lastActionTime: timestamp
            });
        } else {
            await setDoc(ref, { 
              ...userData, 
              loginTime: timestamp, 
              cluesUnlocked: 1,
              lastAction: 'Clocked in for duty',
              lastActionTime: timestamp
            });
        }
      } catch (e) {
        if (handleCloudError(e)) {
           logUserLogin(userData); // Retry locally
        }
      }
  } else {
      const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
      profiles[userData.email] = { 
        ...profiles[userData.email], 
        ...userData, 
        loginTime: timestamp,
        lastAction: 'Clocked in for duty',
        lastActionTime: timestamp
      };
      setStorage(KEY_PROFILES, profiles);
  }
};

export const logUserAction = async (email: string, action: string) => {
  const timestamp = new Date().toISOString();
  if (isCloudActive()) {
    try {
      const ref = doc(db, 'profiles', email);
      await updateDoc(ref, { 
        lastAction: action, 
        lastActionTime: timestamp 
      });
    } catch (e) {
      // If logging action fails (permissions), just silently fail or switch mode
      // We don't want to interrupt the user flow for a log
      if (handleCloudError(e)) {
         logUserAction(email, action); // Retry locally
      }
    }
  } else {
    const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
    if (profiles[email]) {
      profiles[email] = { 
        ...profiles[email], 
        lastAction: action, 
        lastActionTime: timestamp 
      };
      setStorage(KEY_PROFILES, profiles);
    }
  }
};

export const getUserInfoByEmail = async (email: string): Promise<Partial<UserRecord> | null> => {
  if (isCloudActive()) {
      try {
        const snap = await getDoc(doc(db, 'profiles', email));
        return snap.exists() ? (snap.data() as UserRecord) : null;
      } catch (e) {
        if (handleCloudError(e)) return getUserInfoByEmail(email);
        return null;
      }
  }
  const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
  return profiles[email] || null;
};

export const getAllUserProfiles = async (): Promise<any[]> => {
  if (isCloudActive()) {
      try {
        const snap = await getDocs(collection(db, 'profiles'));
        const list = snap.docs.map(d => d.data());
        return list.sort((a: any, b: any) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
      } catch (e) {
        if (handleCloudError(e)) return getAllUserProfiles();
        return [];
      }
  }
  const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
  return Object.values(profiles).sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
};

export const getAllClues = async (): Promise<Clue[]> => {
  if (isCloudActive()) {
      try {
        const snap = await getDocs(collection(db, 'clues'));
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Clue));
      } catch (e) {
        if (handleCloudError(e)) return getAllClues();
        return [];
      }
  }
  return getStorage<Clue[]>(KEY_CLUES, []);
};

export const deleteClue = async (id: string) => {
  if (isCloudActive()) {
      try {
        await deleteDoc(doc(db, 'clues', id));
        return;
      } catch (e) {
        if (handleCloudError(e)) { deleteClue(id); return; }
        throw e;
      }
  }
  const clues = getStorage<Clue[]>(KEY_CLUES, []);
  setStorage(KEY_CLUES, clues.filter(c => c.id !== id));
};

export const getCaseClues = async (userEmail?: string): Promise<Clue[]> => {
  if (!userEmail) return [];
  
  let allClues: Clue[] = [];
  if (isCloudActive()) {
      try {
        const snap = await getDocs(collection(db, 'clues'));
        allClues = snap.docs.map(d => ({ ...d.data(), id: d.id } as Clue));
      } catch (e) {
        if (handleCloudError(e)) return getCaseClues(userEmail);
        return [];
      }
  } else {
      allClues = getStorage<Clue[]>(KEY_CLUES, []);
  }
  
  return allClues.filter(c => 
    !c.targetPlayer || 
    c.targetPlayer === userEmail || 
    c.addedBy === userEmail ||
    (c.addedBy === 'CHIEF' && !c.targetPlayer)
  ).sort((a, b) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime());
};

export const addClue = async (clue: Omit<Clue, 'id' | 'isUnlocked'>) => {
  if (isCloudActive()) {
      try {
        await addDoc(collection(db, 'clues'), { ...clue, isUnlocked: true });
        return;
      } catch (e) {
        if (handleCloudError(e)) { addClue(clue); return; }
        throw e;
      }
  }
  const clues = getStorage<Clue[]>(KEY_CLUES, []);
  clues.unshift({ ...clue, id: Date.now().toString(), isUnlocked: true, dateFound: clue.dateFound || new Date().toISOString() });
  setStorage(KEY_CLUES, clues);
};

export const addReport = async (report: Omit<Report, 'id' | 'timestamp' | 'status'>) => {
  if (isCloudActive()) {
      try {
        await addDoc(collection(db, 'reports'), { ...report, status: 'new', timestamp: new Date().toISOString() });
        return;
      } catch (e) {
        if (handleCloudError(e)) { addReport(report); return; }
        throw e;
      }
  }
  const reports = getStorage<Report[]>(KEY_REPORTS, []);
  reports.unshift({ ...report, id: Date.now().toString(), status: 'new', timestamp: new Date().toISOString() });
  setStorage(KEY_REPORTS, reports);
};

export const getReports = async (): Promise<Report[]> => {
  if (isCloudActive()) {
      try {
        const snap = await getDocs(collection(db, 'reports'));
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Report));
        return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (e) {
        if (handleCloudError(e)) return getReports();
        return [];
      }
  }
  return getStorage<Report[]>(KEY_REPORTS, []);
};

export const markReportRead = async (id: string) => {
  if (isCloudActive()) {
      try {
        await updateDoc(doc(db, 'reports', id), { status: 'read' });
        return;
      } catch (e) {
        if (handleCloudError(e)) { markReportRead(id); return; }
        throw e;
      }
  }
  const reports = getStorage<Report[]>(KEY_REPORTS, []);
  setStorage(KEY_REPORTS, reports.map(r => r.id === id ? { ...r, status: 'read' as const } : r));
};

export const getSiteContent = async (): Promise<SiteContent> => {
  if (isCloudActive()) {
      try {
        const snap = await getDoc(doc(db, 'content', 'main'));
        return snap.exists() ? (snap.data() as SiteContent) : DEFAULT_CONTENT;
      } catch (e) {
        // Fallback on permission/network error
        if (handleCloudError(e)) return getSiteContent();
        console.warn("Cloud content fetch failed", e);
      }
  }
  return getStorage<SiteContent>(KEY_CONTENT, DEFAULT_CONTENT);
};

export const updateSiteContent = async (content: SiteContent) => {
  if (isCloudActive()) {
      try {
        await setDoc(doc(db, 'content', 'main'), content);
        return;
      } catch (e) {
        if (handleCloudError(e)) { updateSiteContent(content); return; }
        throw e;
      }
  }
  setStorage(KEY_CONTENT, content);
};

export const getGameRules = async (): Promise<GameRules> => {
  if (isCloudActive()) {
      try {
        const snap = await getDoc(doc(db, 'content', 'rules'));
        return snap.exists() ? (snap.data() as GameRules) : { content: "Rules not set.", lastUpdated: null };
      } catch (e) {
        if (handleCloudError(e)) return getGameRules();
      }
  }
  return getStorage<GameRules>(KEY_RULES, {
    content: "1. Look for clues carefully.\n2. Work together with your team.\n3. Be the best detective you can be!",
    lastUpdated: null 
  });
};

export const updateGameRules = async (content: string) => {
  if (isCloudActive()) {
      try {
        await setDoc(doc(db, 'content', 'rules'), { content, lastUpdated: new Date().toISOString() });
        return;
      } catch (e) {
        if (handleCloudError(e)) { updateGameRules(content); return; }
        throw e;
      }
  }
  setStorage(KEY_RULES, { content, lastUpdated: new Date().toISOString() });
};
