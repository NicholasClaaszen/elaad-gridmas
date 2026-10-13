# Merry Gridmas - Keep the lights on!

Educatieve congestie-planningsgame voor het ElaadNL-kerstevent. Teams van 5-6 personen loodsen het fictieve dorp
Gridmas in zes blokken van twee uur door kerstavond, zonder dat het net boven 100 kW komt.

`SPEC.md` is de gezaghebbende specificatie; `REFERENCE_CASE.json` is de verplichte regressie-fixture (eindmoraal 87).

## Starten

Vereist Node 22.12 of nieuwer.

```bash
npm install
npm run dev        # speel lokaal op http://localhost:5173
npm run test       # Vitest: engine, store, hardware en componenten
npm run typecheck  # vue-tsc
npm run build      # typecheck + productiebuild in dist/
npm run preview    # serveer de productiebuild
```

Na `npm install` werkt alles offline: lettertypen zitten in de bundel, er zijn geen netwerkaanroepen.

## Architectuur

```
src/
  domain/            Pure, deterministische spelengine (geen Vue, geen Math.random, geen klok)
    scenario.ts        Vaste speldata uit SPEC §2
    calculateLoad.ts   Belastingformule, batterijprojectie, laadbalans
    validateSchedule.ts Alle technische regels; Nederlandse foutmeldingen, nooit moraal
    calculateMorale.ts Verborgen straftabel (SPEC §3.1) + clamp
    feedbackContent.ts 29 nieuwsberichten (6 sfeer + 23 actie/blok)
    game.ts            State machine: createNewGame, executeNextBlock, completeRound, continueAfterReview
    scene.ts           Uitgevoerd blok -> fysieke scene
    leaderboard.ts     Gedeelde plaatsen, idempotent toevoegen, JSON import/export
    educationalOpenAdr.ts Program/Event/Interval-conceptweergave (niet conformiteit-gevalideerd)
  state/gameStore.ts   Vue-reactieve wrapper: persistence (versioned localStorage), scorebord, hardware-aansturing
  hardware/            HardwareAdapter-interface, MockHardwareAdapter, DummyEsp32Connector, compact protocol
  ui/locations.ts      Verhalen, weergavenamen en technische planningspreview; geen moraalberekening
  components/          Vue SFC's per scherm, gedeelde locatiekaarten, dorpskaart en scoremeter
```

Belangrijke keuzes:

- **Moraal blijft verborgen.** `PlanningBoard` en `LoadChart` krijgen alleen het schema en de uitgevoerde *acties*.
  Een test controleert dat de planning en gedeelde locatiecomponenten niets uit de moraalengine importeren en dat de gerenderde HTML geen moraal bevat. De
  kopbalk toont vóór het eerste nieuwsbulletin “Nog niet bekend”; daarna alleen de laatst onthulde score.
- **Historie is gezaghebbend.** Uitgevoerde blokken worden als snapshot met load, batterij, moraal en events
  opgeslagen en nooit herberekend. Vóór elk blok wordt het volledige programma (historie + toekomst) gevalideerd.
- **Blok 0 als introductieronde.** Er zijn geen extra spelregels toegevoegd. Blok 0 legt in de planning het
  vooruitladen uit, en het eerste nieuwsbulletin legt de speelloop uit.
- **Refresh-bestendig.** De spelstatus staat in `localStorage` (`merry-gridmas:game`, versie 1). Een refresh tijdens
  een ronde gaat door naar het nieuwsbulletin. Een afgeronde run komt één keer op het scorebord (idempotent op `runId`).
- **Demo-runs** van de organisator tellen niet mee voor het scorebord.

## Organisatorenpaneel

Knop *Organisator* rechtsonder: spel resetten, demo met referentieschema, scorebord exporteren/importeren/wissen
(met bevestiging), geluid aan/uit en testen, en hardwaremodus kiezen. Zie ook de [hostkaart](docs/HOSTKAART.md).

## Extra's voor de kerstmarkt

- **Teamtitels** (`src/domain/teamTitles.ts`): op het eindscherm krijgt elk team titels op basis van wát het deed,
  niet van de score, zoals "De IJsdisco-redders" of "De Batterijbazen".
- **Geluid** (`src/audio/`): elk nieuwsbulletin krijgt een eigen mix van geluiden op basis van de keuzes (batterij,
  extra laden) en de berichten (lichtjes uit, ijsbaan dicht, laadpauze). Zware straffen klinken harder, en een
  slechte ronde eindigt met gemopper. Alles wordt live gesynthetiseerd met de Web Audio API: geen audiobestanden,
  geen netwerk. Geluid start pas na de eerste klik (browserbeleid) en is uit te zetten in het organisatorenpaneel.
