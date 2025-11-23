

import React, { useState, useRef, useEffect } from 'react';
import { Ship, Item, Skill, Quest, WorldObject, LootBox, SolarSystem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface GameUIProps {
  player: Ship;
  enemyCount: number;
  nearbyObjects: WorldObject[];
  nearbyEnemies: Ship[];
  nearbyLoot: LootBox[];
  shopItems?: Item[];
  actions: {
      sellItem: (id: string) => void;
      buyItem: (item: Item) => void;
      upgradeSkill: (id: string) => void;
      equipItem: (index: number) => void;
      repairShip: () => void;
  }
  currentSystemId?: string;
  systems?: SolarSystem[];
}

const Panel = ({ title, children, onClose, fullScreen = false }: { title: string, children?: React.ReactNode, onClose: () => void, fullScreen?: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 bg-black/60 backdrop-blur-sm"
  >
    <div className={`bg-slate-900/95 border border-cyan-500/50 ${fullScreen ? 'w-[90vw] h-[85vh]' : 'w-[950px] h-[700px]'} rounded shadow-[0_0_50px_rgba(6,182,212,0.2)] pointer-events-auto flex flex-col relative overflow-hidden`}>
       <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(6,182,212,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.3)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      <div className="flex justify-between items-center p-4 border-b border-cyan-500/30 bg-gradient-to-r from-slate-950 to-slate-900 z-10">
        <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-cyan-500 animate-pulse"></div>
            <h2 className="text-2xl font-display text-white tracking-widest uppercase">{title}</h2>
        </div>
        <button onClick={onClose} className="text-cyan-500 hover:text-white transition-colors bg-cyan-950/30 px-4 py-1 rounded border border-cyan-500/30 hover:bg-cyan-500/20">
          CLOSE [ESC]
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1 text-slate-200 z-10 scrollbar-thin scrollbar-thumb-cyan-700 scrollbar-track-slate-900">
        {children}
      </div>
    </div>
  </motion.div>
);

const InventoryGrid = ({ player, onEquip }: { player: Ship, onEquip: (idx: number) => void }) => {
    return (
        <div className="flex gap-6 h-full">
            <div className="flex-1 overflow-y-auto pr-2">
                <h3 className="text-cyan-400 mb-2 font-display sticky top-0 bg-slate-900 z-10 pb-2 border-b border-slate-700">CARGO HOLD</h3>
                <div className="grid grid-cols-5 gap-4">
                    {Array.from({ length: 25 }).map((_, i) => {
                        const item = player.inventory[i];
                        return (
                            <div key={i} className={`aspect-square border rounded p-2 flex flex-col items-center justify-center relative group transition-all ${item ? 'bg-slate-800 border-cyan-500/50 hover:bg-slate-700 hover:shadow-lg hover:shadow-cyan-500/20' : 'bg-slate-950/50 border-slate-800'}`}>
                                {item && (
                                    <>
                                        <div className="text-3xl mb-1 drop-shadow-md">{item.icon}</div>
                                        <span className={`text-[10px] uppercase font-bold text-center leading-tight ${item.rarity === 'legendary' ? 'text-amber-400' : 'text-slate-300'}`}>
                                            {item.name}
                                        </span>
                                        <span className="absolute top-1 right-1 text-xs font-mono text-cyan-400">{item.quantity}</span>
                                        {/* Tooltip */}
                                        <div className="absolute opacity-0 group-hover:opacity-100 bg-black border border-slate-600 p-2 z-50 bottom-full mb-2 w-48 text-xs rounded pointer-events-none shadow-xl">
                                            <p className="font-bold text-white text-sm">{item.name}</p>
                                            <p className="text-amber-500 text-[10px] uppercase mb-1">{item.rarity}</p>
                                            <p className="text-slate-400 mb-1">{item.description}</p>
                                            <p className="text-slate-400">Value: {item.value} Cr</p>
                                            {item.stats && Object.entries(item.stats).map(([k,v]) => <p key={k} className="text-green-400">{k}: {v}</p>)}
                                        </div>
                                        {/* Equip Button Overlay */}
                                        {['weapon', 'shield', 'engine', 'scanner'].includes(item.type) && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onEquip(i); }}
                                                className="absolute inset-x-0 bottom-0 bg-cyan-600/90 text-white text-[10px] font-bold py-1 opacity-0 group-hover:opacity-100 hover:bg-cyan-500 transition-opacity"
                                            >
                                                EQUIP
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="w-1/3 flex flex-col">
                <h3 className="text-cyan-400 mb-2 font-display">ACTIVE CONFIGURATION</h3>
                <div className="space-y-4 flex-1">
                    {Object.entries(player.slots).map(([slot, item]) => (
                        <div key={slot} className="border border-slate-700 bg-slate-800/50 p-3 rounded flex items-center gap-3 relative group">
                             <div className="w-14 h-14 bg-slate-900 border border-slate-600 flex items-center justify-center text-3xl shadow-inner rounded">
                                 {item ? item.icon : '🚫'}
                             </div>
                             <div>
                                 <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">{slot}</h4>
                                 <p className={`text-sm font-bold ${item ? 'text-white' : 'text-slate-600'}`}>{item ? item.name : 'EMPTY'}</p>
                                 {item?.stats && (
                                     <div className="text-[10px] text-green-400">
                                         {Object.entries(item.stats).map(([k,v]) => `${k}: ${v}`).join(' • ')}
                                     </div>
                                 )}
                             </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 p-4 bg-slate-800 rounded border border-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Ship Stats</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="flex justify-between"><span>HP:</span> <span className="text-white">{Math.round(player.hp)}/{player.maxHp}</span></div>
                        <div className="flex justify-between"><span>SHIELD:</span> <span className="text-cyan-400">{Math.round(player.shield)}/{player.maxShield}</span></div>
                        <div className="flex justify-between"><span>SPEED:</span> <span className="text-white">{1500 + (player.slots.engine?.stats?.speedBonus || 0)*10}</span></div>
                        <div className="flex justify-between"><span>CARGO:</span> <span className="text-white">{player.inventory.length}/25</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Minimap = ({ player, objects, enemies, loot, onClick }: { player: Ship, objects: WorldObject[], enemies: Ship[], loot: LootBox[], onClick: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
        ctx.fillRect(0, 0, 200, 200);
        
        const range = 5000; 
        const scale = 200 / (range * 2);
        const center = 100;

        const time = Date.now() / 1000;
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.arc(100, 100, 140, time % (Math.PI*2), (time % (Math.PI*2)) + 0.5);
        ctx.lineTo(100, 100);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
        ctx.fill();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(100, 100, 50, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(100, 100, 90, 0, Math.PI*2); ctx.stroke();

        const drawDot = (x: number, y: number, color: string, size: number) => {
            const dx = (x - player.x) * scale;
            const dy = (y - player.y) * scale;
            if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(center + dx, center + dy, size, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        objects.forEach(o => {
            if (o.type === 'planet') drawDot(o.x, o.y, o.color, 6);
            if (o.type === 'station') drawDot(o.x, o.y, '#38bdf8', 5);
            if (o.type === 'gate') drawDot(o.x, o.y, '#d8b4fe', 5);
            if (o.type === 'asteroid') drawDot(o.x, o.y, '#475569', 1.5);
        });
        
        loot.forEach(l => drawDot(l.x, l.y, '#facc15', 2));
        enemies.forEach(e => drawDot(e.x, e.y, '#ef4444', 3));

        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(100, 100, 3, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255, 0.3)';
        ctx.beginPath();
        const rot = player.rotation;
        ctx.moveTo(100, 100);
        ctx.lineTo(100 + Math.cos(rot - 0.5)*30, 100 + Math.sin(rot - 0.5)*30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(100, 100);
        ctx.lineTo(100 + Math.cos(rot + 0.5)*30, 100 + Math.sin(rot + 0.5)*30);
        ctx.stroke();

    }, [player, objects, enemies, loot]);

    return (
        <canvas 
            ref={canvasRef} 
            width={200} height={200} 
            className="w-full h-full rounded-full border-2 border-slate-800 shadow-inner cursor-pointer hover:border-cyan-500 transition-colors" 
            onClick={onClick}
        />
    );
}

const GalaxyMap = ({ systems, currentSystemId }: { systems: SolarSystem[], currentSystemId: string }) => {
    return (
        <div className="w-full h-full relative bg-slate-950 overflow-hidden flex">
            {/* Sidebar Info */}
            <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col z-10 shadow-2xl">
                <h3 className="text-3xl font-display text-cyan-400 mb-1">GALAXY MAP</h3>
                <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest">Navigation Computer Online</p>
                
                <div className="flex-1 space-y-4">
                     {systems.map(sys => (
                         <div key={sys.id} className={`p-4 rounded border transition-all ${sys.id === currentSystemId ? 'bg-cyan-900/20 border-cyan-500' : 'bg-slate-800/50 border-slate-700 opacity-70'}`}>
                             <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-bold text-white uppercase">{sys.name}</h4>
                                 {sys.id === currentSystemId && <span className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded animate-pulse">CURRENT LOCATION</span>}
                             </div>
                             <p className="text-xs text-slate-400 mb-2">{sys.description}</p>
                             <div className="flex gap-2">
                                 <div className="text-[10px] bg-slate-950 px-2 py-1 rounded text-slate-300">Risk: {'★'.repeat(sys.difficulty)}</div>
                             </div>
                         </div>
                     ))}
                </div>
                
                <div className="mt-4 text-xs text-slate-500 font-mono">
                    Use JUMP GATES to travel between connected systems.
                </div>
            </div>

            {/* Map Visualization */}
            <div className="flex-1 relative">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Draw Connections */}
                    {systems.map(sys => {
                        return sys.connections.map(targetId => {
                            const target = systems.find(s => s.id === targetId);
                            if (target) {
                                return (
                                    <line 
                                        key={`${sys.id}-${target.id}`}
                                        x1={`${sys.mapX}%`} y1={`${sys.mapY}%`}
                                        x2={`${target.mapX}%`} y2={`${target.mapY}%`}
                                        stroke="#1e293b" strokeWidth="2" strokeDasharray="5,5"
                                    />
                                )
                            }
                            return null;
                        })
                    })}
                </svg>

                {/* Draw Nodes */}
                {systems.map(sys => (
                    <div 
                        key={sys.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                        style={{ left: `${sys.mapX}%`, top: `${sys.mapY}%` }}
                    >
                         {/* Pulse Effect for current system */}
                         {sys.id === currentSystemId && <div className="absolute w-20 h-20 bg-cyan-500/20 rounded-full animate-ping pointer-events-none"></div>}
                         
                         <div className={`w-8 h-8 rounded-full border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all ${sys.id === currentSystemId ? 'bg-cyan-500 border-white scale-125' : 'bg-slate-800 border-slate-500 hover:border-cyan-400 hover:scale-110'}`}></div>
                         
                         <div className="mt-2 text-center pointer-events-none group-hover:scale-110 transition-transform">
                             <div className={`text-xs font-bold uppercase tracking-wider ${sys.id === currentSystemId ? 'text-cyan-400' : 'text-slate-400'}`}>{sys.name}</div>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const StationInterface = ({ player, shopItems, actions }: { player: Ship, shopItems?: Item[], actions: any }) => {
    const [subTab, setSubTab] = useState<'market' | 'armory' | 'tech'>('market');

    return (
        <div className="flex flex-col h-full gap-4">
             {/* Header */}
             <div className="flex justify-between items-center bg-slate-800 p-4 rounded border border-slate-700 shadow-lg">
                 <div>
                     <h3 className="text-2xl font-display text-white">STATION SERVICES</h3>
                     <p className="text-slate-400 text-sm">Docking clamps secured. Systems nominal.</p>
                 </div>
                 <div className="text-right">
                     <div className="text-3xl text-amber-400 font-mono font-bold drop-shadow-md">₢ {player.credits.toLocaleString()}</div>
                     <button 
                        onClick={() => actions.repairShip()}
                        className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded border border-emerald-400"
                     >
                         REPAIR SHIP ({Math.floor((player.maxHp - player.hp) * 0.5)} Cr)
                     </button>
                 </div>
             </div>

             {/* Navigation */}
             <div className="flex gap-2">
                 {['market', 'armory', 'tech'].map(t => (
                     <button 
                        key={t}
                        onClick={() => setSubTab(t as any)}
                        className={`px-6 py-2 rounded-t font-bold font-display uppercase tracking-widest transition-all ${subTab === t ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400' : 'bg-slate-900/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
                     >
                         {t === 'tech' ? 'Tech Lab' : t}
                     </button>
                 ))}
             </div>

             {/* Content Area */}
             <div className="bg-slate-800/50 p-4 rounded-b border border-slate-700 flex-1 overflow-y-auto min-h-0">
                 
                 {/* MARKET TAB */}
                 {subTab === 'market' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <h4 className="font-bold text-cyan-400 mb-4 border-b border-slate-700 pb-2 uppercase">Sell Resources</h4>
                             <div className="space-y-2">
                                 {player.inventory.filter(i => i.type === 'resource').length === 0 && <p className="text-slate-500 italic">No resources in cargo.</p>}
                                 {player.inventory.filter(i => i.type === 'resource').map((item, idx) => (
                                     <div key={idx} className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800">
                                         <div className="flex items-center gap-3">
                                             <span className="text-2xl">{item.icon}</span>
                                             <div>
                                                 <div className="font-bold text-slate-200">{item.name}</div>
                                                 <div className="text-slate-500 text-xs">Qty: {item.quantity}</div>
                                             </div>
                                         </div>
                                         <button 
                                             onClick={() => actions.sellItem(item.id)}
                                             className="bg-emerald-600/20 text-emerald-400 text-xs font-bold px-4 py-2 rounded hover:bg-emerald-600 hover:text-white transition-all border border-emerald-600/50"
                                         >
                                             SELL {item.quantity * item.value} Cr
                                         </button>
                                     </div>
                                 ))}
                             </div>
                        </div>
                        <div className="text-center p-10 text-slate-500 italic">
                            Market prices fluctuate based on system security levels.
                        </div>
                     </div>
                 )}

                 {/* ARMORY TAB */}
                 {subTab === 'armory' && (
                     <div>
                         <h4 className="font-bold text-rose-400 mb-4 border-b border-slate-700 pb-2 uppercase">Equipment Requisition</h4>
                         <div className="grid grid-cols-2 gap-4">
                             {shopItems?.map((item, idx) => (
                                 <div key={idx} className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 transition-colors">
                                     <div className="flex items-center gap-4">
                                         <div className="w-12 h-12 bg-slate-950 flex items-center justify-center text-2xl rounded border border-slate-800">
                                            {item.icon}
                                         </div>
                                         <div>
                                             <div className="font-bold text-slate-200">{item.name}</div>
                                             <div className="text-xs text-slate-400 max-w-[200px]">{item.description}</div>
                                             {item.stats && (
                                                <div className="text-[10px] text-cyan-500 mt-1">
                                                    {Object.entries(item.stats).map(([k,v]) => `${k.toUpperCase()}: ${v}`).join(' ')}
                                                </div>
                                             )}
                                         </div>
                                     </div>
                                     <button 
                                        onClick={() => actions.buyItem(item)}
                                        className="flex flex-col items-center bg-slate-800 hover:bg-cyan-900/30 px-3 py-1 rounded border border-slate-600 hover:border-cyan-500 transition-all min-w-[100px]"
                                     >
                                         <span className="text-amber-400 font-bold">₢ {item.price}</span>
                                         <span className="text-[10px] text-cyan-400 uppercase">PURCHASE</span>
                                     </button>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                 {/* TECH LAB TAB */}
                 {subTab === 'tech' && (
                     <div>
                         <h4 className="font-bold text-purple-400 mb-4 border-b border-slate-700 pb-2 uppercase">Ship Upgrades</h4>
                         <div className="grid grid-cols-1 gap-4">
                             {Object.values(player.skills).map((skill) => (
                                 <div key={skill.id} className="p-4 bg-slate-900 rounded border border-slate-800 relative overflow-hidden group">
                                     <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none"></div>
                                     
                                     <div className="flex justify-between items-center relative z-10">
                                         <div>
                                             <div className="flex items-center gap-3">
                                                 <h5 className="font-bold text-lg text-white font-display">{skill.name}</h5>
                                                 <span className="text-xs bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700">LVL {skill.level} / {skill.maxLevel}</span>
                                             </div>
                                             <p className="text-slate-400 text-sm mt-1">{skill.description}</p>
                                         </div>
                                         
                                         {skill.level < skill.maxLevel ? (
                                             <button 
                                                 onClick={() => actions.upgradeSkill(skill.id)}
                                                 className="bg-purple-600/20 border border-purple-500 text-purple-300 px-6 py-2 rounded hover:bg-purple-600 hover:text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                             >
                                                 UPGRADE <br/>
                                                 <span className="text-xs font-mono">Cost: {skill.cost} Cr</span>
                                             </button>
                                         ) : (
                                             <div className="text-green-500 font-bold border border-green-500 px-4 py-2 rounded bg-green-900/20">
                                                 MAX LEVEL
                                             </div>
                                         )}
                                     </div>
                                     
                                     {/* Progress Bar background */}
                                     <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full">
                                         <div className="h-full bg-purple-500" style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }}></div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

             </div>
        </div>
    )
}

export const GameUI: React.FC<GameUIProps> = ({ player, enemyCount, nearbyObjects, nearbyEnemies, nearbyLoot, actions, currentSystemId, shopItems, systems }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
      if (player.data?.docked) setActiveTab('Station');
      else if (activeTab === 'Station') setActiveTab(null);
  }, [player.data?.docked]);

  const currentSysName = systems?.find(s => s.id === currentSystemId)?.name || 'Unknown Sector';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 overflow-hidden">
      
      {/* Top HUD */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-2">
            <div className="bg-slate-900/90 border-l-4 border-cyan-500 p-4 rounded-r-lg backdrop-blur-md w-80 shadow-[0_0_20px_rgba(0,0,0,0.5)] clip-path-polygon">
                <div className="flex justify-between items-baseline mb-2 border-b border-slate-700 pb-1">
                    <span className="text-xl font-display font-bold text-white tracking-wider">{player.id.toUpperCase()}</span>
                    <span className="text-xs text-cyan-400 font-mono">LVL {player.level}</span>
                </div>
                
                <div className="space-y-3 font-mono text-xs">
                    <div>
                        <div className="flex justify-between text-slate-400 mb-0.5"><span>HULL INTEGRITY</span><span>{Math.round(player.hp)}</span></div>
                        <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                             <motion.div className="h-full bg-gradient-to-r from-red-600 to-red-400" animate={{ width: `${Math.max(0, (player.hp/player.maxHp)*100)}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-slate-400 mb-0.5"><span>SHIELD CAPACITY</span><span>{Math.round(player.shield)}</span></div>
                         <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                             <motion.div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_#06b6d4]" animate={{ width: `${Math.max(0, (player.shield/player.maxShield)*100)}%` }} />
                        </div>
                    </div>
                     <div>
                        <div className="flex justify-between text-slate-400 mb-0.5"><span>BOOST RESERVES</span><span>{Math.round(player.data?.boostFuel || 0)}%</span></div>
                         <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                             <motion.div className="h-full bg-amber-400" animate={{ width: `${player.data?.boostFuel || 0}%` }} />
                        </div>
                    </div>
                </div>
                
                <div className="mt-3 flex justify-between items-center bg-slate-950/50 p-2 rounded border border-slate-800/50">
                    <span className="text-amber-400 font-bold font-mono text-lg">₢ {player.credits.toLocaleString()}</span>
                </div>
            </div>
            
            {/* System Info */}
            <div className="bg-slate-900/80 border-l-4 border-purple-500 px-4 py-2 rounded-r-lg backdrop-blur w-fit mt-2">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Current System</div>
                <div className="text-xl font-display text-white shadow-purple-500/50 drop-shadow-lg">{currentSysName}</div>
            </div>
        </div>

        {/* Minimap & Alerts */}
        <div className="flex flex-col items-end gap-2">
             <div className="bg-slate-900/90 border border-cyan-500/30 p-1 rounded-full w-56 h-56 relative overflow-hidden shadow-2xl group">
                <Minimap 
                    player={player} 
                    objects={nearbyObjects} 
                    enemies={nearbyEnemies} 
                    loot={nearbyLoot} 
                    onClick={() => setActiveTab('Map')}
                />
                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                    <span className="text-[10px] bg-black/60 text-white px-2 py-1 rounded font-mono">
                        CLICK TO EXPAND MAP
                    </span>
                </div>
             </div>
             
             {enemyCount > 0 && (
                <div className="bg-rose-950/90 text-rose-200 px-4 py-2 rounded font-display text-sm animate-pulse border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center gap-2">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                    {enemyCount} HOSTILES DETECTED
                </div>
             )}
             
             {player.data?.canDock && !player.data.docked && (
                 <div className="bg-blue-600/90 text-white px-6 py-3 rounded font-display text-lg animate-bounce border-2 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.6)]">
                     PRESS [F] TO DOCK
                 </div>
             )}
             
             {player.data?.canWarp && (
                 <div className="bg-purple-600/90 text-white px-6 py-3 rounded font-display text-lg animate-pulse border-2 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.6)] text-center">
                     <div>JUMP GATE ACTIVE</div>
                     <div className="text-sm">PRESS [J] TO WARP</div>
                 </div>
             )}
        </div>
      </div>

      {/* Bottom Dock */}
      <div className="flex justify-center pointer-events-auto">
        <div className="flex bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-t-2xl px-6 pt-3 pb-2 gap-4 shadow-2xl transform hover:-translate-y-1 transition-transform duration-300">
           {[
             { id: 'Inventory', icon: '📦' },
             { id: 'Quests', icon: '📜' },
             { id: 'Station', icon: '⛽', disabled: !player.data?.docked }
           ].map(tab => (
               <button 
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(activeTab === tab.id ? null : tab.id)}
                  disabled={tab.disabled}
                  className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${activeTab === tab.id ? 'bg-cyan-600 border-cyan-400 text-white -translate-y-4 shadow-[0_0_20px_#0891b2] scale-110' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white hover:-translate-y-2'} ${tab.disabled ? 'opacity-30 cursor-not-allowed hover:translate-y-0 filter grayscale' : ''}`}
               >
                   <span className="text-2xl drop-shadow-md">{tab.icon}</span>
                   <span className="text-[10px] font-bold uppercase tracking-wide">{tab.id}</span>
               </button>
           ))}
        </div>
      </div>

      {/* Main Panels */}
      <AnimatePresence>
        {activeTab === 'Inventory' && (
          <Panel title="Cargo & Equipment" onClose={() => setActiveTab(null)}>
            <InventoryGrid player={player} onEquip={actions.equipItem} />
          </Panel>
        )}
        
        {activeTab === 'Station' && (
            <Panel title="Starbase Services" onClose={() => setActiveTab(null)}>
                <StationInterface player={player} shopItems={shopItems} actions={actions} />
            </Panel>
        )}

        {activeTab === 'Map' && systems && currentSystemId && (
            <Panel title="Galaxy Navigation" onClose={() => setActiveTab(null)} fullScreen={true}>
                <GalaxyMap systems={systems} currentSystemId={currentSystemId} />
            </Panel>
        )}

        {activeTab === 'Quests' && (
          <Panel title="Mission Log" onClose={() => setActiveTab(null)}>
            <div className="space-y-4">
                {player.activeQuests.map(q => (
                    <div key={q.id} className={`p-4 border rounded-lg relative overflow-hidden ${q.completed ? 'border-green-500/50 bg-green-900/10' : 'border-slate-700 bg-slate-800/30'}`}>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <h3 className="text-lg font-bold font-display text-cyan-100 tracking-wide">{q.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded font-bold border ${q.completed ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-amber-500/20 border-amber-500 text-amber-400'}`}>
                                {q.completed ? 'COMPLETE' : 'IN PROGRESS'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-4 relative z-10">{q.description}</p>
                        <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700 z-10">
                             <div className="absolute inset-0 bg-slate-800"></div>
                             <div className="absolute top-0 left-0 bottom-0 bg-cyan-500" style={{ width: `${(q.currentAmount / q.targetAmount) * 100}%` }}></div>
                        </div>
                        <div className="text-right text-xs text-cyan-400 mt-1 font-mono relative z-10">{q.currentAmount} / {q.targetAmount}</div>
                    </div>
                ))}
            </div>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
};