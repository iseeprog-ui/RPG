export const WORLD = {
  width: 3200,
  height: 2400,
  tileSize: 32,
  friction: 0.88,
  cameraBump: 18,
  hitShake: 8,
  meleeSwingDuration: 240
};

export const LEVELING = {
  xpForLevel: level => 120 + level * 140,
  hpPerLevel: { warrior: 24, berserker: 28, ranger: 18, mage: 15, assassin: 19 },
  mpPerLevel: { warrior: 8, berserker: 6, ranger: 10, mage: 16, assassin: 12 },
  damagePerLevel: { warrior: 3, berserker: 4, ranger: 2, mage: 4, assassin: 3 }
};

export const PLAYER_CLASSES = {
  warrior: {
    label: 'Воин',
    sprite: 'warrior',
    base: { hp: 130, mp: 40, damage: 20, move: 210, attackSpeed: 0.32, range: 70 },
    attack: { type: 'arc', arc: 70, knock: 70 },
    skill: 'powerStrike'
  },
  berserker: {
    label: 'Берсерк',
    sprite: 'berserker',
    base: { hp: 160, mp: 35, damage: 26, move: 195, attackSpeed: 0.28, range: 80 },
    attack: { type: 'spin', radius: 60, knock: 90 },
    skill: 'rage'
  },
  ranger: {
    label: 'Стрелок',
    sprite: 'ranger',
    base: { hp: 95, mp: 60, damage: 16, move: 235, attackSpeed: 0.22, range: 320 },
    attack: { type: 'arrow', projectileSpeed: 420 },
    skill: 'multiShot'
  },
  mage: {
    label: 'Маг',
    sprite: 'mage',
    base: { hp: 85, mp: 110, damage: 30, move: 205, attackSpeed: 0.3, range: 260 },
    attack: { type: 'orb', projectileSpeed: 360 },
    skill: 'fireball'
  },
  assassin: {
    label: 'Ассасин',
    sprite: 'assassin',
    base: { hp: 100, mp: 55, damage: 22, move: 255, attackSpeed: 0.2, range: 60 },
    attack: { type: 'dash', dash: 120 },
    skill: 'shadowStep'
  }
};

