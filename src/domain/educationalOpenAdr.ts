import { BATTERY, BLOCKS, CHARGERS, DECORATIONS, RINK } from './scenario';
import type { AssetId, Schedule } from './types';

/**
 * Educatieve projectie van een Gridmas-programma op OpenADR 3.1-begrippen (Program/Event/Interval).
 * Dit is uitdrukkelijk GEEN conformiteit-gevalideerde API-payload.
 */
export const OPENADR_DISCLAIMER = 'OpenADR 3.1 conceptweergave - niet conformiteit-gevalideerde API-payload';
export const PROGRAM_NAME = 'GRIDMAS-CHRISTMAS-EVE';

/** Fictieve kerstavond; alleen voor leesbare tijdstempels, nooit voor de spelregels. */
const EVENT_DATE = { year: 2026, month: 12, day: 24 };
const FIRST_BLOCK_HOUR = 14;

export interface EducationalInterval {
  id: number;
  payloads: { type: string; values: (number | string)[] }[];
}

export interface EducationalEvent {
  programID: string;
  eventName: string;
  targets: { type: 'RESOURCE_NAME'; values: string[] }[];
  intervalPeriod: { start: string; duration: 'PT2H' };
  intervals: EducationalInterval[];
  /** Leesbare uitleg voor spelers; geen OpenADR-veld. */
  description: string;
}

export interface EducationalProgram {
  label: typeof OPENADR_DISCLAIMER;
  program: { id: string; programName: string; programLongName: string };
  events: EducationalEvent[];
}

function blockStart(blockIndex: number): string {
  const hour = FIRST_BLOCK_HOUR + blockIndex * 2;
  const day = EVENT_DATE.day + Math.floor(hour / 24);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${EVENT_DATE.year}-${pad(EVENT_DATE.month)}-${pad(day)}T${pad(hour % 24)}:00:00`;
}

function event(blockIndex: number, assetId: AssetId, resource: string, payloadType: string, value: number, description: string): EducationalEvent {
  return {
    programID: PROGRAM_NAME,
    eventName: `${PROGRAM_NAME}-B${blockIndex}-${assetId}`,
    targets: [{ type: 'RESOURCE_NAME', values: [resource] }],
    intervalPeriod: { start: blockStart(blockIndex), duration: 'PT2H' },
    intervals: [{ id: 0, payloads: [{ type: payloadType, values: [value] }] }],
    description: `${BLOCKS[blockIndex]!.label}: ${description}`,
  };
}

export function projectToEducationalOpenAdr(schedule: Schedule): EducationalProgram {
  const events: EducationalEvent[] = [];
  schedule.forEach((action, i) => {
    for (const decoration of DECORATIONS) {
      if (action.decorationsOff.includes(decoration.id)) {
        events.push(event(i, decoration.id, `gridmas-${decoration.id}-feestverlichting`, 'SIMPLE', 1,
          `${decoration.name}: feestverlichting uit (-${decoration.reductionKw} kW).`));
      }
    }
    if (action.rinkPaused) {
      events.push(event(i, 'rink', 'gridmas-ijsbaan-koeling', 'SIMPLE', 1,
        `${RINK.name}: koeling teruggeschakeld, baan dicht (-${RINK.reductionKw} kW).`));
    }
    if (action.batteryDischarge) {
      events.push(event(i, 'battery', 'gridmas-buurtbatterij', 'DISPATCH_SETPOINT', BATTERY.dischargeKw,
        `${BATTERY.name}: ontladen met ${BATTERY.dischargeKw} kW (${BATTERY.energyPerBlockKwh} kWh).`));
    }
    if (action.chargersPaused) {
      events.push(event(i, 'chargers', 'gridmas-laadplein', 'IMPORT_CAPACITY_LIMIT', 0,
        `${CHARGERS.name}: extra afname gepauzeerd (-${CHARGERS.pauseKw} kW, ${CHARGERS.energyPerBlockKwh} kWh uitgesteld).`));
    }
    if (action.extraCharging) {
      events.push(event(i, 'chargers', 'gridmas-laadplein', 'DISPATCH_SETPOINT_RELATIVE', CHARGERS.extraKw,
        `${CHARGERS.name}: extra laadsessie (+${CHARGERS.extraKw} kW, +${CHARGERS.energyPerBlockKwh} kWh).`));
    }
  });

  return {
    label: OPENADR_DISCLAIMER,
    program: {
      id: 'gridmas-program-1',
      programName: PROGRAM_NAME,
      programLongName: 'Merry Gridmas - Keep the lights on! (fictief educatief programma)',
    },
    events,
  };
}
