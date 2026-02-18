import { UserRecord, Clue, GameRules, SiteContent, Report } from '../types';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

export const ADMIN_EMAIL = 'tijlvanherpen@icloud.com';

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

// --- AUTH SERVICES ---

export const loginUser = async (email: string, password: string): Promise<UserRecord> => {
    // Using Modular Auth API
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
};

export const registerUser = async (email: string, password: string, name: string): Promise<void> => {
    // Using Modular Auth API
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
};

export const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) { console.warn("Cloud logout failed", e); }
};

export const getCurrentSession = (): string | null => {
    if (auth.currentUser) return auth.currentUser.email;
    return null;
};

// --- DATA SERVICES ---

export const logUserLogin = async (userData: Omit<UserRecord, 'id' | 'loginTime'>) => {
  const timestamp = new Date().toISOString();
  try {
      const userRef = doc(db, 'profiles', userData.email);
      await setDoc(userRef, {
          ...userData,
          loginTime: timestamp,
          lastActionTime: timestamp,
          lastAction: 'Logged In'
      }, { merge: true });
  } catch (e) {
      console.error("Log login failed", e);
  }
};

export const getUserInfoByEmail = async (email: string): Promise<UserRecord | null> => {
    try {
        const docRef = doc(db, 'profiles', email);
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as UserRecord;
    } catch (e) { console.error("Get user failed", e); }
    return null;
};

export const logUserAction = async (email: string, action: string) => {
    const timestamp = new Date().toISOString();
    try {
        const userRef = doc(db, 'profiles', email);
        await updateDoc(userRef, {
            lastAction: action,
            lastActionTime: timestamp
        });
    } catch (e) { console.warn("Log action failed", e); }
};

export const updateUserNote = async (email: string, note: string) => {
    await updateDoc(doc(db, 'profiles', email), { adminNotes: note });
};

export const getSiteContent = async (): Promise<SiteContent> => {
    try {
        const docRef = doc(db, 'content', 'main');
        const snap = await getDoc(docRef);
        if (snap.exists()) return { ...DEFAULT_CONTENT, ...snap.data() as SiteContent };
    } catch (e) { console.error("Get content failed", e); }
    return DEFAULT_CONTENT;
};

export const updateSiteContent = async (newContent: SiteContent) => {
    await setDoc(doc(db, 'content', 'main'), newContent, { merge: true });
};

export const getGameRules = async (): Promise<GameRules> => {
    const defaultRules = { content: "1. Trust no one.\n2. Follow the clues.\n3. Report everything.", lastUpdated: new Date().toISOString() };
    try {
        const docRef = doc(db, 'content', 'rules');
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as GameRules;
    } catch (e) { console.error("Get rules failed", e); }
    return defaultRules;
};

export const updateGameRules = async (content: string) => {
    const rules = { content, lastUpdated: new Date().toISOString() };
    await setDoc(doc(db, 'content', 'rules'), rules);
};

export const addClue = async (clue: Omit<Clue, 'id'>) => {
    await addDoc(collection(db, 'clues'), clue);
};

export const deleteClue = async (id: string) => {
    await deleteDoc(doc(db, 'clues', id));
};

export const addReport = async (report: Omit<Report, 'id' | 'timestamp' | 'status'>) => {
    const newReport = {
        ...report,
        timestamp: new Date().toISOString(),
        status: 'new'
    };
    await addDoc(collection(db, 'reports'), newReport);
};

export const markReportRead = async (id: string) => {
    await updateDoc(doc(db, 'reports', id), { status: 'read' });
};

export const replyToReport = async (id: string, reply: string) => {
    await updateDoc(doc(db, 'reports', id), { 
        status: 'replied',
        adminReply: reply,
        replyTimestamp: new Date().toISOString()
    });
};

// --- SUBSCRIPTIONS (REAL-TIME) ---

export const subscribeToClues = (callback: (clues: Clue[]) => void) => {
    return onSnapshot(collection(db, 'clues'), (snapshot) => {
        const clues = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Clue));
        callback(clues);
    });
};

export const subscribeToReports = (callback: (reports: Report[]) => void) => {
    return onSnapshot(collection(db, 'reports'), (snapshot) => {
        const reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report));
        callback(reports);
    });
};

export const subscribeToProfiles = (callback: (profiles: UserRecord[]) => void) => {
    return onSnapshot(collection(db, 'profiles'), (snapshot) => {
        const profiles = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord));
        callback(profiles);
    });
};