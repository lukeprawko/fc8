/**
 * @file GameRoom.ts
 * @description Autorytatywny pokój gry jako Cloudflare Durable Object z WebSocket Hibernation API
 */

import { DurableObject } from 'cloudflare:workers';
import { D1Database } from '@cloudflare/workers-types';
import {
  ClientMessage,
  ServerMessage,
  MatchSyncPayload,
  SECURITY_LIMITS,
  REWARD_CONFIG
} from '@games/shared';
import { AuthoritativeMatchEngine } from '../game/physics';
import { validateSession } from '../auth/session';
import { isOriginAllowed } from '../middleware/security';

interface RoomEnv {
  DB: D1Database;
}

interface ClientAttachment {
  slot: number;
  userId: string | null;
  username: string;
  ip: string;
  msgCount: number;
  lastMsgReset: number;
  lastInputSeq: number;
  connectedAt: number;
}

export class GameRoom extends DurableObject<RoomEnv> {
  private engine: AuthoritativeMatchEngine;
  private roomCode: string = '';
  private isLoopRunning = false;
  private loopIntervalId: any = null;
  private lastBroadcastTime = 0;
  private serverSeq = 0;

  constructor(ctx: DurableObjectState, env: RoomEnv) {
    super(ctx, env);
    this.engine = new AuthoritativeMatchEngine();
  }

