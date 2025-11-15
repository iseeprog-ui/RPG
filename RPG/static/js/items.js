import { BASE_ITEMS, CLASS_LEGENDARIES, LOOT_TABLE, PLAYER_CLASSES, RARITY_COLORS, RARITIES, UI_STRINGS } from './constants.js';
import { gameState } from './state.js';
import { applyEquipmentBonuses, applySpecialEffects, resetEquipmentBonuses, setAura } from './player.js';

let tooltipRefs = null;

export function setupTooltip(refs) {
  tooltipRefs = refs;
}

const RARITY_LABELS = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
};

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
  const allowed = base.allowedClasses || base.allowed || base.requires || base.legendary?.requires || null;
  const requiredClass = base.requiredClass || base.legendary?.requiredClass || (Array.isArray(allowed) && allowed.length === 1 ? allowed[0] : null);
  return {
    id: `${base.name}-${Math.random().toString(36).slice(2)}`,
    icon: base.icon,
    name: base.name,
    slot: base.slot,
    rarity: base.rarity,
    stats: base.stats || {},
    legendary: base.legendary || null,
    special: base.special || null,
    tooltip: base.tooltip || '',
    allowedClasses: Array.isArray(allowed) ? allowed : allowed ? [allowed] : null,
    requiredClass
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
  const allowed = item.allowedClasses || (item.requiredClass ? [item.requiredClass] : null);
  if (allowed && !allowed.includes(player.classId)) {
    gameState.ui.log.push(UI_STRINGS.wrongClass);
    addToInventory(item);
    return false;
  }
  player.equipment[item.slot] = item;
  applyEquipmentBonuses(item.stats || {});
  if (item.legendary && item.legendary.bonuses) {
    applyEquipmentBonuses(item.legendary.bonuses);
  }
  if (item.special) applySpecialEffects(item.special);
  if (item.legendary?.special) applySpecialEffects(item.legendary.special);
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
    if (eq.special) applySpecialEffects(eq.special);
    if (eq.legendary?.special) applySpecialEffects(eq.legendary.special);
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
  const rarityText = RARITY_LABELS[item.rarity] || item.rarity;
  const requirementLine = buildRequirementLine(item);
  const baseStats = formatStatsBlock(item.stats);
  const specialBlock = buildSpecialBlock(item);
  const legendaryBlock = buildLegendaryBlock(item);
  const comparison = buildComparisonBlock(item);
  return `
    <div class="item-name rarity-${item.rarity}">${item.icon} ${item.name}</div>
    <div class="item-rarity-line">${rarityText}</div>
    ${requirementLine}
    <div class="item-section">
      ${baseStats || '<div class="item-stat muted">Бонусов нет</div>'}
    </div>
    ${specialBlock}
    ${legendaryBlock}
    ${comparison}
  `;
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
    projectileSpread: 'Разброс',
    fireballRadius: 'Радиус шара',
    fireDamage: 'Огонь',
    bossDamage: 'Урон по боссам',
    stealthDuration: 'Длительность стелса',
    dashDistance: 'Рывок',
    rageDuration: 'Длительность ярости',
    block: 'Блок',
    damageMult: 'Множитель урона',
    pierce: 'Пробитие',
    pierceChance: 'Шанс пронзания',
    arcBonus: 'Ширина дуги',
    backstabBonus: 'Бонус из тени'
  };
  return map[key] || key;
}

function formatStat(value) {
  if (typeof value === 'number') {
    if (Math.abs(value) < 1) {
      const percent = Math.round(value * 100);
      if (percent === 0) return '0%';
      return `${value > 0 ? '+' : ''}${percent}%`;
    }
    const rounded = Math.round(value * 100) / 100;
    return value > 0 ? `+${rounded}` : `${rounded}`;
  }
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return value;
}

function formatStatsBlock(stats = {}) {
  const entries = Object.entries(stats || {}).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) return '';
  return entries
    .map(([key, value]) => `<div class="item-stat"><span>${statLabel(key)}</span><span>${formatStat(value)}</span></div>`)
    .join('');
}

