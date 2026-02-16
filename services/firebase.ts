import { initializeApp, getApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIWPdOmUe_D234n0aB2aYDnnh8NO6yHBI",
  authDomain: "swannnn-e9b1b.firebaseapp.com",
  projectId: "swannnn-e9b1b",
  storageBucket: "swannnn-e9b1b.firebasestorage.app",
  messagingSenderId: "1031330466787",
  appId: "1:1031330466787:web:659f7141846fbab54baed6",
  measurementId: "G-N72PQM24G1"
};

// Initialize Firebase
// We use a check to avoid re-initialization errors in development
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
let analytics;

try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics might fail in some restricted environments or server-side renders
  console.warn("Swan Ransom: Analytics not active.", e);
}

export { auth, db, analytics };
export default app;