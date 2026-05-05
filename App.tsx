
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './services/firebase';
import { LoginScreen } from './components/LoginScreen';
import { InvestigationBoard } from './components/InvestigationBoard';
import { VideoIntro } from './components/VideoIntro';
import { AdminPanel } from './components/AdminPanel';
import { RulesPage } from './components/RulesPage';
import { StoryGuide } from './components/StoryGuide';
import { CountdownScreen } from './components/CountdownScreen';
import { SoundPlayer } from './components/SoundPlayer';
import { AppState, SiteContent } from './types';
import { getSiteContent, ADMIN_EMAILS, getCurrentSession, getUserInfoByEmail, logoutUser } from './services/dataService';

const TARGET_DATE = new Date('2026-06-11T04:15:00');

export default function App() {
  const [user, setUser] = useState<{email: string, name: string} | null>(null);
  const [currentState, setCurrentState] = useState<AppState>(AppState.LOBBY);
  const [content, setContent] = useState<SiteContent>({});

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);
  const isPreLaunch = new Date() < TARGET_DATE;

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const profile = await getUserInfoByEmail(firebaseUser.email);
        if (profile) {
          setUser({ email: profile.email, name: profile.name });
          
          const amIAdmin = ADMIN_EMAILS.includes(profile.email);
          if (isPreLaunch && !amIAdmin) {
            setCurrentState(AppState.COUNTDOWN);
          } else {
            setCurrentState(AppState.INVESTIGATION);
          }
        }
      } else {
        setUser(null);
        setCurrentState(AppState.LOBBY);
      }
    });

    // Initial content load
    const loadContent = async () => {
      const c = await getSiteContent();
      setContent(c);
    };
    loadContent();

    return () => unsubscribe();
  }, [isPreLaunch]);

  const handleLogin = (email: string, name: string) => {
    setUser({ email, name });
    const amIAdmin = ADMIN_EMAILS.includes(email);

    if (isPreLaunch && !amIAdmin) {
        setCurrentState(AppState.COUNTDOWN);
        return;
    }

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

  return (
    <>
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

      {currentState === AppState.COUNTDOWN && (
        <motion.div
           key="countdown"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 1 }}
           className="min-h-screen w-full"
        >
          <CountdownScreen 
            targetDate={TARGET_DATE} 
            isAdmin={!!isAdmin} 
            userEmail={user?.email}
            onLogout={handleLogout}
            onComplete={() => {
              if (user) setCurrentState(AppState.INVESTIGATION);
            }}
          />
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
    <SoundPlayer appState={currentState} />
</>
  );
}
