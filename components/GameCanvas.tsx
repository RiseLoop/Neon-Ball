import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Ball, Paddle, Brick, Particle, GameStats, PowerUp, PowerUpType } from '../types';
import { generateGameCommentary } from '../services/geminiService';

interface GameCanvasProps {
  setAiComment: (comment: string) => void;
  setGameState: (state: GameState) => void;
  gameState: GameState;
}

const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const PADDLE_WIDTH_PCT = 0.15;
const BALL_SPEED_BASE = 5;

// PowerUp Colors
const POWERUP_COLORS = {
  [PowerUpType.EXPAND]: '#22c55e', // Green
  [PowerUpType.MULTIBALL]: '#f59e0b', // Orange
  [PowerUpType.SHIELD]: '#3b82f6', // Blue
  [PowerUpType.STICKY]: '#d946ef', // Magenta
};

// Level Designs (1 = active, 0 = empty)
const LEVEL_LAYOUTS = [
  // Level 1: Standard
  [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  // Level 2: Checkerboard
  [
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0]
  ],
  // Level 3: Pyramid
  [
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1]
  ],
  // Level 4: The Tunnel
  [
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
  ],
   // Level 5: Invaders
   [
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
  ]
];

const COLORS = [
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
];

const GameCanvas: React.FC<GameCanvasProps> = ({ setAiComment, setGameState, gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs
  const ballsRef = useRef<Ball[]>([]); // Changed to array for Multiball
  const paddleRef = useRef<Paddle>({ x: 0, y: 0, width: 0, height: 20, color: '#22d3ee', originalWidth: 0 });
  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const statsRef = useRef<GameStats>({ score: 0, level: 1 });
  
  // Special Active Effects
  const hasShieldRef = useRef<boolean>(false);
  
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [levelDisplay, setLevelDisplay] = useState(1);

  // --- Initialization ---

  const initLevel = useCallback((canvas: HTMLCanvasElement, level: number) => {
    const { width, height } = canvas;
    const brickWidth = (width - 40) / BRICK_COLS;
    const brickHeight = 25;
    const bricks: Brick[] = [];

    // Select layout (loop if level > available layouts)
    const layoutIndex = (level - 1) % LEVEL_LAYOUTS.length;
    const layout = LEVEL_LAYOUTS[layoutIndex];

    for (let r = 0; r < layout.length; r++) {
      for (let c = 0; c < layout[r].length; c++) {
        if (layout[r][c] === 1) {
          bricks.push({
            x: 20 + c * brickWidth,
            y: 60 + r * brickHeight,
            width: brickWidth - 4,
            height: brickHeight - 4,
            visible: true,
            color: COLORS[(r + level) % COLORS.length],
            value: (layout.length - r) * 10
          });
        }
      }
    }
    bricksRef.current = bricks;

    // Reset Balls
    ballsRef.current = [{
      x: width / 2,
      y: height - 50,
      dx: 0, // Starts stuck
      dy: -BALL_SPEED_BASE - (level * 0.5),
      radius: width < 500 ? 6 : 8,
      speed: BALL_SPEED_BASE + (level * 0.5),
      color: '#ffffff',
      isStuck: true,
      stuckOffset: 0
    }];

    // Reset Paddle
    const pWidth = width * PADDLE_WIDTH_PCT;
    paddleRef.current = {
      x: (width - pWidth) / 2,
      y: height - 30,
      width: pWidth,
      height: 15,
      color: '#22d3ee',
      originalWidth: pWidth,
      isSticky: false
    };

    // Reset PowerUps
    powerUpsRef.current = [];
    hasShieldRef.current = false;

    setLevelDisplay(level);
  }, []);

  // --- Spawning ---

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x, y,
        dx: (Math.random() - 0.5) * 4,
        dy: (Math.random() - 0.5) * 4,
        life: 1.0,
        color: color,
        size: Math.random() * 3 + 1
      });
    }
  };

  const spawnPowerUp = (x: number, y: number) => {
    // 15% chance
    if (Math.random() > 0.15) return;

    const types = Object.values(PowerUpType);
    const type = types[Math.floor(Math.random() * types.length)];

    powerUpsRef.current.push({
      id: Math.random(),
      x, y,
      width: 20,
      height: 20,
      dy: 2,
      type: type as PowerUpType,
      color: POWERUP_COLORS[type as PowerUpType]
    });
  };

  const activatePowerUp = (type: PowerUpType) => {
    const paddle = paddleRef.current;
    
    switch (type) {
      case PowerUpType.EXPAND:
        paddle.width = paddle.originalWidth * 1.5;
        // Reset after 10s
        setTimeout(() => {
          paddleRef.current.width = paddleRef.current.originalWidth;
        }, 10000);
        break;
      
      case PowerUpType.STICKY:
        paddle.isSticky = true;
        setTimeout(() => {
          paddleRef.current.isSticky = false;
          // Release all balls
          ballsRef.current.forEach(b => {
             if (b.isStuck) {
                 b.isStuck = false;
                 b.dy = -Math.abs(b.speed);
             }
          });
        }, 10000);
        break;

      case PowerUpType.SHIELD:
        hasShieldRef.current = true;
        break;

      case PowerUpType.MULTIBALL:
        const newBalls: Ball[] = [];
        ballsRef.current.forEach(b => {
          // Spawn 2 extra balls per active ball
          for (let i = 0; i < 2; i++) {
            newBalls.push({
              ...b,
              dx: (Math.random() - 0.5) * b.speed * 2,
              dy: -Math.abs(b.speed),
              isStuck: false
            });
          }
        });
        ballsRef.current = [...ballsRef.current, ...newBalls];
        break;
    }
  };

  // --- Main Loop ---

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paddle = paddleRef.current;
    const bricks = bricksRef.current;

    if (gameState === GameState.PLAYING) {
      
      // 1. Update PowerUps
      powerUpsRef.current.forEach(p => {
        p.y += p.dy;
        // Collision with paddle
        if (
          p.x < paddle.x + paddle.width &&
          p.x + p.width > paddle.x &&
          p.y < paddle.y + paddle.height &&
          p.y + p.height > paddle.y
        ) {
          activatePowerUp(p.type);
          p.y = canvas.height + 100; // Remove
        }
      });
      powerUpsRef.current = powerUpsRef.current.filter(p => p.y < canvas.height);

      // 2. Update Balls
      ballsRef.current.forEach(ball => {
        if (ball.isStuck) {
          ball.x = paddle.x + (ball.stuckOffset || 0);
          ball.y = paddle.y - ball.radius;
        } else {
          ball.x += ball.dx;
          ball.y += ball.dy;

          // Wall Collisions
          if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x));
          }
          if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
          }

          // Shield Collision
          if (hasShieldRef.current && ball.y + ball.radius >= canvas.height - 10) {
             ball.dy = -Math.abs(ball.dy);
             hasShieldRef.current = false; // Shield breaks after use
             spawnParticles(ball.x, canvas.height - 10, '#3b82f6');
          }

          // Paddle Collision
          if (
            ball.y + ball.radius >= paddle.y &&
            ball.y - ball.radius <= paddle.y + paddle.height &&
            ball.x >= paddle.x &&
            ball.x <= paddle.x + paddle.width
          ) {
            // Check Sticky
            if (paddle.isSticky && !ball.isStuck) {
              ball.isStuck = true;
              ball.stuckOffset = ball.x - paddle.x;
              ball.dx = 0;
              ball.dy = 0;
            } else {
              // Standard bounce
              ball.dy = -Math.abs(ball.dy);
              const hitPoint = ball.x - (paddle.x + paddle.width / 2);
              ball.dx = hitPoint * 0.15;
              ball.speed *= 1.01;
            }
          }

          // Brick Collision
          bricks.forEach(brick => {
            if (!brick.visible) return;

            if (
              ball.x > brick.x &&
              ball.x < brick.x + brick.width &&
              ball.y > brick.y &&
              ball.y < brick.y + brick.height
            ) {
              brick.visible = false;
              ball.dy = -ball.dy;
              statsRef.current.score += brick.value;
              setScoreDisplay(statsRef.current.score);
              spawnParticles(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
              spawnPowerUp(brick.x + brick.width/2, brick.y);
            }
          });
        }
      });

      // Remove balls that fell out
      ballsRef.current = ballsRef.current.filter(b => b.y - b.radius < canvas.height);

      // 3. Level Failed (No balls left)
      if (ballsRef.current.length === 0) {
        // Reset Level immediately (Infinite Lives logic)
        paddle.isSticky = false;
        paddle.width = paddle.originalWidth;
        
        // Restart the current level
        initLevel(canvas, statsRef.current.level);
        generateGameCommentary('RETRY', statsRef.current).then(setAiComment);
      }

      // 4. Check Level Clear
      if (!bricks.some(b => b.visible)) {
        statsRef.current.level += 1;
        initLevel(canvas, statsRef.current.level);
        generateGameCommentary('VICTORY', statsRef.current).then(setAiComment);
      }

      // 5. Update Particles
      particlesRef.current.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.life -= 0.02;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    }

    // --- DRAWING ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw PowerUps
    powerUpsRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x + p.width/2, p.y + p.height/2, 10, 0, Math.PI*2);
      ctx.fill();
      
      // Icon or initial
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = p.type === PowerUpType.EXPAND ? 'W' : 
                    p.type === PowerUpType.MULTIBALL ? 'M' : 
                    p.type === PowerUpType.SHIELD ? 'S' : 'G'; // G for Glue/Sticky
      ctx.fillText(label, p.x + p.width/2, p.y + p.height/2);
    });

    // Draw Shield
    if (hasShieldRef.current) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 10);
        ctx.lineTo(canvas.width, canvas.height - 10);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3b82f6';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Draw Bricks
    bricks.forEach(brick => {
      if (brick.visible) {
        ctx.fillStyle = brick.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height / 2);
      }
    });

    // Draw Paddle
    ctx.fillStyle = paddle.isSticky ? '#d946ef' : paddle.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Draw Balls
    ballsRef.current.forEach(ball => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#fff';
      ctx.fill();
      ctx.closePath();
      ctx.shadowBlur = 0;
    });

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, setGameState, initLevel, setAiComment]);

  // Handle Input
  const handleInputMove = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    
    let newX = x - paddleRef.current.width / 2;
    newX = Math.max(0, Math.min(canvas.width - paddleRef.current.width, newX));
    paddleRef.current.x = newX;
  }, []);

  const handleInputClick = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      // Release stuck balls
      let released = false;
      ballsRef.current.forEach(ball => {
        if (ball.isStuck) {
          ball.isStuck = false;
          // Launch angle based on paddle offset if it's the start, otherwise straight up
          ball.dy = -Math.abs(ball.speed);
          ball.dx = (Math.random() - 0.5) * 2;
          released = true;
        }
      });
      if (released) {
        // Optional sound effect trigger here
      }
    }
  }, [gameState]);

  const handleMouseMove = (e: React.MouseEvent) => handleInputMove(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleInputMove(e.touches[0].clientX);

  // Initial Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const resize = () => {
        canvas.width = Math.min(window.innerWidth, 800);
        canvas.height = Math.min(window.innerHeight * 0.8, 600);
        if (gameState === GameState.MENU) {
            initLevel(canvas, 1);
        }
      };
      window.addEventListener('resize', resize);
      resize();
      return () => window.removeEventListener('resize', resize);
    }
  }, [initLevel, gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  useEffect(() => {
    if (gameState === GameState.MENU) {
        statsRef.current = { score: 0, level: 1 };
        setScoreDisplay(0);
        setLevelDisplay(1);
        if (canvasRef.current) initLevel(canvasRef.current, 1);
    }
  }, [gameState, initLevel]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
      
      {/* HUD */}
      <div className="absolute top-4 w-full max-w-2xl flex justify-between px-6 font-bold text-xl z-10 pointer-events-none">
        <div className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
            SCORE: {scoreDisplay}
        </div>
        <div className="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">
            LEVEL: {levelDisplay}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onClick={handleInputClick}
        onTouchStart={handleInputClick}
        className="bg-slate-900 rounded-lg shadow-2xl border-2 border-slate-700 cursor-none touch-none"
        style={{ maxWidth: '100%', maxHeight: '80vh' }}
      />
      <div className="text-slate-500 text-xs mt-1 font-mono animate-pulse">
        {gameState === GameState.PLAYING && "TAP OR CLICK TO LAUNCH BALL"}
      </div>
    </div>
  );
};

export default GameCanvas;