export const CLASS_BRANCHES = {
  warrior: [
    { id: 'guardian', name: 'Страж', nodes: [
      { id: 'guard-hp', label: '+80 HP', modifiers: { maxHp: 80 } },
      { id: 'guard-block', label: '+15% блок', modifiers: { block: 0.15 } },
      { id: 'guard-taunt', label: 'Рывок-агр', modifiers: { tauntDash: true } },
      { id: 'guard-passive', label: 'Щит рассвета', modifiers: { barrier: true } }
    ]},
    { id: 'berserker', name: 'Берсерк-защитник', nodes: [
      { id: 'bz-dmg', label: '+18% урон', modifiers: { damageMult: 0.18 } },
      { id: 'bz-vamp', label: '+12% вампиризм', modifiers: { lifesteal: 0.12 } },
      { id: 'bz-rage', label: '+2с ярость', modifiers: { rageDuration: 2 } },
      { id: 'bz-passive', label: 'Кровь титана', modifiers: { titanBlood: true } }
    ]},
    { id: 'tactician', name: 'Полководец', nodes: [
      { id: 'tact-command', label: 'Командный клич', modifiers: { warCry: true } },
      { id: 'tact-crit', label: '+8% крит', modifiers: { crit: 0.08 } },
      { id: 'tact-shield', label: '+20% щит', modifiers: { shieldBoost: 0.2 } },
      { id: 'tact-passive', label: 'Контратака', modifiers: { counterStance: true } }
    ]}
  ],
  berserker: [
    { id: 'slayer', name: 'Мясник', nodes: [
      { id: 'slayer-boss', label: '+20% урон по боссам', modifiers: { bossDamage: 0.2 } },
      { id: 'slayer-crit', label: '+10% крит', modifiers: { crit: 0.1 } },
      { id: 'slayer-rage', label: '+25% длительность ярости', modifiers: { rageDuration: 0.25 } },
      { id: 'slayer-passive', label: 'Кровавая жатва', modifiers: { bloodHarvest: true } }
    ]},
    { id: 'frenzy', name: 'Безумец', nodes: [
      { id: 'frenzy-speed', label: '+15% скорость', modifiers: { moveSpeed: 0.15 } },
      { id: 'frenzy-damage', label: '+18% урон', modifiers: { damageMult: 0.18 } },
      { id: 'frenzy-regen', label: '+1 HP/с', modifiers: { hpRegen: 1 } },
      { id: 'frenzy-passive', label: 'Вихрь ярости', modifiers: { rageSpin: true } }
    ]},
    { id: 'warden', name: 'Страж ярости', nodes: [
      { id: 'warden-hp', label: '+100 HP', modifiers: { maxHp: 100 } },
      { id: 'warden-shield', label: 'Поглощение 12%', modifiers: { damageReduce: 0.12 } },
      { id: 'warden-roar', label: 'Рёв', modifiers: { roar: true } },
      { id: 'warden-passive', label: 'Стальная кожа', modifiers: { steelSkin: true } }
    ]}
  ],
  ranger: [
    { id: 'precision', name: 'Снайпер', nodes: [
      { id: 'prec-range', label: '+60 дальность', modifiers: { range: 60 } },
      { id: 'prec-crit', label: '+12% крит', modifiers: { crit: 0.12 } },
      { id: 'prec-multi', label: '+1 стрела', modifiers: { extraProjectiles: 1 } },
      { id: 'prec-passive', label: 'Уязвимое место', modifiers: { armorBreak: 0.15 } }
    ]},
    { id: 'hunter', name: 'Охотник', nodes: [
      { id: 'hunt-move', label: '+15% скорость', modifiers: { moveSpeed: 0.15 } },
      { id: 'hunt-pet', label: 'Боевой волк', modifiers: { summonWolf: true } },
      { id: 'hunt-crit', label: '+6% крит', modifiers: { crit: 0.06 } },
      { id: 'hunt-passive', label: 'Выживание', modifiers: { lifesteal: 0.08 } }
    ]},
    { id: 'engineer', name: 'Инженер', nodes: [
      { id: 'eng-trap', label: '+1 ловушка', modifiers: { trapCharges: 1 } },
      { id: 'eng-slow', label: 'Липкая смола', modifiers: { trapSlow: 0.25 } },
      { id: 'eng-dmg', label: '+20% урон ловушек', modifiers: { trapDamage: 0.2 } },
      { id: 'eng-passive', label: 'Автоматон', modifiers: { turret: true } }
    ]}
  ],
  mage: [
    { id: 'fire', name: 'Пиромант', nodes: [
      { id: 'fire-dmg', label: '+15% урон огня', modifiers: { fireDamage: 0.15 } },
      { id: 'fire-radius', label: '+20 радиус', modifiers: { fireballRadius: 20 } },
      { id: 'fire-crit', label: '+8% крит магии', modifiers: { spellCrit: 0.08 } },
      { id: 'fire-passive', label: 'Огненный покров', modifiers: { ignite: true } }
    ]},
    { id: 'ice', name: 'Криомант', nodes: [
      { id: 'ice-slow', label: '+30% замедление', modifiers: { iceSlow: 0.3 } },
      { id: 'ice-radius', label: '+15 радиус конуса', modifiers: { frostConeRadius: 15 } },
      { id: 'ice-crit', label: '+6% крит холода', modifiers: { spellCrit: 0.06 } },
      { id: 'ice-passive', label: 'Ледяной панцирь', modifiers: { iceShield: true } }
    ]},
    { id: 'arcane', name: 'Арканист', nodes: [
      { id: 'arcane-mp', label: '+30 MP', modifiers: { maxMp: 30 } },
      { id: 'arcane-regen', label: '+1.5 MP/с', modifiers: { mpRegen: 1.5 } },
      { id: 'arcane-crit', label: '+10% крит', modifiers: { spellCrit: 0.1 } },
      { id: 'arcane-passive', label: 'Сущность щита', modifiers: { arcaneBarrier: true } }
    ]}
  ],
  assassin: [
    { id: 'shadow', name: 'Тень', nodes: [
      { id: 'shadow-duration', label: '+1.5с невидимости', modifiers: { stealthDuration: 1.5 } },
      { id: 'shadow-crit', label: '+14% крит из тени', modifiers: { backstabCrit: 0.14 } },
      { id: 'shadow-dash', label: '+40 рывок', modifiers: { dashDistance: 40 } },
      { id: 'shadow-passive', label: 'Холодная кровь', modifiers: { bleed: true } }
    ]},
    { id: 'duelist', name: 'Дуэлянт', nodes: [
      { id: 'duel-speed', label: '+18% скорость атаки', modifiers: { attackSpeed: 0.18 } },
      { id: 'duel-parry', label: 'Парирование', modifiers: { parry: true } },
      { id: 'duel-crit', label: '+10% крит', modifiers: { crit: 0.1 } },
      { id: 'duel-passive', label: 'Смертельный выпад', modifiers: { execute: true } }
    ]},
    { id: 'nightblade', name: 'Ночной клинок', nodes: [
      { id: 'night-poison', label: 'Яд', modifiers: { poison: true } },
      { id: 'night-aoe', label: '+20 радиус веера', modifiers: { fanRadius: 20 } },
      { id: 'night-mp', label: '+25 MP', modifiers: { maxMp: 25 } },
      { id: 'night-passive', label: 'Теневой двойник', modifiers: { clone: true } }
    ]}
  ]
};

