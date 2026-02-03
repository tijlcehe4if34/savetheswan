import React, { useEffect, useState, useCallback } from 'react';
import { UserRecord, Clue, SiteContent, Report } from '../types';
import { getAllUserProfiles, addClue, updateSiteContent, getReports, markReportRead, getAllClues, deleteClue, isCloudActive } from '../services/dataService';

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
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Cloud Status
  const [cloudActive, setCloudActive] = useState(false);

  // Report Filtering & Selection State
  const [reportFilter, setReportFilter] = useState<'all' | 'new' | 'read'>('new');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

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

  // Status Helper
  const getStatus = (lastTime: string) => {
    if (!lastTime) return 'offline';
    try {
        const diff = new Date().getTime() - new Date(lastTime).getTime();
        if (diff < 60000 * 2) return 'active'; // < 2 mins
        if (diff < 60000 * 10) return 'idle'; // < 10 mins
        return 'offline';
    } catch(e) { return 'offline'; }
  };

  const fetchData = useCallback(async () => {
    try {
      const [pData, rData, cData] = await Promise.all([getAllUserProfiles(), getReports(), getAllClues()]);
      
      // Sort profiles: Active > Idle > Offline
      const sortedProfiles = pData.sort((a, b) => {
        const statusA = getStatus(a.lastActionTime);
        const statusB = getStatus(b.lastActionTime);
        const score = { 'active': 3, 'idle': 2, 'offline': 1 };
        // @ts-ignore
        return score[statusB] - score[statusA];
      });

      setProfiles(sortedProfiles);
      setReports(rData);
      setExistingClues(cData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Polling error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for data updates and listen for cross-tab storage events
  useEffect(() => {
    setCloudActive(isCloudActive());
    fetchData(); // Initial fetch
    
    // Polling fallback
    const intervalId = setInterval(fetchData, 3000); 

    // Instant update from other tabs
    const handleStorage = () => {
        fetchData();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('storage', handleStorage);
    };
  }, [fetchData]);

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
      fetchData();
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
          fetchData();
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

  const handleMarkAsRead = async (report: Report) => {
    await markReportRead(report.id);
    fetchData(); // Refresh list to update status
    
    // Update local selected report to reflect status change
    if (selectedReport && selectedReport.id === report.id) {
        setSelectedReport({...report, status: 'read'});
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'Recently';
    try {
      const d = new Date(val);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'N/A';
    }
  };

  // Filter Logic
  const filteredReports = reports.filter(r => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  const activeAgentCount = profiles.filter(p => getStatus(p.lastActionTime) === 'active').length;

  return (
    <div className="min-h-screen bg-[#1a1815] p-2 md:p-10 text-stone-900 font-mono transition-colors duration-500">
      {notification && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 border-4 transform -rotate-1 shadow-2xl ${notification.type === 'success' ? 'bg-green-100 border-green-800 text-green-900' : 'bg-red-100 border-red-800 text-red-900'}`}>
          <p className="font-black uppercase text-center">{notification.message}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto bg-[#e5e1d8] dark:bg-[#1c1917] dark:border-stone-600 dark:text-stone-300 shadow-2xl min-h-[85vh] p-4 md:p-12 border-4 border-[#c2bdb1] relative flex flex-col transition-colors duration-500">
        {/* Live Feed Indicator */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-1">
           <div className={`flex items-center gap-2 text-[9px] uppercase font-black tracking-widest ${cloudActive ? 'text-green-800 dark:text-green-400' : 'text-stone-500'}`}>
             <span className={`w-2 h-2 rounded-full ${cloudActive ? 'bg-green-600 animate-pulse shadow-[0_0_10px_#16a34a]' : 'bg-stone-500'}`}></span>
             {cloudActive ? 'CLOUD UPLINK ACTIVE' : 'OFFLINE ARCHIVE'}
           </div>
           <button onClick={fetchData} className="text-[9px] underline text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 font-bold uppercase">
              Last Sync: {lastRefreshed.toLocaleTimeString()} (Click to refresh)
           </button>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-stone-800 dark:border-stone-500 pb-6 mb-8 gap-4 mt-8 md:mt-0">
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase text-stone-900 dark:text-stone-100">Chief's Office</h1>
              <p className="text-xs uppercase font-bold text-stone-600 dark:text-stone-400">Admin Control Desk</p>
            </div>
            <button onClick={onExit} className="bg-stone-900 dark:bg-black text-white px-8 py-3 md:px-10 md:py-4 text-xs md:text-sm uppercase font-black hover:bg-red-900 shadow-xl border-b-4 border-black dark:border-stone-700 active:translate-y-1 transition-all">
              GO BACK TO CASE
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-b-2 border-stone-400 dark:border-stone-600 mb-8 bg-stone-300/30 dark:bg-stone-800/30 p-2">
            <button onClick={() => setActiveTab('agents')} className={`flex-1 min-w-[120px] px-4 py-3 text-xs font-black uppercase ${activeTab === 'agents' ? 'bg-stone-900 text-white' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}>
                1. Detectives {activeAgentCount > 0 && <span className="ml-2 bg-green-600 text-white px-2 py-0.5 rounded-full animate-pulse inline-block">{activeAgentCount} Online</span>}
            </button>
            <button onClick={() => setActiveTab('clues')} className={`flex-1 min-w-[120px] px-4 py-3 text-xs font-black uppercase ${activeTab === 'clues' ? 'bg-stone-900 text-white' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}>2. Manage Evidence</button>
            <button onClick={() => setActiveTab('content')} className={`flex-1 min-w-[120px] px-4 py-3 text-xs font-black uppercase ${activeTab === 'content' ? 'bg-stone-900 text-white' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}>3. Edit Website</button>
            <button onClick={() => setActiveTab('reports')} className={`flex-1 min-w-[120px] px-4 py-3 text-xs font-black uppercase ${activeTab === 'reports' ? 'bg-stone-900 text-white' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}>
              4. Help Inbox {reports.filter(r => r.status === 'new').length > 0 && <span className="ml-2 bg-red-600 text-white px-2 py-0.5 rounded-full animate-bounce inline-block">{reports.filter(r => r.status === 'new').length}</span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
            {activeTab === 'agents' && (
              <section className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                <h2 className="col-span-2 text-xl font-black uppercase mb-2 text-stone-900 dark:text-stone-200">
                    Personnel Roster ({profiles.length})
                </h2>
                {profiles.map((user) => {
                  const userClueCount = existingClues.filter(c => c.addedBy === user.email).length;
                  const userReportCount = reports.filter(r => r.userEmail === user.email).length;
                  const status = getStatus(user.lastActionTime);
                  
                  return (
                    <div key={user.email} className={`bg-[#f0ece3] dark:bg-stone-800 dark:border-stone-600 border-2 p-4 shadow-sm relative group transition-colors ${status === 'active' ? 'border-green-600 dark:border-green-800 order-first' : 'border-stone-400'}`}>
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                         <div className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 flex items-center gap-1 border ${
                             status === 'active' ? 'bg-green-100 text-green-900 border-green-300' : 
                             status === 'idle' ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : 
                             'bg-stone-200 text-stone-500 border-stone-300'
                         }`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${
                                 status === 'active' ? 'bg-green-600 animate-pulse' : 
                                 status === 'idle' ? 'bg-yellow-600' : 'bg-stone-400'
                             }`}></div>
                             {status === 'active' ? 'ONLINE' : status === 'idle' ? 'IDLE' : 'OFFLINE'}
                         </div>
                      </div>
                      
                      <div className="mb-3 mt-4">
                        <p className="font-black text-xl uppercase tracking-tight text-stone-900 dark:text-stone-100">{user.name}</p>
                        <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 italic font-serif">{user.email}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] bg-white/50 dark:bg-black/30 p-2 border border-stone-300 dark:border-stone-600">
                          <div>
                            <span className="font-black uppercase block text-stone-400 text-[8px]">Station Name</span>
                            <span className="font-bold text-stone-700 dark:text-stone-300">{user.groupName || "Unassigned"}</span>
                          </div>
                          <div>
                            <span className="font-black uppercase block text-stone-400 text-[8px]">Partner(s)</span>
                            <span className="font-bold text-stone-700 dark:text-stone-300">{user.groupMembers || "Solo Agent"}</span>
                          </div>
                      </div>

                      {/* LIVE STATUS SECTION */}
                      <div className="mt-3 pt-3 border-t border-stone-300 dark:border-stone-600">
                        <p className="text-[9px] font-black uppercase text-stone-500 mb-1 flex items-center gap-2">
                          Live Location
                        </p>
                        <div className={`text-stone-200 p-2 border-l-4 shadow-sm ${status === 'active' ? 'bg-stone-800 border-green-600' : 'bg-stone-700 border-stone-500 opacity-60'}`}>
                           <p className="text-[11px] font-bold font-mono">
                             "{user.lastAction || "Awaiting signal..."}"
                           </p>
                           <p className="text-[8px] text-stone-500 mt-1 text-right uppercase font-black">
                             Last Signal: {formatDate(user.lastActionTime)}
                           </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2 text-[9px] font-black uppercase">
                        <span className={`px-2 py-1 border ${userClueCount > 0 ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-stone-200 border-stone-300 text-stone-500'}`}>
                          Found {userClueCount} Clue{userClueCount !== 1 ? 's' : ''}
                        </span>
                        <span className={`px-2 py-1 border ${userReportCount > 0 ? 'bg-red-100 border-red-300 text-red-900' : 'bg-stone-200 border-stone-300 text-stone-500'}`}>
                          Sent {userReportCount} Report{userReportCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {profiles.length === 0 && (
                    <div className="col-span-2 text-center p-8 bg-stone-200 dark:bg-stone-800 border border-stone-400 dark:border-stone-600">
                        <p className="italic font-serif text-stone-500 dark:text-stone-400">No detectives found in the registry.</p>
                        <button onClick={fetchData} className="mt-2 text-xs font-black uppercase text-stone-500 underline">Check Again</button>
                    </div>
                )}
              </section>
            )}

            {activeTab === 'clues' && (
              <section className="animate-fade-in space-y-12">
                 <div className="max-w-2xl mx-auto bg-stone-200 dark:bg-stone-800 p-8 border-4 border-stone-300 dark:border-stone-600 shadow-xl transition-colors">
                  <h2 className="text-2xl font-black mb-6 uppercase text-center border-b-2 border-stone-800 dark:border-stone-500 pb-2 text-stone-900 dark:text-stone-100">Drop a new clue on the board</h2>
                  <form onSubmit={handleAddClue} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-600 dark:text-stone-400">Clue Name</label>
                          <input type="text" value={newClue.title} onChange={(e) => setNewClue({...newClue, title: e.target.value})} className="w-full p-3 border-2 border-stone-400 dark:border-stone-600 shadow-inner bg-white dark:bg-stone-900 dark:text-white" placeholder="E.g. A Dirty Glove" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-stone-600 dark:text-stone-400">Target Detective (Optional)</label>
                          <select value={newClue.targetPlayer} onChange={(e) => setNewClue({...newClue, targetPlayer: e.target.value})} className="w-full p-3 border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-white">
                            <option value="">Show to EVERYONE</option>
                            {profiles.map(p => <option key={p.email} value={p.email}>Only for {p.name}</option>)}
                          </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-stone-600 dark:text-stone-400">Picture URL</label>
                        <input type="text" value={newClue.imageUrl} onChange={(e) => setNewClue({...newClue, imageUrl: e.target.value})} className="w-full p-3 border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-white" placeholder="Link to clue image" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-stone-600 dark:text-stone-400">Where was it found?</label>
                        <input type="text" value={newClue.location} onChange={(e) => setNewClue({...newClue, location: e.target.value})} className="w-full p-3 border-2 border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-white" placeholder="E.g. Under the table" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-stone-600 dark:text-stone-400">Clue Description</label>
                        <textarea value={newClue.description} onChange={(e) => setNewClue({...newClue, description: e.target.value})} className="w-full p-3 border-2 border-stone-400 dark:border-stone-600 h-32 bg-white dark:bg-stone-900 dark:text-white" placeholder="Simple details for detectives..." required></textarea>
                    </div>
                    <button type="submit" disabled={submittingClue} className="w-full py-5 bg-stone-900 dark:bg-black text-white font-black uppercase text-lg shadow-2xl border-b-4 border-black dark:border-stone-700 active:translate-y-1 transition-all">
                        {submittingClue ? "UPLOADING..." : "POST CLUE TO BOARD"}
                    </button>
                  </form>
                </div>

                <div className="border-t-4 border-stone-800 dark:border-stone-600 pt-8">
                  <h2 className="text-xl font-black uppercase mb-6 text-center text-stone-900 dark:text-stone-100">Current Evidence File</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {existingClues.map(clue => (
                         <div key={clue.id} className="bg-white dark:bg-stone-800 p-4 border border-stone-400 dark:border-stone-600 flex justify-between gap-4 shadow-sm transition-colors">
                             <div className="flex gap-4">
                                 <img src={clue.imageUrl} className="w-16 h-16 object-cover bg-stone-300 border border-stone-300" alt="thumb"/>
                                 <div>
                                     <p className="font-black uppercase text-sm text-stone-900 dark:text-stone-100">{clue.title}</p>
                                     <p className="text-[10px] text-stone-500 dark:text-stone-400 mb-1">{clue.description.substring(0, 50)}...</p>
                                     <div className="flex flex-col gap-1">
                                        <p className="text-[8px] font-bold bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 inline-block px-1">
                                          Finder: {clue.addedBy === 'CHIEF' || !clue.addedBy ? '★ OFFICIAL' : clue.addedBy}
                                        </p>
                                        {clue.targetPlayer && (
                                            <p className="text-[8px] font-bold bg-yellow-100 border border-yellow-200 text-yellow-800 inline-block px-1">
                                              Target: {clue.targetPlayer}
                                            </p>
                                        )}
                                     </div>
                                 </div>
                             </div>
                             <button onClick={() => handleDeleteClue(clue.id)} className="text-red-800 dark:text-red-400 font-black text-xs hover:underline uppercase self-start">Delete</button>
                         </div>
                     ))}
                     {existingClues.length === 0 && <p className="text-center italic col-span-2 text-stone-500">No evidence collected yet.</p>}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'content' && (
              <section className="animate-fade-in space-y-10 pb-20">
                <div className="flex justify-between items-center bg-stone-300 dark:bg-stone-700 p-2 border border-stone-400 text-[10px] font-black uppercase tracking-widest px-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-yellow-600 animate-pulse' : 'bg-green-600'}`}></span>
                    {hasUnsavedChanges ? 'Draft unsaved' : 'All changes saved to record'}
                  </div>
                  {lastAutoSave && (
                    <div className="text-stone-500 dark:text-stone-300 italic">
                      Last update: {lastAutoSave.toLocaleTimeString()}
                    </div>
                  )}
                  {savingContent && <div className="text-red-700 dark:text-red-400 animate-bounce">Saving...</div>}
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
                  <div className="flex justify-between items-center mb-6 border-b-2 border-stone-800 dark:border-stone-500 pb-2">
                    <h2 className="text-xl font-black uppercase text-stone-900 dark:text-stone-100">Website Text Registry</h2>
                    <button onClick={() => handleUpdateContent(false)} disabled={savingContent} className={`px-10 py-4 font-black uppercase text-sm shadow-lg border-b-4 transition-all ${hasUnsavedChanges ? 'bg-green-700 text-white border-green-950 animate-pulse' : 'bg-stone-400 text-stone-700 border-stone-500 opacity-50'}`}>
                      {savingContent ? 'SAVING...' : 'SAVE ALL TEXT CHANGES'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(editableContent).filter(k => k !== 'intro_video_url').map((key) => (
                      <div key={key} className="space-y-1 bg-white/60 dark:bg-stone-800/50 p-5 border-2 border-stone-300 dark:border-stone-600 shadow-sm hover:border-stone-500 transition-colors">
                        <label className="text-[10px] font-black uppercase text-stone-500 dark:text-stone-400">{key.replace(/_/g, ' ')}</label>
                        <textarea value={editableContent[key]} onChange={(e) => handleContentChange(key, e.target.value)} className="w-full p-3 text-sm border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-200 resize-none h-28 focus:outline-none focus:border-stone-800 dark:focus:border-stone-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'reports' && (
              <section className="animate-fade-in space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-stone-800 dark:border-stone-500 pb-2 gap-4">
                    <h2 className="text-xl font-black uppercase text-stone-900 dark:text-stone-100">Detective Help Requests</h2>
                    <div className="flex gap-2 flex-wrap">
                        <button 
                            onClick={() => setReportFilter('new')} 
                            className={`px-3 py-1 text-[10px] uppercase font-black border border-stone-400 transition-all ${reportFilter === 'new' ? 'bg-red-800 text-white border-red-900' : 'bg-white hover:bg-stone-200 text-stone-900'}`}
                        >
                            Inbox (New)
                        </button>
                        <button 
                            onClick={() => setReportFilter('read')} 
                            className={`px-3 py-1 text-[10px] uppercase font-black border border-stone-400 transition-all ${reportFilter === 'read' ? 'bg-stone-800 text-white' : 'bg-white hover:bg-stone-200 text-stone-900'}`}
                        >
                            Archives (Read)
                        </button>
                        <button 
                            onClick={() => setReportFilter('all')} 
                            className={`px-3 py-1 text-[10px] uppercase font-black border border-stone-400 transition-all ${reportFilter === 'all' ? 'bg-stone-600 text-white' : 'bg-white hover:bg-stone-200 text-stone-900'}`}
                        >
                            All Files
                        </button>
                    </div>
                </div>

                {filteredReports.length === 0 ? (
                  <p className="italic bg-stone-100 dark:bg-stone-800 p-10 text-center border-2 border-dashed border-stone-400 text-stone-500 dark:text-stone-400">
                      {reportFilter === 'new' ? "No new signals received." : "Case file empty."}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredReports.map(report => (
                      <div 
                        key={report.id} 
                        onClick={() => setSelectedReport(report)}
                        className={`p-6 border-l-[8px] shadow-sm relative transition-all cursor-pointer group hover:translate-x-1 ${report.status === 'new' ? 'bg-white dark:bg-stone-800 border-red-600' : 'bg-stone-200 dark:bg-stone-800/50 border-stone-400 opacity-60 hover:opacity-100'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                           <div className="flex items-center gap-3">
                              {report.status === 'new' && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>}
                              <p className="font-black uppercase text-lg leading-none group-hover:underline decoration-red-900 underline-offset-4 text-stone-900 dark:text-stone-100">{report.userName}</p>
                           </div>
                           <p className="text-[9px] font-bold text-stone-500 uppercase">{formatDate(report.timestamp)}</p>
                        </div>
                        <p className="text-sm font-serif italic text-stone-700 dark:text-stone-300 truncate pr-10">"{report.message}"</p>
                        <p className="text-[9px] mt-2 font-bold uppercase text-stone-400">Click to open file</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-[#f4f1ea] dark:bg-[#1c1917] w-full max-w-2xl shadow-2xl border-[12px] border-stone-300 dark:border-stone-600 relative transform rotate-1 flex flex-col transition-colors">
              {/* Header */}
              <div className="bg-stone-200 dark:bg-stone-800 p-4 border-b-2 border-stone-400 dark:border-stone-500 flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                      <div className="w-3 h-3 bg-red-800 rounded-full"></div>
                      <h3 className="font-black uppercase text-xl tracking-tighter text-stone-900 dark:text-stone-100">Confidential Wire</h3>
                  </div>
                  <button onClick={() => setSelectedReport(null)} className="text-stone-500 hover:text-red-900 font-black text-2xl leading-none">×</button>
              </div>
              
              {/* Content */}
              <div className="p-8 md:p-12 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] dark:text-stone-300">
                  <div className="grid grid-cols-2 gap-6 mb-8 border-b-4 border-double border-stone-800 dark:border-stone-500 pb-6">
                      <div>
                          <p className="text-[9px] font-black uppercase text-stone-500 mb-1">From Agent</p>
                          <p className="text-xl font-bold uppercase">{selectedReport.userName}</p>
                          <p className="text-xs font-mono text-stone-600 dark:text-stone-400">{selectedReport.userEmail}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[9px] font-black uppercase text-stone-500 mb-1">Time Received</p>
                          <p className="text-lg font-mono font-bold">{formatDate(selectedReport.timestamp)}</p>
                          <div className={`inline-block mt-2 px-2 py-0.5 text-[9px] font-black uppercase border ${selectedReport.status === 'new' ? 'bg-red-100 text-red-900 border-red-300' : 'bg-stone-200 dark:bg-stone-800 text-stone-500 border-stone-300'}`}>
                             Status: {selectedReport.status}
                          </div>
                      </div>
                  </div>
                  
                  <div className="mb-8">
                      <p className="text-[9px] font-black uppercase text-stone-500 mb-2">Message Content</p>
                      <div className="font-serif text-lg leading-relaxed italic text-stone-900 dark:text-stone-200 bg-white/40 dark:bg-black/30 p-4 border border-stone-300 dark:border-stone-600 shadow-inner">
                          "{selectedReport.message}"
                      </div>
                  </div>

                  <div className="flex gap-4">
                      {selectedReport.status === 'new' ? (
                          <button 
                            onClick={() => handleMarkAsRead(selectedReport)} 
                            className="flex-1 bg-red-900 text-white py-4 font-black uppercase text-xs shadow-lg hover:bg-red-800 border-b-4 border-red-950 active:translate-y-1 transition-all"
                          >
                             Mark as Reviewed (Read)
                          </button>
                      ) : (
                         <div className="flex-1 bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 py-4 font-black uppercase text-xs text-center border-2 border-stone-300 dark:border-stone-600 cursor-not-allowed">
                             File Archived
                         </div>
                      )}
                      <button 
                        onClick={() => setSelectedReport(null)} 
                        className="px-8 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-200 py-4 font-black uppercase text-xs border-b-4 border-stone-300 dark:border-stone-900 hover:bg-stone-50 dark:hover:bg-stone-600"
                      >
                        Close File
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
