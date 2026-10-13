import { describe, expect, it } from 'vitest';
import { batteryRemainingAfterEachBlock, calculateLoad, calculateLoads, chargingNetKwh } from '../src/domain/calculateLoad';
import { applyMoraleDelta, calculateRoundMorale } from '../src/domain/calculateMorale';
import { ACTION_FEEDBACK, ATMOSPHERE_FEEDBACK } from '../src/domain/feedbackContent';
import { BLOCKS, createEmptyAction } from '../src/domain/scenario';
import { isScheduleValid, validateSchedule } from '../src/domain/validateSchedule';
import { REFERENCE, referenceSchedule, withBlock } from './fixtures';

const codes = (schedule: Parameters<typeof validateSchedule>[0]) => validateSchedule(schedule).map((i) => i.code);

describe('referentiecase (SPEC §8)', () => {
  it('levert de exacte loads, moraal en batterijstand op', () => {
    const schedule = referenceSchedule();
    expect(validateSchedule(schedule)).toEqual([]);
    expect(calculateLoads(schedule)).toEqual([95, 95, 95, 100, 100, 85]);
    expect(batteryRemainingAfterEachBlock(schedule)).toEqual([100, 100, 50, 0, 0, 0]);
    expect(chargingNetKwh(schedule)).toBe(0);

    let morale = REFERENCE.initialMorale;
    const moraleAfter = schedule.map((action, i) => (morale = applyMoraleDelta(morale, calculateRoundMorale(i, action).delta)));
    expect(moraleAfter).toEqual([78, 82, 86, 82, 83, 87]);
  });

  it('komt overeen met REFERENCE_CASE.json', () => {
    expect(calculateLoads(referenceSchedule())).toEqual(REFERENCE.expected.blockLoadsKw);
    expect(batteryRemainingAfterEachBlock(referenceSchedule())).toEqual(REFERENCE.expected.batteryRemainingKwh);
    expect(isScheduleValid(referenceSchedule())).toBe(REFERENCE.expected.valid);
  });
});

describe('calculateLoad', () => {
  it('past de formule uit SPEC §2.5 toe', () => {
    expect(calculateLoad(3, { ...createEmptyAction(3), decorationsOff: ['homes', 'seniors', 'hospital', 'square'] })).toBe(115);
    expect(calculateLoad(2, { ...createEmptyAction(2), rinkPaused: true, batteryDischarge: true, chargersPaused: true })).toBe(75);
    expect(calculateLoad(0, { ...createEmptyAction(0), extraCharging: true })).toBe(95);
  });
});

