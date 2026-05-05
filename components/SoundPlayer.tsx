import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState } from '../types';

interface SoundPlayerProps {
  appState: AppState;
}

const TRACKS = {
  RAIN: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', // Placeholder for ambient rain/low
  JAZZ_LOW: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', // Mellow Jazz
  JAZZ_HIGH: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', // Intense/Tension
};

export const SoundPlayer: React.FC<SoundPlayerProps> = ({ appState }) => {
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rainRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(TRACKS.RAIN);

  useEffect(() => {
    // Rain should always be there if not muted
    if (!rainRef.current) {
      rainRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'); // We'll use this for ambient texture
      rainRef.current.loop = true;
      rainRef.current.volume = 0.2;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(currentTrack);
      audioRef.current.loop = true;
    }

    if (!isMuted) {
      rainRef.current.play().catch(() => {});
      audioRef.current.play().catch(() => {});
    } else {
      rainRef.current.pause();
      audioRef.current.pause();
    }
  }, [isMuted]);

  useEffect(() => {
    let track = TRACKS.RAIN;
    switch (appState) {
      case AppState.INVESTIGATION:
      case AppState.STORY:
        track = TRACKS.JAZZ_LOW;
        break;
      case AppState.COUNTDOWN:
        track = TRACKS.JAZZ_HIGH;
        break;
      default:
        track = TRACKS.RAIN;
    }

    if (track !== currentTrack && audioRef.current) {
      const wasPlaying = !audioRef.current.paused;
      audioRef.current.src = track;
      setCurrentTrack(track);
      if (wasPlaying && !isMuted) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [appState, isMuted]);

  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.play()
        .then(() => setIsMuted(false))
        .catch(e => {
          console.error("Playback failed", e);
          // User interaction required usually
        });
    } else {
      audioRef.current.pause();
      setIsMuted(true);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      <AnimatePresence>
        {!isMuted && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="hidden md:block bg-black/80 border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest text-zinc-500 font-mono"
          >
            Ambient Noir: {appState}
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={toggleMute}
        className="group relative p-3 rounded-full bg-black/80 border border-white/10 hover:border-amber-500/50 transition-all duration-300"
        title={isMuted ? "Unmute Ambient Music" : "Mute Ambient Music"}
      >
        <div className="absolute inset-0 rounded-full bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-zinc-500 group-hover:text-amber-500 transition-colors" />
        ) : (
          <Volume2 className="w-5 h-5 text-amber-500 animate-pulse" />
        )}
      </button>
    </div>
  );
};
