import type { AssetId } from './types';

export interface FeedbackText {
  headline: string;
  text: string;
}

/** Dorpsnieuws per tijdsblok, onafhankelijk van de gekozen maatregelen. */
export const ATMOSPHERE_FEEDBACK: readonly FeedbackText[] = [
  {
    headline: "Kraam 4 heeft de stekker gevonden",
    text: "De marktkooplui bouwen op. Er zijn drie verlengsnoeren zoek en iemand heeft de glühwein al geproefd. Voor de kwaliteitscontrole, uiteraard.",
  },
  {
    headline: "Gridmas trekt de foute truien aan",
    text: "De eerste bezoekers zijn binnen. Bij de oliebollenkraam vraagt iemand of poedersuiker ook als sneeuw telt. De jury beraadt zich.",
  },
  {
    headline: "Gourmetlucht boven Gridmas",
    text: "Aan tafel wordt bijgepraat, door elkaar heen gepraat en gevraagd wie het gourmetpannetje van oom Peter heeft gezien. Het ligt nog op zijn bord.",
  },
  {
    headline: "Het koor zet in. Ongeveer tegelijk.",
    text: "De dirigent telt af. De tenoren beginnen een tel te vroeg, de sopranen zingen gewoon harder. Het publiek klapt enthousiast mee op een derde ritme.",
  },
  {
    headline: "Nog eentje dan",
    text: "De markt is dicht, maar niemand heeft haast met afscheid nemen. Bij de uitgang houdt één bezoeker drie gesprekken en een zak oliebollen tegelijk gaande.",
  },
  {
    headline: "Alleen de afwas is nog wakker",
    text: "Gridmas gaat slapen. In de buurtapp verschijnt nog één foto van een kerstdiner. Niemand durft te vragen waarom de spruitjes paars zijn.",
  },
];

export type PenaltyAssetId = Exclude<AssetId, 'battery'>;

