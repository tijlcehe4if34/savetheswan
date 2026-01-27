
import { UserRecord, Clue, GameRules, SiteContent, Report } from '../types';

// STORAGE KEYS
const KEY_CONTENT = 'sw_content';
const KEY_RULES = 'sw_rules';
const KEY_PROFILES = 'sw_profiles';
const KEY_USERS = 'sw_users'; // Stores email/password for auth
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

// HELPER: Read from LocalStorage
const getStorage = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    console.error("Storage Read Error", e);
    return defaultVal;
  }
};

// HELPER: Write to LocalStorage
const setStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage Write Error", e);
  }
};

// --- AUTH SERVICES (MOCKED) ---

// Ensures the admin account exists in LocalStorage so you can log in
const ensureAdminExists = () => {
    const users = getStorage<Record<string, string>>(KEY_USERS, {});
    
    // Always force the admin password to be correct, acting as a reset mechanism
    users[ADMIN_EMAIL] = ADMIN_DEFAULT_PASS;
    setStorage(KEY_USERS, users);
    
    // Create Admin Profile if missing
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
        console.log("Admin account seeded.");
    }
};

export const loginUser = async (email: string, password: string): Promise<UserRecord> => {
    ensureAdminExists(); // Check/reset admin on every login attempt

    const users = getStorage<Record<string, string>>(KEY_USERS, {});
    const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
    
    if (users[email] && users[email] === password) {
        setStorage(KEY_SESSION, email);
        return profiles[email];
    }
    throw new Error("auth/invalid-credential");
};

export const registerUser = async (email: string, password: string, name: string): Promise<void> => {
    ensureAdminExists();
    const users = getStorage<Record<string, string>>(KEY_USERS, {});
    if (users[email]) {
        throw new Error("auth/email-already-in-use");
    }
    users[email] = password;
    setStorage(KEY_USERS, users);
    
    // Create profile immediately
    const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
    profiles[email] = {
        email,
        name,
        groupName: 'Unassigned',
        groupMembers: 'None',
        loginTime: new Date().toISOString(),
        cluesUnlocked: 1
    };
    setStorage(KEY_PROFILES, profiles);
    setStorage(KEY_SESSION, email);
};

export const logoutUser = async () => {
    localStorage.removeItem(KEY_SESSION);
};

export const getCurrentSession = (): string | null => {
    // We use getStorage here to properly parse the JSON string (removing quotes)
    return getStorage<string | null>(KEY_SESSION, null);
};

// --- DATA SERVICES ---

let errorListener: ((msg: string) => void) | null = null;
export const setErrorListener = (listener: (msg: string) => void) => {
  errorListener = listener;
};

export const logUserLogin = async (userData: Omit<UserRecord, 'id' | 'loginTime'>) => {
  const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
  const email = userData.email;
  
  if (!profiles[email]) {
      profiles[email] = {
          ...userData,
          loginTime: new Date().toISOString(),
          cluesUnlocked: 1
      };
  } else {
      profiles[email] = {
          ...profiles[email],
          ...userData,
          loginTime: new Date().toISOString()
      };
  }
  setStorage(KEY_PROFILES, profiles);
};

export const getUserInfoByEmail = async (email: string): Promise<Partial<UserRecord> | null> => {
  const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
  return profiles[email] || null;
};

export const getAllUserProfiles = async (): Promise<any[]> => {
  const profiles = getStorage<Record<string, UserRecord>>(KEY_PROFILES, {});
  return Object.values(profiles).sort((a, b) => 
      new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()
  );
};

export const getAllClues = async (): Promise<Clue[]> => {
  return getStorage<Clue[]>(KEY_CLUES, []);
};

export const deleteClue = async (id: string) => {
  const clues = getStorage<Clue[]>(KEY_CLUES, []);
  const updated = clues.filter(c => c.id !== id);
  setStorage(KEY_CLUES, updated);
};

export const getCaseClues = async (userEmail?: string): Promise<Clue[]> => {
  if (!userEmail) return [];
  const clues = getStorage<Clue[]>(KEY_CLUES, []);
  
  return clues.filter(c => 
    !c.targetPlayer || 
    c.targetPlayer === userEmail || 
    c.addedBy === userEmail ||
    (c.addedBy === 'CHIEF' && !c.targetPlayer) // Show global admin clues
  ).sort((a, b) => new Date(b.dateFound).getTime() - new Date(a.dateFound).getTime());
};

export const addClue = async (clue: Omit<Clue, 'id' | 'isUnlocked'>) => {
  const clues = getStorage<Clue[]>(KEY_CLUES, []);
  const newClue: Clue = {
      ...clue,
      id: Date.now().toString(),
      isUnlocked: true,
      dateFound: clue.dateFound || new Date().toISOString()
  };
  clues.unshift(newClue);
  setStorage(KEY_CLUES, clues);
};

export const addReport = async (report: Omit<Report, 'id' | 'timestamp' | 'status'>) => {
  const reports = getStorage<Report[]>(KEY_REPORTS, []);
  const newReport: Report = {
      ...report,
      id: Date.now().toString(),
      status: 'new',
      timestamp: new Date().toISOString()
  };
  reports.unshift(newReport);
  setStorage(KEY_REPORTS, reports);
};

export const getReports = async (): Promise<Report[]> => {
  return getStorage<Report[]>(KEY_REPORTS, []);
};

export const markReportRead = async (id: string) => {
  const reports = getStorage<Report[]>(KEY_REPORTS, []);
  const updated = reports.map(r => r.id === id ? { ...r, status: 'read' as const } : r);
  setStorage(KEY_REPORTS, updated);
};

export const getSiteContent = async (): Promise<SiteContent> => {
  return getStorage<SiteContent>(KEY_CONTENT, DEFAULT_CONTENT);
};

export const updateSiteContent = async (content: SiteContent) => {
  setStorage(KEY_CONTENT, content);
};

export const getGameRules = async (): Promise<GameRules> => {
  return getStorage<GameRules>(KEY_RULES, {
    content: "1. Look for clues carefully.\n2. Work together with your team.\n3. Be the best detective you can be!",
    lastUpdated: null 
  });
};

export const updateGameRules = async (content: string) => {
  setStorage(KEY_RULES, {
      content,
      lastUpdated: new Date().toISOString()
  });
};
