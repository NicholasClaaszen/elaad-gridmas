import referenceCase from '../REFERENCE_CASE.json';
import { createEmptySchedule } from '../src/domain/scenario';
import type { BlockAction, Schedule } from '../src/domain/types';

export const REFERENCE = referenceCase;
export const referenceSchedule = (): Schedule => referenceCase.schedule.map((a) => ({ ...a, decorationsOff: [...a.decorationsOff] }) as BlockAction);

/** Kopie van het referentieschema met aanpassingen in één blok. */
export function withBlock(schedule: Schedule, blockIndex: number, patch: Partial<BlockAction>): Schedule {
  return schedule.map((a, i) => (i === blockIndex ? { ...a, ...patch } : a));
}

export { createEmptySchedule };
