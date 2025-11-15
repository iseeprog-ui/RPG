import { WORLD, PLAYER_CLASSES, LEVELING, CLASS_BRANCHES, UI_STRINGS } from './constants.js';
import { gameState } from './state.js';

const spriteAtlas = {};

function createFrame(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function addNoise(ctx, size, baseColor) {
  const lighter = lighten(baseColor, 24);
  const darker = lighten(baseColor, -28);
  for (let i = 0; i < size * size * 0.08; i++) {
    ctx.fillStyle = i % 2 === 0 ? lighter : darker;
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    ctx.fillRect(x, y, 1, 1);
  }
}

function lighten(hex, amount) {
  const c = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((c >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (c & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const PALETTE = {
  warrior: ['#f97316', '#fed7aa'],
  berserker: ['#f43f5e', '#fecaca'],
  ranger: ['#22c55e', '#bbf7d0'],
  mage: ['#38bdf8', '#bae6fd'],
  assassin: ['#a855f7', '#e9d5ff']
};

export function buildPlayerSprites() {
  const size = 32;
  Object.keys(PLAYER_CLASSES).forEach(cls => {
    spriteAtlas[cls] = {
      idle: buildAnimationFrames(cls, 'idle', size, 4),
      walk: buildAnimationFrames(cls, 'walk', size, 6),
      attack: buildAnimationFrames(cls, 'attack', size, 5),
      death: buildAnimationFrames(cls, 'death', size, 5)
    };
  });
}

function buildAnimationFrames(cls, animation, size, length) {
  const frames = [];
  for (let i = 0; i < length; i++) {
    const { canvas, ctx } = createFrame(size);
    drawPlayerFrame(ctx, cls, animation, i, size);
    frames.push(canvas);
  }
  return frames;
}

function drawPlayerFrame(ctx, cls, animation, frame, size) {
  const [body, accent] = PALETTE[cls];
  ctx.clearRect(0, 0, size, size);
  // Shadow
  ctx.fillStyle = 'rgba(15,23,42,0.75)';
  ctx.fillRect(6, 26, 20, 4);
  const bob = animation === 'idle'
    ? Math.sin((frame / 4) * Math.PI * 2) * 1.5
    : animation === 'walk'
      ? Math.sin((frame / 6) * Math.PI * 2) * 2
      : animation === 'attack'
        ? Math.sin((frame / 5) * Math.PI) * 1.8
        : 0;

  const sway = animation === 'walk' ? Math.cos((frame / 6) * Math.PI * 2) * 2 : 0;
  drawTorso(ctx, body, accent, bob, sway);
  drawLimbs(ctx, cls, body, accent, animation, frame, bob, sway);
  drawEquipment(ctx, cls, animation, frame, accent, body, size);
  if (animation === 'death') {
    ctx.globalAlpha = Math.max(0, 1 - frame * 0.22);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, size, size);
  }
  addNoise(ctx, size, body);
}

function drawTorso(ctx, body, accent, bob, sway) {
  ctx.save();
  ctx.translate(sway * 0.2, bob * 0.2);
  ctx.fillStyle = body;
  ctx.fillRect(11, 10 + bob, 10, 12);
  ctx.fillRect(10, 8 + bob, 12, 4);
  ctx.fillRect(12, 6 + bob, 8, 4);
  ctx.fillStyle = lighten(body, -40);
  ctx.fillRect(12, 20 + bob, 4, 8);
  ctx.fillRect(16, 20 + bob, 4, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(13, 6 + bob, 6, 5);
  ctx.fillRect(14, 4 + bob, 4, 3);
  ctx.restore();
}

function drawLimbs(ctx, cls, body, accent, animation, frame, bob, sway) {
  ctx.save();
  const legSwing = animation === 'walk' ? Math.sin((frame / 6) * Math.PI * 2) * 3 : 0;
  const armSwing = animation === 'walk' ? Math.cos((frame / 6) * Math.PI * 2) * 3 : 0;

  // legs
  ctx.fillStyle = lighten(body, -50);
  ctx.fillRect(10 + legSwing * 0.2, 22 + bob, 4, 8);
  ctx.fillRect(16 - legSwing * 0.2, 22 + bob, 4, 8);

  ctx.fillStyle = lighten(body, -30);
  ctx.fillRect(8 + armSwing * 0.2, 12 + bob, 4, 6);
  ctx.fillRect(20 - armSwing * 0.2, 12 + bob, 4, 6);

  if (animation === 'attack') {
    ctx.fillStyle = accent;
    if (cls === 'warrior' || cls === 'berserker') {
      ctx.fillRect(6, 12 + bob, 6, 6);
      ctx.fillRect(20, 12 + bob, 6, 6);
    } else if (cls === 'ranger') {
      ctx.fillRect(5, 10 + bob, 4, 10);
      ctx.fillRect(22, 10 + bob, 4, 10);
    } else if (cls === 'mage') {
      ctx.fillRect(22, 8 + bob, 5, 12);
      ctx.fillRect(6, 9 + bob, 5, 12);
    } else if (cls === 'assassin') {
      ctx.fillRect(5, 10 + bob, 4, 9);
      ctx.fillRect(21, 9 + bob, 4, 10);
    }
  }
  ctx.restore();
}

function drawEquipment(ctx, cls, animation, frame, accent, body, size) {
  if (animation === 'attack') {
    switch (cls) {
      case 'warrior':
        drawBladeSwing(ctx, frame, '#f1f5f9', accent, 18, 12);
        break;
      case 'berserker':
        drawBladeSwing(ctx, frame, '#fee2e2', '#ef4444', 20, 14);
        break;
      case 'ranger':
        drawBowAttack(ctx, frame, accent, body);
        break;
      case 'mage':
        drawStaffCast(ctx, frame, accent, size);
        break;
      case 'assassin':
        drawAssassinStrike(ctx, frame, accent);
        break;
    }
  } else if (animation === 'death') {
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.fillRect(6 + frame, 18 + frame * 1.5, 20 - frame * 2, 6);
  }
}

function drawBladeSwing(ctx, frame, bladeColor, trailColor, radius, thickness) {
  ctx.save();
  ctx.translate(16, 16);
  const progress = frame / 4;
  ctx.rotate(-Math.PI / 2 + progress * Math.PI * 1.2);
  ctx.strokeStyle = trailColor;
  ctx.lineWidth = thickness;
  ctx.globalAlpha = 0.35 + progress * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 4, Math.PI / 4);
  ctx.stroke();
  ctx.strokeStyle = bladeColor;
  ctx.lineWidth = thickness - 6;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 4, -Math.PI / 6, Math.PI / 3);
  ctx.stroke();
  ctx.restore();
}

function drawBowAttack(ctx, frame, accent, body) {
  ctx.fillStyle = accent;
  ctx.fillRect(8, 8, 3, 16);
  ctx.fillRect(21, 8, 3, 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(9, 8);
  ctx.lineTo(9 + frame * 1.4, 16);
  ctx.lineTo(9, 24);
  ctx.stroke();
  ctx.fillStyle = lighten(body, 40);
  ctx.fillRect(8 + frame, 15, 10, 2);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(16 + frame, 15, 6, 2);
}

function drawStaffCast(ctx, frame, accent, size) {
  ctx.fillStyle = accent;
  ctx.fillRect(22, 6, 3, 20);
  ctx.fillRect(7, 8, 3, 12);
  ctx.fillStyle = 'rgba(148,163,255,0.7)';
  const radius = 5 + frame;
  ctx.beginPath();
  ctx.arc(size - 6 - frame, 8 + frame * 0.6, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawAssassinStrike(ctx, frame, accent) {
  ctx.save();
  ctx.translate(16, 16);
  ctx.rotate(-Math.PI / 3 + frame * 0.3);
  ctx.fillStyle = accent;
  ctx.fillRect(-16, -3, 14, 3);
  ctx.rotate(Math.PI / 1.5);
  ctx.fillRect(-16, -3, 14, 3);
  ctx.restore();
  ctx.strokeStyle = 'rgba(124,58,237,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, 8 + frame);
  ctx.lineTo(24, 12 + frame * 0.6);
  ctx.stroke();
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
    sprites: spriteAtlas[classId],
    effects: { aura: null },
    cooldownMessage: 0
  };
  if (player.specialization) {
    player.branches[player.specialization] = [];
  }
  gameState.player = player;
  return player;
}

export function updatePlayer(dt, callbacks) {
  const player = gameState.player;
  if (!player) return;
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
    player.animation = { name: 'attack', frame: 0, timer: 0 };
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
  const sprites = player.sprites;
  if (!sprites) return;
  const previous = player.animation.name;
  if (!['attack', 'death'].includes(player.animation.name)) {
    player.animation.name = player.state;
  }
  if (player.animation.name !== previous) {
    player.animation.frame = 0;
    player.animation.timer = 0;
  }
  player.animation.timer += dt;
  const sequence = sprites[player.animation.name] || sprites[player.state] || sprites.idle;
  const frameDuration = player.animation.name === 'attack' ? 90 : player.animation.name === 'death' ? 160 : 120;
  if (player.animation.timer >= frameDuration) {
    player.animation.timer = 0;
    player.animation.frame = (player.animation.frame + 1) % sequence.length;
    if (player.animation.name === 'attack' && player.animation.frame === sequence.length - 1) {
      player.animation.name = 'idle';
      player.animation.frame = 0;
    }
    if (player.animation.name === 'death' && player.animation.frame === sequence.length - 1) {
      player.animation.frame = sequence.length - 1;
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
    player.animation = { name: 'death', frame: 0, timer: 0 };
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
  if (!player || !player.sprites) return null;
  const seq = player.sprites[player.animation.name] || player.sprites[player.state] || player.sprites.idle;
  return seq[player.animation.frame % seq.length];
}

export function setAura(aura) {
  const player = gameState.player;
  if (!player) return;
  player.effects.aura = aura;
}

