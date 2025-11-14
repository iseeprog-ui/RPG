// === Eternal Shards: Ultimate Fusion (improved) ===
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 2400;

const TILE_SIZE = 32;
let tileMap = [];

// камера — всегда смотрит в центр на игрока
let camera = { x: 0, y: 0 };

let player = null;
let enemies = [];
let projectiles = [];
let particles = [];
let items = [];
let portals = [];
let quests = [];
let activeZone = null;

let keys = {};
let mouse = { x: 0, y: 0, left: false, right: false };
let gameState = 'start';
let skillPoints = 0;
let killCount = 0;
let lootCount = 0;
let animTime = 0;

// UI refs
const logEl = document.getElementById('log');
const hpBar = document.getElementById('hp-bar');
const mpBar = document.getElementById('mp-bar');
const xpBar = document.getElementById('xp-bar');
const hpText = document.getElementById('hp-text');
const mpText = document.getElementById('mp-text');
const xpText = document.getElementById('xp-text');
const charSummary = document.getElementById('char-summary');
const statsList = document.getElementById('stats-list');
const invSlots = document.getElementById('invSlots');
const invCount = document.getElementById('inv-count');
const weaponSlotEl = document.getElementById('weaponSlot');
const armorSlotEl = document.getElementById('armorSlot');
const questList = document.getElementById('quest-list');
const portalHint = document.getElementById('portal-hint');
const skillTreeEl = document.getElementById('skillTree');
const skillPointsEl = document.getElementById('skillPoints');
const tooltipEl = document.getElementById('tooltip');

// overlays
const startScreen = document.getElementById('start-screen');
const specScreen = document.getElementById('spec-screen');
const deathScreen = document.getElementById('death-screen');
const raceSelect = document.getElementById('race-select');
const classGrid = document.getElementById('class-grid');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const specSkipBtn = document.getElementById('spec-skip-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const skillTreeBtn = document.getElementById('skillTreeBtn');
const closeSkillTree = document.getElementById('closeSkillTree');

// sprites (упрощённые иконки)
const CLASS_SPRITES = {
  warrior: '⚔️',
  berserker: '🪓',
  ranger: '🏹',
  mage: '🔮',
  assassin: '🗡️'
};

const ENEMY_SPRITES = {
  brute: '👹',
  archer: '🏹',
  shaman: '💀',
  boss: '🐲'
};

const ITEM_SPRITES = {
  potion: '🧪',
  sword: '⚔️',
  axe: '🪓',
  bow: '🏹',
  staff: '🔮',
  daggers: '🗡️',
  armor: '🛡️'
};

const PLAYER_COLORS = {
  warrior: ['#f97316', '#fed7aa'],
  berserker: ['#f43f5e', '#fecaca'],
  ranger: ['#22c55e', '#bbf7d0'],
  mage: ['#38bdf8', '#bae6fd'],
  assassin: ['#a855f7', '#e9d5ff']
};

let playerSprites = {};
let enemySprites = {};

function buildPlayerSprites() {
  const size = 16;
  Object.keys(PLAYER_COLORS).forEach(cls => {
    const colors = PLAYER_COLORS[cls];
    const body = colors[0];
    const accent = colors[1];
    playerSprites[cls] = [];
    for (let f = 0; f < 4; f++) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;

      // фон прозрачный
      g.clearRect(0, 0, size, size);

      // тень под ногами
      g.fillStyle = 'rgba(15,23,42,0.8)';
      g.fillRect(3, 13, 10, 2);

      // ноги (анимация шага)
      g.fillStyle = body;
      if (f % 2 === 0) {
        // правая нога вперёд
        g.fillRect(4, 10, 3, 3);
        g.fillRect(9, 11, 3, 2);
      } else {
        // левая нога вперёд
        g.fillRect(4, 11, 3, 2);
        g.fillRect(9, 10, 3, 3);
      }

      // торс
      g.fillRect(4, 5, 8, 5);

      // голова
      g.fillStyle = accent;
      g.fillRect(5, 2, 6, 3);

      // "оружие" как акцент сбоку
      g.fillStyle = accent;
      if (cls === 'ranger') {
        g.fillRect(1, 5, 2, 6);
      } else if (cls === 'mage') {
        g.fillRect(12, 3, 2, 6);
      } else if (cls === 'assassin') {
        g.fillRect(2, 4, 2, 4);
        g.fillRect(12, 4, 2, 4);
      } else if (cls === 'berserker') {
        g.fillRect(1, 4, 3, 3);
      } else { // warrior
        g.fillRect(12, 5, 3, 3);
      }

      playerSprites[cls].push(c);
    }
  });
}

// классы
const CLASSES = {
  warrior: {
    name: 'Воин',
    hp: 130, mp: 40, speed: 4,
    dmg: 20, range: 70,
    attackCooldown: 350,
    attackType: 'meleeArc', // удар по дуге
    skill: 'powerStrike'
  },
  berserker: {
    name: 'Берсерк',
    hp: 160, mp: 35, speed: 3.6,
    dmg: 28, range: 80,
    attackCooldown: 450,
    attackType: 'meleeAoE', // круговой удар
    skill: 'rage'
  },
  ranger: {
    name: 'Стрелок',
    hp: 95, mp: 60, speed: 5,
    dmg: 16, range: 260,
    attackCooldown: 260,
    attackType: 'arrow',
    skill: 'multiShot'
  },
  mage: {
    name: 'Маг',
    hp: 85, mp: 110, speed: 3.8,
    dmg: 32, range: 220,
    attackCooldown: 420,
    attackType: 'orb',
    skill: 'fireball'
  },
  assassin: {
    name: 'Ассасин',
    hp: 100, mp: 55, speed: 6,
    dmg: 22, range: 50,
    attackCooldown: 250,
    attackType: 'dashStab',
    skill: 'shadowStep'
  }
};

