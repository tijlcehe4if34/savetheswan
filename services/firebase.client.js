import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmjck4Buf2a50RK9UkIW1I_jByEyp6f2A",
  authDomain: "swam-offical.firebaseapp.com",
  projectId: "swam-offical",
  storageBucket: "swam-offical.firebasestorage.app",
  messagingSenderId: "281951229381",
  appId: "1:281951229381:web:07d6b2adf7f5bea329e7ac"
};

// Initialize Firebase (Modular)
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Swan Ransom: Analytics not active.", e);
}

export { auth, db, analytics };
export default app;