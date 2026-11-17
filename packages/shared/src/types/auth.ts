/**
 * @file auth.ts
 * @description Wspólne definicje typów autoryzacji, sesji i weryfikacji tożsamości
 */

export interface UserSummary {
  id: string;
  username: string;
  coins: number;
  packsOpened: number;
  matchesPlayed: number;
  matchesWon: number;
  createdAt: number;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  username: string;
  expiresAt: number;
  tokenHash: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  turnstileToken: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  turnstileToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: UserSummary;
}

export interface TurnstileVerificationResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
}
