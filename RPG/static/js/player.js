import { WORLD, PLAYER_CLASSES, LEVELING, CLASS_BRANCHES, UI_STRINGS } from './constants.js';
import { gameState } from './state.js';
import { createPlayerSpriteSet, createWeaponAnimationSet, createFxAnimator } from '../assets/sprites.js';

const CLASS_WEAPONS = {
  warrior: 'sword',
  berserker: 'axe',
  ranger: 'bow',
  mage: 'staff',
  assassin: 'dagger'
};

const CLASS_ATTACK_VARIANT = {
  warrior: 'overhead_slash',
  berserker: 'charged_slash',
  ranger: 'bow_release',
  mage: 'cast_release',
  assassin: 'fast_combo'
};

function ensureAnimationState(player) {
  if (!player.animations) {
    player.animations = createPlayerSpriteSet(player.classId) || {};
  }
  if (!player.animation) {
    const idle = player.animations?.idle;
    player.animation = {
      name: 'idle',
      frame: 0,
      timer: 0,
      animator: idle || null
    };
    if (player.animation.animator) player.animation.animator.reset();
  }
  if (!player.weaponAnimations) {
    const weaponKey = CLASS_WEAPONS[player.classId];
    player.weaponAnimations = createWeaponAnimationSet(weaponKey) || {};
  }
  if (!player.effects) {
    player.effects = { aura: null, weapon: null };
  } else if (!player.effects.weapon) {
    player.effects.weapon = null;
  }
}

function setPlayerAnimation(player, name, { force = false } = {}) {
  ensureAnimationState(player);
  if (!player.animations || !player.animations[name]) return;
  if (!force && player.animation?.name === name) return;
  const animator = player.animations[name];
  animator.reset();
  player.animation = {
    name,
    frame: 0,
    timer: 0,
    animator
  };
}

function triggerWeaponFx(player, variant) {
  if (!player.weaponAnimations) return;
  const animatorFactory = player.weaponAnimations[variant];
  if (!animatorFactory) return;
  const animator = animatorFactory;
  animator.reset();
  player.effects.weapon = {
    animator,
    life: 0,
    duration: 600
  };
  if (['warrior', 'berserker', 'assassin'].includes(player.classId)) {
    const swing = createFxAnimator('swing');
    if (swing) {
      swing.reset();
      gameState.particles.push({
        type: 'sprite',
        animator: swing,
        position: { ...player.position },
        rotation: player.facing,
        layer: 'front',
        life: 0,
        ttl: 320
      });
    }
  }
}

function updateWeaponFx(player, dt) {
  if (!player.effects?.weapon) return;
  const fx = player.effects.weapon;
  fx.animator.update(dt);
  fx.life += dt;
  if (fx.animator.finished || fx.life >= fx.duration) {
    player.effects.weapon = null;
  }
}

export function createPlayer(classId, race = 'human') {
  const base = PLAYER_CLASSES[classId];
  const player = {
    id: 'player',
    classId,
    race,
    level: 1,
    xp: 0,
    xpToNext: LEVELING.xpForLevel(1),
    stats: {
      hp: base.base.hp,
      mp: base.base.mp,
      maxHp: base.base.hp,
      maxMp: base.base.mp,
      damage: base.base.damage,
      moveSpeed: base.base.move,
      attackSpeed: base.attackSpeed || base.base.attackSpeed || 0.3,
      range: base.base.range,
      armor: 0,
      crit: 0.05,
      lifesteal: 0
    },
    derived: {
      cooldown: 0,
      skillCooldown: 0,
      invul: 0
    },
    resources: {
      mpRegen: 1.8,
      hpRegen: 0.4
    },
    position: { x: WORLD.width / 2, y: WORLD.height / 2 },
    velocity: { x: 0, y: 0 },
    facing: 0,
    state: 'idle',
    animation: null,
    inventory: [],
    equipment: { weapon: null, armor: null, ring: null, amulet: null },
    talents: new Set(),
    branches: {},
    specialization: CLASS_BRANCHES[classId]?.[0]?.id || null,
    animations: null,
    weaponAnimations: null,
    effects: { aura: null, weapon: null },
    cooldownMessage: 0,
    specialEffects: {}
  };
  if (player.specialization) {
    player.branches[player.specialization] = [];
  }
  ensureAnimationState(player);
  gameState.player = player;
  return player;
}

