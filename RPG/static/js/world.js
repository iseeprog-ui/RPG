import { WORLD, ZONES } from './constants.js';
import { gameState } from './state.js';

const TILE_TYPES = ['grass', 'water', 'road', 'stone', 'wall', 'lava'];

function createTileGrid(width, height) {
  const grid = new Array(height);
  for (let y = 0; y < height; y++) {
    grid[y] = new Array(width);
    for (let x = 0; x < width; x++) {
      grid[y][x] = { type: 'grass', variant: 0, decoration: null, zone: 'forest' };
    }
  }
  return grid;
}

export function buildWorld() {
  const width = Math.floor(WORLD.width / WORLD.tileSize);
  const height = Math.floor(WORLD.height / WORLD.tileSize);
  const tiles = createTileGrid(width, height);
  const decor = [];

  const zones = {
    forest: { rect: { x: 2, y: 2, w: Math.floor(width / 2) - 3, h: height - 4 } },
    lake: { rect: { x: Math.floor(width / 2) - 1, y: 2, w: Math.floor(width / 2) - 3, h: Math.floor(height / 2) - 3 } },
    ruins: { rect: { x: Math.floor(width / 2) - 1, y: Math.floor(height / 2) - 1, w: Math.floor(width / 2) - 3, h: Math.floor(height / 2) - 3 } }
  };

  paintForest(tiles, zones.forest.rect, decor);
  paintLake(tiles, zones.lake.rect, decor);
  paintRuins(tiles, zones.ruins.rect, decor);
  layRoads(tiles, zones);
  addPortals(zones);
  computeVariants(tiles);
  gameState.map = { tiles, decor, data: { zones }, width, height };
}

function paintForest(tiles, rect, decor) {
  fillRect(tiles, rect, 'grass', 'forest');
  scatterDecor(decor, rect, 'tree', 120, { color: '#14532d' });
  carveClearing(tiles, rect, { x: rect.x + Math.floor(rect.w / 3), y: rect.y + Math.floor(rect.h / 2) }, 5, 'road');
  carveClearing(tiles, rect, { x: rect.x + Math.floor(rect.w * 0.75), y: rect.y + Math.floor(rect.h * 0.6) }, 4, 'grass');
}

function paintLake(tiles, rect, decor) {
  fillRect(tiles, rect, 'grass', 'lake');
  const center = { x: rect.x + Math.floor(rect.w / 2), y: rect.y + Math.floor(rect.h / 2) };
  for (let r = Math.min(rect.w, rect.h) / 2 - 2; r > 2; r--) {
    carveEllipse(tiles, center, r, r * 0.7, r > 5 ? 'water' : 'grass', 'lake');
  }
  addBridge(tiles, center, rect);
  scatterDecor(decor, rect, 'lily', 30, { color: '#22d3ee' });
}

function paintRuins(tiles, rect, decor) {
  fillRect(tiles, rect, 'stone', 'ruins');
  carveEllipse(tiles, { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }, rect.w / 2 - 2, rect.h / 3, 'lava', 'ruins');
  outlineRect(tiles, rect, 'wall');
  scatterDecor(decor, rect, 'column', 40, { color: '#e5e7eb' });
  carveChambers(tiles, rect);
}

function layRoads(tiles, zones) {
  const centerForest = centerOfRect(zones.forest.rect);
  const centerLake = centerOfRect(zones.lake.rect);
  const centerRuins = centerOfRect(zones.ruins.rect);
  carveRoad(tiles, centerForest, centerLake, 2);
  carveRoad(tiles, centerLake, centerRuins, 2);
  carveRoad(tiles, centerForest, { x: zones.forest.rect.x + zones.forest.rect.w - 5, y: centerForest.y - 3 }, 1);
}

function addPortals(zones) {
  gameState.portals = [
    {
      id: 'forest-lake',
      from: 'forest',
      to: 'lake',
      position: tileToWorld(centerOfRect(zones.forest.rect))
    },
    {
      id: 'lake-ruins',
      from: 'lake',
      to: 'ruins',
      position: tileToWorld(centerOfRect(zones.lake.rect))
    }
  ];
}

function fillRect(tiles, rect, type, zone) {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      setTile(tiles, x, y, type, zone);
    }
  }
}

function outlineRect(tiles, rect, type) {
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    setTile(tiles, x, rect.y, type, 'ruins');
    setTile(tiles, x, rect.y + rect.h - 1, type, 'ruins');
  }
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    setTile(tiles, rect.x, y, type, 'ruins');
    setTile(tiles, rect.x + rect.w - 1, y, type, 'ruins');
  }
}

function carveEllipse(tiles, center, rx, ry, type, zone) {
  const minX = Math.max(0, Math.floor(center.x - rx));
  const maxX = Math.min(tiles[0].length - 1, Math.ceil(center.x + rx));
  const minY = Math.max(0, Math.floor(center.y - ry));
  const maxY = Math.min(tiles.length - 1, Math.ceil(center.y + ry));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = (x - center.x) / rx;
      const dy = (y - center.y) / ry;
      if (dx * dx + dy * dy <= 1) {
        setTile(tiles, x, y, type, zone);
      }
    }
  }
}