  /**
   * Punkt wejściowy żądania do Durable Object (Upgrade do WebSocket)
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Weryfikacja nagłówka Origin
    const origin = request.headers.get('Origin');
    if (origin && !isOriginAllowed(origin)) {
      return new Response('Brak uprawnień Origin (CORS Forbidden)', { status: 403 });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Wymagany protokół WebSocket', { status: 426 });
    }

    // Sprawdzenie limitu połączeń w pokoju
    const currentSockets = this.ctx.getWebSockets();
    if (currentSockets.length >= SECURITY_LIMITS.MAX_ROOM_CONNECTIONS) {
      return new Response('Pokój jest pełny', { status: 429 });
    }

    // Walidacja tokenu sesji gracza z D1
    const token = url.searchParams.get('token');
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
    let userId: string | null = null;
    let username = 'Gość';

    if (token) {
      const auth = await validateSession(this.env.DB, token);
      if (auth) {
        userId = auth.user.id;
        username = auth.user.username;
      }
    }

    // Utworzenie pary WebSocket
    const pair = new WebSocketPair();
    const [clientWs, serverWs] = Object.values(pair);

    // Przydział slotu w pokoju
    const assignedSlot = this.assignSlot(userId, username);

    const attachment: ClientAttachment = {
      slot: assignedSlot,
      userId,
      username,
      ip: clientIp,
      msgCount: 0,
      lastMsgReset: Date.now(),
      lastInputSeq: 0,
      connectedAt: Date.now()
    };

    // Rejestracja gniazda w systemie Hibernation API
    this.ctx.acceptWebSocket(serverWs, [`slot_${assignedSlot}`]);
    serverWs.serializeAttachment(attachment);

    // Wysłanie pakietu inicjalizacyjnego
    const initMsg: ServerMessage = {
      t: 'init',
      slot: assignedSlot,
      team: assignedSlot < 4 ? 'blue' : 'red',
      roomCode: url.searchParams.get('roomCode') || 'ROOM',
      tickRate: 60
    };
    serverWs.send(JSON.stringify(initMsg));

    // Uruchomienie autorytatywnej pętli fizyki gry jeśli jeszcze nie działa
    this.ensureGameLoop();

    return new Response(null, { status: 101, webSocket: clientWs });
  }

  /**
   * Obsługa wiadomości WebSocket (Hibernation API)
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') {
      ws.close(1003, 'Tylko wiadomości tekstowe JSON są dozwolone');
      return;
    }

    if (message.length > SECURITY_LIMITS.MAX_WS_PAYLOAD_BYTES) {
      ws.close(1009, 'Wiadomość przekracza dopuszczalny rozmiar');
      return;
    }

    const attachment = ws.deserializeAttachment() as ClientAttachment;
    if (!attachment) return;

    // Rate Limiting wiadomości na sekundę na gracza
    const now = Date.now();
    if (now - attachment.lastMsgReset > 1000) {
      attachment.msgCount = 1;
      attachment.lastMsgReset = now;
    } else {
      attachment.msgCount++;
      if (attachment.msgCount > SECURITY_LIMITS.MAX_WS_MESSAGES_PER_SEC) {
        ws.close(1008, 'Przekroczono limit wiadomości na sekundę (Rate Limit Violation)');
        return;
      }
    }

    try {
      const data = JSON.parse(message) as ClientMessage;

      if (data.t === 'input') {
        const inp = data.data;
        if (inp.seq <= attachment.lastInputSeq) return; // Odrzucenie duplikatów i przeterminowanych pakietów
        attachment.lastInputSeq = inp.seq;

        // Przekazanie bezpiecznego wejścia do silnika fizyki
        this.engine.applyPlayerInput(
          attachment.slot,
          inp.keys,
          inp.mx,
          inp.my,
          inp.chargePower,
          inp.chargeType
        );
      } else if (data.t === 'ping') {
        ws.send(JSON.stringify({ t: 'pong', clientTs: data.ts, serverTs: Date.now() }));
      } else if (data.t === 'ready') {
        if (this.engine.phase === 'KICKOFF_WAIT') {
          this.engine.phase = 'PLAYING';
        }
      }

      ws.serializeAttachment(attachment);
    } catch {
      // Ignorowanie zniekształconych pakietów
    }
  }

  /**
   * Obsługa rozłączenia gracza
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const attachment = ws.deserializeAttachment() as ClientAttachment;
    if (attachment) {
      // Przypisz sterowanie z powrotem botowi
      const player = this.engine.players.find(p => p.slot === attachment.slot);
      if (player) {
        player.isBot = true;
      }
    }

    // Jeżeli pokój jest pusty, zatrzymaj pętlę i zaplanuj zamknięcie
    const remaining = this.ctx.getWebSockets();
    if (remaining.length === 0) {
      this.stopGameLoop();
      await this.ctx.storage.setAlarm(Date.now() + SECURITY_LIMITS.ROOM_INACTIVITY_TIMEOUT_SEC * 1000);
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    ws.close(1011, 'Błąd połączenia');
  }

  /**
   * Alarm wywoływany przez system Cloudflare po bezczynności
   */
  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) {
      await this.ctx.storage.deleteAll();
    }
  }

  private assignSlot(userId: string | null, username: string): number {
    const activeSockets = this.ctx.getWebSockets();
    const occupiedSlots = new Set<number>();

    for (const s of activeSockets) {
      const att = s.deserializeAttachment() as ClientAttachment;
      if (att) occupiedSlots.add(att.slot);
    }

    // Wolny slot gracza z pola (np. 1 - DEF, 2 - MID, 3 - FWD niebieskich, potem czerwoni)
    for (let slot = 1; slot < 8; slot++) {
      if (!occupiedSlots.has(slot)) {
        const p = this.engine.players.find(pl => pl.slot === slot);
        if (p) p.isBot = false;
        return slot;
      }
    }

    return 0; // Slot 0 domyślny
  }

  private ensureGameLoop() {
    if (this.isLoopRunning) return;
    this.isLoopRunning = true;
    this.engine.phase = 'PLAYING';

    const tickMs = 1000 / 60; // 60Hz tick
    let lastTime = Date.now();

    const loop = async () => {
      if (!this.isLoopRunning) return;

      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Autorytatywny krok fizyki na serwerze
      this.engine.tick(dt);

      // Nadawanie stanu sieciowego w 30Hz
      if (now - this.lastBroadcastTime >= 33) {
        this.broadcastState();
        this.lastBroadcastTime = now;
      }

      // Sprawdzenie końca meczu
      if (this.engine.phase === 'MATCH_OVER') {
        await this.handleMatchEnd();
        return;
      }

      setTimeout(loop, tickMs);
    };

    setTimeout(loop, tickMs);
  }

  private stopGameLoop() {
    this.isLoopRunning = false;
  }

  private broadcastState() {
    this.serverSeq++;
    const state: MatchSyncPayload = {
      serverSeq: this.serverSeq,
      tm: Math.max(0, Math.round(this.engine.timeRemaining * 10) / 10),
      phase: this.engine.phase,
      sb: this.engine.scoreBlue,
      sr: this.engine.scoreRed,
      ball: {
        bx: Math.round(this.engine.ball.x * 10) / 10,
        by: Math.round(this.engine.ball.y * 10) / 10,
        bz: Math.round(this.engine.ball.z * 10) / 10,
        bvx: Math.round(this.engine.ball.vx * 100) / 100,
        bvy: Math.round(this.engine.ball.vy * 100) / 100,
        rot: Math.round(this.engine.ball.rotation * 100) / 100,
        pshot: this.engine.ball.isPowerShot,
        fshot: this.engine.ball.isFinesseShot,
        ipass: this.engine.ball.isIncisivePass,
        ownerIdx: this.engine.ball.owner ? this.engine.ball.owner.idx : -1,
        swayL: Math.round(this.engine.ball.netSwayLeft),
        swayR: Math.round(this.engine.ball.netSwayRight)
      },
      pls: this.engine.players.map(p => ({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        vx: Math.round(p.vx * 100) / 100,
        vy: Math.round(p.vy * 100) / 100,
        a: Math.round(p.angle * 100) / 100,
        st: Math.round(p.stamina),
        m: p.isMoving,
        sp: p.isSprinting,
        k: p.kickAnim,
        t: p.slideAnim
      })),
      ctrlIdx: [0, 1, 2, 3],
      ref: {
        x: Math.round(this.engine.referee.x),
        y: Math.round(this.engine.referee.y),
        a: Math.round(this.engine.referee.a * 100) / 100,
        m: this.engine.referee.m,
        w: this.engine.referee.w,
        ct: this.engine.referee.ct,
        cc: this.engine.referee.cc
      },
      ban: {
        t: Math.round(this.engine.celebrationTimer * 10) / 10,
        txt: this.engine.bannerText,
        sub: this.engine.bannerSub,
        col: this.engine.bannerCol
      },
      sp: null,
      stats: this.engine.stats
    };

    const payload = JSON.stringify({ t: 'sync', state });
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch {}
    }
  }

  /**
   * Zakończenie meczu i autorytatywny zapis nagród w bazie D1
   */
  private async handleMatchEnd() {
    this.stopGameLoop();
    const isBlueWin = this.engine.scoreBlue > this.engine.scoreRed;
    const isDraw = this.engine.scoreBlue === this.engine.scoreRed;

    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      const att = ws.deserializeAttachment() as ClientAttachment;
      if (att && att.userId) {
        const isUserBlue = att.slot < 4;
        const won = (isUserBlue && isBlueWin) || (!isUserBlue && !isBlueWin && !isDraw);
        const coinsEarned = won
          ? REWARD_CONFIG.MATCH_WIN_COINS
          : (isDraw ? REWARD_CONFIG.MATCH_DRAW_COINS : REWARD_CONFIG.MATCH_LOSS_COINS);

        // Bezpośredni, autorytatywny zapis do D1
        await this.env.DB.prepare(`
          UPDATE users
          SET coins = coins + ?,
              matches_played = matches_played + 1,
              matches_won = matches_won + ?
          WHERE id = ?
        `).bind(coinsEarned, won ? 1 : 0, att.userId).run();

        ws.send(JSON.stringify({
          t: 'event',
          event: 'match_end',
          details: {
            won,
            isDraw,
            coinsEarned,
            scoreBlue: this.engine.scoreBlue,
            scoreRed: this.engine.scoreRed
          }
        }));
      }
    }
  }
}
