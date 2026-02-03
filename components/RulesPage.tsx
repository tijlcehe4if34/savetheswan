
import React, { useState, useEffect } from 'react';
import { getGameRules, updateGameRules } from '../services/dataService';
import { TypewriterText } from './TypewriterText';

export const RulesPage: React.FC<{ isAdmin: boolean; onExit: () => void }> = ({ isAdmin, onExit }) => {
  const [rules, setRules] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const data = await getGameRules();
      setRules(data.content);
      setEditValue(data.content);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGameRules(editValue);
      setRules(editValue);
      setIsEditing(false);
    } catch (error) {
      alert("Failed to redact rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#12110f] p-4 md:p-12 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-[#f4f1ea] dark:bg-[#1c1917] dark:text-stone-300 shadow-[0_0_60px_rgba(0,0,0,0.8)] border-stone-400 dark:border-stone-600 border-[10px] p-8 md:p-16 relative transform rotate-1 transition-colors duration-500">
        {/* Aesthetic Paper Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] dark:bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start border-b-2 border-stone-800 dark:border-stone-500 pb-4 mb-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-stone-900 dark:text-stone-100">General Directives</h1>
              <p className="text-[10px] font-bold italic tracking-widest text-stone-600 dark:text-stone-400 uppercase">Division Order #402-A</p>
            </div>
            <button 
              onClick={onExit}
              className="text-2xl font-black hover:text-red-900 transition-colors"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-stone-300 dark:bg-stone-700 w-3/4"></div>
              <div className="h-4 bg-stone-300 dark:bg-stone-700 w-1/2"></div>
              <div className="h-4 bg-stone-300 dark:bg-stone-700 w-5/6"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <textarea 
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full h-64 bg-white/50 dark:bg-stone-900/50 border border-stone-400 dark:border-stone-600 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-800 dark:focus:ring-stone-400 text-stone-900 dark:text-stone-200"
                    placeholder="Enter directives..."
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-stone-900 dark:bg-stone-800 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black disabled:opacity-50"
                    >
                      {saving ? "SAVING..." : "COMMIT TO FILE"}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="text-xs font-bold uppercase tracking-widest border-b border-stone-800 dark:border-stone-400 hover:border-transparent transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-sm md:text-base text-stone-800 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                  <TypewriterText text={rules} speed={20} />
                </div>
              )}

              {isAdmin && !isEditing && (
                <div className="pt-8 border-t border-stone-300 dark:border-stone-600 mt-8">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="bg-stone-800 dark:bg-stone-700 text-stone-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-stone-900 dark:hover:bg-stone-600 transition-all shadow-md"
                  >
                    Redact Directives (Edit)
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-12 flex justify-between items-center opacity-30">
             <div className="w-16 h-16 border-4 border-stone-800 dark:border-stone-500 rounded-full flex items-center justify-center font-black text-2xl dark:text-stone-400">L</div>
             <div className="text-right">
                <p className="text-[8px] font-bold uppercase dark:text-stone-400">Authorized By:</p>
                <p className="text-sm font-serif italic font-bold dark:text-stone-400">The Bureau of Investigation</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
