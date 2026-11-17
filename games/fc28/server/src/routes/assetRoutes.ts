/**
 * @file assetRoutes.ts
 * @description Ochrona zasobów w R2: weryfikacja sesji, kontrola Origin/Referer, rate limit i znaki wodne
 */

import { R2Bucket, D1Database } from '@cloudflare/workers-types';
import { extractSessionToken, validateSession } from '../auth/session';
import { isOriginAllowed, checkRateLimit } from '../middleware/security';

export interface Env {
  DB: D1Database;
  ASSETS_BUCKET?: R2Bucket;
}

/**
 * Wydawanie chronionych zasobów (modele, tekstury, dźwięki) z R2
 */
export async function handleServeAsset(request: Request, env: Env, assetKey: string): Promise<Response> {
  if (!env.ASSETS_BUCKET) {
    return new Response('Magazyn zasobów R2 nie jest aktywny na tym koncie', { status: 503 });
  }
  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

  // 1. Kontrola anty-hotlinking (Referer / Origin)
  const referer = request.headers.get('Referer');
  const origin = request.headers.get('Origin');

  if (origin && !isOriginAllowed(origin)) {
    return new Response('Nieautoryzowane źródło żądania (Forbidden Origin)', { status: 403 });
  }

  if (referer) {
    try {
      const refUrl = new URL(referer);
      if (!isOriginAllowed(refUrl.origin)) {
        return new Response('Brak uprawnień referera (Anti-Hotlinking)', { status: 403 });
      }
    } catch {
      return new Response('Nieprawidłowy nagłówek Referer', { status: 400 });
    }
  }

  // 2. Kontrola limitu pobierania (Rate Limit)
  if (!checkRateLimit(`asset_${clientIp}`, 120, 60)) {
    return new Response('Zbyt wiele zapytań o zasoby (Rate Limit Exceeded)', { status: 429 });
  }

  // 3. Weryfikacja sesji gracza lub podpisanego tokena
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  const sessionToken = extractSessionToken(request) || queryToken;

  if (!sessionToken) {
    return new Response('Wymagana autoryzacja do pobrania zasobów gry', { status: 401 });
  }

  const session = await validateSession(env.DB, sessionToken);
  if (!session) {
    return new Response('Ważność sesji wygasła', { status: 401 });
  }

  // 4. Pobranie pliku z R2
  try {
    const object = await env.ASSETS_BUCKET.get(assetKey);
    if (!object) {
      return new Response(`Zasób ${assetKey} nie został znaleziony w R2`, { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'private, max-age=86400');
    // Znak wodny chroniący własność intelektualną
    headers.set('X-Content-License', 'Proprietary - All Rights Reserved (Nova Games / CyberFC 28)');
    headers.set('X-Asset-Watermark', 'CF28-ORIGIN-SEC-SIG-2026-X779');

    return new Response(object.body, { headers });
  } catch (err: any) {
    return new Response(`Błąd odczytu magazynu R2: ${err?.message || err}`, { status: 500 });
  }
}