- **Eindsamenvattingen** (`src/content/finalSummaries.json`): vooraf geschreven teksten per "verhaalsleutel".
  De sleutel bevat wanneer de ijsbaan dicht was, het dorpsplein tijdens het koor, of senioren, woonwijk en ziekenhuis
  donker gingen, het aantal laadpauzes en de moraalband. Dat geeft 169 bereikbare combinaties, die de engine zelf
  opsomt. Lege samenvattingen vallen terug op de vaste tekst per moraalband. Na een wijziging in de spelregels:
  `npm run content:summaries` (bestaande teksten blijven behouden). Daarna controleert `npm test` dat het bestand
  klopt en dat de teksten de schrijfregels volgen.

## Hardware (fase 2-voorbereiding)

De spelengine kent geen hardware; alles loopt via `HardwareAdapter` (`setScene`, `reset`). Scenes worden alleen
verstuurd na een uitgevoerd blok of een reset, nooit bij planningskliks. Faalt de hardware, dan verschijnt een
melding en speelt het spel gewoon door.

- `MockHardwareAdapter`: standaard; de miniatuur-preview in de UI toont de scene.
- `DummyEsp32Connector`: bouwt exact de aanroepen die een ESP32-adapter zou doen en logt ze in het
  organisatorenpaneel, **zonder netwerkverkeer**. Kan verbindingsverlies simuleren.

Berichtformaat (`src/hardware/protocol.ts`):

```
POST {baseUrl}/api/scene  {"v":1,"cmd":"scene","b":3,"z":[1,0,1,1],"r":1,"c":"p","bat":0,"net":"s"}
POST {baseUrl}/api/reset  {"v":1,"cmd":"reset"}
```

`z` = lichtzones homes, seniors, hospital, square (1 = aan); `r` = ijsbaan open; `c` = laadplein
c(harging)/p(aused)/x(extra); `bat` = 100/50/0 %; `net` = s(afe)/o(verload).

Nog nodig voor de echte LED-koppeling:

1. Fysieke opstelling vastleggen: aantal WS2812B-leds per zone, indicatoren voor ijsbaan, laadplein en batterij,
   5V-voeding met voldoende stroom en een gedeelde massa.
2. Transport kiezen (HTTP of WebSocket) en documenteren, inclusief CORS (de browser roept het ESP32-adres aan) en
   het lokale netwerk (eigen AP van de ESP32 of het eventnetwerk).
3. Een `Esp32HttpAdapter` naast de dummy-connector schrijven die hetzelfde protocol via `fetch` verstuurt, met timeout.
4. Firmware die het compacte bericht parset en de zones aanstuurt, plus een reset-/testpatroon.

## Tests

De tests dekken de 12 verplichte scenario's uit SPEC §8, waaronder de exacte referentiecase
(loads `[95,95,95,100,100,85]`, moraal `[78,82,86,82,83,87]`, batterij `[100,100,50,0,0,0]`), plus een volledige
klik-door van de app in happy-dom.

Ontwikkelnotities:

- Er wordt happy-dom gebruikt in plaats van jsdom, omdat de nieuwste jsdom Node 22.22+ vereist.
- TypeScript staat op 6.x, omdat vue-tsc TypeScript 7 nog niet ondersteunt.
- Er is (nog) geen Playwright-smoketest of ESLint opgenomen.

## Interface en ontwerpkeuzes

De planning heeft zeven SVG-locatiekaarten, een detailpaneel en zes tijdskolommen. Kies een blok en een locatie,
of schakel direct in het schema. De gekozen locatie licht ook op in de betreffende rij. Elke kolom toont
basisbelasting − ingezette flexibiliteit + extra laden = netbelasting. De knop om een blok te spelen staat
bovenaan; het hele programma moet eerst technisch kloppen.

De kopbalk blijft op desktop zichtbaar bij scrollen. Op kleinere schermen stapelen de panelen; de tijdlijn en
resultatentabel scrollen binnen hun eigen paneel. Knoppen werken met toetsenbord en touch. Animaties volgen
`prefers-reduced-motion` en de uitvoering kan direct worden overgeslagen.

De kaarten tonen het **geplande** blok, inclusief de batterijstand ná dat blok. De dorpskaart tijdens de uitvoering
en het nieuws toont de **uitgevoerde** `Scene` uit de store, dezelfde toestand die naar de hardwareadapter gaat.
Planningskliks sturen niets naar hardware. De bestaande engine, vermogens, moraalpunten en opslag blijven leidend.
Locatienamen en verhalen zijn UI-data; technische waarden worden uit `scenario.ts` gehaald.

De Gridmas Courant heeft 29 vaste berichten die alleen na uitvoering verschijnen. De einduitslag toont de
belasting per blok, het aantal maatregelen, verschoven laadenergie, batterijgebruik en twee nieuwsfragmenten
uit de gespeelde avond. De OpenADR-uitleg en JSON staan onder een uitklapbaar paneel.

Verificatie: 53 tests, waaronder een volledig spel via de zichtbare planningsknoppen, vergrendelde historie,
locatiedetails zonder toekomstige moraal, de dorpskaart en hervatten bij het volgende ongespeelde blok.
Typecheck en productiebuild slagen. Screenshotcontrole op desktop en tablet is nog niet uitgevoerd:
de browsertoestemming voor de lokale preview werd geweigerd.
