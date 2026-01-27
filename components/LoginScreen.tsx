
import React, { useState } from 'react';
import { loginUser, registerUser, logUserLogin, getUserInfoByEmail } from '../services/dataService';
import { SiteContent } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (email: string, name: string) => void;
  content: SiteContent;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, content }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.toLowerCase().trim();

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match, detective.");
      return;
    }

    if (password.length < 6) {
      setError("Password is too short. Minimum 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await registerUser(cleanEmail, password, name || "New Agent");
        const displayName = name || (cleanEmail === 'tijlvanherpen@icloud.com' ? "Chief Commissioner" : "New Agent");
        await logUserLogin({ 
          email: cleanEmail, 
          name: displayName, 
          groupName: groupName || "Independent", 
          groupMembers: groupMembers || "N/A" 
        });
        onLoginSuccess(cleanEmail, displayName);
      } else {
        await loginUser(cleanEmail, password);
        const existingInfo = await getUserInfoByEmail(cleanEmail);
        const displayName = existingInfo?.name || (cleanEmail === 'tijlvanherpen@icloud.com' ? "Chief Commissioner" : "Detective");
        
        // Log the activity even for existing users
        await logUserLogin({ 
          email: cleanEmail, 
          name: displayName, 
          groupName: existingInfo?.groupName || "Independent", 
          groupMembers: existingInfo?.groupMembers || "N/A" 
        });
        onLoginSuccess(cleanEmail, displayName);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message === 'auth/email-already-in-use') {
        setError("That email is already registered in our files.");
      } else if (error.message === 'auth/invalid-credential') {
        setError("Incorrect credentials. Check your file number and key.");
      } else {
        setError("Bureau access denied: " + (error.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black noir-vignette p-4 relative overflow-hidden">
      {/* Dynamic Noir Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533421644341-434816c95aa5?q=80&w=2069&auto=format&fit=crop')] bg-cover opacity-10 grayscale pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent opacity-60"></div>
      
      {/* Login Card */}
      <div className="z-10 bg-[#f4f1ea] p-8 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-w-lg w-full transform -rotate-1 border-stone-400 border-[12px] text-stone-900 relative">
        <div className="absolute -top-4 -left-4 w-12 h-12 bg-stone-900 border-4 border-stone-400 flex items-center justify-center text-white font-black text-2xl shadow-lg">?</div>
        
        <div className="mb-8 border-b-4 border-double border-stone-800 pb-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-stone-900 leading-none">
            {isRegistering ? (content.intake_heading || "Personnel Intake") : (content.login_heading || "Bureau Login")}
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest mt-3 italic text-stone-500">Official Department of Investigation Log</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border-l-8 border-red-700 p-4 animate-fade-in">
            <p className="text-[10px] font-black uppercase text-red-900 mb-1">Alert:</p>
            <p className="text-xs font-bold text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div className="grid grid-cols-1 gap-4 animate-fade-in">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-stone-500">Your Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-100/50 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 outline-none transition-all" placeholder="e.g. Detective Smith" required={isRegistering} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-stone-500">Station / Group Name</label>
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-stone-100/50 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 outline-none transition-all" placeholder="e.g. Team Alpha" required={isRegistering} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-stone-500">Group Members</label>
                  <input type="text" value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} className="w-full bg-stone-100/50 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 outline-none transition-all" placeholder="e.g. Joe, Jane, Bob" required={isRegistering} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-stone-500">Case File Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-stone-100/50 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 outline-none transition-all" placeholder="detective@precinct.la" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-stone-500">Vault Key (Password)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-stone-100/50 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 outline-none transition-all" placeholder="••••••••" required />
            </div>
            {isRegistering && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-[9px] font-black uppercase text-stone-500">Confirm Key</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-stone-100/50 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 outline-none transition-all" placeholder="••••••••" required={isRegistering} />
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className={`w-full py-5 bg-stone-900 text-stone-100 hover:bg-black transition-all uppercase tracking-widest font-black text-sm shadow-2xl border-b-4 border-black active:translate-y-1 ${loading ? 'opacity-70 cursor-wait' : ''}`}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                VERIFYING...
              </span>
            ) : isRegistering ? "CREATE PERMANENT RECORD" : "ENTER PRECINCT"}
          </button>
          
          <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(null); }} className="w-full text-center text-[10px] uppercase font-black text-stone-500 hover:text-stone-900 transition-colors pt-2 underline underline-offset-4 decoration-stone-300">
            {isRegistering ? "Wait, I already have a record" : "Register as New Personnel"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-300/50 flex justify-between items-center opacity-40 grayscale">
          <div className="text-[7px] uppercase font-black leading-tight text-stone-600">
            Department of Public Safety<br/>LA Division // 1947
          </div>
          <div className="w-10 h-10 border-2 border-stone-800 rounded-full flex items-center justify-center font-black text-xs">LA</div>
        </div>
      </div>
    </div>
  );
};
