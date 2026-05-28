import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyC7lrhVICmKOL3EhVkiaTkpEE1_VUDPS7k",
    authDomain: "levi-sensei.firebaseapp.com",
    databaseURL: "https://levi-sensei-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "levi-sensei",
    storageBucket: "levi-sensei.firebasestorage.app",
    messagingSenderId: "14792482782",
    appId: "1:14792482782:web:13ae42685a94b96460474f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and Auth
export const db = getDatabase(app);
export const auth = getAuth(app);