export function updatePlayer(dt, callbacks) {
  const player = gameState.player;
  if (!player) return;
  ensureAnimationState(player);
  updateWeaponFx(player, dt);
  if (player.state === 'dead') {
    advanceAnimation(player, dt);
    return;
  }
  const input = gameState.input;
  const accel = 0.0015 * player.stats.moveSpeed;
  const vx = (input.keys['KeyD'] || input.keys['ArrowRight'] ? 1 : 0) - (input.keys['KeyA'] || input.keys['ArrowLeft'] ? 1 : 0);
  const vy = (input.keys['KeyS'] || input.keys['ArrowDown'] ? 1 : 0) - (input.keys['KeyW'] || input.keys['ArrowUp'] ? 1 : 0);
  if (vx !== 0) player.velocity.x += vx * accel * dt;
  if (vy !== 0) player.velocity.y += vy * accel * dt;
  player.velocity.x *= WORLD.friction;
  player.velocity.y *= WORLD.friction;
  const speed = Math.hypot(player.velocity.x, player.velocity.y);
  if (speed > player.stats.moveSpeed) {
    const ratio = player.stats.moveSpeed / speed;
    player.velocity.x *= ratio;
    player.velocity.y *= ratio;
  }
  player.position.x = Math.max(0, Math.min(WORLD.width, player.position.x + player.velocity.x * dt * 0.06));
  player.position.y = Math.max(0, Math.min(WORLD.height, player.position.y + player.velocity.y * dt * 0.06));
  if (speed > 0.1) {
    player.state = 'walk';
  } else {
    player.state = 'idle';
  }
  player.facing = Math.atan2(gameState.input.mouse.y - player.position.y, gameState.input.mouse.x - player.position.x);
  if (player.derived.cooldown > 0) player.derived.cooldown -= dt;
  if (player.derived.skillCooldown > 0) player.derived.skillCooldown -= dt;
  if (player.derived.invul > 0) player.derived.invul -= dt;
  player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + player.resources.hpRegen * (dt / 1000));
  player.stats.mp = Math.min(player.stats.maxMp, player.stats.mp + player.resources.mpRegen * (dt / 1000));

  if (gameState.input.mouse.left && player.derived.cooldown <= 0) {
    const attack = createAttackPayload(player);
    player.derived.cooldown = player.stats.attackSpeed * 1000;
    player.state = 'attack';
    setPlayerAnimation(player, 'attack', { force: true });
    const variant = CLASS_ATTACK_VARIANT[player.classId] || 'swing_right';
    triggerWeaponFx(player, variant);
    if (callbacks?.onAttack) callbacks.onAttack(attack);
  }
  if (gameState.input.mouse.right && player.derived.skillCooldown <= 0) {
    const skill = createSkillPayload(player);
    if (skill) {
      player.derived.skillCooldown = skill.cooldown;
      player.state = 'cast';
      setPlayerAnimation(player, 'cast', { force: true });
      if (callbacks?.onSkill) callbacks.onSkill(skill);
    }
  } else if (gameState.input.mouse.right && player.derived.skillCooldown > 0) {
    player.cooldownMessage = (player.cooldownMessage || 0) - dt;
    if (player.cooldownMessage <= 0) {
      gameState.ui.log.push(UI_STRINGS.cooldown);
      player.cooldownMessage = 500;
    }
  }
  advanceAnimation(player, dt);
}

function advanceAnimation(player, dt) {
  ensureAnimationState(player);
  if (!player.animation || !player.animation.animator) {
    setPlayerAnimation(player, 'idle', { force: true });
  }
  const currentName = player.animation?.name || 'idle';
  if (player.state === 'dead') {
    setPlayerAnimation(player, 'death', { force: currentName !== 'death' });
  } else if (currentName === 'attack' || currentName === 'hit' || currentName === 'cast') {
    // keep playing until finished
  } else {
    setPlayerAnimation(player, player.state || 'idle');
  }
  const animator = player.animation?.animator;
  if (!animator) return;
  animator.update(dt);
  player.animation.frame = animator.frame;
  player.animation.timer = (player.animation.timer || 0) + dt;
  if (!animator.loop && animator.finished) {
    if (player.animation.name === 'attack') {
      player.state = player.state === 'dead' ? 'dead' : 'idle';
      setPlayerAnimation(player, player.state === 'dead' ? 'death' : 'idle', { force: true });
    } else if (player.animation.name === 'hit') {
      setPlayerAnimation(player, player.state === 'dead' ? 'death' : player.state || 'idle', { force: true });
      if (player.state !== 'dead') player.state = 'idle';
    } else if (player.animation.name === 'cast') {
      player.state = 'idle';
      setPlayerAnimation(player, 'idle', { force: true });
    }
  }
}

