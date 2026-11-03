import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Play,
  Pause,
  Trophy,
  Zap,
  Flame,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Settings,
  X,
} from 'lucide-react';
import { Direction, Point, Apple, GameState, Difficulty, GameSettings } from './types';
import { sound } from './audio';
import {
  loadGameAssets,
  drawAvatarSnakeHead,
  drawAvatarBodySegment,
  drawDudeApple,
} from './assets';
import { ParticleSystem } from './particles';

// Humorous quotes that Dude #2 (Apple) shouts while on the field
const APPLE_PHRASES = [
  "Don't eat me!",
  "Wait, I'm a giant apple?!",
  "Spare me bro!",
  "Why am I so huge?!",
  "Check my whole polo out!",
  "I have exams tomorrow!",
  "Too juicy to live...",
  "Look at that giant arrow!",
  "Full photo apple power!",
  "My AC unit is in the shot!",
  "Organic monk vibes",
  "Help! Giant snake incoming!",
  "Is that Avatar state?!",
  "Chill dude, I'm massive!",
];

export const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React state for HUD overlays & menus (isolated so canvas loop is NOT tied to React renders)
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('avatar_snake_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [combo, setCombo] = useState(1);
  const [dudesEaten, setDudesEaten] = useState(0);
  const [avatarStateActive, setAvatarStateActive] = useState(false);
  const [avatarStateSec, setAvatarStateSec] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'MEDIUM',
    wrapWalls: true,
    soundEnabled: true,
    musicEnabled: false,
    particlesEnabled: true,
    controlsMode: 'BOTH',
  });

  // Game internal mutable references for 60fps loop
  const engineRef = useRef({
    // Grid settings
    cols: 24,
    rows: 18,
    cellSize: 32,
    offsetX: 0,
    offsetY: 0,

    // Snake logic coordinates
    snake: [{ x: 10, y: 9 }, { x: 9, y: 9 }, { x: 8, y: 9 }] as Point[],
    prevSnake: [{ x: 10, y: 9 }, { x: 9, y: 9 }, { x: 8, y: 9 }] as Point[],
    direction: 'RIGHT' as Direction,
    nextDirection: 'RIGHT' as Direction,
    queuedDirections: [] as Direction[],

    // Smooth movement interpolation
    moveTimer: 0,
    moveInterval: 0.12, // seconds per step (adjusts with difficulty/boost)
    baseSpeed: 0.12,

    // Apples & items
    apples: [] as Apple[],
    nextAppleId: 1,

    // Avatar / Powerup timers
    avatarTimer: 0,
    spicyTimer: 0,
    zenTimer: 0,
    comboTimer: 0,
    comboCount: 1,

    // Screen Shake & Hitstop
    screenShake: 0,
    hitstop: 0,

    // Particles
    particles: new ParticleSystem(),

    // Input state
    isBoosting: false,
    lastFrameTime: performance.now(),
    isGameOver: false,
    score: 0,
    dudesEaten: 0,
    animationFrameId: 0,

    // Title screen demo camera pan
    titlePanTime: 0,
  });

  // Keep sound engine synced with state
  useEffect(() => {
    sound.setSoundEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    sound.setMusicEnabled(musicOn);
  }, [musicOn]);

  // Load assets on mount
  useEffect(() => {
    loadGameAssets();
  }, []);

  // Update high score storage
  const updateHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        try {
          localStorage.setItem('avatar_snake_highscore', newScore.toString());
        } catch {
          // ignore
        }
        return newScore;
      }
      return prev;
    });
  }, []);

  // Spawn new Dude #2 Apple
  const spawnApple = useCallback((forcedType?: Apple['type']) => {
    const e = engineRef.current;
    let newX = 0;
    let newY = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 100) {
      attempts++;
      newX = Math.floor(Math.random() * e.cols);
      newY = Math.floor(Math.random() * e.rows);

      // Check collision with snake
      const onSnake = e.snake.some((seg) => seg.x === newX && seg.y === newY);
      const onOtherApple = e.apples.some((a) => a.x === newX && a.y === newY);
      if (!onSnake && !onOtherApple) {
        valid = true;
      }
    }

    if (!valid) return;

    let type: Apple['type'] = forcedType || 'NORMAL';
    if (!forcedType) {
      const roll = Math.random();
      if (roll < 0.12) {
        type = 'GOLDEN';
      } else if (roll < 0.22) {
        type = 'SPICY';
      } else if (roll < 0.30) {
        type = 'ZEN';
      }
    }

    const randomPhrase =
      Math.random() < 0.65
        ? APPLE_PHRASES[Math.floor(Math.random() * APPLE_PHRASES.length)]
        : '';

    e.apples.push({
      id: e.nextAppleId++,
      x: newX,
      y: newY,
      type,
      spawnTime: performance.now(),
      duration: type === 'NORMAL' ? undefined : 12, // temporary special apple
      phrase: randomPhrase,
      wobbleOffset: Math.random() * 10,
    });
  }, []);

  // Reset & Start Game
  const startGame = useCallback(() => {
    const e = engineRef.current;
    const midX = Math.floor(e.cols / 2);
    const midY = Math.floor(e.rows / 2);

    e.snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    e.prevSnake = JSON.parse(JSON.stringify(e.snake));
    e.direction = 'RIGHT';
    e.nextDirection = 'RIGHT';
    e.queuedDirections = [];

    // Base speed according to difficulty
    let speed = 0.12;
    if (settings.difficulty === 'EASY') speed = 0.15;
    if (settings.difficulty === 'HARD') speed = 0.085;
    e.baseSpeed = speed;
    e.moveInterval = speed;
    e.moveTimer = 0;

    e.apples = [];
    e.avatarTimer = 0;
    e.spicyTimer = 0;
    e.zenTimer = 0;
    e.comboTimer = 0;
    e.comboCount = 1;
    e.score = 0;
    e.dudesEaten = 0;
    e.isGameOver = false;
    e.isBoosting = false;
    e.screenShake = 0;
    e.hitstop = 0;
    e.particles.clear();

    // Spawn initial apples
    spawnApple('NORMAL');
    spawnApple();

    setScore(0);
    setCombo(1);
    setDudesEaten(0);
    setAvatarStateActive(false);
    setAvatarStateSec(0);
    setGameState('PLAYING');
  }, [settings.difficulty, spawnApple]);

  // Handle direction input with turn buffering
  const handleDirectionInput = useCallback((dir: Direction) => {
    const e = engineRef.current;
    if (e.isGameOver) return;

    const currentHeadDir = e.queuedDirections.length > 0
      ? e.queuedDirections[e.queuedDirections.length - 1]
      : e.direction;

    // Prevent immediate 180-degree reverse turns
    const isOpposite =
      (dir === 'UP' && currentHeadDir === 'DOWN') ||
      (dir === 'DOWN' && currentHeadDir === 'UP') ||
      (dir === 'LEFT' && currentHeadDir === 'RIGHT') ||
      (dir === 'RIGHT' && currentHeadDir === 'LEFT');

    if (!isOpposite && dir !== currentHeadDir) {
      if (e.queuedDirections.length < 2) {
        e.queuedDirections.push(dir);
        sound.playTurn();
      }
    }
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.repeat && ev.key !== ' ' && ev.key !== 'Shift') return;

      if (gameState === 'TITLE' || gameState === 'GAME_OVER') {
        if (ev.key === ' ' || ev.key === 'Enter') {
          ev.preventDefault();
          startGame();
          return;
        }
      }

      if (ev.key === 'Escape') {
        ev.preventDefault();
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      switch (ev.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          ev.preventDefault();
          handleDirectionInput('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          ev.preventDefault();
          handleDirectionInput('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          ev.preventDefault();
          handleDirectionInput('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          ev.preventDefault();
          handleDirectionInput('RIGHT');
          break;
        case ' ':
        case 'Shift':
          ev.preventDefault();
          engineRef.current.isBoosting = true;
          break;
      }
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === ' ' || ev.key === 'Shift') {
        engineRef.current.isBoosting = false;
      }
    };

    const handleBlur = () => {
      engineRef.current.isBoosting = false;
      engineRef.current.queuedDirections = [];
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, handleDirectionInput, startGame]);

  // Main 60fps Game Loop & Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let lastTime = performance.now();

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Handle retina high-DPI displays
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Adaptive grid cell size calculation with bigger squares scaled to head size
      const e = engineRef.current;
      // 10-15 columns so squares are large (~65px - 85px) and fit head size perfectly!
      const targetCols = width < 640 ? 10 : width < 1024 ? 12 : 15;
      e.cols = targetCols;
      e.cellSize = Math.floor(canvas.width / e.cols);
      e.rows = Math.floor(canvas.height / e.cellSize);

      // Center the playable grid
      e.offsetX = Math.floor((canvas.width - e.cols * e.cellSize) / 2);
      e.offsetY = Math.floor((canvas.height - e.rows * e.cellSize) / 2);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Frame runner
    const loop = (timestamp: number) => {
      const rawDt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to avoid big leaps

      const e = engineRef.current;
      e.titlePanTime += dt;

      // Apply Hitstop (freeze-frame impact pause)
      if (e.hitstop > 0) {
        e.hitstop -= dt;
      } else if (gameState === 'PLAYING') {
        // --- 1. SIMULATION UPDATE ---
        // Combo Timer decay
        if (e.comboTimer > 0) {
          e.comboTimer -= dt;
          if (e.comboTimer <= 0) {
            e.comboCount = 1;
            setCombo(1);
          }
        }

        // Avatar State Timer
        if (e.avatarTimer > 0) {
          e.avatarTimer -= dt;
          setAvatarStateSec(Math.ceil(e.avatarTimer));
          if (e.avatarTimer <= 0) {
            setAvatarStateActive(false);
          }
        }

        // Spicy and Zen timers
        if (e.spicyTimer > 0) e.spicyTimer -= dt;
        if (e.zenTimer > 0) e.zenTimer -= dt;

        // Calculate dynamic movement speed
        let speedMultiplier = 1;
        if (e.isBoosting) speedMultiplier *= 1.85;
        if (e.avatarTimer > 0) speedMultiplier *= 1.45;
        if (e.spicyTimer > 0) speedMultiplier *= 1.6;
        if (e.zenTimer > 0) speedMultiplier *= 0.65; // Zen slows down time for high precision

        // Slight natural speedup every 6 dudes eaten
        const progressSpeedup = 1 + Math.min(e.dudesEaten * 0.015, 0.45);
        e.moveInterval = e.baseSpeed / (speedMultiplier * progressSpeedup);

        // Step accumulator
        e.moveTimer += dt;

        while (e.moveTimer >= e.moveInterval) {
          e.moveTimer -= e.moveInterval;

          // Consume next direction from queue
          if (e.queuedDirections.length > 0) {
            e.direction = e.queuedDirections.shift()!;
          }

          // Save previous positions for smooth 60fps interpolation
          e.prevSnake = JSON.parse(JSON.stringify(e.snake));

          // Calculate new head position
          const currentHead = e.snake[0];
          let nextX = currentHead.x;
          let nextY = currentHead.y;

          if (e.direction === 'UP') nextY -= 1;
          else if (e.direction === 'DOWN') nextY += 1;
          else if (e.direction === 'LEFT') nextX -= 1;
          else if (e.direction === 'RIGHT') nextX += 1;

          // Wall collision checking
          if (settings.wrapWalls) {
            if (nextX < 0) nextX = e.cols - 1;
            else if (nextX >= e.cols) nextX = 0;
            if (nextY < 0) nextY = e.rows - 1;
            else if (nextY >= e.rows) nextY = 0;
          } else {
            // Hard walls
            if (nextX < 0 || nextX >= e.cols || nextY < 0 || nextY >= e.rows) {
              // Crash against wall!
              e.isGameOver = true;
              e.screenShake = 12;
              e.hitstop = 0.08;
              sound.playCrash();
              const crashPixelX = e.offsetX + currentHead.x * e.cellSize + e.cellSize / 2;
              const crashPixelY = e.offsetY + currentHead.y * e.cellSize + e.cellSize / 2;
              e.particles.spawnCrash(crashPixelX, crashPixelY);
              e.particles.addFloatingText('CRASH!', crashPixelX, crashPixelY - 20, '#ef4444', 22);
              setGameState('GAME_OVER');
              updateHighScore(e.score);
              break;
            }
          }

          // Self-collision checking
          // In Avatar State, can smash through tail safely with bonus points!
          const selfCollisionIdx = e.snake.findIndex((seg, idx) => idx > 0 && seg.x === nextX && seg.y === nextY);
          if (selfCollisionIdx !== -1) {
            if (e.avatarTimer > 0) {
              // Avatar State cuts tail!
              e.snake = e.snake.slice(0, selfCollisionIdx);
              e.screenShake = 6;
              e.particles.addFloatingText('TAIL SLICE!', e.offsetX + nextX * e.cellSize, e.offsetY + nextY * e.cellSize, '#38bdf8', 18);
              sound.playAvatarSurge();
            } else {
              // Normal crash
              e.isGameOver = true;
              e.screenShake = 14;
              e.hitstop = 0.08;
              sound.playCrash();
              const crashPixelX = e.offsetX + nextX * e.cellSize + e.cellSize / 2;
              const crashPixelY = e.offsetY + nextY * e.cellSize + e.cellSize / 2;
              e.particles.spawnCrash(crashPixelX, crashPixelY);
              e.particles.addFloatingText('SELF CHOMP!', crashPixelX, crashPixelY - 20, '#ef4444', 22);
              setGameState('GAME_OVER');
              updateHighScore(e.score);
              break;
            }
          }

          // Move snake forward
          const newHead = { x: nextX, y: nextY };
          e.snake.unshift(newHead);

          // Check if an Apple was eaten
          const appleIndex = e.apples.findIndex((a) => a.x === nextX && a.y === nextY);

          if (appleIndex !== -1) {
            const eatenApple = e.apples[appleIndex];
            e.apples.splice(appleIndex, 1);

            // Handle points and effects per Apple Type
            e.dudesEaten += 1;
            e.comboCount = Math.min(e.comboCount + 1, 5);
            e.comboTimer = 3.5; // 3.5s to chain next apple
            setCombo(e.comboCount);
            setDudesEaten(e.dudesEaten);

            let basePoints = 100;
            const applePixelX = e.offsetX + eatenApple.x * e.cellSize + e.cellSize / 2;
            const applePixelY = e.offsetY + eatenApple.y * e.cellSize + e.cellSize / 2;

            if (eatenApple.type === 'GOLDEN') {
              basePoints = 350;
              e.avatarTimer = 10; // 10s of full Avatar State!
              setAvatarStateActive(true);
              setAvatarStateSec(10);
              sound.playGoldenNom();
              sound.playAvatarSurge();
              e.particles.addFloatingText('AVATAR STATE ACTIVATED!', applePixelX, applePixelY - 25, '#facc15', 20);
            } else if (eatenApple.type === 'SPICY') {
              basePoints = 200;
              e.spicyTimer = 7;
              sound.playSpicyNom();
              e.particles.addFloatingText('SPICY TURBO!', applePixelX, applePixelY - 25, '#f97316', 18);
            } else if (eatenApple.type === 'ZEN') {
              basePoints = 150;
              e.zenTimer = 8;
              sound.playZenNom();
              e.particles.addFloatingText('ZEN FOCUS!', applePixelX, applePixelY - 25, '#06b6d4', 18);
            } else {
              sound.playNom();
            }

            const pointsAwarded = basePoints * e.comboCount * (e.avatarTimer > 0 ? 2 : 1);
            e.score += pointsAwarded;
            setScore(e.score);
            updateHighScore(e.score);

            // Trigger juice: particles, hitstop, screenshake
            e.screenShake = eatenApple.type === 'GOLDEN' ? 7 : 3.5;
            e.hitstop = 0.035; // 35ms hitstop
            e.particles.spawnAppleChomp(applePixelX, applePixelY, eatenApple.type);

            const scoreLabel = e.comboCount > 1
              ? `+${pointsAwarded} (x${e.comboCount})`
              : `+${pointsAwarded}`;
            e.particles.addFloatingText(scoreLabel, applePixelX, applePixelY - 12, '#f8fafc', 16);

            // Spawn next apples
            spawnApple();
            // Occasionally spawn a 2nd special apple if under 3
            if (e.apples.length < 2 && Math.random() < 0.4) {
              spawnApple();
            }
          } else {
            // Did not eat apple -> pop tail to maintain length
            e.snake.pop();
          }

          // Emit eye particles from Avatar snake head
          const headX = e.offsetX + e.snake[0].x * e.cellSize + e.cellSize / 2;
          const headY = e.offsetY + e.snake[0].y * e.cellSize + e.cellSize / 2;
          e.particles.spawnEyeSparks(headX, headY, e.avatarTimer > 0);
        }
      }

      // Update particle physics
      e.particles.update(dt);

      // Decaying screen shake
      let shakeX = 0;
      let shakeY = 0;
      if (e.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * e.screenShake * 2;
        shakeY = (Math.random() - 0.5) * e.screenShake * 2;
        e.screenShake = Math.max(0, e.screenShake - dt * 25);
      }

      // --- 2. RENDER PASS ---
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Deep atmospheric background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle dynamic grid arena
      const gridLeft = e.offsetX;
      const gridTop = e.offsetY;
      const gridRight = e.offsetX + e.cols * e.cellSize;
      const gridBottom = e.offsetY + e.rows * e.cellSize;

      // Arena background fill
      const arenaGrad = ctx.createLinearGradient(gridLeft, gridTop, gridRight, gridBottom);
      arenaGrad.addColorStop(0, '#0f172a');
      arenaGrad.addColorStop(1, '#0b1120');
      ctx.fillStyle = arenaGrad;
      ctx.fillRect(gridLeft, gridTop, e.cols * e.cellSize, e.rows * e.cellSize);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= e.cols; c++) {
        const x = gridLeft + c * e.cellSize;
        ctx.beginPath();
        ctx.moveTo(x, gridTop);
        ctx.lineTo(x, gridBottom);
        ctx.stroke();
      }
      for (let r = 0; r <= e.rows; r++) {
        const y = gridTop + r * e.cellSize;
        ctx.beginPath();
        ctx.moveTo(gridLeft, y);
        ctx.lineTo(gridRight, y);
        ctx.stroke();
      }

      // Arena Border
      ctx.lineWidth = settings.wrapWalls ? 2 : 4;
      ctx.strokeStyle = settings.wrapWalls
        ? 'rgba(56, 189, 248, 0.3)'
        : 'rgba(239, 68, 68, 0.7)';
      if (!settings.wrapWalls) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.strokeRect(gridLeft, gridTop, e.cols * e.cellSize, e.rows * e.cellSize);
      ctx.shadowBlur = 0;

      // Render Title screen live pan if in TITLE
      if (gameState === 'TITLE') {
        const panTime = e.titlePanTime;
        // Draw an epic animated snake loop circling an apple
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + 30;
        const orbitRadius = Math.min(canvas.width, canvas.height) * 0.22;

        // Draw central Apple Dude (Comically Big!)
        drawDudeApple(
          ctx,
          centerX - 48,
          centerY - 48,
          96,
          'GOLDEN',
          0,
          "Catch me if you can!",
          panTime
        );

        // Draw circling Avatar Snake (Comically Big!)
        const numSegments = 16;
        for (let i = numSegments - 1; i >= 0; i--) {
          const segAngle = panTime * 1.5 - i * 0.22;
          const segX = centerX + Math.cos(segAngle) * orbitRadius - 28;
          const segY = centerY + Math.sin(segAngle) * orbitRadius - 28;

          if (i === 0) {
            // Head
            drawAvatarSnakeHead(
              ctx,
              segX,
              segY,
              68,
              segAngle + Math.PI / 2,
              true,
              true,
              panTime
            );
          } else {
            // Body
            drawAvatarBodySegment(
              ctx,
              segX,
              segY,
              46,
              i,
              numSegments,
              true,
              panTime
            );
          }
        }
      } else {
        // --- IN-GAME DRAWING ---
        // 1. Draw Dude Apples
        const nowSec = performance.now() / 1000;
        for (const apple of e.apples) {
          const applePixelX = e.offsetX + apple.x * e.cellSize;
          const applePixelY = e.offsetY + apple.y * e.cellSize;
          drawDudeApple(
            ctx,
            applePixelX,
            applePixelY,
            e.cellSize,
            apple.type,
            apple.wobbleOffset,
            apple.phrase,
            nowSec
          );
        }

        // 2. Interpolate and Draw Snake (Smooth 60fps slithering)
        const alpha = Math.min(e.moveTimer / Math.max(e.moveInterval, 0.001), 1.0);

        // Check distance to closest apple for mouth open chomp anticipation
        let isNearApple = false;
        if (e.snake.length > 0) {
          const head = e.snake[0];
          for (const a of e.apples) {
            const dist = Math.hypot(head.x - a.x, head.y - a.y);
            if (dist <= 2.2) {
              isNearApple = true;
              break;
            }
          }
        }

        // Draw body segments (tail to neck)
        const isAvatar = e.avatarTimer > 0;
        for (let i = e.snake.length - 1; i >= 1; i--) {
          const curr = e.snake[i];
          const prev = e.prevSnake[i] || curr;

          // Prevent interpolation wrapping glitches
          let interpX = prev.x + (curr.x - prev.x) * alpha;
          let interpY = prev.y + (curr.y - prev.y) * alpha;

          // If crossed wall wrap, snap
          if (Math.abs(curr.x - prev.x) > 1) interpX = curr.x;
          if (Math.abs(curr.y - prev.y) > 1) interpY = curr.y;

          const px = e.offsetX + interpX * e.cellSize;
          const py = e.offsetY + interpY * e.cellSize;

          drawAvatarBodySegment(
            ctx,
            px,
            py,
            e.cellSize,
            i,
            e.snake.length,
            isAvatar,
            nowSec
          );
        }

        // Draw Head (Dude #1)
        if (e.snake.length > 0) {
          const curr = e.snake[0];
          const prev = e.prevSnake[0] || curr;

          let interpX = prev.x + (curr.x - prev.x) * alpha;
          let interpY = prev.y + (curr.y - prev.y) * alpha;

          if (Math.abs(curr.x - prev.x) > 1) interpX = curr.x;
          if (Math.abs(curr.y - prev.y) > 1) interpY = curr.y;

          const px = e.offsetX + interpX * e.cellSize;
          const py = e.offsetY + interpY * e.cellSize;

          // Head direction angle in radians
          let angleRad = 0;
          if (e.direction === 'RIGHT') angleRad = 0;
          else if (e.direction === 'DOWN') angleRad = Math.PI / 2;
          else if (e.direction === 'LEFT') angleRad = Math.PI;
          else if (e.direction === 'UP') angleRad = -Math.PI / 2;

          drawAvatarSnakeHead(
            ctx,
            px,
            py,
            e.cellSize, // Scales directly to the enlarged grid square
            angleRad,
            isAvatar,
            isNearApple || isAvatar,
            nowSec
          );
        }
      }

      // Draw particle system over playfield
      e.particles.draw(ctx);

      ctx.restore();

      // Request next frame
      e.animationFrameId = requestAnimationFrame(loop);
    };

    engineRef.current.animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(engineRef.current.animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameState, settings.wrapWalls, spawnApple, updateHighScore]);

  return (
    <div className="relative w-full h-screen bg-[#090d16] text-slate-100 font-game overflow-hidden select-none">
      {/* 60fps Isolated Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Perimeter Status Clusters (Low-Occlusion HUD - >=85% unobstructed) */}
      {gameState === 'PLAYING' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-6">
          {/* Top Bar Status Zone */}
          <div className="flex items-center justify-between">
            {/* Left Cluster: Score & High Score */}
            <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Score</span>
                <span className="text-xl md:text-2xl font-bold font-mono-numbers text-white tracking-tight">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-slate-700/60" />
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <Trophy className="w-3.5 h-3.5" />
                <span className="font-mono-numbers font-semibold">{highScore.toLocaleString()}</span>
              </div>
            </div>

            {/* Center Status: Combo / Avatar State Banner */}
            <div className="flex items-center gap-3">
              {combo > 1 && (
                <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/50 rounded-xl px-3 py-1.5 text-amber-300 text-xs font-bold tracking-wide animate-pulse">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>COMBO x{combo}</span>
                </div>
              )}

              {avatarStateActive && (
                <div className="flex items-center gap-1.5 bg-sky-500/25 border border-sky-400/60 rounded-xl px-3 py-1.5 text-sky-200 text-xs font-bold tracking-wide shadow-lg shadow-sky-500/20">
                  <Zap className="w-4 h-4 text-sky-300 animate-spin" />
                  <span>AVATAR STATE: {avatarStateSec}s</span>
                </div>
              )}
            </div>

            {/* Right Cluster: Audio toggles & Pause */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setMusicOn(!musicOn)}
                title={musicOn ? 'Mute Music' : 'Play Music'}
                className={`p-2 rounded-lg border transition-colors ${
                  musicOn
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Music className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSoundOn(!soundOn)}
                title={soundOn ? 'Mute SFX' : 'Enable SFX'}
                className="p-2 bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              </button>

              <button
                onClick={() => setGameState('PAUSED')}
                title="Pause Game (Esc)"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors text-xs font-semibold"
              >
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </button>
            </div>
          </div>

          {/* Bottom Bar: Dude stats & Mobile Controls */}
          <div className="flex items-end justify-between">
            {/* Left Info: Dudes munched */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3.5 py-2 text-xs text-slate-400 pointer-events-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Apple Dudes:</span>
                <span className="font-mono-numbers font-bold text-slate-200">{dudesEaten}</span>
              </div>
              <div className="h-3 w-[1px] bg-slate-700/60" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Walls:</span>
                <span className={`font-semibold ${settings.wrapWalls ? 'text-sky-400' : 'text-rose-400'}`}>
                  {settings.wrapWalls ? 'Wrap' : 'Deadly'}
                </span>
              </div>
            </div>

            {/* Mobile On-Screen D-Pad Controller */}
            <div className="pointer-events-auto flex flex-col items-center gap-1 md:hidden bg-slate-950/60 p-2 rounded-2xl border border-slate-800/80 backdrop-blur-xs">
              <button
                onClick={() => handleDirectionInput('UP')}
                className="w-12 h-12 bg-slate-800/90 active:bg-sky-600 rounded-xl flex items-center justify-center text-slate-200 shadow-md transition-all active:scale-95"
              >
                <ChevronUp className="w-7 h-7" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDirectionInput('LEFT')}
                  className="w-12 h-12 bg-slate-800/90 active:bg-sky-600 rounded-xl flex items-center justify-center text-slate-200 shadow-md transition-all active:scale-95"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  onPointerDown={() => {
                    engineRef.current.isBoosting = true;
                  }}
                  onPointerUp={() => {
                    engineRef.current.isBoosting = false;
                  }}
                  className="w-12 h-12 bg-sky-500 active:bg-sky-400 text-slate-950 font-black rounded-xl flex items-center justify-center text-xs shadow-md transition-all active:scale-95"
                >
                  BOOST
                </button>
                <button
                  onClick={() => handleDirectionInput('RIGHT')}
                  className="w-12 h-12 bg-slate-800/90 active:bg-sky-600 rounded-xl flex items-center justify-center text-slate-200 shadow-md transition-all active:scale-95"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </div>
              <button
                onClick={() => handleDirectionInput('DOWN')}
                className="w-12 h-12 bg-slate-800/90 active:bg-sky-600 rounded-xl flex items-center justify-center text-slate-200 shadow-md transition-all active:scale-95"
              >
                <ChevronDown className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TITLE SCREEN MODAL */}
      {gameState === 'TITLE' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 md:p-10 pointer-events-auto bg-slate-950/65">
          {/* Top corner settings button */}
          <div className="w-full flex justify-between items-center max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-widest">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>Arcade Edition</span>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* Bespoke Inline SVG Title Lockup */}
          <div className="flex flex-col items-center text-center max-w-2xl my-auto">
            <div className="relative mb-3">
              <svg width="340" height="74" viewBox="0 0 340 74" fill="none" className="max-w-full drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
                <defs>
                  <linearGradient id="avatarGrad" x1="0" y1="0" x2="340" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <text
                  x="170"
                  y="46"
                  textAnchor="middle"
                  fill="url(#avatarGrad)"
                  fontSize="42"
                  fontWeight="900"
                  fontFamily="'Outfit', sans-serif"
                  letterSpacing="3"
                >
                  AVATAR SNAKE
                </text>
                <text
                  x="170"
                  y="68"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="'Outfit', sans-serif"
                  letterSpacing="6"
                >
                  THE DUDE CHASE
                </text>
              </svg>
            </div>

            <p className="text-slate-400 text-sm md:text-base max-w-md mb-8 leading-relaxed">
              Avatar Dude is the laser-eyed snake, hunting Polo Apple Dude across the spiritual grid. Munch apples, trigger Avatar State, and unleash glowing chaos.
            </p>

            {/* Primary Start CTA Button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startGame}
                className="group relative px-8 py-3.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-black text-lg tracking-wide rounded-xl shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>START GAME</span>
              </button>

              {/* Single flat control hint line */}
              <p className="text-xs text-slate-500 font-medium tracking-wide">
                WASD / Arrows to Move · Space to Boost · Esc to Pause
              </p>
            </div>

            {/* Dude Character Badges - Clean Cutout Previews */}
            <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="h-16 w-12 rounded-xl border border-sky-400/80 overflow-hidden bg-slate-900/90 shadow-[0_0_14px_rgba(56,189,248,0.35)] flex items-center justify-center p-1">
                  <img src="/assets/aistudio/image_67593ebe.png" alt="Avatar Dude" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-sky-300">Avatar Dude</div>
                  <div className="text-[11px] text-slate-400">The Snake Head</div>
                </div>
              </div>

              <div className="text-slate-600 text-sm font-bold">VS</div>

              <div className="flex items-center gap-3">
                <div className="h-16 w-12 rounded-xl border border-rose-500/80 overflow-hidden bg-slate-900/90 shadow-[0_0_14px_rgba(239,68,68,0.35)] relative flex items-center justify-center p-1">
                  <img src="/assets/aistudio/image_6f2c4f24.png" alt="Apple Dude" className="max-h-full max-w-full object-contain" />
                  {/* Apple leaf ornament */}
                  <div className="absolute -top-1.5 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full shadow-sm" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-rose-400">Polo Dude</div>
                  <div className="text-[11px] text-slate-400">The Target Apple</div>
                </div>
              </div>
            </div>
          </div>

          {/* High Score footer readout */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>High Score:</span>
            <span className="font-mono-numbers font-bold text-amber-300 text-sm">{highScore.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-6 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-2">GAME PAUSED</h2>
            <p className="text-xs text-slate-400 mb-6">Avatar Dude is resting his glowing eyes.</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setGameState('PLAYING')}
                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all shadow-md active:scale-98"
              >
                Resume
              </button>
              <button
                onClick={startGame}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all border border-slate-700"
              >
                Restart Game
              </button>
              <button
                onClick={() => setGameState('TITLE')}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-6 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Zap className="w-7 h-7" />
            </div>

            <h2 className="text-3xl font-black text-white mb-1">DUDE DOWN!</h2>
            <p className="text-xs text-slate-400 mb-6">
              The snake got tied in a knot or crashed into reality.
            </p>

            {/* Score Breakdown */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3 text-left">
              <div>
                <div className="text-[11px] text-slate-500 uppercase font-semibold">Final Score</div>
                <div className="text-2xl font-bold font-mono-numbers text-sky-400">{score.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase font-semibold">Best Record</div>
                <div className="text-2xl font-bold font-mono-numbers text-amber-400">{highScore.toLocaleString()}</div>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
                <span>Apples Munched:</span>
                <span className="font-mono-numbers font-semibold text-slate-200">{dudesEaten}</span>
              </div>
            </div>

            {/* Play Again CTA */}
            <div className="flex flex-col gap-3">
              <button
                onClick={startGame}
                className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-black text-base rounded-xl transition-all shadow-lg shadow-sky-500/25 active:scale-98 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN (Space)</span>
              </button>

              <button
                onClick={() => setGameState('TITLE')}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS DRAWER / MODAL */}
      {settingsOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-6 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Game Settings</h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-5 text-sm">
              {/* Difficulty */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Difficulty</div>
                  <div className="text-xs text-slate-400">Controls baseline movement speed</div>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSettings({ ...settings, difficulty: diff })}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        settings.difficulty === diff
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wall Wrap Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Wall Behavior</div>
                  <div className="text-xs text-slate-400">
                    {settings.wrapWalls ? 'Portal wrap through boundaries' : 'Deadly walls (instant crash)'}
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, wrapWalls: !settings.wrapWalls })}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    settings.wrapWalls
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                      : 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                  }`}
                >
                  {settings.wrapWalls ? 'Wrap-Around' : 'Deadly Walls'}
                </button>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Sound Effects (SFX)</div>
                  <div className="text-xs text-slate-400">Synthesized audio bites & impacts</div>
                </div>
                <button
                  onClick={() => setSoundOn(!soundOn)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    soundOn
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {soundOn ? 'Enabled' : 'Muted'}
                </button>
              </div>

              {/* Music */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Synth Background Music</div>
                  <div className="text-xs text-slate-400">Procedural 8-bit ambient arpeggiator</div>
                </div>
                <button
                  onClick={() => setMusicOn(!musicOn)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    musicOn
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {musicOn ? 'Playing' : 'Off'}
                </button>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-colors"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
