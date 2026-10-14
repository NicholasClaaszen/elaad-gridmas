# Merry Gridmas — Gebeurtenissen (events) ontwerp

**Datum:** 2026-10-14 · **Branch:** `feature/gridmas-events` · **Status:** goedgekeurd in brainstorm

## Doel

Elke run krijgt minstens twee gebeurtenissen die de rest van de avond veranderen, zodat het
tussentijds bijsturen van toekomstige blokken echt iets betekent. Sommige events zijn grappig
(de Kerstman laadt zijn slee), sommige zijn valkuilen (batterij te vroeg leeg). Perfect spel
blijft rond de oude maximale eindmoraal uitkomen.

## Besluiten uit de brainstorm

| Vraag | Besluit |
|---|---|
| Willekeur | **Geen dobbelstenen.** Events worden getriggerd door uitgevoerde keuzes, plus twee vaste events per run. Gelijke acties = gelijke uitkomst; scorebord blijft eerlijk. |
| Referentie 87 | Maximum mag verschuiven; is na balans **87** gebleven met precies één perfecte run. |
| Onthulling | Mix: geruchten vooraf voor vaste events, verrassing voor getriggerde events. |
| Blok 0 | Wordt **communicatieblok**: kies hoogstens één bericht: `precharge` ("Laad alvast op", = het huidige vooruitladen) óf `notice` (aankondiging van curtailment). |
| Architectuur | Pure, data-gedreven module `src/domain/events.ts`. |
| Vangnet | **Noodaggregaat**, alleen ontgrendeld als een event de avond onoplosbaar maakt. |

## Regels

### Communicatieblok (blok 0, 14:00-16:00)

- `BlockAction.message: 'none' | 'precharge' | 'notice'`; alleen blok 0 mag iets anders dan `none` hebben.
- `precharge` ⇔ `extraCharging` in blok 0 (+20 kW, +40 kWh krediet). Validatie dwingt dit af.
- `notice` heeft geen directe belasting, maar voorkomt de verrassingsevents *Grote Uittocht*,
  *Gouden Ster op pad* en *Appgroep ontploft*, en triggert *Zelfdoenders*.

### Eventcatalogus

Alle triggers lezen **uitsluitend uitgevoerde blokken**. "Onthuld na blok X" betekent: zichtbaar in
het nieuwsbulletin van blok X en vanaf dan in de planning en validatie.

| id | Soort | Trigger | Effect | Onthuld na |
|---|---|---|---|---|
| `snow` | vast | altijd | blok 2 basisbelasting **−10 kW** | blok 1 |
| `santa-rumour` | vast (gerucht) | altijd | alleen tekst | blok 1 |
| `santa` | vast | altijd | blok 4 **+20 kW** | blok 2 |
| `exodus` (Grote Uittocht) | getriggerd | woonwijk UIT in blok b ∈ {1,2,3}, geen `notice` | blok b+1 **+15 kW** | blok b |
| `seniors-outing` (Gouden Ster op pad) | getriggerd | senioren UIT in blok 1, geen `notice` | blok 2 **+10 kW** | blok 1 |
| `seniors-grumpy` | getriggerd (moraal) | `seniors-outing` actief én dorpsplein UIT in blok 2 | **−3** moraal in blok 2 | blok 2 |
| `disco-move` (Discoverhuizing) | getriggerd | ijsbaan dicht in blok 3 | blok 4 **+10 kW** | blok 3 |
| `self-dimmers` (Zelfdoenders) | getriggerd | `notice` | blok 3 **−10 kW** | blok 0 |
| `early-birds` (Vroege vogels) | getriggerd | `precharge` | blok 4 **−10 kW** | blok 0 |
| `stargazers` (Sterrenkijkers) | getriggerd (moraal) | woonwijk én senioren UIT in blok 4 | **+3** moraal in blok 4 | blok 4 |
| `nurse-choir` (Zusterkoor) | getriggerd (moraal) | ziekenhuis in geen enkel blok UIT | **+3** moraal in blok 5 | blok 5 |
| `honking` (Toeterende ooms) | getriggerd (moraal) | laadplein gepauzeerd in blok b én b−1 | **−4** moraal in blok b | blok b |
| `app-storm` (Appgroep ontploft) | getriggerd (moraal) | ≥2 locaties UIT in één blok, geen `notice` | **−3** moraal in dat blok | dat blok |
| `generator` (Noodaggregaat) | vangnet | zie hieronder | **−20 kW** per ingezet blok, **−10** moraal per inzet | — |

Belastingseffecten zijn na onthulling zichtbaar in de planner. Moraaleffecten verschijnen
uitsluitend in het bulletin van het blok waarin ze vallen, nooit vooraf.

### Noodaggregaat

- Na elk uitgevoerd blok controleert de engine met `hasValidCompletion` (kleine, gememoiseerde
  zoektocht over de resterende blokken met de bekende eventbelasting) of er nog een geldig vervolg
  bestaat. Zo niet: `state.generatorUnlocked = true` en het bulletin meldt het aggregaat.
- `BlockAction.emergencyGenerator` mag alleen `true` zijn als `generatorUnlocked`, in blokken 1-4,
  onbeperkt aantal keer. Elke inzet: −20 kW en −10 moraal (verborgen tot het bulletin).
