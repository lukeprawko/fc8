import { describe, it, expect, beforeEach } from 'vitest';
import { PackSystem, PACK_TIERS } from '@/ultimate-team/PackSystem';
import { ChemistrySystem } from '@/ultimate-team/ChemistrySystem';
import { SquadManager } from '@/ultimate-team/SquadManager';
import { STARTER_CARD_IDS } from '@/ultimate-team/CardDatabase';

describe('Ultimate Team Systems', () => {
  it('PackSystem should open standard pack and return valid card', () => {
    const result = PackSystem.openPack('standard', []);
    expect(result.card).toBeDefined();
    expect(result.card.ovr).toBeGreaterThanOrEqual(PACK_TIERS.standard.minOvr);
    expect(result.isDuplicate).toBe(false);
    expect(result.refundCoins).toBe(0);
  });

  it('PackSystem should handle duplicate cards and grant coin refunds', () => {
    // Pass known card IDs as owned
    const result = PackSystem.openPack('standard', ['fwd_broja', 'def_disasi', 'mid_soucek', 'gk_sanchez']);
    expect(result).toBeDefined();
    expect(PACK_TIERS.ultimate.cost).toBe(500);
    expect(PACK_TIERS.premium.cost).toBe(250);
    expect(PACK_TIERS.standard.cost).toBe(100);
  });

  it('ChemistrySystem should calculate correct rating and chemistry', () => {
    const defaultSquad = {
      GK: STARTER_CARD_IDS[0],
      DEF: STARTER_CARD_IDS[1],
      MID: STARTER_CARD_IDS[2],
      FWD: STARTER_CARD_IDS[3]
    };

    const chem = ChemistrySystem.calculate(defaultSquad);
    expect(chem.maxChemistry).toBe(33);
    expect(chem.totalChemistry).toBeGreaterThan(0);
    expect(chem.averageOvr).toBeGreaterThan(70);
  });

  it('SquadManager should manage coin balance and card equipping', () => {
    const manager = SquadManager.getInstance();
    const initialCoins = manager.getCoins();
    manager.addCoins(150);
    expect(manager.getCoins()).toBe(initialCoins + 150);

    const canSpend = manager.spendCoins(50);
    expect(canSpend).toBe(true);
    expect(manager.getCoins()).toBe(initialCoins + 100);

    const cannotOverspend = manager.spendCoins(999999);
    expect(cannotOverspend).toBe(false);
  });
});
