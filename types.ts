
export interface Clue {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dateFound: string;
  location: string;
  isUnlocked: boolean;
  addedBy?: string; // Email of the person who found it
  targetPlayer?: string; // If specific to one player
}

export interface UserRecord {
  id?: string;
  email: string;
  name: string;
  groupName: string;
  groupMembers: string;
  loginTime: any;
  cluesUnlocked?: number;
  lastAction?: string;
  lastActionTime?: string;
}

export interface Report {
  id: string;
  userEmail: string;
  userName: string;
  message: string;
  timestamp: any;
  status: 'new' | 'read';
}

// Added missing interface used by dataService and RulesPage
export interface GameRules {
  content: string;
  lastUpdated: any;
}

export interface SiteContent {
  [key: string]: string;
}

export enum AppState {
  LOBBY = 'LOBBY',
  INTRO_VIDEO = 'INTRO_VIDEO',
  INVESTIGATION = 'INVESTIGATION',
  ADMIN_PANEL = 'ADMIN_PANEL',
  RULES = 'RULES'
}
