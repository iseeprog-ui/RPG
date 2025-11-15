import { WORLD, PLAYER_CLASSES, RARITY_COLORS } from './constants.js';
import { gameState, resetGameState } from './state.js';
import { createPlayer, updatePlayer, applyDamage, unlockBranchNode } from './player.js';
import { spawnZoneEnemies, updateEnemies, damageEnemy, findEnemiesInRange } from './enemies.js';
import { buildWorld } from './world.js';
import { initQuests, updateQuest, getQuestData } from './quests.js';
import { pickupDrop, getInventoryData, equipItem, removeFromInventory, buildTooltip } from './items.js';
import { initRenderer, renderFrame } from './render.js';
import { buildSpriteAtlases, getProjectileAnimator, createFxAnimator } from '../assets/sprites.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const ui = {
  log: document.getElementById('log'),
  hpBar: document.getElementById('hp-bar'),
  mpBar: document.getElementById('mp-bar'),
  xpBar: document.getElementById('xp-bar'),
  hpText: document.getElementById('hp-text'),
  mpText: document.getElementById('mp-text'),
  xpText: document.getElementById('xp-text'),
  charSummary: document.getElementById('char-summary'),
  statsList: document.getElementById('stats-list'),
  invSlots: document.getElementById('invSlots'),
  invCount: document.getElementById('inv-count'),
  weaponSlot: document.getElementById('weaponSlot'),
  armorSlot: document.getElementById('armorSlot'),
  questList: document.getElementById('quest-list'),
  portalHint: document.getElementById('portal-hint'),
  skillTree: document.getElementById('skillTree'),
  skillPoints: document.getElementById('skillPoints'),
  tooltip: document.getElementById('tooltip'),
  startScreen: document.getElementById('start-screen'),
  specScreen: document.getElementById('spec-screen'),
  deathScreen: document.getElementById('death-screen'),
  startBtn: document.getElementById('start-btn'),
  classGrid: document.getElementById('class-grid'),
  raceSelect: document.getElementById('race-select'),
  specSkip: document.getElementById('spec-skip-btn'),
  restartBtn: document.getElementById('restart-btn'),
  skillTreeBtn: document.getElementById('skillTreeBtn'),
  closeSkillTree: document.getElementById('closeSkillTree'),
  saveBtn: document.getElementById('save-btn'),
  loadBtn: document.getElementById('load-btn'),
  newCharacter: document.getElementById('new-character')
};

const RARITY_NAMES = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
};

const ZONE_NAMES = {
  forest: 'Лес',
  lake: 'Озеро',
  ruins: 'Руины'
};

let selectedClass = 'ranger';
let lastTime = 0;
let running = false;

function init() {
  canvas.width = 960;
  canvas.height = 540;
  buildWorld();
  initQuests();
  buildSpriteAtlases();
  initRenderer(canvas, ctx, ui);
  bindUI();
  bindInput();
  window.addEventListener('questCompleted', saveGame);
  updateTabs();
  requestAnimationFrame(loop);
}

function bindUI() {
  ui.classGrid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedClass = btn.dataset.class;
      ui.classGrid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  ui.startBtn.addEventListener('click', () => {
    startGame(selectedClass, ui.raceSelect.value);
  });
  ui.skillTreeBtn.addEventListener('click', () => {
    ui.skillTree.classList.remove('hidden');
    refreshSkillTree();
  });
  ui.closeSkillTree.addEventListener('click', () => {
    ui.skillTree.classList.add('hidden');
  });
  ui.saveBtn.addEventListener('click', saveGame);
  ui.loadBtn.addEventListener('click', loadGame);
  ui.newCharacter.addEventListener('click', () => {
    localStorage.removeItem('rpg-save');
    resetGameState();
    buildWorld();
    initQuests();
    ui.startScreen.classList.remove('hidden');
    running = false;
    log('Создан новый персонаж.');
  });
  ui.restartBtn.addEventListener('click', () => {
    resetGameState();
    ui.startScreen.classList.remove('hidden');
    ui.deathScreen.classList.add('hidden');
    running = false;
  });
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      updateTabs(tab.dataset.tab);
    });
  });
  ui.invSlots.addEventListener('mousemove', handleTooltip);
  ui.invSlots.addEventListener('mouseleave', () => ui.tooltip.style.display = 'none');
}

