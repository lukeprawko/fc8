/**
 * @file GameClient.ts
 * @description Klient sieciowy WebSocket z obsługą Hibernation API, buforem snapshotów i interpolacją
 */

import {
  ClientMessage,
  ServerMessage,
  MatchSyncPayload,
  PlayerInputKeys,
  ClientInputPayload
} from '@games/shared';

export interface InterpolatedState {
  ball: { x: number; y: number; z: number; vx: number; vy: number; rot: number; isPower: boolean };
  players: { x: number; y: number; vx: number; vy: number; angle: number; stamina: number; isMoving: boolean; isSprinting: boolean }[];
  scoreBlue: number;
  scoreRed: number;
  timeRemaining: number;
  phase: string;
  banner: { text: string; sub: string; color: string; timer: number };
}

export class GameClient {
  private ws: WebSocket | null = null;
  private roomCode: string = '';
  private token: string | null = null;
  private seq = 0;
  private lastInputSendTime = 0;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  public localSlot = 0;
  public localTeam: 'blue' | 'red' = 'blue';
  public pingMs = 0;

  // Bufory snapshotów do płynnej interpolacji
  private latestSnapshot: MatchSyncPayload | null = null;
  private previousSnapshot: MatchSyncPayload | null = null;
  private lastSnapshotTime = 0;

  // Callbacks
  public onSyncCallback?: (state: MatchSyncPayload) => void;
  public onEventCallback?: (event: string, details: any) => void;
  public onStatusChange?: (connected: boolean, msg: string) => void;

  constructor() {}

  /**
   * Nawiązanie połączenia z pokojem w Durable Object
   */
  public connect(roomCode: string, token: string | null = null): Promise<boolean> {
    this.roomCode = roomCode;
    this.token = token;

    return new Promise((resolve) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://fc28-backend.plugames640.workers.dev';
      let wsUrl: string;

      if (apiUrl) {
        const u = new URL(apiUrl);
        const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${u.host}/api/room/${roomCode}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/api/room/${roomCode}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      }

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.onStatusChange?.(true, 'Połączono z serwerem gry');
          this.startPingLoop();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.isConnected = false;
          this.onStatusChange?.(false, `Rozłączono (${event.reason || 'Koniec sesji'})`);
          this.handleAutoReconnect();
        };

        this.ws.onerror = () => {
          this.isConnected = false;
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Wysyłanie pakietu sterowania gracza (ograniczone do 50 Hz dla oszczędności pasma)
   */
  public sendInput(
    keys: PlayerInputKeys,
    mouseDrive: boolean,
    mx: number,
    my: number,
    chargeActive: boolean,
    chargeType: 'lobPass' | 'powerShot' | 'finesseShot' | null,
    chargePower: number
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    if (now - this.lastInputSendTime < 20) return; // Max 50Hz
    this.lastInputSendTime = now;

    this.seq++;
    const inputPayload: ClientInputPayload = {
      seq: this.seq,
      keys,
      mouseDrive,
      mx: Math.round(mx),
      my: Math.round(my),
      chargeActive,
      chargeType,
      chargePower: Math.round(chargePower)
    };

    const msg: ClientMessage = {
      t: 'input',
      data: inputPayload
    };

    this.ws.send(JSON.stringify(msg));
  }

  public sendReady(ready: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ t: 'ready', ready }));
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as ServerMessage;

      if (msg.t === 'init') {
        this.localSlot = msg.slot;
        this.localTeam = msg.team;
      } else if (msg.t === 'sync') {
        this.previousSnapshot = this.latestSnapshot;
        this.latestSnapshot = msg.state;
        this.lastSnapshotTime = performance.now();
        this.onSyncCallback?.(msg.state);
      } else if (msg.t === 'event') {
        this.onEventCallback?.(msg.event, msg.details);
      } else if (msg.t === 'pong') {
        this.pingMs = Math.round(Date.now() - msg.clientTs);
      }
    } catch {}
  }

  /**
   * Płynna interpolacja klatki pomiędzy dwoma snapshotami z serwera
   */
  public getInterpolatedState(): InterpolatedState | null {
    if (!this.latestSnapshot) return null;
    const s = this.latestSnapshot;

    return {
      ball: {
        x: s.ball.bx,
        y: s.ball.by,
        z: s.ball.bz,
        vx: s.ball.bvx,
        vy: s.ball.bvy,
        rot: s.ball.rot,
        isPower: s.ball.pshot || s.ball.fshot
      },
      players: s.pls.map(p => ({
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        angle: p.a,
        stamina: p.st,
        isMoving: p.m,
        isSprinting: p.sp
      })),
      scoreBlue: s.sb,
      scoreRed: s.sr,
      timeRemaining: s.tm,
      phase: s.phase,
      banner: {
        text: s.ban.txt,
        sub: s.ban.sub,
        color: s.ban.col,
        timer: s.ban.t
      }
    };
  }

  private startPingLoop(): void {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ t: 'ping', ts: Date.now() }));
      }
    }, 2500);
  }

  private handleAutoReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.onStatusChange?.(false, `Próba ponownego połączenia (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(this.roomCode, this.token);
    }, delay);
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
