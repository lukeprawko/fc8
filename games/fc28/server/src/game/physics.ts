/**
 * @file physics.ts
 * @description Autorytatywny silnik fizyki 60Hz: kolizje, ruch piłki, AI botów i detekcja goli
 */

import { GAME_CONSTANTS } from '@games/shared';
import { PlayerCard } from '@games/shared';
import { SERVER_PLAYERS_DB } from './playersDb';

export interface ServerPlayer {
  idx: number;
  slot: number;
  team: 'blue' | 'red';
  role: 'GK' | 'DEF' | 'MID' | 'FWD';
  card: PlayerCard;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  stamina: number;
  isMoving: boolean;
  isSprinting: boolean;
  kickAnim: boolean;
  slideAnim: boolean;
  isBot: boolean;
  botTier: 'easy' | 'medium' | 'hard';
}

export interface ServerBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotation: number;
  isPowerShot: boolean;
  isFinesseShot: boolean;
  isIncisivePass: boolean;
  owner: ServerPlayer | null;
  netSwayLeft: number;
  netSwayRight: number;
  lastTouchTeam: 'blue' | 'red' | null;
}

export class AuthoritativeMatchEngine {
  public ball: ServerBall;
  public players: ServerPlayer[] = [];
  public scoreBlue = 0;
  public scoreRed = 0;
  public timeRemaining = GAME_CONSTANTS.MATCH_DURATION_SECONDS;
  public phase: 'LOBBY' | 'KICKOFF_WAIT' | 'PLAYING' | 'GOAL_CELEBRATION' | 'HALF_TIME' | 'MATCH_OVER' = 'KICKOFF_WAIT';
  public celebrationTimer = 0;
  public bannerText = '';
  public bannerSub = '';
  public bannerCol = '#00f0ff';
  public referee = { x: 1125, y: 625, a: 0, m: false, w: 0, ct: 0, cc: null as 'yellow' | 'red' | null };
  public stats = { shotsBlue: 0, shotsRed: 0, savesBlue: 0, savesRed: 0, foulsBlue: 0, foulsRed: 0 };

  constructor() {
    this.ball = {
      x: GAME_CONSTANTS.WORLD_WIDTH / 2,
      y: GAME_CONSTANTS.WORLD_HEIGHT / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rotation: 0,
      isPowerShot: false,
      isFinesseShot: false,
      isIncisivePass: false,
      owner: null,
      netSwayLeft: 0,
      netSwayRight: 0,
      lastTouchTeam: null
    };
    this.initPlayers();
  }

  public initPlayers() {
    this.players = [];
    const roles: ('GK' | 'DEF' | 'MID' | 'FWD')[] = ['GK', 'DEF', 'MID', 'FWD'];

    // Drużyna Niebieska (Lewa strona)
    for (let i = 0; i < 4; i++) {
      const card = SERVER_PLAYERS_DB.find(c => c.role === roles[i]) || SERVER_PLAYERS_DB[0];
      const startX = 250 + i * 220;
      const startY = GAME_CONSTANTS.WORLD_HEIGHT / 2 + (i % 2 === 0 ? -40 : 40);
      this.players.push({
        idx: i,
        slot: i,
        team: 'blue',
        role: roles[i],
        card,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        angle: 0,
        stamina: 100,
        isMoving: false,
        isSprinting: false,
        kickAnim: false,
        slideAnim: false,
        isBot: true,
        botTier: 'medium'
      });
    }

    // Drużyna Czerwona (Prawa strona)
    for (let i = 0; i < 4; i++) {
      const card = SERVER_PLAYERS_DB.find(c => c.role === roles[i]) || SERVER_PLAYERS_DB[0];
      const startX = GAME_CONSTANTS.WORLD_WIDTH - (250 + i * 220);
      const startY = GAME_CONSTANTS.WORLD_HEIGHT / 2 + (i % 2 === 0 ? -40 : 40);
      this.players.push({
        idx: 4 + i,
        slot: 4 + i,
        team: 'red',
        role: roles[i],
        card,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        angle: Math.PI,
        stamina: 100,
        isMoving: false,
        isSprinting: false,
        kickAnim: false,
        slideAnim: false,
        isBot: true,
        botTier: 'medium'
      });
    }
  }

