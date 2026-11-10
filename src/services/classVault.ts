import { safeGet, safeSet, safeSubscribe } from './rtdbSafe';

export interface ClassVaultTierConfig {
  tier: number;
  targetEnergy: number;
  nameEn: string;
  nameJa: string;
  mascotEmoji: string;
  badge: string;
  accentGradient: string;
}

export const CLASS_VAULT_TIERS: ClassVaultTierConfig[] = [
  {
    tier: 1,
    targetEnergy: 2500,
    nameEn: 'Bronze Panda',
    nameJa: 'ブロンズ・パンダ',
    mascotEmoji: '🐼',
    badge: '🥉',
    accentGradient: 'from-amber-700 to-amber-900'
  },
  {
    tier: 2,
    targetEnergy: 5000,
    nameEn: 'Silver Eagle',
    nameJa: 'シルバー・イーグル',
    mascotEmoji: '🦅',
    badge: '🥈',
    accentGradient: 'from-slate-400 to-slate-600'
  },
  {
    tier: 3,
    targetEnergy: 10000,
    nameEn: 'Gold Lion',
    nameJa: 'ゴールド・ライオン',
    mascotEmoji: '🦁',
    badge: '🥇',
    accentGradient: 'from-yellow-400 via-amber-400 to-amber-500'
  },
  {
    tier: 4,
    targetEnergy: 20000,
    nameEn: 'Diamond Dragon',
    nameJa: 'ダイヤ・ドラゴン',
    mascotEmoji: '🐉',
    badge: '💎',
    accentGradient: 'from-cyan-400 to-blue-600'
  },
  {
    tier: 5,
    targetEnergy: 35000,
    nameEn: 'Cosmic Phoenix',
    nameJa: 'コズミック・フェニックス',
    mascotEmoji: '🔥',
    badge: '👑',
    accentGradient: 'from-purple-500 via-rose-500 to-amber-400'
  }
];

export interface ClassVaultState {
  schoolId: string;
  classId: string;
  totalEnergy: number;
  tier: number;
  unlockedTiers: number[];
  lastDepositPoints?: number;
  lastDepositAt?: number;
}

export function getTierForEnergy(energy: number): ClassVaultTierConfig {
  for (let i = CLASS_VAULT_TIERS.length - 1; i >= 0; i--) {
    if (energy >= CLASS_VAULT_TIERS[i].targetEnergy) {
      return CLASS_VAULT_TIERS[i];
    }
  }
  return CLASS_VAULT_TIERS[0];
}

export function getNextTierTarget(energy: number): { currentTier: ClassVaultTierConfig; nextTier: ClassVaultTierConfig | null; progressPct: number } {
  let currentTier = CLASS_VAULT_TIERS[0];
  let nextTier: ClassVaultTierConfig | null = CLASS_VAULT_TIERS[0];

  for (let i = 0; i < CLASS_VAULT_TIERS.length; i++) {
    if (energy < CLASS_VAULT_TIERS[i].targetEnergy) {
      nextTier = CLASS_VAULT_TIERS[i];
      currentTier = i > 0 ? CLASS_VAULT_TIERS[i - 1] : CLASS_VAULT_TIERS[0];
      break;
    }
  }

  if (energy >= CLASS_VAULT_TIERS[CLASS_VAULT_TIERS.length - 1].targetEnergy) {
    currentTier = CLASS_VAULT_TIERS[CLASS_VAULT_TIERS.length - 1];
    nextTier = null;
    return { currentTier, nextTier: null, progressPct: 100 };
  }

  const prevTarget = currentTier === nextTier ? 0 : currentTier.targetEnergy;
  const target = nextTier ? nextTier.targetEnergy : prevTarget;
  const range = Math.max(1, target - prevTarget);
  const currentInRange = Math.max(0, energy - prevTarget);
  const progressPct = Math.min(100, Math.round((currentInRange / range) * 100));

  return { currentTier, nextTier, progressPct };
}

export async function fetchClassVault(schoolId: string, classId: string): Promise<ClassVaultState> {
  const path = `schools/${schoolId}/classes/${classId}/classVault`;
  const existing = await safeGet<ClassVaultState>(path);
  if (existing) return existing;

  const initial: ClassVaultState = {
    schoolId,
    classId,
    totalEnergy: 0,
    tier: 1,
    unlockedTiers: [1],
    lastDepositPoints: 0,
    lastDepositAt: Date.now()
  };
  await safeSet(path, initial).catch(() => {});
  return initial;
}

export function subscribeClassVault(
  schoolId: string, 
  classId: string, 
  callback: (vault: ClassVaultState) => void
): () => void {
  const path = `schools/${schoolId}/classes/${classId}/classVault`;
  return safeSubscribe<ClassVaultState>(path, (data) => {
    if (data) {
      callback(data);
    } else {
      callback({
        schoolId,
        classId,
        totalEnergy: 0,
        tier: 1,
        unlockedTiers: [1]
      });
    }
  });
}

/**
 * Deposits 10% of game score into the shared class vault.
 * Returns information on whether a new tier was achieved for celebration fanfare!
 */
export async function depositClassEnergy(
  schoolId: string,
  classId: string,
  pointsScored: number
): Promise<{ previousTier: number; newTier: number; totalEnergy: number; didTierUp: boolean }> {
  if (pointsScored <= 0) {
    return { previousTier: 1, newTier: 1, totalEnergy: 0, didTierUp: false };
  }

  const path = `schools/${schoolId}/classes/${classId}/classVault`;
  const current = await fetchClassVault(schoolId, classId);
  const energyGained = Math.max(10, Math.floor(pointsScored * 0.10));
  const newTotalEnergy = (current.totalEnergy || 0) + energyGained;

  const currentTierConfig = getTierForEnergy(current.totalEnergy || 0);
  const newTierConfig = getTierForEnergy(newTotalEnergy);

  const didTierUp = newTierConfig.tier > currentTierConfig.tier;
  const unlockedTiers = Array.from(new Set([...(current.unlockedTiers || [1]), newTierConfig.tier]));

  const updated: ClassVaultState = {
    schoolId,
    classId,
    totalEnergy: newTotalEnergy,
    tier: newTierConfig.tier,
    unlockedTiers,
    lastDepositPoints: energyGained,
    lastDepositAt: Date.now()
  };

  await safeSet(path, updated);

  return {
    previousTier: currentTierConfig.tier,
    newTier: newTierConfig.tier,
    totalEnergy: newTotalEnergy,
    didTierUp
  };
}
