import { WORLD, PLAYER_CLASSES, RARITY_COLORS } from './constants.js';
import { gameState, resetGameState } from './state.js';
import { buildPlayerSprites, createPlayer, updatePlayer, applyDamage, unlockBranchNode } from './player.js';
import { buildEnemySprites, spawnZoneEnemies, updateEnemies, damageEnemy, findEnemiesInRange } from './enemies.js';
import { buildWorld } from './world.js';
import { initQuests, updateQuest, getQuestData } from './quests.js';
import { pickupDrop, getInventoryData, equipItem, removeFromInventory, buildTooltip } from './items.js';
import { initRenderer, renderFrame } from './render.js';

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

let selectedClass = 'ranger';
let lastTime = 0;
let running = false;

function init() {
  canvas.width = 960;
  canvas.height = 540;
  buildWorld();
  initQuests();
  buildPlayerSprites();
  buildEnemySprites();
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
    const radius = payload.stats.arc || payload.stats.radius || 80;
    const enemies = findEnemiesInRange(payload.origin.x, payload.origin.y, radius);
    enemies.forEach(({ enemy }) => {
      damageEnemy(enemy, payload.stats.damage);
      updateQuest('kill', enemy.type, 1);
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
    });
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
      break;
  }
}

function updateProjectiles(dt) {
  const speedFactor = dt / 1000;
  gameState.projectiles.forEach(projectile => {
    projectile.position.x += projectile.velocity.x * speedFactor;
    projectile.position.y += projectile.velocity.y * speedFactor;
    if (projectile.owner === 'player') {
      gameState.enemies.forEach(enemy => {
        if (enemy.stats.hp <= 0) return;
        if (Math.hypot(enemy.position.x - projectile.position.x, enemy.position.y - projectile.position.y) <= (projectile.radius + 12)) {
          damageEnemy(enemy, projectile.damage);
          projectile.remove = true;
          if (projectile.explosion) {
            const affected = findEnemiesInRange(projectile.position.x, projectile.position.y, projectile.explosion.radius);
            affected.forEach(({ enemy: aoeEnemy }) => damageEnemy(aoeEnemy, projectile.damage * 0.75));
          }
        }
      });
    } else {
      const player = gameState.player;
      if (player && Math.hypot(player.position.x - projectile.position.x, player.position.y - projectile.position.y) <= (projectile.radius + 14)) {
        enemyStrike(projectile.source, player, 0);
        projectile.remove = true;
      }
    }
    if (projectile.position.x < 0 || projectile.position.x > WORLD.width || projectile.position.y < 0 || projectile.position.y > WORLD.height) {
      projectile.remove = true;
    }
  });
  gameState.projectiles = gameState.projectiles.filter(p => !p.remove);
}

function spawnProjectile(data) {
  gameState.projectiles.push({ ...data });
}

function spawnEnemyProjectile(enemy, dirX, dirY) {
  spawnProjectile({
    type: 'enemy-bolt',
    position: { ...enemy.position },
    velocity: { x: dirX * 280, y: dirY * 280 },
    damage: enemy.stats.damage,
    owner: 'enemy',
    radius: 8,
    source: enemy
  });
}

function enemyStrike(enemy, player, distance) {
  if (!enemy) return;
  const levelReduction = { 1: 0.8, 2: 0.85, 3: 0.9 };
  const reduction = levelReduction[player.level] || 1;
  const amount = enemy.stats.damage * reduction;
  applyDamage(amount, enemy);
}

function bossPhase(enemy, phase) {
  log(`Босс вошёл в фазу ${enemy.phase}`);
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
    slot.className = 'slot';
    slot.dataset.index = index;
    slot.innerHTML = `<span>${item.icon}</span><div class="rarity" style="background:${RARITY_COLORS[item.rarity]}"></div>`;
    slot.addEventListener('click', () => equipFromInventory(index));
    slot.addEventListener('mouseenter', evt => showTooltip(item, evt));
    slot.addEventListener('mouseleave', hideTooltip);
    ui.invSlots.appendChild(slot);
  });
  ui.invCount.textContent = items.length;
  ui.weaponSlot.innerHTML = equipment.weapon ? equipment.weapon.icon : '';
  ui.armorSlot.innerHTML = equipment.armor ? equipment.armor.icon : '';
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
    const progress = quest.count ? Math.min(quest.progress, quest.count) : quest.progress;
    const total = quest.count || '-';
    li.innerHTML = `<strong>${quest.id}</strong> — ${quest.completed ? '✔️' : `${progress}/${total}`}`;
    ui.questList.appendChild(li);
  });
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

function saveGame() {
  if (!gameState.player) return;
  const data = {
    player: gameState.player,
    enemies: [],
    inventory: getInventoryData().items,
    equipment: getInventoryData().equipment,
    quests: getQuestData(),
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
  const player = createPlayer(data.player.classId, data.player.race);
  Object.assign(player.stats, data.player.stats);
  player.level = data.player.level;
  player.xp = data.player.xp;
  player.xpToNext = data.player.xpToNext;
  player.position = data.player.position;
  player.inventory = data.inventory || [];
  player.equipment = data.equipment || {};
  if (data.quests) {
    gameState.quests = data.quests;
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

window.addEventListener('load', init);

