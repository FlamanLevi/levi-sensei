import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update, onValue, off } from 'firebase/database';
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

async function runLoadTest() {
    console.log("Starting load test...");
    
    // Anonymously sign in so Realtime DB doesn't reject writes (if rules require auth)
    await signInAnonymously(auth);
    console.log("Signed in anonymously.");
    
    const players = Array.from({ length: 40 }, (_, i) => ({
        id: `player_load_${i + 1}`,
        nickname: `TestBot ${i + 1}`
    }));

    console.log("Joining 40 players to the lobby...");
    const updates = {};
    players.forEach(p => {
        updates[`trivia/players/${p.id}`] = {
            nickname: p.nickname,
            score: 0,
            currentStreak: 0,
            maxStreak: 0,
            fastestTime: 999999,
            correctCount: 0,
            lastActive: Date.now()
        };
    });
    
    await update(ref(db), updates);
    console.log("Players joined. Check the host screen!");

    let answeredQuestionsCount = 0;
    let currentQuestionNumber = -1;

    const gameStateRef = ref(db, 'trivia/gameState');
    
    onValue(gameStateRef, async (snap) => {
        const state = snap.val();
        if (!state) return;

        if (state.status === 'LIVE' && state.questionNumber !== currentQuestionNumber) {
            currentQuestionNumber = state.questionNumber;
            console.log(`\nQuestion ${currentQuestionNumber + 1} is LIVE! Answering...`);
            
            const responseUpdates = {};
            players.forEach(p => {
                // 70% chance to guess the correct targetId, 30% chance to guess a random distractor
                let chosenAnswer = state.targetId;
                if (Math.random() > 0.70 && options.length > 0) {
                   chosenAnswer = options[Math.floor(Math.random() * options.length)].id;
                }
                
                responseUpdates[`trivia/responses/${p.id}`] = {
                    answer: chosenAnswer || "A",
                    timeTaken: 800 + Math.floor(Math.random() * 7000)
                };
            });
            
            await update(ref(db), responseUpdates);
            console.log(`All 4 bots answered Question ${currentQuestionNumber + 1}`);
            
            answeredQuestionsCount++;
            if (answeredQuestionsCount >= 5) {
                console.log("\nFinished answering 5 questions. Waiting for game to complete...");
            }
        } else if (state.status === 'GAME_OVER') {
            console.log("Game over detected! Load test complete.");
            off(gameStateRef);
            process.exit(0);
        }
    });

    console.log("Waiting for game to start and status to become LIVE...");
}

runLoadTest().catch(console.error);
