import { ENEMIES, ZONES, WORLD } from './constants.js';
import { gameState } from './state.js';
import { gainExperience, setAura } from './player.js';
import { dropLoot } from './items.js';
import { updateQuest } from './quests.js';
import { createEnemySpriteSet, createFxAnimator } from '../assets/sprites.js';

const ZONE_ENEMY_WEIGHTS = {
  forest: { goblin: 3, skeletonArcher: 2, slime: 2, demon: 0.4, orc: 0.3, troll: 0.2 },
  lake: { goblin: 1.2, demon: 2.2, skeletonArcher: 1.8, slime: 1.4, orc: 0.8, troll: 1.1 },
  ruins: { orc: 2.6, demon: 2.4, troll: 2.1, skeletonArcher: 1.1, goblin: 0.4, slime: 0.3 }
};

function ensureEnemySprites(enemy) {
  if (!enemy.animations) {
    enemy.animations = createEnemySpriteSet(enemy.type) || {};
  }
  if (!enemy.animation || !enemy.animation.animator) {
    const idle = enemy.animations?.idle;
    enemy.animation = { name: 'idle', frame: 0, timer: 0, animator: idle || null };
    if (enemy.animation.animator) enemy.animation.animator.reset();
  }
  if (!enemy.abilityTimers) {
    enemy.abilityTimers = {};
  }
}

function setEnemyAnimation(enemy, name, { force = false } = {}) {
  ensureEnemySprites(enemy);
  if (!enemy.animations || !enemy.animations[name]) return;
  if (!force && enemy.animation?.name === name) return;
  const animator = enemy.animations[name];
  animator.reset();
  enemy.animation = { name, frame: 0, timer: 0, animator };
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
    ensureEnemySprites(boss);
    setEnemyAnimation(boss, 'spawn', { force: true });
    boss.spawnTimer = 1400;
    boss.behavior = { timers: {}, phases: [] };
    gameState.enemies.push(boss);
    setAura({ inner: 'rgba(239,68,68,0.5)', outer: 'rgba(185,28,28,0.3)' });
  }
}

