/**
 * CYBERFC 28 — Realistic 3D Ball Physics Engine
 * Magnus curve effect, air resistance, turf restitution, and goalpost rebounds.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface GoalpostDef {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
}

export class BallPhysics {
  public position: Vector3D = { x: 0, y: 0, z: 0 };
  public velocity: Vector3D = { x: 0, y: 0, z: 0 };
  public spin: Vector3D = { x: 0, y: 0, z: 0 }; // Spin for Magnus force
  public radius: number = 0.22; // In meters
  public mass: number = 0.43;   // Standard size 5 ball (0.43 kg)
  public gravity: number = 9.81;

  public isAirborne: boolean = false;
  public isInNet: boolean = false;
  public lastKickerId: string | null = null;
  public lastKickTeam: 'blue' | 'red' | null = null;

  public update(dt: number, turfFriction: number = 0.98, airDrag: number = 0.995): void {
    if (this.isInNet) {
      // High dampening inside the net
      this.velocity.x *= 0.85;
      this.velocity.y *= 0.85;
      this.velocity.z *= 0.85;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.position.z = Math.max(0, this.position.z + this.velocity.z * dt);
      return;
    }

    // 1. Magnus Force Effect (F = S * (omega x v))
    const magnusCoeff = 0.0018;
    const magnusX = (this.spin.y * this.velocity.z - this.spin.z * this.velocity.y) * magnusCoeff;
    const magnusY = (this.spin.z * this.velocity.x - this.spin.x * this.velocity.z) * magnusCoeff;

    this.velocity.x += magnusX * dt;
    this.velocity.y += magnusY * dt;

    // Decay spin over time
    this.spin.x *= 0.97;
    this.spin.y *= 0.97;
    this.spin.z *= 0.97;

    // 2. Air Drag / Turf Friction
    if (this.position.z > 0.001 || this.velocity.z > 0.01) {
      this.isAirborne = true;
      this.velocity.x *= Math.pow(airDrag, dt * 60);
      this.velocity.y *= Math.pow(airDrag, dt * 60);
      this.velocity.z -= this.gravity * dt;
    } else {
      this.isAirborne = false;
      this.position.z = 0;
      this.velocity.x *= Math.pow(turfFriction, dt * 60);
      this.velocity.y *= Math.pow(turfFriction, dt * 60);
      if (Math.abs(this.velocity.z) > 0.8) {
        // Turf bounce with restitution
        this.velocity.z = -this.velocity.z * 0.52;
      } else {
        this.velocity.z = 0;
      }
    }

    // Velocity deadzone
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (!this.isAirborne && speed < 0.05) {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    // 3. Integrate position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z = Math.max(0, this.position.z + this.velocity.z * dt);
  }

  public kick(
    dirX: number,
    dirY: number,
    power: number,
    lift: number = 0,
    curve: number = 0,
    kickerId: string | null = null,
    team: 'blue' | 'red' | null = null
  ): void {
    const len = Math.hypot(dirX, dirY) || 1;
    const nx = dirX / len;
    const ny = dirY / len;

    this.velocity.x = nx * power;
    this.velocity.y = ny * power;
    this.velocity.z = lift;
    if (lift > 0) this.isAirborne = true;

    // Side spin for curve / finesse shots
    this.spin.z = curve * 45;
    this.lastKickerId = kickerId;
    this.lastKickTeam = team;
  }

  public checkGoalpostCollision(post: GoalpostDef): boolean {
    const dx = this.position.x - post.x;
    const dy = this.position.y - post.y;
    const dist2D = Math.hypot(dx, dy);
    const minDist = this.radius + post.radius;

    if (dist2D < minDist && this.position.z <= post.height) {
      // Elastic rebound off post
      const nx = dx / (dist2D || 1);
      const ny = dy / (dist2D || 1);

      // Separate ball
      this.position.x = post.x + nx * minDist;
      this.position.y = post.y + ny * minDist;

      // Reflect velocity: v' = v - 2*(v . n)*n
      const dot = this.velocity.x * nx + this.velocity.y * ny;
      if (dot < 0) {
        this.velocity.x = (this.velocity.x - 2 * dot * nx) * 0.78;
        this.velocity.y = (this.velocity.y - 2 * dot * ny) * 0.78;
      }
      return true;
    }
    return false;
  }
}
