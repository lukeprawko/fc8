/**
 * @file ClubView.ts
 * @description Moduł zarządzania klubem: otwieranie paczek, podgląd kart i autorytatywna zmiana składu
 */

import { PlayerCard, PackOpenResult, SquadLineup } from '@games/shared';

export class ClubView {
  public ownedCards: PlayerCard[] = [];
  public currentLineup: SquadLineup = {
    gk: 'gk_bazunu',
    def: 'def_disasi',
    mid: 'mid_soucek',
    fwd: 'fwd_broja'
  };

  constructor() {}

  /**
   * Otwarcie paczki przez zapytanie do serwera (Authoritative Backend)
   */
  public async openPack(tier: 'standard' | 'premium' | 'ultimate'): Promise<PackOpenResult | null> {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('fc28_auth_token');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/api/club/open-pack`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ tier })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Błąd podczas otwierania paczki');
        return null;
      }

      const result: PackOpenResult = data.result;
      this.displayPackAnimation(result);
      return result;
    } catch {
      alert('Błąd sieciowy podczas zakupu paczki');
      return null;
    }
  }

  /**
   * Zapis składu na serwerze (z weryfikacją posiadania kart)
   */
  public async saveLineup(lineup: SquadLineup): Promise<boolean> {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('fc28_auth_token');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/api/club/lineup`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(lineup)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Nie udało się zapisać składu');
        return false;
      }

      this.currentLineup = lineup;
      alert('Skład pomyślnie zsynchronizowany z serwerem!');
      return true;
    } catch {
      alert('Błąd połączenia z serwerem');
      return false;
    }
  }

  /**
   * Animacja i modal otwarcia paczki
   */
  public displayPackAnimation(result: PackOpenResult): void {
    const modal = document.getElementById('packResultModal');
    const nameEl = document.getElementById('packCardName');
    const ovrEl = document.getElementById('packCardOvr');
    const roleEl = document.getElementById('packCardRole');
    const infoEl = document.getElementById('packCardInfo');

    if (!modal || !nameEl || !ovrEl || !roleEl || !infoEl) return;

    nameEl.textContent = result.card.name;
    ovrEl.textContent = result.card.ovr.toString();
    roleEl.textContent = result.card.role;

    if (result.isDuplicate) {
      infoEl.textContent = `DUBLIKAT! Zwrócono ${result.refundCoins} 🪙 na Twoje konto.`;
      infoEl.style.color = '#f5b041';
    } else {
      infoEl.textContent = `NOWA KARTA! Dodano do Twojego klubu.`;
      infoEl.style.color = '#00e676';
    }

    modal.style.display = 'flex';
  }
}
