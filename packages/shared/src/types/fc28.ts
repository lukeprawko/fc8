/**
 * @file fc28.ts
 * @description Typy domenowe i modele danych dla gry CyberFC 28
 */

export type CardRole = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PlayerCard {
  id: string;
  name: string;
  role: CardRole;
  ovr: number;
  playstyle: string | null;
  playstyles: string[];
  skin: string;
  hair: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  nation?: string;
}

export interface SquadLineup {
  gk: string;
  def: string;
  mid: string;
  fwd: string;
}

export type PackTier = 'standard' | 'premium' | 'ultimate';

export interface PackConfig {
  id: PackTier;
  name: string;
  price: number;
  minOvr: number;
  description: string;
}

export interface PackOpenResult {
  card: PlayerCard;
  isDuplicate: boolean;
  refundCoins: number;
  remainingCoins: number;
}

export interface MatchStats {
  shotsBlue: number;
  shotsRed: number;
  savesBlue: number;
  savesRed: number;
  foulsBlue: number;
  foulsRed: number;
}

export interface MatchEndReward {
  userId: string;
  slot: number;
  coinsEarned: number;
  newCoinBalance: number;
  isWinner: boolean;
}
