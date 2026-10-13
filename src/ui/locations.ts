import { BATTERY, CAPACITY_KW, CHARGERS, DECORATIONS, DECORATION_BLOCKS, RINK } from '../domain/scenario';
import type { Scene } from '../domain/scene';
import type { AssetId, BlockAction } from '../domain/types';

export interface Location {
  id: AssetId;
  name: string;
  shortName: string;
  category: 'dorp' | 'flex';
  type: string;
  powerKw: number;
  story: string;
  rules: string[];
  activity: string;
}

const decorationNames = {
  homes: ['Woonwijk Winterstraat', 'Winterstraat'],
  seniors: ['Seniorencomplex De Gouden Ster', 'De Gouden Ster'],
  hospital: ['Ziekenhuis Sint Licht', 'Sint Licht'],
  square: ['Dorpsplein Gridmas', 'Dorpsplein'],
} as const;

const decorationInfo = {
  homes: { story: 'In de Winterstraat past nog net een auto tussen alle lichtgevende rendieren. Binnen wordt gekookt; na het eten gaat de buurt een rondje lichtjes kijken.', activity: 'Kerstdiner rond 18:00. Daarna een wandeling door de wijk.' },
  seniors: { story: 'De Gouden Ster is al sinds oktober versierd. Om 17:00 schuiven de bewoners aan voor het kerstdiner. Daarna is er muziek, familiebezoek en bingo. Mevrouw De Vries bewaakt de planning.', activity: 'Diner vanaf 17:00, daarna bingo en bezoek. Vanaf 22:00 wordt het stil.' },
  hospital: { story: 'Ook wie kerst in het ziekenhuis doorbrengt, verdient een mooie boom. De lichtjes in de hal verwelkomen patiënten, personeel en familie. Je schakelt alleen de kerstversiering uit; de zorg en basisverlichting blijven aan.', activity: 'In de avond komt familie op bezoek. Het nachtteam werkt door.' },
  square: { story: 'Hier staat de grootste boom van Gridmas. De kerstmarkt verkoopt oliebollen en glühwein; het koor heeft weken geoefend. De dirigent wil vooral dat iemand zijn solo hoort.', activity: 'Kerstmarkt van 16:00 tot 22:00. Kerstkoor van 20:00 tot 22:00.' },
};

export const LOCATIONS: readonly Location[] = [
  ...DECORATIONS.map((d): Location => ({
    id: d.id, name: decorationNames[d.id][0], shortName: decorationNames[d.id][1],
    category: 'dorp', type: 'Kerstverlichting', powerKw: d.reductionKw,
    ...decorationInfo[d.id],
    rules: ['Alleen feestverlichting, geen basisvoorzieningen.', 'Aan of uit per blok tussen 16:00 en 00:00.'],
  })),
  { id: 'rink', name: 'IJsbaan De Gladde Kerst', shortName: 'De Gladde Kerst', category: 'flex', type: 'Tijdelijk sluiten', powerKw: RINK.reductionKw,
    story: 'In de middag oefenen kinderen hun eerste rondjes. Tijdens het eten is het rustig, maar om 20:00 begint de ijsdisco. De dj heeft een rookmachine meegenomen. Niemand weet waarom.',
    activity: 'Families van 16:00 tot 18:00. Rustiger tijdens het diner. IJsdisco van 20:00 tot 22:00.',
    rules: [`Maximaal ${RINK.maxUses} blok van twee uur dicht.`, 'Alleen tussen 16:00 en 22:00. De koeling gaat dan omlaag.'] },
  { id: 'chargers', name: 'Laadplein Gridmas', shortName: 'Laadplein', category: 'flex', type: 'Laden verschuiven', powerKw: CHARGERS.pauseKw,
    story: 'De bezoekers eten, hun auto’s laden. Je kunt het laden even pauzeren, zolang je de gemiste energie op een ander moment levert. Tegen het einde van de avond staan de eerste chauffeurs weer bij hun auto.',
    activity: 'Bezoekers komen in de middag aan en vertrekken na de kerstmarkt.',
    rules: [`Maximaal ${CHARGERS.maxPauses} pauzes tussen 16:00 en 00:00.`, `Elke pauze verschuift ${CHARGERS.energyPerBlockKwh} kWh.`, `Extra laden: +${CHARGERS.extraKw} kW om 14:00–16:00 of 00:00–02:00. Per pauze één extra laadsessie.`] },
  { id: 'battery', name: 'Buurtbatterij De Kerstreserve', shortName: 'De Kerstreserve', category: 'flex', type: 'Energieopslag', powerKw: BATTERY.dischargeKw,
    story: 'Een volle batterij, speciaal voor de drukste uren. Geen gedoe met bezoekers of openingstijden: hij levert stroom zolang er nog energie in zit.',
    activity: 'Beschikbaar tussen 16:00 en 00:00.',
    rules: [`Begint met ${BATTERY.capacityKwh} kWh; maximaal ${BATTERY.maxUses} blokken inzetbaar.`, `Elk blok levert ${BATTERY.dischargeKw} kW en gebruikt ${BATTERY.energyPerBlockKwh} kWh.`, 'Tijdens dit spel wordt de batterij niet bijgeladen.'] },
];

export function projectPlanningScene(action: BlockAction, batteryKwh: number, loadKw: number): Scene {
  return {
    blockIndex: action.blockIndex,
    zoneLightsOn: { homes: !action.decorationsOff.includes('homes'), seniors: !action.decorationsOff.includes('seniors'), hospital: !action.decorationsOff.includes('hospital'), square: !action.decorationsOff.includes('square') },
    rinkOpen: !action.rinkPaused,
    chargers: action.chargersPaused ? 'paused' : action.extraCharging ? 'extra-charging' : 'charging',
    batteryPercent: batteryKwh >= BATTERY.capacityKwh ? 100 : batteryKwh >= BATTERY.energyPerBlockKwh ? 50 : 0,
    netStatus: loadKw > CAPACITY_KW ? 'overload' : 'safe',
  };
}

export function locationStatus(id: AssetId, scene: Scene): string {
  if (id === 'battery') return `Batterij ${scene.batteryPercent}%`;
  if (id === 'rink') return scene.rinkOpen ? 'IJsbaan open' : 'IJsbaan gesloten';
  if (id === 'chargers') return { charging: 'Laden normaal', paused: 'Laden gepauzeerd', 'extra-charging': 'Extra laden' }[scene.chargers];
  return scene.zoneLightsOn[id] ? 'Verlichting aan' : 'Verlichting uit';
}

export function locationActive(id: AssetId, scene: Scene): boolean {
  if (id === 'battery') return scene.batteryPercent > 0;
  if (id === 'rink') return scene.rinkOpen;
  if (id === 'chargers') return scene.chargers !== 'paused';
  return scene.zoneLightsOn[id];
}

export function availableInBlock(id: AssetId, index: number): boolean {
  if (id === 'battery') return BATTERY.allowedBlocks.includes(index);
  if (id === 'rink') return RINK.allowedBlocks.includes(index);
  if (id === 'chargers') return CHARGERS.pauseBlocks.includes(index) || CHARGERS.extraBlocks.includes(index);
  return DECORATION_BLOCKS.includes(index);
}
