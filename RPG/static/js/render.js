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
  drawPlayer();
  drawEnemies();
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
    } else if (item.type === 'column') {
      ctx.fillRect(px - 6, py - 8, 12, 16);
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

function drawPlayer() {
  const player = gameState.player;
  if (!player) return;
  const sprite = getPlayerSprite();
  if (!sprite) return;
  const size = sprite.width;
  const px = player.position.x - size / 2;
  const py = player.position.y - size / 2;
  if (player.effects.aura) {
    ctx.fillStyle = player.effects.aura.outer;
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.effects.aura.inner;
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.drawImage(sprite, px, py, size, size);
}

function drawEnemies() {
  gameState.enemies.forEach(enemy => {
    const sprite = getEnemySprite(enemy);
    if (!sprite) return;
    const size = sprite.width;
    const px = enemy.position.x - size / 2;
    const py = enemy.position.y - size / 2;
    ctx.drawImage(sprite, px, py, size, size);
    ctx.fillStyle = 'rgba(239,68,68,0.8)';
    ctx.fillRect(px, py - 8, size, 4);
    ctx.fillStyle = '#22c55e';
    const ratio = enemy.stats.hp / enemy.stats.maxHp;
    ctx.fillRect(px, py - 8, size * ratio, 4);
  });
}

function drawProjectiles() {
  gameState.projectiles.forEach(projectile => {
    const { position, type } = projectile;
    ctx.save();
    ctx.translate(position.x, position.y);
    const rotation = projectile.rotation ?? Math.atan2(projectile.velocity?.y || 0, projectile.velocity?.x || 1);
    const scale = projectile.scale || 1;
    if (type === 'arrow') {
      ctx.rotate(rotation);
      ctx.fillStyle = 'rgba(250,204,21,0.9)';
      ctx.fillRect(-12 * scale, -2 * scale, 16 * scale, 4 * scale);
      ctx.fillStyle = 'rgba(249,115,22,0.9)';
      ctx.fillRect(-14 * scale, -1.5 * scale, 4 * scale, 3 * scale);
    } else if (type === 'orb') {
      ctx.fillStyle = 'rgba(129,140,248,0.8)';
      const radius = 6 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'fireball') {
      const pulse = 1 + Math.sin(projectile.life / 90) * 0.2;
      ctx.fillStyle = 'rgba(248,113,113,0.65)';
      ctx.beginPath();
      ctx.arc(0, 0, (projectile.radius || 16) * 0.5 * scale * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, (projectile.radius || 16) * 0.4 * scale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'enemy-bolt') {
      ctx.rotate(rotation);
      ctx.fillStyle = 'rgba(239,68,68,0.85)';
      ctx.fillRect(-10 * scale, -2 * scale, 20 * scale, 4 * scale);
    } else {
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

