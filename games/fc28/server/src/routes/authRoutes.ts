/**
 * @file authRoutes.ts
 * @description Bezpieczne trasy uwierzytelniania: rejestracja, logowanie, sesja i profil gracza
 */

import { D1Database } from '@cloudflare/workers-types';
import {
  RegisterSchema,
  LoginSchema,
  AuthResponse,
  SECURITY_LIMITS,
  REWARD_CONFIG
} from '@games/shared';
import { hashPassword, verifyPassword, hashIp } from '../auth/crypto';
import {
  createSession,
  validateSession,
  revokeSession,
  extractSessionToken,
  serializeSessionCookie,
  clearSessionCookie
} from '../auth/session';
import { verifyTurnstileToken } from '../middleware/turnstile';
import { checkRateLimit } from '../middleware/security';
import { STARTER_CARD_IDS } from '../game/playersDb';

export interface Env {
  DB: D1Database;
  TURNSTILE_SECRET_KEY?: string;
  SESSION_SECRET?: string;
}

/**
 * Rejestracja nowego użytkownika
 */
export async function handleRegister(request: Request, env: Env): Promise<Response> {
  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

  // Rate limiting rejestracji
  if (!checkRateLimit(`reg_${clientIp}`, 5, 60)) {
    return new Response(JSON.stringify({ success: false, message: 'Zbyt wiele prób rejestracji. Spróbuj za chwilę.' }), { status: 429 });
  }

  try {
    const rawBody = await request.json();
    const parseResult = RegisterSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(JSON.stringify({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Nieprawidłowe dane rejestracji'
      }), { status: 400 });
    }

    const { username, password, turnstileToken } = parseResult.data;

    // Weryfikacja anty-botowa Cloudflare Turnstile
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY || 'DEV_MOCK_KEY', clientIp);
    if (!turnstileCheck.success) {
      return new Response(JSON.stringify({ success: false, message: turnstileCheck.error }), { status: 403 });
    }

    // Sprawdzenie unikalności nazwy użytkownika
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) {
      return new Response(JSON.stringify({ success: false, message: 'Ta nazwa użytkownika jest już zajęta' }), { status: 409 });
    }

    // Bezpieczne hashowanie hasła (PBKDF2 z solą)
    const { hash, salt } = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Zapis użytkownika do bazy D1 z bonusem startowym
    await env.DB.prepare(`
      INSERT INTO users (id, username, password_hash, salt, coins, packs_opened, matches_played, matches_won, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
    `).bind(userId, username, hash, salt, REWARD_CONFIG.STARTER_COINS, now, now).run();

    // Dodanie kart startowych
    for (const cardId of STARTER_CARD_IDS) {
      await env.DB.prepare(`
        INSERT INTO user_cards (id, user_id, card_id, count, is_tradeable, obtained_at)
        VALUES (?, ?, ?, 1, 0, ?)
      `).bind(crypto.randomUUID(), userId, cardId, now).run();
    }

    // Zapis domyślnego składu
    await env.DB.prepare(`
      INSERT INTO user_lineup (user_id, gk_card_id, def_card_id, mid_card_id, fwd_card_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, STARTER_CARD_IDS[0], STARTER_CARD_IDS[1], STARTER_CARD_IDS[2], STARTER_CARD_IDS[3], now).run();

    // Utworzenie bezpiecznej sesji z tokenem HttpOnly
    const userAgent = request.headers.get('User-Agent') || 'Unknown';
    const { token, expiresAt } = await createSession(env.DB, userId, clientIp, userAgent);

    // Zapis w dzienniku audytu bezpieczeństwa
    const ipHash = await hashIp(clientIp);
    await env.DB.prepare(`
      INSERT INTO audit_logs (id, event_type, user_id, ip_hash, details, created_at)
      VALUES (?, 'REGISTER_SUCCESS', ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), userId, ipHash, `User ${username} registered`, now).run();

    const responseBody: AuthResponse = {
      success: true,
      message: 'Konto zostało pomyślnie utworzone!',
      user: {
        id: userId,
        username,
        coins: REWARD_CONFIG.STARTER_COINS,
        packsOpened: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        createdAt: now
      }
    };

    const cookie = serializeSessionCookie(token, SECURITY_LIMITS.SESSION_LIFETIME_SECONDS);
    return new Response(JSON.stringify(responseBody), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: 'Błąd serwera podczas rejestracji' }), { status: 500 });
  }
}

