/**
 * CYBERFC 28 — Footballer Entity Representation
 * Controls movement kinematics, stamina, playstyle activation, and ball interaction.
 */

import * as THREE from 'three';
import { PlayerCard, PlayerRole } from '../ultimate-team/PlayerCard';
import { PlayerModel } from './PlayerModel';
import { BallPhysics } from '../physics/BallPhysics';

export class PlayerEntity {
  public card: PlayerCard;
  public team: 'blue' | 'red';
  public role: PlayerRole;
  public model: PlayerModel;

  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public angle: number = 0;

  // Attributes
  public baseSpeed: number = 7.5;
  public stamina: number = 100;
  public isControlled: boolean = false;
  public isSprinting: boolean = false;
  public isShielding: boolean = false;
  public isSliding: boolean = false;
  public sentOff: boolean = false;

  public slideCooldown: number = 0;
  public stunTimer: number = 0;

  constructor(card: PlayerCard, team: 'blue' | 'red', startPos: THREE.Vector3) {
    this.card = card;
    this.team = team;
    this.role = card.role;
    this.position.copy(startPos);
    this.angle = team === 'blue' ? 0 : Math.PI;

    this.model = new PlayerModel(card, team);
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.angle;

    // Apply card stats to kinematics
    const pacNorm = (card.pac || 75) / 100;
    this.baseSpeed = 6.2 + pacNorm * 3.4; // 6.2 to 9.6 m/s
  }

  public update(dt: number, ball: BallPhysics): void {
    if (this.sentOff) return;

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.velocity.multiplyScalar(0.85);
      this.position.addScaledVector(this.velocity, dt);
      this.model.group.position.copy(this.position);
      return;
    }

    if (this.slideCooldown > 0) this.slideCooldown -= dt;

    // Apply velocity
    this.position.addScaledVector(this.velocity, dt);
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.angle;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const isMoving = speed > 0.1;
    this.model.updateAnimation(isMoving, this.isSprinting ? 1.4 : 1.0);

    // Natural friction
    this.velocity.multiplyScalar(0.82);

    // Stamina recovery
    if (!this.isSprinting && !this.isShielding) {
      this.stamina = Math.min(100, this.stamina + 18 * dt);
    }
  }

  public moveInDirection(dirX: number, dirZ: number, sprint: boolean): void {
    const len = Math.hypot(dirX, dirZ);
    if (len < 0.05) return;

    const nx = dirX / len;
    const nz = dirZ / len;

    this.isSprinting = sprint && this.stamina > 10;
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - 15 * (1 / 60));
    }

    const currentSpeed = this.baseSpeed * (this.isSprinting ? 1.34 : 1.0);
    this.velocity.x += (nx * currentSpeed - this.velocity.x) * 0.38;
    this.velocity.z += (nz * currentSpeed - this.velocity.z) * 0.38;

    this.angle = Math.atan2(this.velocity.x, this.velocity.z);
  }
}
