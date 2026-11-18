import { describe, it, expect } from 'vitest';
import { MatchRoom } from '../../server/rooms/MatchRoom';
import { Matchmaker } from '../../server/matchmaking/Matchmaker';

describe('Multiplayer & Authoritative Server Systems', () => {
  it('MatchRoom should assign slots, teams, and track players', () => {
    const room = new MatchRoom('TEST_ROOM_1');
    const mockSocket1 = { readyState: 1, send: () => {} };
    const mockSocket2 = { readyState: 1, send: () => {} };

    const slot1 = room.addClient('client_1', mockSocket1);
    expect(slot1).toBe(0);
    expect(room.state.players[0].team).toBe('blue');

    const slot2 = room.addClient('client_2', mockSocket2);
    expect(slot2).toBe(1);
    expect(room.state.players[1].team).toBe('blue');
    expect(room.state.phase).toBe('PLAYING');

    room.stop();
  });

  it('MatchRoom should process authoritative movement inputs', () => {
    const room = new MatchRoom('TEST_ROOM_2');
    const mockSocket = { readyState: 1, send: () => {} };
    room.addClient('client_alpha', mockSocket);

    const initialX = room.state.players[0].x;
    room.handleClientInput('client_alpha', {
      keys: { KeyD: true }
    });

    expect(room.state.players[0].x).toBeGreaterThan(initialX);
    room.stop();
  });

  it('Matchmaker should pair players and generate match rooms', () => {
    const matchmaker = new Matchmaker();
    let p1Matched = false;
    let p2Matched = false;

    const mockSocket1 = {
      readyState: 1,
      send: (msg: string) => {
        if (msg.includes('matched')) p1Matched = true;
      }
    };

    const mockSocket2 = {
      readyState: 1,
      send: (msg: string) => {
        if (msg.includes('matched')) p2Matched = true;
      }
    };

    matchmaker.enqueue({
      clientId: 'p1',
      username: 'Lewy',
      rating: 1200,
      mode: '1v1',
      socket: mockSocket1
    });

    const matchRoomId = matchmaker.enqueue({
      clientId: 'p2',
      username: 'Cr7',
      rating: 1210,
      mode: '1v1',
      socket: mockSocket2
    });

    expect(matchRoomId).toBeDefined();
    expect(p1Matched).toBe(true);
    expect(p2Matched).toBe(true);
  });
});
