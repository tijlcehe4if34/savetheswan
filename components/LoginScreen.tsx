import React, { useState } from 'react';
import { loginUser, registerUser, logUserLogin, getUserInfoByEmail, ADMIN_EMAIL } from '../services/dataService';
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

    if (isRegistering) {
      const parsedMembers = groupMembers ? groupMembers.split(/[,,;/\n]+/).map(m => m.trim()).filter(Boolean) : [];
      const totalCount = (name.trim() ? 1 : 0) + parsedMembers.length;
      if (totalCount > 5) {
        setError(`A team can only have a maximum of 5 people per room/station. Currently, you have specified ${totalCount} members (your name + ${parsedMembers.length} extra members). Please limit your squad to 5 people total.`);
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await registerUser(cleanEmail, password, name || "New Agent");
        const displayName = name || (cleanEmail === ADMIN_EMAIL ? "Chief Commissioner" : "New Agent");
        await logUserLogin({ 
          email: cleanEmail, 
          name: displayName, 
          groupName: name || "Captain", 
          groupMembers: groupMembers || "N/A" 
        });
        onLoginSuccess(cleanEmail, displayName);
      } else {
        await loginUser(cleanEmail, password);
        const existingInfo = await getUserInfoByEmail(cleanEmail);
        const displayName = existingInfo?.name || (cleanEmail === ADMIN_EMAIL ? "Chief Commissioner" : "Detective");
        
        // Log the activity even for existing users
        await logUserLogin({ 
          email: cleanEmail, 
          name: displayName, 
          groupName: existingInfo?.groupName || displayName || "Independent", 
          groupMembers: existingInfo?.groupMembers || "N/A" 
        });
        onLoginSuccess(cleanEmail, displayName);
      }
    } catch (error: any) {
      console.error("Auth error caught:", error);
      const code = error.code || error.message;
      
      if (code === 'auth/email-already-in-use') {
        setError("That email is already registered in our files.");
      } else if (code === 'auth/operation-not-allowed') {
        setError("Email/Password login is not enabled in Firebase Console. Please enable it in the Authentication tab of your Firebase project.");
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError("Access Denied. Incorrect email or password. If you haven't registered, click 'Register' below.");
      } else if (code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Access blocked temporarily.");
      } else if (code === 'permission-denied') {
        setError("Cloud access denied. You don't have permission for this file.");
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
      <div className="z-10 bg-[#f4f1ea] dark:bg-[#1c1917] dark:border-stone-600 dark:text-stone-300 p-8 md:p-12 shadow-[0_0_80px_rgba(0,0,0,0.9)] max-w-lg w-full transform -rotate-1 border-stone-400 border-[12px] text-stone-900 relative transition-colors duration-500">
        <div className="absolute -top-4 -left-4 w-12 h-12 bg-stone-900 border-4 border-stone-400 flex items-center justify-center text-white font-black text-2xl shadow-lg">?</div>
        
        <div className="mb-8 border-b-4 border-double border-stone-800 dark:border-stone-500 pb-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-stone-900 dark:text-stone-100 leading-none">
            {isRegistering ? (content.intake_heading || "Personnel Intake") : (content.login_heading || "Bureau Login")}
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest mt-3 italic text-stone-500 dark:text-stone-400">Official Department of Investigation Log</p>
        </div>

        {/* Event & Team Captain Instruction Notice */}
        <div className="mb-6 bg-amber-950/[0.04] dark:bg-amber-500/[0.03] border-2 border-stone-700 dark:border-stone-600 border-dashed p-4 font-mono text-stone-700 dark:text-stone-400 text-xs text-center">
          <p className="font-extrabold uppercase text-[10px] tracking-widest text-amber-800 dark:text-amber-500 mb-1">📅 Event starts: 11 June at 16:15</p>
          <p className="leading-tight text-[11px]">Only <strong className="underline dark:text-stone-200">one team captain</strong> should register the room/squad. Clues will be given as a folder once the investigation begins.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 dark:bg-red-900/30 border-l-8 border-red-700 p-4 animate-fade-in flex flex-col gap-2">
            <div>
              <p className="text-[10px] font-black uppercase text-red-900 dark:text-red-400 mb-1">Alert:</p>
              <p className="text-xs font-bold text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div className="grid grid-cols-1 gap-4 animate-fade-in">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-amber-800 dark:text-amber-500 font-bold">Your Full Name (Team Captain)</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all placeholder:opacity-50" placeholder="e.g. Captain Smith" required={isRegistering} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-stone-500 dark:text-stone-400">Extra Team Members (Comma-separated)</label>
                <input type="text" value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} className="w-full bg-stone-100/50 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-600 border-2 border-stone-300 p-3 text-sm font-mono focus:border-stone-800 dark:focus:border-stone-400 outline-none transition-all placeholder:opacity-50" placeholder="e.g. Joe, Jane, Bob (Max 4)" required={isRegistering} />
                <p className="text-[8px] text-amber-800 dark:text-amber-500 font-bold uppercase tracking-wide mt-1">* Limit: Max 5 total members in the squad (Captain + 4 members).</p>
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
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
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