export const ENEMIES = {
  goblin: {
    label: 'Гоблин-резак',
    sprite: 'goblin',
    base: { hp: 70, damage: 12, speed: 230, attackDelay: 0.9 },
    xp: 45,
    abilities: { dash: { distance: 120, cooldown: 3200 } }
  },
  orc: {
    label: 'Орк-громила',
    sprite: 'orc',
    base: { hp: 240, damage: 24, speed: 170, attackDelay: 1.35 },
    xp: 85,
    abilities: { slam: { radius: 90, damageMult: 1.4, cooldown: 4800 } }
  },
  demon: {
    label: 'Демон-чернокнижник',
    sprite: 'demon',
    base: { hp: 180, damage: 22, speed: 185, attackDelay: 1.1 },
    xp: 95,
    ranged: true,
    projectile: 'fireball',
    abilities: { blink: { distance: 140, cooldown: 6200 }, inferno: { radius: 120, cooldown: 5600, windup: 750, damageMult: 1.15 } }
  },
  troll: {
    label: 'Тролль-каменщик',
    sprite: 'troll',
    base: { hp: 320, damage: 28, speed: 150, attackDelay: 1.6 },
    xp: 120,
    ranged: true,
    projectile: 'boulder',
    abilities: {
      regen: { amount: 3, interval: 900 },
      throw: { cooldown: 4200 }
    }
  },
  skeletonArcher: {
    label: 'Скелет-лучник',
    sprite: 'skeletonArcher',
    base: { hp: 110, damage: 18, speed: 190, attackDelay: 1.0 },
    xp: 65,
    ranged: true,
    projectile: 'arrow',
    abilities: { volley: { count: 3, spread: 16, cooldown: 5200 } }
  },
  slime: {
    label: 'Слизень',
    sprite: 'slime',
    base: { hp: 90, damage: 12, speed: 150, attackDelay: 1.2 },
    xp: 40,
    abilities: { split: { pieces: 2, scale: 0.55 } }
  },
  boss: {
    label: 'Демон-лорд',
    sprite: 'boss',
    base: { hp: 1400, damage: 42, speed: 140, attackDelay: 0.85 },
    xp: 1500,
    phases: [
      {
        threshold: 0.7,
        animation: 'ignite',
        modifiers: {
          spawnMinions: { count: 3, cooldown: 8500, pool: ['goblin', 'demon'] },
          shockwave: { radius: 200, charge: 900 }
        }
      },
      {
        threshold: 0.3,
        animation: 'rage',
        modifiers: {
          enraged: true,
          damageMult: 1.5,
          speedMult: 1.25,
          attackDelay: 0.6,
          meteor: { radius: 160, delay: 650 }
        }
      }
    ]
  }
};

export const ZONES = [
  {
    id: 'forest',
    name: 'Лес Ветра',
    difficulty: 'easy',
    enemyScale: { hp: 0.85, damage: 0.8, xp: 0.8 },
    environment: 'forest',
    enemyPool: ['goblin', 'skeletonArcher', 'slime'],
    boss: null
  },
  {
    id: 'lake',
    name: 'Сапфировое озеро',
    difficulty: 'medium',
    enemyScale: { hp: 1.0, damage: 0.95, xp: 1.0 },
    environment: 'lake',
    enemyPool: ['goblin', 'demon', 'skeletonArcher', 'slime'],
    boss: null
  },
  {
    id: 'ruins',
    name: 'Руины Альтари',
    difficulty: 'hard',
    enemyScale: { hp: 1.25, damage: 1.15, xp: 1.3 },
    environment: 'ruins',
    enemyPool: ['orc', 'demon', 'troll'],
    boss: 'boss'
  }
];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_COLORS = {
  common: '#e5e7eb',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#f97316'
};

export const LOOT_TABLE = {
  common: 0.5,
  uncommon: 0.28,
  rare: 0.14,
  epic: 0.06,
  legendary: 0.008
};

