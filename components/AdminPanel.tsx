
import React, { useEffect, useState } from 'react';
import { UserRecord, Clue, SiteContent, Report } from '../types';
import { getAllUserProfiles, addClue, updateSiteContent, getReports, markReportRead, getAllClues, deleteClue } from '../services/dataService';

interface AdminPanelProps {
  onExit: () => void;
  content: SiteContent;
  onContentUpdate: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit, content, onContentUpdate }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [existingClues, setExistingClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'clues' | 'content' | 'reports'>('agents');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [editableContent, setEditableContent] = useState<SiteContent>(content);
  const [savingContent, setSavingContent] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  const [newClue, setNewClue] = useState({
    title: '',
    description: '',
    imageUrl: '',
    location: '',
    dateFound: new Date().toISOString().split('T')[0],
    targetPlayer: ''
  });
  const [submittingClue, setSubmittingClue] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pData, rData, cData] = await Promise.all([getAllUserProfiles(), getReports(), getAllClues()]);
        setProfiles(pData);
        setReports(rData);
        setExistingClues(cData);
      } catch (err) {
        // Errors handled by global listener
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [activeTab]);

  useEffect(() => {
    if (content) {
      setEditableContent(content);
      setHasUnsavedChanges(false);
    }
  }, [content]);

  // Auto-save logic
  useEffect(() => {
    if (!hasUnsavedChanges || activeTab !== 'content') return;

    const timer = setTimeout(() => {
      handleUpdateContent(true); 
    }, 15000);

    return () => clearTimeout(timer);
  }, [editableContent, hasUnsavedChanges, activeTab]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddClue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClue(true);
    try {
      await addClue({ ...newClue, addedBy: 'CHIEF' });
      showNotification("Clue successfully added to the board.", "success");
      setNewClue({
        title: '', description: '', imageUrl: '', location: '',
        dateFound: new Date().toISOString().split('T')[0],
        targetPlayer: ''
      });
      // Refresh list
      const cData = await getAllClues();
      setExistingClues(cData);
      onContentUpdate();
    } catch (err) {
      showNotification("Could not add clue.", "error");
    } finally {
      setSubmittingClue(false);
    }
  };

  const handleDeleteClue = async (id: string) => {
      if(!window.confirm("Are you sure you want to delete this evidence?")) return;
      try {
          await deleteClue(id);
          const cData = await getAllClues();
          setExistingClues(cData);
          showNotification("Evidence removed.", "success");
      } catch (e) {
          showNotification("Failed to delete.", "error");
      }
  };

  const handleContentChange = (key: string, value: string) => {
    setEditableContent(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateContent = async (isSilent: boolean = false) => {
    if (!hasUnsavedChanges && isSilent) return;
    
    setSavingContent(true);
    try {
      await updateSiteContent(editableContent);
      await onContentUpdate();
      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
      if (!isSilent) {
        showNotification("Website changes saved!", "success");
      }
    } catch (err) {
      if (!isSilent) {
        showNotification("Error saving. Check permissions.", "error");
      }
    } finally {
      setSavingContent(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'Recently';
    try {
      const d = new Date(val);
      return d.toLocaleString();
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1815] p-4 md:p-10 text-stone-900 font-mono">
      {notification && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 border-4 transform -rotate-1 shadow-2xl ${notification.type === 'success' ? 'bg-green-100 border-green-800 text-green-900' : 'bg-red-100 border-red-800 text-red-900'}`}>
          <p className="font-black uppercase text-center">{notification.message}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-[#e5e1d8] shadow-2xl min-h-[85vh] p-6 md:p-12 border-4 border-[#c2bdb1] relative flex flex-col">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-stone-800 pb-6 mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-black uppercase">Chief's Office</h1>
              <p className="text-xs uppercase font-bold text-stone-600">Admin Control Desk</p>
            </div>
            <button onClick={onExit} className="bg-stone-900 text-white px-10 py-4 text-sm uppercase font-black hover:bg-red-900 shadow-xl border-b-4 border-black active:translate-y-1 transition-all">
              GO BACK TO CASE
            </button>
          </div>

          <div className="flex border-b-2 border-stone-400 mb-8 overflow-x-auto bg-stone-300/30">
            <button onClick={() => setActiveTab('agents')} className={`px-6 py-4 text-xs font-black uppercase ${activeTab === 'agents' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}>1. Detectives</button>
            <button onClick={() => setActiveTab('clues')} className={`px-6 py-4 text-xs font-black uppercase ${activeTab === 'clues' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}>2. Manage Evidence</button>
            <button onClick={() => setActiveTab('content')} className={`px-6 py-4 text-xs font-black uppercase ${activeTab === 'content' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}>3. Edit Website</button>
            <button onClick={() => setActiveTab('reports')} className={`px-6 py-4 text-xs font-black uppercase ${activeTab === 'reports' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}>
              4. Help Requests {reports.filter(r => r.status === 'new').length > 0 && <span className="ml-2 bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">{reports.filter(r => r.status === 'new').length}</span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
            {activeTab === 'agents' && (
              <section className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                <h2 className="col-span-2 text-xl font-black uppercase mb-2">People playing the game:</h2>
                {profiles.map((user) => (
                  <div key={user.email} className="bg-[#f0ece3] border-2 border-stone-400 p-4 shadow-sm">
                    <p className="font-black text-lg uppercase">{user.name}</p>
                    <p className="text-[10px] font-bold text-stone-500 italic">{user.email}</p>
                    <p className="text-xs mt-3 font-bold uppercase bg-stone-200 inline-block px-2">Location: {user.groupName || "Unknown"}</p>
                  </div>
                ))}
                {profiles.length === 0 && <p className="italic">No detectives have signed in yet.</p>}
              </section>
            )}

            {activeTab === 'clues' && (
              <section className="animate-fade-in space-y-12">
                 <div className="max-w-2xl mx-auto bg-stone-200 p-8 border-4 border-stone-300 shadow-xl">
                  <h2 className="text-2xl font-black mb-6 uppercase text-center border-b-2 border-stone-800 pb-2">Drop a new clue on the board</h2>
                  <form onSubmit={handleAddClue} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase">Clue Name</label>
                          <input type="text" value={newClue.title} onChange={(e) => setNewClue({...newClue, title: e.target.value})} className="w-full p-3 border-2 border-stone-400 shadow-inner" placeholder="E.g. A Dirty Glove" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase">Target Detective (Optional)</label>
                          <select value={newClue.targetPlayer} onChange={(e) => setNewClue({...newClue, targetPlayer: e.target.value})} className="w-full p-3 border-2 border-stone-400 bg-white">
                            <option value="">Show to EVERYONE</option>
                            {profiles.map(p => <option key={p.email} value={p.email}>Only for {p.name}</option>)}
                          </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase">Picture URL</label>
                        <input type="text" value={newClue.imageUrl} onChange={(e) => setNewClue({...newClue, imageUrl: e.target.value})} className="w-full p-3 border-2 border-stone-400" placeholder="Link to clue image" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase">Where was it found?</label>
                        <input type="text" value={newClue.location} onChange={(e) => setNewClue({...newClue, location: e.target.value})} className="w-full p-3 border-2 border-stone-400" placeholder="E.g. Under the table" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase">Clue Description</label>
                        <textarea value={newClue.description} onChange={(e) => setNewClue({...newClue, description: e.target.value})} className="w-full p-3 border-2 border-stone-400 h-32" placeholder="Simple details for detectives..." required></textarea>
                    </div>
                    <button type="submit" disabled={submittingClue} className="w-full py-5 bg-stone-900 text-white font-black uppercase text-lg shadow-2xl border-b-4 border-black active:translate-y-1 transition-all">
                        {submittingClue ? "UPLOADING..." : "POST CLUE TO BOARD"}
                    </button>
                  </form>
                </div>

                <div className="border-t-4 border-stone-800 pt-8">
                  <h2 className="text-xl font-black uppercase mb-6 text-center">Current Evidence File</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {existingClues.map(clue => (
                         <div key={clue.id} className="bg-white p-4 border border-stone-400 flex justify-between gap-4 shadow-sm">
                             <div className="flex gap-4">
                                 <img src={clue.imageUrl} className="w-16 h-16 object-cover bg-stone-300" alt="thumb"/>
                                 <div>
                                     <p className="font-black uppercase text-sm">{clue.title}</p>
                                     <p className="text-[10px] text-stone-500">{clue.description.substring(0, 50)}...</p>
                                     <p className="text-[9px] font-bold bg-stone-200 inline-block px-1 mt-1">
                                       {clue.targetPlayer ? `Target: ${clue.targetPlayer}` : 'GLOBAL'}
                                     </p>
                                 </div>
                             </div>
                             <button onClick={() => handleDeleteClue(clue.id)} className="text-red-800 font-black text-xs hover:underline uppercase">Delete</button>
                         </div>
                     ))}
                     {existingClues.length === 0 && <p className="text-center italic col-span-2">No evidence collected yet.</p>}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'content' && (
              <section className="animate-fade-in space-y-10 pb-20">
                <div className="flex justify-between items-center bg-stone-300 p-2 border border-stone-400 text-[10px] font-black uppercase tracking-widest px-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-yellow-600 animate-pulse' : 'bg-green-600'}`}></span>
                    {hasUnsavedChanges ? 'Draft unsaved' : 'All changes saved to record'}
                  </div>
                  {lastAutoSave && (
                    <div className="text-stone-500 italic">
                      Last update: {lastAutoSave.toLocaleTimeString()}
                    </div>
                  )}
                  {savingContent && <div className="text-red-700 animate-bounce">Saving...</div>}
                </div>

                <div className="bg-stone-800 text-stone-100 p-8 border-4 border-stone-600 shadow-2xl transform -rotate-1">
                   <h2 className="text-2xl font-black uppercase mb-4 border-b border-stone-500 pb-2 flex items-center gap-4">
                     <span className="text-3xl">🎬</span> CINEMA CENTER: CHANGE INTRO VIDEO
                   </h2>
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-stone-400">Video URL (Must be a direct MP4 link)</label>
                        <div className="flex flex-col md:flex-row gap-4">
                          <input 
                            type="text" 
                            value={editableContent.intro_video_url || ''} 
                            onChange={(e) => handleContentChange('intro_video_url', e.target.value)} 
                            className="flex-1 p-4 bg-stone-900 border-2 border-stone-500 text-white font-mono text-sm focus:border-red-500 outline-none" 
                            placeholder="https://example.com/video.mp4" 
                          />
                          <button 
                            onClick={() => handleUpdateContent(false)}
                            disabled={savingContent}
                            className="bg-red-700 hover:bg-red-600 text-white px-10 py-4 font-black uppercase text-sm shadow-xl border-b-4 border-red-950 transition-all active:translate-y-1"
                          >
                            {savingContent ? "UPDATING..." : "ACTIVATE NEW MOVIE"}
                          </button>
                        </div>
                      </div>
                   </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-6 border-b-2 border-stone-800 pb-2">
                    <h2 className="text-xl font-black uppercase">Website Text Registry</h2>
                    <button onClick={() => handleUpdateContent(false)} disabled={savingContent} className={`px-10 py-4 font-black uppercase text-sm shadow-lg border-b-4 transition-all ${hasUnsavedChanges ? 'bg-green-700 text-white border-green-950 animate-pulse' : 'bg-stone-400 text-stone-700 border-stone-500 opacity-50'}`}>
                      {savingContent ? 'SAVING...' : 'SAVE ALL TEXT CHANGES'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(editableContent).filter(k => k !== 'intro_video_url').map((key) => (
                      <div key={key} className="space-y-1 bg-white/60 p-5 border-2 border-stone-300 shadow-sm hover:border-stone-500 transition-colors">
                        <label className="text-[10px] font-black uppercase text-stone-500">{key.replace(/_/g, ' ')}</label>
                        <textarea value={editableContent[key]} onChange={(e) => handleContentChange(key, e.target.value)} className="w-full p-3 text-sm border border-stone-300 resize-none h-28 focus:outline-none focus:border-stone-800" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'reports' && (
              <section className="animate-fade-in space-y-6">
                <h2 className="text-xl font-black uppercase border-b-2 border-stone-800 pb-2">Detective Help Requests</h2>
                {reports.length === 0 ? <p className="italic bg-stone-100 p-10 text-center border-2 border-dashed border-stone-400">The city is quiet. No help needed right now.</p> : reports.map(report => (
                  <div key={report.id} className={`p-8 border-l-[12px] shadow-xl relative transition-all ${report.status === 'new' ? 'bg-white border-red-600' : 'bg-stone-200 border-stone-400 opacity-70'}`}>
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <p className="font-black uppercase text-2xl leading-none">{report.userName}</p>
                          <p className="text-[10px] font-bold text-stone-500 mt-1 uppercase">Detective ID: {report.userEmail}</p>
                       </div>
                       {report.status === 'new' && (
                         <button onClick={() => markReportRead(report.id)} className="bg-stone-900 text-white px-6 py-2 text-[10px] uppercase font-black hover:bg-black shadow-lg">Mark as Read</button>
                       )}
                    </div>
                    <div className="bg-stone-100 p-6 border-2 border-stone-300 italic text-stone-800 font-serif leading-relaxed text-lg shadow-inner">
                      "{report.message}"
                    </div>
                    <p className="text-[9px] mt-4 font-bold uppercase text-stone-400">Signal Received: {formatDate(report.timestamp)}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
