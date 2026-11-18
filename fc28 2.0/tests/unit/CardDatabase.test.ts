import { describe, it, expect } from 'vitest';
import { getAllCards, getCardById, getCardsByRole, getStarterCards } from '@/ultimate-team/CardDatabase';
import { EventBus } from '@/core/EventBus';

describe('CardDatabase & EventBus', () => {
  it('should load all 95 real cards with valid properties', () => {
    const cards = getAllCards();
    expect(cards.length).toBe(95);

    const pele = getCardById('fwd_pele');
    expect(pele).toBeDefined();
    expect(pele?.name).toBe('PELÉ');
    expect(pele?.ovr).toBe(95);
    expect(pele?.role).toBe('FWD');
    expect(pele?.rarity).toBe('ICON');
    expect(pele?.nation).toBe('🇧🇷');

    const courtois = getCardById('gk_courtois');
    expect(courtois).toBeDefined();
    expect(courtois?.role).toBe('GK');
    expect(courtois?.ovr).toBe(89);

    const yashin = getCardById('gk_yashin');
    expect(yashin).toBeDefined();
    expect(yashin?.ovr).toBe(92);
    expect(yashin?.rarity).toBe('ICON');
  });

  it('should filter cards by role accurately', () => {
    const gks = getCardsByRole('GK');
    const defs = getCardsByRole('DEF');
    const mids = getCardsByRole('MID');
    const fwds = getCardsByRole('FWD');

    expect(gks.length).toBeGreaterThan(0);
    expect(defs.length).toBeGreaterThan(0);
    expect(mids.length).toBeGreaterThan(0);
    expect(fwds.length).toBeGreaterThan(0);
    expect(gks.length + defs.length + mids.length + fwds.length).toBe(95);
  });

  it('should return starter cards for lineup setup', () => {
    const starters = getStarterCards();
    expect(starters.length).toBe(4);
    expect(starters[0].role).toBe('GK');
    expect(starters[1].role).toBe('DEF');
    expect(starters[2].role).toBe('MID');
    expect(starters[3].role).toBe('FWD');
  });

  it('EventBus should handle emission and unsubscription cleanly', () => {
    const bus = EventBus.getInstance();
    let emittedVal = 0;
    const unsub = bus.on<number>('testScore', val => {
      emittedVal = val;
    });

    bus.emit('testScore', 42);
    expect(emittedVal).toBe(42);

    unsub();
    bus.emit('testScore', 99);
    expect(emittedVal).toBe(42); // Should not update after unsub
  });
});
