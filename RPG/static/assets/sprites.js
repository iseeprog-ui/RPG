import { createAnimatorFromFrames } from './spriteAnimator.js';

const atlases = {
  players: {},
  enemies: {},
  weapons: {},
  projectiles: {},
  fx: {}
};

let built = false;

function createFrame(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function lighten(hex, amount) {
  const value = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((value >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((value >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (value & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function addNoise(ctx, size, baseColor, amount = 0.06) {
  const lighter = lighten(baseColor, 22);
  const darker = lighten(baseColor, -22);
  const pixels = Math.floor(size * size * amount);
  for (let i = 0; i < pixels; i++) {
    ctx.fillStyle = i % 2 === 0 ? lighter : darker;
    ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
  }
}

function registerAtlas(section, key, animations) {
  atlases[section][key] = {};
  Object.entries(animations).forEach(([name, descriptor]) => {
    atlases[section][key][name] = descriptor;
  });
}

function instantiateSet(section, key) {
  const record = atlases[section][key];
  if (!record) return null;
  const clone = {};
  Object.entries(record).forEach(([name, descriptor]) => {
    clone[name] = descriptor();
  });
  return clone;
}

function makeAnimation(frames, fps, options = {}) {
  return () => createAnimatorFromFrames(frames, fps, options);
}

const PLAYER_TEMPLATES = {
  warrior: { body: '#f97316', trim: '#fec89a', weapon: 'sword', aura: 'rgba(253,224,71,0.45)' },
  berserk: { body: '#f43f5e', trim: '#fecdd3', weapon: 'axe', aura: 'rgba(239,68,68,0.5)' },
  ranger: { body: '#22c55e', trim: '#bbf7d0', weapon: 'bow', aura: 'rgba(14,165,233,0.45)' },
  mage: { body: '#38bdf8', trim: '#bae6fd', weapon: 'staff', aura: 'rgba(129,140,248,0.5)' },
  assassin: { body: '#a855f7', trim: '#e9d5ff', weapon: 'dagger', aura: 'rgba(251,191,36,0.45)' }
};

function drawPlayerBase(ctx, template, offsetY = 0, sway = 0, pose = {}) {
  const size = ctx.canvas.width;
  ctx.fillStyle = 'rgba(15,23,42,0.65)';
  ctx.fillRect(10, size - 6, size - 20, 4);
  ctx.save();
  ctx.translate(0, offsetY);
  ctx.translate(sway * 0.5, 0);
  const body = template.body;
  const trim = template.trim;

  // legs
  ctx.fillStyle = lighten(body, -50);
  ctx.fillRect(16 + (pose.legSwing || 0), 24, 6, 12);
  ctx.fillRect(26 - (pose.legSwing || 0), 24, 6, 12);

  // torso
  ctx.fillStyle = body;
  ctx.fillRect(14, 10, 18, 16);
  ctx.fillRect(16, 6, 14, 8);
  ctx.fillRect(18, 4, 10, 4);
  ctx.fillStyle = lighten(body, -35);
  ctx.fillRect(16, 24, 6, 10);
  ctx.fillRect(24, 24, 6, 10);

  ctx.fillStyle = trim;
  ctx.fillRect(18, 6, 10, 8);
  ctx.fillRect(19, 2, 8, 3);
  ctx.fillStyle = lighten(trim, -20);
  ctx.fillRect(20, 12, 6, 12);

  // arms
  ctx.fillStyle = lighten(body, -30);
  ctx.fillRect(10 + (pose.armSwing || 0), 12, 6, 10);
  ctx.fillRect(30 - (pose.armSwing || 0), 12, 6, 10);

  ctx.restore();
}

function drawPlayerWeapon(ctx, template, animation, frame, totalFrames) {
  switch (template.weapon) {
    case 'sword':
      drawSword(ctx, frame, totalFrames, template, animation);
      break;
    case 'axe':
      drawAxe(ctx, frame, totalFrames, template, animation);
      break;
    case 'bow':
      drawBow(ctx, frame, totalFrames, template, animation);
      break;
    case 'staff':
      drawStaff(ctx, frame, totalFrames, template, animation);
      break;
    case 'dagger':
      drawDaggers(ctx, frame, totalFrames, template, animation);
      break;
    default:
      break;
  }
}

function drawSword(ctx, frame, total, template, animation) {
  const progress = frame / (total - 1 || 1);
  ctx.save();
  ctx.translate(24, animation === 'cast' ? 14 : 20);
  const baseRotation = animation === 'cast' ? -Math.PI / 2.2 : -Math.PI / 3;
  const swing = animation === 'cast' ? Math.PI * 0.35 : Math.PI * 1.4;
  ctx.rotate(baseRotation + progress * swing);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(0, -3, 18, 6);
  ctx.fillStyle = lighten(template.trim, -18);
  ctx.fillRect(-4, -4, 6, 8);
  ctx.restore();
  ctx.save();
  ctx.translate(24, animation === 'cast' ? 14 : 20);
  ctx.strokeStyle = template.aura;
  ctx.globalAlpha = animation === 'cast' ? 0.85 : 0.6;
  ctx.lineWidth = animation === 'cast' ? 8 : 6;
  const radius = animation === 'cast' ? 26 : 22;
  const start = animation === 'cast' ? -Math.PI / 2 : -Math.PI / 4;
  const end = animation === 'cast' ? Math.PI / 3 : Math.PI / 6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, start, end);
  ctx.stroke();
  ctx.restore();
}

function drawAxe(ctx, frame, total, template, animation) {
  const progress = frame / (total - 1 || 1);
  ctx.save();
  ctx.translate(24, animation === 'cast' ? 16 : 18);
  const baseRotation = animation === 'cast' ? -Math.PI / 1.8 : -Math.PI / 2;
  const swing = animation === 'cast' ? Math.PI * 0.5 : Math.PI * 1.6;
  ctx.rotate(baseRotation + progress * swing);
  ctx.fillStyle = lighten(template.body, -60);
  ctx.fillRect(-2, -14, 4, 24);
  ctx.fillStyle = '#fee2e2';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(16, -8);
  ctx.lineTo(0, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(24, animation === 'cast' ? 16 : 18);
  ctx.rotate(baseRotation + progress * swing);
  ctx.strokeStyle = 'rgba(239,68,68,0.8)';
  ctx.globalAlpha = animation === 'cast' ? 0.9 : 0.6;
  ctx.lineWidth = animation === 'cast' ? 10 : 8;
  ctx.beginPath();
  ctx.arc(0, 0, animation === 'cast' ? 30 : 26, -Math.PI / 2, Math.PI / 3);
  ctx.stroke();
  ctx.restore();
}

function drawBow(ctx, frame, total, template, animation) {
  const progress = frame / (total - 1 || 1);
  const draw = Math.min(1, progress * (animation === 'cast' ? 1.1 : 1.4));
  ctx.fillStyle = lighten(template.trim, -20);
  ctx.fillRect(14, 6, 4, 22);
  ctx.fillRect(30, 6, 4, 22);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(16, 6);
  ctx.lineTo(16 + draw * 10, 17);
  ctx.lineTo(16, 28);
  ctx.stroke();
  ctx.fillStyle = '#fde047';
  ctx.fillRect(16 + draw * 8, 16, 10, 4);
  ctx.fillStyle = animation === 'cast' ? 'rgba(59,130,246,0.45)' : 'rgba(14,165,233,0.4)';
  ctx.fillRect(16 + draw * 8, 13, 12, 2);
  if (animation === 'cast') {
    ctx.fillStyle = 'rgba(59,130,246,0.25)';
    ctx.fillRect(12, 8, 28, 6);
  }
}

function drawStaff(ctx, frame, total, template, animation) {
  const progress = frame / (total - 1 || 1);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(32, animation === 'cast' ? 0 : 4, 4, 26);
  ctx.fillStyle = lighten(template.trim, 14);
  ctx.fillRect(30, animation === 'cast' ? -2 : 6, 8, 6);
  ctx.fillStyle = animation === 'cast' ? 'rgba(192,132,252,0.65)' : 'rgba(129,140,248,0.7)';
  const pulse = 6 + Math.sin(progress * Math.PI * 2) * (animation === 'cast' ? 3 : 2);
  ctx.beginPath();
  ctx.arc(34, animation === 'cast' ? 0 : 6, pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = animation === 'cast' ? 'rgba(165,180,252,0.35)' : 'rgba(129,140,248,0.3)';
  ctx.fillRect(24 - frame * (animation === 'cast' ? 0.4 : 0), 16 - (animation === 'cast' ? frame * 0.6 : 0), 16 + frame * (animation === 'cast' ? 1.2 : 0), 12 + frame * (animation === 'cast' ? 0.8 : 0));
  if (animation === 'cast') {
    ctx.fillStyle = 'rgba(129,140,248,0.45)';
    ctx.fillRect(18 - frame * 0.3, 12 - frame * 0.5, 20 + frame, 10 + frame * 0.8);
  } else {
    ctx.fillStyle = 'rgba(94,234,212,0.6)';
    ctx.fillRect(18, 16 - progress * 10, 10, 10);
  }
}

function drawDaggers(ctx, frame, total, template, animation) {
  const progress = frame / (total - 1 || 1);
  const angle = -Math.PI / 3 + progress * Math.PI * (animation === 'cast' ? 0.8 : 1.0);
  const lift = animation === 'cast' ? 4 : 0;
  ctx.save();
  ctx.translate(20, 20 - lift);
  ctx.rotate(angle);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, -2, 14, 4);
  ctx.fillStyle = lighten(template.trim, -10);
  ctx.fillRect(-4, -3, 6, 6);
  ctx.restore();
  ctx.save();
  ctx.translate(28, 20 - lift);
  ctx.rotate(angle + (animation === 'cast' ? 0.4 : 0.6));
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, -2, 12, 4);
  ctx.fillStyle = lighten(template.trim, -10);
  ctx.fillRect(-4, -3, 6, 6);
  ctx.restore();
  ctx.save();
  ctx.translate(24, 18 - lift);
  ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(251,191,36,0.6)';
  ctx.globalAlpha = animation === 'cast' ? 0.8 : 0.55;
  ctx.lineWidth = animation === 'cast' ? 6 : 5;
  ctx.beginPath();
  ctx.arc(0, 0, animation === 'cast' ? 24 : 20, -Math.PI / 3, Math.PI / 6);
  ctx.stroke();
  ctx.restore();
}

function buildPlayerAnimations() {
  const size = 48;
  Object.entries(PLAYER_TEMPLATES).forEach(([cls, template]) => {
    const idleFrames = [];
    const walkFrames = [];
    const attackFrames = [];
    const castFrames = [];
    const hitFrames = [];
    const deathFrames = [];

    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = createFrame(size);
      const bob = Math.sin((i / 6) * Math.PI * 2) * 1.6;
      const sway = Math.cos((i / 6) * Math.PI * 2) * 1.2;
      drawPlayerBase(ctx, template, bob, sway, { armSwing: Math.sin(i / 6 * Math.PI * 2) * 1.5, legSwing: Math.cos(i / 6 * Math.PI * 2) * 1.4 });
      addNoise(ctx, size, template.body);
      idleFrames.push(canvas);
    }

    for (let i = 0; i < 8; i++) {
      const { canvas, ctx } = createFrame(size);
      const bob = Math.sin((i / 8) * Math.PI * 2) * 2.3;
      const sway = Math.cos((i / 8) * Math.PI * 2) * 2.4;
      drawPlayerBase(ctx, template, bob, sway, {
        armSwing: Math.sin((i / 8) * Math.PI * 2) * 4,
        legSwing: Math.cos((i / 8) * Math.PI * 2) * 3
      });
      addNoise(ctx, size, template.body);
      walkFrames.push(canvas);
    }

    for (let i = 0; i < 8; i++) {
      const { canvas, ctx } = createFrame(size);
      const bob = Math.sin((i / 8) * Math.PI) * 1.4;
      drawPlayerBase(ctx, template, bob, 0, {
        armSwing: Math.sin((i / 8) * Math.PI) * 2,
        legSwing: Math.cos((i / 8) * Math.PI) * 0.5
      });
      drawPlayerWeapon(ctx, template, 'attack', i, 8);
      if (template.weapon === 'staff') {
        ctx.fillStyle = 'rgba(129,140,248,0.35)';
        ctx.fillRect(12, 12 - i * 0.5, 16 + i, 10 + i * 1.5);
      } else if (template.weapon === 'bow') {
        ctx.fillStyle = 'rgba(34,197,94,0.2)';
        ctx.fillRect(18 + i, 14, 18, 8);
      }
      if (template.weapon === 'dagger' && i > 4) {
        ctx.fillStyle = 'rgba(251,191,36,0.35)';
        ctx.fillRect(10 + i * 2, 8 + i, 12, 8);
      }
      addNoise(ctx, size, template.body);
      attackFrames.push(canvas);
    }

    for (let i = 0; i < 8; i++) {
      const { canvas, ctx } = createFrame(size);
      const lift = Math.sin((i / 8) * Math.PI) * 2.4;
      const sway = Math.cos((i / 8) * Math.PI) * 1.6;
      drawPlayerBase(ctx, template, lift, sway, {
        armSwing: Math.sin((i / 8) * Math.PI) * 1.2 + 2,
        legSwing: Math.cos((i / 8) * Math.PI) * 0.4
      });
      drawPlayerWeapon(ctx, template, 'cast', i, 8);
      if (template.weapon === 'staff') {
        ctx.fillStyle = 'rgba(129,140,248,0.4)';
        ctx.fillRect(14 - i, 10 - i * 0.5, 24 + i * 2, 16 + i);
      } else if (template.weapon === 'bow') {
        ctx.fillStyle = 'rgba(59,130,246,0.25)';
        ctx.fillRect(18, 12 - i * 0.3, 16 + i, 10 + i * 0.4);
      } else if (template.weapon === 'sword') {
        ctx.fillStyle = 'rgba(253,224,71,0.35)';
        ctx.fillRect(18 - i, 8, 12 + i * 2, 12 + i);
      } else if (template.weapon === 'axe') {
        ctx.fillStyle = 'rgba(248,113,113,0.3)';
        ctx.fillRect(16 - i, 10, 18 + i * 2, 14 + i * 0.8);
      } else if (template.weapon === 'dagger') {
        ctx.fillStyle = 'rgba(251,191,36,0.28)';
        ctx.fillRect(14 - i, 14 - i * 0.4, 20 + i * 2, 12 + i * 0.6);
      }
      addNoise(ctx, size, template.body, 0.06);
      castFrames.push(canvas);
    }

    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = createFrame(size);
      drawPlayerBase(ctx, template, 0, 0, {});
      ctx.fillStyle = 'rgba(248,113,113,0.4)';
      ctx.fillRect(12, 8, 20, 20);
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(10 - i, 14 - i, 28, 18);
      addNoise(ctx, size, template.body, 0.12);
      hitFrames.push(canvas);
    }

    for (let i = 0; i < 10; i++) {
      const { canvas, ctx } = createFrame(size);
      const collapse = i / 10;
      drawPlayerBase(ctx, template, i * 0.6, 0, {});
      ctx.globalAlpha = Math.max(0, 1 - collapse * 0.8);
      ctx.fillStyle = 'rgba(148,163,184,0.35)';
      ctx.fillRect(10 + i, 26 + i, 28 - i * 2, 6);
      ctx.globalAlpha = 1 - collapse;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(12 + i, 18 + i * 1.6, 20 - i * 2, 4);
      addNoise(ctx, size, template.body, 0.04);
      deathFrames.push(canvas);
    }

    registerAtlas('players', cls, {
      idle: makeAnimation(idleFrames, 8, { loop: true, anchor: { x: 0.5, y: 0.9 } }),
      walk: makeAnimation(walkFrames, 12, { loop: true, anchor: { x: 0.5, y: 0.9 } }),
      attack: makeAnimation(attackFrames, 14, { loop: false, anchor: { x: 0.5, y: 0.9 } }),
      cast: makeAnimation(castFrames, 12, { loop: false, anchor: { x: 0.5, y: 0.9 } }),
      hit: makeAnimation(hitFrames, 16, { loop: false, anchor: { x: 0.5, y: 0.9 } }),
      death: makeAnimation(deathFrames, 10, { loop: false, anchor: { x: 0.5, y: 0.9 } })
    });
  });
}

const ENEMY_TEMPLATES = {
  goblin: { body: '#22c55e', trim: '#86efac', weapon: 'daggers', scale: 0.9 },
  orc: { body: '#166534', trim: '#bbf7d0', weapon: 'club', scale: 1.2 },
  demon: { body: '#7f1d1d', trim: '#fb7185', weapon: 'magic', scale: 1.15 },
  troll: { body: '#0f172a', trim: '#38bdf8', weapon: 'boulder', scale: 1.3 },
  skeletonArcher: { body: '#e5e7eb', trim: '#9ca3af', weapon: 'bow', scale: 1.05 },
  slime: { body: '#22d3ee', trim: '#bae6fd', weapon: 'split', scale: 1 },
  boss: { body: '#be123c', trim: '#f87171', weapon: 'chaos', scale: 1.6 }
};

function drawEnemyFrame(ctx, template, animation, frame, total) {
  const size = ctx.canvas.width;
  ctx.fillStyle = 'rgba(15,23,42,0.55)';
  ctx.fillRect(10, size - 6, size - 20, 4);
  const wobble = Math.sin(frame / Math.max(1, total) * Math.PI * 2) * (animation === 'idle' ? 1.2 : 2.4);
  const bodyHeight = 16 * template.scale;
  const bodyWidth = 16 * template.scale;
  ctx.fillStyle = template.body;
  ctx.fillRect(16, 8 + wobble, bodyWidth, bodyHeight);
  ctx.fillStyle = lighten(template.body, -40);
  ctx.fillRect(14, 22 + wobble, 6, 10);
  ctx.fillRect(28, 22 + wobble, 6, 10);
  ctx.fillStyle = template.trim;
  ctx.fillRect(18, 6 + wobble, bodyWidth - 4, 6);
  if (animation === 'hit') {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(248,113,113,0.5)';
    ctx.fillRect(14, 4, 24, 24);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (animation === 'death') {
    ctx.globalAlpha = Math.max(0, 1 - frame / total);
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.fillRect(14, 26 + frame, 26, 6);
  }
  drawEnemyWeapon(ctx, template, animation, frame, total);
}

function drawEnemyWeapon(ctx, template, animation, frame, total) {
  const progress = frame / Math.max(1, total - 1);
  switch (template.weapon) {
    case 'daggers': {
      ctx.save();
      ctx.translate(18, 18);
      ctx.rotate(-Math.PI / 3 + progress * Math.PI);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, -2, 12, 4);
      ctx.restore();
      ctx.save();
      ctx.translate(30, 18);
      ctx.rotate(-Math.PI / 3 + progress * Math.PI * 1.1);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, -2, 12, 4);
      ctx.restore();
      break;
    }
    case 'club': {
      ctx.save();
      ctx.translate(34, 18);
      ctx.rotate(-Math.PI / 2 + progress * Math.PI * 1.2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -14, 4, 24);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(0, -12, 10, 10);
      ctx.restore();
      break;
    }
    case 'magic': {
      const glow = 6 + Math.sin(progress * Math.PI * 4) * 2;
      ctx.fillStyle = 'rgba(248,113,113,0.5)';
      ctx.beginPath();
      ctx.arc(32, 10, glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(248,113,113,0.2)';
      ctx.fillRect(14, 16, 24, 12);
      break;
    }
    case 'boulder': {
      ctx.save();
      ctx.translate(32, 12 + frame * 0.3);
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
      break;
    }
    case 'bow': {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(12, 6, 4, 22);
      ctx.fillRect(30, 6, 4, 22);
      ctx.strokeStyle = '#cbd5f5';
      ctx.beginPath();
      ctx.moveTo(14, 6);
      ctx.lineTo(14 + progress * 10, 16);
      ctx.lineTo(14, 28);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(14 + progress * 10, 16, 10, 4);
      break;
    }
    case 'split': {
      const pulse = 6 + Math.sin(progress * Math.PI * 6) * 2;
      ctx.fillStyle = 'rgba(45,212,191,0.4)';
      ctx.beginPath();
      ctx.arc(26, 16, pulse, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chaos': {
      ctx.fillStyle = 'rgba(251,146,60,0.4)';
      ctx.beginPath();
      ctx.arc(24, 12, 10 + progress * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(248,250,252,0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(24, 16, 16, progress * Math.PI, progress * Math.PI + Math.PI / 1.2);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

function buildEnemyAnimations() {
  const size = 44;
  Object.entries(ENEMY_TEMPLATES).forEach(([type, template]) => {
    const idle = [];
    const walk = [];
    const attack = [];
    const hit = [];
    const death = [];
    const spawn = [];

    for (let i = 0; i < 4; i++) {
      const { canvas, ctx } = createFrame(size);
      drawEnemyFrame(ctx, template, 'idle', i, 4);
      addNoise(ctx, size, template.body, 0.04);
      idle.push(canvas);
    }

    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = createFrame(size);
      drawEnemyFrame(ctx, template, 'walk', i, 6);
      addNoise(ctx, size, template.body, 0.06);
      walk.push(canvas);
    }

    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = createFrame(size);
      drawEnemyFrame(ctx, template, 'attack', i, 6);
      addNoise(ctx, size, template.body, 0.06);
      attack.push(canvas);
    }

    for (let i = 0; i < 3; i++) {
      const { canvas, ctx } = createFrame(size);
      drawEnemyFrame(ctx, template, 'hit', i, 3);
      hit.push(canvas);
    }

    for (let i = 0; i < 8; i++) {
      const { canvas, ctx } = createFrame(size);
      drawEnemyFrame(ctx, template, 'death', i, 8);
      death.push(canvas);
    }

    for (let i = 0; i < 6; i++) {
      const { canvas, ctx } = createFrame(size);
      ctx.globalAlpha = i / 6;
      drawEnemyFrame(ctx, template, 'idle', i, 6);
      spawn.push(canvas);
    }

    registerAtlas('enemies', type, {
      idle: makeAnimation(idle, 8, { loop: true, anchor: { x: 0.5, y: 0.9 } }),
      walk: makeAnimation(walk, 12, { loop: true, anchor: { x: 0.5, y: 0.9 } }),
      attack: makeAnimation(attack, 10, { loop: false, anchor: { x: 0.5, y: 0.9 } }),
      hit: makeAnimation(hit, 18, { loop: false, anchor: { x: 0.5, y: 0.9 } }),
      death: makeAnimation(death, 10, { loop: false, anchor: { x: 0.5, y: 0.9 } }),
      spawn: makeAnimation(spawn, 10, { loop: false, anchor: { x: 0.5, y: 0.9 } })
    });
  });
}

function buildWeaponAnimations() {
  const types = {
    sword: ['swing_right', 'swing_left', 'overhead_slash', 'charged_slash'],
    axe: ['swing_right', 'swing_left', 'overhead_slash', 'charged_slash'],
    bow: ['bow_draw', 'bow_release', 'arrow_fly'],
    staff: ['cast_start', 'cast_loop', 'cast_release'],
    dagger: ['fast_combo', 'backstab_animation']
  };
  const size = 48;
  Object.entries(types).forEach(([weapon, actions]) => {
    const animationMap = {};
    actions.forEach(action => {
      const frames = [];
      const frameCount = action.includes('slash') ? 8 : action.includes('combo') ? 6 : action.includes('fly') ? 4 : 6;
      for (let i = 0; i < frameCount; i++) {
        const { canvas, ctx } = createFrame(size);
        const progress = i / Math.max(1, frameCount - 1);
        if (weapon === 'sword') {
          ctx.translate(size / 2, size / 2);
          const baseAngle = action === 'swing_left' ? Math.PI / 2 : -Math.PI / 2;
          const rotation = baseAngle + (action === 'overhead_slash' ? -Math.PI / 4 + progress * Math.PI : progress * Math.PI * 1.2);
          ctx.rotate(rotation);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, -3, 24, 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-6, -4, 8, 8);
          ctx.strokeStyle = 'rgba(253,224,71,0.4)';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 26, -Math.PI / 4, Math.PI / 6);
          ctx.stroke();
        } else if (weapon === 'axe') {
          ctx.translate(size / 2, size / 2);
          const baseAngle = action === 'swing_left' ? Math.PI / 2 : -Math.PI / 2;
          const rotation = baseAngle + (action === 'overhead_slash' ? -Math.PI / 3 + progress * Math.PI * 1.2 : progress * Math.PI * 1.4);
          ctx.rotate(rotation);
          ctx.fillStyle = '#fef2f2';
          ctx.fillRect(-3, -16, 6, 28);
          ctx.fillStyle = '#f87171';
          ctx.fillRect(0, -18, 16, 12);
          ctx.strokeStyle = 'rgba(248,113,113,0.6)';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(0, 0, 28, -Math.PI / 3, Math.PI / 5);
          ctx.stroke();
        } else if (weapon === 'bow') {
          ctx.fillStyle = '#d1d5db';
          ctx.fillRect(14, 6, 4, 30);
          ctx.fillRect(30, 6, 4, 30);
          ctx.strokeStyle = '#f3f4f6';
          ctx.beginPath();
          ctx.moveTo(16, 6);
          ctx.lineTo(16 + progress * 12, 21);
          ctx.lineTo(16, 36);
          ctx.stroke();
          if (action !== 'bow_draw') {
            ctx.fillStyle = '#fde047';
            ctx.fillRect(16 + progress * 12, 20, 12, 4);
          }
          if (action === 'arrow_fly') {
            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(-12 + i * 6, -2, 16, 4);
            ctx.restore();
          }
        } else if (weapon === 'staff') {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(30, 8, 4, 30);
          ctx.fillStyle = '#c084fc';
          const glow = 8 + Math.sin(progress * Math.PI * 2) * 3;
          ctx.beginPath();
          ctx.arc(32, 8, glow, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(129,140,248,0.4)';
          ctx.fillRect(12, 16 - progress * 6, 18 + progress * 20, 12);
        } else if (weapon === 'dagger') {
          ctx.translate(size / 2, size / 2);
          const angle = -Math.PI / 3 + progress * Math.PI * 1.4;
          ctx.rotate(angle);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, -2, 16, 4);
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-6, -4, 8, 8);
          ctx.strokeStyle = 'rgba(251,191,36,0.5)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, 18, -Math.PI / 3, Math.PI / 5);
          ctx.stroke();
        }
        frames.push(canvas);
      }
      animationMap[action] = makeAnimation(frames, action === 'cast_loop' ? 14 : 18, { loop: !action.includes('release'), anchor: { x: 0.5, y: 0.5 } });
    });
    registerAtlas('weapons', weapon, animationMap);
  });
}

function buildProjectileAnimations() {
  const animations = {};
  const size = 32;

  const arrowFrames = [];
  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createFrame(size);
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-10 + i * 1.5, -2, 18, 4);
    ctx.fillStyle = 'rgba(253,224,71,0.4)';
    ctx.fillRect(-14 + i * 1.5, -3, 6, 6);
    arrowFrames.push(canvas);
  }
  animations.arrow = makeAnimation(arrowFrames, 24, { loop: true, anchor: { x: 0.5, y: 0.5 } });

  const orbFrames = [];
  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createFrame(size);
    const radius = 6 + Math.sin((i / 6) * Math.PI * 2) * 2;
    ctx.fillStyle = 'rgba(129,140,248,0.6)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236,233,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    orbFrames.push(canvas);
  }
  animations.orb = makeAnimation(orbFrames, 18, { loop: true, anchor: { x: 0.5, y: 0.5 } });

  const fireFrames = [];
  for (let i = 0; i < 8; i++) {
    const { canvas, ctx } = createFrame(size);
    const radius = 8 + Math.sin((i / 8) * Math.PI * 2) * 2;
    ctx.fillStyle = 'rgba(248,113,113,0.5)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(251,191,36,0.5)';
    ctx.beginPath();
    ctx.arc(size / 2 + i * 0.5, size / 2, radius - 2, 0, Math.PI * 2);
    ctx.fill();
    fireFrames.push(canvas);
  }
  animations.fireball = makeAnimation(fireFrames, 20, { loop: true, anchor: { x: 0.5, y: 0.5 } });

  const boltFrames = [];
  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createFrame(size);
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(248,113,113,0.8)';
    ctx.fillRect(-10 + i, -2, 20, 4);
    ctx.fillStyle = 'rgba(248,250,252,0.6)';
    ctx.fillRect(-12 + i, -1, 6, 2);
    boltFrames.push(canvas);
  }
  animations['enemy-bolt'] = makeAnimation(boltFrames, 24, { loop: true, anchor: { x: 0.5, y: 0.5 } });

  const boulderFrames = [];
  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createFrame(size);
    ctx.translate(size / 2, size / 2);
    ctx.rotate((i / 6) * Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-4, -6, 8, 12);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, -2, 12, 6);
    boulderFrames.push(canvas);
  }
  animations.boulder = makeAnimation(boulderFrames, 16, { loop: true, anchor: { x: 0.5, y: 0.5 } });

  registerAtlas('projectiles', 'default', animations);
}

