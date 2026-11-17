/**
 * @file schemas.ts
 * @description Rygorystyczne schematy walidacji Zod dla zapytań HTTP i komunikatów WebSocket
 */

import { z } from 'zod';
import { SECURITY_LIMITS, GAME_CONSTANTS } from '../constants/security';

// Walidacja logowania
export const LoginSchema = z.object({
  username: z.string()
    .min(SECURITY_LIMITS.MIN_USERNAME_LENGTH, 'Login musi mieć min. 3 znaki')
    .max(SECURITY_LIMITS.MAX_USERNAME_LENGTH, 'Login może mieć max 16 znaków')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Login może zawierać tylko litery, cyfry, _ i -')
    .trim(),
  password: z.string()
    .min(SECURITY_LIMITS.MIN_PASSWORD_LENGTH, 'Hasło musi mieć min. 8 znaków')
    .max(SECURITY_LIMITS.MAX_PASSWORD_LENGTH, 'Hasło jest za długie'),
  turnstileToken: z.string().min(1, 'Brak tokenu Turnstile (weryfikacja anty-bot)')
});

// Walidacja rejestracji
export const RegisterSchema = z.object({
  username: z.string()
    .min(SECURITY_LIMITS.MIN_USERNAME_LENGTH, 'Login musi mieć min. 3 znaki')
    .max(SECURITY_LIMITS.MAX_USERNAME_LENGTH, 'Login może mieć max 16 znaków')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Login może zawierać tylko litery, cyfry, _ i -')
    .trim(),
  password: z.string()
    .min(SECURITY_LIMITS.MIN_PASSWORD_LENGTH, 'Hasło musi mieć min. 8 znaków')
    .max(SECURITY_LIMITS.MAX_PASSWORD_LENGTH, 'Hasło jest za długie'),
  turnstileToken: z.string().min(1, 'Wymagana weryfikacja Cloudflare Turnstile')
});

// Walidacja tworzenia pokoju
export const CreateRoomSchema = z.object({
  is2v2: z.boolean().default(false),
  turnstileToken: z.string().optional()
});

// Walidacja otwarcia paczki
export const OpenPackSchema = z.object({
  tier: z.enum(['standard', 'premium', 'ultimate'])
});

// Walidacja składu
export const UpdateLineupSchema = z.object({
  gk: z.string().min(1).max(64),
  def: z.string().min(1).max(64),
  mid: z.string().min(1).max(64),
  fwd: z.string().min(1).max(64)
});

// Walidacja klawiszy wejściowych z klienta
export const InputKeysSchema = z.object({
  KeyW: z.boolean(),
  KeyS: z.boolean(),
  KeyA: z.boolean(),
  KeyD: z.boolean(),
  Shift: z.boolean(),
  Space: z.boolean()
});

// Walidacja wejścia gracza w pętli fizyki
export const ClientInputSchema = z.object({
  seq: z.number().int().nonnegative(),
  keys: InputKeysSchema,
  mouseDrive: z.boolean(),
  mx: z.number().min(0).max(GAME_CONSTANTS.WORLD_WIDTH),
  my: z.number().min(0).max(GAME_CONSTANTS.WORLD_HEIGHT),
  chargeActive: z.boolean(),
  chargeType: z.enum(['lobPass', 'powerShot', 'finesseShot']).nullable(),
  chargePower: z.number().min(0).max(100)
});

// Walidacja dołączenia przez WebSocket
export const JoinRoomMessageSchema = z.object({
  t: z.literal('join'),
  roomCode: z.string().regex(/^[A-Z0-9]{4,8}$/, 'Niepoprawny kod pokoju'),
  token: z.string().optional(),
  lineup: UpdateLineupSchema.optional(),
  clientVersion: z.string().max(32)
});