// специализации
const SPECS = {
  warrior: [
    { id: 'guardian', name: 'Страж', bonus: '+30 HP, блок', desc: 'Танк, много здоровья и устойчивость.', mods: { maxHp: 30 } },
    { id: 'blademaster', name: 'Мастер клинка', bonus: '+20% урон', desc: 'Сильные атаки ближнего боя.', mods: { dmgMult: 1.2 } }
  ],
  ranger: [
    { id: 'sniper', name: 'Снайпер', bonus: '+40% дальность', desc: 'Максимальная дистанция атаки.', mods: { rangeMult: 1.4 } },
    { id: 'hunter', name: 'Охотник', bonus: '+20% скорость', desc: 'Быстрый и подвижный.', mods: { speedMult: 1.2 } }
  ],
  mage: [
    { id: 'pyromancer', name: 'Пиромант', bonus: 'Сильнее огненный шар', desc: 'Урон по области выше.', mods: { fireballMult: 1.4 } },
    { id: 'arcanist', name: 'Арканист', bonus: '+20 MP, реген', desc: 'Больше маны.', mods: { maxMp: 20 } }
  ],
  berserker: [
    { id: 'slayer', name: 'Мясник', bonus: '+10% урон по боссам', desc: 'Опасен для больших целей.', mods: {} },
    { id: 'frenzy', name: 'Безумец', bonus: 'Ярость дольше', desc: 'Сильный бафф ярости.', mods: {} }
  ],
  assassin: [
    { id: 'shadow', name: 'Тень', bonus: 'Дольше невидимость', desc: 'Мобильность и скрытность.', mods: {} },
    { id: 'duelist', name: 'Дуэлянт', bonus: '+крит.шанс', desc: 'Сильные одиночные удары.', mods: {} }
  ]
};

// скиллы
const SKILLS = {
  powerStrike: { name: 'Мощный удар', mp: 20, cd: 4000 },
  multiShot: { name: 'Мульти-выстрел', mp: 25, cd: 4000 },
  fireball: { name: 'Огненный шар', mp: 30, cd: 4500 },
  shadowStep: { name: 'Шаг в тени', mp: 25, cd: 5000 },
  rage: { name: 'Ярость', mp: 30, cd: 6000 }
};

// зоны
const ZONES = [
  {
    id: 'forest',
    name: 'Изумрудный лес',
    color: '#064e3b',
    props: 'trees',
    spawn: { x: WORLD_WIDTH * 0.25, y: WORLD_HEIGHT * 0.5 },
    enemies: ['brute', 'archer']
  },
  {
    id: 'lake',
    name: 'Озеро отражений',
    color: '#1e3a8a',
    props: 'lake',
    spawn: { x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.3 },
    enemies: ['archer', 'shaman']
  },
  {
    id: 'ruins',
    name: 'Руины демонов',
    color: '#3b0764',
    props: 'rocks',
    spawn: { x: WORLD_WIDTH * 0.75, y: WORLD_HEIGHT * 0.6 },
    enemies: ['brute', 'shaman', 'boss']
  }
];

// квесты
const QUEST_DEFS = [
  {
    id: 'kill10',
    title: 'Первая кровь',
    desc: 'Убейте 10 врагов в лесу.',
    type: 'kills',
    target: 10,
    reward: { type: 'sword', name: 'Меч ученика', slot: 'weapon', stats: { dmg: 6 }, rarity: 'uncommon', desc: 'Надёжный меч для первых приключений.' }
  },
  {
    id: 'loot5',
    title: 'Собиратель',
    desc: 'Подберите 5 предметов.',
    type: 'loot',
    target: 5,
    reward: { type: 'armor', name: 'Кожаный доспех', slot: 'armor', stats: { hp: 25 }, rarity: 'uncommon', desc: 'Лёгкая защита от ударов.' }
  },
  {
    id: 'boss1',
    title: 'Падение дракона',
    desc: 'Победите босса в Руинах демонов.',
    type: 'boss',
    target: 1,
    reward: { type: 'staff', name: 'Осколок вечности', slot: 'weapon', stats: { dmg: 15 }, rarity: 'rare', desc: 'Артефакт из Руин демонов, усиленный магической энергией.' }
  }
];


function buildEnemySprites() {
  const size = 16;
  const types = ['brute','archer','shaman','boss'];
  types.forEach(type => {
    enemySprites[type] = [];
    for (let f = 0; f < 4; f++) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0,0,size,size);

      g.fillStyle = 'rgba(15,23,42,0.8)';
      g.fillRect(3,13,10,2);

      let body = '#ef4444';
      let accent = '#fee2e2';
      if (type === 'archer') { body = '#22c55e'; accent = '#bbf7d0'; }
      if (type === 'shaman') { body = '#a855f7'; accent = '#e9d5ff'; }
      if (type === 'boss') { body = '#f97316'; accent = '#fed7aa'; }

      g.fillStyle = body;
      if (f % 2 === 0) {
        g.fillRect(4,10,3,3);
        g.fillRect(9,11,3,2);
      } else {
        g.fillRect(4,11,3,2);
        g.fillRect(9,10,3,3);
      }

      g.fillRect(4,5,8,5);

      g.fillStyle = accent;
      g.fillRect(5,2,6,3);

      g.fillStyle = accent;
      if (type === 'archer') g.fillRect(1,5,2,6);
      else if (type === 'shaman') g.fillRect(12,3,2,6);
      else if (type === 'boss') { g.fillRect(1,4,3,3); g.fillRect(12,4,3,3); }
      else g.fillRect(2,5,3,3);

      enemySprites[type].push(c);
    }
  });
}