  /**
   * Krok pętli fizyki (60Hz) wykonywany autorytatywnie na serwerze
   */
  public tick(dt = 1 / 60) {
    if (this.phase === 'GOAL_CELEBRATION') {
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0) {
        this.resetAfterGoal();
      }
      return;
    }

    if (this.phase !== 'PLAYING') return;

    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.phase = 'MATCH_OVER';
      return;
    }

    // Aktualizacja piłki
    this.updateBall(dt);

    // Aktualizacja botów AI
    this.updateBots(dt);

    // Tarcie i ruch graczy
    for (const p of this.players) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.88;
      p.vy *= 0.88;

      // Regeneracja staminy gdy gracz nie sprintuje
      if (p.isSprinting && p.isMoving) {
        p.stamina = Math.max(0, p.stamina - dt * 25);
      } else {
        p.stamina = Math.min(100, p.stamina + dt * 18);
      }

      // Ograniczenia boiska dla zawodników
      p.x = Math.max(GAME_CONSTANTS.MARGIN_X, Math.min(GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X, p.x));
      p.y = Math.max(GAME_CONSTANTS.MARGIN_Y, Math.min(GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.MARGIN_Y, p.y));
    }

    // Interakcja zawodnik-piłka
    this.checkBallInteractions();

    // Detekcja gola
    this.checkGoal();
  }

  private updateBall(dt: number) {
    if (this.ball.owner) {
      const p = this.ball.owner;
      const dist = 22;
      this.ball.x = p.x + Math.cos(p.angle) * dist;
      this.ball.y = p.y + Math.sin(p.angle) * dist;
      this.ball.vx = p.vx;
      this.ball.vy = p.vy;
      this.ball.z = 0;
      return;
    }

    // Ruch swobodny
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    this.ball.z += this.ball.vz;

    // Tarcie murawy i grawitacja
    if (this.ball.z > 0) {
      this.ball.vz -= 0.65; // Grawitacja
      this.ball.vx *= 0.985;
      this.ball.vy *= 0.985;
    } else {
      this.ball.z = 0;
      this.ball.vz = 0;
      this.ball.vx *= 0.965; // Tarcie trawy
      this.ball.vy *= 0.965;
    }

    // Odbicia od linii bocznych
    const top = GAME_CONSTANTS.MARGIN_Y;
    const bottom = GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.MARGIN_Y;
    if (this.ball.y < top) { this.ball.y = top; this.ball.vy *= -0.7; }
    if (this.ball.y > bottom) { this.ball.y = bottom; this.ball.vy *= -0.7; }

    // Odbicia od linii końcowych (poza światłem bramki)
    const goalTop = (GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.GOAL_HEIGHT) / 2;
    const goalBottom = goalTop + GAME_CONSTANTS.GOAL_HEIGHT;

    const leftX = GAME_CONSTANTS.MARGIN_X;
    const rightX = GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X;

    if (this.ball.x < leftX && (this.ball.y < goalTop || this.ball.y > goalBottom)) {
      this.ball.x = leftX;
      this.ball.vx *= -0.7;
    }
    if (this.ball.x > rightX && (this.ball.y < goalTop || this.ball.y > goalBottom)) {
      this.ball.x = rightX;
      this.ball.vx *= -0.7;
    }

    // Wygaszanie siatki
    this.ball.netSwayLeft *= 0.88;
    this.ball.netSwayRight *= 0.88;
  }

  private checkBallInteractions() {
    if (this.ball.owner) return;

    for (const p of this.players) {
      const dx = this.ball.x - p.x;
      const dy = this.ball.y - p.y;
      const d = Math.hypot(dx, dy);

      if (d < 35 && this.ball.z < 25) {
        // Przejęcie piłki
        this.ball.owner = p;
        this.ball.lastTouchTeam = p.team;
        this.ball.isPowerShot = false;
        this.ball.isFinesseShot = false;
        break;
      }
    }
  }

  private checkGoal() {
    const goalTop = (GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.GOAL_HEIGHT) / 2;
    const goalBottom = goalTop + GAME_CONSTANTS.GOAL_HEIGHT;

    // Gol dla Czerwonych (piłka w lewej bramce)
    if (this.ball.x < GAME_CONSTANTS.MARGIN_X - 25 && this.ball.y >= goalTop && this.ball.y <= goalBottom) {
      this.scoreRed++;
      this.stats.shotsRed++;
      this.triggerGoal('red');
    }
    // Gol dla Niebieskich (piłka w prawej bramce)
    else if (this.ball.x > GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X + 25 && this.ball.y >= goalTop && this.ball.y <= goalBottom) {
      this.scoreBlue++;
      this.stats.shotsBlue++;
      this.triggerGoal('blue');
    }
  }

  private triggerGoal(team: 'blue' | 'red') {
    this.phase = 'GOAL_CELEBRATION';
    this.celebrationTimer = 3.5;
    this.bannerText = 'GOOOOL!';
    this.bannerSub = team === 'blue' ? 'CYBER NIEBIESCY TRAFIAJĄ!' : 'CYBER CZERWONI TRAFIAJĄ!';
    this.bannerCol = team === 'blue' ? '#00f0ff' : '#ff0055';
    this.ball.owner = null;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  private resetAfterGoal() {
    this.ball.x = GAME_CONSTANTS.WORLD_WIDTH / 2;
    this.ball.y = GAME_CONSTANTS.WORLD_HEIGHT / 2;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.owner = null;
    this.phase = 'PLAYING';
    this.initPlayers();
  }

  private updateBots(dt: number) {
    for (const p of this.players) {
      if (!p.isBot) continue;

      const targetX = this.ball.owner === p
        ? (p.team === 'blue' ? GAME_CONSTANTS.WORLD_WIDTH - 200 : 200)
        : this.ball.x;
      const targetY = this.ball.owner === p ? GAME_CONSTANTS.WORLD_HEIGHT / 2 : this.ball.y;

      const dx = targetX - p.x;
      const dy = targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 15) {
        p.angle = Math.atan2(dy, dx);
        const speed = (p.card.pac / 100) * 5.5;
        p.vx = Math.cos(p.angle) * speed;
        p.vy = Math.sin(p.angle) * speed;
        p.isMoving = true;
      } else {
        p.isMoving = false;
      }

      // Prosta decyzja o strzale botów
      if (this.ball.owner === p) {
        const goalDist = p.team === 'blue' ? GAME_CONSTANTS.WORLD_WIDTH - p.x : p.x;
        if (goalDist < 450) {
          // Strzał na bramkę
          this.ball.owner = null;
          const shotSpeed = (p.card.sho / 100) * 22 + 8;
          this.ball.vx = Math.cos(p.angle) * shotSpeed;
          this.ball.vy = Math.sin(p.angle) * shotSpeed;
          this.ball.vz = 5;
          p.kickAnim = true;
          if (p.team === 'blue') this.stats.shotsBlue++;
          else this.stats.shotsRed++;
        }
      }
    }
  }

  /**
   * Zastosowanie bezpiecznego wejścia gracza
   */
  public applyPlayerInput(slot: number, keys: any, mx: number, my: number, chargePower: number, chargeType: string | null) {
    const p = this.players.find(pl => pl.slot === slot);
    if (!p) return;

    p.isBot = false;
    let moveX = 0;
    let moveY = 0;

    if (keys.KeyW) moveY -= 1;
    if (keys.KeyS) moveY += 1;
    if (keys.KeyA) moveX -= 1;
    if (keys.KeyD) moveX += 1;

    const isMoving = moveX !== 0 || moveY !== 0;
    p.isMoving = isMoving;

    if (isMoving) {
      const len = Math.hypot(moveX, moveY);
      moveX /= len;
      moveY /= len;

      p.isSprinting = keys.Shift && p.stamina > 10;
      const baseSpeed = (p.card.pac / 100) * 5.8;
      const speed = p.isSprinting ? baseSpeed * 1.45 : baseSpeed;

      p.vx = moveX * speed;
      p.vy = moveY * speed;
      p.angle = Math.atan2(moveY, moveX);
    }

    // Wykonanie strzału / podania
    if (keys.Space && this.ball.owner === p) {
      this.ball.owner = null;
      const powerMultiplier = 1 + (chargePower / 100) * 0.8;
      const shotSpeed = (p.card.sho / 100) * 18 * powerMultiplier;

      this.ball.vx = Math.cos(p.angle) * shotSpeed;
      this.ball.vy = Math.sin(p.angle) * shotSpeed;
      this.ball.vz = chargeType === 'lobPass' ? 9 : 3;
      p.kickAnim = true;
      if (p.team === 'blue') this.stats.shotsBlue++;
      else this.stats.shotsRed++;
    }
  }
}
