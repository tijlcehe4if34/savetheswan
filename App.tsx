
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
    <AnimatePresence mode="wait">
      {currentState === AppState.LOBBY && (
        <motion.div
          key="lobby"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="min-h-screen w-full"
        >
          <LoginScreen onLoginSuccess={handleLogin} content={content} />
        </motion.div>
      )}

      {currentState === AppState.INTRO_VIDEO && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="min-h-screen w-full"
        >
          <VideoIntro 
              onComplete={() => setCurrentState(AppState.INVESTIGATION)} 
              content={content}
          />
        </motion.div>
      )}

      {currentState === AppState.INVESTIGATION && user && (
        <motion.div
          key="investigation"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="min-h-screen w-full"
        >
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
        </motion.div>
      )}

      {currentState === AppState.ADMIN_PANEL && (
        <motion.div
          key="admin"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="min-h-screen w-full"
        >
          <AdminPanel 
            onExit={() => setCurrentState(AppState.INVESTIGATION)} 
            content={content}
            onContentUpdate={async () => {
                const c = await getSiteContent();
                setContent(c);
            }}
          />
        </motion.div>
      )}

      {currentState === AppState.RULES && (
        <motion.div
          key="rules"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="min-h-screen w-full"
        >
          <RulesPage 
            isAdmin={isAdmin}
            onExit={() => setCurrentState(AppState.INVESTIGATION)}
          />
        </motion.div>
      )}

      {currentState === AppState.STORY && (
        <motion.div
          key="story"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="min-h-screen w-full"
        >
          <StoryGuide 
            onExit={() => setCurrentState(AppState.INVESTIGATION)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
