import type { Schedule } from './types';

/**
 * Het referentieschema uit SPEC §8 / REFERENCE_CASE.json, voor de organisatorendemo.
 * Een test bewaakt dat dit identiek blijft aan de fixture.
 */
export function referenceDemoSchedule(): Schedule {
  return [
    { blockIndex: 0, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: true },
    { blockIndex: 1, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: true, extraCharging: false },
    { blockIndex: 2, decorationsOff: [], rinkPaused: true, batteryDischarge: true, chargersPaused: false, extraCharging: false },
    { blockIndex: 3, decorationsOff: ['seniors'], rinkPaused: false, batteryDischarge: true, chargersPaused: true, extraCharging: false },
    { blockIndex: 4, decorationsOff: ['seniors', 'square'], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: false },
    { blockIndex: 5, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: true },
  ];
}
