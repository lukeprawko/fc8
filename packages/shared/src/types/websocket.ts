/**
 * @file websocket.ts
 * @description Protokół komunikacji WebSocket między klientem a Durable Object (GameRoom)
 */

import { SquadLineup, MatchStats } from './fc28';

export interface PlayerInputKeys {
  KeyW: boolean;
  KeyS: boolean;
  KeyA: boolean;
  KeyD: boolean;
  Shift: boolean;
  Space: boolean;
}

export interface ClientInputPayload {
  seq: number;
  keys: PlayerInputKeys;
  mouseDrive: boolean;
  mx: number;
  my: number;
  chargeActive: boolean;
  chargeType: 'lobPass' | 'powerShot' | 'finesseShot' | null;
  chargePower: number;
}

export type ClientMessage =
  | { t: 'join'; roomCode: string; token?: string; lineup?: SquadLineup; clientVersion: string }
  | { t: 'input'; data: ClientInputPayload }
  | { t: 'ping'; ts: number }
  | { t: 'ready'; ready: boolean }
  | { t: 'reconnect'; token: string; lastAckSeq: number };

export interface NetworkPlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  st: number; // Kondycja (stamina 0-100)
  m: boolean; // Czy się porusza
  sp: boolean; // Sprint
  k: boolean; // Animacja strzału / podania
  t: boolean; // Animacja wślizgu
}

export interface NetworkBallState {
  bx: number;
  by: number;
  bz: number;
  bvx: number;
  bvy: number;
  rot: number;
  pshot: boolean;
  fshot: boolean;
  ipass: boolean;
  ownerIdx: number; // -1 brak, 0-7 indeks zawodnika
  swayL: number;
  swayR: number;
}

export interface NetworkRefereeState {
  x: number;
  y: number;
  a: number;
  m: boolean;
  w: number; // Whistle timer
  ct: number; // Card timer
  cc: 'yellow' | 'red' | null;
}

export interface NetworkBannerState {
  t: number;
  txt: string;
  sub: string;
  col: string;
}

export interface NetworkSetPieceState {
  type: 'kickoff' | 'corner' | 'throwin' | 'goalkick' | 'penalty' | 'freekick';
  team: 'blue' | 'red';
  x: number;
  y: number;
}

export interface MatchSyncPayload {
  serverSeq: number;
  tm: number; // Pozostały czas w sekundach
  phase: 'LOBBY' | 'KICKOFF_WAIT' | 'PLAYING' | 'GOAL_CELEBRATION' | 'HALF_TIME' | 'MATCH_OVER';
  sb: number; // Wynik niebieskich
  sr: number; // Wynik czerwonych
  ball: NetworkBallState;
  pls: NetworkPlayerState[];
  ctrlIdx: number[]; // Który zawodnik jest aktualnie kontrolowany przez dany slot
  ref: NetworkRefereeState;
  ban: NetworkBannerState;
  sp: NetworkSetPieceState | null;
  stats: MatchStats;
}

export interface LobbySlotInfo {
  slot: number;
  userId: string | null;
  nick: string;
  isBot: boolean;
  ready: boolean;
  team: 'blue' | 'red';
  lineup: SquadLineup | null;
}

export type ServerMessage =
  | { t: 'init'; slot: number; team: 'blue' | 'red'; roomCode: string; tickRate: number }
  | { t: 'lobby'; slots: (LobbySlotInfo | null)[] }
  | { t: 'sync'; state: MatchSyncPayload }
  | { t: 'event'; event: 'goal' | 'whistle' | 'card' | 'match_end'; details?: any }
  | { t: 'pong'; clientTs: number; serverTs: number }
  | { t: 'error'; code: string; message: string };
