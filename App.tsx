
import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { InvestigationBoard } from './components/InvestigationBoard';
import { VideoIntro } from './components/VideoIntro';
import { AdminPanel } from './components/AdminPanel';
import { RulesPage } from './components/RulesPage';
import { AppState, SiteContent } from './types';
import { getSiteContent, getUserInfoByEmail, setErrorListener, getCurrentSession, ADMIN_EMAIL, logUserAction } from './services/dataService';

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.LOBBY);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState<SiteContent>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Theme Persistence
    const savedTheme = localStorage.getItem('sw_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    // Listen for global database errors
    setErrorListener((msg) => {
      setGlobalError(msg);
      setTimeout(() => setGlobalError(null), 6000);
    });

    // Handle authentication persistence
    const checkAuth = async () => {
      const storedEmail = getCurrentSession();
      if (storedEmail) {
        const email = storedEmail.toLowerCase().trim();
        setUserEmail(email);
        const info = await getUserInfoByEmail(email);
        setUserName(info?.name || "Detective");
        
        // Skip login screen if already authenticated
        if (currentState === AppState.LOBBY) {
          setCurrentState(AppState.INVESTIGATION);
        }
      } else {
        setUserEmail('');
        setUserName('');
        setCurrentState(AppState.LOBBY);
      }
      setIsAuthChecking(false);
    };

    checkAuth();
  }, [currentState]);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getSiteContent();
      setContent(data);
    };
    loadContent();
  }, []);

  const handleLoginSuccess = (email: string, name: string) => {
    const cleanEmail = email.toLowerCase().trim();
    setUserEmail(cleanEmail);
    setUserName(name);
    // Log the action so Admin sees them immediately
    logUserAction(cleanEmail, "Watching Orientation Film");
    setCurrentState(AppState.INTRO_VIDEO);
  };

  const handleVideoComplete = () => {
    setCurrentState(AppState.INVESTIGATION);
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('sw_theme', newMode ? 'dark' : 'light');
  };

  const isAdmin = userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-stone-800 border-t-stone-400 rounded-full animate-spin"></div>
        <div className="text-stone-700 font-serif italic text-lg tracking-widest uppercase">Personnel Records...</div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen selection:bg-stone-700 selection:text-white bg-black transition-colors duration-500`}>
      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-[300] w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 border-2 border-stone-400 dark:border-stone-600 flex items-center justify-center text-lg shadow-xl hover:scale-110 transition-transform text-stone-800 dark:text-stone-200"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? '💡' : '🌑'}
      </button>

      {/* Global Error Alert */}
      {globalError && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-fade-in w-full max-w-md px-4">
          <div className="bg-red-50 dark:bg-red-900 border-4 border-red-900 p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] transform -rotate-1">
            <p className="text-[10px] font-black uppercase text-red-900 dark:text-red-300 mb-1 tracking-tighter">Transmission Error / Security Alert:</p>
            <p className="text-sm font-bold text-red-800 dark:text-red-200 leading-tight">{globalError}</p>
            <p className="text-[9px] text-red-700/50 dark:text-red-400 mt-2 uppercase font-black">Note: Local Storage in use.</p>
          </div>
        </div>
      )}

      {currentState === AppState.LOBBY && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} content={content} />
      )}
      
      {currentState === AppState.INTRO_VIDEO && (
        <VideoIntro onComplete={handleVideoComplete} content={content} />
      )}

      {currentState === AppState.INVESTIGATION && (
        <InvestigationBoard 
          badge="1947" 
          name={userName} 
          userEmail={userEmail}
          isAdmin={isAdmin}
          onOpenAdmin={() => setCurrentState(AppState.ADMIN_PANEL)}
          onOpenRules={() => setCurrentState(AppState.RULES)}
          content={content}
        />
      )}

      {currentState === AppState.ADMIN_PANEL && (
        <AdminPanel 
          onExit={() => setCurrentState(AppState.INVESTIGATION)} 
          content={content}
          onContentUpdate={() => getSiteContent().then(setContent)}
        />
      )}

      {currentState === AppState.RULES && (
        <RulesPage 
          isAdmin={isAdmin} 
          onExit={() => setCurrentState(AppState.INVESTIGATION)} 
        />
      )}
    </div>
  );
};

export default App;
