
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";

// --- CONFIGURATION FOR CLOUD SYNC ---
const firebaseConfig = {
  apiKey: "AIzaSyBIWPdOmUe_D234n0aB2aYDnnh8NO6yHBI",
  authDomain: "swannnn-e9b1b.firebaseapp.com",
  projectId: "swannnn-e9b1b",
  storageBucket: "swannnn-e9b1b.firebasestorage.app",
  messagingSenderId: "1031330466787",
  appId: "1:1031330466787:web:659f7141846fbab54baed6",
  measurementId: "G-N72PQM24G1"
};

let app;
let auth: any;
let db: any;

try {
  // Only initialize if we haven't already to handle hot-reloads gracefully
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Swan Ransom: Cloud Uplink Configured");
} catch (e) {
  console.warn("Swan Ransom: Cloud Uplink Failed. System running in Local/Offline Mode.", e);
}

export { auth, db };
export default app;
