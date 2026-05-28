import { ref, update } from 'firebase/database';

export const ITEMS = {
  // Tier 1 (Common)
  '50_50': { id: '50_50', name: '50/50', icon: '✂️', type: 'buff' },
  'fog': { id: 'fog', name: 'Fog', icon: '🌫️', type: 'debuff' },
  'button_shuffle': { id: 'button_shuffle', name: 'Confusion', icon: '🔀', type: 'debuff' },
  
  // Tier 2 (Uncommon)
  'time_freeze': { id: 'time_freeze', name: 'Time Freeze', icon: '⏱️', type: 'buff' },
  'crystal_ball': { id: 'crystal_ball', name: 'Crystal Ball', icon: '🔮', type: 'buff' },
  'shrink_ray': { id: 'shrink_ray', name: 'Shrink Ray', icon: '🔍', type: 'debuff' },
  'shield': { id: 'shield', name: 'Shield', icon: '🛡️', type: 'buff' },

  // Tier 3 (Rare)
  '2x_multiplier': { id: '2x_multiplier', name: 'Double Points', icon: '⭐', type: 'buff' },
  'ink_splat': { id: 'ink_splat', name: 'Ink Splat', icon: '🦑', type: 'debuff' },
  'earthquake': { id: 'earthquake', name: 'Earthquake', icon: '🫨', type: 'debuff' },
};

export function rollForItem({ isCorrect, currentStreak, isFallingBehind, itemsMode }) {
  if (itemsMode === 'none' || !itemsMode) return null;
  if (!isCorrect) return null; 
  
  let validItems = Object.values(ITEMS);
  if (itemsMode === 'buffs') validItems = validItems.filter(i => i.type === 'buff');
  if (itemsMode === 'debuffs') validItems = validItems.filter(i => i.type === 'debuff');

  const tier1 = validItems.filter(i => ['50_50', 'fog', 'button_shuffle'].includes(i.id));
  const tier2 = validItems.filter(i => ['time_freeze', 'crystal_ball', 'shrink_ray', 'shield'].includes(i.id));
  const tier3 = validItems.filter(i => ['2x_multiplier', 'ink_splat', 'earthquake'].includes(i.id));

  // 1. Falling Behind (Rare)
  if (isFallingBehind) {
      if (Math.random() < 0.10) return getRandomItem(tier3.length > 0 ? tier3 : tier1);
      if (Math.random() < 0.30) return getRandomItem(tier2.length > 0 ? tier2 : tier1);
  }

  // 2. Streaking (Uncommon)
  if (currentStreak >= 3) {
      if (Math.random() < 0.20) return getRandomItem(tier2.length > 0 ? tier2 : tier1);
  }

  // 3. Regular correct answer (Common)
  if (Math.random() < 0.15) {
      return getRandomItem(tier1.length > 0 ? tier1 : tier2);
  }

  return null;
}

function getRandomItem(pool) {
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function executeItemAction(db, playerId, me, pushFn) {
  if (!me || !me.item) return;
  const item = me.item;

  const updates = {};
  updates[`trivia/players/${playerId}/item`] = null;

  // 2. Apply Buffs directly to the player
  if (item.type === 'buff') {
      if (item.id === '2x_multiplier') updates[`trivia/players/${playerId}/has2xItem`] = true;
      if (item.id === 'shield') updates[`trivia/players/${playerId}/hasShield`] = true;
      if (item.id === 'time_freeze') updates[`trivia/players/${playerId}/activeBuffs/time_freeze`] = true;
      if (item.id === '50_50') updates[`trivia/players/${playerId}/activeBuffs/50_50`] = true;
      if (item.id === 'crystal_ball') updates[`trivia/players/${playerId}/activeBuffs/crystal_ball`] = true;
  }
  
  // 3. Apply Debuffs to the global gameState
  if (item.type === 'debuff') {
      const effectRef = pushFn(ref(db, 'trivia/gameState/activeEffects'));
      updates[`trivia/gameState/activeEffects/${effectRef.key}`] = {
          type: item.id,
          sourcePlayerId: playerId,
          sourceTeamId: me.teamId || null,
          expiresAt: Date.now() + 3500 // 3.5 seconds of chaos
      };
  }

  await update(ref(db), updates);
}