// === INIT ===
function init() {
  // canvas full in wrapper
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    keys[key] = true;
  });
  window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    keys[key] = false;
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
  });
  canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
    });
  });

  // class selection
  classGrid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      classGrid.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  startBtn.onclick = () => {
    const cls = classGrid.querySelector('.selected')?.dataset.class || 'warrior';
    const race = raceSelect.value;
    startGame(cls, race);
  };

  restartBtn.onclick = () => {
    deathScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameState = 'start';
  };

  saveBtn.onclick = saveGame;
  loadBtn.onclick = loadGame;
  skillTreeBtn.onclick = () => {
    skillTreeEl.classList.remove('hidden');
    updateSkillTreeUI();
  };
  closeSkillTree.onclick = () => skillTreeEl.classList.add('hidden');
  specSkipBtn.onclick = () => specScreen.classList.add('hidden');

  // инвентарь слоты
  for (let i = 0; i < 27; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = i;
    slot.addEventListener('click', () => onInventoryClick(i));
    slot.addEventListener('mouseenter', (e) => {
      if (!player) return;
      const item = player.inventory[i];
      if (item) showItemTooltip(item, e.clientX, e.clientY);
    });
    slot.addEventListener('mouseleave', () => hideItemTooltip());
    invSlots.appendChild(slot);
  }

  // equip slots (клик — снять)
  document.querySelectorAll('.equip-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const type = slot.dataset.equip;
      if (!player || !player.equipment[type]) return;
      addToInventory(player.equipment[type]);
      player.equipment[type] = null;
      recalcStats();
      updateInventoryUI();
      updateStatsUI();
    });
    slot.addEventListener('mouseenter', (e) => {
      if (!player) return;
      const type = slot.dataset.equip;
      const item = player.equipment[type];
      if (item) showItemTooltip(item, e.clientX, e.clientY);
    });
    slot.addEventListener('mouseleave', () => hideItemTooltip());
  });

  // skill tree nodes
  document.querySelectorAll('#skillTree .node').forEach(node => {
    node.addEventListener('click', () => unlockSkill(node.dataset.skill));
  });

  // init portals
  buildPortals();
  buildPlayerSprites();
  buildEnemySprites();
  buildTileMap();

  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const wrapper = document.querySelector('.canvas-wrapper');
  const rect = wrapper.getBoundingClientRect();
  const ratio = 16 / 9;
  let w = rect.width - 8;
  let h = w / ratio;
  if (h > 520) {
    h = 520;
    w = h * ratio;
  }
  canvas.width = w;
  canvas.height = h;
}

// === START GAME ===
function startGame(cls, race) {
  const data = CLASSES[cls];
  player = {
    x: WORLD_WIDTH * 0.25,
    y: WORLD_HEIGHT * 0.5,
    radius: 18,
    race,
    class: cls,
    spec: null,
    level: 1,
    xp: 0,
    xpToNext: 120,
    hp: data.hp,
    maxHp: data.hp,
    mp: data.mp,
    maxMp: data.mp,
    speed: data.speed,
    baseDmg: data.dmg,
    baseRange: data.range,
    attackCooldown: data.attackCooldown,
    attackType: data.attackType,
    inventory: Array(27).fill(null),
    equipment: { weapon: null, armor: null },
    skills: { [data.skill]: { unlocked: true, cd: 0 } },
    buffs: {},
    lastAttack: 0,
    dodgeCooldown: 0,
    invincibility: 0
  };

  killCount = 0;
  lootCount = 0;
  skillPoints = 0;
  quests = QUEST_DEFS.map(q => ({
    id: q.id,
    title: q.title,
    desc: q.desc,
    type: q.type,
    target: q.target,
    progress: 0,
    completed: false,
    reward: q.reward
  }));

  activeZone = ZONES[0];
  enemies = [];
  projectiles = [];
  particles = [];
  items = [];

  // поменьше мобов в стартовой зоне, чтобы не ваншотили в начале
  spawnEnemiesForZone(activeZone, 6);

  // стартовый лут
  addToInventory(makeItem('potion', 'Зелье лечения', 'consumable', { heal: 40 }, 3, 'common', 'Простое лечебное зелье.'));
  let starterWeapon;
  if (cls === 'ranger') starterWeapon = makeItem('bow', 'Охотничий лук', 'weapon', { dmg: 6, range: 40 }, 1, 'uncommon', 'Базовый лук для стрельбы на средней дистанции.');
  else if (cls === 'mage') starterWeapon = makeItem('staff', 'Учёный посох', 'weapon', { dmg: 8 }, 1, 'uncommon', 'Посох начинающего мага.');
  else if (cls === 'assassin') starterWeapon = makeItem('daggers', 'Парные клинки', 'weapon', { dmg: 5, speed: 0.15 }, 1, 'uncommon', 'Лёгкие клинки для быстрых ударов.');
  else if (cls === 'berserker') starterWeapon = makeItem('axe', 'Боевой топор', 'weapon', { dmg: 10 }, 1, 'uncommon', 'Тяжёлый топор берсерка.');
  else starterWeapon = makeItem('sword', 'Стальной меч', 'weapon', { dmg: 7 }, 1, 'uncommon', 'Надёжный меч для ближнего боя.');
  addToInventory(starterWeapon);

  startScreen.classList.add('hidden');
  gameState = 'playing';
  log(`Вы — ${data.name} (${raceLabel(race)}). Зона: ${activeZone.name}`, 'info');
  updateStatsUI();
  updateInventoryUI();
  updateQuestsUI();

  // сразу предложить специализацию на 3 уровне позже
}

// === HELPERS ===
function raceLabel(r) {
  return { human: 'Человек', elf: 'Эльф', orc: 'Орк', demon: 'Демон' }[r] || r;
}

function log(text, type = 'info') {
  const line = document.createElement('div');
  line.className = 'log-line ' + type;
  line.textContent = text;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function buildPortals() {
  portals = ZONES.map(z => ({
    zoneId: z.id,
    x: z.spawn.x,
    y: z.spawn.y - 140,
    radius: 24
  }));
}

function findZone(id) {
  return ZONES.find(z => z.id === id);
}

// === GAME LOOP ===
let lastTime = 0;
function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  animTime += dt;

  if (gameState === 'playing') {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateCamera();
    checkCollisions();
    updateUIBars();
  }

  render();
  requestAnimationFrame(gameLoop);
}

