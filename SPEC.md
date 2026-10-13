# Merry Gridmas - Keep the lights on!

## Functionele en technische specificatie (v1.0)

**Status:** implementeerbaar MVP-ontwerp. **Taal van de UI:** Nederlands.
**Doelgroep:** niet-technische en technische collega's van ElaadNL, groepen van 5-6 personen.
**Speelduur:** circa 20 minuten per groep. **Bediening:** 1 laptop/touchscreen en een fysieke miniatuur van Gridmas.

> Bouw eerst een volledig speelbare lokale Vue-game met gesimuleerde hardware. De fysieke ESP32/LED-integratie volgt achter een expliciete adapter. Verzin geen eigen spelregels als hieronder waarden zijn gespecificeerd.

---

## 1. Concept

Op 24 december moet een team het fictieve dorp Gridmas veilig door kerstavond loodsen. De maximale lokale netbelasting is **100 kW**. Gedurende 6 tijdsblokken van 2 uur ontstaan congestiepieken. Het team plant de inzet van batterij, laadplein, kerstijsbaan en niet-kritieke feestverlichting.

De spelers zien vooraf: verwachte basisbelasting, resulterende netbelasting, beschikbaar vermogen, energiebudgetten en technische beperkingen. Ze zien **niet** wat hun keuzes met de moraalscore zullen doen. Na elk uitgevoerd tijdsblok verschijnt de **werkelijke** moraalverandering met humoristische verklaringen. Deelnemers mogen alleen nog toekomstige tijdsblokken veranderen.

Hoogste eindmoraal wint, uitsluitend bij een technisch geldig programma. Gelijke scores delen dezelfde plaats.

### Bewuste beperkingen

- Geen echte VTN, VEN, authenticatie of netwerkintegratie voor MVP.
- Geen volledige OpenADR 3.1-conformiteitsclaim. Gebruik intern een neutraal planningsmodel met optionele educatieve Program/Event/Interval-projectie.
- Geen geldstromen, marktprijzen, weersimulatie, onverwachte willekeurige events of complexe laadcurves.
- De simulatie is volledig deterministisch: gelijke acties = gelijke uitkomst.
- Alle belastingen zijn fictieve, geaggregeerde spelwaarden. Geen medische apparatuur of andere kritieke installaties schakelen.

## 2. Exact scenario

Tijdsblokken hebben 2 uur duur. Gebruik block index 0 t/m 5. Alle tijdstippen zijn lokale fictieve tijd op kerstavond, over middernacht heen. Gebruik labels, geen parsing van systeemklok noodzakelijk.

| index | label | basisbelasting kW | standaard moraalbonus | fase |
|---:|---|---:|---:|---|
| 0 | 14:00-16:00 | 75 | +3 | voorbereiden |
| 1 | 16:00-18:00 | 115 | +5 | eerste kerstlichtjes |
| 2 | 18:00-20:00 | 150 | +8 | kerstdiner |
| 3 | 20:00-22:00 | 155 | +8 | kerstpiek/koor |
| 4 | 22:00-00:00 | 125 | +4 | vertrek kerstmarkt |
| 5 | 00:00-02:00 | 65 | +4 | nachtelijke afwikkeling |

**Maximale netbelasting: 100 kW in elk afzonderlijk blok.** Geen tolerantie op overbelasting. Eerste moraal: 75 van maximaal 100.

### 2.1 Vier schakelbare kerstlocaties

Beschikbaar als binaire actie AAN/UIT in blokken **1 t/m 4**. Buiten deze blokken geen bediening nodig; de feestverlichting is uit de speelscope.

| assetId | Locatie | Reductie bij UIT |
|---|---|---:|
| homes | Woonwijk | 10 kW |
| seniors | Seniorencomplex De Gouden Ster | 10 kW |
| hospital | Ziekenhuis (uitsluitend feestverlichting) | 5 kW |
| square | Dorpsplein en kerstmarkt | 15 kW |

Deelnemers zien de locaties als verlichte 3D-modellen met een korte verhaalkaart. Bij elke actie gaat uitsluitend de feestverlichting uit, nooit het echte gebouw of de zorgvoorziening. Een keuze geldt voor precies dat blok; voor een volgend blok expliciet opnieuw instellen.

### 2.2 Kerstijsbaan De Gladde Kerst