- Balanscheck: 20 kW per blok redt 100% van de vastgelopen situaties; omdat het pas verschijnt als
  je klem zit, verandert het het optimum niet.

### Formules

```
actualLoadKw(b) = (SPEC §2.5 formule)
                + sum(deltaKw van onthulde events voor blok b)
                - (emergencyGenerator ? 20 : 0)

roundDelta(b)   = baseMoraleBonus + strafpunten (SPEC §3.1) + sum(eventmoraal in blok b)
```

## Balans (geverifieerd met brute-force solver)

- **Maximale eindmoraal: 87**, precies één perfecte run:

  | blok | acties | load kW | moraal na blok | batterij kWh |
  |---:|---|---:|---:|---:|
  | 0 | `precharge` (extra laden) | 95 | 78 | 100 |
  | 1 | laadplein pauze | 95 | 82 | 100 |
  | 2 | ijsbaan dicht + batterij (sneeuw −10) | 85 | 86 | 50 |
  | 3 | senioren UIT + batterij + laadplein pauze | 100 | 82 | 0 |
  | 4 | woonwijk + senioren + dorpsplein UIT (Kerstman +20, vroege vogels −10, sterrenkijkers +3, appgroep −3) | 100 | 80 | 0 |
  | 5 | extra inhaalladen (zusterkoor +3) | 85 | 87 | 0 |

- Tweede beste run: 84. Beste route via `notice`: 83. Zonder bericht: 69.
- De oude referentierun (SPEC v1.0 §8) wordt met events ongeldig in blok 4 (110 kW): dat is de
  batterijval van de Kerstman.

## Architectuur

- `src/domain/types.ts`: `CommsMessage`, `message` en `emergencyGenerator` op `BlockAction`,
  `EventId`, `EventOccurrence`, `ExecutedBlock.revealedEvents`, `GameState.generatorUnlocked`,
  `MoraleEvent.assetId` uitgebreid met `'event'` + optioneel `eventId`.
- `src/domain/events.ts` (nieuw): `EVENT_DEFINITIONS`, `revealedEvents(executed)`,
  `eventLoadAdjustments(occurrences)`, `eventMoraleEffects(blockIndex, history)`,
  `hasValidCompletion(...)`.
- `src/domain/eventContent.ts` (nieuw): Nederlandse headlines/teksten per event.
- `calculateLoad(blockIndex, action, adjustmentKw = 0)`; `validateSchedule` leidt de onthulde
  eventbelasting zelf af uit `executedPrefix` (contract ongewijzigd) en valideert `message` en
  `emergencyGenerator` (met optie `generatorUnlocked`).
- `calculateRoundMorale(blockIndex, action, history = [])`: zonder historie gelijk aan v1.0.
- `executeNextBlock`: legt `revealedEvents` vast, berekent belasting met eventcorrectie, zet
  `generatorUnlocked`.
- `gameStore`: `STORAGE_VERSION` 1 → 2.

## UI

- **Planner:** blok 0 krijgt in de laadpleinrij een driestandenkeuze *Niets / Laad alvast op /
  Aankondiging* met korte uitleg zonder moraalhints. Kolomkop toont basis + eventchips (bijv.
  `125 + 🎅 20 − 🚗 10`). Noodaggregaat-rij alleen zichtbaar indien ontgrendeld.
- **Bulletin:** nieuwe sectie *Breaking news* met nieuw onthulde events/geruchten en concrete
  kW-regels voor toekomstige blokken; eventmoraal tussen de moraalberichten.
- **Tijdlijn/eindscherm:** eventiconen per blok; lijst *Gebeurtenissen van de avond*.
- **Ongewijzigd:** eindsamenvattingen, hardware-scene, OpenADR-weergave.
- **Organisator-demo:** speelt de nieuwe perfecte run.

## Tests

- Per event: triggert wel/niet, juiste onthullingsmoment, juiste effecten.
- v1.0-referentie op functieniveau (zonder historie/events) blijft `[95,95,95,100,100,85]` / 87.
- Nieuwe fixture `REFERENCE_CASE_EVENTS.json` via de volledige game-loop: waarden uit de tabel hierboven.
- Oude referentierun in de game-loop: blok 4 ongeldig na onthulling van de Kerstman.
- Noodaggregaat: vastgelopen historie ontgrendelt; ongeldig zonder ontgrendeling; −20 kW, −10 moraal.
- Validatie: `message` alleen in blok 0; `precharge` ⇔ extra laden in blok 0.
- Balanstest: uitputtende zoektocht via domeinfuncties bevestigt maximum 87 met één optimale run.
- UI: planner toont eventbelasting maar geen moraal; bulletin toont breaking news; communicatiekeuze werkt.
- Persistence: versie 2; versie-1 opslag wordt genegeerd.

## SPEC.md-wijzigingen

SPEC.md blijft leidend en wordt bijgewerkt: §1 (deterministische, door keuzes getriggerde events
i.p.v. "geen events"), §2 (communicatieblok), nieuwe §2.6 events + noodaggregaat, §3 eventmoraal,
§4.1 bulletin, §8 nieuwe referentierun naast de v1.0-functietest.

## Buiten scope

Willekeur/seeds, events in eindsamenvattingssleutels, fysieke indicatoren voor events, OpenADR-projectie van events.
