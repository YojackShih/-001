import { Flag, Timer, RotateCcw, Trophy, Skull, Shield, Crosshair } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Stylized TUF Gaming Logo Component
const TufLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 4L12 2L20 4V10C20 15.5228 16.4183 20.4142 12 22C7.58172 20.4142 4 15.5228 4 10V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 14H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 6L16 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

type Difficulty = 'beginner' | 'intermediate' | 'expert';

interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
}

const CONFIGS: Record<Difficulty, GameConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [minesLeft, setMinesLeft] = useState(0);
  const [time, setTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const initGame = useCallback((diff: Difficulty = difficulty) => {
    const config = CONFIGS[diff];
    const newGrid: Cell[][] = [];

    // Create empty grid
    for (let r = 0; r < config.rows; r++) {
      newGrid[r] = [];
      for (let c = 0; c < config.cols; c++) {
        newGrid[r][c] = {
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        };
      }
    }

    // Place mines
    let minesPlaced = 0;
    while (minesPlaced < config.mines) {
      const r = Math.floor(Math.random() * config.rows);
      const c = Math.floor(Math.random() * config.cols);
      if (!newGrid[r][c].isMine) {
        newGrid[r][c].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor mines
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (!newGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols && newGrid[nr][nc].isMine) {
                count++;
              }
            }
          }
          newGrid[r][c].neighborMines = count;
        }
      }
    }

    setGrid(newGrid);
    setGameState('idle');
    setMinesLeft(config.mines);
    setTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [difficulty]);

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initGame]);

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const revealCell = (r: number, c: number) => {
    if (gameState === 'won' || gameState === 'lost' || grid[r][c].isRevealed || grid[r][c].isFlagged) return;

    if (gameState === 'idle') {
      setGameState('playing');
      startTimer();
    }

    const newGrid = [...grid.map(row => [...row])];
    
    if (newGrid[r][c].isMine) {
      // Game Over - Reveal all mines
      newGrid.forEach(row => row.forEach(cell => {
        if (cell.isMine) cell.isRevealed = true;
      }));
      setGrid(newGrid);
      setGameState('lost');
      stopTimer();
      return;
    }

    const floodFill = (row: number, col: number) => {
      if (row < 0 || row >= CONFIGS[difficulty].rows || col < 0 || col >= CONFIGS[difficulty].cols) return;
      if (newGrid[row][col].isRevealed || newGrid[row][col].isMine || newGrid[row][col].isFlagged) return;

      newGrid[row][col].isRevealed = true;

      if (newGrid[row][col].neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            floodFill(row + dr, col + dc);
          }
        }
      }
    };

    floodFill(r, c);
    setGrid(newGrid);

    // Check Win
    const config = CONFIGS[difficulty];
    let unrevealedCount = 0;
    newGrid.forEach(row => row.forEach(cell => {
      if (!cell.isRevealed) unrevealedCount++;
    }));

    if (unrevealedCount === config.mines) {
      setGameState('won');
      stopTimer();
    }
  };

  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState === 'won' || gameState === 'lost' || grid[r][c].isRevealed) return;

    if (gameState === 'idle') {
      setGameState('playing');
      startTimer();
    }

    const newGrid = [...grid.map(row => [...row])];
    const cell = newGrid[r][c];
    cell.isFlagged = !cell.isFlagged;
    setMinesLeft(prev => cell.isFlagged ? prev - 1 : prev + 1);
    setGrid(newGrid);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0f1113] selection:bg-[#ffb800]/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl"
      >
        <header className="mb-8 text-center relative">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ffb800]/30 to-transparent -z-10" />
          <h1 className="text-5xl font-black tracking-tight mb-2 flex items-center justify-center gap-4">
            <Shield className="w-10 h-10 text-[#ffb800]" />
            <span className="text-white">TUF</span> <span className="text-[#ffb800]">GAMING</span>
          </h1>
          <p className="text-zinc-500 font-mono text-[10px] tracking-[0.5em] uppercase">Minesweeper Tactical Division</p>
        </header>

        <div className="tuf-panel rounded-none overflow-hidden border-b-4 border-b-[#ffb800]">
          {/* Controls & Stats */}
          <div className="p-6 border-b border-[#2a2d31] flex flex-wrap items-center justify-between gap-4 bg-[#1a1c1e]">
            <div className="flex gap-2">
              {(['beginner', 'intermediate', 'expert'] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => {
                    setDifficulty(diff);
                    initGame(diff);
                  }}
                  className={`tuf-button ${difficulty === diff ? 'tuf-button-active' : 'text-zinc-500'}`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-10">
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Target Count</span>
                <div className="flex items-center gap-2 text-[#ffb800]">
                  <Crosshair className="w-4 h-4" />
                  <span className="font-mono text-2xl font-black">{minesLeft}</span>
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Mission Time</span>
                <div className="flex items-center gap-2 text-white">
                  <Timer className="w-4 h-4" />
                  <span className="font-mono text-2xl font-black">{time}s</span>
                </div>
              </div>
              <button 
                onClick={() => initGame()}
                className="p-3 bg-[#2a2d31] hover:bg-[#3a3f44] text-[#ffb800] border border-[#ffb800]/20 transition-all"
                title="Reset Mission"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Game Board */}
          <div className="p-10 flex justify-center bg-[#121416] relative overflow-auto">
            {/* Industrial Pattern Background */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(45deg, #ffb800 1px, transparent 1px), linear-gradient(-45deg, #ffb800 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            
            <div 
              className="minesweeper-grid relative z-10"
              style={{ 
                gridTemplateColumns: `repeat(${CONFIGS[difficulty].cols}, minmax(0, 1fr))` 
              }}
            >
              {grid.map((row, r) => 
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => revealCell(r, c)}
                    onContextMenu={(e) => toggleFlag(e, r, c)}
                    className={`cell ${
                      cell.isRevealed 
                        ? 'cell-revealed' 
                        : 'cell-unrevealed'
                    } ${
                      cell.isRevealed && cell.isMine ? 'cell-mine' : ''
                    }`}
                  >
                    {cell.isRevealed ? (
                      cell.isMine ? (
                        <TufLogo className="w-6 h-6 text-[#ffb800]" />
                      ) : cell.neighborMines > 0 ? (
                        <span className={`num-${cell.neighborMines} font-black text-lg`}>
                          {cell.neighborMines}
                        </span>
                      ) : null
                    ) : cell.isFlagged ? (
                      <Flag className="w-4 h-4 fill-[#ffb800] text-[#ffb800]" />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer / Status */}
          <AnimatePresence>
            {(gameState === 'won' || gameState === 'lost') && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-8 text-center border-t-4 ${
                  gameState === 'won' ? 'bg-[#1a2e1a] border-emerald-500' : 'bg-[#2e1a1a] border-[#ffb800]'
                }`}
              >
                <div className="flex items-center justify-center gap-4 mb-3">
                  {gameState === 'won' ? (
                    <>
                      <Trophy className="w-10 h-10 text-emerald-400" />
                      <h2 className="text-3xl font-black tracking-tight text-white uppercase">Mission Success</h2>
                    </>
                  ) : (
                    <>
                      <Skull className="w-10 h-10 text-[#ffb800]" />
                      <h2 className="text-3xl font-black tracking-tight text-white uppercase">Mission Failed</h2>
                    </>
                  )}
                </div>
                <p className="text-zinc-400 font-mono text-xs mb-6 uppercase tracking-widest">
                  {gameState === 'won' 
                    ? `Area secured in ${time} seconds. TUF durability confirmed.` 
                    : "TUF Logo detected. Area compromised. Mission aborted."}
                </p>
                <button 
                  onClick={() => initGame()}
                  className={`px-12 py-3 font-black uppercase tracking-[0.3em] transition-all ${
                    gameState === 'won' 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_5px_20px_rgba(16,185,129,0.3)]' 
                    : 'bg-[#ffb800] hover:bg-[#ffcc00] text-[#0f1113] shadow-[0_5px_20px_rgba(255,184,0,0.3)]'
                  }`}
                >
                  Restart Mission
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex justify-between items-center text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">
          <div className="flex gap-6">
            <span className="flex items-center gap-1">Military Grade Stability</span>
            <span className="flex items-center gap-1">TUF Component Protection</span>
          </div>
          <p>ASUS TUF GAMING • 2026</p>
        </div>
      </motion.div>
    </div>
  );
}
