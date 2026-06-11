import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyC7lrhVICmKOL3EhVkiaTkpEE1_VUDPS7k",
    authDomain: "levi-sensei.firebaseapp.com",
    databaseURL: "https://levi-sensei-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "levi-sensei",
    storageBucket: "levi-sensei.firebasestorage.app",
    messagingSenderId: "14792482782",
    appId: "1:14792482782:web:13ae42685a94b96460474f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

async function checkState() {
    await signInAnonymously(auth);
    const snap = await get(ref(db, 'trivia/gameState'));
    console.log("Current State:", snap.val());
    
    // reset state to LOBBY
    await update(ref(db, 'trivia/gameState'), {
        status: 'LOBBY',
        questionNumber: 0
    });
    console.log("State updated to LOBBY");
    process.exit(0);
}

checkState().catch(console.error);
