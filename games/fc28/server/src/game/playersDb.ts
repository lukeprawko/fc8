/**
 * @file playersDb.ts
 * @description Autorytatywna baza zawodników, paczek i algorytm losowania kart po stronie serwera
 */

import { PlayerCard, PackConfig, PackTier } from '@games/shared';

export const STARTER_CARD_IDS = ['gk_bazunu', 'def_disasi', 'mid_soucek', 'fwd_broja'];

export const PACK_CONFIGS: Record<PackTier, PackConfig> = {
  standard: {
    id: 'standard',
    name: 'Paczka Standard',
    price: 100,
    minOvr: 75,
    description: '1 zawodnik 75+ OVR z szansą na gwiazdę'
  },
  premium: {
    id: 'premium',
    name: 'Paczka Premium',
    price: 250,
    minOvr: 80,
    description: '1 zawodnik 80+ OVR z podwyższoną szansą na styl gry'
  },
  ultimate: {
    id: 'ultimate',
    name: 'Paczka Ultimate',
    price: 500,
    minOvr: 84,
    description: 'Gwarantowany zawodnik światowej klasy 84+ OVR ze stylem gry+'
  }
};

export const SERVER_PLAYERS_DB: PlayerCard[] = [
  // BRAMKARZE (GK)
  { id: 'gk_bazunu', name: 'GAVIN BAZUNU', role: 'GK', ovr: 76, playstyle: null, playstyles: [], skin: '#8d5524', hair: '#111111', pac: 72, sho: 30, pas: 65, dri: 70, def: 76, phy: 74 },
  { id: 'gk_meslier', name: 'ILLAN MESLIER', role: 'GK', ovr: 78, playstyle: 'cat_reflex', playstyles: ['cat_reflex'], skin: '#ffdbac', hair: '#2c1b18', pac: 70, sho: 32, pas: 68, dri: 72, def: 78, phy: 73 },
  { id: 'gk_pope', name: 'NICK POPE', role: 'GK', ovr: 83, playstyle: 'far_reach', playstyles: ['far_reach'], skin: '#ffdbac', hair: '#2c1b18', pac: 68, sho: 35, pas: 62, dri: 65, def: 84, phy: 82 },
  { id: 'gk_martinez', name: 'EMILIANO MARTÍNEZ', role: 'GK', ovr: 86, playstyle: 'close_down', playstyles: ['close_down'], skin: '#ffdbac', hair: '#2c1b18', pac: 70, sho: 40, pas: 74, dri: 75, def: 87, phy: 85 },
  { id: 'gk_alisson', name: 'ALISSON BECKER', role: 'GK', ovr: 89, playstyle: 'deflector', playstyles: ['deflector'], skin: '#ffdbac', hair: '#2c1b18', pac: 75, sho: 45, pas: 85, dri: 80, def: 89, phy: 86 },
  { id: 'gk_courtois', name: 'THIBAUT COURTOIS', role: 'GK', ovr: 90, playstyle: 'far_reach', playstyles: ['far_reach'], skin: '#ffdbac', hair: '#2c1b18', pac: 73, sho: 42, pas: 78, dri: 76, def: 91, phy: 88 },

  // OBROŃCY (DEF)
  { id: 'def_disasi', name: 'AXEL DISASI', role: 'DEF', ovr: 77, playstyle: null, playstyles: [], skin: '#8d5524', hair: '#111111', pac: 64, sho: 38, pas: 55, dri: 58, def: 77, phy: 80 },
  { id: 'def_chalobah', name: 'TREVOH CHALOBAH', role: 'DEF', ovr: 78, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 72, sho: 42, pas: 61, dri: 65, def: 78, phy: 78 },
  { id: 'def_branthwaite', name: 'JARRAD BRANTHWAITE', role: 'DEF', ovr: 79, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 67, sho: 35, pas: 58, dri: 62, def: 80, phy: 82 },
  { id: 'def_lacroix', name: 'MAXENCE LACROIX', role: 'DEF', ovr: 79, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 87, sho: 32, pas: 56, dri: 64, def: 78, phy: 80 },
  { id: 'def_pavlovic', name: 'STRAHINJA PAVLOVIĆ', role: 'DEF', ovr: 79, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 72, sho: 40, pas: 55, dri: 58, def: 80, phy: 83 },
  { id: 'def_kerkez', name: 'MILOS KERKEZ', role: 'DEF', ovr: 79, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 84, sho: 50, pas: 67, dri: 74, def: 76, phy: 78 },
  { id: 'def_hincapie', name: 'PIERO HINCAPIE', role: 'DEF', ovr: 80, playstyle: 'quick_step', playstyles: ['quick_step'], skin: '#ffdbac', hair: '#2c1b18', pac: 78, sho: 42, pas: 65, dri: 70, def: 81, phy: 79 },
  { id: 'def_tapsoba', name: 'EDMOND TAPSOBA', role: 'DEF', ovr: 81, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 72, sho: 40, pas: 62, dri: 66, def: 82, phy: 82 },
  { id: 'def_min_jae', name: 'KIM MIN-JAE', role: 'DEF', ovr: 84, playstyle: 'anticipate', playstyles: ['anticipate'], skin: '#ffdbac', hair: '#2c1b18', pac: 78, sho: 48, pas: 63, dri: 66, def: 85, phy: 84 },
  { id: 'def_saliba', name: 'WILLIAM SALIBA', role: 'DEF', ovr: 87, playstyle: 'anticipate', playstyles: ['anticipate'], skin: '#8d5524', hair: '#111111', pac: 82, sho: 45, pas: 71, dri: 74, def: 87, phy: 84 },
  { id: 'def_dijk', name: 'VIRGIL VAN DIJK', role: 'DEF', ovr: 90, playstyle: 'anticipate', playstyles: ['anticipate'], skin: '#8d5524', hair: '#111111', pac: 78, sho: 60, pas: 72, dri: 73, def: 90, phy: 88 },

  // POMOCNICY (MID)
  { id: 'mid_soucek', name: 'TOMÁŠ SOUČEK', role: 'MID', ovr: 78, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 60, sho: 72, pas: 68, dri: 69, def: 78, phy: 84 },
  { id: 'mid_billing', name: 'PHILIP BILLING', role: 'MID', ovr: 77, playstyle: null, playstyles: [], skin: '#8d5524', hair: '#111111', pac: 66, sho: 74, pas: 73, dri: 74, def: 72, phy: 81 },
  { id: 'mid_onana', name: 'AMADOU ONANA', role: 'MID', ovr: 80, playstyle: null, playstyles: [], skin: '#8d5524', hair: '#111111', pac: 74, sho: 65, pas: 72, dri: 75, def: 80, phy: 85 },
  { id: 'mid_szoboszlai', name: 'DOMINIK SZOBOSZLAI', role: 'MID', ovr: 83, playstyle: 'power_shot', playstyles: ['power_shot'], skin: '#ffdbac', hair: '#2c1b18', pac: 82, sho: 84, pas: 84, dri: 83, def: 60, phy: 75 },
  { id: 'mid_valverde', name: 'FEDERICO VALVERDE', role: 'MID', ovr: 88, playstyle: 'power_shot', playstyles: ['power_shot'], skin: '#ffdbac', hair: '#2c1b18', pac: 88, sho: 83, pas: 84, dri: 84, def: 80, phy: 84 },
  { id: 'mid_rodri', name: 'RODRI HERNANDEZ', role: 'MID', ovr: 91, playstyle: 'incisive_pass', playstyles: ['incisive_pass'], skin: '#ffdbac', hair: '#2c1b18', pac: 66, sho: 80, pas: 86, dri: 83, def: 87, phy: 85 },
  { id: 'mid_debruyne', name: 'KEVIN DE BRUYNE', role: 'MID', ovr: 91, playstyle: 'incisive_pass', playstyles: ['incisive_pass'], skin: '#ffdbac', hair: '#e6a15c', pac: 72, sho: 87, pas: 94, dri: 87, def: 65, phy: 75 },

  // NAPASTNICY (FWD)
  { id: 'fwd_broja', name: 'ARMANDO BROJA', role: 'FWD', ovr: 76, playstyle: null, playstyles: [], skin: '#ffdbac', hair: '#2c1b18', pac: 80, sho: 74, pas: 55, dri: 73, def: 32, phy: 76 },
  { id: 'fwd_beto', name: 'BETO', role: 'FWD', ovr: 78, playstyle: null, playstyles: [], skin: '#8d5524', hair: '#111111', pac: 83, sho: 76, pas: 52, dri: 71, def: 35, phy: 84 },
  { id: 'fwd_gakpo', name: 'CODY GAKPO', role: 'FWD', ovr: 83, playstyle: 'finesse_shot', playstyles: ['finesse_shot'], skin: '#8d5524', hair: '#111111', pac: 85, sho: 82, pas: 79, dri: 84, def: 44, phy: 75 },
  { id: 'fwd_son', name: 'HEUNG-MIN SON', role: 'FWD', ovr: 87, playstyle: 'finesse_shot', playstyles: ['finesse_shot'], skin: '#ffdbac', hair: '#111111', pac: 87, sho: 89, pas: 82, dri: 85, def: 42, phy: 71 },
  { id: 'fwd_vinicius', name: 'VINÍCIUS JÚNIOR', role: 'FWD', ovr: 90, playstyle: 'quick_step', playstyles: ['quick_step'], skin: '#8d5524', hair: '#111111', pac: 95, sho: 83, pas: 81, dri: 91, def: 30, phy: 69 },
  { id: 'fwd_haaland', name: 'ERLING HAALAND', role: 'FWD', ovr: 91, playstyle: 'power_shot', playstyles: ['power_shot'], skin: '#ffdbac', hair: '#edd892', pac: 89, sho: 93, pas: 68, dri: 81, def: 45, phy: 88 },
  { id: 'fwd_mbappe', name: 'KYLIAN MBAPPÉ', role: 'FWD', ovr: 92, playstyle: 'quick_step', playstyles: ['quick_step'], skin: '#8d5524', hair: '#111111', pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 78 }
];

export function getCardById(id: string): PlayerCard | undefined {
  return SERVER_PLAYERS_DB.find(c => c.id === id);
}

/**
 * Autorytatywne losowanie karty z paczki z użyciem bezpiecznego serwerowego RNG
 */
export function rollPackCard(tier: PackTier): PlayerCard {
  const config = PACK_CONFIGS[tier];
  const eligible = SERVER_PLAYERS_DB.filter(c => c.ovr >= config.minOvr);

  if (eligible.length === 0) {
    return SERVER_PLAYERS_DB[0];
  }

  // Wagi oparte na OVR (im wyższy OVR, tym rzadszy zrzut)
  const weights = eligible.map(card => {
    const diff = card.ovr - config.minOvr;
    return Math.max(1, Math.round(100 / Math.pow(1.5, diff)));
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Bezpieczny los z Web Crypto API
  const randomUint32 = new Uint32Array(1);
  crypto.getRandomValues(randomUint32);
  const normalizedRand = randomUint32[0] / (0xffffffff + 1);
  let threshold = normalizedRand * totalWeight;

  for (let i = 0; i < eligible.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) {
      return eligible[i];
    }
  }

  return eligible[eligible.length - 1];
}
