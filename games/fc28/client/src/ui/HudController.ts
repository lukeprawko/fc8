/**
 * @file HudController.ts
 * @description Kontroler interfejsu meczowego (HUD): wynik, czas, banery, ładowanie strzału i kondycja
 */

export class HudController {
  private scoreEl: HTMLElement | null;
  private timerEl: HTMLElement | null;
  private bannerEl: HTMLElement | null;
  private bannerTextEl: HTMLElement | null;
  private bannerSubEl: HTMLElement | null;
  private chargeBarEl: HTMLElement | null;
  private pingEl: HTMLElement | null;

  constructor() {
    this.scoreEl = document.getElementById('hudScore');
    this.timerEl = document.getElementById('hudTimer');
    this.bannerEl = document.getElementById('hudBanner');
    this.bannerTextEl = document.getElementById('hudBannerText');
    this.bannerSubEl = document.getElementById('hudBannerSub');
    this.chargeBarEl = document.getElementById('hudChargeBar');
    this.pingEl = document.getElementById('hudPing');
  }

  public updateScore(blue: number, red: number): void {
    if (this.scoreEl) {
      this.scoreEl.textContent = `${blue} : ${red}`;
    }
  }

  public updateTimer(secondsRemaining: number): void {
    if (this.timerEl) {
      const mins = Math.floor(secondsRemaining / 60);
      const secs = Math.floor(secondsRemaining % 60);
      this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  public updateBanner(text: string, sub: string, color: string, active: boolean): void {
    if (!this.bannerEl || !this.bannerTextEl || !this.bannerSubEl) return;

    if (active && text) {
      this.bannerEl.style.display = 'flex';
      this.bannerTextEl.textContent = text;
      this.bannerTextEl.style.color = color;
      this.bannerSubEl.textContent = sub;
    } else {
      this.bannerEl.style.display = 'none';
    }
  }

  public updateCharge(power: number, active: boolean): void {
    if (this.chargeBarEl) {
      this.chargeBarEl.style.width = active ? `${power}%` : '0%';
    }
  }

  public updatePing(ms: number): void {
    if (this.pingEl) {
      this.pingEl.textContent = `${ms} ms`;
      this.pingEl.style.color = ms < 60 ? '#00e676' : (ms < 120 ? '#f5b041' : '#ff0055');
    }
  }
}
