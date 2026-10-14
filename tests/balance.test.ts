import { describe, expect, it } from 'vitest';
import { calculateLoad } from '../src/domain/calculateLoad';
import { applyMoraleDelta, calculateRoundMorale } from '../src/domain/calculateMorale';
import { hasValidCompletion } from '../src/domain/completion';
import { knownLoadAdjustments } from '../src/domain/events';
import { BATTERY, CAPACITY_KW, CHARGERS, DECORATION_IDS, GENERATOR, INITIAL_MORALE, RINK, createEmptyAction, messageOf } from '../src/domain/scenario';
import type { BlockAction, CommsMessage, DecorationId } from '../src/domain/types';
import { eventsReferenceSchedule } from './fixtures';

const SETS: DecorationId[][] = Array.from({ length: 16 }, (_, m) => DECORATION_IDS.filter((_, b) => m & (1 << b)));

function options(b: number): BlockAction[] {
  const base = createEmptyAction(b);
  if (b === 0) return (['none', 'precharge', 'notice'] as CommsMessage[]).map((message) => ({ ...base, message, extraCharging: message === 'precharge' }));
  if (b === 5) return [base, { ...base, extraCharging: true }];
  const out: BlockAction[] = [];
  for (const decorationsOff of SETS)
    for (const rinkPaused of RINK.allowedBlocks.includes(b) ? [false, true] : [false])
      for (const batteryDischarge of [false, true])
        for (const chargersPaused of [false, true]) out.push({ ...base, decorationsOff, rinkPaused, batteryDischarge, chargersPaused });
  return out;
}

/**
 * Hoogste eindmoraal over alle complete, geldige avonden, zonder noodaggregaat.
 * knownLoadAdjustments(history) is hier volledige kennis: elk effect op blok b wordt vóór blok b onthuld.
 */
function searchOptimum() {
  let best = -1;
  let bestRuns: BlockAction[][] = [];
  const walk = (history: BlockAction[], morale: number) => {
    const b = history.length;
    if (b === 6) {
      const pauses = history.filter((a) => a.chargersPaused).length;
      if (pauses !== history.filter((a) => a.extraCharging).length) return;
      if (morale > best) [best, bestRuns] = [morale, [history]];
      else if (morale === best) bestRuns.push(history);
      return;
    }
    const adjustment = knownLoadAdjustments(history)[b] ?? 0;
    for (const a of options(b)) {
      const next = [...history, a];
      if (next.filter((x) => x.rinkPaused).length > RINK.maxUses) continue;
      if (next.filter((x) => x.batteryDischarge).length > BATTERY.maxUses) continue;
      const pauses = next.filter((x) => x.chargersPaused).length;
      if (pauses > CHARGERS.maxPauses || pauses > next.filter((x) => x.extraCharging).length + (b < 5 ? 1 : 0)) continue;
      if (calculateLoad(b, a, adjustment) > CAPACITY_KW) continue;
      walk(next, applyMoraleDelta(morale, calculateRoundMorale(b, a, history).delta));
    }
  };
  walk([], INITIAL_MORALE);
  return { best, bestRuns };
}

/**
 * Loopt elke speelbare avond langs, zoals de engine hem toelaat: een actie mag alleen als er met de nu bekende
 * events nog een geldig vervolg is (met aggregaat zodra het ontgrendeld is). Telt de toestanden waarin
 * het team helemaal geen geldige zet meer heeft.
 */
function countDeadlocks(): number {
  const withGenerator = (b: number, unlocked: boolean): BlockAction[] =>
    options(b).flatMap((a) => (unlocked && GENERATOR.allowedBlocks.includes(b) ? [a, { ...a, emergencyGenerator: true }] : [a]));
  const count = (h: BlockAction[], pick: (a: BlockAction) => boolean) => h.filter(pick).length;
  const withinLimits = (h: BlockAction[]) =>
    count(h, (a) => a.rinkPaused) <= RINK.maxUses &&
    count(h, (a) => a.batteryDischarge) <= BATTERY.maxUses &&
    count(h, (a) => a.chargersPaused) <= CHARGERS.maxPauses;
  const key = (h: BlockAction[], adjustments: number[], unlocked: boolean) =>
    [h.length, count(h, (a) => a.rinkPaused), count(h, (a) => a.batteryDischarge), count(h, (a) => a.chargersPaused), count(h, (a) => a.extraCharging), adjustments.join(','), unlocked, messageOf(h[0])].join('|');

  const completions = new Map<string, boolean>();
  const completes = (h: BlockAction[], adjustments: number[], unlocked: boolean): boolean => {
    const k = key(h, adjustments, unlocked);
    const cached = completions.get(k);
    if (cached !== undefined) return cached;
    const b = h.length;
    const result =
      b === 6
        ? count(h, (a) => a.chargersPaused) === count(h, (a) => a.extraCharging)
        : withGenerator(b, unlocked).some((a) => {
            const next = [...h, a];
            return withinLimits(next) && calculateLoad(b, a, adjustments[b] ?? 0) <= CAPACITY_KW && completes(next, adjustments, unlocked);
          });
    completions.set(k, result);
    return result;
  };

  const seen = new Set<string>();
  let deadlocks = 0;
  const walk = (h: BlockAction[], unlocked: boolean) => {
    const b = h.length;
    if (b === 6) return;
    const adjustments = knownLoadAdjustments(h);
    const k = key(h, adjustments, unlocked);
    if (seen.has(k)) return;
    seen.add(k);
    let playable = false;
    for (const a of withGenerator(b, unlocked)) {
      const next = [...h, a];
      if (!withinLimits(next) || calculateLoad(b, a, adjustments[b] ?? 0) > CAPACITY_KW || !completes(next, adjustments, unlocked)) continue;
      playable = true;
      walk(next, unlocked || (b < 5 && !hasValidCompletion(next)));
    }
    if (!playable) deadlocks++;
  };
  walk([], false);
  return deadlocks;
}

describe('balans met events', () => {
  it('het noodaggregaat haalt elke vastgelopen avond: nergens zit een team definitief klem', () => {
    expect(countDeadlocks()).toBe(0);
  }, 120_000);

  it('maximale eindmoraal is 87, met precies één perfecte run', () => {
    const { best, bestRuns } = searchOptimum();
    expect(best).toBe(87);
    expect(bestRuns).toHaveLength(1);
    const normalise = (s: BlockAction[]) => JSON.parse(JSON.stringify(s.map((a) => ({ ...createEmptyAction(a.blockIndex), ...a }))));
    expect(normalise(bestRuns[0]!)).toEqual(normalise(eventsReferenceSchedule()));
  }, 300_000);
});
