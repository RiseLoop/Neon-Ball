import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import AICommentator from './components/AICommentator';
import { GameState } from './types';
import { generateGameCommentary } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [aiComment, setAiComment] = useState<string>("Waiting for player input...");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    // Check for API key availability (in a real app, you might validate this more robustly)
    if (process.env.API_KEY) {
      setHasApiKey(true);
      generateGameCommentary('START').then(setAiComment);
    } else {
      setAiComment("WARNING: API_KEY missing. AI commentary module disabled. Game is still playable.");
    }
  }, []);

  const startGame = () => {
    setGameState(GameState.PLAYING);
  };

  const resetGame = () => {
    setGameState(GameState.MENU);
    if (hasApiKey) {
        generateGameCommentary('START').then(setAiComment);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Game Title */}
      <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-6 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
        NEON BREAKER
      </h1>

      {/* Main Game Container */}
      <div className="relative w-full max-w-[800px] flex flex-col items-center">
        
        {/* Game Canvas */}
        <GameCanvas 
          setAiComment={setAiComment} 
          setGameState={setGameState} 
          gameState={gameState} 
        />

        {/* AI Commentator Section */}
        <AICommentator comment={aiComment} />

        {/* Overlay Menus */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 top-0 h-[80vh] flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm z-20">
            <h2 className="text-3xl font-bold text-white mb-8 animate-pulse">READY PLAYER ONE?</h2>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-[0_0_15px_rgba(8,145,178,0.6)] transition-all transform hover:scale-105 active:scale-95"
            >
              INSERT COIN (START)
            </button>
            <p className="mt-4 text-slate-400 text-sm">Mouse or Touch to move paddle</p>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 top-0 h-[80vh] flex flex-col items-center justify-center bg-red-900/90 rounded-lg backdrop-blur-sm z-20">
            <h2 className="text-5xl font-bold text-white mb-2 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">GAME OVER</h2>
            <p className="text-red-200 mb-8 font-mono">SYSTEM FAILURE</p>
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-white text-red-900 font-bold rounded shadow-lg hover:bg-gray-200 transition-all transform hover:scale-105"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-slate-600 text-xs text-center">
        Powered by React, Tailwind & Gemini API
      </div>
    </div>
  );
};

export default App;