function bindInput() {
  window.addEventListener('keydown', e => {
    gameState.input.keys[e.code] = true;
    if (e.code === 'KeyE') {
      attemptPortal();
    } else if (e.code === 'KeyF') {
      gameState.ui.lootFilter = gameState.ui.lootFilter === 'common' ? 'rare' : 'common';
      log(`Фильтр лута: ${gameState.ui.lootFilter === 'common' ? 'Все' : 'Только редкие+'}`);
    }
  });
  window.addEventListener('keyup', e => {
    gameState.input.keys[e.code] = false;
  });
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    gameState.input.mouse.x = e.clientX - rect.left + gameState.camera.x - canvas.width / 2;
    gameState.input.mouse.y = e.clientY - rect.top + gameState.camera.y - canvas.height / 2;
  });
  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) gameState.input.mouse.left = true;
    if (e.button === 2) gameState.input.mouse.right = true;
  });
  canvas.addEventListener('mouseup', e => {
    if (e.button === 0) gameState.input.mouse.left = false;
    if (e.button === 2) gameState.input.mouse.right = false;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function startGame(cls, race) {
  resetGameState();
  buildWorld();
  initQuests();
  const player = createPlayer(cls, race);
  gameState.activeZone = 'forest';
  spawnZoneEnemies('forest', 6);
  running = true;
  ui.startScreen.classList.add('hidden');
  log(`Выбран класс: ${PLAYER_CLASSES[cls].label}`);
}

function update(dt) {
  if (!running || !gameState.player) return;
  updatePlayer(dt, {
    onAttack: resolvePlayerAttack,
    onSkill: resolvePlayerSkill
  });
  updateProjectiles(dt);
  updateParticles(dt);
  updateEnemies(dt, {
    onEnemyShoot: spawnEnemyProjectile,
    onEnemyStrike: enemyStrike,
    onBossPhase: bossPhase
  });
  resolveCollisions();
  gameState.time += dt;
  updateUI();
  if (gameState.player.stats.hp <= 0) {
    running = false;
    ui.deathScreen.classList.remove('hidden');
  }
}

function resolvePlayerAttack(payload) {
  if (payload.type === 'arc' || payload.type === 'spin') {
    const radius = payload.stats.range || payload.stats.radius || 80;
    const arc = payload.type === 'spin'
      ? Math.PI * 2
      : (payload.stats.arc || 90) * Math.PI / 180;
    spawnSwingEffect(payload.origin, payload.facing, radius, arc);
    const enemies = findEnemiesInRange(payload.origin.x, payload.origin.y, radius);
    enemies.forEach(({ enemy }) => {
      damageEnemy(enemy, payload.stats.damage);
      updateQuest('kill', enemy.type, 1);
      spawnImpactEffect(enemy.position, 'rgba(255,255,255,0.35)', 20);
    });
  } else if (payload.type === 'arrow' || payload.type === 'orb') {
    spawnProjectile({
      type: payload.type,
      position: { ...payload.origin },
      velocity: {
        x: Math.cos(payload.facing) * (payload.stats.projectileSpeed || 380),
        y: Math.sin(payload.facing) * (payload.stats.projectileSpeed || 380)
      },
      damage: payload.stats.damage,
      owner: 'player',
      radius: 6
    });
  } else if (payload.type === 'dash') {
    const distance = payload.stats.dash || 120;
    gameState.player.position.x += Math.cos(payload.facing) * distance;
    gameState.player.position.y += Math.sin(payload.facing) * distance;
    const enemies = findEnemiesInRange(gameState.player.position.x, gameState.player.position.y, 70);
    enemies.forEach(({ enemy }) => {
      damageEnemy(enemy, payload.stats.damage);
      spawnImpactEffect(enemy.position, 'rgba(167,139,250,0.45)', 22);
    });
    spawnImpactEffect(gameState.player.position, 'rgba(167,139,250,0.35)', 26);
  }
}

function resolvePlayerSkill(skill) {
  if (!skill) return;
  switch (skill.id) {
    case 'multiShot':
      for (let i = 0; i < skill.projectiles; i++) {
        const angle = skill.facing + ((i - (skill.projectiles - 1) / 2) * skill.spread * Math.PI / 180);
        spawnProjectile({
          type: 'arrow',
          position: { ...skill.origin },
          velocity: { x: Math.cos(angle) * 420, y: Math.sin(angle) * 420 },
          damage: gameState.player.stats.damage * 0.9,
          owner: 'player',
          radius: 6
        });
      }
      break;
    case 'fireball':
      spawnProjectile({
        type: 'fireball',
        position: { ...skill.origin },
        velocity: { x: Math.cos(skill.facing) * 320, y: Math.sin(skill.facing) * 320 },
        damage: skill.damage,
        owner: 'player',
        radius: 22,
        explosion: { radius: skill.radius }
      });
      break;
    case 'powerStrike':
      const enemies = findEnemiesInRange(skill.origin.x, skill.origin.y, skill.arc);
      enemies.forEach(({ enemy }) => damageEnemy(enemy, skill.damage));
      spawnSwingEffect(skill.origin, skill.facing, skill.arc, Math.PI * 0.9);
      break;
    case 'rage':
      gameState.player.stats.damage *= skill.damageMult;
      gameState.player.stats.moveSpeed *= skill.speedMult;
      setTimeout(() => {
        gameState.player.stats.damage /= skill.damageMult;
        gameState.player.stats.moveSpeed /= skill.speedMult;
      }, skill.duration);
      break;
    case 'shadowStep':
      gameState.player.position.x += Math.cos(skill.facing) * skill.dash;
      gameState.player.position.y += Math.sin(skill.facing) * skill.dash;
      const targetEnemies = findEnemiesInRange(gameState.player.position.x, gameState.player.position.y, 90);
      targetEnemies.forEach(({ enemy }) => damageEnemy(enemy, skill.damage));
      spawnImpactEffect(gameState.player.position, 'rgba(99,102,241,0.45)', 28);
      break;
  }
}

function updateProjectiles(dt) {
  const speedFactor = dt / 1000;
  gameState.projectiles.forEach(projectile => {
    projectile.life = (projectile.life || 0) + dt;
    projectile.rotation = Math.atan2(projectile.velocity?.y || 0, projectile.velocity?.x || 1);
    projectile.scale = 1 + Math.sin((projectile.life || 0) / 160) * 0.08;
    if (projectile.animator) {
      projectile.animator.update(dt);
    }
    if (projectile.trailColor) {
      projectile.trailTimer = (projectile.trailTimer || 0) - dt;
      if (projectile.trailTimer <= 0) {
        spawnTrailEffect(projectile.position, projectile.trailColor);
        projectile.trailTimer = projectile.trailInterval || 70;
      }
    }
    projectile.position.x += projectile.velocity.x * speedFactor;
    projectile.position.y += projectile.velocity.y * speedFactor;
    if (projectile.owner === 'player') {
      gameState.enemies.forEach(enemy => {
        if (enemy.stats.hp <= 0) return;
        if (Math.hypot(enemy.position.x - projectile.position.x, enemy.position.y - projectile.position.y) <= (projectile.radius + 12)) {
          damageEnemy(enemy, projectile.damage);
          projectile.remove = true;
          spawnImpactEffect(projectile.position, 'rgba(255,255,255,0.4)', 18);
          if (projectile.explosion) {
            const affected = findEnemiesInRange(projectile.position.x, projectile.position.y, projectile.explosion.radius);
            affected.forEach(({ enemy: aoeEnemy }) => damageEnemy(aoeEnemy, projectile.damage * 0.75));
            spawnImpactEffect(projectile.position, 'rgba(248,113,113,0.45)', projectile.explosion.radius * 0.6);
          }
        }
      });
    } else {
      const player = gameState.player;
      if (player && Math.hypot(player.position.x - projectile.position.x, player.position.y - projectile.position.y) <= (projectile.radius + 14)) {
        enemyStrike(projectile.source, player, 0);
        projectile.remove = true;
        spawnImpactEffect(projectile.position, 'rgba(248,113,113,0.45)', 20);
      }
    }
    if (projectile.position.x < 0 || projectile.position.x > WORLD.width || projectile.position.y < 0 || projectile.position.y > WORLD.height) {
      projectile.remove = true;
    }
  });
  gameState.projectiles = gameState.projectiles.filter(p => !p.remove);
}

function spawnProjectile(data) {
  const projectile = {
    ...data,
    life: 0,
    rotation: Math.atan2(data.velocity?.y || 0, data.velocity?.x || 1),
    scale: 1,
    trailTimer: data.trailInterval || 0
  };
  if (!projectile.radius) projectile.radius = 6;
  if (projectile.type === 'arrow') {
    projectile.trailColor = 'rgba(250,204,21,0.35)';
    projectile.trailInterval = 55;
  } else if (projectile.type === 'fireball') {
    projectile.trailColor = 'rgba(248,113,113,0.35)';
    projectile.trailInterval = 45;
  } else if (projectile.type === 'orb') {
    projectile.trailColor = 'rgba(129,140,248,0.4)';
    projectile.trailInterval = 60;
  } else if (projectile.type === 'enemy-bolt') {
    projectile.trailColor = 'rgba(248,113,113,0.28)';
    projectile.trailInterval = 80;
  }
  projectile.animator = getProjectileAnimator(projectile.type);
  if (projectile.animator) projectile.animator.reset();
  gameState.projectiles.push(projectile);
}

function spawnEnemyProjectile(enemy, dirX, dirY, options = {}) {
  const baseType = options.projectile || enemy.projectile || 'enemy-bolt';
  const baseSpeed = options.speed || 280;
  const pattern = options.pattern || 'single';
  const baseAngle = Math.atan2(dirY, dirX);
  const count = pattern === 'volley' ? (options.count || 3) : 1;
  const spread = ((options.spread || 12) * Math.PI) / 180;
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
    const angle = baseAngle + offset;
    spawnProjectile({
      type: baseType,
      position: { ...enemy.position },
      velocity: { x: Math.cos(angle) * baseSpeed, y: Math.sin(angle) * baseSpeed },
      damage: enemy.stats.damage,
      owner: 'enemy',
      radius: baseType === 'boulder' ? 14 : 8,
      source: enemy
    });
  }
}

function enemyStrike(enemy, player, distance) {
  if (!enemy || !player) return;
  const levelReduction = { 1: 0.7, 2: 0.8, 3: 0.9 };
  const reduction = levelReduction[player.level] || 1;
  const amount = enemy.stats.damage * reduction;
  applyDamage(amount, enemy);
  spawnImpactEffect(player.position, 'rgba(248,113,113,0.45)', 26);
}

function bossPhase(enemy, phase) {
  log(`Босс вошёл в фазу ${enemy.phase}`);
  gameState.camera.flash = 220;
  spawnImpactEffect(enemy.position, 'rgba(248,113,113,0.4)', 48);
}

function resolveCollisions() {
  const player = gameState.player;
  if (!player) return;
  gameState.drops.forEach(drop => {
    const dist = Math.hypot(drop.position.x - player.position.x, drop.position.y - player.position.y);
    if (dist <= 24) {
      if (pickupDrop(drop.id)) {
        log(`Поднят предмет: ${drop.item.name}`);
      }
    }
  });
}

function attemptPortal() {
  const player = gameState.player;
  if (!player) return;
  const portal = gameState.portals.find(p => Math.hypot(p.position.x - player.position.x, p.position.y - player.position.y) < 48);
  if (!portal) return;
  gameState.activeZone = portal.to;
  gameState.enemies = [];
  spawnZoneEnemies(portal.to, portal.to === 'ruins' ? 8 : 6);
  const rect = gameState.map.data.zones[portal.to].rect;
  player.position = { x: (rect.x + rect.w / 2) * WORLD.tileSize, y: (rect.y + rect.h / 2) * WORLD.tileSize };
  log(`Телепорт в зону: ${portal.to}`);
  updateQuest('discover', `portal-${portal.from}-${portal.to}`, 1);
  saveGame();
}

function updateUI() {
  const player = gameState.player;
  if (!player) return;
  ui.hpBar.style.width = `${(player.stats.hp / player.stats.maxHp) * 100}%`;
  ui.mpBar.style.width = `${(player.stats.mp / player.stats.maxMp) * 100}%`;
  ui.xpBar.style.width = `${(player.xp / player.xpToNext) * 100}%`;
  ui.hpText.textContent = `${Math.round(player.stats.hp)}/${player.stats.maxHp}`;
  ui.mpText.textContent = `${Math.round(player.stats.mp)}/${player.stats.maxMp}`;
  ui.xpText.textContent = `${player.xp}/${player.xpToNext}`;
  ui.charSummary.textContent = `${PLAYER_CLASSES[player.classId].label} • Ур. ${player.level}`;
  ui.statsList.innerHTML = '';
  addStat(`Урон`, player.stats.damage);
  addStat(`MP`, player.stats.maxMp);
  addStat(`Крит`, `${Math.round(player.stats.crit * 100)}%`);
  addStat(`Лут`, gameState.stats.lootCount);
  renderInventory();
  renderQuests();
  flushLog();
  const portalNearby = gameState.portals.some(p => Math.hypot(p.position.x - player.position.x, p.position.y - player.position.y) < 48);
  if (portalNearby) {
    ui.portalHint.classList.remove('hidden');
  } else {
    ui.portalHint.classList.add('hidden');
  }
}

function addStat(label, value) {
  const li = document.createElement('li');
  li.textContent = `${label}: ${typeof value === 'number' ? Math.round(value) : value}`;
  ui.statsList.appendChild(li);
}

function renderInventory() {
  const { items, equipment } = getInventoryData();
  ui.invSlots.innerHTML = '';
  items.forEach((item, index) => {
    const slot = document.createElement('div');
    slot.className = `slot slot-${item.rarity}`;
    slot.dataset.index = index;
    slot.innerHTML = `<span class="item-icon">${item.icon}</span><div class="rarity-dot" style="background:${RARITY_COLORS[item.rarity]}"></div>`;
    slot.addEventListener('click', () => equipFromInventory(index));
    slot.addEventListener('mouseenter', evt => showTooltip(item, evt));
    slot.addEventListener('mouseleave', hideTooltip);
    ui.invSlots.appendChild(slot);
  });
  ui.invCount.textContent = items.length;
  ui.weaponSlot.className = `slot equip-slot ${equipment.weapon ? 'slot-' + equipment.weapon.rarity : ''}`;
  ui.weaponSlot.innerHTML = equipment.weapon ? `<span class="item-icon">${equipment.weapon.icon}</span>` : '';
  ui.armorSlot.className = `slot equip-slot ${equipment.armor ? 'slot-' + equipment.armor.rarity : ''}`;
  ui.armorSlot.innerHTML = equipment.armor ? `<span class="item-icon">${equipment.armor.icon}</span>` : '';
}

function equipFromInventory(index) {
  const item = removeFromInventory(index);
  if (!item) return;
  equipItem(item);
  log(`Экипировано: ${item.name}`);
}

function renderQuests() {
  ui.questList.innerHTML = '';
  getQuestData().forEach(quest => {
    const li = document.createElement('li');
    li.className = `quest ${quest.completed ? 'completed' : 'active'}`;
    const target = quest.count ?? ((quest.type === 'boss' || quest.type === 'discover') ? 1 : null);
    const current = target !== null ? Math.min(quest.progress, target) : quest.progress;
    const progressText = quest.completed ? '✔️' : target !== null ? `${current}/${target}` : `${current}`;
    const statusText = quest.completed ? 'Завершён' : 'Активен';
    li.innerHTML = `
      <div class="quest-header">
        <span class="quest-title">${quest.name || quest.id}</span>
        <span class="quest-status">${statusText}</span>
      </div>
      <div class="quest-meta">${ZONE_NAMES[quest.zone] || quest.zone}</div>
      <div class="quest-progress">Прогресс: ${progressText}</div>
      <div class="quest-reward">Награда: ${formatQuestReward(quest.reward)}</div>
    `;
    ui.questList.appendChild(li);
  });
}

function formatQuestReward(reward = {}) {
  const parts = [];
  if (reward.xp) parts.push(`${reward.xp} XP`);
  if (reward.gold) parts.push(`${reward.gold} золота`);
  if (reward.item) parts.push(`${RARITY_NAMES[reward.item] || reward.item} предмет`);
  if (reward.legendary) parts.push('Легендарный предмет');
  return parts.length ? parts.join(' • ') : '—';
}

function flushLog() {
  while (gameState.ui.log.length) {
    const msg = gameState.ui.log.shift();
    const div = document.createElement('div');
    div.textContent = msg;
    ui.log.appendChild(div);
    ui.log.scrollTop = ui.log.scrollHeight;
  }
}

function log(message) {
  gameState.ui.log.push(message);
}

function loop(time) {
  const dt = time - lastTime;
  lastTime = time;
  gameState.delta = dt;
  update(dt);
  renderFrame();
  requestAnimationFrame(loop);
}

function serializePlayer(player) {
  if (!player) return null;
  const clone = {
    classId: player.classId,
    race: player.race,
    level: player.level,
    xp: player.xp,
    xpToNext: player.xpToNext,
    stats: JSON.parse(JSON.stringify(player.stats)),
    resources: JSON.parse(JSON.stringify(player.resources)),
    derived: {
      cooldown: player.derived.cooldown,
      skillCooldown: player.derived.skillCooldown
    },
    position: { ...player.position },
    specialization: player.specialization,
    branches: Object.fromEntries(
      Object.entries(player.branches || {}).map(([branchId, nodes]) => [branchId, Array.from(nodes || [])])
    ),
    talents: Array.from(player.talents || []),
    effects: { aura: player.effects?.aura || null }
  };
  return clone;
}

function serializeStats(stats) {
  return {
    skillPoints: stats.skillPoints,
    killCount: stats.killCount,
    lootCount: stats.lootCount,
    gold: stats.gold
  };
}

function cloneItems(list) {
  return (list || []).map(item => JSON.parse(JSON.stringify(item)));
}

function cloneEquipment(equipment) {
  const clone = {};
  Object.entries(equipment || {}).forEach(([slot, item]) => {
    clone[slot] = item ? JSON.parse(JSON.stringify(item)) : null;
  });
  return clone;
}

function saveGame() {
  if (!gameState.player) return;
  const data = {
    player: serializePlayer(gameState.player),
    inventory: cloneItems(getInventoryData().items),
    equipment: cloneEquipment(getInventoryData().equipment),
    quests: getQuestData().map(quest => JSON.parse(JSON.stringify(quest))),
    stats: serializeStats(gameState.stats),
    zone: gameState.activeZone
  };
  localStorage.setItem('rpg-save', JSON.stringify(data));
  log('Прогресс сохранён');
}

function loadGame() {
  const raw = localStorage.getItem('rpg-save');
  if (!raw) return;
  const data = JSON.parse(raw);
  resetGameState();
  buildWorld();
  initQuests();
  const savedPlayer = data.player;
  const player = createPlayer(savedPlayer?.classId || 'ranger', savedPlayer?.race || 'human');
  if (savedPlayer) {
    Object.assign(player.stats, savedPlayer.stats || {});
    Object.assign(player.resources, savedPlayer.resources || {});
    player.level = savedPlayer.level || player.level;
    player.xp = savedPlayer.xp || 0;
    player.xpToNext = savedPlayer.xpToNext || player.xpToNext;
    player.position = savedPlayer.position ? { ...savedPlayer.position } : player.position;
    player.derived.cooldown = savedPlayer.derived?.cooldown || 0;
    player.derived.skillCooldown = savedPlayer.derived?.skillCooldown || 0;
    player.specialization = savedPlayer.specialization || player.specialization;
    player.branches = {};
    Object.entries(savedPlayer.branches || {}).forEach(([branchId, nodes]) => {
      player.branches[branchId] = Array.isArray(nodes) ? [...nodes] : [];
    });
    player.talents = new Set(savedPlayer.talents || []);
    player.effects = { ...(player.effects || {}), aura: savedPlayer.effects?.aura || null };
  }
  player.inventory = cloneItems(data.inventory);
  player.equipment = cloneEquipment(data.equipment);
  if (data.quests) {
    gameState.quests = data.quests;
  }
  if (data.stats) {
    gameState.stats = { ...gameState.stats, ...data.stats };
  }
  gameState.activeZone = data.zone || 'forest';
  spawnZoneEnemies(gameState.activeZone, 6);
  ui.startScreen.classList.add('hidden');
  running = true;
  log('Прогресс загружен');
}

function updateTabs(activeId = 'stats') {
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
  });
  const active = document.getElementById(`tab-${activeId}`);
  if (active) active.classList.remove('hidden');
}

