/**
 * @file security.ts
 * @description Nagłówki bezpieczeństwa, CORS i kontrola dostępu dla Cloudflare Workers
 */

import { ALLOWED_ORIGINS } from '@games/shared';

// Pamięć podręczna dla prostego rate-limitingu w instancji workera
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Sprawdza czy dany origin jest dozwolony
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.github.io');
}

/**
 * Zwraca nagłówki CORS w oparciu o zapytanie
 */
export function getCorsHeaders(request: Request): Headers {
  const origin = request.headers.get('Origin');
  const headers = new Headers();

  if (origin && isOriginAllowed(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  return headers;
}

/**
 * Aplikuje rygorystyczne nagłówki ochronne do każdej odpowiedzi HTTP
 */
export function applySecurityHeaders(response: Response, request?: Request): Response {
  const headers = new Headers(response.headers);

  // Wymuszenie HTTPS i HSTS
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Ochrona przed MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Blokada osadzania w iframe (ochrona przed clickjackingiem)
  headers.set('X-Frame-Options', 'DENY');

  // Polityka Referrer
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Wyłączenie niepotrzebnych API przeglądarki
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

  // Content Security Policy
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' wss: https://challenges.cloudflare.com;"
  );

  // Zastosowanie nagłówków CORS
  if (request) {
    const cors = getCorsHeaders(request);
    cors.forEach((val, key) => headers.set(key, val));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Sprawdza limit żądań (Rate Limiting) per IP na poziomie Workera
 */
export function checkRateLimit(ip: string, maxRequests: number, windowSec: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const record = ipRateLimits.get(ip);

  if (!record || now > record.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + windowSec });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Przekroczono limit
  }

  record.count++;
  return true;
}
