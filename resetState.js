import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update } from 'firebase/database';
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

async function run() {
    await signInAnonymously(auth);
    await update(ref(db, 'trivia/gameState'), { status: 'LOBBY', questionNumber: -1 });
    console.log("Reset state to LOBBY");
    process.exit(0);
}
run();