// === PLAYER UPDATE ===
function updatePlayer(dt) {
  if (!player) return;
  const move = { x: 0, y: 0 };
  let speed = player.speed;

  if (player.buffs.rage) speed *= 1.3;
  if (keys['w'] || keys['arrowup']) move.y -= 1;
  if (keys['s'] || keys['arrowdown']) move.y += 1;
  if (keys['a'] || keys['arrowleft']) move.x -= 1;
  if (keys['d'] || keys['arrowright']) move.x += 1;

  if (move.x || move.y) {
    const len = Math.hypot(move.x, move.y);
    move.x /= len;
    move.y /= len;
    player.x += move.x * speed * 140 * dt;
    player.y += move.y * speed * 140 * dt;
    player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));
  }
  player.isMoving = !!(move.x || move.y);

  // dodge: space
  if ((keys[' '] || keys['space']) && player.dodgeCooldown <= 0 && (move.x || move.y)) {
    player.dodgeCooldown = 0.5;
    player.invincibility = 0.5;
    createParticles(player.x, player.y, '#38bdf8', 18);
  }
  if (player.dodgeCooldown > 0) player.dodgeCooldown -= dt;
  if (player.invincibility > 0) player.invincibility -= dt;

  // attack LMB
  if (mouse.left && Date.now() - player.lastAttack > player.attackCooldown) {
    performAttack();
    player.lastAttack = Date.now();
  }

  // skill RMB
  if (mouse.right) {
    useSkill();
    mouse.right = false; // чтобы не спамилось
  }

  // regen
  if (player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + 1 * dt);
  if (player.mp < player.maxMp) player.mp = Math.min(player.maxMp, player.mp + 2 * dt);

  // buffs tick
  Object.keys(player.buffs).forEach(k => {
    player.buffs[k] -= dt;
    if (player.buffs[k] <= 0) delete player.buffs[k];
  });

  // portals hint
  let closePortal = null;
  for (const p of portals) {
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (d < 60) { closePortal = p; break; }
  }
  if (closePortal) {
    portalHint.classList.remove('hidden');
    if (keys['e']) {
      enterPortal(closePortal);
      keys['e'] = false;
    }
  } else {
    portalHint.classList.add('hidden');
  }
}

// атака
function performAttack() {
  const worldMouse = screenToWorld(mouse.x, mouse.y);
  const dx = worldMouse.x - player.x;
  const dy = worldMouse.y - player.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const weaponStats = player.equipment.weapon?.stats || {};
  const dmg = player.baseDmg + (weaponStats.dmg || 0);
  const rangeBonus = weaponStats.range || 0;
  const range = player.baseRange + rangeBonus;
  const type = player.attackType;

  if (type === 'arrow' || type === 'orb') {
    if (dist < 40) return;
    const speed = type === 'arrow' ? 900 : 650;
    projectiles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      dmg,
      range,
      traveled: 0,
      owner: 'player',
      kind: type
    });
    createParticles(player.x + Math.cos(angle)*30, player.y + Math.sin(angle)*30, '#facc15', 6);
  } else if (type === 'meleeArc') {
    // ближний дуговой удар
    enemies.forEach(e => {
      const ex = e.x - player.x;
      const ey = e.y - player.y;
      const d = Math.hypot(ex, ey);
      if (d < range) {
        const ang = Math.atan2(ey, ex);
        const diff = Math.abs(normalizeAngle(ang - angle));
        if (diff < Math.PI / 4) {
          hitEnemy(e, dmg);
        }
      }
    });
    createSlashArc(player.x, player.y, angle, range, '#f97316');
  } else if (type === 'meleeAoE') {
    enemies.forEach(e => {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < range) hitEnemy(e, dmg);
    });
    createCircleWave(player.x, player.y, range, '#ef4444');
  } else if (type === 'dashStab') {
    // рывок к врагу
    let nearest = null;
    let bestDist = 260;
    for (const e of enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < bestDist) { bestDist = d; nearest = e; }
    }
    if (nearest) {
      player.x = nearest.x - Math.cos(angle) * 30;
      player.y = nearest.y - Math.sin(angle) * 30;
      hitEnemy(nearest, dmg * 1.4);
      createParticles(nearest.x, nearest.y, '#6366f1', 18);
    } else {
      // просто короткий рывок
      player.x += Math.cos(angle) * 80;
      player.y += Math.sin(angle) * 80;
      createParticles(player.x, player.y, '#4b5563', 10);
    }
  }
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI*2;
  while (a < -Math.PI) a += Math.PI*2;
  return a;
}

// скиллы
function useSkill() {
  if (!player) return;
  const skillId = Object.keys(player.skills).find(k => player.skills[k].unlocked);
  if (!skillId) return;
  const meta = SKILLS[skillId];
  const s = player.skills[skillId];
  if (s.cd > 0 || player.mp < meta.mp) return;

  const worldMouse = screenToWorld(mouse.x, mouse.y);
  const dx = worldMouse.x - player.x;
  const dy = worldMouse.y - player.y;
  const angle = Math.atan2(dy, dx);

  player.mp -= meta.mp;
  s.cd = meta.cd / 1000;

  if (skillId === 'fireball') {
    const mult = player.spec?.id === 'pyromancer' ? 1.4 : 1;
    projectiles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * 520,
      vy: Math.sin(angle) * 520,
      dmg: (player.baseDmg + 10) * mult,
      range: 380,
      traveled: 0,
      owner: 'player',
      kind: 'fireball',
      radius: 60
    });
  } else if (skillId === 'multiShot') {
    const spread = 18 * Math.PI/180;
    for (let i = -1; i <= 1; i++) {
      const a = angle + i*spread;
      projectiles.push({
        x: player.x, y: player.y,
        vx: Math.cos(a) * 900,
        vy: Math.sin(a) * 900,
        dmg: player.baseDmg * 0.85,
        range: player.baseRange + 60,
        traveled: 0,
        owner: 'player',
        kind: 'arrow'
      });
    }
  } else if (skillId === 'rage') {
    player.buffs.rage = (player.spec?.id === 'frenzy') ? 9 : 6;
  } else if (skillId === 'shadowStep') {
    player.invincibility = 1.2;
    player.buffs.shadow = 1.2;
    createCircleWave(player.x, player.y, 120, '#6b21a8');
  } else if (skillId === 'powerStrike') {
    // усиленный удар по дуге
    const worldMouse2 = screenToWorld(mouse.x, mouse.y);
    const dx2 = worldMouse2.x - player.x;
    const dy2 = worldMouse2.y - player.y;
    const angle2 = Math.atan2(dy2, dx2);
    const dmg = (player.baseDmg + 8) * 1.8;
    enemies.forEach(e => {
      const ex = e.x - player.x;
      const ey = e.y - player.y;
      const d = Math.hypot(ex, ey);
      if (d < player.baseRange + 40) {
        const ang = Math.atan2(ey, ex);
        const diff = Math.abs(normalizeAngle(ang - angle2));
        if (diff < Math.PI / 3) {
          hitEnemy(e, dmg);
        }
      }
    });
    createSlashArc(player.x, player.y, angle2, player.baseRange + 40, '#facc15');
  }
}

