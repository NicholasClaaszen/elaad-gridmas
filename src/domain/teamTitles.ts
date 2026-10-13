import { BATTERY, CHARGERS } from './scenario';
import type { BlockAction, DecorationId } from './types';

export interface TeamTitle {
  id: string;
  title: string;
  reason: string;
}

const CHOIR_BLOCK = 3;

const countOff = (actions: readonly BlockAction[], id: DecorationId) =>
  actions.filter((a) => a.decorationsOff.includes(id)).length;

/**
 * Teamtitels op basis van wát een team deed, niet van de score: elk team krijgt iets om om te lachen.
 * Volgorde = prioriteit; de eerste is de hoofdtitel. Puur en deterministisch.
 */
const RULES: readonly { id: string; title: string; reason: string; applies: (a: readonly BlockAction[]) => boolean }[] = [
  {
    id: 'dark-pines',
    title: 'De Donkere Dennen',
    reason: 'Minstens vijf keer ging ergens de feestverlichting uit. Gridmas was zelden zo goed te zien vanuit de ruimte.',
    applies: (a) => a.reduce((n, x) => n + x.decorationsOff.length, 0) >= 5,
  },
  {
    id: 'disco-savers',
    title: 'De IJsdisco-redders',
    reason: 'De ijsbaan bleef open tijdens de kerstdisco. Geen enkele glowstick bleef ongebruikt.',
    applies: (a) => !a[CHOIR_BLOCK]?.rinkPaused,
  },
  {
    id: 'choir-guards',
    title: 'Beschermers van het Kerstkoor',
    reason: 'Tijdens het koor bleef de grote boom op het dorpsplein branden. De dirigent heeft niets te klagen.',
    applies: (a) => !a[CHOIR_BLOCK]?.decorationsOff.includes('square'),
  },
  {
    id: 'golden-star',
    title: 'Vrienden van De Gouden Ster',
    reason: 'Het seniorencomplex hield de hele avond zijn lichtjes. Mevrouw De Vries stuurt een kerstkaart.',
    applies: (a) => countOff(a, 'seniors') === 0,
  },
  {
    id: 'battery-bosses',
    title: 'De Batterijbazen',
    reason: `Alle ${BATTERY.capacityKwh} kWh uit de buurtbatterij is gebruikt. Leeg is ook een prestatie.`,
    applies: (a) => a.filter((x) => x.batteryDischarge).length === BATTERY.maxUses,
  },
  {
    id: 'charge-conductors',
    title: 'Dirigenten van het Laadplein',
    reason: `Twee keer gepauzeerd, twee keer ingehaald: ${CHARGERS.maxPauses * CHARGERS.energyPerBlockKwh} kWh netjes door de avond geschoven.`,
    applies: (a) => a.filter((x) => x.chargersPaused).length === CHARGERS.maxPauses,
  },
  {
    id: 'hospital-friends',
    title: 'Vrienden van de Nachtdienst',
    reason: 'De kerstboom bij het ziekenhuis bleef de hele avond aan. Het nachtteam trakteert.',
    applies: (a) => countOff(a, 'hospital') === 0,
  },
];

const FALLBACK: TeamTitle = {
  id: 'grid-keepers',
  title: 'Netwerkers van Gridmas',
  reason: 'Het net bleef heel. Dat is precies waar kerstavond om draait.',
};

/** Hoofdtitel plus maximaal twee extra titels. */
export function teamTitles(actions: readonly BlockAction[], max = 3): TeamTitle[] {
  const earned = RULES.filter((rule) => rule.applies(actions)).map(({ id, title, reason }) => ({ id, title, reason }));
  return (earned.length ? earned : [FALLBACK]).slice(0, max);
}
