import React, { useState } from 'react';
import { loginUser, registerUser, logUserLogin, getUserInfoByEmail, loginWithGoogle, ADMIN_EMAIL } from '../services/dataService';
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const userData = await loginWithGoogle();
      const displayName = userData.name || (userData.email === ADMIN_EMAIL ? "Chief Commissioner" : "Detective");
      onLoginSuccess(userData.email, displayName);
    } catch (error: any) {
      console.error("Google Auth error caught:", error);
      const code = error.code || error.message;
      if (code === 'auth/popup-blocked') {
        setError("Sign-in popup blocked by the browser. Please allow popups for this site.");
      } else if (code === 'auth/popup-closed-by-user') {
        setError("Sign-in popup was closed before completing.");
      } else {
        setError("Google Auth failed: " + (error.message || "Unknown error"));
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
          <p className="font-extrabold uppercase text-[10px] tracking-widest text-amber-800 dark:text-amber-500 mb-1">📅 Event starts: Tue 16 June at 16:15</p>
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
                <label className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-500 block">Your Full Name (Team Captain)</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-2 border-stone-400 dark:border-stone-500 p-3 text-sm font-mono focus:border-stone-950 dark:focus:border-stone-200 outline-none shadow-sm transition-all placeholder:opacity-40" placeholder="e.g. Captain Smith" required={isRegistering} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400 block">Extra Team Members (Comma-separated)</label>
                <input type="text" value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-2 border-stone-400 dark:border-stone-500 p-3 text-sm font-mono focus:border-stone-950 dark:focus:border-stone-200 outline-none shadow-sm transition-all placeholder:opacity-40" placeholder="e.g. Joe, Jane, Bob (Max 4)" required={isRegistering} />
                <p className="text-[8px] text-amber-800 dark:text-amber-500 font-bold uppercase tracking-wide mt-1">* Limit: Max 5 total members in the squad (Captain + 4 members).</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400 block">Case File Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-2 border-stone-400 dark:border-stone-500 p-3 text-sm font-mono focus:border-stone-950 dark:focus:border-stone-200 outline-none shadow-sm transition-all placeholder:text-stone-400" placeholder="detective@precinct.la" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400 block">Vault Key (Password)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-2 border-stone-400 dark:border-stone-500 p-3 text-sm font-mono focus:border-stone-950 dark:focus:border-stone-200 outline-none shadow-sm transition-all placeholder:text-stone-400" placeholder="******" required />
            </div>
            {isRegistering && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-[10px] font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400 block">Confirm Key</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-2 border-stone-400 dark:border-stone-500 p-3 text-sm font-mono focus:border-stone-950 dark:focus:border-stone-200 outline-none shadow-sm transition-all placeholder:text-stone-400" placeholder="******" required />
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

            <div className="flex items-center my-1 select-none">
              <div className="grow border-t border-stone-400 dark:border-stone-700"></div>
              <span className="mx-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 font-mono">OR</span>
              <div className="grow border-t border-stone-400 dark:border-stone-700"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white dark:bg-stone-800 text-stone-900 dark:text-white py-3 border-2 border-stone-300 dark:border-stone-600 flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest hover:bg-stone-100 dark:hover:bg-stone-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.13-.21-.26-.35-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Sign-In with Google (One-Click)
            </button>
            
            <div className="mt-2 pt-4 border-t border-stone-300 dark:border-stone-700 text-center w-full">
              <button 
                type="button" 
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                className="w-full bg-amber-100/80 hover:bg-amber-200/90 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 py-3 px-4 border-2 border-dashed border-amber-500 dark:border-amber-700 font-mono font-bold uppercase text-[11px] tracking-widest transition-all shadow-sm"
              >
                {isRegistering ? "← Already have a badge? click to login" : "🕵️‍♂️ New Recruit? click here to register"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};