/**
 * Asset loader & Canvas Sprite Renderer for Avatar Dude (Snake) & Polo Dude (Apple)
 * Uses clean cropped cutout versions with transparent backgrounds, scaled to fit larger grid squares!
 */

export interface GameAssets {
  dude1Img: HTMLImageElement | null; // Avatar Dude cutout
  dude2Img: HTMLImageElement | null; // Polo Apple Dude cutout
  loaded: boolean;
}

export const assets: GameAssets = {
  dude1Img: null,
  dude2Img: null,
  loaded: false,
};

export function loadGameAssets(): Promise<boolean> {
  return new Promise((resolve) => {
    let loadedCount = 0;
    const total = 2;

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= total) {
        assets.loaded = true;
        resolve(true);
      }
    };

    const dude1 = new Image();
    dude1.crossOrigin = 'anonymous';
    dude1.src = '/assets/aistudio/image_67593ebe.png';
    dude1.onload = () => {
      assets.dude1Img = dude1;
      checkComplete();
    };
    dude1.onerror = () => {
      checkComplete();
    };

    const dude2 = new Image();
    dude2.crossOrigin = 'anonymous';
    dude2.src = '/assets/aistudio/image_6f2c4f24.png';
    dude2.onload = () => {
      assets.dude2Img = dude2;
      checkComplete();
    };
    dude2.onerror = () => {
      checkComplete();
    };

    setTimeout(() => {
      assets.loaded = true;
      resolve(true);
    }, 2500);
  });
}

/**
 * Draws Dude #1 (Avatar Snake Head)
 * Scaled to match the larger grid square, rotating to face movement direction!
 */