- `assetId = rink`; reductie: **30 kW**.
- De koeling/bedrijfsvoering wordt eenmalig gedurende 2 uur teruggeschakeld; de ijsbaan sluit voor publiek.
- Exact **maximaal 1 blok** uit **1, 2 of 3** (16:00-22:00). Niet beschikbaar in blok 4.
- Eenmaal gebruikt: niet later opnieuw in te zetten.
- Narratief: families schaatsen in de namiddag, tijdens kerstdiner is het relatief rustig, tussen 20:00 en 22:00 is de kerstdisco.
- Geen energiecompensatie in deze spelversie. Dit stelt curtailment voor, geen load shifting.

### 2.3 Buurtbatterij

- `assetId = battery`; ontlaadvermogen: **25 kW per actief blok**.
- Startinhoud: **100 kWh**.
- Iedere ontlaadactie duurt 2 uur en gebruikt exact **50 kWh**.
- Maximaal **2 ontlaadblokken**, alleen uit index **1 t/m 4**.
- Geen laden gedurende het scenario. Er is geen directe moraalstraf.
- Toon energieresterend tijdens planning (projectie) en na uitvoering (feitelijk). Nooit doen alsof 25 kW gedurende 2 uur slechts 25 kWh kost.

### 2.4 Laadplein

- `assetId = chargers`; normale afname is al inbegrepen in basisbelasting.
- Per pauzeblok index **1 t/m 4**: **20 kW minder afname** (= 40 kWh uitgesteld).
- Maximaal **2 pauzeblokken** voor de gehele avond.
- Inhaal- of vooruitladen: kies maximaal **1 extra laadsessie** van **+20 kW** in blok **0**, en maximaal 1 in blok **5**. Elke sessie levert +40 kWh.
- **Verplichte energieneutraliteit** voor het gehele programma: aantal extra laadsessies in blokken 0 en 5 = aantal pauzeblokken in 1 t/m 4.
- Het is niet toegestaan extra laadsessies te plannen zonder corresponderende pauzes of pauzes zonder voldoende compensatie.
- Als de groep in latere rondes het toekomstschema aanpast, blijft het reeds uitgevoerde vooruitladen of pauzeren definitief. De actuele volledige planning (vastgelegde historie plus toekomst) moet geldig zijn voordat het volgende blok mag starten.
- Vooruitladen betekent hier geaggregeerde flexibiliteit over het laadplein, niet noodzakelijk dezelfde individuele auto.

### 2.5 Belastingformule

Voor elk blok:

```
actualLoadKw = baselineLoadKw
             + (extraChargingHere ? 20 : 0)
             - (chargersPausedHere ? 20 : 0)
             - (batteryDischargingHere ? 25 : 0)
             - (rinkPausedHere ? 30 : 0)
             - sum(reductionKw of each decoration switched OFF here)
```

Een programma is alleen geldig als voor **elk** van de 6 blokken `actualLoadKw <= 100` EN alle globale asset- en energiebeperkingen kloppen. Laat optionele overreductie toe: die is niet automatisch strafbaar. Geen ongedefinieerde penalty voor uitgespaarde kW.

## 3. Verborgen moraalberekening

**Toon nooit toekomstige moraalvoorspellingen, optelsommen of strafwaarden in de plannings-UI.** Deze tabel zit in de spelengine. In de nabespreking per ronde mag de engine alleen het effect van de reeds uitgevoerde acties onthullen.

### 3.1 Strafpunten per uitgevoerd tijdsblok

| Actie | blok 1 (16-18) | blok 2 (18-20) | blok 3 (20-22) | blok 4 (22-00) |
|---|---:|---:|---:|---:|
| homes UIT | -3 | -8 | -9 | -3 |
| seniors UIT | -8 | -12 | -7 | -1 |
| hospital UIT | -6 | -7 | -8 | -6 |
| square UIT | -9 | -15 | -18 | -2 |
| rink gesloten | -9 | -4 | -14 | n.v.t. |
| chargers gepauzeerd | -1 | -3 | -5 | -11 |
| battery ontladen | 0 | 0 | 0 | 0 |

Bonus moraal per blok staat in de scenariotabel (+3, +5, +8, +8, +4, +4). Vooruitladen en inhaalladen hebben 0 moraalstraf. Geen random modifiers.

```
roundDelta = block.baseMoraleBonus + sum(negativePenaltiesForActivatedActions)
newMorale = clamp(previousMorale + roundDelta, 0, 100)
```