// === ENEMIES ===
function spawnEnemiesForZone(zone, count) {
  for (let i = 0; i < count; i++) {
    const type = zone.enemies[Math.floor(Math.random() * zone.enemies.length)];
    if (type === 'boss' && enemies.some(e => e.type === 'boss')) continue;
    const e = makeEnemy(type, zone);
    enemies.push(e);
  }
}

function makeEnemy(type, zone) {
  const base = {
    brute:  { hp: 70,  dmg: 10, speed: 2.3,  range: 40 },
    archer: { hp: 45,  dmg: 8,  speed: 2.7,  range: 260 },
    shaman: { hp: 60,  dmg: 10, speed: 2.1,  range: 220 },
    boss:   { hp: 380, dmg: 28, speed: 2.3,  range: 260 }
  }[type];

  return {
    x: zone.spawn.x + (Math.random() - 0.5) * 600,
    y: zone.spawn.y + (Math.random() - 0.5) * 400,
    radius: type === 'boss' ? 36 : 20,
    hp: base.hp,
    maxHp: base.hp,
    dmg: base.dmg,
    speed: base.speed,
    range: base.range,
    type,
    lastAttack: 0
  };
}

function updateEnemies(dt) {
  if (!player) return;

  enemies.forEach(e => {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    const dirX = dx / (dist || 1);
    const dirY = dy / (dist || 1);

    if (e.type === 'archer' || e.type === 'shaman' || e.type === 'boss') {
      // дистанционные — держат дистанцию
      const desired = e.type === 'archer' ? 220 : 260;
      if (dist > desired + 40) {
        e.x += dirX * e.speed * 80 * dt;
        e.y += dirY * e.speed * 80 * dt;
      } else if (dist < desired - 40) {
        e.x -= dirX * e.speed * 80 * dt;
        e.y -= dirY * e.speed * 80 * dt;
      }
    } else {
      // brute — ближний
      if (dist > 40) {
        e.x += dirX * e.speed * 100 * dt;
        e.y += dirY * e.speed * 100 * dt;
      }
    }

    // атаки
    const now = Date.now();
    if (e.type === 'archer' || e.type === 'shaman' || e.type === 'boss') {
      const cd = e.type === 'archer' ? 900 : (e.type === 'boss' ? 1200 : 1500);
      if (dist < e.range + 40 && now - e.lastAttack > cd) {
        enemyShoot(e, dirX, dirY);
        e.lastAttack = now;
      }
    } else {
      if (dist < 50 && now - e.lastAttack > 800) {
        damagePlayer(e.dmg);
        e.lastAttack = now;
        createParticles(player.x, player.y, '#f97373', 12);
      }
    }
  });

  // квест-босс
}

function enemyShoot(e, dirX, dirY) {
  const kind = (e.type === 'archer') ? 'enemyArrow' : 'enemyOrb';
  const speed = (e.type === 'archer') ? 720 : 540;
  if (e.type === 'boss') {
    // босс — веер
    for (let i = -1; i <= 1; i++) {
      const angle = Math.atan2(player.y - e.y, player.x - e.x) + i * (20 * Math.PI/180);
      projectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        dmg: e.dmg,
        range: 360,
        traveled: 0,
        owner: 'enemy',
        kind
      });
    }
    createCircleWave(e.x, e.y, 80, '#dc2626');
  } else if (e.type === 'shaman') {
    // шаман — медленный шар с AoE
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    projectiles.push({
      x: e.x, y: e.y,
      vx: Math.cos(angle) * 420,
      vy: Math.sin(angle) * 420,
      dmg: e.dmg,
      range: 320,
      traveled: 0,
      owner: 'enemy',
      kind: 'enemyAoE',
      radius: 80
    });
  } else {
    projectiles.push({
      x: e.x, y: e.y,
      vx: dirX * speed,
      vy: dirY * speed,
      dmg: e.dmg,
      range: 360,
      traveled: 0,
      owner: 'enemy',
      kind
    });
  }
}

// попадание по врагу
function hitEnemy(e, dmg) {
  e.hp -= dmg;
  createParticles(e.x, e.y, '#f97316', 10);
}

// === PROJECTILES ===
function updateProjectiles(dt) {
  projectiles = projectiles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const step = Math.hypot(p.vx * dt, p.vy * dt);
    p.traveled += step;
    if (p.traveled > p.range) return false;

    // столкновения
    if (p.owner === 'player') {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < e.radius + 6) {
          let dmg = p.dmg;
          hitEnemy(e, dmg);

          if (p.kind === 'fireball') {
            enemies.forEach(e2 => {
              const d2 = Math.hypot(e2.x - e.x, e2.y - e.y);
              if (d2 < (p.radius || 60)) hitEnemy(e2, dmg * 0.6);
            });
            createCircleWave(e.x, e.y, p.radius || 60, '#f97316');
          }

          if (e.hp <= 0) {
            onEnemyKilled(e);
            enemies.splice(i, 1);
          }
          return false;
        }
      }
    } else {
      // enemy projectiles -> player
      if (player) {
        const d = Math.hypot(p.x - player.x, p.y - player.y);
        if (d < player.radius + 6) {
          damagePlayer(p.dmg);
          if (p.kind === 'enemyAoE') {
            createCircleWave(player.x, player.y, p.radius || 80, '#f97373');
          }
          return false;
        }
      }
    }

    return true;
  });
}

