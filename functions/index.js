const { onValueWritten } = require('firebase-functions/v2/database');
const { getDatabase } = require('firebase-admin/database');
const admin = require('firebase-admin');

admin.initializeApp();
const db = getDatabase();

exports.onGameComplete = onValueWritten({
    ref: 'trivia/gameState/status',
    instance: 'levi-sensei-default-rtdb'
}, async (event) => {
    const status = event.data.after.val();
    
    // Only run when the game officially ends
    if (status !== 'GAME_OVER') return null;

    console.log("Game Over detected. Processing rewards and analytics...");

    // 1. Fetch game data
    const playersSnap = await db.ref('trivia/players').once('value');
    const players = playersSnap.val() || {};
    
    const settingsSnap = await db.ref('trivia/gameState').once('value');
    const settings = settingsSnap.val() || {};

    const sortedPlayerIds = Object.keys(players).sort((a, b) => (players[b].score || 0) - (players[a].score || 0));
    const totalPlayers = sortedPlayerIds.length;

    if (totalPlayers === 0) {
        console.log("No players found. Exiting.");
        return null;
    }

    const updates = {};

    // 2. Process Player Rewards (Coins, XP, Match History)
    // We fetch current profiles to calculate the new balances
    const uidsToFetch = sortedPlayerIds.filter(uid => !uid.startsWith('player_'));
    const profileSnapshots = await Promise.all(uidsToFetch.map(uid => db.ref(`users/${uid}/profile`).once('value')));
    
    const profiles = {};
    uidsToFetch.forEach((uid, index) => {
        profiles[uid] = profileSnapshots[index].val() || { coins: 0, xp: 0 };
    });

    Object.keys(players).forEach(uid => {
        if (!uid.startsWith('player_')) {
            const pData = players[uid];
            const earnedPoints = pData.score || 0;
            const finalRank = sortedPlayerIds.indexOf(uid) + 1;
            
            if (earnedPoints > 0) {
                const currentCoins = profiles[uid]?.coins || 0;
                const currentXp = profiles[uid]?.xp || 0;
                
                updates[`users/${uid}/profile/coins`] = currentCoins + earnedPoints;
                updates[`users/${uid}/profile/xp`] = currentXp + earnedPoints;
                
                // Generate a unique push ID for match history
                const historyRef = db.ref(`users/${uid}/matchHistory`).push();
                updates[`users/${uid}/matchHistory/${historyRef.key}`] = {
                    timestamp: admin.database.ServerValue.TIMESTAMP,
                    score: earnedPoints,
                    rank: finalRank,
                    totalPlayers: totalPlayers,
                    accuracy: pData.questionsAnswered > 0 ? Math.round((pData.correctCount / pData.questionsAnswered) * 100) : 0,
                    fastestTime: pData.fastestTime || 999999,
                    avgTime: pData.avgTime || 0,
                    coinsEarned: earnedPoints,
                    gameMode: settings?.gameMode || 'individual'
                };
            }
        }
    });

    // 3. Execute all updates in a single atomic batch
    try {
        await db.ref().update(updates);
        console.log(`Successfully awarded coins/XP to ${uidsToFetch.length} authenticated players.`);
    } catch (e) {
        console.error("Failed to commit reward updates:", e);
    }

    return null;
});
