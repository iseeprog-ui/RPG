

import { Ship, Particle, Bullet, Vector, FloatingText, WorldObject, LootBox, Item, Quest, SolarSystem } from '../types';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;
  
  // Game Entities
  player: Ship;
  enemies: Ship[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  worldObjects: WorldObject[] = [];
  loot: LootBox[] = [];
  
  // System State
  systems: { [key: string]: SolarSystem } = {};
  currentSystemId: string = 'alpha';
  
  // Shop Inventory
  shopItems: Item[] = [
    { id: 'lf2', name: 'LF-2 Plasma', type: 'weapon', rarity: 'common', quantity: 1, value: 500, price: 2000, icon: '🔫', stats: { damage: 25, cooldown: 0.22 }, description: "Standard blue plasma laser." },
    { id: 'lf3', name: 'LF-3 Spectral', type: 'weapon', rarity: 'rare', quantity: 1, value: 2000, price: 10000, icon: '🔫', stats: { damage: 45, cooldown: 0.18 }, description: "High-frequency green emitter." },
    { id: 'lf4', name: 'LF-4 Hyper', type: 'weapon', rarity: 'legendary', quantity: 1, value: 15000, price: 40000, icon: '🔫', stats: { damage: 85, cooldown: 0.15 }, description: "Unstable red matter projection." },
    { id: 'shd2', name: 'B02 Shield', type: 'shield', rarity: 'common', quantity: 1, value: 500, price: 2000, icon: '🛡️', stats: { shieldBonus: 500 }, description: "Reinforced titanium shield gen." },
    { id: 'shd3', name: 'A03 Heavy', type: 'shield', rarity: 'epic', quantity: 1, value: 2500, price: 8000, icon: '🛡️', stats: { shieldBonus: 1200 }, description: "Military grade forcefield." },
    { id: 'spd2', name: 'G3-Turbo', type: 'engine', rarity: 'rare', quantity: 1, value: 1000, price: 5000, icon: '🚀', stats: { speedBonus: 50 }, description: "Enhanced fusion thruster." },
    { id: 'repair_droid', name: 'Nanobots', type: 'resource', rarity: 'common', quantity: 10, value: 50, price: 500, icon: '🔧', description: "Instant hull repair bots." }
  ];

  // State
  camera: Vector = { x: 0, y: 0 };
  mouse: Vector = { x: 0, y: 0 };
  keys: Set<string> = new Set();
  lastTime: number = 0;
  shake: number = 0;
  fps: number = 60;
  gameTime: number = 0;
  zoom: number = 0.7; // 30% Zoom out
  
  // World Config
  worldSize = 12000;

  onStateUpdate: (state: any) => void;

  constructor(canvas: HTMLCanvasElement, onStateUpdate: (state: any) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.onStateUpdate = onStateUpdate;
    
    // Starter Config
    this.player = this.createPlayer();
    this.initSystems();
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    
    // Load Initial System
    this.loadSystem('alpha');
    
    this.loop(0);
  }

  createPlayer(): Ship {
    const startLaser: Item = { id: 'lf1', name: 'LF-1 Laser', type: 'weapon', rarity: 'common', quantity: 1, value: 0, icon: '🔫', stats: { damage: 15, cooldown: 0.25 }, description: "Basic starter laser." };
    const startEngine: Item = { id: 'spd1', name: 'G3-Ion', type: 'engine', rarity: 'common', quantity: 1, value: 0, icon: '🚀', stats: { speedBonus: 0 }, description: "Standard ion drive." };
    const startShield: Item = { id: 'shd1', name: 'A01 Shield', type: 'shield', rarity: 'common', quantity: 1, value: 0, icon: '🛡️', stats: { shieldBonus: 200 }, description: "Civilian shield generator." };

    return {
      id: 'Commander',
      x: 3000, y: 0, vx: 0, vy: 0, angle: -Math.PI / 2, radius: 25,
      rotation: -Math.PI / 2, turretAngle: 0,
      hp: 2000, maxHp: 2000, shield: 500, maxShield: 500,
      fuel: 1000, maxFuel: 1000, credits: 5000,
      faction: 'player', type: 'Goliath Mk.II',
      level: 1, xp: 0, maxXp: 1000,
      inventory: [],
      slots: { weapon: startLaser, shield: startShield, engine: startEngine, scanner: null },
      skills: {
        'lasers': { id: 'lasers', name: 'Laser Tech', level: 1, maxLevel: 10, description: '+10% Dmg', cost: 1000 },
        'shields': { id: 'shields', name: 'Shield Eng.', level: 1, maxLevel: 10, description: '+10% Cap', cost: 1000 },
        'hull': { id: 'hull', name: 'Hull Plating', level: 1, maxLevel: 10, description: '+200 HP', cost: 1500 },
      },
      activeQuests: [
        { id: 'q1', title: 'First Patrol', description: 'Destroy 5 Pirates', type: 'kill', targetAmount: 5, currentAmount: 0, rewardCredits: 2000, completed: false },
      ],
      data: { cooldown: 0, boostFuel: 100, isBoosting: false, canDock: false, docked: false, canWarp: false }
    };
  }

  initSystems() {
    this.systems['alpha'] = {
        id: 'alpha', name: 'Alpha Centauri', difficulty: 1, enemyCountFactor: 1,
        background: '#0f172a',
        mapX: 20, mapY: 50, connections: ['beta'],
        description: "Federation controlled starting sector. Relatively safe.",
        objects: [
            { id: 'sun_alpha', type: 'star', x: 0, y: 0, radius: 800, color: '#fbbf24', vx:0, vy:0, angle:0 },
            { id: 'st_alpha', type: 'station', name: 'Alpha Base', x: 1500, y: 1500, radius: 200, color: '#0ea5e9', vx:0, vy:0, angle:0 },
            { id: 'gate_to_beta', type: 'gate', name: 'Gate -> Beta', x: -4000, y: 2000, radius: 150, color: '#a855f7', vx:0, vy:0, angle:0, destinationSystem: 'beta' },
            { id: 'p1', type: 'planet', x: 3000, y: -1000, radius: 400, color: '#3b82f6', vx:0, vy:0, angle:0, seed: 1, atmosphereColor: '#60a5fa' },
            { id: 'p2', type: 'planet', x: -2500, y: -3000, radius: 600, color: '#ef4444', vx:0, vy:0, angle:0, seed: 2, hasRings: true, ringColor: '#fecaca', atmosphereColor: '#f87171' }
        ]
    };

    this.systems['beta'] = {
        id: 'beta', name: 'Proxima Beta', difficulty: 2, enemyCountFactor: 1.5,
        background: '#1e1b4b',
        mapX: 50, mapY: 30, connections: ['alpha', 'gamma'],
        description: "Contested zone. High pirate activity reported near the asteroid belts.",
        objects: [
            { id: 'sun_beta', type: 'star', x: 0, y: 0, radius: 1200, color: '#ef4444', vx:0, vy:0, angle:0 },
            { id: 'gate_to_alpha', type: 'gate', name: 'Gate -> Alpha', x: 4000, y: -2000, radius: 150, color: '#a855f7', vx:0, vy:0, angle:0, destinationSystem: 'alpha' },
            { id: 'gate_to_gamma', type: 'gate', name: 'Gate -> Gamma', x: -3500, y: 3500, radius: 150, color: '#ec4899', vx:0, vy:0, angle:0, destinationSystem: 'gamma' },
            { id: 'p3', type: 'planet', x: -3000, y: 3000, radius: 900, color: '#10b981', vx:0, vy:0, angle:0, seed: 3, hasRings: true, ringColor: '#86efac', atmosphereColor: '#34d399' },
        ]
    };

    this.systems['gamma'] = {
        id: 'gamma', name: 'Gamma Sector', difficulty: 3, enemyCountFactor: 2.5,
        background: '#020617',
        mapX: 80, mapY: 60, connections: ['beta'],
        description: "Dark sector. Deep space anomaly. WARNING: Capital ships detected.",
        objects: [
            { id: 'sun_gamma', type: 'star', x: 0, y: 0, radius: 600, color: '#818cf8', vx:0, vy:0, angle:0 },
            { id: 'gate_to_beta', type: 'gate', name: 'Gate -> Beta', x: 2000, y: 0, radius: 150, color: '#a855f7', vx:0, vy:0, angle:0, destinationSystem: 'beta' },
            { id: 'p_ice', type: 'planet', x: -4000, y: -2000, radius: 700, color: '#cffafe', vx:0, vy:0, angle:0, seed: 55, atmosphereColor: '#e0f2fe' },
            { id: 'st_gamma', type: 'station', name: 'Outpost 31', x: -3000, y: 3000, radius: 150, color: '#f59e0b', vx:0, vy:0, angle:0 },
        ]
    };
  }

  loadSystem(systemId: string) {
      const sys = this.systems[systemId];
      if (!sys) return;

      this.enemies = [];
      this.bullets = [];
      this.loot = [];
      this.worldObjects = [...sys.objects];
      this.currentSystemId = systemId;
      
      const asteroidCount = systemId === 'beta' ? 400 : (systemId === 'gamma' ? 600 : 200);
      for (let i = 0; i < asteroidCount; i++) {
          const dist = 2000 + Math.random() * (this.worldSize/2 - 2000);
          const angle = Math.random() * Math.PI * 2;
          this.worldObjects.push({
            id: `ast_${i}`,
            type: 'asteroid',
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * (20 + sys.difficulty * 5),
            vy: (Math.random() - 0.5) * (20 + sys.difficulty * 5),
            angle: Math.random() * Math.PI * 2,
            radius: 30 + Math.random() * 50,
            color: '#64748b',
            resources: 50 + Math.random() * 100,
            seed: Math.random() * 1000,
            craterSeed: Math.random() * 1000
          });
      }

      for (let i = 0; i < 15; i++) {
        this.worldObjects.push({
          id: `nebula_${i}`,
          type: 'nebula',
          x: (Math.random() - 0.5) * this.worldSize,
          y: (Math.random() - 0.5) * this.worldSize,
          vx: 0, vy: 0, angle: Math.random() * Math.PI * 2,
          radius: 1500 + Math.random() * 2000,
          color: systemId === 'beta' ? `hsla(${Math.random() * 60}, 60%, 10%, 0.1)` : (systemId === 'gamma' ? `hsla(${260 + Math.random() * 60}, 70%, 8%, 0.1)` : `hsla(${200 + Math.random() * 60}, 60%, 10%, 0.1)`)
        });
      }
      
      this.addFloatingText(this.player.x, this.player.y - 100, `ENTERED ${sys.name.toUpperCase()}`, '#ffffff', 40);
      this.spawnWave();

      // Boss Logic for Gamma System
      if (systemId === 'gamma') {
          this.spawnBoss();
      }
  }

  spawnBoss() {
      const boss: Ship = {
          id: 'Dreadnought_Omega',
          x: 0, y: -4000,
          vx: 0, vy: 0,
          angle: 0, rotation: 0, radius: 120, turretAngle: 0,
          hp: 8000, maxHp: 8000,
          shield: 5000, maxShield: 5000,
          fuel: 1000, maxFuel: 1000, credits: 10000,
          faction: 'pirates', type: 'Dreadnought',
          level: 50, xp: 0, maxXp: 0, inventory: [], skills: {}, activeQuests: [],
          slots: { 
              weapon: { id: 'boss_laser', name: 'Omega Beam', type: 'weapon', rarity: 'legendary', quantity: 1, value: 0, icon: '☠️', stats: { damage: 150, cooldown: 0.1 } },
              shield: null, engine: null, scanner: null 
          }
      };
      this.enemies.push(boss);
      this.addFloatingText(0, -4200, "WARNING: DREADNOUGHT DETECTED", '#ff0000', 50);
  }

  warp(targetSystem: string) {
      this.player.data!.canWarp = false;
      this.player.data!.warpTarget = undefined;
      this.spawnExplosion(this.player.x, this.player.y, 'warp', 50);
      this.player.vx = 0;
      this.player.vy = 0;
      
      setTimeout(() => {
          this.loadSystem(targetSystem);
          this.player.x = 3000; 
          this.player.y = 0;
      }, 1000);
  }

  // --- Actions ---

  public sellItem(itemId: string) {
      const idx = this.player.inventory.findIndex(i => i.id === itemId);
      if (idx !== -1) {
          const item = this.player.inventory[idx];
          const totalValue = item.value * item.quantity;
          this.player.credits += totalValue;
          this.player.inventory.splice(idx, 1);
          this.addFloatingText(this.player.x, this.player.y - 50, `SOLD: +${totalValue} Cr`, '#fbbf24', 30);
      }
  }

  public buyItem(item: Item) {
      if (!item.price) return;
      if (this.player.credits >= item.price) {
          this.player.credits -= item.price;
          const newItem = JSON.parse(JSON.stringify(item));
          const existing = this.player.inventory.find(i => i.id === newItem.id);
          if (existing && item.type === 'resource') {
              existing.quantity += newItem.quantity;
          } else {
              this.player.inventory.push(newItem);
          }
          this.addFloatingText(this.player.x, this.player.y - 50, `BOUGHT: ${item.name}`, '#4ade80', 30);
      } else {
          this.addFloatingText(this.player.x, this.player.y - 50, `INSUFFICIENT FUNDS`, '#ef4444', 30);
      }
  }

  public equipItem(inventoryIndex: number) {
      const item = this.player.inventory[inventoryIndex];
      if (!item) return;

      let slotType: keyof typeof this.player.slots | null = null;
      if (item.type === 'weapon') slotType = 'weapon';
      if (item.type === 'shield') slotType = 'shield';
      if (item.type === 'engine') slotType = 'engine';
      if (item.type === 'scanner') slotType = 'scanner';

      if (slotType) {
          const currentEquipped = this.player.slots[slotType];
          this.player.slots[slotType] = item;
          
          this.player.inventory.splice(inventoryIndex, 1);
          if (currentEquipped) {
              this.player.inventory.push(currentEquipped);
          }
          this.addFloatingText(this.player.x, this.player.y - 50, `EQUIPPED: ${item.name}`, '#38bdf8', 25);
      }
  }

  public repairShip() {
      const cost = Math.floor((this.player.maxHp - this.player.hp) * 0.5);
      if (cost <= 0) return;
      
      if (this.player.credits >= cost) {
          this.player.credits -= cost;
          this.player.hp = this.player.maxHp;
          this.addFloatingText(this.player.x, this.player.y - 50, `REPAIRED: -${cost} Cr`, '#4ade80', 30);
      } else {
          const heal = Math.floor(this.player.credits * 2);
          this.player.credits = 0;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
          this.addFloatingText(this.player.x, this.player.y - 50, `PARTIAL REPAIR`, '#facc15', 30);
      }
  }

  public upgradeSkill(skillId: string) {
      const skill = this.player.skills[skillId];
      if (skill && skill.level < skill.maxLevel) {
          if (this.player.credits >= skill.cost) {
              this.player.credits -= skill.cost;
              skill.level++;
              
              if (skillId === 'hull') {
                  this.player.maxHp += 200;
                  this.player.hp += 200;
              }
              
              skill.cost = Math.floor(skill.cost * 1.5);
              this.addFloatingText(this.player.x, this.player.y - 60, `UPGRADE COMPLETE`, '#a855f7', 35);
          } else {
              this.addFloatingText(this.player.x, this.player.y - 50, `NEED ${skill.cost} CREDITS`, '#ef4444', 30);
          }
      }
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  bindInput() {
    window.addEventListener('keydown', e => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', e => {
        const k = e.key.toLowerCase();
        this.keys.delete(k);
        if (k === 'f' && this.player.data?.canDock) {
            this.player.data.docked = !this.player.data.docked;
            if (this.player.data.docked) { this.player.vx = 0; this.player.vy = 0; this.repairShip(); } 
            else { this.player.vx = 0; this.player.vy = 0; }
        }
        if (k === 'j' && this.player.data?.canWarp && this.player.data.warpTarget) {
            this.warp(this.player.data.warpTarget);
        }
    });
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => this.keys.add('mouse_left'));
    window.addEventListener('mouseup', () => this.keys.delete('mouse_left'));
  }

  spawnWave() {
    if (this.enemies.length > 8) return;
    const sys = this.systems[this.currentSystemId];
    const count = (3 + Math.floor(this.player.level * 1.2)) * sys.enemyCountFactor;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2000 + Math.random() * 1000;
      
      const rand = Math.random();
      let type = 'Interceptor';
      let hp = 60;
      let radius = 20;
      let dmg = 5;

      const level = this.player.level;

      if (level >= 15 && rand > 0.95) {
          type = 'Battleship';
          hp = 1500; radius = 90; dmg = 50;
      } else if (level >= 10 && rand > 0.9) {
          type = 'Destroyer';
          hp = 400; radius = 50; dmg = 25;
      } else if (level >= 6 && rand > 0.8) {
          type = 'Bomber';
          hp = 200; radius = 35; dmg = 35; // Glass cannon
      } else if (level >= 4 && rand > 0.7) {
          type = 'Cruiser';
          hp = 150; radius = 35; dmg = 12;
      } else if (level >= 2 && rand > 0.5) {
           type = 'Scout';
           hp = 40; radius = 15; dmg = 6; // Fast
      }
      
      const sysBuff = sys.difficulty; 

      this.enemies.push({
        id: `enemy_${Date.now()}_${i}`,
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        vx: 0, vy: 0, 
        angle: angle, rotation: angle, radius, turretAngle: 0,
        hp: hp * sysBuff, maxHp: hp * sysBuff, 
        shield: (hp/2) * sysBuff, maxShield: (hp/2) * sysBuff,
        fuel: 0, maxFuel: 0, credits: 0,
        faction: 'pirates', type,
        level: this.player.level, xp: 0, maxXp: 0, inventory: [], skills: {}, activeQuests: [],
        slots: { weapon: { ...this.player.slots.weapon!, stats: { ...this.player.slots.weapon!.stats, damage: dmg * sysBuff } }, shield: null, engine: null, scanner: null } as any
      });
    }
  }

  loop(timestamp: number) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.fps = 1 / dt;
    this.lastTime = timestamp;
    this.gameTime += dt;

    if (!this.player.data?.docked) {
        this.update(dt);
    }
    this.render();

    const minimapRange = 5000;
    
    this.onStateUpdate({
      player: { ...this.player },
      enemyCount: this.enemies.length,
      fps: Math.round(this.fps),
      worldSize: { w: this.worldSize, h: this.worldSize },
      nearbyObjects: this.worldObjects.filter(o => Math.hypot(o.x - this.player.x, o.y - this.player.y) < minimapRange && o.type !== 'nebula'),
      nearbyEnemies: this.enemies.filter(e => Math.hypot(e.x - this.player.x, e.y - this.player.y) < minimapRange),
      nearbyLoot: this.loot.filter(l => Math.hypot(l.x - this.player.x, l.y - this.player.y) < minimapRange),
      currentSystemId: this.currentSystemId,
      systems: Object.values(this.systems),
      shopItems: this.shopItems
    });

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number) {
    // Zoom compensated mouse coordinates
    const screenX = (this.player.x - this.camera.x) * this.zoom + this.width / 2;
    const screenY = (this.player.y - this.camera.y) * this.zoom + this.height / 2;
    const targetRotation = Math.atan2(this.mouse.y - screenY, this.mouse.x - screenX);
    
    let diff = targetRotation - this.player.rotation;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.player.rotation += diff * 10 * dt;
    this.player.turretAngle = this.player.rotation;

    const engineBonus = this.player.slots.engine?.stats?.speedBonus || 0;
    const accel = 1500 + engineBonus * 10;
    const fwdX = Math.cos(this.player.rotation);
    const fwdY = Math.sin(this.player.rotation);
    const rightX = Math.cos(this.player.rotation + Math.PI/2);
    const rightY = Math.sin(this.player.rotation + Math.PI/2);

    let fx = 0, fy = 0;
    let isMoving = false;

    let isBoosting = false;
    if (this.keys.has('shift') && (this.player.data?.boostFuel || 0) > 0) {
        isBoosting = true;
        this.player.data!.boostFuel! -= 30 * dt;
    } else if ((this.player.data?.boostFuel || 0) < 100) {
        this.player.data!.boostFuel! += 10 * dt;
    }
    this.player.data!.isBoosting = isBoosting;
    const speedMult = isBoosting ? 2.0 : 1.0;

    if (this.keys.has('w')) { fx += fwdX * accel * speedMult; fy += fwdY * accel * speedMult; isMoving = true; }
    if (this.keys.has('s')) { fx -= fwdX * accel * 0.6; fy -= fwdY * accel * 0.6; isMoving = true; }
    if (this.keys.has('a')) { fx -= rightX * accel * 0.8; fy -= rightY * accel * 0.8; isMoving = true; }
    if (this.keys.has('d')) { fx += rightX * accel * 0.8; fy += rightY * accel * 0.8; isMoving = true; }

    this.player.vx += fx * dt;
    this.player.vy += fy * dt;
    this.player.vx *= 0.95;
    this.player.vy *= 0.95;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    this.camera.x += (this.player.x - this.camera.x) * 0.1;
    this.camera.y += (this.player.y - this.camera.y) * 0.1;

    if (this.keys.has('mouse_left') && (this.player.data?.cooldown || 0) <= 0) {
        this.fireBullet(this.player, this.player.rotation);
        const weaponCooldown = this.player.slots.weapon?.stats?.cooldown || 0.2;
        this.player.data!.cooldown = weaponCooldown; 
    }
    if (this.player.data?.cooldown && this.player.data.cooldown > 0) {
        this.player.data.cooldown -= dt;
    }

    if (isMoving) {
        if (this.keys.has('w') || isBoosting) {
            this.addParticle(this.player.x - fwdX * 30, this.player.y - fwdY * 30, isBoosting ? 'boost' : 'thrust');
        }
        if (this.keys.has('a')) this.addParticle(this.player.x + rightX*20, this.player.y + rightY*20, 'thrust');
        if (this.keys.has('d')) this.addParticle(this.player.x - rightX*20, this.player.y - rightY*20, 'thrust');
    }

    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateLoot(dt);
    this.checkInteractions();
    
    this.worldObjects.forEach(obj => {
        if (obj.type === 'asteroid') {
            obj.x += obj.vx * dt;
            obj.y += obj.vy * dt;
            obj.angle += dt * 0.2;
        }
    });

    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if(p.type === 'explosion') p.radius += dt * 50;
      if(p.type === 'warp') p.radius += dt * 1000; 
      if(p.type === 'shockwave') p.radius += dt * 300;
      if(p.type === 'shield_hit') p.radius += dt * 100;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    this.floatingTexts.forEach(t => { t.y -= t.velocity * dt; t.life -= dt; });
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

    const maxShield = (this.player.maxShield + (this.player.slots.shield?.stats?.shieldBonus || 0)) * (1 + (this.player.skills['shields'].level - 1) * 0.1);
    this.player.maxShield = maxShield;
    if (this.player.shield < this.player.maxShield) this.player.shield = Math.min(this.player.maxShield, this.player.shield + 20 * dt);
  }

  checkInteractions() {
      let canDock = false;
      let canWarp = false;
      let warpTarget: string | undefined;

      this.worldObjects.forEach(obj => {
          if (obj.type === 'station') {
              const dist = Math.hypot(obj.x - this.player.x, obj.y - this.player.y);
              if (dist < obj.radius + 100) canDock = true;
          }
          if (obj.type === 'gate') {
              const dist = Math.hypot(obj.x - this.player.x, obj.y - this.player.y);
              if (dist < obj.radius + 50) {
                  canWarp = true;
                  warpTarget = obj.destinationSystem;
              }
          }
      });

      this.player.data!.canDock = canDock;
      this.player.data!.canWarp = canWarp;
      this.player.data!.warpTarget = warpTarget;
  }

  updateBullets(dt: number) {
    this.bullets.forEach(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      
      if (b.owner === 'player') {
        this.enemies.forEach(e => {
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 10) {
            b.life = 0;
            this.damageEntity(e, b.damage);
            this.addParticle(b.x, b.y, 'spark');
          }
        });
        
        this.worldObjects.filter(o => o.type === 'asteroid').forEach(a => {
           if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
              b.life = 0;
              
              if (a.resources && a.resources > 0) {
                 // Mining visual effect
                 for(let i=0; i<4; i++) this.addParticle(b.x, b.y, 'mining');
                 
                 a.resources -= b.damage;
                 if (Math.random() > 0.8) {
                    this.spawnLoot(a.x, a.y, 'resource');
                    this.addParticle(b.x, b.y, 'spark');
                 }
                 
                 if (a.resources <= 0) {
                   this.spawnExplosion(a.x, a.y, 'explosion', 8);
                   a.radius = 0; 
                 }
              } else {
                 this.addParticle(b.x, b.y, 'smoke');
              }
           }
        });
      } else {
        if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < this.player.radius) {
            b.life = 0;
            this.damagePlayer(b.damage);
        }
      }
    });
    this.bullets = this.bullets.filter(b => b.life > 0);
    this.worldObjects = this.worldObjects.filter(o => o.type !== 'asteroid' || o.radius > 0);
  }

  updateEnemies(dt: number) {
     this.enemies.forEach(e => {
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 1500) {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.rotation += Math.sign(diff) * 3 * dt;
        
        const forward = { x: Math.cos(e.rotation), y: Math.sin(e.rotation) };
        let speed = 200;
        let range = 400;

        if (e.type === 'Interceptor') { speed = 350; range = 200; }
        else if (e.type === 'Scout') { speed = 450; range = 150; }
        else if (e.type === 'Bomber') { speed = 250; range = 300; }
        else if (e.type === 'Cruiser') { speed = 200; range = 400; }
        else if (e.type === 'Destroyer') { speed = 120; range = 700; }
        else if (e.type === 'Battleship') { speed = 80; range = 900; }
        else if (e.type === 'Dreadnought') { speed = 40; range = 800; }

        if (dist > range) { e.vx += forward.x * speed * dt; e.vy += forward.y * speed * dt; } 
        else if (dist < range - 50) { e.vx -= forward.x * speed * dt; e.vy -= forward.y * speed * dt; }
        
        // Shoot logic
        let shootChance = 0.02;
        if (e.type === 'Dreadnought') shootChance = 0.1;

        if (dist < range + 200 && Math.random() < shootChance) {
           if (e.type === 'Dreadnought') {
               // Boss shoots multiple pellets
               this.fireBullet(e, e.rotation);
               this.fireBullet(e, e.rotation + 0.2);
               this.fireBullet(e, e.rotation - 0.2);
           } else {
               this.fireBullet(e, e.rotation + (Math.random()-0.5)*0.1);
           }
        }
      }
      
      e.vx *= 0.98;
      e.vy *= 0.98;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    });

    this.enemies = this.enemies.filter(e => e.hp > 0);
    // Only spawn standard waves if not in Boss mode (or maybe allow minions)
    if (this.enemies.length < 2 && this.currentSystemId !== 'gamma') this.spawnWave();
  }

  updateLoot(dt: number) {
    this.loot.forEach(l => {
      const dx = this.player.x - l.x;
      const dy = this.player.y - l.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 400) { 
        l.x += (dx / dist) * 500 * dt;
        l.y += (dy / dist) * 500 * dt;
      }
      l.y += Math.sin(this.gameTime * 5 + parseInt(l.id.split('_')[1]||'0')) * 0.5;

      if (dist < 40) {
        l.life = 0;
        this.collectItem(l.item);
        this.addFloatingText(this.player.x, this.player.y - 40, `+ ${l.item.name}`, '#4ade80', 20);
      }
    });
    this.loot = this.loot.filter(l => l.life > 0);
  }

  collectItem(item: Item) {
    const existing = this.player.inventory.find(i => i.id === item.id);
    if (existing) existing.quantity += item.quantity;
    else this.player.inventory.push(item);
    if (item.type === 'resource') this.updateQuestProgress('collect', item.quantity);
  }

  updateQuestProgress(type: 'kill'|'collect', amount: number) {
     this.player.activeQuests.forEach(q => {
        if (!q.completed && q.type === type) {
          q.currentAmount += amount;
          if (q.currentAmount >= q.targetAmount) {
             q.completed = true;
             this.player.credits += q.rewardCredits;
             this.player.xp += 200;
             this.addFloatingText(this.player.x, this.player.y - 60, "QUEST COMPLETE!", '#facc15', 30);
          }
        }
     });
  }

  fireBullet(shooter: Ship, angle: number) {
    const isPlayer = shooter.faction === 'player';
    let baseDmg = 10;
    let speed = 1800;
    let color = '#ff0000';
    let radius = 4;

    if (isPlayer) {
        const weapon = shooter.slots.weapon;
        baseDmg = (weapon?.stats?.damage || 10) * (1 + (this.player.skills['lasers'].level - 1) * 0.1);
        // Visuals based on weapon type
        if (weapon?.id.startsWith('lf2')) { color = '#3b82f6'; radius = 5; } // Blue
        else if (weapon?.id.startsWith('lf3')) { color = '#10b981'; radius = 6; } // Green
        else if (weapon?.id.startsWith('lf4')) { color = '#a855f7'; radius = 7; speed = 2200; } // Purple
        else { color = '#f97316'; radius = 4; } // Default Orange (LF-1)
    } else {
        baseDmg = shooter.slots?.weapon?.stats?.damage || 8;
        if (shooter.type === 'Destroyer') color = '#a855f7';
        else if (shooter.type === 'Battleship') { color = '#ffffff'; speed = 2000; radius = 8; }
        else if (shooter.type === 'Dreadnought') { color = '#facc15'; speed = 1500; radius = 12; baseDmg = 40; }
        else if (shooter.type === 'Bomber') { color = '#be123c'; radius = 6; }
        else if (shooter.type === 'Scout') { color = '#facc15'; speed = 1200; radius = 3; }
        else color = '#ef4444';
    }
    
    this.addParticle(shooter.x + Math.cos(angle)*shooter.radius, shooter.y + Math.sin(angle)*shooter.radius, 'boost');

    this.bullets.push({
      x: shooter.x + Math.cos(angle) * (shooter.radius + 5),
      y: shooter.y + Math.sin(angle) * (shooter.radius + 5),
      vx: Math.cos(angle) * speed + shooter.vx * 0.2,
      vy: Math.sin(angle) * speed + shooter.vy * 0.2,
      angle: angle,
      radius: radius,
      life: 1.5,
      damage: baseDmg + Math.random() * 5,
      owner: isPlayer ? 'player' : 'enemy',
      color: color
    });
  }

  spawnLoot(x: number, y: number, type: 'resource' | 'crate') {
     const rarity = Math.random();
     let item: Item;
     if (type === 'resource') {
        const ores = ['Prometium', 'Endurium', 'Terbium', 'Xenomit'];
        const name = ores[Math.floor(Math.random() * ores.length)];
        let val = 10; if(name === 'Terbium') val = 20; if(name === 'Xenomit') val = 50;
        item = { id: name.toLowerCase(), name, type: 'resource', rarity: 'common', quantity: 1, value: val, icon: '💎' };
     } else {
        if (rarity > 0.95) item = { id: 'lf4', name: 'LF-4 Hyper', type: 'weapon', rarity: 'legendary', quantity: 1, value: 5000, icon: '🔫', stats: { damage: 40, cooldown: 0.15 } };
        else if (rarity > 0.85) item = { id: 'shd3', name: 'B03 Shield', type: 'shield', rarity: 'epic', quantity: 1, value: 2500, icon: '🛡️', stats: { shieldBonus: 800 } };
        else if (rarity > 0.70) item = { id: 'lf3', name: 'LF-3 Laser', type: 'weapon', rarity: 'rare', quantity: 1, value: 1000, icon: '🔫', stats: { damage: 25, cooldown: 0.2 } };
        else item = { id: 'ammo', name: 'Power Cells', type: 'resource', rarity: 'common', quantity: 50, value: 5, icon: '🔋' };
     }
     this.loot.push({ id: `loot_${Math.random()}`, x, y, vx: 0, vy: 0, angle: 0, radius: 15, item, life: 60 });
  }

  damageEntity(e: Ship, amount: number) {
    let hullDmg = amount;
    if (e.shield > 0) {
      e.shield -= amount;
      this.addParticle(e.x, e.y, 'shield_hit');
      if (e.shield < 0) { hullDmg = -e.shield; e.shield = 0; } 
      else hullDmg = 0;
    }
    e.hp -= hullDmg;
    this.addFloatingText(e.x, e.y - 30, Math.floor(amount).toString(), hullDmg > 0 ? '#ef4444' : '#3b82f6', 20);
    if (e.hp <= 0) {
      this.spawnExplosion(e.x, e.y, 'explosion', 15);
      this.shake = 5;
      if (e.faction !== 'player') {
        let credits = 100;
        let xp = 50;
        if (e.type === 'Destroyer') { credits = 500; xp = 250; }
        else if (e.type === 'Battleship') { credits = 2000; xp = 1000; }
        else if (e.type === 'Dreadnought') { credits = 10000; xp = 5000; this.spawnLoot(e.x, e.y, 'crate'); this.spawnLoot(e.x, e.y, 'crate'); }
        else if (e.type === 'Bomber') { credits = 150; xp = 80; }
        else if (e.type === 'Scout') { credits = 50; xp = 25; }

        this.player.credits += credits;
        this.player.xp += xp;
        this.spawnLoot(e.x, e.y, 'crate');
        this.updateQuestProgress('kill', 1);
      }
    }
  }
  
  damagePlayer(amount: number) {
      let hullDmg = amount;
      if (this.player.shield > 0) {
          const absorb = amount * 0.8;
          this.player.shield -= absorb;
          hullDmg = amount - absorb;
          this.addParticle(this.player.x, this.player.y, 'shield_hit');
      }
      this.player.hp -= hullDmg;
      this.shake = 2;
      if (this.player.hp <= 0) {
          this.player.hp = this.player.maxHp;
          this.player.x = 3000; this.player.y = 0;
          this.player.vx = 0; this.player.vy = 0;
          this.player.data!.docked = true;
          this.enemies = []; 
          alert("SHIP DESTROYED. EMERGENCY WARP TO STATION.");
      }
  }

  spawnExplosion(x: number, y: number, type: 'explosion' | 'smoke' | 'warp', count: number) {
    this.addParticle(x, y, 'shockwave');
    for(let i=0; i<count; i++) {
        this.addParticle(x, y, type);
    }
  }

  addParticle(x: number, y: number, type: Particle['type']) {
    const angle = Math.random() * Math.PI * 2;
    const speed = type === 'shockwave' || type === 'shield_hit' ? 0 : (type === 'warp' ? Math.random()*500 + 200 : Math.random() * 200);
    const life = type === 'shockwave' ? 0.4 : (type === 'shield_hit' ? 0.3 : (type === 'warp' ? 1.0 : Math.random() * 0.8));
    
    let color = '#94a3b8';
    if (type === 'boost') color = '#f59e0b';
    else if (type === 'thrust') color = '#60a5fa';
    else if (type === 'explosion') color = '#f97316';
    else if (type === 'warp') color = '#fff';
    else if (type === 'mining') color = '#facc15'; // Gold/Yellow mining sparks
    else if (type === 'spark') color = '#fef08a';
    else if (type === 'smoke') color = '#94a3b8';
    else if (type === 'shockwave') color = '#cbd5e1';
    else if (type === 'shield_hit') color = '#3b82f6';

    this.particles.push({
      x, y,
      vx: Math.cos(angle) * speed + (type === 'thrust' || type === 'boost' ? this.player.vx * 0.2 : 0),
      vy: Math.sin(angle) * speed + (type === 'thrust' || type === 'boost' ? this.player.vy * 0.2 : 0),
      angle: Math.random() * 6,
      radius: 0, life, maxLife: life,
      size: type === 'shockwave' ? 10 : (type === 'warp' ? 4 : Math.random() * 4 + 2),
      color: color,
      type: type
    });
  }

  addFloatingText(x: number, y: number, text: string, color: string, size: number) {
     this.floatingTexts.push({ x, y, text, color, life: 1.0, velocity: 30, size });
  }

  // --- RENDERING ---
  render() {
    const ctx = this.ctx;
    const { width, height } = this;
    
    ctx.clearRect(0, 0, width, height);
    
    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;
    if(this.shake > 0) this.shake *= 0.9;
    
    ctx.save();
    
    // Camera Transform with Zoom
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

    this.drawNebulae();
    this.drawStarfield(0.05, '#475569', 2);
    this.drawStarfield(0.2, '#ffffff', 3);
    this.drawStarfield(0.5, '#cbd5e1', 4);

    const sun = this.worldObjects.find(o => o.type === 'star');
    if(sun) {
        const grad = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.radius * 4);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(sun.x - sun.radius*4, sun.y - sun.radius*4, sun.radius*8, sun.radius*8);
    }

    this.worldObjects.filter(o => o.type !== 'nebula').forEach(obj => {
        switch(obj.type) {
            case 'planet': this.drawPlanet(obj); break;
            case 'asteroid': this.drawAsteroid(obj); break;
            case 'station': this.drawStation(obj); break;
            case 'gate': this.drawGate(obj); break;
            case 'star': this.drawStar(obj); break;
        }
    });

    this.drawLoot();
    this.drawParticles();
    this.drawShips();
    this.drawBullets();
    this.drawFloatingText();
    this.drawReticle();

    ctx.restore();
  }

  drawStar(obj: WorldObject) {
      const ctx = this.ctx;
      const time = this.gameTime;
      ctx.save();
      ctx.translate(obj.x, obj.y);
      
      const grad = ctx.createRadialGradient(0, 0, obj.radius * 0.2, 0, 0, obj.radius);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.4, obj.color);
      grad.addColorStop(1, 'rgba(255, 100, 0, 0.1)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      const rays = 20;
      for(let i=0; i<rays; i++) {
          const ang = (i/rays) * Math.PI*2 + time * 0.1;
          const r = obj.radius + Math.sin(time*2 + i) * 50;
          ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
      }
      ctx.closePath();
      ctx.fillStyle = obj.color;
      ctx.globalAlpha = 0.1;
      ctx.fill();
      
      ctx.restore();
  }

  drawPlanet(obj: WorldObject) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(obj.x, obj.y);
      
      // Rings (Behind)
      if (obj.hasRings) this.drawRings(obj, false);

      // Atmosphere
      ctx.shadowBlur = 50;
      ctx.shadowColor = obj.atmosphereColor || obj.color;
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Surface
      const sunPos = this.worldObjects.find(o => o.type === 'star') || {x:0, y:0};
      const angleToSun = Math.atan2(sunPos.y - obj.y, sunPos.x - obj.x);
      
      const grad = ctx.createRadialGradient(
          Math.cos(angleToSun) * obj.radius * 0.5, 
          Math.sin(angleToSun) * obj.radius * 0.5, 
          obj.radius * 0.1, 
          0, 0, obj.radius
      );
      grad.addColorStop(0, obj.color);
      grad.addColorStop(1, '#000');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI*2);
      ctx.fill();
      
      // Details
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.1;
      const seed = obj.seed || 1;
      for(let i=0; i<5; i++) {
          ctx.beginPath();
          ctx.arc(Math.sin(seed+i)*obj.radius*0.5, Math.cos(seed+i)*obj.radius*0.5, obj.radius*(0.2+Math.random()*0.2), 0, Math.PI*2);
          ctx.fill();
      }
      
      ctx.restore();
      // Rings (Front)
      if (obj.hasRings) {
          ctx.save();
          ctx.translate(obj.x, obj.y);
          this.drawRings(obj, true);
          ctx.restore();
      }
  }
  
  drawRings(obj: WorldObject, front: boolean) {
      const ctx = this.ctx;
      const angleToSun = 0.5; // Fixed angle for rings aesthetic
      ctx.rotate(angleToSun);
      ctx.scale(1, 0.3); // Flatten
      
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius * 2.5, front ? 0 : Math.PI, front ? Math.PI : Math.PI*2);
      ctx.arc(0, 0, obj.radius * 1.5, front ? Math.PI : Math.PI*2, front ? 0 : Math.PI, true);
      ctx.closePath();
      
      ctx.fillStyle = obj.ringColor || 'rgba(255,255,255,0.2)';
      ctx.fill();
      ctx.scale(1, 3.33); // Restore scale
      ctx.rotate(-angleToSun);
  }

  drawAsteroid(obj: WorldObject) {
      const ctx = this.ctx;
      const seed = obj.seed || 1;
      const sunPos = this.worldObjects.find(o => o.type === 'star') || {x:0, y:0};
      const angleToSun = Math.atan2(sunPos.y - obj.y, sunPos.x - obj.x);

      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.angle);
      
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      const points = 10;
      for(let i=0; i<points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const r = obj.radius * (0.8 + 0.3 * Math.abs(Math.sin(seed * 10 + i)));
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      
      // Lighting
      ctx.globalCompositeOperation = 'source-atop';
      const grad = ctx.createLinearGradient(
          Math.cos(angleToSun - obj.angle) * obj.radius, Math.sin(angleToSun - obj.angle) * obj.radius,
          -Math.cos(angleToSun - obj.angle) * obj.radius, -Math.sin(angleToSun - obj.angle) * obj.radius
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Craters
      const craterSeed = obj.craterSeed || 0;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for(let i=0; i<3; i++) {
          const cx = Math.sin(craterSeed + i) * obj.radius * 0.5;
          const cy = Math.cos(craterSeed + i) * obj.radius * 0.5;
          const cr = obj.radius * 0.15;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI*2);
          ctx.fill();
      }

      ctx.restore();
  }

  drawStation(obj: WorldObject) {
      const ctx = this.ctx;
      const time = this.gameTime;
      ctx.save();
      ctx.translate(obj.x, obj.y);
      
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, obj.radius + 20, (obj.radius+20)*0.3, time * 0.5, 0, Math.PI*2);
      ctx.stroke();
      
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = time % 1 > 0.5 ? '#ef4444' : '#000';
      ctx.beginPath();
      ctx.arc(0, -obj.radius*0.8, 5, 0, Math.PI*2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '20px Orbitron';
      ctx.fillText(obj.name || 'STATION', 0, obj.radius + 60);
      
      ctx.restore();
  }

  drawGate(obj: WorldObject) {
      const ctx = this.ctx;
      const time = this.gameTime;
      ctx.save();
      ctx.translate(obj.x, obj.y);
      
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, obj.radius);
      grad.addColorStop(0, '#000');
      grad.addColorStop(0.5, obj.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI*2);
      ctx.fill();
      
      ctx.save();
      ctx.rotate(time);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 10;
      ctx.setLineDash([30, 20]);
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
      
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '16px Orbitron';
      ctx.fillText(obj.name || 'GATE', 0, -obj.radius - 20);
      
      ctx.restore();
  }

  drawNebulae() {
      const ctx = this.ctx;
      this.worldObjects.filter(o => o.type === 'nebula').forEach(n => {
         const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
         grad.addColorStop(0, n.color);
         grad.addColorStop(1, 'transparent');
         ctx.fillStyle = grad;
         ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
      });
  }

  drawStarfield(parallax: number, color: string, sizeRef: number) {
    const ctx = this.ctx;
    const gridSize = 1000;
    const offsetX = Math.floor(this.camera.x * parallax / gridSize);
    const offsetY = Math.floor(this.camera.y * parallax / gridSize);

    ctx.fillStyle = color;
    for (let x = offsetX - 2; x <= offsetX + 3; x++) {
      for (let y = offsetY - 2; y <= offsetY + 3; y++) {
        const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const rand = seed - Math.floor(seed);
        if (rand > 0.9) {
          const sx = x * gridSize + (rand * 1000 % gridSize);
          const sy = y * gridSize + ((rand * 10000) % gridSize);
          const size = rand * sizeRef;
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawLoot() {
     const ctx = this.ctx;
     this.loot.forEach(l => {
       ctx.save();
       ctx.translate(l.x, l.y);
       const scale = 1 + Math.sin(this.gameTime * 4) * 0.1;
       ctx.scale(scale, scale);
       
       ctx.shadowBlur = 20;
       ctx.shadowColor = l.item.rarity === 'legendary' ? '#fbbf24' : (l.item.rarity === 'epic' ? '#a855f7' : '#fff');
       
       ctx.fillStyle = '#1e293b';
       ctx.strokeStyle = ctx.shadowColor;
       ctx.lineWidth = 2;
       ctx.strokeRect(-12, -12, 24, 24);
       ctx.fillRect(-12, -12, 24, 24);
       
       ctx.fillStyle = ctx.shadowColor;
       ctx.font = "16px Arial";
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText(l.item.icon, 0, 2);
       ctx.restore();
    });
  }

  drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      if (p.type === 'shockwave' || p.type === 'warp' || p.type === 'shield_hit') {
          ctx.beginPath();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.type === 'warp' ? 5 : (p.type === 'shield_hit' ? 2 : 3);
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
      } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  drawShips() {
    this.enemies.forEach(e => {
        let color = '#ef4444'; // Default Red
        if (e.type === 'Scout') color = '#facc15'; // Yellow
        else if (e.type === 'Cruiser') color = '#f97316'; // Orange
        else if (e.type === 'Bomber') color = '#be123c'; // Dark Red
        else if (e.type === 'Destroyer') color = '#a855f7'; // Purple
        else if (e.type === 'Battleship') color = '#ffffff'; // White/Black
        else if (e.type === 'Dreadnought') color = '#000000'; // Boss
        this.drawShip(e, color);
    });
    if(!this.player.data?.docked) this.drawShip(this.player, '#06b6d4');
  }

  drawShip(ship: Ship, color: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    if ((ship.vx !== 0 || ship.vy !== 0) || ship.data?.isBoosting) {
        ctx.fillStyle = ship.data?.isBoosting ? '#f59e0b' : '#3b82f6';
        const len = ship.data?.isBoosting ? 50 : 30;
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(-15 - Math.random() * len, 0);
        ctx.lineTo(-15, 5);
        ctx.fill();
    }

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // SHIP SHAPES
    if (ship.type === 'Interceptor') {
        ctx.moveTo(20, 0); ctx.lineTo(-15, 15); ctx.lineTo(-5, 0); ctx.lineTo(-15, -15);
    } else if (ship.type === 'Scout') {
        ctx.moveTo(15, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10);
    } else if (ship.type === 'Bomber') {
        ctx.moveTo(25, 0); ctx.lineTo(-15, 20); ctx.lineTo(-15, 10); ctx.lineTo(-25, 10); ctx.lineTo(-25, -10); ctx.lineTo(-15, -10); ctx.lineTo(-15, -20);
    } else if (ship.type === 'Destroyer') {
        ctx.moveTo(40, 0); ctx.lineTo(-25, 30); ctx.lineTo(-15, 0); ctx.lineTo(-25, -30);
    } else if (ship.type === 'Battleship') {
        ctx.moveTo(60, 0); ctx.lineTo(-40, 40); ctx.lineTo(-30, 0); ctx.lineTo(-40, -40);
        ctx.moveTo(-20, 20); ctx.lineTo(-20, -20); // Wings
    } else if (ship.type === 'Dreadnought') {
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#facc15';
        ctx.moveTo(80, 0); ctx.lineTo(-50, 60); ctx.lineTo(-40, 0); ctx.lineTo(-50, -60);
        ctx.moveTo(0, 40); ctx.lineTo(-60, 40);
        ctx.moveTo(0, -40); ctx.lineTo(-60, -40);
    } else {
        // Player / Cruiser
        ctx.moveTo(30, 0); ctx.lineTo(-20, 25); ctx.lineTo(-10, 0); ctx.lineTo(-20, -25);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI*2);
    ctx.fill();

    if (ship.shield > 0) {
      // Shield Color Based on Upgrade
      const shieldType = ship.slots.shield?.id;
      let shieldColor = color;
      if (ship.faction === 'player') {
          if (shieldType === 'shd2') shieldColor = '#3b82f6'; // Blue
          if (shieldType === 'shd3') shieldColor = '#d946ef'; // Magenta
      }

      ctx.shadowBlur = 5;
      ctx.shadowColor = shieldColor;
      ctx.strokeStyle = shieldColor;
      ctx.globalAlpha = (ship.shield / ship.maxShield) * 0.5 + 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, ship.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    
    if (ship.faction !== 'player') {
        const hpPct = Math.max(0, ship.hp / ship.maxHp);
        ctx.fillStyle = '#000';
        ctx.fillRect(ship.x - 20, ship.y - 45, 40, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : '#ef4444';
        ctx.fillRect(ship.x - 20, ship.y - 45, 40 * hpPct, 4);
    }
  }

  drawBullets() {
    const ctx = this.ctx;
    ctx.shadowBlur = 15;
    this.bullets.forEach(b => {
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.rect(-10, -b.radius, 20, b.radius*2);
      ctx.fill();
      ctx.restore();
    });
    ctx.shadowBlur = 0;
  }

  drawFloatingText() {
      const ctx = this.ctx;
      this.floatingTexts.forEach(t => {
          ctx.globalAlpha = Math.max(0, t.life);
          ctx.shadowBlur = 5;
          ctx.shadowColor = 'black';
          ctx.fillStyle = t.color;
          ctx.font = `bold ${t.size}px "Rajdhani"`;
          ctx.textAlign = 'center';
          ctx.fillText(t.text, t.x, t.y);
      });
      ctx.globalAlpha = 1;
  }

  drawReticle() {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.lineWidth = 1;
      // Convert screen mouse coords to world coords for drawing
      const mx = (this.mouse.x - this.width/2) / this.zoom + this.camera.x;
      const my = (this.mouse.y - this.height/2) / this.zoom + this.camera.y;
      
      ctx.beginPath();
      ctx.arc(mx, my, 10, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(mx - 25, my); ctx.lineTo(mx - 5, my);
      ctx.moveTo(mx + 25, my); ctx.lineTo(mx + 5, my);
      ctx.moveTo(mx, my - 25); ctx.lineTo(mx, my - 5);
      ctx.moveTo(mx, my + 25); ctx.lineTo(mx, my + 5);
      ctx.stroke();
  }
}