// === PLAYER DAMAGE / DEATH ===
function damagePlayer(amount) {
  if (!player || player.invincibility > 0) return;
  // На низких уровнях входящий урон снижен
  if (player.level <= 2) amount *= 0.5;
  else if (player.level <= 4) amount *= 0.75;
  player.hp -= amount;
  // Небольшая неуязвимость после удара, чтобы не убивали за одну секунду
  player.invincibility = Math.max(player.invincibility, 0.6);
  createParticles(player.x, player.y, '#f97373', 12);
  if (player.hp <= 0) {
    player.hp = 0;
    gameState = 'dead';
    deathScreen.classList.remove('hidden');
  }
}

// при смерти врага
function onEnemyKilled(e) {
  killCount++;
  updateQuestProgress('kills', 1);
  player.xp += e.maxHp;
  checkLevelUp();
  dropLoot(e);
  if (e.type === 'boss') {
    updateQuestProgress('boss', 1);
    log('Босс пал! Мир стал немного безопаснее...', 'info');
  }
}

// === PARTICLES ===
function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI*2;
    const s = 60 + Math.random()*180;
    particles.push({
      x, y,
      vx: Math.cos(a)*s,
      vy: Math.sin(a)*s,
      life: 0.4,
      color
    });
  }
}

function updateParticles(dt) {
  particles = particles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vx *= 0.9;
    p.vy *= 0.9;
    return p.life > 0;
  });
}

// красивые эффекты
function createSlashArc(x, y, angle, radius, color) {
  particles.push({
    x, y,
    arc: true,
    angle,
    radius,
    life: 0.18,
    color
  });
}

function createCircleWave(x, y, radius, color) {
  particles.push({
    x, y,
    circle: true,
    radius,
    life: 0.35,
    color
  });
}

// === CAMERA ===
function updateCamera() {
  if (!player) return;
  camera.x = player.x;
  camera.y = player.y;
}

function screenToWorld(sx, sy) {
  return {
    x: camera.x - canvas.width/2 + sx,
    y: camera.y - canvas.height/2 + sy
  };
}

// === COLLISIONS: items pick-up ===
function checkCollisions() {
  if (!player) return;
  // items
  for (let i = items.length-1; i>=0; i--) {
    const it = items[i];
    const d = Math.hypot(it.x - player.x, it.y - player.y);
    if (d < 40) {
      addToInventory(it);
      lootCount++;
      updateQuestProgress('loot', 1);
      items.splice(i,1);
      log(`Поднят предмет: ${it.name}`, 'loot');
    }
  }

  // clamp in world
  player.x = Math.max(player.radius, Math.min(WORLD_WIDTH-player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT-player.radius, player.y));
}

// === ITEMS & INVENTORY ===
function makeItem(iconKey, name, slot, stats = {}, qty = 1, rarity = 'common', desc = '') {
  return { iconKey, name, slot, stats, qty, rarity, desc, id: Math.random().toString(36).slice(2) };
}

function addToInventory(item) {
  // стеки для зелий
  if (item.slot === 'consumable') {
    for (let i=0;i<player.inventory.length;i++) {
      const it = player.inventory[i];
      if (it && it.name === item.name && it.slot === item.slot && it.qty < 99) {
        const canAdd = Math.min(99 - it.qty, item.qty);
        it.qty += canAdd;
        item.qty -= canAdd;
        if (item.qty <= 0) {
          updateInventoryUI();
          return;
        }
      }
    }
  }

  for (let i=0;i<player.inventory.length;i++) {
    if (!player.inventory[i]) {
      player.inventory[i] = item;
      updateInventoryUI();
      return;
    }
  }
  log('Сумка переполнена!', 'dmg');
}

function onInventoryClick(index) {
  const item = player.inventory[index];
  if (!item) return;
  if (item.slot === 'consumable') {
    // зелье
    const heal = item.stats.heal || 40;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    item.qty--;
    if (item.qty <= 0) player.inventory[index] = null;
    log(`Вы использовали: ${item.name}`, 'info');
  } else if (item.slot === 'weapon' || item.slot === 'armor') {
    const slotName = item.slot;
    // swap
    const currently = player.equipment[slotName];
    player.equipment[slotName] = item;
    player.inventory[index] = currently || null;
    log(`Экипировано: ${item.name}`, 'info');
    recalcStats();
  }
  updateInventoryUI();
  updateStatsUI();
}

function recalcStats() {
  if (!player) return;
  const weapon = player.equipment.weapon?.stats || {};
  const armor = player.equipment.armor?.stats || {};

  const cls = CLASSES[player.class];
  player.baseDmg = cls.dmg + (weapon.dmg || 0);
  player.baseRange = cls.range + (weapon.range || 0);
  player.maxHp = cls.hp + (armor.hp || 0);
  if (player.hp > player.maxHp) player.hp = player.maxHp;
}

function updateInventoryUI() {
  const slots = document.querySelectorAll('#invSlots .slot');
  slots.forEach((slot, i) => {
    const item = player.inventory[i];
    slot.innerHTML = '';
    if (item) {
      const img = document.createElement('img');
      const emoji = ITEM_SPRITES[item.iconKey] || '📦';
      img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text x="4" y="30" font-size="28">${emoji}</text></svg>`;
      slot.appendChild(img);
      if (item.qty > 1) {
        const qty = document.createElement('div');
        qty.className = 'qty';
        qty.textContent = item.qty;
        slot.appendChild(qty);
      }
    }
  });
  // equip
  const equipSlots = { weapon: weaponSlotEl, armor: armorSlotEl };
  ['weapon','armor'].forEach(t => {
    const el = equipSlots[t];
    el.innerHTML = '';
    const item = player.equipment[t];
    if (item) {
      const img = document.createElement('img');
      const emoji = ITEM_SPRITES[item.iconKey] || '📦';
      img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text x="4" y="30" font-size="28">${emoji}</text></svg>`;
      el.appendChild(img);
    }
  });
  invCount.textContent = player.inventory.filter(Boolean).length;
}

