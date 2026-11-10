import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, signInAnonymously, Auth, User } from 'firebase/auth';

const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env)
  ? (import.meta as any).env
  : (typeof process !== 'undefined' ? process.env : {}) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyC7lrhVICmKOL3EhVkiaTkpEE1_VUDPS7k",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "levi-sensei.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://levi-sensei-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "levi-sensei",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "levi-sensei.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "14792482782",
  appId: env.VITE_FIREBASE_APP_ID || "1:14792482782:web:13ae42685a94b96460474f"
};

// Initialize Firebase safely without duplicate initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Realtime Database instance
export const rtdb: Database = getDatabase(app);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// In-flight anonymous auth promise to prevent duplicate requests
let authPromise: Promise<User> | null = null;

/**
 * Ensures the client (Teacher Host or Student iPad) has a verified Firebase session.
 * Uses Firebase Anonymous Authentication so security rules can enforce auth.uid permissions
 * without requiring students or teachers to log in with individual Google accounts.
 */
export async function ensureAnonymousAuth(): Promise<string> {
  try {
    // 1. Wait for Firebase to finish restoring any existing session from IndexedDB first (0 network cost)
    await auth.authStateReady();
  } catch (e) {
    console.warn("authStateReady check warning:", e);
  }

  // 2. If IndexedDB already had a valid anonymous session, reuse its permanent UID immediately
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  // 3. Otherwise, request a new anonymous session from Firebase Auth
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((cred) => cred.user)
      .catch((err) => {
        authPromise = null;
        console.warn("Firebase Anonymous Auth warning:", err.message);
        return { uid: '' } as User;
      });
  }

  const user = await authPromise;
  authPromise = null;
  return user.uid;
}

export default app;
