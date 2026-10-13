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
  components/          Vue SFC's per scherm
```

Belangrijke keuzes:

- **Moraal blijft verborgen.** `PlanningBoard` en `LoadChart` krijgen alleen het schema en de uitgevoerde *acties*.
  Een test controleert dat ze niets uit de moraalengine importeren en dat de gerenderde HTML geen moraal bevat. De
  kopbalk toont de nieuwe score pas zodra het nieuwsbulletin hem onthult.
- **Historie is gezaghebbend.** Uitgevoerde blokken worden als snapshot met load, batterij, moraal en events
  opgeslagen en nooit herberekend. Vóór elk blok wordt het volledige programma (historie + toekomst) gevalideerd.
- **Blok 0 als introductieronde.** Er zijn geen extra spelregels toegevoegd. Blok 0 legt in de planning het
  vooruitladen uit, en het eerste nieuwsbulletin legt de speelloop uit.
- **Refresh-bestendig.** De spelstatus staat in `localStorage` (`merry-gridmas:game`, versie 1). Een refresh tijdens
  een ronde gaat door naar het nieuwsbulletin. Een afgeronde run komt één keer op het scorebord (idempotent op `runId`).
- **Demo-runs** van de organisator tellen niet mee voor het scorebord.

## Organisatorenpaneel

Knop *Organisator* rechtsonder: spel resetten, demo met referentieschema, scorebord exporteren/importeren/wissen
(met bevestiging) en hardwaremodus kiezen.

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