// === QUESTS ===
function updateQuestProgress(type, amount) {
  let changed = false;
  quests.forEach(q => {
    if (q.type !== type || q.completed) return;
    q.progress += amount;
    if (q.progress >= q.target) {
      q.completed = true;
      log(`Квест завершён: ${q.title}`, 'loot');
      if (q.reward) {
        const rewardItem = makeItem(
          q.reward.type === 'staff' ? 'staff' :
          q.reward.type === 'bow' ? 'bow' :
          q.reward.type === 'armor' ? 'armor' :
          q.reward.type === 'sword' ? 'sword' : 'sword',
          q.reward.name,
          q.reward.slot,
          q.reward.stats,
          1,
          q.reward.rarity || 'rare',
          q.reward.desc || ''
        );
        addToInventory(rewardItem);
        log(`Награда: ${q.reward.name}`, 'loot');
      }
    }
    changed = true;
  });
  if (changed) updateQuestsUI();
}

function updateQuestsUI() {
  questList.innerHTML = '';
  quests.forEach(q => {
    const li = document.createElement('li');
    li.className = 'quest' + (q.completed ? ' completed' : '');
    li.innerHTML = `<div><strong>${q.title}</strong></div>
      <div>${q.desc}</div>
      <div>${Math.min(q.progress,q.target)} / ${q.target}</div>`;
    questList.appendChild(li);
  });
}

// === LEVELING & SKILLS ===
function checkLevelUp() {
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = Math.floor(player.xpToNext * 1.6);
    player.maxHp += 12;
    player.hp = player.maxHp;
    player.maxMp += 8;
    player.mp = player.maxMp;
    skillPoints++;
    log(`Новый уровень: ${player.level}`, 'info');

    if (player.level === 3 && !player.spec) {
      openSpecScreen();
    }
  }
}

function openSpecScreen() {
  const opts = SPECS[player.class] || [];
  const container = document.getElementById('spec-options');
  container.innerHTML = '';
  opts.forEach(opt => {
    const card = document.createElement('div');
    card.className = 'spec-card';
    card.innerHTML = `<strong>${opt.name}</strong><br><span>${opt.bonus}</span><br><small>${opt.desc}</small>`;
    card.addEventListener('click', () => {
      player.spec = opt;
      applySpecModifiers(opt.mods);
      specScreen.classList.add('hidden');
      log(`Вы выбрали специализацию: ${opt.name}`, 'info');
      updateStatsUI();
    });
    container.appendChild(card);
  });
  specScreen.classList.remove('hidden');
}

function applySpecModifiers(mods) {
  if (mods.maxHp) player.maxHp += mods.maxHp;
  if (mods.maxMp) player.maxMp += mods.maxMp;
  if (mods.dmgMult) player.baseDmg *= mods.dmgMult;
  if (mods.rangeMult) player.baseRange *= mods.rangeMult;
}

function unlockSkill(skillId) {
  if (skillPoints <= 0) return;
  if (player.skills[skillId]?.unlocked) return;
  player.skills[skillId] = { unlocked: true, cd: 0 };
  skillPoints--;
  updateSkillTreeUI();
}

function updateSkillTreeUI() {
  skillPointsEl.textContent = skillPoints;
  document.querySelectorAll('#skillTree .node').forEach(node => {
    const id = node.dataset.skill;
    const unlocked = !!(player.skills[id]?.unlocked);
    node.classList.toggle('unlocked', unlocked);
    node.classList.toggle('locked', !unlocked);
  });
}

// === SAVE / LOAD ===
function saveGame() {
  if (!player) return;
  const data = {
    player,
    quests,
    activeZoneId: activeZone?.id,
    killCount,
    lootCount,
    skillPoints
  };
  localStorage.setItem('eternalShardsSave', JSON.stringify(data));
  log('Игра сохранена', 'info');
}

function loadGame() {
  const raw = localStorage.getItem('eternalShardsSave');
  if (!raw) {
    log('Нет сохранения', 'dmg');
    return;
  }
  const data = JSON.parse(raw);
  // простой способ — взять нужные поля
  player = data.player;
  quests = data.quests || [];
  activeZone = findZone(data.activeZoneId) || ZONES[0];
  killCount = data.killCount || 0;
  lootCount = data.lootCount || 0;
  skillPoints = data.skillPoints || 0;

  enemies = [];
  items = [];
  projectiles = [];
  particles = [];
  spawnEnemiesForZone(activeZone, 8);

  gameState = 'playing';
  startScreen.classList.add('hidden');
  deathScreen.classList.add('hidden');

  log('Сохранение загружено', 'info');
  updateStatsUI();
  updateInventoryUI();
  updateQuestsUI();
}

function showItemTooltip(item, clientX, clientY) {
  if (!item) return;
  const rarity = item.rarity || 'common';
  const rarityClass = 'rarity-' + rarity;
  const statsLines = [];
  if (item.slot === 'weapon') {
    if (item.stats.dmg) statsLines.push('Урон: +' + item.stats.dmg);
    if (item.stats.range) statsLines.push('Дистанция: +' + item.stats.range);
    if (item.stats.speed) statsLines.push('Скорость атаки: +' + Math.round(item.stats.speed * 100) + '%');
  } else if (item.slot === 'armor') {
    if (item.stats.hp) statsLines.push('HP: +' + item.stats.hp);
  } else if (item.slot === 'consumable') {
    if (item.stats.heal) statsLines.push('Лечение: +' + item.stats.heal + ' HP');
  }
  tooltipEl.innerHTML = `
    <div class="item-name ${rarityClass}">${item.name}</div>
    <div style="font-size:10px;opacity:0.8;">Тип: ${item.slot}</div>
    ${item.desc ? `<div style="margin-top:4px;">${item.desc}</div>` : ''}
    ${statsLines.length ? `<div style="margin-top:4px;">${statsLines.join('<br>')}</div>` : ''}
  `;
  tooltipEl.style.display = 'block';
  const offset = 12;
  tooltipEl.style.left = (clientX + offset) + 'px';
  tooltipEl.style.top = (clientY + offset) + 'px';
}

