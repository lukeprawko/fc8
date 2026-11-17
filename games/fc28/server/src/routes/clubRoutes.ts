/**
 * @file clubRoutes.ts
 * @description Autorytatywne trasy ekonomii, paczek i zarządzania składem (zero-trust)
 */

import { D1Database } from '@cloudflare/workers-types';
import {
  OpenPackSchema,
  UpdateLineupSchema,
  PackOpenResult,
  REWARD_CONFIG
} from '@games/shared';
import { extractSessionToken, validateSession } from '../auth/session';
import { rollPackCard, PACK_CONFIGS, getCardById } from '../game/playersDb';
import { checkRateLimit } from '../middleware/security';

export interface Env {
  DB: D1Database;
}

/**
 * Autorytatywne otwarcie paczki z kartą piłkarza
 */
export async function handleOpenPack(request: Request, env: Env): Promise<Response> {
  const token = extractSessionToken(request);
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'Wymagane logowanie' }), { status: 401 });
  }

  const session = await validateSession(env.DB, token);
  if (!session) {
    return new Response(JSON.stringify({ success: false, message: 'Sesja wygasła' }), { status: 401 });
  }

  // Rate limiting otwierania paczek
  if (!checkRateLimit(`pack_${session.user.id}`, 20, 60)) {
    return new Response(JSON.stringify({ success: false, message: 'Zbyt szybkie otwieranie paczek. Zwolnij!' }), { status: 429 });
  }

  try {
    const rawBody = await request.json();
    const parseResult = OpenPackSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ success: false, message: 'Nieprawidłowy typ paczki' }), { status: 400 });
    }

    const { tier } = parseResult.data;
    const packConfig = PACK_CONFIGS[tier];

    // Pobranie aktualnego stanu monet bezpośrednio z bazy
    const user = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(session.user.id).first<{ coins: number }>();
    if (!user || user.coins < packConfig.price) {
      return new Response(JSON.stringify({ success: false, message: 'Niewystarczająca liczba monet!' }), { status: 400 });
    }

    // Losowanie karty za pomocą bezpiecznego serwerowego RNG
    const wonCard = rollPackCard(tier);
    const now = Math.floor(Date.now() / 1000);

    // Sprawdzenie czy gracz posiada już tę kartę (dubel)
    const existingCard = await env.DB.prepare(`
      SELECT id, count FROM user_cards WHERE user_id = ? AND card_id = ?
    `).bind(session.user.id, wonCard.id).first<{ id: string; count: number }>();

    const isDuplicate = !!existingCard;
    const refundCoins = isDuplicate ? Math.round(packConfig.price * REWARD_CONFIG.DUPLICATE_REFUND_PERCENTAGE) : 0;
    const netCoinCost = packConfig.price - refundCoins;

    // Aktualizacja stanu konta i kart w D1
    if (isDuplicate) {
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE users
          SET coins = coins - ?, packs_opened = packs_opened + 1, updated_at = ?
          WHERE id = ?
        `).bind(netCoinCost, now, session.user.id),
        env.DB.prepare(`
          UPDATE user_cards
          SET count = count + 1
          WHERE user_id = ? AND card_id = ?
        `).bind(session.user.id, wonCard.id)
      ]);
    } else {
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE users
          SET coins = coins - ?, packs_opened = packs_opened + 1, updated_at = ?
          WHERE id = ?
        `).bind(netCoinCost, now, session.user.id),
        env.DB.prepare(`
          INSERT INTO user_cards (id, user_id, card_id, count, is_tradeable, obtained_at)
          VALUES (?, ?, ?, 1, 1, ?)
        `).bind(crypto.randomUUID(), session.user.id, wonCard.id, now)
      ]);
    }

    const remainingCoins = user.coins - netCoinCost;

    const result: PackOpenResult = {
      card: wonCard,
      isDuplicate,
      refundCoins,
      remainingCoins
    };

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: 'Błąd podczas otwierania paczki' }), { status: 500 });
  }
}

/**
 * Autorytatywna zmiana składu z walidacją posiadania kart
 */
export async function handleUpdateLineup(request: Request, env: Env): Promise<Response> {
  const token = extractSessionToken(request);
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'Wymagane logowanie' }), { status: 401 });
  }

  const session = await validateSession(env.DB, token);
  if (!session) {
    return new Response(JSON.stringify({ success: false, message: 'Sesja wygasła' }), { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parseResult = UpdateLineupSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(JSON.stringify({ success: false, message: 'Nieprawidłowe dane składu' }), { status: 400 });
    }

    const { gk, def, mid, fwd } = parseResult.data;

    // Sprawdzenie poprawności ról kart w bazie danych gry
    const gkCard = getCardById(gk);
    const defCard = getCardById(def);
    const midCard = getCardById(mid);
    const fwdCard = getCardById(fwd);

    if (!gkCard || gkCard.role !== 'GK' ||
        !defCard || defCard.role !== 'DEF' ||
        !midCard || midCard.role !== 'MID' ||
        !fwdCard || fwdCard.role !== 'FWD') {
      return new Response(JSON.stringify({ success: false, message: 'Niepoprawne pozycje przypisanych zawodników' }), { status: 400 });
    }

    // Zero-Trust: Sprawdzenie czy gracz rzeczywiście posiada wszystkie te karty w D1!
    const owned = await env.DB.prepare(`
      SELECT card_id FROM user_cards
      WHERE user_id = ? AND card_id IN (?, ?, ?, ?)
    `).bind(session.user.id, gk, def, mid, fwd).all<{ card_id: string }>();

    const ownedSet = new Set((owned.results || []).map(r => r.card_id));
    if (!ownedSet.has(gk) || !ownedSet.has(def) || !ownedSet.has(mid) || !ownedSet.has(fwd)) {
      return new Response(JSON.stringify({ success: false, message: 'Próba wystawienia karty, której nie posiadasz!' }), { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`
      INSERT INTO user_lineup (user_id, gk_card_id, def_card_id, mid_card_id, fwd_card_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        gk_card_id = excluded.gk_card_id,
        def_card_id = excluded.def_card_id,
        mid_card_id = excluded.mid_card_id,
        fwd_card_id = excluded.fwd_card_id,
        updated_at = excluded.updated_at
    `).bind(session.user.id, gk, def, mid, fwd, now).run();

    return new Response(JSON.stringify({ success: true, message: 'Skład został pomyślnie zapisany!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Błąd podczas aktualizacji składu' }), { status: 500 });
  }
}
