export type ShopItemCategory = 'aura' | 'avatar' | 'kart' | 'title';

export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  name: string;
  jaName: string;
  icon: string; // Emoji or representation
  price: number; // In Gold
  requiredLevel: number;
  description: string;
  jaDescription: string;
  color: string; // Tailwind gradient
  auraStyles?: {
    ringClass: string;
    shadowClass: string;
    particleEmoji?: string;
    badgeStyle?: string;
  };
  extraPayload?: string; // e.g. avatar emoji or kartThemeId
}

export const STARTER_KART_THEMES = [
  'RED_COMET',
  'BLUE_LIGHTNING',
  'FOREST_MACH',
  'THUNDER_BEE',
  'SILVER_ARROW'
];

export const SHOP_ITEMS: ShopItem[] = [
  // ==========================================
  // 1. AVATAR AURAS & GLOWING FRAMES
  // ==========================================
  {
    id: 'aura_gold',
    category: 'aura',
    name: 'Golden Sparkle',
    jaName: 'きらめくゴールド',
    icon: '🌟',
    price: 250,
    requiredLevel: 1,
    description: 'A shimmering ring of radiant golden sparkles around your avatar.',
    jaDescription: '黄金のキラキラ粒子がアバターを包み込む人気オーラ！',
    color: 'from-amber-400 via-yellow-300 to-amber-500',
    auraStyles: {
      ringClass: 'ring-3 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
      shadowClass: 'shadow-[0_0_15px_rgba(251,191,36,0.85)] animate-pulse',
      particleEmoji: '✨',
      badgeStyle: 'bg-amber-400 text-amber-950'
    }
  },
  {
    id: 'aura_fire',
    category: 'aura',
    name: 'Blazing Flame',
    jaName: '紅蓮の炎',
    icon: '🔥',
    price: 400,
    requiredLevel: 2,
    description: 'Fierce roaring flames surrounding your avatar.',
    jaDescription: '燃え盛る情熱の炎！誰にも止められない絶好調オーラ！',
    color: 'from-red-600 via-orange-500 to-amber-500',
    auraStyles: {
      ringClass: 'ring-3 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
      shadowClass: 'shadow-[0_0_18px_rgba(239,68,68,0.9)] animate-pulse',
      particleEmoji: '🔥',
      badgeStyle: 'bg-red-500 text-white'
    }
  },
  {
    id: 'aura_neon',
    category: 'aura',
    name: 'Cyber Neon',
    jaName: 'サイバーネオン',
    icon: '⚡',
    price: 350,
    requiredLevel: 2,
    description: 'Electric laser cyan pulse ring from the future.',
    jaDescription: '近未来のレーザービーム！電光石火のサイバーリング！',
    color: 'from-cyan-400 via-blue-500 to-indigo-600',
    auraStyles: {
      ringClass: 'ring-3 ring-cyan-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
      shadowClass: 'shadow-[0_0_16px_rgba(6,182,212,0.9)]',
      particleEmoji: '⚡',
      badgeStyle: 'bg-cyan-400 text-slate-950'
    }
  },
  {
    id: 'aura_sakura',
    category: 'aura',
    name: 'Sakura Petals',
    jaName: '舞い散る桜',
    icon: '🌸',
    price: 300,
    requiredLevel: 1,
    description: 'Graceful pink sakura blossom petals dancing around your icon.',
    jaDescription: '春の風に舞う優雅な桜の花びら！華やかでかわいいオーラ！',
    color: 'from-pink-400 via-rose-300 to-pink-500',
    auraStyles: {
      ringClass: 'ring-3 ring-pink-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
      shadowClass: 'shadow-[0_0_15px_rgba(244,114,182,0.8)]',
      particleEmoji: '🌸',
      badgeStyle: 'bg-pink-400 text-pink-950'
    }
  },
  {
    id: 'aura_frost',
    category: 'aura',
    name: 'Glacier Ice',
    jaName: '氷の結晶',
    icon: '❄️',
    price: 350,
    requiredLevel: 2,
    description: 'Crystalline frozen diamond dust that chills the competition.',
    jaDescription: 'キラリと輝く絶対零度の氷！クールで洗練されたフロストリング！',
    color: 'from-sky-300 via-cyan-200 to-blue-400',
    auraStyles: {
      ringClass: 'ring-3 ring-sky-300 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
      shadowClass: 'shadow-[0_0_16px_rgba(186,230,253,0.9)]',
      particleEmoji: '❄️',
      badgeStyle: 'bg-sky-300 text-sky-950'
    }
  },
  {
    id: 'aura_rainbow',
    category: 'aura',
    name: 'Rainbow Prism',
    jaName: '虹色プリズム',
    icon: '🌈',
    price: 600,
    requiredLevel: 4,
    description: 'A dazzling rainbow halo reflecting the full color spectrum.',
    jaDescription: '七色に輝く奇跡のレインボー！クラスみんなの視線を釘づけ！',
    color: 'from-pink-500 via-amber-400 to-cyan-400',
    auraStyles: {
      ringClass: 'ring-3 ring-purple-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
      shadowClass: 'shadow-[0_0_20px_rgba(168,85,247,0.9)] animate-pulse',
      particleEmoji: '🌈',
      badgeStyle: 'bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 text-slate-950 font-black'
    }
  },
  {
    id: 'aura_royal',
    category: 'aura',
    name: 'Royal Crown',
    jaName: '王冠クラウン',
    icon: '👑',
    price: 1000,
    requiredLevel: 6,
    description: 'Supreme golden crown of royalty for high-achieving classroom legends.',
    jaDescription: '頂点を極めた者だけに許される至高の王冠フレーム！',
    color: 'from-amber-400 via-yellow-200 to-purple-600',
    auraStyles: {
      ringClass: 'ring-4 ring-yellow-400 ring-offset-3 ring-offset-purple-900',
      shadowClass: 'shadow-[0_0_24px_rgba(234,179,8,1)] animate-pulse',
      particleEmoji: '👑',
      badgeStyle: 'bg-gradient-to-r from-amber-300 to-yellow-400 text-amber-950 font-black'
    }
  },

  // ==========================================
  // 2. RARE & MYTHICAL AVATARS
  // ==========================================
  {
    id: 'avatar_dragon',
    category: 'avatar',
    name: 'Dragon',
    jaName: 'ドラゴン',
    icon: '🐉',
    price: 300,
    requiredLevel: 1,
    description: 'Legendary eastern dragon soaring through the storm.',
    jaDescription: '嵐を呼ぶ伝説の龍！圧倒的な迫力をもつ神話のアバター',
    color: 'from-emerald-500 to-teal-700',
    extraPayload: '🐉'
  },
  {
    id: 'avatar_ninja',
    category: 'avatar',
    name: 'Ninja',
    jaName: 'ニンジャ',
    icon: '🥷',
    price: 250,
    requiredLevel: 1,
    description: 'Shadow warrior who answers silently with electric speed.',
    jaDescription: '音もなく電光石火で答える影の忍者！',
    color: 'from-slate-700 to-zinc-900',
    extraPayload: '🥷'
  },
  {
    id: 'avatar_wizard',
    category: 'avatar',
    name: 'Wizard',
    jaName: 'まほうつかい',
    icon: '🧙',
    price: 250,
    requiredLevel: 1,
    description: 'Master of arcane word spells and vocabulary wisdom.',
    jaDescription: '言葉の魔法を操る大魔導士！英語の知恵者アバター',
    color: 'from-indigo-600 to-purple-800',
    extraPayload: '🧙'
  },
  {
    id: 'avatar_ufo',
    category: 'avatar',
    name: 'Alien UFO',
    jaName: 'エイリアンUFO',
    icon: '🛸',
    price: 300,
    requiredLevel: 2,
    description: 'Extraterrestrial visitor from beyond the solar system.',
    jaDescription: '宇宙の彼方からやってきた未知の宇宙船！',
    color: 'from-cyan-500 to-blue-700',
    extraPayload: '🛸'
  },
  {
    id: 'avatar_trex',
    category: 'avatar',
    name: 'T-Rex Fossil',
    jaName: 'ダイナソー化石',
    icon: '🦖',
    price: 350,
    requiredLevel: 2,
    description: 'Fierce prehistoric apex predator dinosaur.',
    jaDescription: '太古の王者が蘇る！超ド迫力のティラノサウルス！',
    color: 'from-amber-600 to-stone-800',
    extraPayload: '🦖'
  },
  {
    id: 'avatar_pegasus',
    category: 'avatar',
    name: 'Golden Pegasus',
    jaName: '黄金のペガサス',
    icon: '🦄',
    price: 450,
    requiredLevel: 5,
    description: 'Majestic winged steed of the heavens.',
    jaDescription: '天を翔ける気品あるペガサス！レベル5達成者の証',
    color: 'from-pink-400 via-amber-300 to-purple-500',
    extraPayload: '🦄'
  },
  {
    id: 'avatar_mecha',
    category: 'avatar',
    name: 'Cyborg Robot',
    jaName: 'サイボーグ',
    icon: '🤖',
    price: 300,
    requiredLevel: 2,
    description: 'High-tech AI robot equipped with precision translation.',
    jaDescription: '超精密な翻訳回路をそなえたハイテクサイボーグ！',
    color: 'from-slate-400 to-blue-600',
    extraPayload: '🤖'
  },
  {
    id: 'avatar_trophy',
    category: 'avatar',
    name: 'Levi Golden Trophy',
    jaName: 'ゴールドトロフィー',
    icon: '🥇',
    price: 800,
    requiredLevel: 7,
    description: 'The golden championship cup of Levi Sensei English Class.',
    jaDescription: 'リヴァイ先生公認！真の英語チャンピオンに贈られる金杯アバター',
    color: 'from-amber-300 via-yellow-400 to-amber-600',
    extraPayload: '🥇'
  },

  // ==========================================
  // 3. SUZUKA GRAND PRIX KART LIVERIES
  // ==========================================
  {
    id: 'kart_CYBER_NEON',
    category: 'kart',
    name: 'Cyber Neon Kart',
    jaName: 'サイバーネオン号',
    icon: '⚡',
    price: 250,
    requiredLevel: 2,
    description: 'Futuristic electric cyan chassis with neon lime racing wing.',
    jaDescription: 'ネオンライムとシアンブルーが輝く近未来レーシングカート！',
    color: 'from-cyan-500 via-blue-600 to-indigo-700',
    extraPayload: 'CYBER_NEON'
  },
  {
    id: 'kart_SAKURA_BREEZE',
    category: 'kart',
    name: 'Sakura Breeze Kart',
    jaName: 'サクラブリーズ号',
    icon: '🌸',
    price: 300,
    requiredLevel: 2,
    description: 'Cherry blossom pink body with pearl white helmet livery.',
    jaDescription: '春風とともにサーキットを駆け抜ける桜色のスピードマシン！',
    color: 'from-pink-400 via-rose-400 to-amber-300',
    extraPayload: 'SAKURA_BREEZE'
  },
  {
    id: 'kart_FIRE_DRAGON',
    category: 'kart',
    name: 'Fire Dragon Kart',
    jaName: 'ファイアドラゴン号',
    icon: '🔥',
    price: 350,
    requiredLevel: 3,
    description: 'Matte stealth black body with roaring blaze orange aerodynamic stripes.',
    jaDescription: '漆黒のボディに炎のストライプ！圧倒的加速のドラゴンマシン！',
    color: 'from-stone-900 via-orange-600 to-red-600',
    extraPayload: 'FIRE_DRAGON'
  },
  {
    id: 'kart_MIDNIGHT_PHANTOM',
    category: 'kart',
    name: 'Midnight Phantom',
    jaName: 'ミッドナイト号',
    icon: '🟣',
    price: 350,
    requiredLevel: 3,
    description: 'Deep royal violet with laser cyan highlights.',
    jaDescription: '夜闇に溶けこむ紫紺の幻影マシン！クールなチタンホイール装備！',
    color: 'from-purple-600 via-violet-700 to-indigo-900',
    extraPayload: 'MIDNIGHT_PHANTOM'
  },
  {
    id: 'kart_LIME_VIPER',
    category: 'kart',
    name: 'Lime Viper Kart',
    jaName: 'ライムバイパー号',
    icon: '🐍',
    price: 300,
    requiredLevel: 2,
    description: 'Vibrant neon green chassis with rapid acceleration profile.',
    jaDescription: '毒蛇のような鋭いコーナリングを誇るライムグリーンカート！',
    color: 'from-lime-400 via-emerald-500 to-teal-700',
    extraPayload: 'LIME_VIPER'
  },
  {
    id: 'kart_SUNSET_CORAL',
    category: 'kart',
    name: 'Sunset Coral Kart',
    jaName: 'サンセットコーラル号',
    icon: '🌅',
    price: 300,
    requiredLevel: 2,
    description: 'Warm tropical sunset gradient chassis.',
    jaDescription: '夕暮れ色の鮮やかなグラデーションをまとったトロピカルカート！',
    color: 'from-orange-400 via-rose-400 to-pink-500',
    extraPayload: 'SUNSET_CORAL'
  },
  {
    id: 'kart_ARCTIC_GLACIER',
    category: 'kart',
    name: 'Arctic Glacier Kart',
    jaName: 'アークティック号',
    icon: '🧊',
    price: 350,
    requiredLevel: 3,
    description: 'Frosted ice-blue chassis with high-speed aerodynamic fairings.',
    jaDescription: '極寒の氷河を切り裂くアイスブルーのハイテクマシン！',
    color: 'from-sky-300 via-blue-400 to-indigo-600',
    extraPayload: 'ARCTIC_GLACIER'
  },
  {
    id: 'kart_STEALTH_CARBON',
    category: 'kart',
    name: 'Stealth Carbon Kart',
    jaName: 'ステルスカーボン号',
    icon: '🥷',
    price: 450,
    requiredLevel: 4,
    description: 'Ultra-lightweight dark carbon fiber body with red racing calipers.',
    jaDescription: '超軽量カーボンファイバーを惜しみなく使った漆黒のレーシングマシン！',
    color: 'from-zinc-800 via-neutral-900 to-black',
    extraPayload: 'STEALTH_CARBON'
  },
  {
    id: 'kart_COSMIC_GALAXY',
    category: 'kart',
    name: 'Cosmic Galaxy Kart',
    jaName: 'コズミック号',
    icon: '🌌',
    price: 500,
    requiredLevel: 5,
    description: 'Deep starlight galaxy livery with iridescent reflective visor.',
    jaDescription: '銀河の星々を散りばめたスペイシーな特別仕様カート！',
    color: 'from-violet-800 via-indigo-900 to-fuchsia-900',
    extraPayload: 'COSMIC_GALAXY'
  },
  {
    id: 'kart_GOLD_CHAMPION',
    category: 'kart',
    name: 'Gold Champion Kart',
    jaName: 'ゴールド王者号',
    icon: '👑',
    price: 800,
    requiredLevel: 6,
    description: 'Brilliant trophy gold body with golden wheels. The ultimate champion.',
    jaDescription: 'サーキットの頂点に君臨する黄金のレーシングカー！輝くチャンピオンマシン',
    color: 'from-amber-400 via-yellow-300 to-amber-600',
    extraPayload: 'GOLD_CHAMPION'
  },

  // ==========================================
  // 4. CLASSROOM TITLES (称号)
  // ==========================================
  {
    id: 'title_speed_demon',
    category: 'title',
    name: 'Speed Demon',
    jaName: '早押しの鬼',
    icon: '⚡',
    price: 200,
    requiredLevel: 2,
    description: 'Broadcasts "【⚡ 早押しの鬼】" next to your name on the classroom TV.',
    jaDescription: 'テレビ画面や席順表で【⚡ 早押しの鬼】と表示される限定称号！',
    color: 'from-amber-400 to-orange-500',
    extraPayload: '⚡ 早押しの鬼'
  },
  {
    id: 'title_bullseye',
    category: 'title',
    name: 'Bullseye Sniper',
    jaName: '百発百中',
    icon: '🎯',
    price: 200,
    requiredLevel: 2,
    description: 'Broadcasts "【🎯 百発百中】" showcasing pinpoint quiz precision.',
    jaDescription: '的確な正解を連発するスナイパーの証！【🎯 百発百中】',
    color: 'from-blue-500 to-indigo-600',
    extraPayload: '🎯 百発百中'
  },
  {
    id: 'title_phoenix',
    category: 'title',
    name: 'The Phoenix',
    jaName: '不死鳥',
    icon: '🔥',
    price: 300,
    requiredLevel: 3,
    description: 'Broadcasts "【🔥 不死鳥】" honoring unstoppable comeback spirit.',
    jaDescription: 'どんなピンチからも必ず逆転する不屈の精神！【🔥 不死鳥】',
    color: 'from-red-500 to-rose-600',
    extraPayload: '🔥 不死鳥'
  },
  {
    id: 'title_lucky_star',
    category: 'title',
    name: 'Lucky Star',
    jaName: '幸運の星',
    icon: '🍀',
    price: 150,
    requiredLevel: 1,
    description: 'Broadcasts "【🍀 幸運の星】" bringing good fortune to your team.',
    jaDescription: 'チームに幸運をもたらすラッキーチャーム！【🍀 幸運の星】',
    color: 'from-emerald-400 to-teal-500',
    extraPayload: '🍀 幸運の星'
  },
  {
    id: 'title_all_rounder',
    category: 'title',
    name: 'All-Rounder',
    jaName: '万能マスター',
    icon: '🌟',
    price: 250,
    requiredLevel: 3,
    description: 'Broadcasts "【🌟 万能マスター】" mastering listening, reading, and speed.',
    jaDescription: 'リスニングも単語も全方位で得意な優等生！【🌟 万能マスター】',
    color: 'from-purple-500 to-indigo-600',
    extraPayload: '🌟 万能マスター'
  }
];

export const LEVEL_TITLES: Record<number, { en: string; ja: string }> = {
  1: { en: 'Rookie', ja: 'ルーキー' },
  2: { en: 'Explorer', ja: 'えいご探検家' },
  3: { en: 'Challenger', ja: 'チャレンジャー' },
  4: { en: 'Word Detective', ja: 'ことばの名探偵' },
  5: { en: 'English Star', ja: 'えいごスター' },
  6: { en: 'Grand Prix Racer', ja: 'サーキットレーサー' },
  7: { en: 'Quiz Master', ja: 'クイズマスター' },
  8: { en: 'English Ace', ja: '英語のエース' },
  9: { en: 'Classroom Legend', ja: 'クラスの伝説' },
  10: { en: 'Supreme Champion', ja: '英語の達人' }
};

export function getShopItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function getAuraStyle(auraId?: string) {
  if (!auraId) return null;
  const item = SHOP_ITEMS.find((i) => i.id === auraId && i.category === 'aura');
  return item?.auraStyles || null;
}
