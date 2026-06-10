import { doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { UserRecord, Clue, GameRules, SiteContent, Report } from '../types';

export const ADMIN_EMAIL = 'vanherpentijl@gmail.com';
export const ADMIN_EMAILS = ['vanherpentijl@gmail.com', 'tijlvanherpen@icloud.com'];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  // If it's a firebase auth error, we might want to flag it differently
  if ((error as any).code?.startsWith('auth/')) {
    console.error('Auth Error: ', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  
  throw error; // Throw the original error so UI can handle specific codes
}

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
    try {
        await signInWithEmailAndPassword(auth, email, password);
        const docRef = doc(db, 'profiles', email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as UserRecord;
            await updateDoc(docRef, { loginTime: new Date().toISOString() });
            return data;
        } else {
            return { email, name: 'Agent', groupName: 'Unknown', groupMembers: '', loginTime: new Date().toISOString() };
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `profiles/${email}`);
        throw error;
    }
};

export const registerUser = async (email: string, password: string, name: string): Promise<void> => {
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
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `profiles/${email}`);
        throw error;
    }
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
  const path = `profiles/${userData.email}`;
  try {
      const userRef = doc(db, 'profiles', userData.email);
      await setDoc(userRef, {
          ...userData,
          loginTime: timestamp,
          lastActionTime: timestamp,
          lastAction: 'Logged In'
      }, { merge: true });
  } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
  }
};

export const getUserInfoByEmail = async (email: string): Promise<UserRecord | null> => {
    const path = `profiles/${email}`;
    try {
        const docRef = doc(db, 'profiles', email);
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as UserRecord;
    } catch (e) { 
        handleFirestoreError(e, OperationType.GET, path);
    }
    return null;
};

export const logUserAction = async (email: string, action: string) => {
    const timestamp = new Date().toISOString();
    const path = `profiles/${email}`;
    try {
        const userRef = doc(db, 'profiles', email);
        await updateDoc(userRef, {
            lastAction: action,
            lastActionTime: timestamp
        });
    } catch (e) { 
        handleFirestoreError(e, OperationType.UPDATE, path);
    }
};

export const updateUserNote = async (email: string, note: string) => {
    const path = `profiles/${email}`;
    try {
        await updateDoc(doc(db, 'profiles', email), { adminNotes: note });
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
    }
};

export const deleteUserProfile = async (email: string) => {
    const path = `profiles/${email}`;
    try {
        await deleteDoc(doc(db, 'profiles', email));
    } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
    }
};

export const getSiteContent = async (): Promise<SiteContent> => {
    const path = 'content/main';
    try {
        const docRef = doc(db, 'content', 'main');
        const snap = await getDoc(docRef);
        if (snap.exists()) return { ...DEFAULT_CONTENT, ...snap.data() as SiteContent };
    } catch (e) { 
        handleFirestoreError(e, OperationType.GET, path);
    }
    return DEFAULT_CONTENT;
};

export const updateSiteContent = async (newContent: SiteContent) => {
    const path = 'content/main';
    try {
        await setDoc(doc(db, 'content', 'main'), newContent, { merge: true });
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
    }
};

export const getGameRules = async (): Promise<GameRules> => {
    const path = 'content/rules';
    const defaultRules = { content: "1. Trust no one.\n2. Follow the clues.\n3. Report everything.", lastUpdated: new Date().toISOString() };
    try {
        const docRef = doc(db, 'content', 'rules');
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as GameRules;
    } catch (e) { 
        handleFirestoreError(e, OperationType.GET, path);
    }
    return defaultRules;
};

export const updateGameRules = async (content: string) => {
    const path = 'content/rules';
    try {
        const rules = { content, lastUpdated: new Date().toISOString() };
        await setDoc(doc(db, 'content', 'rules'), rules);
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
    }
};

export const addClue = async (clue: Omit<Clue, 'id'>) => {
    const path = 'clues';
    try {
        // "adding only one clue and that it delete the rest"
        const snapshot = await getDocs(collection(db, 'clues'));
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        
        await addDoc(collection(db, 'clues'), clue);
    } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, path);
    }
};

export const deleteClue = async (id: string) => {
    const path = `clues/${id}`;
    try {
        await deleteDoc(doc(db, 'clues', id));
    } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
    }
};

export const addReport = async (report: Omit<Report, 'id' | 'timestamp' | 'status'>) => {
    const path = 'reports';
    try {
        const newReport = {
            ...report,
            timestamp: new Date().toISOString(),
            status: 'new'
        };
        await addDoc(collection(db, 'reports'), newReport);
    } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, path);
    }
};

export const markReportRead = async (id: string) => {
    const path = `reports/${id}`;
    try {
        await updateDoc(doc(db, 'reports', id), { status: 'read' });
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
    }
};

export const replyToReport = async (id: string, reply: string) => {
    const path = `reports/${id}`;
    try {
        await updateDoc(doc(db, 'reports', id), { 
            status: 'replied',
            adminReply: reply,
            replyTimestamp: new Date().toISOString()
        });
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
    }
};

// --- SUBSCRIPTIONS (REAL-TIME) ---

export const subscribeToClues = (callback: (clues: Clue[]) => void) => {
    const path = 'clues';
    return onSnapshot(collection(db, 'clues'), (snapshot) => {
        const clues = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Clue));
        callback(clues);
    }, (error) => {
        // If it's a permission error and we are not admin, we might still be able to see some via query
        // but clues are public mostly.
        handleFirestoreError(error, OperationType.GET, path);
    });
};

export const subscribeToReports = (callback: (reports: Report[]) => void) => {
    const path = 'reports';
    // Admin version: gets everything
    return onSnapshot(collection(db, 'reports'), (snapshot) => {
        const reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report));
        callback(reports);
    }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
    });
};

export const subscribeToMyReports = (email: string, callback: (reports: Report[]) => void) => {
    const path = `reports?userEmail=${email}`;
    const q = query(collection(db, 'reports'), where('userEmail', '==', email));
    return onSnapshot(q, (snapshot) => {
        const reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report));
        callback(reports);
    }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
    });
};

export const subscribeToProfiles = (callback: (profiles: UserRecord[]) => void) => {
    const path = 'profiles';
    return onSnapshot(collection(db, 'profiles'), (snapshot) => {
        const profiles = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord));
        callback(profiles);
    }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
    });
};

export const subscribeToMyProfile = (email: string, callback: (profile: UserRecord) => void) => {
    const path = `profiles/${email}`;
    return onSnapshot(doc(db, 'profiles', email), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as UserRecord);
        }
    }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
    });
};
