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
  drawDrops();
  drawPlayer();
  drawEnemies();
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
  grass: '#166534',
  water: '#1d4ed8',
  road: '#b45309',
  stone: '#52525b',
  wall: '#0f172a',
  lava: '#ef4444'
};

function drawTile(x, y, tile) {
  const size = WORLD.tileSize;
  const px = x * size;
  const py = y * size;
  ctx.fillStyle = TILE_COLORS[tile.type] || '#94a3b8';
  ctx.fillRect(px, py, size, size);
  if (tile.type === 'water') {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px, py + (Math.sin(gameState.time / 250 + x) + 1) * 2, size, 2);
  }
  if (tile.type === 'road') {
    ctx.fillStyle = 'rgba(252,211,77,0.2)';
    ctx.fillRect(px, py, size, size);
  }
  if (tile.type === 'wall') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px, py, size, size);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(px + 3, py + 3, size - 6, size - 6);
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
    ctx.fillStyle = RARITY_COLORS[drop.rarity] || '#ffffff';
    ctx.beginPath();
    ctx.arc(drop.position.x, drop.position.y, 10, 0, Math.PI * 2);
    ctx.fill();
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