function randomEnemyType(zone) {
  const pool = zone.enemyPool;
  const weights = pool.map(type => {
    const blueprint = ENEMIES[type];
    const baseWeight = blueprint ? (blueprint.xp || 50) / 50 : 1;
    const zoneBias = ZONE_ENEMY_WEIGHTS[zone.id]?.[type] || 1;
    return Math.max(0.1, baseWeight * zoneBias);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
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
    animation: null,
    animations: null,
    abilityTimers: {},
    ranged: blueprint.ranged,
    projectile: blueprint.projectile,
    abilities: blueprint.abilities || {},
    xp: blueprint.xp * scale.xp,
    isBoss: false,
    phase: 0,
    deathTimer: 0,
    effects: {}
  };
  ensureEnemySprites(enemy);
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
    ensureEnemySprites(enemy);
    if (enemy.state === 'death') {
      advanceEnemyAnimation(enemy, dt);
      enemy.deathTimer -= dt;
      if (enemy.deathTimer <= 0) enemy.remove = true;
      return;
    }
    if (enemy.state === 'spawn') {
      advanceEnemyAnimation(enemy, dt);
      enemy.spawnTimer -= dt;
      if (enemy.spawnTimer <= 0) {
        enemy.state = 'idle';
        setEnemyAnimation(enemy, 'idle', { force: true });
      }
      return;
    }
    if (enemy.stats.hp <= 0) return;

    handleRegen(enemy, dt);

    const dx = player.position.x - enemy.position.x;
    const dy = player.position.y - enemy.position.y;
    const dist = Math.hypot(dx, dy);
    const dirX = dx / (dist || 1);
    const dirY = dy / (dist || 1);

    const dashBoost = handleDash(enemy, dt, dist);
    handleBlink(enemy, dt, dist, player);

    let speedMultiplier = enemy.ranged && dist < 280 ? -0.35 : 0.55;
    enemy.velocity.x = dirX * enemy.stats.speed * speedMultiplier * dashBoost;
    enemy.velocity.y = dirY * enemy.stats.speed * speedMultiplier * dashBoost;

    enemy.position.x += enemy.velocity.x * dt / 1000;
    enemy.position.y += enemy.velocity.y * dt / 1000;

    enemy.stats.timer -= dt;
    enemy.state = Math.hypot(enemy.velocity.x, enemy.velocity.y) > 5 ? 'walk' : 'idle';

    const abilities = enemy.abilities || {};
    if (abilities.volley) {
      const cooldown = abilities.volley.cooldown || 5200;
      enemy.abilityTimers.volley = (enemy.abilityTimers.volley ?? cooldown) - dt;
    }
    if (enemy.stats.timer <= 0) {
      enemy.stats.timer = enemy.stats.attackDelay * 1000;
      if (enemy.ranged) {
        if (abilities.volley && (enemy.abilityTimers.volley ?? 0) <= 0) {
          enemy.abilityTimers.volley = abilities.volley.cooldown || 5200;
          callbacks?.onEnemyShoot?.(enemy, dirX, dirY, {
            pattern: 'volley',
            count: abilities.volley.count || 3,
            spread: abilities.volley.spread || 12
          });
        } else {
          callbacks?.onEnemyShoot?.(enemy, dirX, dirY, { projectile: enemy.projectile });
        }
      } else {
        callbacks?.onEnemyStrike?.(enemy, player, dist);
      }
      setEnemyAnimation(enemy, 'attack', { force: true });
    }

    if (abilities.slam) handleSlam(enemy, abilities.slam, dt, player);
    if (abilities.inferno) handleInferno(enemy, abilities.inferno, dt, player);
    if (abilities.throw) handleThrow(enemy, abilities.throw, dt, callbacks, dirX, dirY);

    advanceEnemyAnimation(enemy, dt);
    if (enemy.isBoss) updateBoss(enemy, dt, callbacks);
  });
  gameState.enemies = gameState.enemies.filter(e => !e.remove);
}

function advanceEnemyAnimation(enemy, dt) {
  ensureEnemySprites(enemy);
  if (!enemy.animation?.animator) {
    setEnemyAnimation(enemy, 'idle', { force: true });
  }
  const currentName = enemy.animation?.name || 'idle';
  if (enemy.state === 'death') {
    setEnemyAnimation(enemy, 'death', { force: currentName !== 'death' });
  } else if (enemy.state === 'spawn') {
    setEnemyAnimation(enemy, 'spawn', { force: currentName !== 'spawn' });
  } else if (currentName === 'attack' || currentName === 'hit') {
    // play out animation
  } else {
    setEnemyAnimation(enemy, enemy.state || 'idle');
  }
  const animator = enemy.animation?.animator;
  if (!animator) return;
  animator.update(dt);
  enemy.animation.frame = animator.frame;
  enemy.animation.timer = (enemy.animation.timer || 0) + dt;
  if (!animator.loop && animator.finished) {
    if (['attack', 'hit', 'spawn'].includes(enemy.animation.name)) {
      setEnemyAnimation(enemy, enemy.state === 'death' ? 'death' : 'idle', { force: true });
      if (enemy.animation.name === 'idle' && enemy.state !== 'death') {
        enemy.state = 'idle';
      }
    }
  }
}

function handleRegen(enemy, dt) {
  const regen = enemy.abilities?.regen;
  if (!regen) return;
  const regenInterval = regen.interval ?? 1000;
  enemy.abilityTimers.regenTick = (enemy.abilityTimers.regenTick ?? regenInterval) - dt;
  if (enemy.abilityTimers.regenTick <= 0) {
    enemy.stats.hp = Math.min(enemy.stats.maxHp, enemy.stats.hp + (regen.amount || 2));
    enemy.abilityTimers.regenTick += regen.interval || 1000;
  }
}

