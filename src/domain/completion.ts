import { calculateLoad } from './calculateLoad';
import { knownLoadAdjustments } from './events';
import { BATTERY, BLOCK_COUNT, CAPACITY_KW, CHARGERS, DECORATION_BLOCKS, DECORATION_IDS, RINK, createEmptyAction } from './scenario';
import type { BlockAction, DecorationId } from './types';

const DECORATION_SETS: readonly DecorationId[][] = Array.from({ length: 1 << DECORATION_IDS.length }, (_, mask) =>
  DECORATION_IDS.filter((_, bit) => mask & (1 << bit)),
);

/**
 * Bestaat er, met alles wat nu bekend is, nog een geldig vervolg zonder noodaggregaat?
 * Kleine uitputtende zoektocht over de resterende blokken; puur en deterministisch.
 */
export function hasValidCompletion(executed: readonly BlockAction[]): boolean {
  const adjustments = knownLoadAdjustments(executed);
  const count = (pick: (a: BlockAction) => boolean) => executed.filter(pick).length;
  const memo = new Map<string, boolean>();

  const search = (b: number, rink: number, battery: number, pauses: number, extras: number): boolean => {
    if (b === BLOCK_COUNT) return pauses === extras;
    const extraSlotsLeft = CHARGERS.extraBlocks.filter((x) => x >= b).length;
    if (pauses > extras + extraSlotsLeft) return false;
    const key = `${b}|${rink}|${battery}|${pauses}|${extras}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let found = false;
    for (const action of candidateActions(b, rink, battery, pauses)) {
      if (calculateLoad(b, action, adjustments[b] ?? 0) > CAPACITY_KW) continue;
      const next = search(
        b + 1,
        rink + Number(action.rinkPaused),
        battery + Number(action.batteryDischarge),
        pauses + Number(action.chargersPaused),
        extras + Number(action.extraCharging),
      );
      if (next) {
        found = true;
        break;
      }
    }
    memo.set(key, found);
    return found;
  };

  return search(
    executed.length,
    count((a) => a.rinkPaused),
    count((a) => a.batteryDischarge),
    count((a) => a.chargersPaused),
    count((a) => a.extraCharging),
  );
}

function* candidateActions(b: number, rink: number, battery: number, pauses: number): Generator<BlockAction> {
  const base = createEmptyAction(b);
  const decorationSets = DECORATION_BLOCKS.includes(b) ? DECORATION_SETS : [[]];
  const rinkOptions = RINK.allowedBlocks.includes(b) && rink < RINK.maxUses ? [false, true] : [false];
  const batteryOptions = BATTERY.allowedBlocks.includes(b) && battery < BATTERY.maxUses ? [false, true] : [false];
  const pauseOptions = CHARGERS.pauseBlocks.includes(b) && pauses < CHARGERS.maxPauses ? [false, true] : [false];
  const extraOptions = CHARGERS.extraBlocks.includes(b) ? [false, true] : [false];
  for (const decorationsOff of decorationSets)
    for (const rinkPaused of rinkOptions)
      for (const batteryDischarge of batteryOptions)
        for (const chargersPaused of pauseOptions)
          for (const extraCharging of extraOptions)
            yield { ...base, decorationsOff, rinkPaused, batteryDischarge, chargersPaused, extraCharging };
}
