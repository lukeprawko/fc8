/**
 * CYBERFC 28 — High-Precision Decoupled Game Loop
 * Fixed 60 Hz physics tick with smooth variable-framerate rendering interpolation.
 */

export type TickCallback = (dt: number) => void;
export type RenderCallback = (alpha: number) => void;

export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedDt: number = 1 / 60; // 60 Hz fixed tick
  private animationFrameId: number | null = null;

  public onTick: TickCallback | null = null;
  public onRender: RenderCallback | null = null;

  // Performance monitoring
  public fps: number = 60;
  private frameCount: number = 0;
  private lastFpsCalc: number = 0;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsCalc = this.lastTime;
    this.accumulator = 0;
    this.frameCount = 0;

    const loop = (now: number) => {
      if (!this.isRunning) return;

      const frameTime = Math.min((now - this.lastTime) / 1000, 0.1); // Clamp to max 100ms
      this.lastTime = now;
      this.accumulator += frameTime;

      // Fixed timestep updates
      while (this.accumulator >= this.fixedDt) {
        if (this.onTick) {
          this.onTick(this.fixedDt);
        }
        this.accumulator -= this.fixedDt;
      }

      // Render interpolation alpha (0.0 - 1.0)
      const alpha = this.accumulator / this.fixedDt;
      if (this.onRender) {
        this.onRender(alpha);
      }

      // Calculate FPS
      this.frameCount++;
      if (now - this.lastFpsCalc >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsCalc = now;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
