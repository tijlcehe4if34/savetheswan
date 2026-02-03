
import React, { useState, useEffect, useCallback } from 'react';
import { Clue, SiteContent } from '../types';
import { TypewriterText } from './TypewriterText';
import { getNoirNarration } from '../services/geminiService';
import { getCaseClues, addReport, addClue, logUserAction } from '../services/dataService';

export const InvestigationBoard: React.FC<{ 
  badge: string; 
  name: string; 
  userEmail: string;
  isAdmin: boolean; 
  onOpenAdmin: () => void;
  onOpenRules: () => void;
  content: SiteContent;
}> = ({ badge, name, userEmail, isAdmin, onOpenAdmin, onOpenRules, content }) => {
  const [narration, setNarration] = useState(content.monologue_default || "The mystery is waiting for you.");
  const [isNarrating, setIsNarrating] = useState(false);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  
  const [showAddClueModal, setShowAddClueModal] = useState(false);
  const [isAddingClue, setIsAddingClue] = useState(false);
  const [newClue, setNewClue] = useState({ 
    title: '', 
    description: '', 
    location: '', 
    imageUrl: 'https://images.unsplash.com/photo-1598124838120-020cb38520e1?q=80&w=2070&auto=format&fit=crop' 
  });

  useEffect(() => {
    if (userEmail) {
      logUserAction(userEmail, "Surveying the Evidence Board");
    }
  }, [userEmail]);

  const fetchClues = useCallback(async () => {
    if (!userEmail) return;
    const data = await getCaseClues(userEmail);
    setClues(data);
    setIsInitialLoading(false);
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) {
      fetchClues();
      const interval = setInterval(fetchClues, 15000); 
      return () => clearInterval(interval);
    }
  }, [userEmail, fetchClues]);

  const fetchNewNarration = async (context: string) => {
    setIsNarrating(true);
    try {
      const text = await getNoirNarration(context);
      setNarration(text);
    } catch (error) {
      setNarration("The trail is getting fuzzy. I need to focus.");
    } finally {
      setIsNarrating(false);
    }
  };

  const handleInspectClue = (clue: Clue) => {
    setSelectedClue(clue);
    logUserAction(userEmail, `Inspecting: ${clue.title}`);
    fetchNewNarration(`I'm looking at ${clue.title}. It was found at ${clue.location}.`);
  };

  const submitReport = async () => {
    if (!reportText.trim()) return;
    setIsSendingReport(true);
    logUserAction(userEmail, "Contacting Headquarters");
    try {
      await addReport({ userEmail, userName: name, message: reportText });
      setReportText('');
      setShowReportModal(false);
      setNarration("A signal was sent to HQ. Help is on the way, I just have to sit tight.");
      logUserAction(userEmail, "Waiting for HQ response");
    } catch (err) { 
      // Error handled by global listener
    } finally {
      setIsSendingReport(false);
    }
  };

  const submitNewFinding = async () => {
    if (!newClue.title || !newClue.description) return;
    setIsAddingClue(true);
    logUserAction(userEmail, "Filing new evidence");
    try {
      await addClue({ 
        ...newClue, 
        dateFound: new Date().toISOString().split('T')[0],
        addedBy: userEmail 
      });
      setNewClue({ 
        title: '', 
        description: '', 
        location: '', 
        imageUrl: 'https://images.unsplash.com/photo-1598124838120-020cb38520e1?q=80&w=2070&auto=format&fit=crop' 
      });
      setShowAddClueModal(false);
      await fetchClues();
      setNarration(`I found something new: ${newClue.title}. The board is starting to make sense.`);
      logUserAction(userEmail, "Reviewing updated board");
    } catch (err) { 
      // Error handled by global listener
    } finally {
      setIsAddingClue(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-stone-300 p-4 md:p-12 pb-32 relative flex flex-col md:flex-row gap-8 overflow-x-hidden transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none noir-vignette z-10 opacity-50"></div>

      {/* Side Bar */}
      <div className="w-full md:w-1/4 flex flex-col gap-6 z-20">
        <div className="bg-[#111] border-l-4 border-stone-600 p-6 shadow-2xl min-h-[180px]">
          <h2 className="text-xs font-black border-b border-stone-800 pb-2 mb-4 text-stone-500 uppercase tracking-widest">Case Log</h2>
          <div className="text-sm leading-relaxed text-stone-400 italic font-serif">
            <TypewriterText text={narration} speed={40} onComplete={() => setIsNarrating(false)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => setShowAddClueModal(true)} className="bg-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-600 text-stone-900 py-4 font-black uppercase text-xs shadow-xl border-b-4 border-stone-500 active:translate-y-1 transition-all hover:bg-white dark:hover:bg-stone-700">
            + Add a Finding
          </button>
          <button onClick={() => setShowReportModal(true)} className="bg-red-800 text-white py-4 font-black uppercase text-xs shadow-xl border-b-4 border-red-950 active:translate-y-1 transition-all hover:bg-red-700">
            ⚠ Help! (Ask Chief)
          </button>
          <button onClick={() => { onOpenRules(); logUserAction(userEmail, "Reading the Rules"); }} className="bg-stone-800 text-stone-400 py-3 font-black uppercase text-[10px] border border-stone-700 hover:bg-stone-700 hover:text-white transition-colors">
            Game Rules
          </button>
          {isAdmin && (
             <button onClick={() => { onOpenAdmin(); logUserAction(userEmail, "Entering Chiefs Office"); }} className="mt-4 bg-stone-900 border-2 border-stone-700 text-stone-300 py-2 font-black uppercase text-[10px] tracking-widest hover:bg-stone-800">
               ★ Chief's Office
             </button>
          )}
        </div>

        <div className="mt-auto hidden md:block opacity-20 text-[10px] uppercase font-black tracking-widest text-stone-500">
          Bureau of Investigation // 1947
        </div>
      </div>

      {/* Main Board */}
      <div className="w-full md:w-3/4 z-20 flex flex-col gap-6">
        <div className="border-b-4 border-stone-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
          <h1 className="text-3xl md:text-5xl font-serif italic text-stone-100 opacity-80 uppercase tracking-tight">
            {content.manifest_heading || "The Evidence Board"}
          </h1>
          <div className="flex flex-col items-end">
             {isAdmin && (
                <span className="mb-2 bg-red-800 text-white text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">
                  Admin Access Granted
                </span>
             )}
             <div className="text-[10px] font-bold text-stone-600 bg-stone-900 px-3 py-1 border border-stone-800">
                RECORD: {name.toUpperCase()}
             </div>
          </div>
        </div>
        
        {isInitialLoading ? (
           <div className="py-20 text-center text-stone-600 font-serif italic animate-pulse">Consulting the files...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {clues.map((clue) => (
              <div key={clue.id} onClick={() => handleInspectClue(clue)} className="group cursor-pointer transform transition-all hover:scale-[1.02] hover:-rotate-1">
                <div className="bg-[#111] border-2 border-stone-800 p-4 h-full flex flex-col shadow-2xl relative">
                   {clue.targetPlayer && (
                      <div className="absolute top-2 right-2 bg-yellow-600 text-black text-[9px] font-black px-2 py-0.5 uppercase z-10">
                        Classified
                      </div>
                   )}
                  <div className="relative aspect-square mb-4 overflow-hidden border border-stone-700 bg-black grayscale group-hover:grayscale-0 transition-all duration-500">
                    <img src={clue.imageUrl} alt={clue.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"></div>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-stone-200 mb-1 leading-none">{clue.title}</h3>
                  <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-3">{clue.location}</p>
                  <div className="mt-auto pt-3 border-t border-stone-800 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-serif italic text-stone-400">Found by {clue.addedBy === userEmail ? 'You' : (clue.addedBy === 'CHIEF' ? 'The Chief' : 'Agent')}</span>
                    <span className="text-[9px] font-black text-stone-600 border border-stone-700 px-1">CASE #{clue.id.slice(-4)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {clues.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-40">
                <p className="font-serif italic text-xl">The board is empty. Start investigating.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CLUE DETAIL MODAL */}
      {selectedClue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedClue(null)}>
          <div className="bg-[#f4f1ea] dark:bg-[#1c1917] dark:text-stone-300 w-full max-w-lg p-2 shadow-2xl transform rotate-1 transition-colors duration-500" onClick={e => e.stopPropagation()}>
             <div className="border-[6px] border-stone-800 dark:border-stone-600 p-6 md:p-8 relative">
               <button onClick={() => setSelectedClue(null)} className="absolute top-2 right-2 text-3xl font-black text-stone-400 hover:text-red-800 leading-none">&times;</button>
               
               <div className="w-full aspect-video bg-black mb-6 border-4 border-stone-300 dark:border-stone-700 shadow-inner relative overflow-hidden">
                 <img src={selectedClue.imageUrl} className="w-full h-full object-cover opacity-90 grayscale hover:grayscale-0 transition-all duration-700" alt={selectedClue.title} />
               </div>
               
               <h2 className="text-3xl font-black uppercase mb-1 leading-none text-stone-900 dark:text-stone-100">{selectedClue.title}</h2>
               <div className="flex gap-4 mb-6 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 border-b-2 border-stone-300 dark:border-stone-700 pb-4">
                 <span>LOC: {selectedClue.location}</span>
                 <span>DATE: {selectedClue.dateFound}</span>
               </div>
               
               <p className="font-serif text-lg leading-relaxed text-stone-800 dark:text-stone-300 italic mb-8">
                 "{selectedClue.description}"
               </p>
               
               <div className="flex justify-between items-center mt-4">
                 <div className="text-[9px] font-black uppercase bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2 py-1">
                   EVIDENCE #{selectedClue.id}
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* ADD CLUE MODAL */}
      {showAddClueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#f4f1ea] dark:bg-[#1c1917] dark:text-stone-300 w-full max-w-md p-8 shadow-2xl border-[8px] border-stone-400 dark:border-stone-600 transition-colors duration-500">
             <h2 className="text-2xl font-black uppercase mb-6 pb-2 border-b-4 border-stone-800 dark:border-stone-500 text-stone-900 dark:text-stone-100">Submit Evidence</h2>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-[9px] font-black uppercase mb-1 text-stone-500 dark:text-stone-400">What did you find?</label>
                 <input 
                    type="text" 
                    value={newClue.title} 
                    onChange={e => setNewClue({...newClue, title: e.target.value})}
                    className="w-full bg-white dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600 p-2 font-mono text-sm focus:border-stone-900 dark:focus:border-stone-400 outline-none" 
                    placeholder="E.g. A Mysterious Key"
                  />
               </div>
               <div>
                 <label className="block text-[9px] font-black uppercase mb-1 text-stone-500 dark:text-stone-400">Where was it?</label>
                 <input 
                    type="text" 
                    value={newClue.location} 
                    onChange={e => setNewClue({...newClue, location: e.target.value})}
                    className="w-full bg-white dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600 p-2 font-mono text-sm focus:border-stone-900 dark:focus:border-stone-400 outline-none" 
                    placeholder="E.g. Behind the curtain"
                  />
               </div>
               <div>
                 <label className="block text-[9px] font-black uppercase mb-1 text-stone-500 dark:text-stone-400">Description</label>
                 <textarea 
                    value={newClue.description} 
                    onChange={e => setNewClue({...newClue, description: e.target.value})}
                    className="w-full bg-white dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600 p-2 font-mono text-sm h-24 focus:border-stone-900 dark:focus:border-stone-400 outline-none" 
                    placeholder="Describe it simply..."
                  />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mt-8">
               <button onClick={submitNewFinding} disabled={isAddingClue} className="bg-stone-900 dark:bg-black text-white py-3 font-black uppercase text-xs hover:bg-stone-800">
                 {isAddingClue ? 'Filing...' : 'Submit'}
               </button>
               <button onClick={() => setShowAddClueModal(false)} className="bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 py-3 font-black uppercase text-xs hover:bg-stone-300 dark:hover:bg-stone-600">
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#f4f1ea] dark:bg-[#1c1917] dark:text-stone-300 w-full max-w-md p-8 shadow-2xl border-[8px] border-red-900 relative transition-colors duration-500">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest shadow-md">
               Urgent Wire
             </div>
             
             <h2 className="text-xl font-black uppercase mb-4 text-center mt-2 text-stone-900 dark:text-stone-100">Contact Headquarters</h2>
             <p className="text-xs font-serif italic text-center text-stone-600 dark:text-stone-400 mb-6">"Send a message to the Chief. Only use for emergencies or big discoveries."</p>
             
             <textarea 
                value={reportText} 
                onChange={e => setReportText(e.target.value)}
                className="w-full bg-white dark:bg-stone-800 border-2 border-red-200 dark:border-red-900/50 p-4 font-mono text-sm h-32 focus:border-red-900 outline-none mb-6" 
                placeholder="Chief, I found something..."
              />

             <div className="grid grid-cols-2 gap-4">
               <button onClick={submitReport} disabled={isSendingReport} className="bg-red-800 text-white py-3 font-black uppercase text-xs hover:bg-red-700 shadow-lg active:translate-y-1 transition-all">
                 {isSendingReport ? 'Sending...' : 'Send Wire'}
               </button>
               <button onClick={() => setShowReportModal(false)} className="bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 py-3 font-black uppercase text-xs hover:bg-stone-300 dark:hover:bg-stone-600">
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
