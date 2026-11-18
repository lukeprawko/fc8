/**
 * CYBERFC 28 — Matchmaking Queue Manager
 * Pairs players for 1v1 and 2v2 multiplayer rooms.
 */

import { MatchRoom } from '../rooms/MatchRoom';

export interface MatchmakingRequest {
  clientId: string;
  username: string;
  rating: number;
  mode: '1v1' | '2v2';
  socket: any;
}

export class Matchmaker {
  private queue1v1: MatchmakingRequest[] = [];
  private rooms: Map<string, MatchRoom> = new Map();

  public enqueue(req: MatchmakingRequest): string | null {
    if (req.mode === '1v1') {
      this.queue1v1.push(req);
      return this.check1v1Match();
    }
    return null;
  }

  public dequeue(clientId: string): void {
    this.queue1v1 = this.queue1v1.filter(r => r.clientId !== clientId);
  }

  private check1v1Match(): string | null {
    if (this.queue1v1.length >= 2) {
      const p1 = this.queue1v1.shift()!;
      const p2 = this.queue1v1.shift()!;

      const roomId = 'room_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const room = new MatchRoom(roomId);
      this.rooms.set(roomId, room);

      const slot1 = room.addClient(p1.clientId, p1.socket);
      const slot2 = room.addClient(p2.clientId, p2.socket);

      // Notify clients
      p1.socket.send(JSON.stringify({ t: 'matched', roomId, slotIdx: slot1, opponent: p2.username }));
      p2.socket.send(JSON.stringify({ t: 'matched', roomId, slotIdx: slot2, opponent: p1.username }));

      return roomId;
    }
    return null;
  }

  public getRoom(roomId: string): MatchRoom | undefined {
    return this.rooms.get(roomId);
  }
}
