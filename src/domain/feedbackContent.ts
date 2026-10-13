import type { AssetId } from './types';

export interface FeedbackText {
  headline: string;
  text: string;
}

/** Positief basisbericht per tijdsblok (index 0 t/m 5). */
export const ATMOSPHERE_FEEDBACK: readonly FeedbackText[] = [
  {
    headline: 'De voorbereidingen lopen op rolletjes',
    text: 'Kraampjes gaan open, de glühwein warmt op en de eerste kerstmuts is al gesignaleerd. Gridmas is er klaar voor.',
  },
  {
    headline: 'De eerste kerstlichtjes gaan aan',
    text: 'Kinderen drukken hun neus tegen de etalageruiten. Ergens klinkt voor de twaalfde keer vandaag Last Christmas.',
  },
  {
    headline: 'Kerstdiner in heel Gridmas',
    text: "Ovens draaien, gourmetstellen sissen en opa vertelt het verhaal over de sneeuwstorm van '79 weer.",
  },
  {
    headline: 'De kerstpiek is begonnen',
    text: 'Het kerstkoor stemt af, de ijsdisco draait op volle toeren en heel Gridmas zingt mee, al dan niet zuiver.',
  },
  {
    headline: 'Gezellig napraten op de markt',
    text: 'De kerstmarkt loopt langzaam leeg, sjaals worden gezocht en iemand probeert nog een laatste oliebol te bemachtigen.',
  },
  {
    headline: 'Stille nacht in Gridmas',
    text: 'Het dorp slaapt. De laadpalen zoemen tevreden en de kerstman controleert zijn route nog één keer.',
  },
];

export type PenaltyAssetId = Exclude<AssetId, 'battery'>;

/** Bericht per strafgevende actie en bloknummer. Alleen geldige combinaties zijn gevuld. */
export const ACTION_FEEDBACK: Record<PenaltyAssetId, Partial<Record<number, FeedbackText>>> = {
  homes: {
    1: {
      headline: 'Donkere voortuinen in de schemering',
      text: 'De rendieren in de woonwijk bleven nog even uit. De meeste bewoners waren gelukkig nog boodschappen aan het doen.',
    },
    2: {
      headline: 'Kerstdiner in het halfduister',
      text: 'Precies tijdens het hoofdgerecht ging de tuinverlichting uit. De buurman met de opblaaskerstman eist een verklaring.',
    },
    3: {
      headline: 'Geen lichtjes voor de buurtwandeling',
      text: 'Families wilden na het diner een rondje lichtjes kijken, maar troffen een donkere wijk aan. De buurtapp ontploft.',
    },
    4: {
      headline: 'Woonwijk gaat vroeg op stand-by',
      text: 'De meeste mensen lagen al onder een dekentje. Alleen de hond van nummer 12 merkte dat de rendieren uit waren.',
    },
  },
  seniors: {
    1: {
      headline: 'De Gouden Ster zonder glans',
      text: 'Het kerstdiner bij De Gouden Ster begon zonder feestverlichting. Mevrouw De Vries heeft de burgemeester al gebeld.',
    },
    2: {
      headline: 'Kerstdiner bij kaarslicht (niet vrijwillig)',
      text: 'Midden in de hoofdmaaltijd doofde de feestverlichting in De Gouden Ster. De bewonerscommissie belegt een spoedvergadering.',
    },
    3: {
      headline: 'Kerstbingo in de schemering',
      text: 'De bingo ging gewoon door, maar zonder lichtjes voelde het niet als kerst. Meneer Jansen las de nummers voor met een zaklamp.',
    },
    4: {
      headline: 'Rustige nacht in De Gouden Ster',
      text: 'De gemeenschappelijke ruimtes zijn inmiddels leeg. Een nachtwaker constateert dat de boom uit is.',
    },
  },
  hospital: {
    1: {
      headline: 'Sombere entree bij het ziekenhuis',
      text: 'Bezoekers met kerstbloemen liepen een donkere hal binnen. De zorg ging gewoon door, maar de sfeer kreeg een knauw.',
    },
    2: {
      headline: 'Kerstmaal zonder twinkeling',
      text: 'Patiënten en personeel aten hun kerstmaaltijd zonder lichtjes in de boom. De zorg draaide door; de stemming wat minder.',
    },
    3: {
      headline: 'Bezoekuur in het donker',
      text: 'Juist tijdens het avondbezoek was de boom bij de ingang uit. Een verpleegkundige hing uit protest haar eigen lichtsnoer op.',
    },
    4: {
      headline: 'Nachtdienst zonder kerstsfeer',
      text: 'Het nachtteam had zich verheugd op de verlichte hal. De koffie smaakte ineens een stuk minder feestelijk.',
    },
  },
  square: {
    1: {
      headline: 'Kerstmarkt opent in het donker',
      text: 'De eerste bezoekers zochten de kraampjes op de tast. De oliebollenkraam verkocht vooral zaklampjes.',
    },
    2: {
      headline: 'De grote boom doofde tijdens het diner',
      text: 'Wie tussen de gangen door even naar het plein liep, zag een donkere boom. Op sociale media trending: #GridmasGrinch.',
    },
    3: {
      headline: 'Het koor zingt in het donker',
      text: 'Net tijdens het optreden van het kerstkoor doofde de grote boom. De dirigent spreekt van sabotage.',
    },
    4: {
      headline: 'Laatste ronde, lichten uit',
      text: 'De kraampjes waren al bijna dicht. Alleen de glühweinkraam mopperde dat de laatste klanten hun bekers niet meer terugvonden.',
    },
  },
  rink: {
    1: {
      headline: 'IJsbaan dicht voor de families',
      text: 'Tientallen kinderen stonden met hun schaatsen klaar voor de middagsessie. De ijsmeester deelde chocolademelk uit als troostprijs.',
    },
    2: {
      headline: 'IJsbaan even dicht tijdens het diner',
      text: 'Veel bezoekers zaten toch aan hun kerstdiner. De ijsmeester kon voor het eerst in jaren rustig eten.',
    },
    3: {
      headline: 'Kerstdisco op het ijs afgelast',
      text: 'De kerstdisco op het ijs is afgelast. De DJ zit met 400 ongebruikte glowsticks.',
    },
  },
  chargers: {
    1: {
      headline: 'Laadplein even op pauze',
      text: "Bijna niemand had haast; de meeste auto's stonden toch tot morgen geparkeerd. Eén taxichauffeur bromde iets over kerstgeest.",
    },
    2: {
      headline: 'Laden wacht op het toetje',
      text: 'Een paar bezoekers zagen in de app dat hun auto niet laadde. Ze besloten er na de kerstpudding over te klagen.',
    },
    3: {
      headline: "Accu's blijven steken",
      text: 'Wie na het koor vroeg naar huis wilde, zag het laadpercentage niet stijgen. Een tante zoekt al naar de laatste trein.',
    },
    4: {
      headline: 'Vertrek met halflege accu',
      text: "Bezoekers willen vertrekken, maar de accu's zijn niet vol. Een oom heeft aangekondigd volgend jaar met de diesel te komen.",
    },
  },
};
