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
    player.animation = { name: 'idle', animator: idle || null };
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
  player.animation = { name, animator };
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
    animation: { name: 'idle', frame: 0, timer: 0 },
    inventory: [],
    equipment: { weapon: null, armor: null, ring: null, amulet: null },
    talents: new Set(),
    branches: {},
    specialization: CLASS_BRANCHES[classId]?.[0]?.id || null,
    animations: null,
    weaponAnimations: null,
    animation: null,
    effects: { aura: null, weapon: null },
    cooldownMessage: 0
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
  } else if (currentName === 'attack' || currentName === 'hit') {
    // keep playing until finished
  } else {
    setPlayerAnimation(player, player.state || 'idle');
  }
  const animator = player.animation?.animator;
  if (!animator) return;
  animator.update(dt);
  player.animation.frame = animator.frame;
  if (!animator.loop && animator.finished) {
    if (player.animation.name === 'attack') {
      player.state = player.state === 'dead' ? 'dead' : 'idle';
      setPlayerAnimation(player, player.state === 'dead' ? 'death' : 'idle', { force: true });
    } else if (player.animation.name === 'hit') {
      setPlayerAnimation(player, player.state === 'dead' ? 'death' : player.state || 'idle', { force: true });
    }
  }
}

function createAttackPayload(player) {
  const cls = PLAYER_CLASSES[player.classId];
  const payload = {
    type: cls.attack.type,
    origin: { ...player.position },
    facing: player.facing,
    stats: {
      damage: player.stats.damage,
      range: cls.attack.range || player.stats.range,
      projectileSpeed: cls.attack.projectileSpeed || 0,
      arc: cls.attack.arc || 0,
      radius: cls.attack.radius || 0,
      dash: cls.attack.dash || 0,
      crit: player.stats.crit,
      lifesteal: player.stats.lifesteal
    },
    owner: player
  };
  return payload;
}

function createSkillPayload(player) {
  const cls = PLAYER_CLASSES[player.classId];
  switch (cls.skill) {
    case 'multiShot':
      if (player.stats.mp < 20) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 20;
      return {
        id: 'multiShot',
        owner: player,
        origin: { ...player.position },
        facing: player.facing,
        projectiles: 5,
        spread: 18,
        cooldown: 5000
      };
    case 'fireball':
      if (player.stats.mp < 28) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 28;
      return {
        id: 'fireball',
        owner: player,
        origin: { ...player.position },
        facing: player.facing,
        radius: 60,
        damage: player.stats.damage * 1.4,
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
        arc: 120,
        damage: player.stats.damage * 1.5,
        cooldown: 5500
      };
    case 'rage':
      if (player.stats.mp < 18) {
        gameState.ui.log.push(UI_STRINGS.mana);
        return null;
      }
      player.stats.mp -= 18;
      return {
        id: 'rage',
        owner: player,
        duration: 4500,
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
        dash: 180,
        damage: player.stats.damage * 1.3,
        cooldown: 5200
      };
    default:
      return null;
  }
}

export function applyDamage(amount, source) {
  const player = gameState.player;
  if (!player || player.derived.invul > 0) return;
  player.stats.hp -= amount;
  player.derived.invul = 350;
  gameState.camera.shake = Math.max(gameState.camera.shake, WORLD.hitShake);
  gameState.camera.flash = 160;
  if (player.stats.hp <= 0) {
    player.stats.hp = 0;
    player.state = 'dead';
    setPlayerAnimation(player, 'death', { force: true });
  }
  if (player.stats.hp > 0) {
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

export function applyEquipmentBonuses(bonuses) {
  const player = gameState.player;
  if (!player) return;
  player.stats.damage += bonuses.damage || 0;
  player.stats.maxHp += bonuses.hp || 0;
  player.stats.maxMp += bonuses.mp || 0;
  player.stats.crit += bonuses.crit || 0;
  player.stats.lifesteal += bonuses.lifesteal || 0;
  if (bonuses.range) player.stats.range += bonuses.range;
  if (bonuses.attackSpeed) player.stats.attackSpeed = Math.max(0.15, player.stats.attackSpeed - bonuses.attackSpeed);
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
  player.stats.hp = Math.min(player.stats.hp, player.stats.maxHp);
  player.stats.mp = Math.min(player.stats.mp, player.stats.maxMp);
  player.stats.crit = 0.05;
  player.stats.lifesteal = 0;
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

