
import React, { useState, useEffect, useCallback } from 'react';
import { Clue, SiteContent } from '../types';
import { TypewriterText } from './TypewriterText';
import { getNoirNarration } from '../services/geminiService';
import { getCaseClues, addReport, addClue } from '../services/dataService';

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
    fetchNewNarration(`I'm looking at ${clue.title}. It was found at ${clue.location}.`);
  };

  const submitReport = async () => {
    if (!reportText.trim()) return;
    setIsSendingReport(true);
    try {
      await addReport({ userEmail, userName: name, message: reportText });
      setReportText('');
      setShowReportModal(false);
      setNarration("A signal was sent to HQ. Help is on the way, I just have to sit tight.");
    } catch (err) { 
      // Error handled by global listener
    } finally {
      setIsSendingReport(false);
    }
  };

  const submitNewFinding = async () => {
    if (!newClue.title || !newClue.description) return;
    setIsAddingClue(true);
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
    } catch (err) { 
      // Error handled by global listener
    } finally {
      setIsAddingClue(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-stone-300 p-4 md:p-12 pb-32 relative flex flex-col md:flex-row gap-8 overflow-x-hidden">
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
          <button onClick={() => setShowAddClueModal(true)} className="bg-stone-300 text-stone-900 py-4 font-black uppercase text-xs shadow-xl border-b-4 border-stone-500 active:translate-y-1 transition-all hover:bg-white">
            + Add a Finding
          </button>
          <button onClick={() => setShowReportModal(true)} className="bg-red-800 text-white py-4 font-black uppercase text-xs shadow-xl border-b-4 border-red-950 active:translate-y-1 transition-all hover:bg-red-700">
            ⚠ Help! (Ask Chief)
          </button>
          <button onClick={onOpenRules} className="bg-stone-800 text-stone-400 py-3 font-black uppercase text-[10px] border border-stone-700 hover:bg-stone-700 hover:text-white transition-colors">
            Game Rules
          </button>
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
                <div className="bg-[#111] border-2 border-stone-800 p-4 h-full flex flex-col shadow-2xl">
                  <div className="h-44 bg-black mb-4 overflow-hidden border border-stone-900">
                    <img src={clue.imageUrl} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700" alt="clue" />
                  </div>
                  <h3 className="text-xs font-black text-stone-400 uppercase group-hover:text-stone-100 tracking-tight">{clue.title}</h3>
                  <div className="mt-auto pt-3 border-t border-stone-900 flex justify-between text-[8px] text-stone-600 font-bold uppercase tracking-widest">
                    <span>@{clue.location}</span>
                    <span className={`${clue.addedBy === 'CHIEF' ? 'text-blue-900' : 'text-stone-700'}`}>
                      {clue.addedBy === 'CHIEF' ? 'OFFICIAL' : 'FIELD LOG'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {clues.length === 0 && (
              <div className="col-span-1 md:col-span-3 text-center py-24 bg-stone-900/20 border-2 border-dashed border-stone-800">
                <p className="text-stone-700 italic font-serif">The board is blank. The trail is cold...</p>
                <button onClick={() => setShowAddClueModal(true)} className="mt-4 text-[10px] uppercase font-black text-stone-500 hover:text-stone-300 underline underline-offset-4">Start the investigation</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Help Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#f4f1ea] p-8 max-w-md w-full shadow-2xl border-stone-400 border-[10px] transform rotate-1 relative text-stone-900">
            <h2 className="text-xl font-black uppercase mb-4 text-stone-900 border-b-2 border-stone-800 pb-2">Ask the Chief for Help</h2>
            <textarea 
              value={reportText} 
              onChange={(e) => setReportText(e.target.value)} 
              disabled={isSendingReport}
              className="w-full h-40 p-4 bg-white border-2 border-stone-400 text-stone-900 text-sm font-mono mb-6 resize-none focus:outline-none focus:border-stone-800 shadow-inner" 
              placeholder="Write your message here..." 
            />
            <div className="flex gap-4">
              <button onClick={submitReport} disabled={isSendingReport || !reportText.trim()} className="flex-1 bg-stone-900 text-white py-4 font-black uppercase text-xs hover:bg-black transition-all disabled:opacity-50">
                {isSendingReport ? "SENDING WIRE..." : "SEND TO CAPTAIN"}
              </button>
              <button onClick={() => setShowReportModal(false)} disabled={isSendingReport} className="px-6 bg-stone-200 text-stone-900 py-4 font-black uppercase text-xs border-b-4 border-stone-300 active:translate-y-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Finding Modal */}
      {showAddClueModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#f4f1ea] p-8 max-w-lg w-full shadow-2xl border-stone-400 border-[10px] transform -rotate-1 relative text-stone-900">
            <h2 className="text-xl font-black uppercase mb-4 text-stone-900 border-b-2 border-stone-800 pb-2">Log New Evidence</h2>
            <div className="space-y-4 mb-6">
               <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-stone-500">Evidence Name</label>
                 <input type="text" value={newClue.title} onChange={(e) => setNewClue({...newClue, title: e.target.value})} className="w-full p-3 bg-white border-2 border-stone-400 text-stone-900 text-sm focus:outline-none focus:border-stone-800" placeholder="e.g. A torn envelope" />
               </div>
               <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-stone-500">Precise Location</label>
                 <input type="text" value={newClue.location} onChange={(e) => setNewClue({...newClue, location: e.target.value})} className="w-full p-3 bg-white border-2 border-stone-400 text-stone-900 text-sm focus:outline-none focus:border-stone-800" placeholder="e.g. Near the fountain" />
               </div>
               <div className="space-y-1">
                 <label className="text-[9px] font-black uppercase text-stone-500">Detective's Notes</label>
                 <textarea value={newClue.description} onChange={(e) => setNewClue({...newClue, description: e.target.value})} className="w-full h-24 p-3 bg-white border-2 border-stone-400 text-stone-900 text-sm resize-none focus:outline-none focus:border-stone-800" placeholder="What makes this important?" />
               </div>
            </div>
            <div className="flex gap-4">
              <button onClick={submitNewFinding} disabled={isAddingClue || !newClue.title || !newClue.description} className="flex-1 bg-stone-900 text-white py-4 font-black uppercase text-xs hover:bg-black transition-all disabled:opacity-50">
                {isAddingClue ? "LOGGING..." : "POST TO EVIDENCE BOARD"}
              </button>
              <button onClick={() => setShowAddClueModal(false)} disabled={isAddingClue} className="px-6 bg-stone-200 text-stone-900 py-4 font-black uppercase text-xs border-b-4 border-stone-300">Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View */}
      {selectedClue && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 animate-fade-in">
           <div className="bg-[#efeadf] text-black p-6 md:p-10 shadow-2xl max-w-4xl w-full border-stone-300 border-[15px] relative transform rotate-1">
              <div className="flex flex-col md:flex-row gap-10">
                  <div className="w-full md:w-5/12">
                    <img src={selectedClue.imageUrl} className="w-full h-auto grayscale contrast-125 border-8 border-white shadow-2xl" alt="clue large" />
                  </div>
                  <div className="w-full md:w-7/12 font-serif space-y-6">
                    <div className="border-b-4 border-double border-stone-900 pb-4">
                      <h3 className="text-3xl font-black uppercase tracking-tighter">{selectedClue.title}</h3>
                      <p className="text-[10px] font-black uppercase text-stone-500 tracking-widest mt-1">Status: Classified Evidence</p>
                    </div>
                    <div className="bg-white/60 p-8 border-2 border-stone-300 shadow-inner italic leading-relaxed text-lg text-stone-800 font-serif">
                       "{selectedClue.description}"
                    </div>
                  </div>
              </div>
              <button onClick={() => setSelectedClue(null)} className="absolute -top-8 -right-8 w-16 h-16 bg-stone-900 text-white text-4xl font-black border-4 border-[#efeadf] shadow-2xl hover:bg-red-900 transition-colors flex items-center justify-center">×</button>
           </div>
        </div>
      )}

      {/* Admin Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full z-[100] bg-[#0a0a0a]/98 border-t-2 border-stone-900 p-4 px-8 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-stone-600 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-900 rounded-full animate-pulse"></span>
          Secure Link: PRECINCT_LA_CENTRAL
        </div>
        <div className="flex items-center gap-6">
          {isAdmin && (
            <button onClick={onOpenAdmin} className="bg-red-900 hover:bg-red-700 text-white px-8 py-3 text-xs font-black uppercase shadow-[0_0_25px_rgba(153,27,27,0.5)] border-b-4 border-red-950 transition-all active:translate-y-1 animate-pulse hover:animate-none">
              ★ Chief's Office (ADMIN)
            </button>
          )}
          <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest border-l border-stone-800 pl-6">AGENT: {name.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};
