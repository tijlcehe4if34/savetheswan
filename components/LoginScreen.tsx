
import React, { useState } from 'react';
import { loginUser, registerUser, logUserLogin, getUserInfoByEmail, setForceLocalMode } from '../services/dataService';
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
  const [showOfflineOption, setShowOfflineOption] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowOfflineOption(false);

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
      } else if (error.message === 'auth/invalid-credential' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.message.includes('invalid-credential')) {
        setError("Access Denied. Incorrect key or unknown agent. If you are testing, try Offline Mode.");
        setShowOfflineOption(true);
      } else if (error.message.includes('auth/too-many-requests') || error.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Access blocked temporarily.");
        setShowOfflineOption(true);
      } else if (error.code === 'permission-denied') {
        setError("Cloud access denied. Try Offline Mode.");
        setShowOfflineOption(true);
      } else {
        setError("Bureau access denied: " + (error.message || "Unknown error"));
        setShowOfflineOption(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineSwitch = () => {
    setForceLocalMode(true);
    setError("System switched to Offline Mode. Please register or login locally.");
    setShowOfflineOption(false);
    if (!isRegistering && !email.includes('tijlvanherpen@icloud.com')) setIsRegistering(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black noir-vignette p-4 relative overflow-hidden">
      {/* Dynamic Noir Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533421644341-434816c95aa5?q=80&w=2069&auto=format&fit=crop')] bg-cover opacity-10 grayscale pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent opacity-60"></div>
      
      {/* Login Card */}
      <div className="z-10 bg-[#f4f1ea] dark:bg-[#1c1917] dark:border-stone-600 dark:text-stone-300 p-8 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-w-lg w-full transform -rotate-1 border-stone-400 border-[12px] text-stone-900 relative transition-colors duration-500">
        <div className="absolute -top-4 -left-4 w-12 h-12 bg-stone-900 border-4 border-stone-400 flex items-center justify-center text-white font-black text-2xl shadow-lg">?</div>
        
        <div className="mb-8 border-b-4 border-double border-stone-800 dark:border-stone-500 pb-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-stone-900 dark:text-stone-100 leading-none">
            {isRegistering ? (content.intake_heading || "Personnel Intake") : (content.login_heading || "Bureau Login")}
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest mt-3 italic text-stone-500 dark:text-stone-400">Official Department of Investigation Log</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 dark:bg-red-900/30 border-l-8 border-red-700 p-4 animate-fade-in flex flex-col gap-2">
            <div>
              <p className="text-[10px] font-black uppercase text-red-900 dark:text-red-400 mb-1">Alert:</p>
              <p className="text-xs font-bold text-red-800 dark:text-red-200">{error}</p>
            </div>
            {showOfflineOption && (
              <button 
                onClick={handleOfflineSwitch}
                className="mt-2 bg-red-800 text-white text-[10px] font-black uppercase py-2 px-4 hover:bg-red-700 transition-colors w-full"
              >
                ⚠ Bypass Security (Use Offline Mode)
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div className="grid grid-cols-1 gap-4 animate-fade-in">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400">Your Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all" placeholder="e.g. Detective Smith" required={isRegistering} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400">Station / Group Name</label>
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all" placeholder="e.g. Team Alpha" required={isRegistering} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400">Group Members</label>
                  <input type="text" value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all" placeholder="e.g. Joe, Jane, Bob" required={isRegistering} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400">Case File Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all" placeholder="detective@precinct.la" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400">Vault Key (Password)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all" placeholder="******" required />
            </div>
            {isRegistering && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400">Confirm Key</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all" placeholder="******" required />
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-stone-900 dark:bg-black text-white py-4 font-black uppercase text-lg tracking-widest hover:bg-stone-800 shadow-xl border-b-4 border-stone-600 dark:border-stone-700 active:translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : (isRegistering ? "Register Agent" : "Access Files")}
            </button>
            
            <button 
              type="button" 
              onClick={() => { setIsRegistering(!isRegistering); setError(null); setShowOfflineOption(false); }}
              className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
            >
              {isRegistering ? "Already have a badge? Login here." : "New Recruit? Register here."}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
