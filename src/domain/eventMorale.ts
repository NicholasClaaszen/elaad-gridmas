import { messageOf } from './scenario';
import type { BlockAction, DecorationId, MoraleEvent, MoraleEventId } from './types';

/**
 * Verborgen moraalreacties op events. Alleen voor het nieuwsbulletin van een uitgevoerd blok;
 * nooit importeren in planningscomponenten.
 */
const EVENT_MORALE: Record<MoraleEventId, { delta: number; headline: string; text: string }> = {
  'seniors-grumpy': {
    delta: -3,
    headline: 'Busreis naar een donker plein',
    text: 'De Gouden Ster stapte vol verwachting uit de buurtbus. Het plein was donker. Mevrouw De Vries heeft de chauffeur gevraagd meteen om te keren.',
  },
  stargazers: {
    delta: 3,
    headline: 'Sterrenkijkers in de Kerkstraat',
    text: 'Woonwijk en De Gouden Ster donker: de hele straat staat buiten naar de sterren te kijken. Iemand meent de slee te zien. Het is een vliegtuig. Niemand zegt het hardop.',
  },
  'nurse-choir': {
    delta: 3,
    headline: 'Het zusterkoor zingt',
    text: 'De lichtjes bij het ziekenhuis brandden de hele avond. Om middernacht zingt de nachtdienst op het voorplein. Op de afdeling wordt zachtjes meegeneuried.',
  },
  honking: {
    delta: -4,
    headline: 'Toeterende ooms',
    text: 'Twee laadpauzes op rij: bij het laadplein staat een rij. Een oom toetert de eerste regel van Jingle Bells. Een andere oom toetert de tweede. Vals.',
  },
  'app-storm': {
    delta: -3,
    headline: 'De buurtapp ontploft',
    text: 'Meerdere plekken tegelijk donker, zonder enige aankondiging. In de buurtapp verschijnen 214 berichten, waarvan 3 over de stroom en 211 over wie de vorige keer de glühwein heeft betaald.',
  },
  'generator-used': {
    delta: -10,
    headline: 'Het aggregaat ronkt',
    text: 'Het noodaggregaat houdt het licht aan, maar overstemt het kerstkoor. De dieselgeur mengt zich met die van de oliebollen. Niet op een goede manier.',
  },
};

function line(eventId: MoraleEventId, blockIndex: number): MoraleEvent {
  const { delta, headline, text } = EVENT_MORALE[eventId];
  return { assetId: 'event', eventId, blockIndex, delta, headline, text };
}

const isDark = (a: BlockAction | undefined, id: DecorationId) => a?.decorationsOff.includes(id) ?? false;

/** Eventmoraal voor één uitgevoerd blok. `history` = alle eerder uitgevoerde acties (lengte = blockIndex). */
export function eventMoraleEvents(blockIndex: number, action: BlockAction, history: readonly BlockAction[]): MoraleEvent[] {
  const notice = messageOf(blockIndex === 0 ? action : history[0]) === 'notice';
  const events: MoraleEvent[] = [];

  if (blockIndex === 2 && !notice && isDark(history[1], 'seniors') && isDark(action, 'square')) events.push(line('seniors-grumpy', blockIndex));
  if (blockIndex === 4 && isDark(action, 'homes') && isDark(action, 'seniors')) events.push(line('stargazers', blockIndex));
  if (blockIndex === 5 && ![...history, action].some((a) => isDark(a, 'hospital'))) events.push(line('nurse-choir', blockIndex));
  if (action.chargersPaused && history[blockIndex - 1]?.chargersPaused) events.push(line('honking', blockIndex));
  if (!notice && action.decorationsOff.length >= 2) events.push(line('app-storm', blockIndex));
  if (action.emergencyGenerator) events.push(line('generator-used', blockIndex));
  return events;
}
