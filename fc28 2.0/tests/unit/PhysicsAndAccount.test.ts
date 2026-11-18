import { describe, it, expect } from 'vitest';
import { BallPhysics } from '@/physics/BallPhysics';
import { AccountService } from '@/services/AccountService';

describe('BallPhysics & AccountService', () => {
  it('BallPhysics should integrate gravity and velocity smoothly', () => {
    const ball = new BallPhysics();
    ball.kick(1, 0, 10, 5, 0);

    expect(ball.velocity.x).toBe(10);
    expect(ball.velocity.z).toBe(5);

    // Step physics 10 frames
    for (let i = 0; i < 10; i++) {
      ball.update(1 / 60);
    }

    expect(ball.position.x).toBeGreaterThan(0);
    expect(ball.position.z).toBeGreaterThan(0);
    expect(ball.velocity.z).toBeLessThan(5); // Gravity should pull it down
  });

  it('BallPhysics should handle goalpost collisions and rebounds', () => {
    const ball = new BallPhysics();
    ball.position = { x: 10, y: 5, z: 1.0 };
    ball.velocity = { x: 5, y: 0, z: 0 };

    const post = { x: 10.2, y: 5, z: 0, radius: 0.1, height: 2.44 };
    const collided = ball.checkGoalpostCollision(post);

    expect(collided).toBe(true);
    expect(ball.velocity.x).toBeLessThan(0); // Should reflect backwards
  });

  it('AccountService should generate valid transfer codes and restore club data', () => {
    const service = AccountService.getInstance();
    const testClub = {
      coins: 450,
      owned: ['fwd_pele', 'gk_yashin'],
      lineup: { GK: 'gk_yashin', DEF: 'def_disasi', MID: 'mid_soucek', FWD: 'fwd_pele' },
      version: 2
    };

    const code = service.generateTransferCode(testClub);
    expect(code.startsWith('FC28_')).toBe(true);

    const restored = service.restoreFromTransferCode(code);
    expect(restored).toBeDefined();
    expect(restored?.coins).toBe(450);
    expect(restored?.owned).toContain('fwd_pele');
  });
});
