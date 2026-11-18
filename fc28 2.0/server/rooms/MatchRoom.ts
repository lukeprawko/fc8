/**
 * CYBERFC 28 — Authoritative Multiplayer Match Room
 * Manages game state, physics validation, client prediction reconciliation, and network broadcasts.
 */

export interface NetworkPlayerState {
  id: string;
  slotIdx: number;
  team: 'blue' | 'red';
  role: string;
  x: number;
  y: number;
  angle: number;
  stamina: number;
  isSprinting: boolean;
  isShielding: boolean;
  isSliding: boolean;
}

export interface NetworkBallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ownerSlot: number; // -1 if free ball
}

export interface MatchRoomState {
  roomId: string;
  phase: 'WAITING' | 'KICKOFF' | 'PLAYING' | 'GOAL_PAUSE' | 'ENDED';
  scoreBlue: number;
  scoreRed: number;
  timeRemaining: number;
  ball: NetworkBallState;
  players: NetworkPlayerState[];
}

export class MatchRoom {
  public state: MatchRoomState;
  private intervalId: any = null;
  public clients: Map<string, any> = new Map();

  constructor(roomId: string) {
    this.state = {
      roomId,
      phase: 'WAITING',
      scoreBlue: 0,
      scoreRed: 0,
      timeRemaining: 180, // 3 minutes
      ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ownerSlot: -1 },
      players: []
    };
  }

  public addClient(clientId: string, socket: any): number {
    if (this.clients.size >= 4) return -1;
    const slotIdx = this.clients.size;
    this.clients.set(clientId, { socket, slotIdx });

    const team = slotIdx < 2 ? 'blue' : 'red';
    this.state.players.push({
      id: clientId,
      slotIdx,
      team,
      role: slotIdx === 0 ? 'FWD' : 'MID',
      x: team === 'blue' ? -10 : 10,
      y: 0,
      angle: team === 'blue' ? 0 : Math.PI,
      stamina: 100,
      isSprinting: false,
      isShielding: false,
      isSliding: false
    });

    if (this.clients.size >= 2 && this.state.phase === 'WAITING') {
      this.startMatch();
    }
    return slotIdx;
  }

  public removeClient(clientId: string): void {
    this.clients.delete(clientId);
    this.state.players = this.state.players.filter(p => p.id !== clientId);
    if (this.clients.size === 0) {
      this.stop();
    }
  }

  public handleClientInput(clientId: string, input: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const player = this.state.players.find(p => p.slotIdx === client.slotIdx);
    if (!player) return;

    if (input.keys) {
      let dx = 0, dy = 0;
      if (input.keys.KeyW) dy -= 1;
      if (input.keys.KeyS) dy += 1;
      if (input.keys.KeyA) dx -= 1;
      if (input.keys.KeyD) dx += 1;

      const len = Math.hypot(dx, dy);
      if (len > 0.05) {
        const speed = input.keys.Shift ? 8.5 : 6.0;
        player.x += (dx / len) * speed * (1 / 60);
        player.y += (dy / len) * speed * (1 / 60);
        player.angle = Math.atan2(dy, dx);
        player.isSprinting = !!input.keys.Shift;
      } else {
        player.isSprinting = false;
      }
    }
  }

  public startMatch(): void {
    this.state.phase = 'PLAYING';
    const tickRate = 1000 / 60; // 60 Hz authoritative server tick

    this.intervalId = setInterval(() => {
      this.tick(1 / 60);
    }, tickRate);
  }

  private tick(dt: number): void {
    if (this.state.phase !== 'PLAYING') return;

    // 1. Authoritative ball movement
    this.state.ball.x += this.state.ball.vx * dt;
    this.state.ball.y += this.state.ball.vy * dt;
    this.state.ball.vx *= 0.98;
    this.state.ball.vy *= 0.98;

    // 2. Goal check (Goal lines at +/- 52.5m)
    if (this.state.ball.x > 52.5 && Math.abs(this.state.ball.y) < 3.66) {
      this.onGoal('blue');
    } else if (this.state.ball.x < -52.5 && Math.abs(this.state.ball.y) < 3.66) {
      this.onGoal('red');
    }

    // 3. Match timer countdown
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - dt);
    if (this.state.timeRemaining <= 0) {
      this.state.phase = 'ENDED';
      this.broadcast({ t: 'matchEnded', winner: this.state.scoreBlue > this.state.scoreRed ? 'blue' : 'red' });
      this.stop();
    }
  }

  private onGoal(scoringTeam: 'blue' | 'red'): void {
    if (scoringTeam === 'blue') this.state.scoreBlue++;
    else this.state.scoreRed++;

    this.state.phase = 'GOAL_PAUSE';
    this.broadcast({
      t: 'goal',
      team: scoringTeam,
      scoreBlue: this.state.scoreBlue,
      scoreRed: this.state.scoreRed
    });

    // Reset ball to center after 2 seconds
    setTimeout(() => {
      this.state.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ownerSlot: -1 };
      this.state.phase = 'PLAYING';
      this.broadcast({ t: 'kickoff' });
    }, 2000);
  }

  public broadcast(message: any): void {
    const serialized = JSON.stringify(message);
    this.clients.forEach(client => {
      try {
        if (client.socket && client.socket.readyState === 1) {
          client.socket.send(serialized);
        }
      } catch (e) {}
    });
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
