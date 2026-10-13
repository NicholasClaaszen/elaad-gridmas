import type { BlockAction, DecorationId, ScenarioBlock, Schedule } from './types';

export const CAPACITY_KW = 100;
export const INITIAL_MORALE = 75;
export const MAX_MORALE = 100;
export const BLOCK_HOURS = 2;

export const BLOCKS: readonly ScenarioBlock[] = [
  { index: 0, label: '14:00-16:00', baselineLoadKw: 75, baseMoraleBonus: 3, phase: 'voorbereiden' },
  { index: 1, label: '16:00-18:00', baselineLoadKw: 115, baseMoraleBonus: 5, phase: 'eerste kerstlichtjes' },
  { index: 2, label: '18:00-20:00', baselineLoadKw: 150, baseMoraleBonus: 8, phase: 'kerstdiner' },
  { index: 3, label: '20:00-22:00', baselineLoadKw: 155, baseMoraleBonus: 8, phase: 'kerstpiek/koor' },
  { index: 4, label: '22:00-00:00', baselineLoadKw: 125, baseMoraleBonus: 4, phase: 'vertrek kerstmarkt' },
  { index: 5, label: '00:00-02:00', baselineLoadKw: 65, baseMoraleBonus: 4, phase: 'nachtelijke afwikkeling' },
];

export const BLOCK_COUNT = BLOCKS.length;

export interface DecorationDefinition {
  id: DecorationId;
  name: string;
  reductionKw: number;
  story: string;
}

export const DECORATIONS: readonly DecorationDefinition[] = [
  {
    id: 'homes',
    name: 'Woonwijk',
    reductionKw: 10,
    story: 'Honderd voortuinen vol rendieren, sneeuwpoppen en één opblaaskerstman die net iets te groot is uitgevallen.',
  },
  {
    id: 'seniors',
    name: 'Seniorencomplex De Gouden Ster',
    reductionKw: 10,
    story: 'De bewoners versieren al sinds oktober. Mevrouw De Vries heeft het telefoonnummer van de burgemeester op snelkeuze.',
  },
  {
    id: 'hospital',
    name: 'Ziekenhuis (alleen feestverlichting)',
    reductionKw: 5,
    story: 'Alleen de lichtjes in de hal en de boom bij de ingang. De zorg zelf draait altijd gewoon door.',
  },
  {
    id: 'square',
    name: 'Dorpsplein en kerstmarkt',
    reductionKw: 15,
    story: 'De grote kerstboom, de kraampjes en het podium van het kerstkoor. Het kloppend hart van de avond.',
  },
];

export const DECORATION_IDS: readonly DecorationId[] = DECORATIONS.map((d) => d.id);
export const DECORATION_BLOCKS: readonly number[] = [1, 2, 3, 4];

export const RINK = {
  name: 'Kerstijsbaan De Gladde Kerst',
  reductionKw: 30,
  allowedBlocks: [1, 2, 3] as readonly number[],
  maxUses: 1,
  story: 'Twee uur de koeling terugschakelen kan precies één keer. De baan sluit dan voor publiek.',
};

export const BATTERY = {
  name: 'Buurtbatterij',
  dischargeKw: 25,
  capacityKwh: 100,
  energyPerBlockKwh: 50,
  allowedBlocks: [1, 2, 3, 4] as readonly number[],
  maxUses: 2,
  story: '100 kWh opgeslagen energie. Elk blok ontladen levert 25 kW, twee uur lang: dat kost 50 kWh.',
};

export const CHARGERS = {
  name: 'Laadplein',
  pauseKw: 20,
  extraKw: 20,
  energyPerBlockKwh: 40,
  pauseBlocks: [1, 2, 3, 4] as readonly number[],
  maxPauses: 2,
  extraBlocks: [0, 5] as readonly number[],
  story: 'Laden pauzeren mag, maar elke gemiste 40 kWh moet vooraf of achteraf worden ingehaald.',
};

export function createEmptyAction(blockIndex: number): BlockAction {
  return {
    blockIndex,
    decorationsOff: [],
    rinkPaused: false,
    batteryDischarge: false,
    chargersPaused: false,
    extraCharging: false,
  };
}

export function createEmptySchedule(): Schedule {
  return BLOCKS.map((b) => createEmptyAction(b.index));
}
