
import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { InvestigationBoard } from './components/InvestigationBoard';
import { VideoIntro } from './components/VideoIntro';
import { AdminPanel } from './components/AdminPanel';
import { RulesPage } from './components/RulesPage';
import { StoryGuide } from './components/StoryGuide';
import { AppState, SiteContent } from './types';
import { getSiteContent, ADMIN_EMAIL, getCurrentSession, getUserInfoByEmail, logoutUser } from './services/dataService';

export default function App() {
  const [user, setUser] = useState<{email: string, name: string} | null>(null);
  const [currentState, setCurrentState] = useState<AppState>(AppState.LOBBY);
  const [content, setContent] = useState<SiteContent>({});

  useEffect(() => {
    // Initial load
    const init = async () => {
      const c = await getSiteContent();
      setContent(c);
      
      const sessionEmail = getCurrentSession();
      if (sessionEmail) {
         const profile = await getUserInfoByEmail(sessionEmail);
         if (profile) {
             setUser({ email: profile.email, name: profile.name });
             setCurrentState(AppState.INVESTIGATION);
         }
      }
    };
    init();
  }, []);

  const handleLogin = (email: string, name: string) => {
    setUser({ email, name });
    // If there is an intro video configured, show it first
    if (content.intro_video_url && content.intro_video_url.length > 5) {
        setCurrentState(AppState.INTRO_VIDEO);
    } else {
        setCurrentState(AppState.INVESTIGATION);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setCurrentState(AppState.LOBBY);
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      {currentState === AppState.LOBBY && (
        <LoginScreen onLoginSuccess={handleLogin} content={content} />
      )}

      {currentState === AppState.INTRO_VIDEO && (
        <VideoIntro 
            onComplete={() => setCurrentState(AppState.INVESTIGATION)} 
            content={content}
        />
      )}

      {currentState === AppState.INVESTIGATION && user && (
        <InvestigationBoard 
            badge="47" 
            name={user.name} 
            userEmail={user.email}
            isAdmin={isAdmin}
            onOpenAdmin={() => setCurrentState(AppState.ADMIN_PANEL)}
            onOpenRules={() => setCurrentState(AppState.RULES)}
            onOpenStory={() => setCurrentState(AppState.STORY)}
            onLogout={handleLogout}
            content={content}
        />
      )}

      {currentState === AppState.ADMIN_PANEL && (
          <AdminPanel 
            onExit={() => setCurrentState(AppState.INVESTIGATION)} 
            content={content}
            onContentUpdate={async () => {
                const c = await getSiteContent();
                setContent(c);
            }}
          />
      )}

      {currentState === AppState.RULES && (
          <RulesPage 
            isAdmin={isAdmin}
            onExit={() => setCurrentState(AppState.INVESTIGATION)}
          />
      )}

      {currentState === AppState.STORY && (
          <StoryGuide 
            onExit={() => setCurrentState(AppState.INVESTIGATION)}
          />
      )}
    </>
  );
}
