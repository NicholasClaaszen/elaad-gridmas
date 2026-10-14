import { describe, expect, it } from 'vitest';
import { calculateLoad } from '../src/domain/calculateLoad';
import { applyMoraleDelta, calculateRoundMorale } from '../src/domain/calculateMorale';
import { knownLoadAdjustments } from '../src/domain/events';
import { BATTERY, CAPACITY_KW, CHARGERS, DECORATION_IDS, INITIAL_MORALE, RINK, createEmptyAction } from '../src/domain/scenario';
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

describe('balans met events', () => {
  it('maximale eindmoraal is 87, met precies één perfecte run', () => {
    const { best, bestRuns } = searchOptimum();
    expect(best).toBe(87);
    expect(bestRuns).toHaveLength(1);
    const normalise = (s: BlockAction[]) => JSON.parse(JSON.stringify(s.map((a) => ({ ...createEmptyAction(a.blockIndex), ...a }))));
    expect(normalise(bestRuns[0]!)).toEqual(normalise(eventsReferenceSchedule()));
  }, 300_000);
});