- Houd intern de uitgesplitste `moraleEvents` bij met `{assetId, blockIndex, delta, headline, text}`.
- Er is altijd een positief basisbericht voor de kerstsfeer, plus 1 bericht per strafgevende actie.
- Toon alleen de events van het **uitgevoerde** blok, actuele score, en totaalverschil.
- Geen toekomstige score-indicator in planner, chart, hover, API-response voor planner of toegankelijkheidstekst.
- Afgeronde blokken blijven inzichtelijk in een tijdlijn met historische morale-wijzigingen.

### 3.2 Schrijfstijl moraalnieuws

Kort, speels, kerstsfeer, licht absurd, maar duidelijk causaal. Laat de game passende Nederlandse teksten bij elke mogelijke actie/block-combinatie hebben (4 locaties x 4 blokken, ijsbaan 3, laadplein 4, algemene sfeer 6 = minimaal 29 teksten). Geen online AI-aanroep of random tekstgeneratie tijdens het spel.

Voorbeelden:

- Seniorencomplex UIT, 16-18: `Het kerstdiner bij De Gouden Ster begon zonder feestverlichting. Mevrouw De Vries heeft de burgemeester al gebeld.` (-8)
- IJsbaan gesloten, 18-20: `Veel bezoekers zaten toch aan hun kerstdiner. De ijsmeester kon voor het eerst in jaren rustig eten.` (-4)
- IJsbaan gesloten, 20-22: `De kerstdisco op het ijs is afgelast. De DJ zit met 400 ongebruikte glowsticks.` (-14)
- Dorpsplein UIT, 20-22: `Net tijdens het optreden van het kerstkoor doofde de grote boom. De dirigent spreekt van sabotage.` (-18)
- Laadplein pauze, 22-00: `Bezoekers willen vertrekken, maar de accu's zijn niet vol. Een oom heeft aangekondigd volgend jaar met de diesel te komen.` (-11)
- Seniorencomplex UIT, 22-00: `De gemeenschappelijke ruimtes zijn inmiddels leeg. Een nachtwaker constateert dat de boom uit is.` (-1)

## 4. Fasen van het spel en UX

### 4.1 Schermen

1. **Welkom**: logo/titel `Merry Gridmas - Keep the lights on!`, scenario-uitleg, spelduur, invoer teamnaam en knop `Start planning`.
2. **Planningsdashboard**: 6 kolommen met tijdsblokken en rijen voor de 7 speelelementen. Compacte simpele toggles, niet meer dan drie soorten bediening (aan/uit, pauze/actief, laden/stand-by). Op mobiel mag een tijdsblok-selectie worden gebruikt, maar primair optimaliseren voor 1366x768 en groter.
3. **Validatie**: per blok berekende netbelasting zichtbaar versus limiet 100 kW, indicatoren voor resterende batterij-energie, beschikbare ijsbaan-inzet en energieneutraliteit laadplein. Duidelijke foutmeldingen, geen verborgen technische beperkingen.
4. **Uitvoering ronde**: actie op knop `Speel tijdsblok` bevriest die ronde en synchroniseert fysieke scene. Korte, optionele animatie van lichtjes/vermogen, geen onnodige wachttijd.
5. **Nieuwsbulletin**: laat actuele moraal, delta en verklarende berichten voor dit blok zien. Klik `Verder naar volgende ronde` om terug te gaan naar alleen toekomstig aanpasbare planning.
6. **Eindscherm**: eindmoraal, alle loads per blok, moralescore per blok, energiebalans, samenvatting van de kerstnacht, optioneel educatieve `OpenADR programma`-weergave en scorebord. Daarna `Volgend team`.
7. **Organisatorenpaneel** (niet prominent): reset huidig spel, demo met referentieschema, leaderboard wissen met bevestiging, mock/hardware-modus.

### 4.2 Exacte state machine

`WELCOME -> PLANNING -> ROUND_RUNNING -> ROUND_REVIEW -> PLANNING` (volgend blok) ... `ROUND_REVIEW -> FINISHED` bij blok 5.

