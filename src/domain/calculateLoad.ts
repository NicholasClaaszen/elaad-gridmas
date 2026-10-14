import { BATTERY, BLOCKS, CHARGERS, DECORATIONS, GENERATOR, RINK } from './scenario';
import type { BlockAction, Schedule } from './types';

/** Netbelasting (kW) van één blok volgens SPEC §2.5, plus de bekende eventcorrectie. Puur en deterministisch. */
export function calculateLoad(blockIndex: number, action: BlockAction, adjustmentKw = 0): number {
  const block = BLOCKS[blockIndex];
  if (!block) throw new RangeError(`Onbekend tijdsblok ${blockIndex}`);

  const decorationReduction = DECORATIONS.filter((d) => action.decorationsOff.includes(d.id)).reduce(
    (sum, d) => sum + d.reductionKw,
    0,
  );

  return (
    block.baselineLoadKw +
    (action.extraCharging ? CHARGERS.extraKw : 0) -
    (action.chargersPaused ? CHARGERS.pauseKw : 0) -
    (action.batteryDischarge ? BATTERY.dischargeKw : 0) -
    (action.rinkPaused ? RINK.reductionKw : 0) -
    decorationReduction +
    adjustmentKw -
    (action.emergencyGenerator ? GENERATOR.reductionKw : 0)
  );
}

export function calculateLoads(schedule: Schedule, adjustments: readonly number[] = []): number[] {
  return schedule.map((action, i) => calculateLoad(i, action, adjustments[i] ?? 0));
}

/** Resterende batterij-energie (kWh) ná elk blok. Kan negatief worden bij een ongeldig programma. */
export function batteryRemainingAfterEachBlock(schedule: Schedule): number[] {
  let remaining = BATTERY.capacityKwh;
  return schedule.map((action) => {
    if (action.batteryDischarge) remaining -= BATTERY.energyPerBlockKwh;
    return remaining;
  });
}

/** Netto uitgestelde laadenergie: +40 per extra sessie, -40 per pauze. Moet 0 zijn. */
export function chargingNetKwh(schedule: Schedule): number {
  return schedule.reduce(
    (sum, a) =>
      sum + (a.extraCharging ? CHARGERS.energyPerBlockKwh : 0) - (a.chargersPaused ? CHARGERS.energyPerBlockKwh : 0),
    0,
  );
}
