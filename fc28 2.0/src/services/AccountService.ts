/**
 * CYBERFC 28 — Authoritative Cloudflare Backend & Account Service
 * Syncs club progress, authentication, rankings, and cross-device save codes.
 */

import { ClubData } from '../ultimate-team/SquadManager';
import { events } from '../core/EventBus';

export interface UserProfile {
  id: string;
  username: string;
  isGuest: boolean;
  token?: string;
  createdAt: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: UserProfile;
  token?: string;
  clubData?: Partial<ClubData>;
}

const BACKEND_URL = 'https://fc28-backend.plugames640.workers.dev';
const AUTH_STORAGE_KEY = 'fc28_auth_session_v2';

export class AccountService {
  private static instance: AccountService;
  private currentUser: UserProfile | null = null;

  private constructor() {
    this.currentUser = this.loadStoredSession();
  }

  public static getInstance(): AccountService {
    if (!AccountService.instance) {
      AccountService.instance = new AccountService();
    }
    return AccountService.instance;
  }

  private loadStoredSession(): UserProfile | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {}
    return null;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isGuest(): boolean {
    return !this.currentUser || this.currentUser.isGuest;
  }

  public async register(username: string, password: string): Promise<AuthResponse> {
    if (!username || username.trim().length < 3) {
      return { success: false, message: 'Nick musi mieć co najmniej 3 znaki.' };
    }
    if (!password || password.length < 4) {
      return { success: false, message: 'Hasło musi mieć co najmniej 4 znaki.' };
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        this.setUserSession({
          id: data.userId || String(Date.now()),
          username: username.trim(),
          isGuest: false,
          token: data.token,
          createdAt: Date.now()
        });
        return { success: true, user: this.currentUser! };
      }
      return { success: false, message: data.message || 'Błąd rejestracji' };
    } catch (err: any) {
      console.warn('[AccountService] Cloudflare offline/blocked, fallback to local session:', err);
      this.setUserSession({
        id: 'local_' + Date.now(),
        username: username.trim(),
        isGuest: false,
        token: 'LOCAL_' + Date.now(),
        createdAt: Date.now()
      });
      return { success: true, user: this.currentUser!, message: 'Zalogowano lokalnie (offline)' };
    }
  }

  public async login(username: string, password: string): Promise<AuthResponse> {
    if (!username || !password) {
      return { success: false, message: 'Podaj nick i hasło.' };
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        this.setUserSession({
          id: data.userId || String(Date.now()),
          username: username.trim(),
          isGuest: false,
          token: data.token,
          createdAt: Date.now()
        });
        return { success: true, user: this.currentUser!, clubData: data.clubData };
      }
      return { success: false, message: data.message || 'Nieprawidłowy nick lub hasło' };
    } catch (err: any) {
      console.warn('[AccountService] Cloudflare offline/blocked, fallback to local session:', err);
      this.setUserSession({
        id: 'local_' + Date.now(),
        username: username.trim(),
        isGuest: false,
        token: 'LOCAL_' + Date.now(),
        createdAt: Date.now()
      });
      return { success: true, user: this.currentUser!, message: 'Zalogowano lokalnie (offline)' };
    }
  }

  public logout(): void {
    this.currentUser = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    events.emit('authChanged', null);
  }

  private setUserSession(profile: UserProfile): void {
    this.currentUser = profile;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    }
    events.emit('authChanged', profile);
  }

  public generateTransferCode(clubData: ClubData): string {
    const raw = JSON.stringify(clubData);
    if (typeof btoa !== 'undefined') {
      return 'FC28_' + btoa(encodeURIComponent(raw));
    }
    return 'FC28_' + ((globalThis as any).Buffer?.from(raw).toString('base64') || '');
  }

  public restoreFromTransferCode(code: string): Partial<ClubData> | null {
    try {
      if (!code.startsWith('FC28_')) return null;
      const b64 = code.replace('FC28_', '');
      let raw = '';
      if (typeof atob !== 'undefined') {
        raw = decodeURIComponent(atob(b64));
      } else {
        raw = ((globalThis as any).Buffer?.from(b64, 'base64').toString('utf8') || '');
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('[AccountService] Invalid transfer code:', e);
      return null;
    }
  }
}

export const accountService = AccountService.getInstance();
