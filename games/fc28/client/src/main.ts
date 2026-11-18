/**
 * @file main.ts
 * @description Główny punkt wejściowy klienta CyberFC 28: pętla renderowania, wejścia klawiatury i integracja z API
 */

import { ThreeEngine } from './render/ThreeEngine';
import { GameClient } from './net/GameClient';
import { HudController } from './ui/HudController';
import { ClubView } from './ui/ClubView';
import { injectDomWatermark } from './security/watermark';
import { PlayerInputKeys } from '@games/shared';

// Wstrzyknięcie cyfrowego znaku wodnego i weryfikacja domeny
injectDomWatermark();

// Stan klienta
let engine: ThreeEngine;
let client: GameClient;
let hud: HudController;
let club: ClubView;

const inputKeys: PlayerInputKeys = {
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false,
  Shift: false,
  Space: false
};

let mouseX = 0;
let mouseY = 0;
let isSpaceDown = false;
let spaceCharge = 0;
let isAuthRegisterMode = false;
let turnstileToken = 'dev-token';

function init() {
  const container = document.getElementById('canvasContainer');
  if (!container) return;

  engine = new ThreeEngine(container);
  client = new GameClient();
  hud = new HudController();
  club = new ClubView();

  setupInputListeners();
  setupUIHandlers();
  requestAnimationFrame(gameLoop);
}

function setupInputListeners() {
  window.addEventListener('keydown', (e) => {
    if (e.code in inputKeys) {
      (inputKeys as any)[e.code] = true;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      inputKeys.Shift = true;
    }
    if (e.code === 'Space') {
      inputKeys.Space = true;
      isSpaceDown = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code in inputKeys) {
      (inputKeys as any)[e.code] = false;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      inputKeys.Shift = false;
    }
    if (e.code === 'Space') {
      inputKeys.Space = false;
      isSpaceDown = false;
      spaceCharge = 0;
      hud.updateCharge(0, false);
    }
  });

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
}

function setupUIHandlers() {
  const mainMenu = document.getElementById('mainMenu');
  const matchHud = document.getElementById('matchHud');
  const authModal = document.getElementById('authModal');
  const btnPlayOnline = document.getElementById('btnPlayOnline');
  const btnPacks = document.getElementById('btnPacks');
  const btnAccount = document.getElementById('btnAccount');
  const btnAuthClose = document.getElementById('btnAuthClose');
  const btnAuthToggle = document.getElementById('btnAuthToggle');
  const btnAuthSubmit = document.getElementById('btnAuthSubmit');
  const btnPackResultClose = document.getElementById('btnPackResultClose');

  btnPlayOnline?.addEventListener('click', async () => {
    if (mainMenu) mainMenu.style.display = 'none';
    if (matchHud) matchHud.style.display = 'flex';

    // Pobranie zapisanego tokena sesji (jeśli gracz jest zalogowany)
    const token = localStorage.getItem('fc28_auth_token');

    // Dołączenie do domyślnego pokoju w Durable Object
    const ok = await client.connect('QUICK1', token);
    if (ok) {
      client.sendReady(true);
    }
  });

  btnPacks?.addEventListener('click', async () => {
    await club.openPack('ultimate');
  });

  // Odświeżenie etykiety konta jeśli zalogowany
  const savedUserJson = localStorage.getItem('fc28_user');
  if (savedUserJson && btnAccount) {
    try {
      const u = JSON.parse(savedUserJson);
      btnAccount.textContent = `👤 ${u.username} (${u.coins || 0} 🪙)`;
    } catch {}
  }

  btnAccount?.addEventListener('click', () => {
    if (authModal) authModal.style.display = 'flex';
  });

  btnAuthClose?.addEventListener('click', () => {
    if (authModal) authModal.style.display = 'none';
  });

  btnAuthToggle?.addEventListener('click', () => {
    isAuthRegisterMode = !isAuthRegisterMode;
    const titleEl = document.getElementById('authModalTitle');
    if (titleEl && btnAuthSubmit && btnAuthToggle) {
      titleEl.textContent = isAuthRegisterMode ? 'Rejestracja' : 'Logowanie';
      btnAuthSubmit.textContent = isAuthRegisterMode ? 'UTWÓRZ KONTO' : 'ZALOGUJ';
      btnAuthToggle.textContent = isAuthRegisterMode ? 'MAM JUŻ KONTO' : 'REJESTRACJA';
    }
  });

  btnAuthSubmit?.addEventListener('click', async () => {
    const userInp = (document.getElementById('authUsername') as HTMLInputElement)?.value;
    const passInp = (document.getElementById('authPassword') as HTMLInputElement)?.value;
    const apiBase = import.meta.env.VITE_API_URL || 'https://fc28-backend.plugames640.workers.dev';
    const endpoint = isAuthRegisterMode ? `${apiBase}/api/auth/register` : `${apiBase}/api/auth/login`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: userInp,
          password: passInp,
          turnstileToken: turnstileToken || 'dev-token'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('fc28_auth_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('fc28_user', JSON.stringify(data.user));
          if (btnAccount) {
            btnAccount.textContent = `👤 ${data.user.username} (${data.user.coins} 🪙)`;
          }
        }
        alert(data.message);
        if (authModal) authModal.style.display = 'none';
      } else {
        alert(data.message || 'Błąd uwierzytelniania');
      }
    } catch (err: any) {
      console.error('Błąd autoryzacji:', err);
      alert('Błąd sieciowy podczas autoryzacji: ' + (err?.message || err));
    }
  });

  btnPackResultClose?.addEventListener('click', () => {
    const modal = document.getElementById('packResultModal');
    if (modal) modal.style.display = 'none';
  });
}

function gameLoop() {
  // Ładowanie siły strzału
  if (isSpaceDown) {
    spaceCharge = Math.min(100, spaceCharge + 2.5);
    hud.updateCharge(spaceCharge, true);
  }

  // Wysłanie sterowania do Durable Object
  client.sendInput(inputKeys, false, mouseX, mouseY, isSpaceDown, 'powerShot', spaceCharge);

  // Pobranie interpolowanego stanu z sieci i wyrenderowanie sceny 3D
  const state = client.getInterpolatedState();
  if (state) {
    engine.render(state, client.localSlot);
    hud.updateScore(state.scoreBlue, state.scoreRed);
    hud.updateTimer(state.timeRemaining);
    hud.updateBanner(state.banner.text, state.banner.sub, state.banner.color, state.banner.timer > 0);
  } else {
    engine.render(null);
  }

  hud.updatePing(client.pingMs);
  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