function createAttackPayload(player) {
  const cls = PLAYER_CLASSES[player.classId];
  const effects = player.specialEffects || {};
  const baseDamage = player.stats.damage * (1 + (effects.damageMult || 0));
  const arcBonus = effects.arcBonus || 0;
  const dashBonus = effects.dashDistance || 0;
  const payload = {
    type: cls.attack.type,
    origin: { ...player.position },
    facing: player.facing,
    stats: {
      damage: baseDamage,
      range: (cls.attack.range || player.stats.range),
      projectileSpeed: cls.attack.projectileSpeed || 0,
      arc: (cls.attack.arc || 0) + arcBonus,
      radius: cls.attack.radius || 0,
      dash: (cls.attack.dash || 0) + dashBonus,
      crit: player.stats.crit,
      lifesteal: player.stats.lifesteal
    },
    owner: player
  };
  return payload;
}

function createSkillPayload(player) {
  const cls = PLAYER_CLASSES[player.classId];
  const effects = player.specialEffects || {};
  switch (cls.skill) {
    case 'multiShot':
      if (player.stats.mp < 20) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 20;
      const extra = Math.max(0, Math.floor(effects.extraProjectiles || 0));
      return {
        id: 'multiShot',
        owner: player,
        origin: { ...player.position },
        facing: player.facing,
        projectiles: 5 + extra,
        spread: 18 + (effects.projectileSpread || 0),
        projectileDamage: player.stats.damage * 0.9 * (1 + (effects.damageMult || 0)),
        cooldown: 5000
      };
    case 'fireball':
      if (player.stats.mp < 28) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 28;
      const radius = 60 + (effects.fireballRadius || 0);
      const fireMult = 1 + (effects.fireDamage || 0);
      return {
        id: 'fireball',
        owner: player,
        origin: { ...player.position },
        facing: player.facing,
        radius,
        damage: player.stats.damage * 1.4 * fireMult,
        cooldown: 6000
      };
    case 'powerStrike':
      if (player.stats.mp < 12) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 12;
      return {
        id: 'powerStrike',
        owner: player,
        origin: { ...player.position },
        facing: player.facing,
        arc: 120 + (effects.arcBonus || 0),
        damage: player.stats.damage * 1.5 * (1 + (effects.damageMult || 0)),
        cooldown: 5500
      };
    case 'rage':
      if (player.stats.mp < 18) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 18;
      const bonusDuration = (effects.rageDuration || 0) * 1000;
      return {
        id: 'rage',
        owner: player,
        duration: 4500 + bonusDuration,
        damageMult: 1.4,
        speedMult: 1.25,
        cooldown: 7000
      };
    case 'shadowStep':
      if (player.stats.mp < 16) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 16;
      return {
        id: 'shadowStep',
        owner: player,
        dash: 180 + (effects.dashDistance || 0),
        damage: player.stats.damage * 1.3 * (1 + (effects.damageMult || 0)),
        cooldown: 5200
      };
    default:
      return null;
  }
}

export function applyDamage(amount, source) {
  const player = gameState.player;
  if (!player || player.derived.invul > 0) return;
  const effects = player.specialEffects || {};
  let incoming = amount;
  if (effects.block) {
    incoming *= Math.max(0.25, 1 - Math.min(0.85, effects.block));
  }
  if (player.stats.armor) {
    incoming *= Math.max(0.25, 1 - Math.min(0.6, player.stats.armor / 120));
  }
  player.stats.hp -= incoming;
  player.derived.invul = 350;
  gameState.camera.shake = Math.max(gameState.camera.shake, WORLD.hitShake);
  gameState.camera.flash = 160;
  if (player.stats.hp <= 0) {
    player.stats.hp = 0;
    player.state = 'dead';
    setPlayerAnimation(player, 'death', { force: true });
  }
  if (player.stats.hp > 0) {
    player.state = 'hit';
    setPlayerAnimation(player, 'hit', { force: true });
    const fx = createFxAnimator('flash');
    if (fx) {
      fx.reset();
      gameState.particles.push({
        type: 'sprite',
        animator: fx,
        position: { ...player.position },
        layer: 'front',
        life: 0,
        ttl: 240
      });
    }
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 140 + Math.random() * 80;
      gameState.particles.push({
        type: 'blood',
        position: { ...player.position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        color: 'rgba(248,113,113,0.7)',
        size: 5 + Math.random() * 2,
        life: 0,
        ttl: 380,
        damping: 0.82,
        layer: 'front'
      });
    }
  }
}

export function gainExperience(amount) {
  const player = gameState.player;
  if (!player) return;
  player.xp += amount;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    const cls = player.classId;
    player.stats.maxHp += LEVELING.hpPerLevel[cls];
    player.stats.maxMp += LEVELING.mpPerLevel[cls];
    player.stats.damage += LEVELING.damagePerLevel[cls];
    player.stats.hp = player.stats.maxHp;
    player.stats.mp = player.stats.maxMp;
    player.xpToNext = LEVELING.xpForLevel(player.level);
    gameState.stats.skillPoints += 1;
  }
}

