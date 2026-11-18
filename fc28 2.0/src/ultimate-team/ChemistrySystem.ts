/**
 * CYBERFC 28 — Chemistry & Lineup Rating System
 * Accurately calculates squad chemistry (up to 33/33) and team average OVR.
 */

import { PlayerCard } from './PlayerCard';
import { getCardById } from './CardDatabase';

export interface ActiveSquad {
  GK: string;
  DEF: string;
  MID: string;
  FWD: string;
}

export interface ChemistryResult {
  totalChemistry: number; // 0 - 33
  maxChemistry: number;   // 33
  averageOvr: number;
  playerPoints: Record<string, number>; // 0 - 3 per card
  activePlayStylesCount: number;
}

export class ChemistrySystem {
  public static calculate(squad: ActiveSquad): ChemistryResult {
    const roles: (keyof ActiveSquad)[] = ['GK', 'DEF', 'MID', 'FWD'];
    const cards: (PlayerCard | undefined)[] = roles.map(r => getCardById(squad[r]));

    // Count nationalities
    const nationCounts = new Map<string, number>();
    cards.forEach(card => {
      if (card && card.nation) {
        nationCounts.set(card.nation, (nationCounts.get(card.nation) || 0) + 1);
      }
    });

    const playerPoints: Record<string, number> = {};
    let totalPoints = 0;
    let totalOvr = 0;
    let activeCardsCount = 0;
    let playStylesCount = 0;

    roles.forEach((r, idx) => {
      const card = cards[idx];
      if (!card) {
        playerPoints[r] = 0;
        return;
      }

      activeCardsCount++;
      totalOvr += card.ovr;
      if (card.playstyle) playStylesCount++;

      // 1. Correct position bonus: +1 point
      let pts = 1;

      // 2. Nation link bonus: +1 if at least 2 players share nation, +2 if 3+
      const nationCount = card.nation ? nationCounts.get(card.nation) || 0 : 0;
      if (card.rarity === 'ICON') {
        // Icons always provide max +2 nation chemistry to all!
        pts += 2;
      } else if (nationCount >= 3) {
        pts += 2;
      } else if (nationCount >= 2) {
        pts += 1;
      }

      // Max 3 chemistry points per player
      const finalPts = Math.min(3, pts);
      playerPoints[r] = finalPts;
      totalPoints += finalPts;
    });

    const averageOvr = activeCardsCount > 0 ? Math.round(totalOvr / activeCardsCount) : 75;

    // Normalize 4-player points (max 12 points) to the 33-point Ultimate Team scale:
    // (totalPoints / 12) * 33
    const normalizedChem = Math.round((totalPoints / 12) * 33);

    return {
      totalChemistry: Math.min(33, normalizedChem),
      maxChemistry: 33,
      averageOvr,
      playerPoints,
      activePlayStylesCount: playStylesCount
    };
  }
}