describe('validateSchedule', () => {
  it('2. drie batterijblokken ongeldig, twee geldig, nooit onder 0 kWh', () => {
    const three = withBlock(referenceSchedule(), 1, { batteryDischarge: true });
    expect(codes(three)).toContain('battery-count');
    expect(codes(referenceSchedule())).not.toContain('battery-count');
    expect(Math.min(...batteryRemainingAfterEachBlock(referenceSchedule()))).toBeGreaterThanOrEqual(0);
  });

  it('2b. batterij buiten blok 1-4 ongeldig', () => {
    expect(codes(withBlock(referenceSchedule(), 5, { batteryDischarge: true }))).toContain('battery-block');
  });

  it('3. ijsbaan tweemaal of in blok 4/5 ongeldig', () => {
    expect(codes(withBlock(referenceSchedule(), 1, { rinkPaused: true }))).toContain('rink-count');
    const inBlock4 = withBlock(withBlock(referenceSchedule(), 2, { rinkPaused: false }), 4, { rinkPaused: true });
    expect(codes(inBlock4)).toContain('rink-block');
    expect(codes(withBlock(referenceSchedule(), 5, { rinkPaused: true }))).toContain('rink-block');
  });

  it('4. meer dan twee pauzes ongeldig; netto kWh anders dan 0 ongeldig', () => {
    const threePauses = withBlock(referenceSchedule(), 2, { chargersPaused: true });
    expect(codes(threePauses)).toContain('chargers-pause-count');
    expect(codes(threePauses)).toContain('charging-not-neutral');
    expect(codes(withBlock(referenceSchedule(), 5, { extraCharging: false }))).toContain('charging-not-neutral');
  });

  it('5. vooruit- en inhaalladen alleen in blok 0 en 5', () => {
    expect(codes(withBlock(referenceSchedule(), 2, { extraCharging: true }))).toContain('extra-charging-block');
    expect(codes(withBlock(referenceSchedule(), 0, { chargersPaused: true }))).toContain('chargers-pause-block');
  });

  it('6. overbelasting > 100 kW wordt gemeld', () => {
    const overloaded = withBlock(referenceSchedule(), 4, { decorationsOff: ['seniors'] });
    const issues = validateSchedule(overloaded);
    expect(issues).toEqual([expect.objectContaining({ code: 'overload', blockIndex: 4 })]);
    expect(issues[0]!.message).toContain('115 kW');
  });

  it('staat overreductie toe', () => {
    expect(isScheduleValid(withBlock(referenceSchedule(), 4, { decorationsOff: ['seniors', 'square', 'homes'] }))).toBe(true);
  });

  it('feestverlichting alleen in blok 1-4', () => {
    expect(codes(withBlock(referenceSchedule(), 0, { decorationsOff: ['homes'] }))).toContain('decoration-block');
  });

  it('meldt een gewijzigde historie', () => {
    const executed = referenceSchedule().slice(0, 3);
    const changed = withBlock(referenceSchedule(), 1, { decorationsOff: ['homes'] });
    expect(validateSchedule(changed, executed).map((i) => i.code)).toContain('history-modified');
    expect(validateSchedule(referenceSchedule(), executed)).toEqual([]);
  });

  it('leeg programma is ongeldig door overbelasting', () => {
    const empty = BLOCKS.map((b) => createEmptyAction(b.index));
    expect(validateSchedule(empty).filter((i) => i.code === 'overload').map((i) => i.blockIndex)).toEqual([1, 2, 3, 4]);
  });

  it('bevat geen moraalinformatie in de meldingen', () => {
    const issues = validateSchedule(withBlock(referenceSchedule(), 1, { rinkPaused: true, batteryDischarge: true }));
    for (const issue of issues) expect(issue.message.toLowerCase()).not.toContain('moraal');
  });
});

describe('calculateRoundMorale', () => {
  it('geeft een sfeerbericht plus één bericht per strafgevende actie', () => {
    const result = calculateRoundMorale(3, referenceSchedule()[3]!);
    expect(result.events.map((e) => e.assetId)).toEqual(['atmosphere', 'seniors', 'chargers']);
    expect(result.delta).toBe(8 - 7 - 5);
  });

  it('batterij en extra laden kosten geen moraal', () => {
    expect(calculateRoundMorale(0, { ...createEmptyAction(0), extraCharging: true }).delta).toBe(3);
    expect(calculateRoundMorale(4, { ...createEmptyAction(4), batteryDischarge: true }).delta).toBe(4);
  });

  it('klemt de moraal tussen 0 en 100', () => {
    expect(applyMoraleDelta(98, 8)).toBe(100);
    expect(applyMoraleDelta(3, -18)).toBe(0);
  });

  it('heeft een tekst voor elke mogelijke actie/blok-combinatie (minimaal 29)', () => {
    const count =
      ATMOSPHERE_FEEDBACK.length + Object.values(ACTION_FEEDBACK).reduce((n, perBlock) => n + Object.keys(perBlock).length, 0);
    expect(count).toBe(29);
    for (const block of [1, 2, 3, 4]) {
      const all = { ...createEmptyAction(block), decorationsOff: ['homes', 'seniors', 'hospital', 'square'] as const, chargersPaused: true };
      expect(() => calculateRoundMorale(block, { ...all, decorationsOff: [...all.decorationsOff], rinkPaused: block < 4 })).not.toThrow();
    }
  });

  it('9. is deterministisch', () => {
    const run = () => referenceSchedule().map((a, i) => calculateRoundMorale(i, a));
    expect(run()).toEqual(run());
  });
});
