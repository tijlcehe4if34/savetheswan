
import React from 'react';
import { TypewriterText } from './TypewriterText';

export const StoryGuide: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const storyText = `
THE INCIDENT REPORT - 1947

VICTIM: "Swan" (City Mascot)
STATUS: MISSING / KIDNAPPED

DETAILS:
It was a Tuesday. The city was quiet. Too quiet.
Swan was in his pond at the park, waving to the children like he always does. He is a good bird. He never hurt nobody.

But when the sun went down, a black car pulled up. Witnesses say they saw two shadows. There was a struggle. Feathers were left on the ground.

Now the pond is empty. The city feels sad.

A note was found pinned to the old oak tree. It was cut from newspaper letters. It said they took him. They want something, but we don't know what yet.

YOUR MISSION:
We need to find out who took him and where he is. We need to bring Swan home before it's too late.

Look for clues. Talk to your partners. Trust no one but your team.
`;

  return (
    <div className="min-h-screen bg-[#12110f] p-4 md:p-12 flex items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none"></div>
      
      <div className="max-w-2xl w-full bg-[#f0ece3] dark:bg-[#2a2624] dark:text-stone-300 shadow-[0_0_100px_rgba(0,0,0,1)] border-[1px] border-stone-400 dark:border-stone-600 p-8 md:p-12 relative transform rotate-1 transition-colors duration-500">
        
        {/* Paper Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-50 pointer-events-none mix-blend-multiply"></div>

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="border-b-4 border-double border-stone-800 dark:border-stone-500 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-stone-900 dark:text-stone-100 transform -rotate-1">
                OFFICIAL CASE FILE
              </h1>
              <div className="flex gap-2 mt-2">
                 <span className="bg-red-800 text-white text-[10px] font-black uppercase px-2 py-1 tracking-widest">Confidential</span>
                 <span className="bg-stone-800 text-white text-[10px] font-black uppercase px-2 py-1 tracking-widest">Case #47-SWAN</span>
              </div>
            </div>
            <div className="w-16 h-16 border-4 border-stone-800 dark:border-stone-400 rounded-full opacity-50 flex items-center justify-center">
              <span className="font-black text-xs uppercase -rotate-12 text-stone-800 dark:text-stone-400">Police Dept.</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 font-mono text-sm md:text-base leading-relaxed text-stone-800 dark:text-stone-300 whitespace-pre-wrap mb-8">
            <TypewriterText text={storyText} speed={15} />
          </div>

          {/* Footer / Exit */}
          <div className="mt-auto pt-6 border-t border-stone-400 dark:border-stone-600 flex justify-between items-center">
            <div className="text-[10px] uppercase font-black tracking-widest text-stone-500">
              Department of Investigation
            </div>
            <button 
              onClick={onExit}
              className="bg-stone-900 dark:bg-black text-white px-8 py-3 font-black uppercase text-xs shadow-lg hover:bg-stone-800 border-b-4 border-black dark:border-stone-700 active:translate-y-1 transition-all"
            >
              Close File & Start Search
            </button>
          </div>

          {/* Stamp */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-red-900/20 text-red-900/20 text-6xl font-black uppercase p-4 transform -rotate-12 pointer-events-none">
            TOP SECRET
          </div>
        </div>
      </div>
    </div>
  );
};
