import { BATTERY, CAPACITY_KW } from './scenario';
import type { DecorationId, ExecutedBlock } from './types';

/** Fysieke toestand van de miniatuur na een uitgevoerd blok (SPEC §7). */
export interface Scene {
  blockIndex: number;
  zoneLightsOn: Record<DecorationId, boolean>;
  rinkOpen: boolean;
  chargers: 'charging' | 'paused' | 'extra-charging';
  batteryPercent: 100 | 50 | 0;
  netStatus: 'safe' | 'overload';
}

function toBatteryPercent(kwh: number): Scene['batteryPercent'] {
  const percent = Math.round((kwh / BATTERY.capacityKwh) * 100);
  if (percent >= 100) return 100;
  if (percent >= 50) return 50;
  return 0;
}

export function buildScene(executed: ExecutedBlock): Scene {
  const { action } = executed;
  const off = (id: DecorationId) => action.decorationsOff.includes(id);
  return {
    blockIndex: action.blockIndex,
    zoneLightsOn: { homes: !off('homes'), seniors: !off('seniors'), hospital: !off('hospital'), square: !off('square') },
    rinkOpen: !action.rinkPaused,
    chargers: action.chargersPaused ? 'paused' : action.extraCharging ? 'extra-charging' : 'charging',
    batteryPercent: toBatteryPercent(executed.batteryAfterKwh),
    netStatus: executed.loadKw > CAPACITY_KW ? 'overload' : 'safe',
  };
}

/** Ruststand: alle lichtjes aan, batterij vol, nog geen blok gespeeld. */
export function idleScene(): Scene {
  return {
    blockIndex: -1,
    zoneLightsOn: { homes: true, seniors: true, hospital: true, square: true },
    rinkOpen: true,
    chargers: 'charging',
    batteryPercent: 100,
    netStatus: 'safe',
  };
}