export const CLASS_LEGENDARIES = {
  ranger: {
    icon: '🏹',
    name: 'Лук сумеречного ястреба',
    slot: 'weapon',
    stats: { damage: 32, range: 420 },
    aura: { inner: 'rgba(96,165,250,0.6)', outer: 'rgba(30,64,175,0.3)' },
    bonuses: {},
    special: { pierceChance: 0.5, extraProjectiles: 2, projectileSpread: 10 },
    requires: ['ranger'],
    description: 'Стрелы пронзают нескольких врагов и летят невероятно далеко.',
    requiredClass: 'ranger'
  },
  mage: {
    icon: '🔮',
    name: 'Посох астрального шепота',
    slot: 'weapon',
    stats: { damage: 36, range: 260 },
    aura: { inner: 'rgba(192,132,252,0.6)', outer: 'rgba(76,29,149,0.3)' },
    bonuses: {},
    special: { fireballRadius: 30, fireDamage: 0.25 },
    requires: ['mage'],
    description: 'Огненный шар становится шире и обжигает сильнее, подпитывая магию.',
    requiredClass: 'mage'
  },
  warrior: {
    icon: '⚔️',
    name: 'Клинок легиона',
    slot: 'weapon',
    stats: { damage: 40, attackSpeed: 0.18 },
    aura: { inner: 'rgba(248,250,252,0.6)', outer: 'rgba(59,130,246,0.3)' },
    bonuses: {},
    special: { block: 0.12, arcBonus: 35, damageMult: 0.25 },
    requires: ['warrior'],
    description: 'Удары расходятся широкой дугой, блокируя и отражая атаки.',
    requiredClass: 'warrior'
  },
  berserker: {
    icon: '🪓',
    name: 'Громовой разрубатель',
    slot: 'weapon',
    stats: { damage: 48, attackSpeed: 0.15, lifesteal: 0.1 },
    aura: { inner: 'rgba(248,113,113,0.6)', outer: 'rgba(185,28,28,0.3)' },
    bonuses: {},
    special: { rageDuration: 3, bossDamage: 0.3 },
    requires: ['berserker'],
    description: 'Вампиризм и бешенство усиливаются, особенно против боссов.',
    requiredClass: 'berserker'
  },
  assassin: {
    icon: '🗡️',
    name: 'Клинки призрака',
    slot: 'weapon',
    stats: { damage: 34, attackSpeed: 0.12, crit: 0.18 },
    aura: { inner: 'rgba(167,139,250,0.65)', outer: 'rgba(91,33,182,0.35)' },
    bonuses: {},
    special: { stealthDuration: 2, dashDistance: 60, backstabBonus: 0.25 },
    requires: ['assassin'],
    description: 'Удары из невидимости наносят сокрушительные критические раны.',
    requiredClass: 'assassin'
  }
};

export const BASE_ITEMS = [
  { icon: '🗡️', name: 'Короткий меч', slot: 'weapon', rarity: 'common', stats: { damage: 8 } },
  { icon: '🪓', name: 'Боевой топор', slot: 'weapon', rarity: 'uncommon', stats: { damage: 12 } },
  { icon: '🏹', name: 'Композитный лук', slot: 'weapon', rarity: 'rare', stats: { damage: 14, range: 60 } },
  { icon: '🔮', name: 'Фокусирующий посох', slot: 'weapon', rarity: 'rare', stats: { damage: 16, mp: 20 } },
  { icon: '🛡️', name: 'Стальная кираса', slot: 'armor', rarity: 'rare', stats: { hp: 60 } },
  { icon: '💍', name: 'Кольцо критов', slot: 'ring', rarity: 'epic', stats: { crit: 0.08 } },
  { icon: '📿', name: 'Амулет маны', slot: 'amulet', rarity: 'uncommon', stats: { mp: 30 } },
  { icon: '🪙', name: 'Талисман удачи', slot: 'amulet', rarity: 'rare', stats: { crit: 0.04, damage: 4 } },
  { icon: '🧿', name: 'Око хранителя', slot: 'ring', rarity: 'epic', stats: { lifesteal: 0.06, hp: 30 } }
];

export const QUEST_TEMPLATES = [
  { id: 'forest-hunt', name: 'Тренировка охоты', zone: 'forest', type: 'kill', target: 'goblin', count: 6, reward: { xp: 220, gold: 40, item: 'rare' } },
  { id: 'forest-rescue', name: 'Сбор искр', zone: 'forest', type: 'collect', target: 'ancient_orb', count: 3, reward: { xp: 260, gold: 55, item: 'uncommon' } },
  { id: 'lake-cleansing', name: 'Очистка берега', zone: 'lake', type: 'kill', target: 'demon', count: 5, reward: { xp: 360, gold: 120, item: 'epic' } },
  { id: 'ruins-boss', name: 'Покорение демона', zone: 'ruins', type: 'boss', target: 'boss', reward: { xp: 1200, gold: 300, legendary: true } },
  { id: 'portal-scout', name: 'Разведка портала', zone: 'lake', type: 'discover', target: 'portal-lake-ruins', reward: { xp: 180, gold: 50 } }
];

export const UI_STRINGS = {
  mana: 'Недостаточно маны.',
  cooldown: 'Кулдаун не закончился.',
  wrongClass: 'Этот предмет не для вашего класса.',
  inventoryFull: 'Нет места в сумке.'
};
