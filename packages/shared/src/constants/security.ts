/**
 * @file security.ts
 * @description Stałe bezpieczeństwa, limity anty-cheat, wymiary świata gry i polityka CORS
 */

export const SECURITY_LIMITS = {
  // Limity Durable Objects i WebSocket
  MAX_WS_MESSAGES_PER_SEC: 60,
  MAX_WS_PAYLOAD_BYTES: 2048,
  MAX_ROOM_CONNECTIONS: 6,
  MAX_IP_CONNECTIONS_PER_ROOM: 2,
  ROOM_INACTIVITY_TIMEOUT_SEC: 300, // 5 minut

  // Limity uwierzytelniania i endpointów HTTP
  AUTH_RATE_LIMIT_PER_MINUTE: 10,
  PACK_OPEN_RATE_LIMIT_PER_MINUTE: 30,
  MAX_USERNAME_LENGTH: 16,
  MIN_USERNAME_LENGTH: 3,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 64,

  // Czasy ważności tokenów i sesji
  SESSION_LIFETIME_SECONDS: 60 * 60 * 24 * 7, // 7 dni
  ASSET_URL_TTL_SECONDS: 300 // 5 minut na podpisany URL R2
};

export const GAME_CONSTANTS = {
  WORLD_WIDTH: 2250,
  WORLD_HEIGHT: 1250,
  MARGIN_X: 130,
  MARGIN_Y: 110,
  GOAL_WIDTH: 60,
  GOAL_HEIGHT: 240,
  MATCH_DURATION_SECONDS: 180, // 3 minuty

  // Limity anty-cheat sprawdzane przez Durable Object
  MAX_ACCEPTABLE_PLAYER_SPEED: 22.0,
  MAX_ACCEPTABLE_KICK_SPEED: 40.0,
  MAX_POSITION_DELTA_PER_TICK: 25.0
};

export const REWARD_CONFIG = {
  MATCH_WIN_COINS: 150,
  MATCH_DRAW_COINS: 75,
  MATCH_LOSS_COINS: 35,
  STARTER_COINS: 200,
  DUPLICATE_REFUND_PERCENTAGE: 0.40 // 40% zwrotu wartości paczki za dubel
};

export const ALLOWED_ORIGINS = [
  'https://jdrgames.pl',
  'https://www.jdrgames.pl',
  'https://lukeprawko.github.io',
  'https://novagames.pl',
  'https://fc28.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080'
];