- `WELCOME`: teamnaam invoeren; nieuwe run begint op 75 moraal, batterij 100 kWh, index 0.
- `PLANNING` voor ronde 0: bewerk alle 6 blokken, maak een geldig compleet programma, klik `Start kerstavond`.
- `PLANNING` na iedere review: blokken `<= lastExecutedBlockIndex` zijn vergrendeld, alleen toekomstige blokken kunnen worden bewerkt. Klik `Speel tijdsblok {X}`. Check opnieuw volledige geldigheid.
- `ROUND_RUNNING`: leg snapshot van de keuzes voor dit blok vast, reken belasting en morale uit, stuur de fysieke scene aan. Houd animatie kort of bied skip aan.
- `ROUND_REVIEW`: toon uitsluitend nu de moraalreactie van dit blok. Geen wijzigingen aan de uitgevoerde ronde.
- `FINISHED`: schrijf een eenmaal afgeronde, geldige run naar lokaal scorebord; toon uitslag. Geen dubbeltellingen bij page refresh.
- Bewaar actieve toestand optioneel in `localStorage` zodat een refresh niet zomaar alle voortgang wist; sla game-engine data in een versioned object op.
- Geen harde countdown in MVP. Begeleider beheert de tijd, spel reageert direct.

### 4.3 Leaderboard

- Speelstation is een enkele laptop; `localStorage` voldoet.
- Elke afgeronde run: `{runId, teamName, finalMorale, completedAt, status:"valid"}`.
- Sorteren op hoogste eindmoraal. Bij gelijk aantal punten: gedeelde plek, geen geheime tie-breaker.
- Mogelijkheid leaderboard als JSON te exporteren/importeren voor backup; geen cloud account en geen server nodig.
- Een ongeldige / niet voltooide run krijgt geen competitieplek.

## 5. OpenADR-uitleg (educatieve laag, GEEN productie-implementatie)

- Beschrijf het geheel in de UI als het fictieve Program `GRIDMAS-CHRISTMAS-EVE`.
- Elke assetaansturing in een blok kan getoond worden als een logisch Event met target, start, duur `PT2H` en gevraagde actie. Identieke opeenvolgende acties mogen voor presentatie samengevoegd worden, maar hoeven niet.
- Houd het primaire datamodel onafhankelijk van het protocol. Een functie `projectToEducationalOpenAdr(schedule)` produceert apart een leesbare, lokale demonstratie van Program, Events en Intervals.
- Label export nadrukkelijk als `OpenADR 3.1 conceptweergave - niet conformiteit-gevalideerde API-payload` tenzij je die later daadwerkelijk tegen de officiële OpenADR 3.1 specificatie en JSON-schema's valideert.
- Gebruik absoluut niet OpenADR 2.0b als basis.
- Het spel simuleert vooraf geaccordeerde assetflexibiliteit; het doet geen marktmatching en beweert niet dat OpenADR zelf de maatschappelijke optimumkeuze bepaalt.

Referentie: OpenADR 3.1 User Guide, Program Scenarios en Event/Interval timing in de OpenADR-specificatierepository: https://github.com/grid-coordination/openadr3-specification/blob/main/3.1.0/User_Guide.md

## 6. Technische architectuur

### MVP stack

- Vue 3, TypeScript, Vite (liefst Vue Single File Components met Composition API).
- State: Pinia of een kleine lokale composable, afhankelijk van eenvoud; vermijd overengineering.
- Pure TypeScript-domeinlogica onafhankelijk van UI en hardware.
- Vitest voor unit- en integratietests; ESLint/TypeScript typecheck en Vite production build.
- Plain CSS of een lichtgewicht stylinglaag; geen noodzaak voor een zware UI-componentbibliotheek.
- Offline werken; na installatie/run geen externe API-, CDN- of netwerkafhankelijkheid voor spelregels, lettertypen of moraalberichten.
- Een enkele lokale browser; geen database, backend of authenticatiesysteem in fase 1.

### Voorgestelde modules

```
src/
  domain/
    types.ts               // Block, AssetAction, Schedule, MoraleEvent, GameState
    scenario.ts            // Alleen vaste, configureerbare speeldata
    calculateLoad.ts       // Pure functie voor blokbelasting
    validateSchedule.ts    // Pure functie met gedetailleerde issues
    calculateMorale.ts     // Pure, deterministische moraalengine
    feedbackContent.ts     // Nederlandse headlines/berichten per actie en blok
    educationalOpenAdr.ts  // Educatieve Program/Event/Interval-projectie
  state/
    gameStore.ts           // State machine, immutable verleden, persistence
  hardware/
    HardwareAdapter.ts     // Interface setScene(scene)
    MockHardwareAdapter.ts // Geen fysieke hardware vereist
    Esp32HttpAdapter.ts    // Later inschakelbaar, optionele adapter
  components/
    WelcomeScreen.vue
    PlanningBoard.vue
    LoadChart.vue
    AssetCard.vue
    RoundReview.vue
    Scoreboard.vue
    OrganizerControls.vue
  App.vue
```