export function drawAvatarSnakeHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angleRad: number,
  isAvatarState: boolean,
  isChomping: boolean,
  time: number
) {
  ctx.save();
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.translate(cx, cy);
  // Slithering rotation towards movement direction
  ctx.rotate(angleRad + Math.PI / 2);

  // Scaled to fit comfortably inside the enlarged grid square
  const targetH = size * 1.15;
  let targetW = size * 0.85;

  if (assets.dude1Img && assets.dude1Img.complete && assets.dude1Img.height > 0) {
    const aspect = assets.dude1Img.width / assets.dude1Img.height;
    targetW = targetH * aspect;
  }

  const halfW = targetW / 2;
  const halfH = targetH / 2;

  // Chomping squash & stretch animation
  const chompScaleX = isChomping ? 1.12 + Math.sin(time * 24) * 0.06 : 1.0;
  const chompScaleY = isChomping ? 0.9 + Math.cos(time * 24) * 0.06 : 1.0;
  ctx.scale(chompScaleX, chompScaleY);

  // Electric Avatar State Aura
  if (isAvatarState) {
    const pulse = 1 + Math.sin(time * 14) * 0.15;
    const glowGrad = ctx.createRadialGradient(0, 0, halfW * 0.3, 0, 0, targetH * 0.7 * pulse);
    glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
    glowGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.4)');
    glowGrad.addColorStop(1, 'rgba(3, 105, 161, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, targetH * 0.7 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Avatar Dude Cutout
  if (assets.dude1Img && assets.dude1Img.complete) {
    ctx.save();
    ctx.shadowColor = isAvatarState ? '#38bdf8' : 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = isAvatarState ? 20 : 8;
    ctx.drawImage(assets.dude1Img, -halfW, -halfH, targetW, targetH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#f5d0b0';
    ctx.beginPath();
    ctx.arc(0, 0, halfW, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing laser eye beams from his glasses (aligned with image_67593ebe)
  // In image_67593ebe, eyes are at ~42% from top
  const eyeY = -halfH + targetH * 0.42;
  const eyeSpacing = targetW * 0.22;

  [-eyeSpacing, eyeSpacing].forEach((eyeX) => {
    ctx.save();
    // Glowing eye flare
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = isAvatarState ? 20 : 12;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Forward laser flare shooting out
    const beamLen = isAvatarState ? targetH * 0.9 : targetH * 0.55;
    const beamGrad = ctx.createLinearGradient(eyeX, eyeY, eyeX, eyeY - beamLen);
    beamGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    beamGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
    beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = isAvatarState ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(eyeX, eyeY);
    ctx.lineTo(eyeX, eyeY - beamLen);
    ctx.stroke();
    ctx.restore();
  });

  // Forehead Arrow glow pulse
  const arrowY = -halfH + targetH * 0.22;
  ctx.save();
  ctx.fillStyle = isAvatarState ? '#ffffff' : '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = isAvatarState ? 14 : 6;
  ctx.beginPath();
  const aSize = targetW * 0.22;
  ctx.moveTo(0, arrowY + aSize * 0.6);
  ctx.lineTo(aSize * 0.5, arrowY);
  ctx.lineTo(aSize * 0.2, arrowY);
  ctx.lineTo(aSize * 0.2, arrowY - aSize * 0.5);
  ctx.lineTo(-aSize * 0.2, arrowY - aSize * 0.5);
  ctx.lineTo(-aSize * 0.2, arrowY);
  ctx.lineTo(-aSize * 0.5, arrowY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Chomping mouth indicator
  if (isChomping) {
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, -halfH + targetH * 0.72, targetW * 0.2, targetH * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws Snake Body Segments
 * Clean circular energy spheres featuring Dude #1's cutout head, scaled to the big squares.
 */
export function drawAvatarBodySegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  index: number,
  totalSegments: number,
  isAvatarState: boolean,
  time: number
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const progress = index / Math.max(1, totalSegments);

  // Scaled to fit cleanly in the square
  const segRadius = (size * 0.44) * (1 - progress * 0.2);
  const targetH = segRadius * 2;
  let targetW = segRadius * 1.5;

  if (assets.dude1Img && assets.dude1Img.complete && assets.dude1Img.height > 0) {
    const aspect = assets.dude1Img.width / assets.dude1Img.height;
    targetW = targetH * aspect;
  }

  ctx.save();
  ctx.translate(cx, cy);

  // Subtle slithering wave
  const wave = Math.sin(time * 7 + index * 0.5) * 0.12;
  ctx.rotate(wave);

  // Glowing energy orb container
  ctx.save();
  const auraColor = isAvatarState ? '#38bdf8' : '#0284c7';
  ctx.shadowColor = auraColor;
  ctx.shadowBlur = isAvatarState ? 14 : 6;

  // Background disk
  ctx.fillStyle = isAvatarState ? 'rgba(14, 165, 233, 0.35)' : 'rgba(2, 132, 199, 0.22)';
  ctx.beginPath();
  ctx.arc(0, 0, segRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw miniature Dude 1 cutout inside segment
  if (assets.dude1Img && assets.dude1Img.complete) {
    ctx.drawImage(assets.dude1Img, -targetW / 2, -targetH / 2, targetW, targetH);
  }

  // Border ring
  ctx.lineWidth = isAvatarState ? 2.5 : 1.5;
  ctx.strokeStyle = isAvatarState ? '#7dd3fc' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 0, segRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Draws Dude #2 (The Apple)
 * Clean cutout of Polo dude adorned with an apple halo, stem, and green leaf!
 */
export function drawDudeApple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: 'NORMAL' | 'GOLDEN' | 'SPICY' | 'ZEN',
  wobbleOffset: number,
  phrase: string,
  time: number
) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  // Bouncy wobble & breathing
  const wobbleY = Math.sin(time * 5 + wobbleOffset) * 3;
  const wobbleRot = Math.sin(time * 3 + wobbleOffset) * 0.05;
  const breath = 1 + Math.sin(time * 4 + wobbleOffset) * 0.05;

  // Scaled to fit the enlarged grid square
  const targetH = size * 1.05 * breath;
  let targetW = size * 0.9 * breath;

  if (assets.dude2Img && assets.dude2Img.complete && assets.dude2Img.height > 0) {
    const aspect = assets.dude2Img.width / assets.dude2Img.height;
    targetW = targetH * aspect;
  }

  const halfW = targetW / 2;
  const halfH = targetH / 2;

  ctx.save();
  ctx.translate(cx, cy + wobbleY);
  ctx.rotate(wobbleRot);

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, halfH + 4, halfW * 0.85, halfW * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Theme colors per apple type
  let auraColor = 'rgba(239, 68, 68, 0.45)';
  let borderColor = '#ef4444';
  let leafColor = '#22c55e';

  if (type === 'GOLDEN') {
    auraColor = 'rgba(234, 179, 8, 0.65)';
    borderColor = '#facc15';
    leafColor = '#fbbf24';
  } else if (type === 'SPICY') {
    auraColor = 'rgba(249, 115, 22, 0.65)';
    borderColor = '#f97316';
    leafColor = '#ef4444';
  } else if (type === 'ZEN') {
    auraColor = 'rgba(6, 182, 212, 0.55)';
    borderColor = '#06b6d4';
    leafColor = '#10b981';
  }

  // Apple Aura Glow
  const auraGrad = ctx.createRadialGradient(0, 0, halfW * 0.3, 0, 0, halfH * 1.25);
  auraGrad.addColorStop(0, auraColor);
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, halfH * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Draw Dude 2 cutout
  ctx.save();
  if (assets.dude2Img && assets.dude2Img.complete) {
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 12;
    ctx.drawImage(assets.dude2Img, -halfW, -halfH, targetW, targetH);

    // Color glaze for special apple types
    if (type === 'GOLDEN') {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, halfW, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'SPICY') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, halfW, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'ZEN') {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, halfW, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, halfW, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Apple Twig Stem on top of his head
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(0, -halfH + 2);
  ctx.quadraticCurveTo(6, -halfH - 12, 12, -halfH - 16);
  ctx.stroke();

  // Glossy Green Apple Leaf
  ctx.fillStyle = leafColor;
  ctx.shadowColor = leafColor;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(6, -halfH - 8);
  ctx.quadraticCurveTo(20, -halfH - 20, 22, -halfH - 10);
  ctx.quadraticCurveTo(14, -halfH - 4, 6, -halfH - 8);
  ctx.fill();
  ctx.restore();

  // Speech bubble
  if (phrase) {
    ctx.save();
    ctx.font = '700 12px Outfit, sans-serif';
    const textWidth = ctx.measureText(phrase).width;
    const bubbleW = textWidth + 18;
    const bubbleH = 22;
    const bubbleX = -bubbleW / 2;
    const bubbleY = -halfH - 34;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, bubbleY + bubbleH);
    ctx.lineTo(0, bubbleY + bubbleH + 5);
    ctx.lineTo(4, bubbleY + bubbleH);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(phrase, 0, bubbleY + bubbleH / 2);
    ctx.restore();
  }

  ctx.restore();
}