function carveClearing(tiles, rect, point, radius, fillType) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const tx = point.x + x;
      const ty = point.y + y;
      if (tx < rect.x || ty < rect.y || tx >= rect.x + rect.w || ty >= rect.y + rect.h) continue;
      if (Math.sqrt(x * x + y * y) <= radius) {
        setTile(tiles, tx, ty, fillType, 'forest');
      }
    }
  }
}

function carveRoad(tiles, start, end, radius) {
  const steps = Math.max(Math.abs(start.x - end.x), Math.abs(start.y - end.y));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(start.x + (end.x - start.x) * t);
    const y = Math.round(start.y + (end.y - start.y) * t);
    for (let ry = -radius; ry <= radius; ry++) {
      for (let rx = -radius; rx <= radius; rx++) {
        if (Math.abs(rx) + Math.abs(ry) <= radius + 1) {
          setTile(tiles, x + rx, y + ry, 'road', 'forest');
        }
      }
    }
  }
}

function carveChambers(tiles, rect) {
  const center = centerOfRect(rect);
  const offsets = [
    { x: -6, y: -4 },
    { x: 6, y: -4 },
    { x: -6, y: 6 },
    { x: 6, y: 6 }
  ];
  offsets.forEach(off => {
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        setTile(tiles, center.x + off.x + x, center.y + off.y + y, 'stone', 'ruins');
      }
    }
  });
}

function addBridge(tiles, center, rect) {
  const y = Math.round(center.y);
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    setTile(tiles, x, y, 'road', 'lake');
  }
}

function scatterDecor(decor, rect, type, count, props) {
  for (let i = 0; i < count; i++) {
    const x = rect.x + Math.floor(Math.random() * rect.w);
    const y = rect.y + Math.floor(Math.random() * rect.h);
    decor.push({ type, x, y, props });
  }
}

function setTile(tiles, x, y, type, zone) {
  if (!tiles[y] || !tiles[y][x]) return;
  tiles[y][x].type = type;
  tiles[y][x].zone = zone;
}

function computeVariants(tiles) {
  const height = tiles.length;
  const width = tiles[0].length;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[y][x].variant = buildVariant(tiles, x, y);
    }
  }
}

function buildVariant(tiles, x, y) {
  const type = tiles[y][x].type;
  const cardinals = {
    top: tiles[y - 1]?.[x] || null,
    right: tiles[y]?.[x + 1] || null,
    bottom: tiles[y + 1]?.[x] || null,
    left: tiles[y]?.[x - 1] || null
  };
  const diagonals = {
    topLeft: tiles[y - 1]?.[x - 1] || null,
    topRight: tiles[y - 1]?.[x + 1] || null,
    bottomRight: tiles[y + 1]?.[x + 1] || null,
    bottomLeft: tiles[y + 1]?.[x - 1] || null
  };
  const edges = {};
  Object.entries(cardinals).forEach(([dir, tile]) => {
    edges[dir] = !tile || tile.type !== type;
  });
  const corners = {
    topLeft: edges.top && edges.left && (!diagonals.topLeft || diagonals.topLeft.type !== type),
    topRight: edges.top && edges.right && (!diagonals.topRight || diagonals.topRight.type !== type),
    bottomRight: edges.bottom && edges.right && (!diagonals.bottomRight || diagonals.bottomRight.type !== type),
    bottomLeft: edges.bottom && edges.left && (!diagonals.bottomLeft || diagonals.bottomLeft.type !== type)
  };
  const adjacent = new Set();
  Object.values(cardinals).forEach(tile => {
    if (tile && tile.type !== type) adjacent.add(tile.type);
  });
  Object.values(diagonals).forEach(tile => {
    if (tile && tile.type !== type) adjacent.add(tile.type);
  });
  return {
    mask: neighborMask(tiles, x, y, type),
    edges,
    corners,
    adjacent: Array.from(adjacent),
    neighbors: Object.fromEntries(Object.entries(cardinals).map(([dir, tile]) => [dir, tile?.type || null]))
  };
}

function neighborMask(tiles, x, y, type) {
  const offsets = [
    [0, -1], [1, 0], [0, 1], [-1, 0],
    [-1, -1], [1, -1], [1, 1], [-1, 1]
  ];
  let mask = 0;
  offsets.forEach(([ox, oy], idx) => {
    const tx = x + ox;
    const ty = y + oy;
    const tile = tiles[ty]?.[tx];
    if (tile && tile.type === type) mask |= 1 << idx;
  });
  return mask;
}

function centerOfRect(rect) {
  return { x: Math.round(rect.x + rect.w / 2), y: Math.round(rect.y + rect.h / 2) };
}

function tileToWorld(tile) {
  return {
    x: tile.x * WORLD.tileSize + WORLD.tileSize / 2,
    y: tile.y * WORLD.tileSize + WORLD.tileSize / 2
  };
}

export function pointToTile(x, y) {
  return {
    tx: Math.floor(x / WORLD.tileSize),
    ty: Math.floor(y / WORLD.tileSize)
  };
}

export function getTile(tx, ty) {
  return gameState.map.tiles[ty]?.[tx] || null;
}

