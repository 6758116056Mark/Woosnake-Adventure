export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Point {
  x: number;
  y: number;
}

export type AppleType = 'NORMAL' | 'GOLDEN' | 'SPICY' | 'ZEN';

export interface Apple {
  id: number;
  x: number;
  y: number;
  type: AppleType;
  spawnTime: number;
  duration?: number; // expiry for temporary special apples
  phrase: string;
  wobbleOffset: number;
}

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameSettings {
  difficulty: Difficulty;
  wrapWalls: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  particlesEnabled: boolean;
  controlsMode: 'ARROWS' | 'WASD' | 'BOTH';
}

export interface GameStats {
  score: number;
  highScore: number;
  applesEaten: number;
  combo: number;
  maxCombo: number;
  snakeLength: number;
  avatarStateTimeLeft: number; // in seconds
  spicyBoostTimeLeft: number;
  zenSlowTimeLeft: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  glow?: boolean;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  alpha: number;
  vy: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}
