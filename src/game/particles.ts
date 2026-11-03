import { Particle, FloatingText, Shockwave } from './types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];
  private nextTextId = 1;

  public clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  // Eye laser sparks
  public spawnEyeSparks(x: number, y: number, isAvatarState: boolean) {
    const count = isAvatarState ? 3 : 1;
    const colors = isAvatarState ? ['#38bdf8', '#ffffff', '#e0f2fe'] : ['#38bdf8', '#7dd3fc'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 25 + 10;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (isAvatarState ? 3.5 : 2) + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 2 + 2,
        glow: true,
      });
    }
  }

  // Apple crunch burst
  public spawnAppleChomp(x: number, y: number, type: 'NORMAL' | 'GOLDEN' | 'SPICY' | 'ZEN') {
    let colors = ['#ef4444', '#f87171', '#22c55e', '#fef08a']; // Red apple & green leaf
    if (type === 'GOLDEN') colors = ['#facc15', '#eab308', '#ffffff', '#fde047'];
    if (type === 'SPICY') colors = ['#f97316', '#ef4444', '#fbbf24', '#ffedd5'];
    if (type === 'ZEN') colors = ['#06b6d4', '#67e8f9', '#ffffff', '#10b981'];

    // 25 juicy pieces
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 1.5 + 1.2,
        glow: type === 'GOLDEN' || type === 'ZEN',
      });
    }

    // Add shockwave
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: type === 'GOLDEN' ? 70 : 40,
      color: colors[0],
      alpha: 0.9,
      lineWidth: 3,
    });
  }

  // Crash burst
  public spawnCrash(x: number, y: number) {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 2,
        color: Math.random() > 0.5 ? '#38bdf8' : '#ef4444',
        alpha: 1,
        decay: Math.random() * 2 + 1,
        glow: true,
      });
    }

    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 85,
      color: '#38bdf8',
      alpha: 1,
      lineWidth: 4,
    });
  }

  // Floating score text
  public addFloatingText(text: string, x: number, y: number, color: string = '#facc15', size: number = 16) {
    this.floatingTexts.push({
      id: this.nextTextId++,
      text,
      x,
      y,
      color,
      size,
      alpha: 1,
      vy: -45, // moves upwards
    });
  }

  public update(dt: number) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.alpha -= p.decay * dt;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.alpha -= 0.85 * dt;

      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * 10 * dt + 15 * dt;
      s.alpha -= 1.8 * dt;

      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Draw shockwaves
    for (const s of this.shockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.lineWidth = s.lineWidth;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw floating texts
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.font = `800 ${t.size}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    ctx.restore();
  }
}