function buildFxAnimations() {
  const fx = {};
  const size = 64;
  const waveFrames = [];
  for (let i = 0; i < 8; i++) {
    const { canvas, ctx } = createFrame(size);
    ctx.strokeStyle = 'rgba(203,213,225,0.8)';
    ctx.lineWidth = 4 + i;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 16 + i * 4, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    waveFrames.push(canvas);
  }
  fx.swing = makeAnimation(waveFrames, 24, { loop: false, anchor: { x: 0.5, y: 0.5 } });

  const sparkFrames = [];
  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createFrame(size);
    ctx.fillStyle = 'rgba(252,211,77,0.8)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 4 + i * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(254,215,170,0.6)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 6 + i * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    sparkFrames.push(canvas);
  }
  fx.impact = makeAnimation(sparkFrames, 24, { loop: false, anchor: { x: 0.5, y: 0.5 } });

  const flashFrames = [];
  for (let i = 0; i < 6; i++) {
    const { canvas, ctx } = createFrame(size);
    ctx.globalAlpha = 1 - i / 6;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(0, 0, size, size);
    flashFrames.push(canvas);
  }
  fx.flash = makeAnimation(flashFrames, 24, { loop: false, anchor: { x: 0.5, y: 0.5 } });

  registerAtlas('fx', 'default', fx);
}

export function buildSpriteAtlases() {
  if (built) return;
  buildPlayerAnimations();
  buildEnemyAnimations();
  buildWeaponAnimations();
  buildProjectileAnimations();
  buildFxAnimations();
  built = true;
}

export function createPlayerSpriteSet(cls) {
  return instantiateSet('players', cls);
}

export function createEnemySpriteSet(type) {
  return instantiateSet('enemies', type);
}

export function createWeaponAnimationSet(type) {
  return instantiateSet('weapons', type);
}

export function getProjectileAnimator(type) {
  const bucket = atlases.projectiles.default;
  if (!bucket) return null;
  const descriptor = bucket[type];
  return descriptor ? descriptor() : null;
}

export function createFxAnimator(name) {
  const bucket = atlases.fx.default;
  if (!bucket) return null;
  const descriptor = bucket[name];
  return descriptor ? descriptor() : null;
}

export function listEnemyTypes() {
  return Object.keys(ENEMY_TEMPLATES);
}

