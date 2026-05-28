
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
      
      {/* Station Exit Action */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={onLogout}
          className="group flex items-center gap-2 px-4 py-2 border border-stone-800 hover:border-amber-900 bg-[#090909] text-stone-500 hover:text-amber-500 transition-all font-mono text-[9px] uppercase tracking-widest shadow-md"
        >
          <span>Exit Station // Log Out</span>
          <span className="text-stone-700 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5 }}
        className="z-20 text-center max-w-2xl"
      >
        <h1 className="text-4xl md:text-6xl font-serif italic mb-2 text-stone-100 uppercase tracking-widest border-b border-stone-800 pb-4">
          Case Suspended
        </h1>
        <p className="text-stone-500 font-mono text-xs uppercase tracking-[0.3em] mb-4">
          The files are locked. The witness is silent.
        </p>
        <p className="text-amber-500/80 font-mono text-[10px] uppercase tracking-[0.2em] mb-12">
          Scheduled Opening: {targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {targetDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
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
            className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600/90 hover:text-amber-400 transition-colors border-t border-stone-800/80 pt-4 w-full flex items-center justify-center gap-1.5"
          >
            [←] Sign Out Current Agent Credentials
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-8 right-8 text-[10px] text-stone-800 font-black uppercase tracking-[0.5em] select-none">
        Swan Ransom // 1947
      </div>
    </div>
  );
};
