export class SpriteAnimator {
  constructor(image, frameWidth, frameHeight, frameCount, fps, { loop = true, anchor = { x: 0.5, y: 0.5 }, scale = 1 } = {}) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.fps = fps;
    this.loop = loop;
    this.anchor = anchor;
    this.scale = scale;
    this.reset();
  }

  reset() {
    this.frame = 0;
    this.elapsed = 0;
    this.finished = false;
  }

  clone() {
    return new SpriteAnimator(
      this.image,
      this.frameWidth,
      this.frameHeight,
      this.frameCount,
      this.fps,
      { loop: this.loop, anchor: { ...this.anchor }, scale: this.scale }
    );
  }

  setFps(fps) {
    this.fps = fps;
  }

  setLoop(loop) {
    this.loop = loop;
  }

  update(dt) {
    if (this.finished) return;
    const frameDuration = 1000 / (this.fps || 1);
    this.elapsed += dt;
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.frame += 1;
      if (this.frame >= this.frameCount) {
        if (this.loop) {
          this.frame = 0;
        } else {
          this.frame = this.frameCount - 1;
          this.finished = true;
          break;
        }
      }
    }
  }

  draw(ctx, x, y, { flip = false, scale = this.scale, rotation = 0, alpha = 1 } = {}) {
    if (!this.image) return;
    ctx.save();
    ctx.translate(x, y);
    if (rotation) {
      ctx.rotate(rotation);
    }
    ctx.scale(flip ? -scale : scale, scale);
    ctx.globalAlpha = alpha;
    const offsetX = -this.frameWidth * this.anchor.x;
    const offsetY = -this.frameHeight * this.anchor.y;
    ctx.drawImage(
      this.image,
      this.frameWidth * this.frame,
      0,
      this.frameWidth,
      this.frameHeight,
      offsetX,
      offsetY,
      this.frameWidth,
      this.frameHeight
    );
    ctx.restore();
  }
}

export function combineFrames(frames) {
  if (!frames.length) return null;
  const frameWidth = frames[0].width;
  const frameHeight = frames[0].height;
  const sheet = document.createElement('canvas');
  sheet.width = frameWidth * frames.length;
  sheet.height = frameHeight;
  const sheetCtx = sheet.getContext('2d');
  sheetCtx.imageSmoothingEnabled = false;
  frames.forEach((frame, idx) => {
    sheetCtx.drawImage(frame, idx * frameWidth, 0);
  });
  return sheet;
}

export function createAnimatorFromFrames(frames, fps, options = {}) {
  const sheet = combineFrames(frames);
  if (!sheet) return null;
  return new SpriteAnimator(sheet, frames[0].width, frames[0].height, frames.length, fps, options);
}
