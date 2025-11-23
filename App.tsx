

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { GameUI } from './components/GameUI';
import { GameState, Item } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [gameState, setGameState] = useState<Partial<GameState> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    engineRef.current = new GameEngine(canvasRef.current, (state) => {
      setGameState(state);
    });

    return () => {
    };
  }, []);

  const actions = {
      sellItem: (id: string) => {
          engineRef.current?.sellItem(id);
      },
      buyItem: (item: Item) => {
          engineRef.current?.buyItem(item);
      },
      upgradeSkill: (id: string) => {
          engineRef.current?.upgradeSkill(id);
      },
      equipItem: (index: number) => {
          engineRef.current?.equipItem(index);
      },
      repairShip: () => {
          engineRef.current?.repairShip();
      }
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden cursor-crosshair select-none">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full absolute inset-0 z-0"
      />
      
      <div className="relative z-10 w-full h-full">
        {gameState && gameState.player && (
            <GameUI 
                player={gameState.player} 
                enemyCount={gameState.enemyCount || 0}
                nearbyObjects={gameState.nearbyObjects || []}
                nearbyEnemies={gameState.nearbyEnemies || []}
                nearbyLoot={gameState.nearbyLoot || []}
                currentSystemId={gameState.currentSystemId}
                systems={gameState.systems}
                shopItems={gameState.shopItems}
                actions={actions}
            />
        )}
        
        {!gameState && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
             <div className="text-center">
                <h1 className="text-6xl font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">STAR RANGER</h1>
                <div className="text-cyan-500 font-mono animate-pulse">INITIALIZING NEURAL LINK...</div>
             </div>
          </div>
        )}
        
        <div className="absolute bottom-2 right-4 text-slate-600 text-xs font-mono pointer-events-none opacity-50">
          WASD Move • MOUSE Aim • SHIFT Boost • F Dock • J Jump
        </div>
      </div>
    </div>
  );
};

export default App;