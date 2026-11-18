/**
 * CYBERFC 28 — Squad & Club Inventory Manager
 */

import { ActiveSquad, ChemistryResult, ChemistrySystem } from './ChemistrySystem';
import { getCardById, STARTER_CARD_IDS } from './CardDatabase';
import { events } from '../core/EventBus';

export interface ClubData {
  coins: number;
  owned: string[];
  lineup: ActiveSquad;
  version: number;
}

const STORAGE_KEY = 'fc28_club_data_v2';

export class SquadManager {
  private static instance: SquadManager;
  private clubData: ClubData;

  private constructor() {
    this.clubData = this.loadInitialClubData();
  }

  public static getInstance(): SquadManager {
    if (!SquadManager.instance) {
      SquadManager.instance = new SquadManager();
    }
    return SquadManager.instance;
  }

  private loadInitialClubData(): ClubData {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.owned) && parsed.lineup) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[SquadManager] Could not load from localStorage, initializing fresh club.');
    }

    // Default starter squad
    return {
      coins: 200,
      owned: [...STARTER_CARD_IDS],
      lineup: {
        GK: STARTER_CARD_IDS[0] || 'gk_sanchez',
        DEF: STARTER_CARD_IDS[1] || 'def_disasi',
        MID: STARTER_CARD_IDS[2] || 'mid_soucek',
        FWD: STARTER_CARD_IDS[3] || 'fwd_broja'
      },
      version: 2
    };
  }

  public getClubData(): ClubData {
    return this.clubData;
  }

  public getCoins(): number {
    return this.clubData.coins;
  }

  public addCoins(amount: number): void {
    if (amount <= 0) return;
    this.clubData.coins += amount;
    this.save();
    events.emit('coinsUpdated', this.clubData.coins);
  }

  public spendCoins(amount: number): boolean {
    if (this.clubData.coins < amount) return false;
    this.clubData.coins -= amount;
    this.save();
    events.emit('coinsUpdated', this.clubData.coins);
    return true;
  }

  public addCardToClub(cardId: string): void {
    if (!this.clubData.owned.includes(cardId)) {
      this.clubData.owned.push(cardId);
      this.save();
      events.emit('cardAdded', cardId);
    }
  }

  public equipCard(role: keyof ActiveSquad, cardId: string): boolean {
    const card = getCardById(cardId);
    if (!card || card.role !== role) return false;
    if (!this.clubData.owned.includes(cardId)) return false;

    this.clubData.lineup[role] = cardId;
    this.save();
    events.emit('lineupUpdated', this.clubData.lineup);
    return true;
  }

  public getChemistry(): ChemistryResult {
    return ChemistrySystem.calculate(this.clubData.lineup);
  }

  public save(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.clubData));
      }
      events.emit('clubSaved', this.clubData);
    } catch (e) {
      console.error('[SquadManager] Failed to save club data:', e);
    }
  }

  public importClubData(data: Partial<ClubData>): boolean {
    if (!data || !Array.isArray(data.owned) || !data.lineup) return false;
    this.clubData = {
      coins: Number.isFinite(data.coins) ? data.coins! : 0,
      owned: [...data.owned],
      lineup: { ...data.lineup },
      version: 2
    };
    this.save();
    events.emit('clubReloaded', this.clubData);
    return true;
  }
}

export const squadManager = SquadManager.getInstance();
