
import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { InvestigationBoard } from './components/InvestigationBoard';
import { VideoIntro } from './components/VideoIntro';
import { AdminPanel } from './components/AdminPanel';
import { RulesPage } from './components/RulesPage';
import { AppState, SiteContent } from './types';
import { getSiteContent, getUserInfoByEmail, setErrorListener, getCurrentSession, ADMIN_EMAIL } from './services/dataService';

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.LOBBY);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState<SiteContent>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

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
    setUserEmail(email.toLowerCase().trim());
    setUserName(name);
    setCurrentState(AppState.INTRO_VIDEO);
  };

  const handleVideoComplete = () => {
    setCurrentState(AppState.INVESTIGATION);
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
    <div className="min-h-screen selection:bg-stone-700 selection:text-white bg-black">
      {/* Global Error Alert */}
      {globalError && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-fade-in w-full max-w-md px-4">
          <div className="bg-red-50 border-4 border-red-900 p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] transform -rotate-1">
            <p className="text-[10px] font-black uppercase text-red-900 mb-1 tracking-tighter">Transmission Error / Security Alert:</p>
            <p className="text-sm font-bold text-red-800 leading-tight">{globalError}</p>
            <p className="text-[9px] text-red-700/50 mt-2 uppercase font-black">Note: Local Storage in use.</p>
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
