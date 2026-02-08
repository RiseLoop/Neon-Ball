export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum PowerUpType {
  EXPAND = 'EXPAND',
  MULTIBALL = 'MULTIBALL',
  SHIELD = 'SHIELD',
  STICKY = 'STICKY'
}

export interface Vector {
  x: number;
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
  color: string;
  isStuck?: boolean;
  stuckOffset?: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isSticky?: boolean;
  originalWidth: number;
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  color: string;
  value: number;
}

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  type: PowerUpType;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  color: string;
  size: number;
}

export interface GameStats {
  score: number;
  level: number;
}