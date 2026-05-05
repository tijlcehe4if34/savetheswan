
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface CountdownScreenProps {
  targetDate: Date;
  onLogout: () => void;
  onComplete?: () => void;
  isAdmin: boolean;
  userEmail?: string;
}

export const CountdownScreen: React.FC<CountdownScreenProps> = ({ targetDate, onLogout, onComplete, isAdmin, userEmail }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        setTimeLeft(null);
        if (onComplete) onComplete();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="min-h-screen bg-black text-stone-300 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none noir-vignette opacity-70 z-10"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5 }}
        className="z-20 text-center max-w-2xl"
      >
        <h1 className="text-4xl md:text-6xl font-serif italic mb-2 text-stone-100 uppercase tracking-widest border-b border-stone-800 pb-4">
          Case Suspended
        </h1>
        <p className="text-stone-500 font-mono text-xs uppercase tracking-[0.3em] mb-12">
          The files are locked. The witness is silent.
        </p>

        {timeLeft ? (
          <div className="grid grid-cols-4 gap-4 md:gap-8 mb-16">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Minutes', value: timeLeft.minutes },
              { label: 'Seconds', value: timeLeft.seconds },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <span className="text-4xl md:text-6xl font-black font-mono text-stone-100 tabular-nums">
                  {String(item.value).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-black text-stone-600 tracking-widest mt-2">{item.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xl font-serif italic text-stone-400 mb-16">
            The clock has struck. The investigation resumes.
          </div>
        )}

        <div className="bg-[#111] border border-stone-800 p-8 shadow-2xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-800 text-stone-400 px-4 py-1 text-[9px] font-black uppercase tracking-widest border border-stone-700">
            Field Status
          </div>
          <p className="text-sm italic font-serif leading-relaxed text-stone-400 mb-4">
            "Agent {userEmail}, your credentials have been verified. However, the files remain sealed until the clock runs down."
          </p>
          <p className="text-[10px] uppercase font-mono text-stone-600 mb-8">
            Unauthorized early access is a violation of Bureau Protocol 47.
          </p>
          
          <button 
            onClick={onLogout}
            className="text-[10px] font-black uppercase tracking-widest text-stone-600 hover:text-stone-300 transition-colors border-t border-stone-800 pt-4 w-full"
          >
            Switch Agent Credentials // Return to Lobby
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-8 right-8 text-[10px] text-stone-800 font-black uppercase tracking-[0.5em] select-none">
        Swan Ransom // 1947
      </div>
    </div>
  );
};
