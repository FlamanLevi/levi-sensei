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

async function simulateHost() {
    await signInAnonymously(auth);
    
    // Send Question 1
    console.log("Sending Question 1...");
    await update(ref(db, 'trivia/gameState'), {
        status: 'LIVE',
        questionNumber: 0,
        options: [{id: 'Q1_A'}, {id: 'Q1_B'}],
        targetId: 'Q1_B'
    });
    
    await new Promise(r => setTimeout(r, 4000));
    
    // Send Question 2
    console.log("Sending Question 2...");
    await update(ref(db, 'trivia/gameState'), {
        status: 'LIVE',
        questionNumber: 1,
        options: [{id: 'Q2_A'}, {id: 'Q2_B'}],
        targetId: 'Q2_A'
    });

    await new Promise(r => setTimeout(r, 4000));

    // Send GAME_OVER
    console.log("Sending GAME_OVER...");
    await update(ref(db, 'trivia/gameState'), {
        status: 'GAME_OVER'
    });
    
    process.exit(0);
}

simulateHost().catch(console.error);
