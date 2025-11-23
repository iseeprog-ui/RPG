

export interface Vector {
  x: number;
  y: number;
}

export interface Entity extends Vector {
  vx: number;
  vy: number;
  angle: number;
  radius: number;
}

export type ItemType = 'resource' | 'weapon' | 'shield' | 'engine' | 'scanner';

export interface ItemStats {
  damage?: number;
  shieldBonus?: number;
  speedBonus?: number;
  range?: number;
  cooldown?: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  icon: string;
  value: number;
  price?: number; // Cost to buy
  stats?: ItemStats;
  description?: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  description: string;
  cost: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'kill' | 'collect' | 'explore';
  targetAmount: number;
  currentAmount: number;
  rewardCredits: number;
  completed: boolean;
}

export interface WorldObject extends Entity {
  id: string;
  type: 'planet' | 'asteroid' | 'station' | 'nebula' | 'star' | 'gate';
  color: string;
  image?: string; 
  resources?: number;
  // Visual props
  seed?: number; 
  orbitRadius?: number; 
  orbitSpeed?: number;
  destinationSystem?: string;
  name?: string;
  // Visual Rendering Props
  hasRings?: boolean;
  ringColor?: string;
  atmosphereColor?: string;
  craterSeed?: number;
}

export interface SolarSystem {
  id: string;
  name: string;
  difficulty: number;
  background: string;
  objects: WorldObject[];
  enemyCountFactor: number;
  // Galaxy Map Coordinates (0-100 range)
  mapX: number;
  mapY: number;
  connections: string[]; // IDs of connected systems
  description?: string;
}

export interface LootBox extends Entity {
  id: string;
  item: Item;
  life: number;
}

export interface EquipmentSlots {
  weapon: Item | null;
  shield: Item | null;
  engine: Item | null;
  scanner: Item | null;
}

export interface Ship extends Entity {
  id: string;
  rotation: number;
  turretAngle: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  fuel: number;
  maxFuel: number;
  credits: number;
  faction: 'player' | 'traders' | 'feds' | 'clan' | 'pirates';
  type: string;
  inventory: Item[];
  slots: EquipmentSlots;
  skills: { [key: string]: Skill };
  activeQuests: Quest[];
  level: number;
  xp: number;
  maxXp: number;
  data?: {
    cooldown?: number;
    boostFuel?: number;
    isBoosting?: boolean;
    docked?: boolean;
    canDock?: boolean;
    canWarp?: boolean;
    warpTarget?: string;
  };
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'thrust' | 'explosion' | 'spark' | 'smoke' | 'boost' | 'shockwave' | 'warp';
}

export interface Bullet extends Entity {
  life: number;
  damage: number;
  owner: 'player' | 'enemy';
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  velocity: number;
  size: number;
}

export interface GameState {
  player: Ship;
  enemyCount: number;
  fps: number;
  worldSize: { w: number, h: number };
  nearbyObjects: WorldObject[];
  nearbyLoot: LootBox[];
  nearbyEnemies: Ship[];
  currentSystemId: string;
  systems: SolarSystem[]; // Full list for map
  shopItems: Item[]; 
}