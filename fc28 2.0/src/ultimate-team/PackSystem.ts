/**
 * CYBERFC 28 — Pack Opening & Drop Engine
 * Authoritative drop algorithms, duplicate handling, and pack tiers.
 */

import { PlayerCard } from './PlayerCard';
import { getAllCards } from './CardDatabase';

export type PackTier = 'standard' | 'premium' | 'ultimate';

export interface PackDefinition {
  id: PackTier;
  name: string;
  cost: number;
  description: string;
  minOvr: number;
}

export const PACK_TIERS: Record<PackTier, PackDefinition> = {
  standard: {
    id: 'standard',
    name: 'PACZKA STANDARDOWA',
    cost: 100,
    description: '1 ZAWODNIK FUT • GWARANTOWANY ZAWODNIK SREBRNY / ZŁOTY',
    minOvr: 74
  },
  premium: {
    id: 'premium',
    name: 'ZŁOTA PACZKA PREMIUM',
    cost: 250,
    description: '1 ZAWODNIK FUT • ZWIĘKSZONA SZANSA NA GWIAZDY 82+ ORAZ WALKOUT',
    minOvr: 78
  },
  ultimate: {
    id: 'ultimate',
    name: 'ULTIMATE WALKOUT PACK',
    cost: 500,
    description: 'ELITARNA PACZKA FUT • GWARANTOWANY ZAWODNIK 80+ • 1% IKONA LEGEND',
    minOvr: 80
  }
};

export interface PackOpenResult {
  card: PlayerCard;
  isDuplicate: boolean;
  refundCoins: number;
  isWalkout: boolean;
  isIcon: boolean;
}

export class PackSystem {
  public static openPack(
    tier: PackTier,
    ownedCardIds: string[] = []
  ): PackOpenResult {
    const allCards = getAllCards();
    const packDef = PACK_TIERS[tier] || PACK_TIERS.standard;

    // Filter cards by minimum OVR for tier
    const eligiblePool = allCards.filter(c => c.ovr >= packDef.minOvr);

    // Roll random weight based on tier
    const rand = Math.random() * 100;
    let targetPool: PlayerCard[] = [];

    if (tier === 'ultimate') {
      if (rand < 1.0) {
        // 1% Icon 90+
        targetPool = eligiblePool.filter(c => c.ovr >= 90);
      } else if (rand < 5.0) {
        // 4% Walkout 87+
        targetPool = eligiblePool.filter(c => c.ovr >= 87 && c.ovr < 90);
      } else if (rand < 25.0) {
        // 20% Top tier 84-86
        targetPool = eligiblePool.filter(c => c.ovr >= 84 && c.ovr < 87);
      } else {
        // Regular pool 80-83
        targetPool = eligiblePool.filter(c => c.ovr < 84);
      }
    } else if (tier === 'premium') {
      if (rand < 0.5) {
        // 0.5% Icon
        targetPool = eligiblePool.filter(c => c.ovr >= 90);
      } else if (rand < 3.0) {
        // 2.5% Walkout 87+
        targetPool = eligiblePool.filter(c => c.ovr >= 87);
      } else if (rand < 20.0) {
        targetPool = eligiblePool.filter(c => c.ovr >= 82 && c.ovr < 87);
      } else {
        targetPool = eligiblePool.filter(c => c.ovr < 82);
      }
    } else {
      // Standard pack
      if (rand < 0.2) {
        targetPool = eligiblePool.filter(c => c.ovr >= 90);
      } else if (rand < 1.5) {
        targetPool = eligiblePool.filter(c => c.ovr >= 85);
      } else if (rand < 15.0) {
        targetPool = eligiblePool.filter(c => c.ovr >= 80 && c.ovr < 85);
      } else {
        targetPool = eligiblePool.filter(c => c.ovr < 80);
      }
    }

    if (targetPool.length === 0) {
      targetPool = eligiblePool.length > 0 ? eligiblePool : allCards;
    }

    const selectedCard = targetPool[Math.floor(Math.random() * targetPool.length)];
    const isDuplicate = ownedCardIds.includes(selectedCard.id);
    const isIcon = selectedCard.ovr >= 90;
    const isWalkout = selectedCard.ovr >= 87 || isIcon;

    // Refund coins for duplicate: 40% of pack cost + tier bonus
    const refundCoins = isDuplicate ? Math.round(packDef.cost * 0.45 + (selectedCard.ovr - 70) * 4) : 0;

    return {
      card: selectedCard,
      isDuplicate,
      refundCoins,
      isWalkout,
      isIcon
    };
  }
}