Vereiste contracten:

```
validateSchedule(schedule, executedPrefix?) => ValidationIssue[]
calculateLoad(blockIndex, action) => number
calculateRoundMorale(blockIndex, committedAction) => MoraleResult
executeNextBlock(gameState) => GameState
projectToEducationalOpenAdr(schedule) => EducationalProgram
```

De engine mag nergens direct Vue imports bevatten. Geen `Math.random()` of echte tijd in de scoringslogica. Het historische `executedPrefix` is gezaghebbend: de UI mag geen oude ronde herberekenen of overschrijven na feedback.

## 7. Hardware: voorbereiden, maar niet blokkeren

De fysieke set bestaat uit 4 lichtzones voor de kerstbomen/locaties, plus indicators voor ijsbaan, laadplein en batterij. Een centrale ESP32 en individueel aanstuurbare 5V-leds (bijvoorbeeld WS2812B) zijn een logische optie. Alleen veilige laagspanning. Specifieke pinout/LED-indeling later vastleggen.

Bouw al in MVP een `HardwareAdapter` abstractie:

```
interface Scene {
  blockIndex: number;
  zoneLightsOn: {
    homes: boolean;
    seniors: boolean;
    hospital: boolean;
    square: boolean;
  };
  rinkOpen: boolean;
  chargers: "charging" | "paused" | "extra-charging";
  batteryPercent: 100 | 50 | 0;
  netStatus: "safe" | "overload";
}
interface HardwareAdapter {
  setScene(scene: Scene): Promise<void>;
  reset(): Promise<void>;
}
```

- Standaard `MockHardwareAdapter`: toont een live miniatuur-preview in de interface en logt/visualiseert statuswijzigingen.
- Maak fysieke hardware optioneel; app moet prima speelbaar blijven als ESP32 afwezig is.
- Implementatiefase 2: ESP32 firmware ontvangt compact JSON-bericht met scene/status via lokaal HTTP of WebSocket. Kies een transport nadat de fysieke opstelling is vastgelegd en documenteer netwerk/CORS/security-keuzes. Niet hardcoderen in spelengine.
- Stuur scenes alleen bij werkelijk uitgevoerde tijdsblokken en reset; niet bij het klikken op ongecommitte planningsopties.
- Bij verbindingsverlies: toon discrete melding, maar laat de simulatie doorgaan. Geen ongeldige score door defect lampje.

## 8. Verplichte referentietest

De onderstaande planning is geldig en moet exact deze waarden opleveren:

| index | acties | load kW | eindmoraal na dit blok | batterij kWh na dit blok |
|---:|---|---:|---:|---:|
| 0 | extra vooruitladen | 95 | 78 | 100 |
| 1 | laadplein pauze | 95 | 82 | 100 |
| 2 | ijsbaan pauze + batterij ontladen | 95 | 86 | 50 |
| 3 | seniorenverlichting UIT + batterij ontladen + laadplein pauze | 100 | 82 | 0 |
| 4 | seniorenverlichting UIT + dorpsplein UIT | 100 | 83 | 0 |
| 5 | extra nachtelijk inhaalladen | 85 | 87 | 0 |

Netto laadenergie: +40 -40 -40 +40 = **0 kWh**.
Eindmoraal: **87**. Op basis van de hier vastgelegde discrete mogelijkheden en penalties is 87 de hoogst haalbare eindscore; leg dit als organisatoren-regressietest vast, maar toon het nooit vooraf aan spelers.

Een JSON-fixture van dit schema staat in `REFERENCE_CASE.json`.

### Minimaal te automatiseren tests

1. Exacte referentietest: loads `[95,95,95,100,100,85]`, moraal `[78,82,86,82,83,87]`, batterij `[100,100,50,0,0,0]`.
2. Drie batterijblokken ongeldig; twee geldig; batterij nooit onder 0 kWh.
3. IJsbaan tweemaal of in blok 4/5 ongeldig.
4. Laadplein meer dan twee pauzes ongeldig; netto kWh anders dan 0 ongeldig.
5. Vooruit- en inhaalladen elk hoogstens eenmaal, uitsluitend in blokken 0/5.
6. Overbelasting > 100 kW blokkeert starten/uitvoeren.
7. Het uitvoeren van blok 2 vergrendelt blok 0,1,2 en behoudt reeds toegepaste morale-events.
8. Morale-resultaten en numerieke straffen komen **niet** voor in de planningscomponent; ze verschijnen pas na executie.
9. Twee identieke runs resulteren in identieke feedback en score.
10. Onvoltooide of ongeldige run wordt niet op het leaderboard opgeslagen.
11. MockHardwareAdapter ontvangt correcte zones/batterijstatus in exact uitgevoerde volgorde.
12. Scherm opnieuw laden behoudt of herstelt een voltooide score zonder dubbele insert.

