
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

const TARGET_DATE = new Date('2026-06-11T16:15:00');

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
    setUser(null);
    setCurrentState(AppState.LOBBY);
    // Give React a small tick to unmount and cleanup active Firestore listeners
    setTimeout(async () => {
      try {
        await logoutUser();
      } catch (err) {
        console.warn("Logout error:", err);
      }
    }, 50);
  };

  return (
    <div className="relative overflow-hidden bg-black selection:bg-amber-500/30 selection:text-amber-200">
      {/* Global Cinematic Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] mix-blend-overlay">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-50" />
      </div>

      <AnimatePresence mode="wait">
        {currentState === AppState.LOBBY && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(20px)', scale: 0.95 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-screen w-full relative"
          >
            <LoginScreen onLoginSuccess={handleLogin} content={content} />
          </motion.div>
        )}

        {currentState === AppState.COUNTDOWN && (
          <motion.div
             key="countdown"
             initial={{ opacity: 0, backdropFilter: 'blur(10px)' }}
             animate={{ opacity: 1, backdropFilter: 'blur(0px)' }}
             exit={{ opacity: 0, backdropFilter: 'blur(10px)' }}
             transition={{ duration: 1.2, ease: "easeInOut" }}
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
            exit={{ opacity: 0, filter: 'brightness(2)' }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="min-h-screen w-full bg-black flex items-center justify-center"
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
            initial={{ opacity: 0, filter: 'blur(15px)', scale: 1.05 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(15px)', scale: 1.05 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
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
            initial={{ opacity: 0, y: 30, filter: 'grayscale(1)' }}
            animate={{ opacity: 1, y: 0, filter: 'grayscale(0)' }}
            exit={{ opacity: 0, y: 30, filter: 'grayscale(1)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-screen w-full bg-black/40 backdrop-blur-sm"
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
            initial={{ opacity: 0, x: -50, filter: 'blur(5px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }}
            transition={{ duration: 0.7, ease: "easeOut" }}
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
            initial={{ opacity: 0, x: 50, filter: 'blur(5px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 50, filter: 'blur(5px)' }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="min-h-screen w-full"
          >
            <StoryGuide 
              onExit={() => setCurrentState(AppState.INVESTIGATION)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SoundPlayer appState={currentState} />
      
      {/* Global Letterbox Effect for added cinema feel */}
      <div className="fixed top-0 left-0 w-full h-8 bg-black z-[110] opacity-20 pointer-events-none block md:hidden" />
      <div className="fixed bottom-0 left-0 w-full h-8 bg-black z-[110] opacity-20 pointer-events-none block md:hidden" />
    </div>
  );
}
