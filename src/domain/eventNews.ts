import type { NewsEventId } from './types';

export interface NewsText {
  headline: string;
  text: string;
}

/** Nieuws over events. Bewust zonder moraal: deze teksten mogen in de planner verschijnen. */
export const EVENT_NEWS: Record<NewsEventId, NewsText> = {
  snow: {
    headline: 'Sneeuwbui boven Gridmas',
    text: 'Dikke vlokken tijdens het kerstdiner. Iedereen blijft binnen en de ijsbaan koelt zichzelf. Tussen 18:00 en 20:00 is er 10 kW minder vraag.',
  },
  'santa-rumour': {
    headline: 'Gerucht: rendier gespot bij het laadplein',
    text: 'Een buurman zweert dat hij een rendier met een verlengsnoer zag. Volgens de buurtapp zit iemand in een rode jas krap in zijn stroom.',
  },
  santa: {
    headline: 'De Kerstman komt zijn slee laden',
    text: 'Het is bevestigd: tussen 22:00 en middernacht laadt de Kerstman zijn slee op het laadplein. Dat vraagt 20 kW extra. Nee zeggen tegen de Kerstman doet niemand.',
  },
  exodus: {
    headline: 'De Grote Uittocht',
    text: 'In de donkere woonwijk dachten bewoners dat het feest voorbij was. Ze lopen massaal naar het dorpsplein. Daar is het volgende blok 15 kW extra nodig.',
  },
  'seniors-outing': {
    headline: 'De Gouden Ster gaat op pad',
    text: 'Zonder lichtjes thuis boekt De Gouden Ster de buurtbus naar de kerstmarkt. Om 18:00-20:00 draaien de kramen 10 kW harder.',
  },
  'disco-move': {
    headline: 'De ijsdisco verhuist',
    text: 'De DJ van de ijsbaan geeft niet op en bouwt zijn installatie op het dorpsplein op. Tussen 22:00 en middernacht kost dat 10 kW extra.',
  },
  'self-dimmers': {
    headline: 'Gridmas dimt mee',
    text: 'Dankzij jullie aankondiging zetten bewoners om 20:00-22:00 zelf een deel van hun lichtjes uit. Dat scheelt 10 kW.',
  },
  'early-birds': {
    headline: 'Vroege vogels op het laadplein',
    text: 'Wie alvast heeft geladen, vertrekt eerder naar de schoonfamilie. Tussen 22:00 en middernacht is er 10 kW minder vraag.',
  },
  generator: {
    headline: 'Noodaggregaat ontgrendeld',
    text: 'Het dorp zit klem: zonder hulp is de rest van de avond niet meer binnen 100 kW te houden. Het noodaggregaat levert 20 kW per blok. Het ronkt, het stinkt en iedereen hoort het.',
  },
};

export const EVENT_ICONS: Record<NewsEventId, string> = {
  snow: '❄️',
  'santa-rumour': '🦌',
  santa: '🎅',
  exodus: '🚶',
  'seniors-outing': '🚌',
  'disco-move': '🪩',
  'self-dimmers': '🕯️',
  'early-birds': '🚗',
  generator: '⛽',
};