/** Alleen berichten voor acties die in dit blok daadwerkelijk gevolgen hebben. */
export const ACTION_FEEDBACK: Record<PenaltyAssetId, Partial<Record<number, FeedbackText>>> = {
  homes: {
    1: {
      headline: "Rudolf heeft een vrije middag",
      text: "De tuinverlichting in de Winterstraat blijft uit. Nummer 12 vraagt of zijn rendier stuk is. De buurman wijst naar de rest van de straat. Dat scheelt een rit naar de bouwmarkt.",
    },
    2: {
      headline: "Opblaaskerstman verliest zijn podium",
      text: "Het diner staat op tafel, maar buiten blijft de kerstversiering donker. Nummer 12 had net iedereen voor het raam verzameld voor zijn nieuwe lichtshow. Alleen de oven piept.",
    },
    3: {
      headline: "Lichtjesroute wordt rondje om het blok",
      text: "Zes gezinnen wandelen door de Winterstraat om de kerstversiering te bekijken. Alles staat uit. In de buurtapp volgen 38 berichten en een foto van een zwart vlak.",
    },
    4: {
      headline: "Nummer 12 mist zijn rendier",
      text: "De tuinlichtjes gaan uit. De meeste buren zitten al op de bank. Nummer 12 kijkt toch even door het raam: “Hij stond er zo gezellig bij.”",
    },
  },
  seniors: {
    1: {
      headline: "Mevrouw De Vries belt door",
      text: "Het diner in De Gouden Ster begint met een onverlichte kerstboom. Mevrouw De Vries belt de burgemeester. Zijn voicemail wenst haar prettige feestdagen. Dat had hij beter niet kunnen doen.",
    },
    2: {
      headline: "Bewonerscommissie slaat het toetje over",
      text: "Tijdens het kerstdiner gaat de feestverlichting uit. De bewoners schuiven hun stoelen bij elkaar voor een spoedoverleg. De notulen zijn kort: “Dit. Nooit. Meer.”",
    },
    3: {
      headline: "Bingo met een boze ondertoon",
      text: "De kerstlichtjes zijn uit bij De Gouden Ster. De bingo gaat door, maar bij elk nummer roept meneer Jansen “en de boom dan?”. Hij heeft nog geen volle kaart, wel bijval.",
    },
    4: {
      headline: "Boom uit, pantoffels aan",
      text: "De feestverlichting in De Gouden Ster gaat uit. De zaal is al leeg. De nachtwaker haalt zijn schouders op en eet het laatste kerstkransje.",
    },
  },
  hospital: {
    1: {
      headline: "Die boom stond toch net nog aan?",
      text: "De kerstversiering bij Sint Licht is uit. Een bezoeker legt zijn kerstboeket ernaast en vindt het maar kaal. De halverlichting en alle zorg blijven gewoon aan.",
    },
    2: {
      headline: "Een kerstboom zonder kerst",
      text: "Patiënten en personeel eten hun kerstmaaltijd naast een boom zonder lichtjes. “Dan hadden we ook een ficus kunnen neerzetten”, zegt iemand. De zorg draait door, de kerstsfeer krijgt een tik.",
    },
    3: {
      headline: "Familiefoto naast een kale boom",
      text: "Tijdens het avondbezoek is de feestverlichting bij Sint Licht uit. Een familie maakt toch een foto bij de boom. “Volgend jaar nemen we zelf lampjes mee.” De zorg en basisverlichting blijven aan.",
    },
    4: {
      headline: "Nachtteam mist de lichtjes",
      text: "De nachtploeg komt binnen en ziet de kerstversiering uit staan. Een verpleegkundige hangt een papieren ster aan de koffiemachine. “Iets moet hier nog kerst uitstralen.” Alle zorg blijft gewoon doorgaan.",
    },
  },
  square: {
    1: {
      headline: "Kerstboom zoekt uitstraling",
      text: "De kerstmarkt opent met de feestverlichting uit. De grote boom lijkt vooral heel veel boom. Een bezoeker vraagt wanneer het aansteken begint. De marktmeester kijkt naar zijn schoenen.",
    },
    2: {
      headline: "Selfies met een spar",
      text: "De boom en feestverlichting op het dorpsplein staan uit. Bezoekers komen tussen de gangen door voor de jaarlijkse kerstfoto. Met flits zien ze vooral zichzelf en zeventien meter onversierde naalden.",
    },
    3: {
      headline: "Dirigent eist een toegift mét licht",
      text: "Het koor treedt op, maar de grote boom en feestverlichting staan uit. De dirigent stopt na het eerste lied. “We hebben zes weken gerepeteerd. Voor een struik.” Het applaus is voor hem.",
    },
    4: {
      headline: "Markt dicht, licht uit",
      text: "De kerstversiering op het plein gaat uit. De kraampjes zijn al gesloten. Eén verkoper wilde nog een foto van zijn kraam en vraagt of het heel even terug kan.",
    },
  },
  rink: {
    1: {
      headline: "Schaatsen aan. Hek dicht.",
      text: "De Gladde Kerst sluit precies als de families aankomen. Een vader probeert uit te leggen dat warme chocolademelk óók een uitje is. Zijn dochter houdt haar schaatsen aan. Uit principe.",
    },
    2: {
      headline: "IJsmeester eet warm",
      text: "De ijsbaan is dicht tijdens het kerstdiner. Een paar bezoekers moeten hun rondjes uitstellen. De ijsmeester zit voor het eerst deze week aan tafel voordat de jus een vel krijgt.",
    },
    3: {
      headline: "DJ met 400 glowsticks zoekt publiek",
      text: "De ijsdisco gaat niet door: De Gladde Kerst is gesloten. De dj draait één nummer voor de ijsmeester. Die vraagt of het zachter kan. Buiten staan de schaatsers klaar voor een feest dat niet begint.",
    },
  },
  chargers: {
    1: {
      headline: "Auto wacht, chauffeur eet oliebol",
      text: "Het laadplein pauzeert. De meeste bezoekers blijven nog uren, dus weinig haast. Eén chauffeur ververst zijn laadapp drie keer en besluit dan maar iets te eten.",
    },
    2: {
      headline: "Laden na het toetje, graag",
      text: "De auto’s laden even niet. Een bezoeker wil na het diner meteen weg en ziet het percentage stilstaan. Hij neemt nog een toetje, maar houdt zijn jas alvast aan.",
    },
    3: {
      headline: "Nog steeds 43 procent",
      text: "Na het koor willen de eerste bezoekers vertrekken. Het laadplein staat op pauze. Een tante loopt naar haar auto, kijkt in de app en loopt terug. Ze heeft het koor nu wel gehoord.",
    },
    4: {
      headline: "Oom Henk blijft. Tegen zijn zin.",
      text: "De bezoekers willen naar huis, maar het laden is gepauzeerd. Oom Henk had zijn afscheid al drie keer gedaan. Nu staat hij weer in de hal, met zijn jas aan en een heel nieuw onderwerp om over te klagen.",
    },
  },
};
