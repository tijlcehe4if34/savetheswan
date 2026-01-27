
import React, { useEffect, useState } from 'react';
import { SiteContent } from '../types';

export const VideoIntro: React.FC<{ onComplete: () => void; content: SiteContent }> = ({ onComplete, content }) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const videoUrl = content.intro_video_url || "https://www.w3schools.com/html/mov_bbb.mp4";

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full max-w-5xl max-h-[80vh] bg-[#111] border-8 border-stone-800 shadow-[0_0_100px_rgba(0,0,0,1)]">
        
        {/* Video Player */}
        <video 
          src={videoUrl} 
          autoPlay 
          className="w-full h-full object-cover grayscale opacity-60"
          onEnded={() => setVideoEnded(true)}
        />

        {/* Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 bg-black/40">
           <div className="p-10 border-4 border-white/20 backdrop-blur-sm animate-fade-in">
             <h2 className="text-stone-300 font-serif italic text-2xl tracking-[0.4em] uppercase mb-4">{content.intro_subtitle || "The Big Mystery"}</h2>
             <h1 className="text-white font-black text-5xl md:text-7xl tracking-tighter uppercase border-y-2 border-white/50 py-6 mb-4">{content.intro_title || "The Missing Swan"}</h1>
             <p className="text-stone-400 font-mono text-xs uppercase tracking-widest animate-pulse">{content.intro_desc || "Help find the city mascot!"}</p>
           </div>
        </div>

        {/* Navigation */}
        <div className="absolute bottom-8 right-8 flex gap-4">
          <button 
            onClick={onComplete} 
            className="px-8 py-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white font-black uppercase text-xs tracking-widest transition-all"
          >
            {videoEnded ? "Enter Precinct" : "Skip Intro"}
          </button>
        </div>
      </div>
    </div>
  );
};
