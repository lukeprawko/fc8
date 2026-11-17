/**
 * @file crypto.ts
 * @description Moduł kryptograficzny bazujący na standardowym Web Crypto API (dostępnym w Cloudflare Workers)
 */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

/**
 * Konwertuje bufor bajtów na ciąg szesnastkowy
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Konwertuje ciąg szesnastkowy na Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Porównanie buforów w czasie stałym (ochrona przed atakiem timing attack)
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Bezpieczne hashowanie hasła przy użyciu PBKDF2-HMAC-SHA256 z solą
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = bufferToHex(saltBytes.buffer);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  return {
    hash: bufferToHex(derived),
    salt: saltHex
  };
}

/**
 * Weryfikacja hasła względem solonego hasha
 */
export async function verifyPassword(password: string, expectedHash: string, saltHex: string): Promise<boolean> {
  const saltBytes = hexToBuffer(saltHex);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  const derivedBytes = new Uint8Array(derived);
  const expectedBytes = hexToBuffer(expectedHash);
  return timingSafeEqual(derivedBytes, expectedBytes);
}

/**
 * Generuje kryptograficznie bezpieczny losowy token
 */
export function generateSecureToken(bytes = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return bufferToHex(array.buffer);
}

/**
 * Hashuje token sesji algorytmem SHA-256 przed zapisem w bazie D1
 */
export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return bufferToHex(digest);
}

/**
 * Hashuje adres IP na potrzeby bezpiecznego audytu (anonimizacja IP)
 */
export async function hashIp(ip: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode('cf28_salt_' + ip));
  return bufferToHex(digest).substring(0, 16);
}