/**
 * Logowanie do systemu
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

  // Rygorystyczny rate-limiting prób logowania (ochrona przed Brute Force)
  if (!checkRateLimit(`login_${clientIp}`, SECURITY_LIMITS.AUTH_RATE_LIMIT_PER_MINUTE, 60)) {
    return new Response(JSON.stringify({ success: false, message: 'Zbyt wiele prób logowania. Odczekaj chwilę.' }), { status: 429 });
  }

  try {
    const rawBody = await request.json();
    const parseResult = LoginSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(JSON.stringify({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Niepoprawne dane logowania'
      }), { status: 400 });
    }

    const { username, password, turnstileToken } = parseResult.data;

    // Weryfikacja Cloudflare Turnstile
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY || 'DEV_MOCK_KEY', clientIp);
    if (!turnstileCheck.success) {
      return new Response(JSON.stringify({ success: false, message: turnstileCheck.error }), { status: 403 });
    }

    // Pobranie użytkownika
    const user = await env.DB.prepare(`
      SELECT id, username, password_hash, salt, coins, packs_opened, matches_played, matches_won, created_at
      FROM users WHERE username = ?
    `).bind(username).first<{
      id: string;
      username: string;
      password_hash: string;
      salt: string;
      coins: number;
      packs_opened: number;
      matches_played: number;
      matches_won: number;
      created_at: number;
    }>();

    const ipHash = await hashIp(clientIp);
    const now = Math.floor(Date.now() / 1000);

    if (!user) {
      // Rejestracja nieudanego logowania w audit log
      await env.DB.prepare(`
        INSERT INTO audit_logs (id, event_type, user_id, ip_hash, details, created_at)
        VALUES (?, 'LOGIN_FAILED_NO_USER', NULL, ?, ?, ?)
      `).bind(crypto.randomUUID(), ipHash, `Username: ${username}`, now).run();

      return new Response(JSON.stringify({ success: false, message: 'Niepoprawny login lub hasło' }), { status: 401 });
    }

    // Weryfikacja hasła w czasie stałym
    const isValid = await verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      await env.DB.prepare(`
        INSERT INTO audit_logs (id, event_type, user_id, ip_hash, details, created_at)
        VALUES (?, 'LOGIN_FAILED_BAD_PASS', ?, ?, 'Invalid password attempt', ?)
      `).bind(crypto.randomUUID(), user.id, ipHash, now).run();

      return new Response(JSON.stringify({ success: false, message: 'Niepoprawny login lub hasło' }), { status: 401 });
    }

    // Tworzenie sesji
    const userAgent = request.headers.get('User-Agent') || 'Unknown';
    const { token } = await createSession(env.DB, user.id, clientIp, userAgent);

    await env.DB.prepare(`
      INSERT INTO audit_logs (id, event_type, user_id, ip_hash, details, created_at)
      VALUES (?, 'LOGIN_SUCCESS', ?, ?, 'Successful login', ?)
    `).bind(crypto.randomUUID(), user.id, ipHash, now).run();

    const responseBody: AuthResponse = {
      success: true,
      message: 'Zalogowano pomyślnie!',
      user: {
        id: user.id,
        username: user.username,
        coins: user.coins,
        packsOpened: user.packs_opened,
        matchesPlayed: user.matches_played,
        matchesWon: user.matches_won,
        createdAt: user.created_at
      }
    };

    const cookie = serializeSessionCookie(token, SECURITY_LIMITS.SESSION_LIFETIME_SECONDS);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Błąd serwera podczas logowania' }), { status: 500 });
  }
}

/**
 * Wylogowanie
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = extractSessionToken(request);
  if (token) {
    await revokeSession(env.DB, token);
  }

  const cookie = clearSessionCookie();
  return new Response(JSON.stringify({ success: true, message: 'Wylogowano pomyślnie' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie
    }
  });
}

/**
 * Pobranie aktualnego profilu gracza, kart i składu
 */
export async function handleMe(request: Request, env: Env): Promise<Response> {
  const token = extractSessionToken(request);
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'Brak aktywnej sesji' }), { status: 401 });
  }

  const session = await validateSession(env.DB, token);
  if (!session) {
    return new Response(JSON.stringify({ success: false, message: 'Sesja wygasła lub została unieważniona' }), { status: 401 });
  }

  // Pobranie kart użytkownika
  const cardsResult = await env.DB.prepare(`
    SELECT card_id, count, is_tradeable, obtained_at
    FROM user_cards WHERE user_id = ?
  `).bind(session.user.id).all<{
    card_id: string;
    count: number;
    is_tradeable: number;
    obtained_at: number;
  }>();

  // Pobranie składu
  const lineup = await env.DB.prepare(`
    SELECT gk_card_id, def_card_id, mid_card_id, fwd_card_id
    FROM user_lineup WHERE user_id = ?
  `).bind(session.user.id).first<{
    gk_card_id: string;
    def_card_id: string;
    mid_card_id: string;
    fwd_card_id: string;
  }>();

  return new Response(JSON.stringify({
    success: true,
    user: session.user,
    cards: cardsResult.results || [],
    lineup: lineup ? {
      gk: lineup.gk_card_id,
      def: lineup.def_card_id,
      mid: lineup.mid_card_id,
      fwd: lineup.fwd_card_id
    } : null
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
