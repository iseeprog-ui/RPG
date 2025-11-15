export const gameState = {
  time: 0,
  delta: 16,
  activeZone: null,
  camera: { x: 0, y: 0, shake: 0, flash: 0 },
  input: {
    keys: {},
    mouse: { x: 0, y: 0, left: false, right: false }
  },
  player: null,
  enemies: [],
  projectiles: [],
  particles: [],
  drops: [],
  quests: [],
  portals: [],
  map: {
    tiles: [],
    decor: [],
    data: {},
    width: 0,
    height: 0
  },
  stats: {
    skillPoints: 0,
    killCount: 0,
    lootCount: 0,
    gold: 0
  },
  ui: {
    log: [],
    tooltip: null,
    lootFilter: 'common'
  },
  save: null
};

export function resetGameState() {
  gameState.time = 0;
  gameState.delta = 16;
  gameState.activeZone = null;
  gameState.camera = { x: 0, y: 0, shake: 0, flash: 0 };
  gameState.player = null;
  gameState.enemies = [];
  gameState.projectiles = [];
  gameState.particles = [];
  gameState.drops = [];
  gameState.quests = [];
  gameState.portals = [];
  gameState.map = { tiles: [], decor: [], data: {}, width: 0, height: 0 };
  gameState.stats = { skillPoints: 0, killCount: 0, lootCount: 0, gold: 0 };
  gameState.ui.log = [];
  gameState.ui.tooltip = null;
}
