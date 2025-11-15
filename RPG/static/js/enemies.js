import { ENEMIES, ZONES, WORLD } from './constants.js';
import { gameState } from './state.js';
import { gainExperience, setAura } from './player.js';
import { dropLoot } from './items.js';
import { updateQuest } from './quests.js';

const enemySprites = {};

const ENEMY_COLORS = {
  brute: { body: '#16a34a', accent: '#052e16' },
  shaman: { body: '#a855f7', accent: '#312e81' },
  archer: { body: '#9ca3af', accent: '#1f2937' },
  boss: { body: '#f97316', accent: '#7c2d12' }
};

export function buildEnemySprites() {
  const size = 30;
  Object.keys(ENEMIES).forEach(type => {
    enemySprites[type] = {
      idle: buildEnemyAnimation(type, 'idle', size, type === 'boss' ? 6 : 4),
      move: buildEnemyAnimation(type, 'move', size, type === 'boss' ? 8 : 6),
      attack: buildEnemyAnimation(type, 'attack', size, type === 'boss' ? 6 : 4),
      death: buildEnemyAnimation(type, 'death', size, 6),
      spawn: type === 'boss' ? buildEnemyAnimation(type, 'spawn', size, 6) : null
    };
  });
}

function buildEnemyAnimation(type, animation, size, length) {
  const frames = [];
  for (let i = 0; i < length; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawEnemyFrame(ctx, type, animation, i, size, length);
    frames.push(canvas);
  }
  return frames;
}