function buildLegendaryBlock(item) {
  if (!item.legendary) return '';
  const bonuses = formatStatsBlock(item.legendary.bonuses);
  const description = item.legendary.description ? `<div class="legendary-desc">${item.legendary.description}</div>` : '';
  return `<div class="item-section legendary-block"><div class="legendary-title">Особые свойства</div>${bonuses || '<div class="item-stat muted">Особых бонусов нет</div>'}${description}</div>`;
}

function buildSpecialBlock(item) {
  const special = aggregateSpecialEffects(item);
  const entries = Object.entries(special);
  if (!entries.length) return '';
  const rows = entries
    .map(([key, value]) => `<div class="item-stat"><span>${statLabel(key)}</span><span>${formatStat(value)}</span></div>`)
    .join('');
  return `<div class="item-section special-block"><div class="special-title">Особые эффекты</div>${rows}</div>`;
}

function buildRequirementLine(item) {
  const player = gameState.player;
  const allowed = item.allowedClasses || (item.requiredClass ? [item.requiredClass] : null);
  if (!allowed || !allowed.length) return '';
  const labels = allowed.map(classLabel).join(', ');
  const matches = player ? allowed.includes(player.classId) : false;
  const cls = matches ? 'item-requirement ok' : 'item-requirement fail';
  return `<div class="${cls}">Класс: ${labels}</div>`;
}

function buildComparisonBlock(item) {
  const player = gameState.player;
  if (!player) return '';
  const equipped = player.equipment?.[item.slot];
  if (!equipped || equipped.id === item.id) return '';
  const nextStats = aggregateStats(item);
  const currentStats = aggregateStats(equipped);
  const keys = new Set([...Object.keys(nextStats), ...Object.keys(currentStats)]);
  if (!keys.size) return '';
  const rows = [];
  keys.forEach(key => {
    const diff = (nextStats[key] || 0) - (currentStats[key] || 0);
    if (Math.abs(diff) < 0.001) return;
    const cls = diff > 0 ? 'item-compare better' : 'item-compare worse';
    rows.push(`<div class="${cls}"><span>${statLabel(key)}</span><span>${formatStat(diff)}</span></div>`);
  });
  const nextSpecial = aggregateSpecialEffects(item);
  const currentSpecial = aggregateSpecialEffects(equipped);
  const specialKeys = new Set([...Object.keys(nextSpecial), ...Object.keys(currentSpecial)]);
  specialKeys.forEach(key => {
    const diff = (nextSpecial[key] || 0) - (currentSpecial[key] || 0);
    if (Math.abs(diff) < 0.001) return;
    const cls = diff > 0 ? 'item-compare better' : 'item-compare worse';
    rows.push(`<div class="${cls}"><span>${statLabel(key)}</span><span>${formatStat(diff)}</span></div>`);
  });
  if (!rows.length) rows.push('<div class="item-compare neutral">Без изменений</div>');
  return `<div class="item-section compare-block"><div class="compare-title">Сравнение</div>${rows.join('')}</div>`;
}

function aggregateStats(item) {
  const result = {};
  const merge = stats => {
    Object.entries(stats || {}).forEach(([key, value]) => {
      if (typeof value === 'number') {
        result[key] = (result[key] || 0) + value;
      }
    });
  };
  merge(item.stats);
  if (item.legendary?.bonuses) merge(item.legendary.bonuses);
  return result;
}

function aggregateSpecialEffects(item) {
  const result = {};
  const merge = effects => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      if (typeof value === 'number') {
        result[key] = (result[key] || 0) + value;
      }
    });
  };
  merge(item.special);
  if (item.legendary?.special) merge(item.legendary.special);
  return result;
}

function classLabel(classId) {
  return PLAYER_CLASSES[classId]?.label || classId;
}

export function getInventoryData() {
  const player = gameState.player;
  if (!player) return { items: [], equipment: {} };
  return { items: player.inventory, equipment: player.equipment };
}

