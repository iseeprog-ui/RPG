import { WORLD, RARITY_COLORS } from './constants.js';
import { gameState } from './state.js';
import { getPlayerSprite } from './player.js';
import { getEnemySprite } from './enemies.js';

let ctx = null;
let canvas = null;
let uiRefs = null;

export function initRenderer(canvasRef, context, refs) {
  canvas = canvasRef;
  ctx = context;
  ctx.imageSmoothingEnabled = false;
  uiRefs = refs;
}

export function renderFrame() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const player = gameState.player;
  const camera = gameState.camera;
  if (player) {
    camera.x += (player.position.x - camera.x) * 0.08;
    camera.y += (player.position.y - camera.y) * 0.08;
    if (camera.shake > 0) {
      camera.shake *= 0.85;
    }
    if (camera.flash > 0) {
      camera.flash -= gameState.delta;
    }
  }
  const shakeX = (Math.random() - 0.5) * camera.shake;
  const shakeY = (Math.random() - 0.5) * camera.shake;
  ctx.save();
  ctx.translate(-camera.x + canvas.width / 2 + shakeX, -camera.y + canvas.height / 2 + shakeY);
  drawWorld();
  drawDecor();
  drawPortals();
  drawEffects('back');
  drawDrops();
  drawProjectiles();
  drawActors();
  drawEffects('front');
  ctx.restore();
  if (camera.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, camera.flash / 200)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawWorld() {
  const tiles = gameState.map.tiles;
  if (!tiles.length) return;
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[0].length; x++) {
      drawTile(x, y, tiles[y][x]);
    }
  }
}

const TILE_COLORS = {
  grass: { base: '#14532d', edge: '#166534', border: '#052e16' },
  water: { base: '#1d4ed8', edge: '#2563eb', border: '#60a5fa' },
  road: { base: '#b45309', edge: '#92400e', border: '#fde68a' },
  stone: { base: '#4b5563', edge: '#374151', border: '#9ca3af' },
  wall: { base: '#0f172a', edge: '#1f2937', border: '#94a3b8' },
  lava: { base: '#b91c1c', edge: '#f97316', border: '#fee2e2' }
};

function drawTile(x, y, tile) {
  const size = WORLD.tileSize;
  const px = x * size;
  const py = y * size;
  const style = TILE_COLORS[tile.type] || { base: '#475569', edge: '#334155', border: '#94a3b8' };
  ctx.fillStyle = style.base;
  ctx.fillRect(px, py, size, size);
  const variant = tile.variant || {};
  const edgeWidth = Math.max(2, Math.floor(size * 0.2));
  const edges = variant.edges || {};
  const corners = variant.corners || {};

  ctx.fillStyle = style.edge;
  if (edges.top) ctx.fillRect(px, py, size, edgeWidth);
  if (edges.bottom) ctx.fillRect(px, py + size - edgeWidth, size, edgeWidth);
  if (edges.left) ctx.fillRect(px, py, edgeWidth, size);
  if (edges.right) ctx.fillRect(px + size - edgeWidth, py, edgeWidth, size);

  ctx.fillStyle = style.border;
  if (corners.topLeft) {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + edgeWidth, py);
    ctx.lineTo(px, py + edgeWidth);
    ctx.closePath();
    ctx.fill();
  }
  if (corners.topRight) {
    ctx.beginPath();
    ctx.moveTo(px + size, py);
    ctx.lineTo(px + size - edgeWidth, py);
    ctx.lineTo(px + size, py + edgeWidth);
    ctx.closePath();
    ctx.fill();
  }
  if (corners.bottomRight) {
    ctx.beginPath();
    ctx.moveTo(px + size, py + size);
    ctx.lineTo(px + size - edgeWidth, py + size);
    ctx.lineTo(px + size, py + size - edgeWidth);
    ctx.closePath();
    ctx.fill();
  }
  if (corners.bottomLeft) {
    ctx.beginPath();
    ctx.moveTo(px, py + size);
    ctx.lineTo(px + edgeWidth, py + size);
    ctx.lineTo(px, py + size - edgeWidth);
    ctx.closePath();
    ctx.fill();
  }

  if (tile.type === 'water') {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const wave = (Math.sin(gameState.time / 250 + x) + 1) * 2;
    ctx.fillRect(px, py + wave, size, 2);
  }
  if (variant.neighbors) {
    Object.entries(variant.neighbors).forEach(([dir, neighbor]) => {
      if (!neighbor || neighbor === tile.type) return;
      if (neighbor === 'water' && tile.type !== 'water') {
        ctx.fillStyle = 'rgba(96,165,250,0.18)';
        if (dir === 'top') ctx.fillRect(px, py, size, edgeWidth / 2);
        if (dir === 'bottom') ctx.fillRect(px, py + size - edgeWidth / 2, size, edgeWidth / 2);
        if (dir === 'left') ctx.fillRect(px, py, edgeWidth / 2, size);
        if (dir === 'right') ctx.fillRect(px + size - edgeWidth / 2, py, edgeWidth / 2, size);
      }
    });
  }
}