function refreshSkillTree() {
  ui.skillPoints.textContent = gameState.stats.skillPoints;
  ui.skillTree.querySelectorAll('.node').forEach(node => {
    node.addEventListener('click', () => {
      if (gameState.stats.skillPoints <= 0) return;
      if (unlockBranchNode(gameState.player.specialization || 'fire', node.dataset.skill)) {
        gameState.stats.skillPoints -= 1;
        log(`Изучен навык ${node.dataset.skill}`);
        refreshSkillTree();
      }
    });
  });
}

function handleTooltip(evt) {
  const target = evt.target.closest('.slot');
  if (!target) {
    ui.tooltip.style.display = 'none';
    return;
  }
  const index = Number(target.dataset.index);
  const item = getInventoryData().items[index];
  if (!item) return;
  showTooltip(item, evt);
}

function showTooltip(item, evt) {
  ui.tooltip.innerHTML = buildTooltip(item);
  ui.tooltip.style.display = 'block';
  ui.tooltip.style.left = `${evt.clientX + 16}px`;
  ui.tooltip.style.top = `${evt.clientY + 16}px`;
}

function hideTooltip() {
  ui.tooltip.style.display = 'none';
}

function spawnSwingEffect(origin, angle, radius = 80, arc = Math.PI / 1.4) {
  if (!origin) return;
  const animator = createFxAnimator('swing');
  if (animator) {
    animator.reset();
    gameState.particles.push({
      type: 'sprite',
      animator,
      position: { ...origin },
      rotation: angle,
      scale: radius / 80,
      layer: 'front',
      life: 0,
      ttl: WORLD.meleeSwingDuration
    });
  }
}

