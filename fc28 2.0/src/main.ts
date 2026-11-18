/**
 * CYBERFC 28 — Application Entrypoint
 * Bootstraps the 3D Engine, input controllers, UI bridge, and event bus.
 */

import { Engine } from './core/Engine';
import { events } from './core/EventBus';
import { squadManager } from './ultimate-team/SquadManager';
import { accountService } from './services/AccountService';
import { PackSystem, PackTier } from './ultimate-team/PackSystem';

console.log('[CYBERFC 28] Next-Gen 3D Engine Bootstrapping...');

export class GameApp {
  public engine: Engine | null = null;
  public canvas: HTMLCanvasElement | null = null;

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.engine = new Engine(canvas);
    this.setupInputs();
    this.setupWindowResize();
    this.engine.start();

    console.log('[CYBERFC 28] Engine successfully started.');
  }

  private setupInputs(): void {
    const keys: Record<string, boolean> = {};

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      keys[e.code] = true;

      // Smart switch to closest player to ball
      if (e.code === 'Space' || e.code === 'Tab' || e.code === 'KeyQ') {
        if (this.engine) {
          this.engine.switchPlayerToClosest();
        }
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      keys[e.code] = false;
    });

    // Per-frame input integration
    if (this.engine) {
      const originalTick = this.engine.gameLoop.onTick;
      this.engine.gameLoop.onTick = (dt: number) => {
        if (this.engine && this.engine.controlledPlayer) {
          let dx = 0;
          let dz = 0;
          if (keys['KeyW']) dz -= 1;
          if (keys['KeyS']) dz += 1;
          if (keys['KeyA']) dx -= 1;
          if (keys['KeyD']) dx += 1;

          const sprint = !!(keys['ShiftLeft'] || keys['ShiftRight']);
          this.engine.controlledPlayer.moveInDirection(dx, dz, sprint);
        }

        if (originalTick) originalTick(dt);
      };
    }
  }

  private setupWindowResize(): void {
    window.addEventListener('resize', () => {
      if (this.engine && this.canvas) {
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;
        this.engine.renderer.resize(width, height);
      }
    });
  }

  // Public API methods for UI
  public openPack(tier: PackTier) {
    const club = squadManager.getClubData();
    const result = PackSystem.openPack(tier, club.owned);
    if (!result.isDuplicate) {
      squadManager.addCardToClub(result.card.id);
    } else if (result.refundCoins > 0) {
      squadManager.addCoins(result.refundCoins);
    }
    events.emit('packOpened', result);
    return result;
  }
}

export const app = new GameApp();

// Auto-mount if canvas#field is present
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fieldCanvas = document.getElementById('field') as HTMLCanvasElement;
    if (fieldCanvas) {
      app.init(fieldCanvas);
    }
  });
}