function drawEnemyFrame(ctx, type, animation, frame, size, length) {
  const colors = ENEMY_COLORS[type];
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(15,23,42,0.65)';
  ctx.fillRect(6, 26, 18, 4);
  const wobble = animation === 'idle'
    ? Math.sin((frame / Math.max(1, length - 1)) * Math.PI * 2) * 1.5
    : animation === 'move'
      ? Math.cos((frame / Math.max(1, length)) * Math.PI * 2) * 2
      : 0;
  ctx.fillStyle = colors.body;
  if (type === 'boss') {
    drawBossFrame(ctx, animation, frame, length, colors);
    return;
  }
  ctx.fillRect(10, 6 + wobble, 12, 12);
  ctx.fillRect(12, 4 + wobble, 8, 6);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(8, 18 + wobble, 6, 8);
  ctx.fillRect(16, 18 + wobble, 6, 8);
  if (animation === 'attack') {
    ctx.fillStyle = '#f8fafc';
    const swing = frame / Math.max(1, length - 1);
    ctx.fillRect(4 + swing * 10, 10, 8 + swing * 4, 4);
  }
  if (type === 'shaman') {
    ctx.fillStyle = 'rgba(192,132,252,0.6)';
    ctx.beginPath();
    ctx.arc(16, 6 + wobble, 4 + frame % 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (animation === 'death') {
    ctx.globalAlpha = Math.max(0, 1 - frame * 0.18);
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.fillRect(8, 16 + frame, 14, 6);
  }
}

function drawBossFrame(ctx, animation, frame, length, colors) {
  const wobble = Math.sin(frame / Math.max(1, length) * Math.PI * 2) * 1.8;
  ctx.fillStyle = colors.body;
  const scale = animation === 'spawn' ? (frame + 1) / length : 1;
  const height = 16 * scale;
  const width = 16 * scale;
  ctx.fillRect(8 + (1 - scale) * 8, 6 + wobble + (1 - scale) * 6, width, height);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(6 + (1 - scale) * 10, 18 + wobble, 6, 9);
  ctx.fillRect(18 - (1 - scale) * 6, 18 + wobble, 6, 9);
  ctx.fillStyle = '#fee2e2';
  ctx.fillRect(12, 4 + wobble, 12, 6);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(12, 2 + wobble, 8, 3);
  ctx.fillStyle = 'rgba(248,113,113,0.6)';
  ctx.beginPath();
  ctx.arc(16, 10 + wobble, 6 + Math.sin(frame) * 0.8, 0, Math.PI * 2);
  ctx.fill();
  if (animation === 'attack') {
    ctx.strokeStyle = 'rgba(251,113,133,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(16, 14 + wobble, 10, frame * 0.4, frame * 0.4 + Math.PI / 1.2);
    ctx.stroke();
  }
  if (animation === 'death') {
    ctx.globalAlpha = Math.max(0, 1 - frame * 0.18);
    ctx.fillStyle = 'rgba(248,250,252,0.2)';
    ctx.fillRect(6, 14 + frame * 1.5, 20, 6);
  }
}

export function spawnZoneEnemies(zoneId, count = 6) {
  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) return;
  const rect = gameState.map.data.zones[zoneId].rect;
  for (let i = 0; i < count; i++) {
    const type = randomEnemyType(zone);
    const enemy = createEnemy(type, zone, rect);
    gameState.enemies.push(enemy);
  }
  if (zone.boss) {
    const bossRect = gameState.map.data.zones.ruins.rect;
    const boss = createEnemy(zone.boss, zone, bossRect);
    boss.isBoss = true;
    boss.position = {
      x: (bossRect.x + bossRect.w / 2) * WORLD.tileSize,
      y: (bossRect.y + bossRect.h / 2) * WORLD.tileSize
    };
    boss.state = 'spawn';
    boss.animation = { name: 'spawn', frame: 0, timer: 0 };
    boss.spawnTimer = 1400;
    boss.behavior = { timers: {}, phases: [] };
    gameState.enemies.push(boss);
    setAura({ inner: 'rgba(239,68,68,0.5)', outer: 'rgba(185,28,28,0.3)' });
  }
}

function randomEnemyType(zone) {
  const pool = zone.enemyPool;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createEnemy(type, zone, rect) {
  const blueprint = ENEMIES[type];
  const scale = zone.enemyScale;
  const enemy = {
    id: `${type}-${Math.random().toString(36).slice(2)}`,
    type,
    zone: zone.id,
    stats: {
      hp: blueprint.base.hp * scale.hp,
      maxHp: blueprint.base.hp * scale.hp,
      damage: blueprint.base.damage * scale.damage,
      speed: blueprint.base.speed,
      attackDelay: blueprint.base.attackDelay,
      timer: Math.random() * blueprint.base.attackDelay * 1000
    },
    position: randomWorldPoint(rect),
    velocity: { x: 0, y: 0 },
    state: 'idle',
    animation: { name: 'idle', frame: 0, timer: 0 },
    sprites: enemySprites[type],
    ranged: blueprint.ranged,
    xp: blueprint.xp * scale.xp,
    isBoss: false,
    phase: 0,
    deathTimer: 0
  };
  return enemy;
}

function randomWorldPoint(rect) {
  const x = (rect.x + Math.random() * rect.w) * WORLD.tileSize + WORLD.tileSize / 2;
  const y = (rect.y + Math.random() * rect.h) * WORLD.tileSize + WORLD.tileSize / 2;
  return { x, y };
}

export function updateEnemies(dt, callbacks) {
  const player = gameState.player;
  if (!player) return;
  gameState.enemies.forEach(enemy => {
    if (enemy.state === 'death') {
      updateEnemyAnimation(enemy, dt);
      enemy.deathTimer -= dt;
      if (enemy.deathTimer <= 0) enemy.remove = true;
      return;
    }
    if (enemy.state === 'spawn') {
      updateEnemyAnimation(enemy, dt);
      enemy.spawnTimer -= dt;
      if (enemy.spawnTimer <= 0) {
        enemy.state = 'idle';
        enemy.animation = { name: 'idle', frame: 0, timer: 0 };
      }
      return;
    }
    if (enemy.stats.hp <= 0) return;
    const dx = player.position.x - enemy.position.x;
    const dy = player.position.y - enemy.position.y;
    const dist = Math.hypot(dx, dy);
    const dirX = dx / (dist || 1);
    const dirY = dy / (dist || 1);
    if (enemy.ranged && dist < 260) {
      enemy.velocity.x = -dirX * enemy.stats.speed * 0.4;
      enemy.velocity.y = -dirY * enemy.stats.speed * 0.4;
    } else {
      enemy.velocity.x = dirX * enemy.stats.speed * 0.5;
      enemy.velocity.y = dirY * enemy.stats.speed * 0.5;
    }
    enemy.position.x += enemy.velocity.x * dt / 1000;
    enemy.position.y += enemy.velocity.y * dt / 1000;
    enemy.stats.timer -= dt;
    enemy.state = Math.hypot(enemy.velocity.x, enemy.velocity.y) > 5 ? 'move' : 'idle';
    if (enemy.stats.timer <= 0 && dist < 220) {
      enemy.stats.timer = enemy.stats.attackDelay * 1000;
      enemy.state = 'attack';
      if (enemy.ranged) {
        callbacks?.onEnemyShoot?.(enemy, dirX, dirY);
      } else {
        callbacks?.onEnemyStrike?.(enemy, player, dist);
      }
    }
    updateEnemyAnimation(enemy, dt);
    if (enemy.isBoss) updateBoss(enemy, dt, callbacks);
  });
  gameState.enemies = gameState.enemies.filter(e => !e.remove);
}

function updateEnemyAnimation(enemy, dt) {
  const sprites = enemy.sprites;
  if (!sprites) return;
  const name = enemy.animation.name || (enemy.state === 'attack' ? 'attack' : enemy.state === 'move' ? 'move' : enemy.state);
  const seq = sprites[name] && sprites[name].length ? sprites[name] : sprites[enemy.state] && sprites[enemy.state].length ? sprites[enemy.state] : sprites.idle;
  if (!seq || !seq.length) return;
  enemy.animation.timer += dt;
  if (enemy.animation.timer > 140) {
    enemy.animation.timer = 0;
    enemy.animation.frame = (enemy.animation.frame + 1) % seq.length;
    if (enemy.state === 'attack' && enemy.animation.frame === seq.length - 1) {
      enemy.state = 'idle';
    }
    if (enemy.animation.name === 'spawn' && enemy.animation.frame === seq.length - 1) {
      enemy.animation.name = 'idle';
      enemy.state = 'idle';
    }
  }
  enemy.animation.name = name;
}

function updateBoss(enemy, dt, callbacks) {
  const blueprint = ENEMIES[enemy.type];
  if (!enemy.behavior) enemy.behavior = { timers: {}, phases: [] };
  const hpRatio = enemy.stats.hp / enemy.stats.maxHp;
  blueprint.phases.forEach((phase, index) => {
    if (hpRatio <= phase.threshold && !enemy.behavior.phases[index]) {
      enemy.phase = index + 1;
      enemy.behavior.phases[index] = true;
      applyBossPhase(enemy, phase, callbacks);
    }
  });

  const behavior = enemy.behavior;
  if (!behavior) return;

  if (behavior.spawnMinions) {
    behavior.timers.summon = (behavior.timers.summon ?? behavior.spawnMinions.cooldown || 9000) - dt;
    if (behavior.timers.summon <= 0) {
      spawnBossMinions(enemy, behavior.spawnMinions.count || 3);
      behavior.timers.summon = behavior.spawnMinions.cooldown || 9000;
    }
  }
  if (behavior.shockwave) {
    behavior.timers.shockwave = (behavior.timers.shockwave ?? behavior.shockwave.charge || 900) - dt;
    if (behavior.timers.shockwave <= 0) {
      triggerShockwave(enemy, behavior.shockwave);
      behavior.timers.shockwave = behavior.shockwave.cooldown || 7000;
    }
  }
  if (behavior.meteor) {
    behavior.timers.meteor = (behavior.timers.meteor ?? behavior.meteor.delay || 700) - dt;
    if (behavior.timers.meteor <= 0) {
      triggerMeteor(enemy, behavior.meteor);
      behavior.timers.meteor = behavior.meteor.cooldown || 6500;
    }
  }
}

function applyBossPhase(enemy, phase, callbacks) {
  const behavior = enemy.behavior || (enemy.behavior = { timers: {}, phases: [] });
  const modifiers = phase.modifiers || {};
  if (modifiers.spawnMinions) {
    behavior.spawnMinions = modifiers.spawnMinions;
    behavior.timers.summon = modifiers.spawnMinions.cooldown || 9000;
  }
  if (modifiers.shockwave) {
    behavior.shockwave = modifiers.shockwave;
    behavior.timers.shockwave = modifiers.shockwave.charge || 900;
  }
  if (modifiers.meteor) {
    behavior.meteor = modifiers.meteor;
    behavior.timers.meteor = modifiers.meteor.delay || 700;
  }
  if (modifiers.enraged) {
    enemy.stats.damage *= modifiers.damageMult || 1.4;
    enemy.stats.speed *= modifiers.speedMult || 1.2;
    if (modifiers.attackDelay) {
      enemy.stats.attackDelay = modifiers.attackDelay;
      enemy.stats.timer = enemy.stats.attackDelay * 1000;
    }
  }
  const animName = phase.animation && behavior && enemy.sprites?.[phase.animation]?.length ? phase.animation : 'attack';
  enemy.animation = { name: animName, frame: 0, timer: 0 };
  if (animName === 'attack') enemy.state = 'attack';
  callbacks?.onBossPhase?.(enemy, phase);
}

function triggerShockwave(enemy, config) {
  gameState.camera.shake = Math.max(gameState.camera.shake, WORLD.hitShake + 6);
  gameState.particles.push({
    id: `shockwave-${Date.now()}`,
    type: 'aoe',
    position: { ...enemy.position },
    radius: config.radius || 160,
    color: 'rgba(248,113,113,0.35)',
    outline: 'rgba(239,68,68,0.85)',
    life: 0,
    ttl: (config.charge || 900) + 280,
    delay: config.charge || 900,
    damage: enemy.stats.damage * 0.9,
    layer: 'back',
    owner: enemy
  });
}

function triggerMeteor(enemy, config) {
  const player = gameState.player;
  if (!player) return;
  const target = { x: player.position.x, y: player.position.y };
  gameState.particles.push({
    id: `meteor-${Date.now()}`,
    type: 'meteor',
    position: target,
    radius: config.radius || 140,
    color: 'rgba(251,191,36,0.3)',
    outline: 'rgba(248,113,113,0.85)',
    life: 0,
    ttl: (config.delay || 700) + 400,
    delay: config.delay || 700,
    damage: enemy.stats.damage * 1.2,
    layer: 'front',
    owner: enemy
  });
}

function spawnBossMinions(enemy, count) {
  const zone = ZONES.find(z => z.id === enemy.zone) || ZONES.find(z => z.id === 'ruins');
  const zoneRect = gameState.map.data.zones[zone.id].rect;
  for (let i = 0; i < count; i++) {
    const type = zone.enemyPool[Math.floor(Math.random() * zone.enemyPool.length)];
    const minion = createEnemy(type, zone, zoneRect);
    minion.position = {
      x: enemy.position.x + (Math.random() - 0.5) * 160,
      y: enemy.position.y + (Math.random() - 0.5) * 160
    };
    minion.position.x = Math.max(0, Math.min(WORLD.width, minion.position.x));
    minion.position.y = Math.max(0, Math.min(WORLD.height, minion.position.y));
    gameState.enemies.push(minion);
  }
}

export function damageEnemy(enemy, amount, source) {
  const player = gameState.player;
  if (!enemy || enemy.stats.hp <= 0) return;
  enemy.stats.hp -= amount;
  gameState.camera.shake = Math.max(gameState.camera.shake, WORLD.hitShake * 0.6);
  if (enemy.stats.hp <= 0) {
    if (!enemy.dead) {
      enemy.dead = true;
      enemy.state = 'death';
      enemy.animation = { name: 'death', frame: 0, timer: 0 };
      enemy.deathTimer = 520;
      gainExperience(enemy.xp || 40);
      dropLoot(enemy, source);
      gameState.stats.killCount += 1;
      if (enemy.isBoss) {
        setAura(null);
        updateQuest('boss', 'boss', 1);
      }
      updateQuest('kill', enemy.type, 1);
    }
  }
}

export function getEnemySprite(enemy) {
  const sprites = enemy.sprites;
  if (!sprites) return null;
  const seq = sprites[enemy.animation.name] || sprites[enemy.state] || sprites.idle;
  return seq[enemy.animation.frame % seq.length];
}

export function findEnemiesInRange(x, y, radius) {
  const result = [];
  gameState.enemies.forEach(enemy => {
    if (enemy.stats.hp <= 0) return;
    const dist = Math.hypot(enemy.position.x - x, enemy.position.y - y);
    if (dist <= radius) result.push({ enemy, dist });
  });
  return result;
}