function spawnImpactEffect(position, color, radius = 24) {
  if (!position) return;
  gameState.particles.push({
    type: 'impact',
    position: { x: position.x, y: position.y },
    radius,
    color,
    life: 0,
    ttl: 260,
    layer: 'front'
  });
}

function spawnTrailEffect(position, color) {
  if (!position || !color) return;
  gameState.particles.push({
    type: 'trail',
    position: { x: position.x, y: position.y },
    color,
    life: 0,
    ttl: 200,
    layer: 'front'
  });
}

function updateParticles(dt) {
  const player = gameState.player;
  gameState.particles.forEach(effect => {
    effect.life = (effect.life || 0) + dt;
    if (effect.animator) {
      effect.animator.update(dt);
    }
    if (!effect.triggered && effect.delay != null && effect.life >= effect.delay) {
      effect.triggered = true;
      if ((effect.type === 'aoe' || effect.type === 'meteor') && player) {
        const dist = Math.hypot(player.position.x - effect.position.x, player.position.y - effect.position.y);
        if (dist <= (effect.radius || 0) + 24) {
          applyDamage(effect.damage || 20, effect.owner || null);
          spawnImpactEffect(effect.position, effect.outline || effect.color || 'rgba(248,113,113,0.6)', effect.radius || 24);
        }
        gameState.camera.shake = Math.max(gameState.camera.shake, WORLD.hitShake + 4);
      }
    }
  });
  gameState.particles = gameState.particles.filter(effect => {
    if (effect.animator && effect.animator.finished) return false;
    return effect.life < (effect.ttl || 0);
  });
}

window.addEventListener('load', init);