## 9. UI-richtlijnen

- Een verzorgd, speels kerst-dashboardscherm, niet een generieke enterprise-app. Een donker winteravondpalet met warm wit, groen en rood voor netstatus kan werken; zorg voor goede contrasten en toegankelijke labels.
- Grote, goed leesbare tijdblokken en pictogrammen; kleuren nooit als enige informatiebron.
- Speelgebied mag een kleine geanimeerde diorama-preview bevatten (CSS/SVG; geen gegenereerde illustraties vereist voor MVP).
- Duidelijk onderscheid tussen `vooruit gepland` en `al uitgevoerd`.
- Netbelasting altijd als groot getal plus visuele 100-kW grens; zorg dat de gebruiker begrijpt waarom een actie niet mag.
- Geen voorspellende moraal, geen tooltip met scores, geen verborgen debugtekst op speelerscherm.
- Organisatoren-opties separaat van de normale speelroute.

## 10. Implementatievolgorde voor Claude Code

**Fase A - Engine + tests**
1. Lees deze SPEC volledig en inspecteer eventuele bestaande repo. Leg in 5-10 regels de gekozen architectuur vast.
2. Scaffold Vue 3/TypeScript/Vite/Vitest waar nodig.
3. Implementeer types, scenario, load, globale validatie, moraal, feedback en voorbeeldfixture.
4. Schrijf en draai unit tests, inclusief de vaste referentietest. Stop niet met een puur theoretisch plan.

**Fase B - Volledige speelloop**
5. Bouw een functioneel planningsdashboard met alle zes blokken, asset-toggles en live technische validatie.
6. Bouw de state machine met rondebevestiging, historische vergrendeling en nieuwsfeedback na elk blok.
7. Voeg eindevaluatie, teamnamen, leaderboard en reset toe. Zorg voor NL teksten.

**Fase C - Mockhardware en polish**
8. Voeg HardwareAdapter + MockHardwareAdapter toe, plus kleine preview van de fysieke opstelling.
9. Voeg optionele educatieve OpenADR 3.1-conceptweergave toe.
10. Rond UI af voor laptop/touchscreen, voeg bij voorkeur Playwright-smoketest toe als haalbaar, en controleer TypeScript, tests en production build.

**Fase D - Fysiek, alleen na werkende MVP**
11. Schets pin/LED-layout van fysieke elementen en stel firmware-transport voor, zonder de werkende MVP te blokkeren.
12. Implementeer ESP32 adapter/firmware in een aparte iteratie als hardwarekeuze bekend is.

### Definition of Done voor het software-MVP

- Alle 6 blokken zijn interactief te programmeren en uit te voeren.
- Er is minimaal 1 geldig volledig speelscenario (de fixture).
- Belastingen, voorraadbeperkingen en EV-energieneutraliteit worden correct gevalideerd.
- Moraal is tijdens plannen echt verborgen, en na ieder uitgevoerd blok wordt de juiste delta met causaal bericht getoond.
- Het verleden is onveranderlijk, de toekomst aanpasbaar.
- Scorebord voor opeenvolgende groepen werkt zonder server.
- Er is een gesimuleerde fysieke scene die per ronde correct reageert.
- `npm run test`, `npm run typecheck`, `npm run build` slagen (of equivalent scripts). Documenteer werkende startcommando's.
- Geen echte OpenADR-conformiteit claimen.

## 11. Werkafspraken met Claude Code

- **Bouw**, niet alleen voorstellen. Maak zelf redelijke eenvoudige technische keuzes en leg die kort vast.
- Verander de vaste spelwaarden niet zonder expliciete vraag. Bij tegenstrijdigheden eerst rekenkundig controleren.
- Splits pure domeinlogica van UI en firmware.
- Implementeer incrementeel, toets direct na iedere module.
- Vermijd onnodige afhankelijkheden, cloud-diensten, accounts en backend.
- Geef aan het einde: bestanden/architectuur, startcommando's, testuitkomsten, ontbrekende onderdelen, en 3 concrete volgende stappen.
