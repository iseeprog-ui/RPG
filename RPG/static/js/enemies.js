import { ENEMIES, ZONES, WORLD } from './constants.js';
import { gameState } from './state.js';
import { gainExperience, setAura } from './player.js';
import { dropLoot } from './items.js';
import { updateQuest } from './quests.js';

const enemySprites = {};

const ENEMY_COLORS = {
  brute: ['#16a34a', '#052e16'],
  shaman: ['#a855f7', '#312e81'],
  archer: ['#9ca3af', '#1f2937'],
  boss: ['#f97316', '#7c2d12']
};

export function buildEnemySprites() {
  const size = 30;
  Object.keys(ENEMIES).forEach(type => {
    const frames = { idle: [], move: [], attack: [], death: [] };
    const [body, shadow] = ENEMY_COLORS[type];
    for (let i = 0; i < 4; i++) {
      const frame = document.createElement('canvas');
      frame.width = size;
      frame.height = size;
      const ctx = frame.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'rgba(15,23,42,0.6)';
      ctx.fillRect(6, 26, 18, 4);
      ctx.fillStyle = body;
      ctx.fillRect(10, 8 + (i % 2), 12, 14);
      ctx.fillRect(12, 4 + (i % 2), 8, 6);
      ctx.fillStyle = shadow;
      ctx.fillRect(8, 20, 6, 6);
      ctx.fillRect(16, 20, 6, 6);
      frames.move.push(frame);
      if (i < 2) frames.idle.push(frame);
    }
    for (let i = 0; i < 3; i++) {
      const frame = document.createElement('canvas');
      frame.width = size;
      frame.height = size;
      const ctx = frame.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'rgba(15,23,42,0.6)';
      ctx.fillRect(6, 26, 18, 4);
      ctx.fillStyle = body;
      ctx.fillRect(8, 10, 16, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 12 - i, 8 + i * 3, 6);
      frames.attack.push(frame);
    }
    for (let i = 0; i < 4; i++) {
      const frame = document.createElement('canvas');
      frame.width = size;
      frame.height = size;
      const ctx = frame.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = body;
      ctx.globalAlpha = 1 - i * 0.25;
      ctx.fillRect(10, 10, 12, 12);
      frames.death.push(frame);
    }
    enemySprites[type] = frames;
  });
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
    phase: 0
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
  const name = enemy.state === 'attack' ? 'attack' : enemy.state === 'move' ? 'move' : 'idle';
  const seq = sprites[name] || sprites.idle;
  enemy.animation.timer += dt;
  if (enemy.animation.timer > 140) {
    enemy.animation.timer = 0;
    enemy.animation.frame = (enemy.animation.frame + 1) % seq.length;
    if (enemy.state === 'attack' && enemy.animation.frame === seq.length - 1) {
      enemy.state = 'idle';
    }
  }
  enemy.animation.name = name;
}

function updateBoss(enemy, dt, callbacks) {
  const hpRatio = enemy.stats.hp / enemy.stats.maxHp;
  const blueprint = ENEMIES[enemy.type];
  blueprint.phases.forEach((phase, index) => {
    if (hpRatio <= phase.threshold && enemy.phase < index + 1) {
      enemy.phase = index + 1;
      if (phase.modifiers.spawnMinions) {
        spawnZoneEnemies('ruins', 4);
      }
      if (phase.modifiers.enraged) {
        enemy.stats.damage *= phase.modifiers.damageMult;
        enemy.stats.speed *= 1.2;
      }
      callbacks?.onBossPhase?.(enemy, phase);
    }
  });
}

export function damageEnemy(enemy, amount, source) {
  const player = gameState.player;
  if (!enemy || enemy.stats.hp <= 0) return;
  enemy.stats.hp -= amount;
  if (enemy.stats.hp <= 0) {
    enemy.state = 'death';
    enemy.animation = { name: 'death', frame: 0, timer: 0 };
    gainExperience(enemy.xp || 40);
    dropLoot(enemy, source);
    enemy.remove = true;
    gameState.stats.killCount += 1;
    if (enemy.isBoss) {
      setAura(null);
      updateQuest('boss', 'boss', 1);
    }
    updateQuest('kill', enemy.type, 1);
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

