/**
 * @file index.ts
 * @description Główny punkt wejściowy Cloudflare Worker dla backendu CyberFC 28
 */

import { D1Database, R2Bucket, DurableObjectNamespace } from '@cloudflare/workers-types';
import { GameRoom } from './durable-objects/GameRoom';
import { handleRegister, handleLogin, handleLogout, handleMe } from './routes/authRoutes';
import { handleOpenPack, handleUpdateLineup } from './routes/clubRoutes';
import { handleServeAsset } from './routes/assetRoutes';
import { applySecurityHeaders, getCorsHeaders } from './middleware/security';

// Eksport klasy Durable Object wymagany przez Cloudflare Workers
export { GameRoom };

export interface Env {
  DB: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  GAME_ROOM: DurableObjectNamespace;
  TURNSTILE_SECRET_KEY?: string;
  SESSION_SECRET?: string;
  ENVIRONMENT?: string;
}

export default {
  /**
   * Obsługa zapytań HTTP oraz WebSocket
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Obsługa zapytań preflight CORS (OPTIONS)
    if (request.method === 'OPTIONS') {
      const corsHeaders = getCorsHeaders(request);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    let response: Response;

    try {
      // 1. Trasy uwierzytelniania
      if (pathname === '/api/auth/register' && request.method === 'POST') {
        response = await handleRegister(request, env);
      } else if (pathname === '/api/auth/login' && request.method === 'POST') {
        response = await handleLogin(request, env);
      } else if (pathname === '/api/auth/logout' && request.method === 'POST') {
        response = await handleLogout(request, env);
      } else if (pathname === '/api/auth/me' && request.method === 'GET') {
        response = await handleMe(request, env);
      }

      // 2. Trasy ekonomii i ekwipunku
      else if (pathname === '/api/club/open-pack' && request.method === 'POST') {
        response = await handleOpenPack(request, env);
      } else if (pathname === '/api/club/lineup' && request.method === 'POST') {
        response = await handleUpdateLineup(request, env);
      }

      // 3. Trasa chronionych zasobów R2
      else if (pathname.startsWith('/api/assets/')) {
        const assetKey = pathname.replace('/api/assets/', '');
        response = await handleServeAsset(request, env, assetKey);
      }

      // 4. Trasa WebSocket do Durable Objects (GameRoom)
      else if (pathname.startsWith('/api/room/') && pathname.endsWith('/ws')) {
        const parts = pathname.split('/');
        const roomCode = parts[3]?.toUpperCase();

        if (!roomCode || roomCode.length < 3 || roomCode.length > 12) {
          response = new Response('Niepoprawny kod pokoju', { status: 400 });
        } else {
          // Pobranie unikalnej instancji Durable Object dla danego pokoju
          const roomId = env.GAME_ROOM.idFromName(roomCode);
          const roomObject = env.GAME_ROOM.get(roomId);

          // Przekierowanie żądania do obiektu Durable Object
          return roomObject.fetch(request);
        }
      }

      // 5. Status i informacja o backendzie API
      else if (pathname === '/' || pathname === '/health') {
        response = new Response(JSON.stringify({
          service: 'CyberFC 28 Authoritative Cloud Backend API',
          status: 'online',
          version: '1.0.0',
          durableObjects: 'active',
          d1Database: 'connected',
          timestamp: Date.now()
        }, null, 2), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Domyślny 404 dla nieznanych endpointów
      else {
        response = new Response(JSON.stringify({ error: 'Endpoint nie istnieje' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err: any) {
      response = new Response(JSON.stringify({ error: 'Wewnętrzny błąd serwera' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Aplikacja nagłówków bezpieczeństwa do odpowiedzi
    return applySecurityHeaders(response, request);
  },

  /**
   * Harmonogram Cron: Automatyczny eksport kopii zapasowej D1 do R2
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.ASSETS_BUCKET) {
      console.warn('[Backup Cron] ASSETS_BUCKET nie jest aktywny. Pomijanie eksportu kopii zapasowej.');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `backups/d1_export_${timestamp}.json`;

    try {
      const users = await env.DB.prepare('SELECT id, username, coins, packs_opened, matches_played, matches_won, created_at FROM users').all();
      const cards = await env.DB.prepare('SELECT id, user_id, card_id, count, obtained_at FROM user_cards').all();
      const lineups = await env.DB.prepare('SELECT * FROM user_lineup').all();

      const dump = {
        timestamp,
        users: users.results || [],
        cards: cards.results || [],
        lineups: lineups.results || []
      };

      await env.ASSETS_BUCKET.put(backupKey, JSON.stringify(dump, null, 2), {
        customMetadata: { type: 'automated_d1_backup' }
      });

      console.log(`[Backup Cron] Utworzono kopię zapasową bazy D1 w R2: ${backupKey}`);
    } catch (err) {
      console.error('[Backup Cron] Błąd podczas tworzenia kopii zapasowej D1:', err);
    }
  }
};
