import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import fs from 'fs';

const firebaseJs = fs.readFileSync('c:/Users/levif/Documents/Borderlink/Github/levi-sensei/src/lib/firebase.js', 'utf8');
const configMatch = firebaseJs.match(/const firebaseConfig = ({[\s\S]*?});/);
const configObj = eval('(' + configMatch[1] + ')');

const app = initializeApp(configObj);
const db = getDatabase(app);

async function readLogs() {
    const snap = await get(ref(db, 'trivia/debug_logs'));
    if (snap.exists()) {
        const logs = snap.val();
        const sortedKeys = Object.keys(logs).sort();
        console.log(`Found ${sortedKeys.length} logs.`);
        
        const recentKeys = sortedKeys.slice(-5);
        recentKeys.forEach(key => {
            console.log("--------------------------------------------------");
            console.log(`Log ID: ${key}`);
            console.log(JSON.stringify(logs[key], null, 2));
        });
    } else {
        console.log("No debug logs found.");
    }
    process.exit(0);
}

readLogs().catch(console.error);