function drawDecor() {
  const decor = gameState.map.decor || [];
  decor.forEach(item => {
    const size = WORLD.tileSize;
    const px = item.x * size + size / 2;
    const py = item.y * size + size / 2;
    ctx.fillStyle = item.props?.color || '#ffffff';
    if (item.type === 'tree') {
      ctx.beginPath();
      ctx.arc(px, py, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'lily') {
      ctx.fillRect(px - 4, py - 4, 8, 8);
    } else if (item.type === 'bush') {
      ctx.beginPath();
      ctx.arc(px, py, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'mushroom') {
      ctx.fillStyle = item.props?.color || '#f97316';
      ctx.beginPath();
      ctx.arc(px, py - 6, size * 0.18, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(px - 3, py - 6, 6, 8);
    } else if (item.type === 'log') {
      ctx.fillStyle = item.props?.color || '#78350f';
      ctx.fillRect(px - 10, py - 4, 20, 8);
    } else if (item.type === 'chest' || item.type === 'crate') {
      ctx.fillStyle = item.props?.color || '#a16207';
      ctx.fillRect(px - 8, py - 8, 16, 16);
      ctx.strokeStyle = 'rgba(250,204,21,0.8)';
      ctx.strokeRect(px - 8, py - 8, 16, 16);
    } else if (item.type === 'reed') {
      ctx.strokeStyle = item.props?.color || '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 4, py + 10);
      ctx.lineTo(px - 6, py - 6);
      ctx.moveTo(px + 4, py + 10);
      ctx.lineTo(px + 6, py - 4);
      ctx.stroke();
    } else if (item.type === 'stone') {
      ctx.fillStyle = item.props?.color || '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(px, py, size * 0.2, size * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'column') {
      ctx.fillRect(px - 6, py - 8, 12, 16);
    } else if (item.type === 'statue') {
      ctx.fillStyle = item.props?.color || '#cbd5f5';
      ctx.fillRect(px - 6, py - 16, 12, 20);
      ctx.fillRect(px - 4, py - 24, 8, 8);
    } else if (item.type === 'brazier') {
      ctx.fillStyle = '#312e81';
      ctx.fillRect(px - 4, py - 4, 8, 8);
      ctx.fillStyle = item.props?.color || '#f97316';
      ctx.beginPath();
      ctx.arc(px, py - 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawPortals() {
  const size = WORLD.tileSize;
  gameState.portals.forEach(portal => {
    ctx.fillStyle = 'rgba(129,140,248,0.4)';
    ctx.beginPath();
    ctx.arc(portal.position.x, portal.position.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99,102,241,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(portal.position.x, portal.position.y, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawDrops() {
  gameState.drops.forEach(drop => {
    if (gameState.ui.lootFilter === 'rare' && ['common', 'uncommon'].includes(drop.rarity)) return;
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.beginPath();
    ctx.arc(drop.position.x, drop.position.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = RARITY_COLORS[drop.rarity] || '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(drop.position.x, drop.position.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '16px sans-serif';
    ctx.fillText(drop.item.icon, drop.position.x - 8, drop.position.y + 5);
    if (drop.aura) {
      ctx.strokeStyle = drop.aura.outer;
      ctx.beginPath();
      ctx.arc(drop.position.x, drop.position.y, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawActors() {
  const actors = [];
  const player = gameState.player;
  if (player) actors.push({ kind: 'player', entity: player });
  gameState.enemies.forEach(enemy => {
    if (enemy.remove) return;
    actors.push({ kind: 'enemy', entity: enemy });
  });
  actors.sort((a, b) => (a.entity.position?.y || 0) - (b.entity.position?.y || 0));
  actors.forEach(actor => {
    if (actor.kind === 'player') drawPlayerSprite(actor.entity);
    else drawEnemySprite(actor.entity);
  });
}

function drawPlayerSprite(player) {
  const sprite = player.animation || getPlayerSprite();
  if (!sprite?.animator) return;
  if (player.effects.aura) {
    ctx.fillStyle = player.effects.aura.outer;
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y + 6, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.effects.aura.inner;
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = 'rgba(59,130,246,0.4)';
  ctx.shadowBlur = 12;
  const flip = Math.cos(player.facing || 0) < 0;
  sprite.animator.draw(ctx, player.position.x, player.position.y, { flip });
  ctx.restore();
  if (player.effects.weapon?.animator) {
    player.effects.weapon.animator.draw(ctx, player.position.x, player.position.y, {
      rotation: player.facing,
      alpha: 0.9
    });
  }
}

function drawEnemySprite(enemy) {
  const sprite = getEnemySprite(enemy) || enemy.animation;
  if (!sprite?.animator) return;
  const flip = enemy.velocity?.x < 0;
  sprite.animator.draw(ctx, enemy.position.x, enemy.position.y, { flip });
  ctx.fillStyle = 'rgba(15,23,42,0.8)';
  const barWidth = 40;
  const px = enemy.position.x - barWidth / 2;
  const py = enemy.position.y - 32;
  ctx.fillRect(px, py, barWidth, 5);
  ctx.fillStyle = '#22c55e';
  const ratio = enemy.stats.hp / enemy.stats.maxHp;
  ctx.fillRect(px, py, barWidth * Math.max(0, ratio), 5);
}

function drawProjectiles() {
  gameState.projectiles.forEach(projectile => {
    const { position, type } = projectile;
    const rotation = projectile.rotation ?? Math.atan2(projectile.velocity?.y || 0, projectile.velocity?.x || 1);
    if (projectile.animator) {
      projectile.animator.draw(ctx, position.x, position.y, {
        rotation,
        scale: projectile.scale || 1
      });
    } else {
      ctx.save();
      ctx.translate(position.x, position.y);
      ctx.rotate(rotation);
      const scale = projectile.scale || 1;
      ctx.fillStyle = type === 'enemy-bolt' ? 'rgba(239,68,68,0.85)' : 'rgba(148,163,184,0.6)';
      const length = type === 'enemy-bolt' ? 20 : 12;
      ctx.fillRect(-length / 2 * scale, -2 * scale, length * scale, 4 * scale);
      ctx.restore();
    }
  });
}

function drawEffects(layer) {
  gameState.particles
    .filter(effect => (effect.layer || 'front') === layer)
    .forEach(effect => {
      const progress = effect.ttl ? Math.min(1, effect.life / effect.ttl) : 0;
      switch (effect.type) {
        case 'swing':
          drawSwingEffect(effect, progress);
          break;
        case 'sprite':
          drawSpriteEffect(effect);
          break;
        case 'impact':
          drawImpactEffect(effect, progress);
          break;
        case 'trail':
          drawTrailEffect(effect, progress);
          break;
        case 'aoe':
          drawAoeEffect(effect, progress);
          break;
        case 'meteor':
          drawMeteorEffect(effect, progress);
          break;
        case 'blood':
          drawBloodEffect(effect, progress);
          break;
        case 'spark':
          drawSparkEffect(effect, progress);
          break;
        case 'fire':
          drawFireEffect(effect, progress);
          break;
        case 'shadow':
          drawShadowEffect(effect, progress);
          break;
        default:
          break;
      }
    });
}

function drawSwingEffect(effect, progress) {
  ctx.save();
  ctx.translate(effect.origin.x, effect.origin.y);
  ctx.strokeStyle = effect.color || 'rgba(255,255,255,0.7)';
  ctx.lineWidth = effect.thickness || 10;
  ctx.globalAlpha = 1 - progress;
  ctx.beginPath();
  ctx.arc(0, 0, effect.radius, effect.angle - effect.arc / 2, effect.angle + effect.arc / 2);
  ctx.stroke();
  ctx.restore();
}

function drawImpactEffect(effect, progress) {
  ctx.save();
  ctx.translate(effect.position.x, effect.position.y);
  const radius = effect.radius * (0.4 + progress * 0.8);
  ctx.strokeStyle = effect.color || 'rgba(255,255,255,0.6)';
  ctx.globalAlpha = 1 - progress;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTrailEffect(effect, progress) {
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = effect.color || 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, 3 + progress * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAoeEffect(effect, progress) {
  ctx.save();
  ctx.globalAlpha = 0.35 + progress * 0.4;
  ctx.strokeStyle = effect.outline || effect.color || 'rgba(248,113,113,0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.12 + progress * 0.18;
  ctx.fillStyle = effect.color || 'rgba(248,113,113,0.25)';
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, effect.radius * progress, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMeteorEffect(effect, progress) {
  ctx.save();
  ctx.globalAlpha = 0.4 + progress * 0.5;
  ctx.strokeStyle = effect.outline || 'rgba(248,113,113,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, effect.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.2 + progress * 0.3;
  ctx.fillStyle = effect.color || 'rgba(251,146,60,0.35)';
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, effect.radius * progress, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(effect.position.x - effect.radius, effect.position.y);
  ctx.lineTo(effect.position.x + effect.radius, effect.position.y);
  ctx.moveTo(effect.position.x, effect.position.y - effect.radius);
  ctx.lineTo(effect.position.x, effect.position.y + effect.radius);
  ctx.stroke();
  ctx.restore();
}

function drawBloodEffect(effect, progress) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.fillStyle = effect.color || 'rgba(248,113,113,0.8)';
  const size = Math.max(2, (effect.size || 6) * (1 - progress * 0.7));
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkEffect(effect, progress) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.strokeStyle = effect.color || 'rgba(253,224,71,0.9)';
  ctx.lineWidth = 2;
  const length = (effect.size || 4) * (1 + progress);
  ctx.beginPath();
  ctx.moveTo(effect.position.x - length / 2, effect.position.y);
  ctx.lineTo(effect.position.x + length / 2, effect.position.y);
  ctx.stroke();
  ctx.restore();
}

function drawFireEffect(effect, progress) {
  ctx.save();
  const radius = (effect.radius || 40) * (0.5 + progress * 0.8);
  const gradient = ctx.createRadialGradient(
    effect.position.x,
    effect.position.y,
    radius * 0.1,
    effect.position.x,
    effect.position.y,
    radius
  );
  gradient.addColorStop(0, 'rgba(251,191,36,0.85)');
  gradient.addColorStop(0.5, 'rgba(248,113,113,0.55)');
  gradient.addColorStop(1, 'rgba(124,58,237,0)');
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShadowEffect(effect, progress) {
  ctx.save();
  ctx.globalAlpha = 0.4 + (1 - progress) * 0.4;
  ctx.fillStyle = 'rgba(30,41,59,0.8)';
  const radius = (effect.radius || 32) * (1 - progress * 0.4);
  ctx.beginPath();
  ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpriteEffect(effect) {
  if (!effect.animator) return;
  effect.animator.draw(ctx, effect.position.x, effect.position.y, {
    rotation: effect.rotation || 0,
    scale: effect.scale || 1,
    alpha: effect.alpha || 1
  });
}