function handleDash(enemy, dt, dist) {
  const dash = enemy.abilities?.dash;
  if (!dash) return enemy.effects.dashBoost ? enemy.effects.dashBoost : 1;
  const dashCooldown = dash.cooldown ?? 4000;
  enemy.abilityTimers.dash = (enemy.abilityTimers.dash ?? dashCooldown) - dt;
  if (enemy.abilityTimers.dash <= 0 && dist > 60 && dist < (dash.distance || 140) * 1.2) {
    enemy.effects.dashBoost = 2.6;
    enemy.abilityTimers.dash = dash.cooldown || 4000;
  }
  if (enemy.effects.dashBoost) {
    enemy.effects.dashBoost = Math.max(1, enemy.effects.dashBoost - dt / 600);
    if (enemy.effects.dashBoost <= 1.05) {
      enemy.effects.dashBoost = null;
      return 1;
    }
    return enemy.effects.dashBoost;
  }
  return 1;
}

function handleBlink(enemy, dt, dist, player) {
  const blink = enemy.abilities?.blink;
  if (!blink) return;
  const blinkCooldown = blink.cooldown ?? 6000;
  enemy.abilityTimers.blink = (enemy.abilityTimers.blink ?? blinkCooldown) - dt;
  if (enemy.abilityTimers.blink <= 0 && dist > (blink.distance || 140)) {
    const angle = Math.random() * Math.PI * 2;
    const radius = (blink.distance || 140) * 0.6;
    enemy.position.x = player.position.x + Math.cos(angle) * radius;
    enemy.position.y = player.position.y + Math.sin(angle) * radius;
    enemy.abilityTimers.blink = blink.cooldown || 6000;
    setEnemyAnimation(enemy, 'attack', { force: true });
  }
}

function handleSlam(enemy, config, dt, player) {
  const slamCooldown = config.cooldown ?? 4800;
  enemy.abilityTimers.slam = (enemy.abilityTimers.slam ?? slamCooldown) - dt;
  if (enemy.abilityTimers.slam > 0) return;
  const radius = config.radius || 120;
  const distance = Math.hypot(player.position.x - enemy.position.x, player.position.y - enemy.position.y);
  if (distance > radius + 40) return;
  enemy.abilityTimers.slam = config.cooldown || 4800;
  setEnemyAnimation(enemy, 'attack', { force: true });
  const fx = createFxAnimator('impact');
  if (fx) {
    fx.reset();
    gameState.particles.push({
      type: 'sprite',
      animator: fx,
      position: { ...enemy.position },
      layer: 'front',
      life: 0,
      ttl: 360
    });
  }
  gameState.particles.push({
    type: 'aoe',
    position: { ...enemy.position },
    radius: config.radius || 120,
    outline: 'rgba(248,113,113,0.8)',
    color: 'rgba(248,113,113,0.25)',
    delay: 320,
    ttl: 620,
    damage: enemy.stats.damage * (config.damageMult || 1.2),
    owner: enemy,
    layer: 'front'
  });
}

function handleInferno(enemy, config, dt, player) {
  const infernoCooldown = config.cooldown ?? 5200;
  enemy.abilityTimers.inferno = (enemy.abilityTimers.inferno ?? infernoCooldown) - dt;
  if (enemy.abilityTimers.inferno > 0) return;
  enemy.abilityTimers.inferno = infernoCooldown;
  const target = player ? { x: player.position.x, y: player.position.y } : { ...enemy.position };
  const radius = config.radius || 110;
  const windup = config.windup || 700;
  setEnemyAnimation(enemy, 'attack', { force: true });
  gameState.particles.push({
    type: 'fire',
    position: target,
    radius,
    life: 0,
    ttl: windup + 360,
    layer: 'front'
  });
  gameState.particles.push({
    type: 'aoe',
    position: target,
    radius,
    outline: 'rgba(248,113,113,0.85)',
    color: 'rgba(248,113,113,0.25)',
    delay: windup,
    ttl: windup + 380,
    damage: enemy.stats.damage * (config.damageMult || 1.1),
    owner: enemy,
    layer: 'front'
  });
}

