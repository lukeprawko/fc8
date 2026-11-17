/**
 * @file session.ts
 * @description Obsługa bezpiecznych sesji z ciasteczkami HttpOnly + Secure + SameSite
 */

import { D1Database } from '@cloudflare/workers-types';
import { UserSummary } from '@games/shared';
import { generateSecureToken, hashToken } from './crypto';
import { SECURITY_LIMITS } from '@games/shared';

const COOKIE_NAME = 'fc28_session';

/**
 * Tworzy nową sesję i zapisuje jej hash w D1
 */
export async function createSession(
  db: D1Database,
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<{ token: string; expiresAt: number }> {
  const token = generateSecureToken(32);
  const tokenHash = await hashToken(token);
  const sessionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SECURITY_LIMITS.SESSION_LIFETIME_SECONDS;

  await db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent, revoked, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).bind(sessionId, userId, tokenHash, expiresAt, ipAddress, userAgent, now).run();

  return { token, expiresAt };
}

/**
 * Weryfikuje sesję z tokena i pobiera dane użytkownika
 */
export async function validateSession(
  db: D1Database,
  token: string
): Promise<{ user: UserSummary; sessionId: string } | null> {
  if (!token || token.length < 32) return null;
  const tokenHash = await hashToken(token);
  const now = Math.floor(Date.now() / 1000);

  const row = await db.prepare(`
    SELECT s.id as session_id, s.expires_at, s.revoked,
           u.id as user_id, u.username, u.coins, u.packs_opened, u.matches_played, u.matches_won, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.revoked = 0 AND s.expires_at > ?
  `).bind(tokenHash, now).first<{
    session_id: string;
    expires_at: number;
    revoked: number;
    user_id: string;
    username: string;
    coins: number;
    packs_opened: number;
    matches_played: number;
    matches_won: number;
    created_at: number;
  }>();

  if (!row) return null;

  return {
    sessionId: row.session_id,
    user: {
      id: row.user_id,
      username: row.username,
      coins: row.coins,
      packsOpened: row.packs_opened,
      matchesPlayed: row.matches_played,
      matchesWon: row.matches_won,
      createdAt: row.created_at
    }
  };
}

/**
 * Unieważnia wskazaną sesję (wylogowanie)
 */
export async function revokeSession(db: D1Database, token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  await db.prepare(`UPDATE sessions SET revoked = 1 WHERE token_hash = ?`).bind(tokenHash).run();
}

/**
 * Pobiera token sesji z nagłówka Cookie lub Authorization Bearer
 */
export function extractSessionToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const c of cookies) {
    const [name, val] = c.trim().split('=');
    if (name === COOKIE_NAME && val) {
      return decodeURIComponent(val);
    }
  }
  return null;
}

/**
 * Tworzy bezpieczny nagłówek Set-Cookie (HttpOnly, Secure, SameSite=Lax)
 */
export function serializeSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * Czyści ciasteczko sesyjne
 */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
