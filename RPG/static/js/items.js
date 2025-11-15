import { BASE_ITEMS, CLASS_LEGENDARIES, LOOT_TABLE, RARITY_COLORS, RARITIES, UI_STRINGS } from './constants.js';
import { gameState } from './state.js';
import { applyEquipmentBonuses, resetEquipmentBonuses, setAura } from './player.js';

let tooltipRefs = null;

export function setupTooltip(refs) {
  tooltipRefs = refs;
}

export function dropLoot(enemy) {
  const item = rollItem(enemy);
  if (!item) return;
  const drop = {
    id: `drop-${Math.random().toString(36).slice(2)}`,
    item,
    position: { x: enemy.position.x, y: enemy.position.y },
    aura: item.legendary ? item.legendary.aura : null,
    rarity: item.rarity
  };
  gameState.drops.push(drop);
  gameState.stats.lootCount += 1;
  if (item.legendary?.aura) {
    setAura(item.legendary.aura);
  }
}

function rollItem(enemy) {
  const player = gameState.player;
  if (!player) return null;
  const rarity = pickRarity();
  if (!rarity) return null;
  if (rarity === 'legendary') {
    const legendary = CLASS_LEGENDARIES[player.classId];
    if (!legendary) return null;
    return makeItem({
      icon: legendary.icon,
      name: legendary.name,
      slot: legendary.slot,
      rarity: 'legendary',
      stats: legendary.stats,
      legendary
    });
  }
  const base = BASE_ITEMS.filter(i => RARITIES.indexOf(i.rarity) >= RARITIES.indexOf(rarity));
  const picked = base[Math.floor(Math.random() * base.length)];
  return makeItem(picked);
}

function pickRarity() {
  let roll = Math.random();
  for (const rarity of RARITIES) {
    const chance = LOOT_TABLE[rarity];
    if (!chance) continue;
    if (roll < chance) return rarity;
    roll -= chance;
  }
  return null;
}

function makeItem(base) {
  return {
    id: `${base.name}-${Math.random().toString(36).slice(2)}`,
    icon: base.icon,
    name: base.name,
    slot: base.slot,
    rarity: base.rarity,
    stats: base.stats || {},
    legendary: base.legendary || null,
    tooltip: base.tooltip || ''
  };
}

export function addToInventory(item) {
  const player = gameState.player;
  if (!player) return false;
  if (player.inventory.length >= 27) {
    gameState.ui.log.push(UI_STRINGS.inventoryFull);
    return false;
  }
  player.inventory.push(item);
  return true;
}

export function equipItem(item) {
  const player = gameState.player;
  if (!player) return false;
  if (item.legendary?.requires && !item.legendary.requires.includes(player.classId)) {
    gameState.ui.log.push(UI_STRINGS.wrongClass);
    addToInventory(item);
    return false;
  }
  if (item.legendary && item.legendary.bonuses) {
    applyEquipmentBonuses(item.legendary.bonuses);
  }
  player.equipment[item.slot] = item;
  applyEquipmentBonuses(item.stats || {});
  return true;
}

export function unequip(slot) {
  const player = gameState.player;
  if (!player) return;
  if (!player.equipment[slot]) return;
  player.equipment[slot] = null;
  resetEquipmentBonuses();
  Object.values(player.equipment).forEach(eq => {
    if (!eq) return;
    applyEquipmentBonuses(eq.stats || {});
    if (eq.legendary?.bonuses) applyEquipmentBonuses(eq.legendary.bonuses);
  });
}

export function removeFromInventory(index) {
  const player = gameState.player;
  if (!player) return null;
  return player.inventory.splice(index, 1)[0] || null;
}

export function pickupDrop(dropId) {
  const dropIndex = gameState.drops.findIndex(d => d.id === dropId);
  if (dropIndex === -1) return false;
  const drop = gameState.drops[dropIndex];
  if (!addToInventory(drop.item)) return false;
  gameState.drops.splice(dropIndex, 1);
  return true;
}

export function toggleLootFilter(rarity) {
  gameState.ui.lootFilter = rarity;
}

export function buildTooltip(item) {
  if (!item) return '';
  const stats = Object.entries(item.stats || {})
    .map(([key, value]) => `${statLabel(key)}: ${formatStat(value)}`)
    .join('<br/>');
  const legendary = item.legendary?.bonuses
    ? `<div class="legendary">${Object.entries(item.legendary.bonuses)
        .map(([k, v]) => `${statLabel(k)}: ${formatStat(v)}`)
        .join('<br/>')}</div>`
    : '';
  return `<strong style="color:${RARITY_COLORS[item.rarity]}">${item.name}</strong><br/>${stats}${legendary}`;
}

function statLabel(key) {
  const map = {
    damage: 'Урон',
    hp: 'HP',
    mp: 'MP',
    crit: 'Крит',
    lifesteal: 'Вампиризм',
    range: 'Дальность',
    attackSpeed: 'Скорость атаки',
    extraProjectiles: 'Доп. снаряды',
    spread: 'Разброс',
    fireballRadius: 'Радиус шара',
    fireDamage: 'Огонь',
    bossDamage: 'Урон по боссам',
    stealthDuration: 'Длительность стелса',
    dashDistance: 'Рывок'
  };
  return map[key] || key;
}

function formatStat(value) {
  if (typeof value === 'number') {
    if (Math.abs(value) < 1) return `${Math.round(value * 100)}%`;
    return value > 0 ? `+${value}` : `${value}`;
  }
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return value;
}

export function getInventoryData() {
  const player = gameState.player;
  if (!player) return { items: [], equipment: {} };
  return { items: player.inventory, equipment: player.equipment };
}