const DIRECT_EQUIP_STATS = new Set(['damage', 'hp', 'mp', 'crit', 'lifesteal', 'range', 'attackSpeed', 'maxHp', 'maxMp', 'moveSpeed', 'armor', 'block']);

export function applySpecialEffects(effects = {}) {
  const player = gameState.player;
  if (!player) return;
  player.specialEffects = player.specialEffects || {};
  Object.entries(effects).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'number') {
      player.specialEffects[key] = (player.specialEffects[key] || 0) + value;
    } else {
      player.specialEffects[key] = value;
    }
  });
}

export function applyEquipmentBonuses(bonuses) {
  const player = gameState.player;
  if (!player) return;
  Object.entries(bonuses || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (DIRECT_EQUIP_STATS.has(key)) {
      switch (key) {
        case 'damage':
          player.stats.damage += value;
          break;
        case 'hp':
        case 'maxHp':
          player.stats.maxHp += value;
          break;
        case 'mp':
        case 'maxMp':
          player.stats.maxMp += value;
          break;
        case 'crit':
          player.stats.crit += value;
          break;
        case 'lifesteal':
          player.stats.lifesteal += value;
          break;
        case 'range':
          player.stats.range += value;
          break;
        case 'attackSpeed':
          player.stats.attackSpeed = Math.max(0.12, player.stats.attackSpeed - value);
          break;
        case 'moveSpeed':
          player.stats.moveSpeed += player.stats.moveSpeed * value;
          break;
        case 'armor':
          player.stats.armor = (player.stats.armor || 0) + value;
          break;
        case 'block':
          applySpecialEffects({ block: value });
          break;
        default:
          break;
      }
    } else {
      applySpecialEffects({ [key]: value });
    }
  });
}

export function resetEquipmentBonuses() {
  const player = gameState.player;
  if (!player) return;
  const base = PLAYER_CLASSES[player.classId];
  player.stats.maxHp = base.base.hp + LEVELING.hpPerLevel[player.classId] * (player.level - 1);
  player.stats.maxMp = base.base.mp + LEVELING.mpPerLevel[player.classId] * (player.level - 1);
  player.stats.damage = base.base.damage + LEVELING.damagePerLevel[player.classId] * (player.level - 1);
  player.stats.range = base.base.range;
  player.stats.attackSpeed = base.base.attackSpeed || 0.3;
  player.stats.moveSpeed = base.base.move;
  player.stats.hp = Math.min(player.stats.hp, player.stats.maxHp);
  player.stats.mp = Math.min(player.stats.mp, player.stats.maxMp);
  player.stats.crit = 0.05;
  player.stats.lifesteal = 0;
  player.stats.armor = 0;
  player.specialEffects = {};
}

export function computePlayerHit(enemy, baseDamage, context = {}) {
  const player = gameState.player;
  if (!player) return { damage: baseDamage, crit: false };
  const effects = player.specialEffects || {};
  let damage = baseDamage;
  if (context.skillId === 'fireball') {
    damage *= 1 + (effects.fireDamage || 0);
  }
  if (enemy?.isBoss && effects.bossDamage) {
    damage *= 1 + effects.bossDamage;
  }
  if (context.applyDamageMult && effects.damageMult) {
    damage *= 1 + effects.damageMult;
  }
  const critBonus = effects.crit || 0;
  const backstabBonus = context.backstab ? (effects.backstabBonus || 0) : 0;
  const critChance = Math.max(0, Math.min(0.95, player.stats.crit + critBonus + backstabBonus));
  const crit = Math.random() < critChance;
  if (crit) {
    damage *= 1.6;
  }
  const lifesteal = player.stats.lifesteal + (effects.lifesteal || 0);
  if (lifesteal > 0 && damage > 0) {
    const heal = damage * lifesteal;
    player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
  }
  return { damage, crit };
}

export function unlockTalent(talentId) {
  const player = gameState.player;
  if (!player) return false;
  if (player.talents.has(talentId)) return false;
  player.talents.add(talentId);
  return true;
}

export function chooseBranch(branchId) {
  const player = gameState.player;
  if (!player || !CLASS_BRANCHES[player.classId]) return false;
  player.specialization = branchId;
  player.branches[branchId] = [];
  return true;
}

export function unlockBranchNode(branchId, nodeId) {
  const player = gameState.player;
  if (!player) return false;
  if (!player.branches[branchId]) player.branches[branchId] = [];
  if (player.branches[branchId].includes(nodeId)) return false;
  player.branches[branchId].push(nodeId);
  return true;
}

export function getPlayerSprite() {
  const player = gameState.player;
  if (!player || !player.animation?.animator) return null;
  return player.animation;
}

export function setAura(aura) {
  const player = gameState.player;
  if (!player) return;
  player.effects.aura = aura;
}