function hideItemTooltip() {
  tooltipEl.style.display = 'none';
}

// === ZONES & PORTALS ===
function enterPortal(portal) {
  const targetZone = findZone(portal.zoneId);
  if (!targetZone || targetZone.id === activeZone.id) return;
  activeZone = targetZone;
  player.x = targetZone.spawn.x;
  player.y = targetZone.spawn.y;
  enemies = [];
  items = [];
  projectiles = [];
  particles = [];
  const count = targetZone.id === 'ruins' ? 12 : 8;
  spawnEnemiesForZone(targetZone, count);
  log(`Локация: ${targetZone.name}`, 'info');
}

// === UI BARS / STATS ===
function updateUIBars() {
  if (!player) return;
  hpBar.style.width = (player.hp / player.maxHp * 100) + '%';
  mpBar.style.width = (player.mp / player.maxMp * 100) + '%';
  xpBar.style.width = (player.xp / player.xpToNext * 100) + '%';
  hpText.textContent = `${Math.round(player.hp)}/${player.maxHp}`;
  mpText.textContent = `${Math.round(player.mp)}/${player.maxMp}`;
  xpText.textContent = `${player.xp}/${player.xpToNext}`;
}

function updateStatsUI() {
  if (!player) return;
  const cls = CLASSES[player.class];
  const specName = player.spec?.name || '—';
  charSummary.innerHTML = `
    <div>Раса: ${raceLabel(player.race)}</div>
    <div>Класс: ${cls.name}</div>
    <div>Специализация: ${specName}</div>
    <div>Ур.: ${player.level}</div>
  `;
  statsList.innerHTML = '';
  const rows = [
    ['HP', `${Math.round(player.hp)}/${player.maxHp}`],
    ['MP', `${Math.round(player.mp)}/${player.maxMp}`],
    ['Урон', `${Math.round(player.baseDmg)}`],
    ['Дистанция', `${Math.round(player.baseRange)}`],
    ['Скорость', player.speed.toFixed(1)],
    ['Убийства', killCount],
    ['Лут', lootCount]
  ];
  rows.forEach(([k,v]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${k}</span><span>${v}</span>`;
    statsList.appendChild(li);
  });
}

// === RENDER ===
function render() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // фон
  ctx.fillStyle = '#020617';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.save();
  ctx.translate(-camera.x + canvas.width/2, -camera.y + canvas.height/2);

  // зона фон
  if (activeZone) {
    ctx.fillStyle = activeZone.color;
    ctx.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  }

  // детали окружения (очень простые)
  drawEnvironment();

  // порталы
  portals.forEach(p => {
    const zone = findZone(p.zoneId);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(59,130,246,0.28)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.fillText(zone ? zone.name : '', p.x, p.y - p.radius - 6);
  });

  // предметы
  items.forEach(it => {
    ctx.font = '26px serif';
    const emoji = ITEM_SPRITES[it.iconKey] || '📦';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, it.x, it.y + 8);
  });

  // враги
  enemies.forEach(e => {
    const frames = enemySprites[e.type];
    if (frames && frames.length) {
      const frameIndex = Math.floor(animTime * 6) % frames.length;
      const sprite = frames[frameIndex];
      const size = e.type === 'boss' ? 56 : 36;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, e.x - size/2, e.y - size/2, size, size);
    } else {
      const emoji = ENEMY_SPRITES[e.type] || '👾';
      ctx.font = e.type === 'boss' ? '44px serif' : '32px serif';
      ctx.textAlign = 'center';
      ctx.fillText(emoji, e.x, e.y + 10);
    }
  });

  // остальной рендер
  ctx.restore();
  });

  // particles
  particles.forEach(p => {
    if (p.arc) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(p.life / 0.18, 0);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, p.angle - 0.8, p.angle + 0.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.circle) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(p.life / 0.35, 0);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 - p.life / 0.35), 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(p.life / 0.4, 0);
      ctx.fillRect(p.x-2, p.y-2, 4, 4);
      ctx.globalAlpha = 1;
    }
  });

  // player
  if (player) {
    ctx.imageSmoothingEnabled = false;
    const frames = playerSprites[player.class];
    if (frames && frames.length) {
      const moving = !!player.isMoving;
      const frameIndex = moving ? Math.floor(animTime * 8) % frames.length : 0;
      const sprite = frames[frameIndex];
      const size = 42;
      ctx.drawImage(sprite, player.x - size/2, player.y - size/2, size, size);
    } else {
      ctx.font = '34px serif';
      ctx.textAlign = 'center';
      const emoji = CLASS_SPRITES[player.class] || '🙂';
      ctx.fillText(emoji, player.x, player.y + 10);
    }

    if (player.invincibility > 0) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// окружение: деревья/камни/озеро условно
function drawEnvironment() {
  if (!activeZone) return;
  ctx.fillStyle = 'rgba(15,23,42,0.2)';
  // в зависимости от типа props — рисуем разные элементы
  if (activeZone.props === 'trees') {
    for (let x=200; x<WORLD_WIDTH; x+=260) {
      for (let y=180; y<WORLD_HEIGHT; y+=220) {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI*2);
        ctx.fill();
      }
    }
  } else if (activeZone.props === 'lake') {
    ctx.fillStyle = 'rgba(59,130,246,0.8)';
    ctx.beginPath();
    ctx.ellipse(WORLD_WIDTH*0.5, WORLD_HEIGHT*0.35, 220, 140, 0, 0, Math.PI*2);
    ctx.fill();
  } else if (activeZone.props === 'rocks') {
    ctx.fillStyle = '#111827';
    for (let i=0;i<40;i++) {
      const x = 400 + i*60 % WORLD_WIDTH;
      const y = 200 + (i*90 % WORLD_HEIGHT);
      ctx.beginPath();
      ctx.ellipse(x,y,20,14,Math.random(),0,Math.PI*2);
      ctx.fill();
    }
  }
}

// === START ===
init();