function handleThrow(enemy, config, dt, callbacks, dirX, dirY) {
  const throwCooldown = config.cooldown ?? 4200;
  enemy.abilityTimers.throw = (enemy.abilityTimers.throw ?? throwCooldown) - dt;
  if (enemy.abilityTimers.throw > 0) return;
  enemy.abilityTimers.throw = config.cooldown || 4200;
  callbacks?.onEnemyShoot?.(enemy, dirX, dirY, { projectile: enemy.projectile || 'enemy-bolt', speed: 260 });
  setEnemyAnimation(enemy, 'attack', { force: true });
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
    const summonCooldown = behavior.spawnMinions.cooldown ?? 9000;
    behavior.timers.summon = (behavior.timers.summon ?? summonCooldown) - dt;
    if (behavior.timers.summon <= 0) {
      spawnBossMinions(enemy, behavior.spawnMinions.count || 3);
      behavior.timers.summon = behavior.spawnMinions.cooldown || 9000;
    }
  }
  if (behavior.shockwave) {
    const shockwaveCharge = behavior.shockwave.charge ?? 900;
    behavior.timers.shockwave = (behavior.timers.shockwave ?? shockwaveCharge) - dt;
    if (behavior.timers.shockwave <= 0) {
      triggerShockwave(enemy, behavior.shockwave);
      behavior.timers.shockwave = behavior.shockwave.cooldown || 7000;
    }
  }
  if (behavior.meteor) {
    const meteorDelay = behavior.meteor.delay ?? 700;
    behavior.timers.meteor = (behavior.timers.meteor ?? meteorDelay) - dt;
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
  const animName = phase.animation || 'attack';
  setEnemyAnimation(enemy, animName, { force: true });
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
  enemy.state = 'hit';
  setEnemyAnimation(enemy, 'hit', { force: true });
  const fx = createFxAnimator('impact');
  if (fx) {
    fx.reset();
    gameState.particles.push({
      type: 'sprite',
      animator: fx,
      position: { ...enemy.position },
      layer: 'front',
      life: 0,
      ttl: 240
    });
  }
  if (enemy.stats.hp <= 0) {
    if (!enemy.dead) {
      enemy.dead = true;
      enemy.state = 'death';
      setEnemyAnimation(enemy, 'death', { force: true });
      enemy.deathTimer = 520;
      gainExperience(enemy.xp || 40);
      dropLoot(enemy, source);
      gameState.stats.killCount += 1;
      if (enemy.isBoss) {
        setAura(null);
        updateQuest('boss', 'boss', 1);
      }
      updateQuest('kill', enemy.type, 1);
      if (enemy.abilities?.split) {
        spawnSlimeFragments(enemy, enemy.abilities.split);
      }
    }
  }
}

export function getEnemySprite(enemy) {
  if (!enemy || !enemy.animation?.animator) return null;
  return enemy.animation;
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

function spawnSlimeFragments(enemy, config) {
  const pieces = config.pieces || 2;
  for (let i = 0; i < pieces; i++) {
    const zone = ZONES.find(z => z.id === enemy.zone) || ZONES[0];
    const fragment = createEnemy('slime', zone, { x: 0, y: 0, w: 1, h: 1 });
    fragment.abilities = { ...fragment.abilities };
    delete fragment.abilities.split;
    fragment.stats.hp = Math.max(20, enemy.stats.maxHp * (config.scale || 0.5));
    fragment.stats.maxHp = fragment.stats.hp;
    fragment.stats.damage = enemy.stats.damage * 0.6;
    fragment.position = {
      x: enemy.position.x + (Math.random() - 0.5) * 40,
      y: enemy.position.y + (Math.random() - 0.5) * 40
    };
    ensureEnemySprites(fragment);
    setEnemyAnimation(fragment, 'spawn', { force: true });
    fragment.spawnTimer = 600;
    gameState.enemies.push(fragment);
  }
}

