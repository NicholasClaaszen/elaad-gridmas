import { EVENT_NEWS } from './eventNews';
import { BLOCK_COUNT, messageOf } from './scenario';
import type { BlockAction, DecorationId, EventOccurrence, LoadEffect, NewsEventId } from './types';

/** Effectgroottes van de events (kW). */
export const EVENT_KW = {
  snow: -10,
  santa: 20,
  exodus: 15,
  seniorsOuting: 10,
  discoMove: 10,
  selfDimmers: -10,
  earlyBirds: -10,
} as const;

const SNOW_BLOCK = 2;
const SANTA_BLOCK = 4;

function occurrence(eventId: NewsEventId, revealedAfterBlock: number, loadEffects: LoadEffect[]): EventOccurrence {
  return {
    eventId,
    kind: eventId === 'santa-rumour' ? 'rumour' : 'news',
    revealedAfterBlock,
    loadEffects,
    ...EVENT_NEWS[eventId],
  };
}

const isDark = (a: BlockAction | undefined, id: DecorationId) => a?.decorationsOff.includes(id) ?? false;

type Detector = (executed: readonly BlockAction[], noticeSent: boolean) => EventOccurrence[];

/** Alle events. Elke detector kijkt alleen naar uitgevoerde blokken; onthulling volgt in revealedEvents. */
const DETECTORS: readonly Detector[] = [
  (_ex, notice) => (notice ? [occurrence('self-dimmers', 0, [{ blockIndex: 3, deltaKw: EVENT_KW.selfDimmers }])] : []),
  (ex) => (messageOf(ex[0]) === 'precharge' ? [occurrence('early-birds', 0, [{ blockIndex: SANTA_BLOCK, deltaKw: EVENT_KW.earlyBirds }])] : []),
  () => [occurrence('snow', 1, [{ blockIndex: SNOW_BLOCK, deltaKw: EVENT_KW.snow }]), occurrence('santa-rumour', 1, [])],
  (ex, notice) =>
    notice || !isDark(ex[1], 'seniors') ? [] : [occurrence('seniors-outing', 1, [{ blockIndex: 2, deltaKw: EVENT_KW.seniorsOuting }])],
  (ex, notice) =>
    notice
      ? []
      : [1, 2, 3].filter((b) => isDark(ex[b], 'homes')).map((b) => occurrence('exodus', b, [{ blockIndex: b + 1, deltaKw: EVENT_KW.exodus }])),
  () => [occurrence('santa', 2, [{ blockIndex: SANTA_BLOCK, deltaKw: EVENT_KW.santa }])],
  (ex) => (ex[3]?.rinkPaused ? [occurrence('disco-move', 3, [{ blockIndex: SANTA_BLOCK, deltaKw: EVENT_KW.discoMove }])] : []),
];

/** Alles wat het dorp weet na `executed.length` uitgevoerde blokken, op volgorde van onthulling. Puur. */
export function revealedEvents(executed: readonly BlockAction[]): EventOccurrence[] {
  const notice = messageOf(executed[0]) === 'notice';
  return DETECTORS.flatMap((detect) => detect(executed, notice))
    .filter((e) => e.revealedAfterBlock < executed.length)
    .sort((a, b) => a.revealedAfterBlock - b.revealedAfterBlock);
}

/** Som van de belastingseffecten per blok (kW). */
export function eventLoadAdjustments(occurrences: readonly EventOccurrence[]): number[] {
  const adjustments = new Array<number>(BLOCK_COUNT).fill(0);
  for (const e of occurrences) for (const effect of e.loadEffects) adjustments[effect.blockIndex]! += effect.deltaKw;
  return adjustments;
}

export function knownLoadAdjustments(executed: readonly BlockAction[]): number[] {
  return eventLoadAdjustments(revealedEvents(executed));
}

/** Melding in het bulletin wanneer de engine het noodaggregaat ontgrendelt. */
export function generatorUnlockedNews(blockIndex: number): EventOccurrence {
  return occurrence('generator', blockIndex, []);
}
