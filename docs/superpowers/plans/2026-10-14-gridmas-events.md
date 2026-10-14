# Gridmas Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, choice-triggered and fixed events (plus a communication block and an emergency generator) to Merry Gridmas, keeping the maximum final morale at 87.

**Architecture:** Pure domain modules: `events.ts` (news/load events derived only from executed actions), `eventMorale.ts` (hidden morale lines, imported only by the morale engine) and `completion.ts` (feasibility search that unlocks the generator). Existing functions gain optional parameters so v1.0 behaviour stays reachable at function level. UI reads revealed events from executed history.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, @vue/test-utils (happy-dom).

**Spec:** `docs/superpowers/specs/2026-10-14-gridmas-events-design.md`

## Global Constraints

- Geen React; Vue 3 + TypeScript. UI-taal Nederlands, speels maar technisch correct.
- Geen `Math.random()` of echte tijd in de engine. Gelijke acties = gelijke uitkomst.
- Planningscomponenten tonen/importeren nooit moraal: verboden imports `calculateMorale`, `feedbackContent`, `eventMorale`, `domain/game`, `MoraleEvent`, `ExecutedBlock`, `GameState`.
- Eventtriggers lezen uitsluitend uitgevoerde acties; belastingseffecten worden zichtbaar na onthulling, moraaleffecten alleen in het bulletin.
- Uitgevoerde blokken blijven vergrendeld; `ExecutedBlock` is gezaghebbend.
- Waarden exact uit de spec: sneeuw −10 kW (blok 2), Kerstman +20 kW (blok 4), uittocht +15 kW, Gouden Ster +10 kW, discoverhuizing +10 kW, zelfdoenders −10 kW (blok 3), vroege vogels −10 kW (blok 4), sterrenkijkers +3, zusterkoor +3, toeteren −4, appgroep −3, Gouden Ster chagrijnig −3, noodaggregaat −20 kW en −10 moraal per inzet.
- Draai `npm run typecheck`, `npm test` en `npm run build` voordat iets gereed heet.

## Review Focus

1. **Oude opgeslagen spellen (versie 1) na de update** → worden genegeerd, geen crash. Test in Task 7.
2. **Team wisselt bericht van `precharge` naar `notice` terwijl extra laden in blok 0 nog aan staat** → setMessage zet beide velden samen; validatie meldt conflicten. Test in Task 3 en Task 7.
3. **Een event maakt het huidige plan ongeldig** → de speelknop is uitgeschakeld en er staat een begrijpelijke overbelastingsmelding voor het juiste blok. Test in Task 5 (engine) en Task 7 (planner).
4. **Noodaggregaat aangevinkt vóór ontgrendeling (bijv. via oude planning)** → validatiefout `generator-locked`. Test in Task 3.
5. **Eventteksten in de planner bevatten moraalwoorden** → planner-render bevat nooit "moraal". Test in Task 7.

---

### Task 1: Types, scenario-constanten en belasting met eventcorrectie

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/scenario.ts`
- Modify: `src/domain/calculateLoad.ts`
- Test: `tests/domain.test.ts`

**Interfaces:**
- Produces: `CommsMessage`, `BlockAction.message?`, `BlockAction.emergencyGenerator?`, `NewsEventId`, `MoraleEventId`, `EventOccurrence`, `ExecutedBlock.news`, `GameState.generatorUnlocked`, `MoraleEvent.eventId?`; `GENERATOR`; `messageOf(action)`; `calculateLoad(blockIndex, action, adjustmentKw = 0)`; `calculateLoads(schedule, adjustments = [])`.

- [ ] **Step 1: Write failing tests** (append to `tests/domain.test.ts`)

```ts
describe('calculateLoad met events', () => {
  it('telt een eventcorrectie en het noodaggregaat mee', () => {
    const a = { ...createEmptyAction(4), decorationsOff: ['square'] as DecorationId[] };
    expect(calculateLoad(4, a)).toBe(110);
    expect(calculateLoad(4, a, 20)).toBe(130);
    expect(calculateLoad(4, { ...a, emergencyGenerator: true }, 20)).toBe(110);
  });

  it('calculateLoads gebruikt per blok de juiste correctie', () => {
    const loads = calculateLoads(referenceSchedule(), [0, 0, -10, 0, 20, 0]);
    expect(loads).toEqual([95, 95, 85, 100, 120, 85]);
  });
});

describe('messageOf', () => {
  it('leidt het bericht af, ook voor v1.0-acties zonder message', () => {
    expect(messageOf(createEmptyAction(0))).toBe('none');
    expect(messageOf({ ...createEmptyAction(0), extraCharging: true })).toBe('precharge');
    expect(messageOf({ ...createEmptyAction(0), message: 'notice' })).toBe('notice');
  });
});
```

Add imports at top of `tests/domain.test.ts` where missing: `calculateLoads` from `../src/domain/calculateLoad`, `createEmptyAction`, `messageOf` from `../src/domain/scenario`, `type DecorationId` from `../src/domain/types`.

- [ ] **Step 2: Run** `npx vitest run tests/domain.test.ts` → FAIL (`messageOf` not exported / wrong load).

- [ ] **Step 3: Implement**

`src/domain/types.ts` — change/add:

```ts
/** Bericht aan het dorp in het communicatieblok (blok 0). */
export type CommsMessage = 'none' | 'precharge' | 'notice';

export interface BlockAction {
  blockIndex: number;
  decorationsOff: DecorationId[];
  rinkPaused: boolean;
  batteryDischarge: boolean;
  chargersPaused: boolean;
  extraCharging: boolean;
  /** Alleen blok 0. Ontbreekt bij v1.0-data: dan volgt het uit extraCharging. */
  message?: CommsMessage;
  /** Noodaggregaat; alleen toegestaan nadat de engine het heeft ontgrendeld. */
  emergencyGenerator?: boolean;
}

/** Nieuws dat belasting verandert of iets aankondigt. Bevat nooit moraal. */
export type NewsEventId =
  | 'snow' | 'santa-rumour' | 'santa' | 'exodus' | 'seniors-outing'
  | 'disco-move' | 'self-dimmers' | 'early-birds' | 'generator';

/** Verborgen moraalreacties op events; alleen zichtbaar in het bulletin. */
export type MoraleEventId = 'seniors-grumpy' | 'stargazers' | 'nurse-choir' | 'honking' | 'app-storm' | 'generator-used';

export interface LoadEffect {
  blockIndex: number;
  deltaKw: number;
}

export interface EventOccurrence {
  eventId: NewsEventId;
  kind: 'rumour' | 'news';
  /** Verschijnt in het bulletin van dit blok en telt daarna mee in planning en validatie. */
  revealedAfterBlock: number;
  loadEffects: LoadEffect[];
  headline: string;
  text: string;
}
```

Extend `ValidationCode` with `| 'message-block' | 'message-conflict' | 'generator-block' | 'generator-locked'`.

```ts
export interface MoraleEvent {
  assetId: AssetId | 'atmosphere' | 'event';
  eventId?: MoraleEventId;
  blockIndex: number;
  delta: number;
  headline: string;
  text: string;
}
```

Add to `ExecutedBlock`: `/** Nieuw onthulde events/geruchten in dit blok. */ news: EventOccurrence[];`
Add to `GameState`: `/** Wordt waar zodra een event de avond onoplosbaar maakte; blijft daarna waar. */ generatorUnlocked: boolean;`

`src/domain/scenario.ts` — append:

```ts
export const GENERATOR = {
  name: 'Noodaggregaat',
  reductionKw: 20,
  allowedBlocks: [1, 2, 3, 4] as readonly number[],
  story: 'Alleen voor noodgevallen. Levert 20 kW per blok, maar het dorp gaat het merken.',
};

/** Het bericht in blok 0; v1.0-acties zonder message tellen extra laden als "laad alvast op". */
export function messageOf(action: BlockAction | undefined): CommsMessage {
  if (!action) return 'none';
  return action.message ?? (action.extraCharging ? 'precharge' : 'none');
}
```

(import `CommsMessage` type.)

`src/domain/calculateLoad.ts`:

```ts
/** Netbelasting (kW) van één blok volgens SPEC §2.5, plus bekende eventcorrectie. Puur en deterministisch. */
export function calculateLoad(blockIndex: number, action: BlockAction, adjustmentKw = 0): number {
  ...existing body... +
    adjustmentKw -
    (action.emergencyGenerator ? GENERATOR.reductionKw : 0)
}

export function calculateLoads(schedule: Schedule, adjustments: readonly number[] = []): number[] {
  return schedule.map((action, i) => calculateLoad(i, action, adjustments[i] ?? 0));
}
```

Fix compile errors from the new required fields: `src/domain/game.ts` `createNewGame` adds `generatorUnlocked: false`; `executeNextBlock` adds `news: []` for now (Task 5 fills it).

- [ ] **Step 4: Run** `npx vitest run tests/domain.test.ts` and `npm run typecheck` → PASS.

- [ ] **Step 5: Commit** `git add -A src/domain tests/domain.test.ts && git commit -m "Add event types, generator constants and load adjustments"`

---

### Task 2: `events.ts` — nieuws- en belastingsevents

**Files:**
- Create: `src/domain/eventNews.ts` (Nederlandse teksten + iconen)
- Create: `src/domain/events.ts`
- Test: `tests/events.test.ts`

**Interfaces:**
- Consumes: `messageOf`, `EventOccurrence`, `BLOCK_COUNT`.
- Produces: `revealedEvents(executed: readonly BlockAction[]): EventOccurrence[]`, `eventLoadAdjustments(occ: readonly EventOccurrence[]): number[]`, `knownLoadAdjustments(executed): number[]`, `generatorUnlockedNews(blockIndex): EventOccurrence`, `EVENT_ICONS: Record<NewsEventId, string>`.

- [ ] **Step 1: Write failing tests** `tests/events.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { eventLoadAdjustments, knownLoadAdjustments, revealedEvents } from '../src/domain/events';
import { createEmptyAction } from '../src/domain/scenario';
import type { BlockAction, DecorationId } from '../src/domain/types';

const act = (i: number, patch: Partial<BlockAction> = {}): BlockAction => ({ ...createEmptyAction(i), ...patch });
const dark = (i: number, ...ids: DecorationId[]) => act(i, { decorationsOff: ids });
const ids = (executed: BlockAction[]) => revealedEvents(executed).map((e) => `${e.eventId}@${e.revealedAfterBlock}`);

describe('vaste events', () => {
  it('onthult sneeuw en het Kerstman-gerucht na blok 1, de Kerstman na blok 2', () => {
    expect(ids([act(0)])).toEqual([]);
    expect(ids([act(0), act(1)])).toEqual(['snow@1', 'santa-rumour@1']);
    expect(ids([act(0), act(1), act(2)])).toEqual(['snow@1', 'santa-rumour@1', 'santa@2']);
  });

  it('sneeuw −10 kW in blok 2, Kerstman +20 kW in blok 4', () => {
    expect(knownLoadAdjustments([act(0), act(1), act(2)])).toEqual([0, 0, -10, 0, 20, 0]);
  });

  it('het gerucht heeft geen belastingseffect', () => {
    const rumour = revealedEvents([act(0), act(1)]).find((e) => e.eventId === 'santa-rumour')!;
    expect(rumour.kind).toBe('rumour');
    expect(rumour.loadEffects).toEqual([]);
  });
});

describe('communicatieblok', () => {
  it('precharge geeft vroege vogels (−10 kW om 22:00), notice geeft zelfdoenders (−10 kW om 20:00)', () => {
    expect(knownLoadAdjustments([act(0, { message: 'precharge', extraCharging: true })])).toEqual([0, 0, 0, 0, -10, 0]);
    expect(knownLoadAdjustments([act(0, { message: 'notice' })])).toEqual([0, 0, 0, -10, 0, 0]);
    expect(ids([act(0)])).toEqual([]);
  });
});

describe('getriggerde events', () => {
  it('grote uittocht: woonwijk donker zonder aankondiging → volgend blok +15 kW', () => {
    const ex = [act(0), dark(1, 'homes')];
    expect(ids(ex)).toContain('exodus@1');
    expect(knownLoadAdjustments(ex)[2]).toBe(-10 + 15);
  });

  it('uittocht kan meerdere keren, maar niet vanuit blok 4', () => {
    const ex = [act(0), dark(1, 'homes'), dark(2, 'homes'), dark(3, 'homes'), dark(4, 'homes')];
    expect(ids(ex).filter((s) => s.startsWith('exodus'))).toEqual(['exodus@1', 'exodus@2', 'exodus@3']);
  });

  it('aankondiging voorkomt uittocht en Gouden Ster op pad', () => {
    const ex = [act(0, { message: 'notice' }), dark(1, 'homes', 'seniors')];
    expect(ids(ex).some((s) => s.startsWith('exodus') || s.startsWith('seniors-outing'))).toBe(false);
  });

  it('Gouden Ster op pad: senioren donker 16-18 → blok 2 +10 kW', () => {
    expect(knownLoadAdjustments([act(0), dark(1, 'seniors')])[2]).toBe(-10 + 10);
  });

  it('discoverhuizing: ijsbaan dicht 20-22 → blok 4 +10 kW', () => {
    const ex = [act(0), act(1), act(2), act(3, { rinkPaused: true })];
    expect(ids(ex)).toContain('disco-move@3');
    expect(knownLoadAdjustments(ex)[4]).toBe(20 + 10);
  });

  it('onthult niets uit blokken die nog niet zijn uitgevoerd', () => {
    expect(ids([act(0)])).toEqual([]);
  });

  it('eventLoadAdjustments telt effecten per blok op', () => {
    expect(eventLoadAdjustments([])).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('nieuwsteksten bevatten nooit moraalinformatie', () => {
    const all = revealedEvents([act(0), dark(1, 'homes', 'seniors'), dark(2, 'homes'), act(3, { rinkPaused: true }), act(4), act(5)]);
    for (const e of all) expect(`${e.headline} ${e.text}`.toLowerCase()).not.toMatch(/moraal|punten|straf/);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/events.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

`src/domain/eventNews.ts`:

```ts
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
```

`src/domain/events.ts`:

```ts
import { EVENT_NEWS } from './eventNews';
import { BLOCK_COUNT, messageOf } from './scenario';
import type { BlockAction, DecorationId, EventOccurrence, LoadEffect, NewsEventId } from './types';

/** Effectgroottes uit de eventspec. */
export const EVENT_KW = {
  snow: -10,
  santa: 20,
  exodus: 15,
  seniorsOuting: 10,
  discoMove: 10,
  selfDimmers: -10,
  earlyBirds: -10,
} as const;

const SNOW_BLOCK = 2;
const SANTA_BLOCK = 4;

function occurrence(eventId: NewsEventId, revealedAfterBlock: number, loadEffects: LoadEffect[]): EventOccurrence {
  return {
    eventId,
    kind: eventId === 'santa-rumour' ? 'rumour' : 'news',
    revealedAfterBlock,
    loadEffects,
    ...EVENT_NEWS[eventId],
  };
}

const isDark = (a: BlockAction | undefined, id: DecorationId) => a?.decorationsOff.includes(id) ?? false;

type Detector = (executed: readonly BlockAction[], noticeSent: boolean) => EventOccurrence[];

/** Alle events. Elke detector kijkt alleen naar uitgevoerde blokken; onthulling volgt in revealedEvents. */
const DETECTORS: readonly Detector[] = [
  (ex) => (messageOf(ex[0]) === 'notice' && ex.length > 0 ? [occurrence('self-dimmers', 0, [{ blockIndex: 3, deltaKw: EVENT_KW.selfDimmers }])] : []),
  (ex) => (messageOf(ex[0]) === 'precharge' ? [occurrence('early-birds', 0, [{ blockIndex: SANTA_BLOCK, deltaKw: EVENT_KW.earlyBirds }])] : []),
  () => [occurrence('snow', 1, [{ blockIndex: SNOW_BLOCK, deltaKw: EVENT_KW.snow }]), occurrence('santa-rumour', 1, [])],
  (ex, notice) =>
    notice || !isDark(ex[1], 'seniors') ? [] : [occurrence('seniors-outing', 1, [{ blockIndex: 2, deltaKw: EVENT_KW.seniorsOuting }])],
  (ex, notice) =>
    notice
      ? []
      : [1, 2, 3].filter((b) => isDark(ex[b], 'homes')).map((b) => occurrence('exodus', b, [{ blockIndex: b + 1, deltaKw: EVENT_KW.exodus }])),
  () => [occurrence('santa', 2, [{ blockIndex: SANTA_BLOCK, deltaKw: EVENT_KW.santa }])],
  (ex) => (ex[3]?.rinkPaused ? [occurrence('disco-move', 3, [{ blockIndex: SANTA_BLOCK, deltaKw: EVENT_KW.discoMove }])] : []),
];

/** Alles wat het dorp weet na `executed.length` uitgevoerde blokken, op volgorde van onthulling. Puur. */
export function revealedEvents(executed: readonly BlockAction[]): EventOccurrence[] {
  const notice = messageOf(executed[0]) === 'notice';
  return DETECTORS.flatMap((detect) => detect(executed, notice))
    .filter((e) => e.revealedAfterBlock < executed.length)
    .sort((a, b) => a.revealedAfterBlock - b.revealedAfterBlock);
}

/** Som van de belastingseffecten per blok (kW). */
export function eventLoadAdjustments(occurrences: readonly EventOccurrence[]): number[] {
  const adjustments = new Array<number>(BLOCK_COUNT).fill(0);
  for (const e of occurrences) for (const effect of e.loadEffects) adjustments[effect.blockIndex]! += effect.deltaKw;
  return adjustments;
}

export function knownLoadAdjustments(executed: readonly BlockAction[]): number[] {
  return eventLoadAdjustments(revealedEvents(executed));
}

/** Melding in het bulletin wanneer de engine het noodaggregaat ontgrendelt. */
export function generatorUnlockedNews(blockIndex: number): EventOccurrence {
  return occurrence('generator', blockIndex, []);
}
```

Note: `Array.prototype.sort` is stable, so within a block the detector order (snow, rumour, seniors-outing, exodus, …) is kept. The test `ids([act(0), act(1)])` expects `['snow@1', 'santa-rumour@1']` — with no notice and nothing dark, only those two appear.

- [ ] **Step 4: Run** `npx vitest run tests/events.test.ts` → PASS.

- [ ] **Step 5: Commit** `git add src/domain/events.ts src/domain/eventNews.ts tests/events.test.ts && git commit -m "Add deterministic news and load events"`

---

### Task 3: Validatie met events, communicatieblok en noodaggregaat

**Files:**
- Modify: `src/domain/validateSchedule.ts`
- Test: `tests/domain.test.ts`

**Interfaces:**
- Consumes: `knownLoadAdjustments`, `messageOf`, `GENERATOR`.
- Produces: `validateSchedule(schedule, executedPrefix = [], options: ValidateOptions = {})`, `isScheduleValid(schedule, executedPrefix = [], options = {})`, `export interface ValidateOptions { generatorUnlocked?: boolean }`.

- [ ] **Step 1: Write failing tests** (append to `tests/domain.test.ts` `describe('validateSchedule')` block or a new describe)

```ts
describe('validateSchedule met events', () => {
  it('v1.0-referentie is geldig zonder historie', () => {
    expect(validateSchedule(referenceSchedule())).toEqual([]);
  });

  it('de onthulde Kerstman maakt de v1.0-referentie ongeldig in blok 4', () => {
    const s = referenceSchedule();
    const issues = validateSchedule(s, s.slice(0, 3));
    expect(issues.map((i) => [i.code, i.blockIndex])).toEqual([['overload', 4]]);
    expect(issues[0]!.message).toContain('110 kW');
  });

  it('bericht alleen in blok 0', () => {
    const s = withBlock(referenceSchedule(), 2, { message: 'notice' });
    expect(validateSchedule(s).map((i) => i.code)).toContain('message-block');
  });

  it('aankondiging en extra laden in blok 0 sluiten elkaar uit', () => {
    const s = withBlock(referenceSchedule(), 0, { message: 'notice', extraCharging: true });
    expect(validateSchedule(s).map((i) => i.code)).toContain('message-conflict');
    const t = withBlock(referenceSchedule(), 0, { message: 'precharge', extraCharging: false });
    expect(validateSchedule(t).map((i) => i.code)).toContain('message-conflict');
  });

  it('noodaggregaat alleen na ontgrendeling en alleen in blok 1-4', () => {
    const s = withBlock(referenceSchedule(), 3, { emergencyGenerator: true });
    expect(validateSchedule(s).map((i) => i.code)).toContain('generator-locked');
    expect(validateSchedule(s, [], { generatorUnlocked: true })).toEqual([]);
    const t = withBlock(referenceSchedule(), 5, { emergencyGenerator: true });
    expect(validateSchedule(t, [], { generatorUnlocked: true }).map((i) => i.code)).toContain('generator-block');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/domain.test.ts` → FAIL.

- [ ] **Step 3: Implement** in `src/domain/validateSchedule.ts`:

1. Signature and adjustments:

```ts
export interface ValidateOptions {
  /** Ontgrendeld door de engine nadat een event de avond onoplosbaar maakte. */
  generatorUnlocked?: boolean;
}

export function validateSchedule(
  schedule: Schedule,
  executedPrefix: readonly BlockAction[] = [],
  options: ValidateOptions = {},
): ValidationIssue[] {
  ...
  // Alleen events die door de uitgevoerde historie al onthuld zijn; de rest blijft een verrassing.
  const adjustments = knownLoadAdjustments(executedPrefix);
```

2. `sameAction` also compares `messageOf(a) === messageOf(b)` (only meaningful for block 0; for other blocks both are 'none' unless set) and `(a.emergencyGenerator ?? false) === (b.emergencyGenerator ?? false)`.

3. Inside `schedule.forEach`, before the load check:

```ts
    if (i !== 0 && (action.message ?? 'none') !== 'none') {
      issues.push({ code: 'message-block', blockIndex: i, message: `Een bericht aan het dorp kan alleen om 14:00-16:00, niet in ${label}.` });
    }
    if (i === 0 && action.message !== undefined && (action.message === 'precharge') !== action.extraCharging) {
      issues.push({
        code: 'message-conflict',
        blockIndex: i,
        message: 'Om 14:00-16:00 hoort extra laden bij het bericht "Laad alvast op". Kies één bericht.',
      });
    }
    if (action.emergencyGenerator) {
      if (!options.generatorUnlocked) {
        issues.push({ code: 'generator-locked', blockIndex: i, message: 'Het noodaggregaat is alleen beschikbaar als het dorp echt klem zit.' });
      } else if (!GENERATOR.allowedBlocks.includes(i)) {
        issues.push({ code: 'generator-block', blockIndex: i, message: `Het noodaggregaat kan alleen tussen 16:00 en 00:00 draaien, niet in ${label}.` });
      }
    }
```

4. Load check: `const load = calculateLoad(i, action, adjustments[i] ?? 0);`

5. `isScheduleValid(schedule, executedPrefix = [], options: ValidateOptions = {})` passes options through.

- [ ] **Step 4: Run** `npx vitest run tests/domain.test.ts` and `npm run typecheck` → PASS.

- [ ] **Step 5: Commit** `git commit -am "Validate schedules against revealed events, comms block and generator"`

---

### Task 4: Verborgen eventmoraal

**Files:**
- Create: `src/domain/eventMorale.ts`
- Modify: `src/domain/calculateMorale.ts`
- Test: `tests/events.test.ts`

**Interfaces:**
- Consumes: `messageOf`, `MoraleEvent`, `MoraleEventId`.
- Produces: `eventMoraleEvents(blockIndex, action, history): MoraleEvent[]`; `calculateRoundMorale(blockIndex, committedAction, history?: readonly BlockAction[])` — without `history` exactly v1.0.

- [ ] **Step 1: Write failing tests** (append to `tests/events.test.ts`)

```ts
import { calculateRoundMorale } from '../src/domain/calculateMorale';

const lines = (b: number, a: BlockAction, history: BlockAction[]) =>
  calculateRoundMorale(b, a, history).events.filter((e) => e.assetId === 'event').map((e) => `${e.eventId}:${e.delta}`);
const empty = (n: number) => Array.from({ length: n }, (_, i) => act(i));

describe('eventmoraal', () => {
  it('zonder historie is de moraal exact v1.0', () => {
    expect(calculateRoundMorale(4, dark(4, 'seniors', 'square')).delta).toBe(4 - 1 - 2);
  });

  it('appgroep ontploft bij 2+ donkere locaties zonder aankondiging', () => {
    expect(lines(4, dark(4, 'seniors', 'square'), empty(4))).toEqual(['app-storm:-3']);
    const noticed = [act(0, { message: 'notice' }), ...empty(4).slice(1)];
    expect(lines(4, dark(4, 'seniors', 'square'), noticed)).toEqual([]);
  });

  it('sterrenkijkers bij woonwijk + senioren donker om 22:00', () => {
    expect(lines(4, dark(4, 'homes', 'seniors'), empty(4))).toEqual(['stargazers:3', 'app-storm:-3']);
  });

  it('zusterkoor als het ziekenhuis de hele avond aan bleef', () => {
    expect(lines(5, act(5), empty(5))).toEqual(['nurse-choir:3']);
    const h = empty(5); h[2] = dark(2, 'hospital');
    expect(lines(5, act(5), h)).toEqual([]);
  });

  it('toeterende ooms bij twee laadpauzes op rij', () => {
    const h = empty(2); h[1] = act(1, { chargersPaused: true });
    expect(lines(2, act(2, { chargersPaused: true }), h)).toEqual(['honking:-4']);
  });

  it('Gouden Ster chagrijnig: op pad naar een donker plein', () => {
    const h = [act(0), dark(1, 'seniors')];
    expect(lines(2, dark(2, 'square'), h)).toEqual(['seniors-grumpy:-3']);
  });

  it('noodaggregaat kost 10 per inzet', () => {
    expect(lines(3, act(3, { emergencyGenerator: true }), empty(3))).toEqual(['generator-used:-10']);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/events.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/domain/eventMorale.ts`:

```ts
import { messageOf } from './scenario';
import type { BlockAction, MoraleEvent, MoraleEventId } from './types';

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

/** Eventmoraal voor één uitgevoerd blok. `history` = alle eerder uitgevoerde acties (lengte = blockIndex). */
export function eventMoraleEvents(blockIndex: number, action: BlockAction, history: readonly BlockAction[]): MoraleEvent[] {
  const notice = messageOf(blockIndex === 0 ? action : history[0]) === 'notice';
  const off = (a: BlockAction | undefined, id: 'homes' | 'seniors' | 'hospital' | 'square') => a?.decorationsOff.includes(id) ?? false;
  const events: MoraleEvent[] = [];

  if (blockIndex === 2 && !notice && off(history[1], 'seniors') && off(action, 'square')) events.push(line('seniors-grumpy', blockIndex));
  if (blockIndex === 4 && off(action, 'homes') && off(action, 'seniors')) events.push(line('stargazers', blockIndex));
  if (blockIndex === 5 && ![...history, action].some((a) => off(a, 'hospital'))) events.push(line('nurse-choir', blockIndex));
  if (action.chargersPaused && history[blockIndex - 1]?.chargersPaused) events.push(line('honking', blockIndex));
  if (!notice && action.decorationsOff.length >= 2) events.push(line('app-storm', blockIndex));
  if (action.emergencyGenerator) events.push(line('generator-used', blockIndex));
  return events;
}
```

`src/domain/calculateMorale.ts`:

```ts
/**
 * Moraalreactie op één uitgevoerd blok: altijd een positief sfeerbericht plus één bericht per strafgevende actie.
 * Met `history` (de eerder uitgevoerde acties) komen daar de eventreacties bij; zonder history is dit exact SPEC v1.0.
 */
export function calculateRoundMorale(blockIndex: number, committedAction: BlockAction, history?: readonly BlockAction[]): MoraleResult {
  ...existing...
  // Batterij ontladen en extra laden kosten geen moraal.
  if (history) events.push(...eventMoraleEvents(blockIndex, committedAction, history));
  return { blockIndex, delta: events.reduce((sum, e) => sum + e.delta, 0), events };
}
```

- [ ] **Step 4: Run** `npx vitest run tests/events.test.ts tests/domain.test.ts` → PASS.

- [ ] **Step 5: Commit** `git add -A src/domain tests && git commit -m "Add hidden morale reactions to events"`

---

### Task 5: Haalbaarheid, game-loop, nieuwe referentie en demo

**Files:**
- Create: `src/domain/completion.ts`
- Create: `REFERENCE_CASE_EVENTS.json`
- Modify: `src/domain/game.ts`
- Modify: `src/domain/referenceSchedule.ts`
- Modify: `tests/fixtures.ts`, `tests/game.test.ts`, `tests/gameStore.test.ts`
- Test: `tests/events.test.ts`, `tests/game.test.ts`

**Interfaces:**
- Consumes: `revealedEvents`, `knownLoadAdjustments`, `generatorUnlockedNews`, `calculateRoundMorale(b, a, history)`, `validateSchedule(…, { generatorUnlocked })`.
- Produces: `hasValidCompletion(executed: readonly BlockAction[]): boolean`; `perfectEventsSchedule(): Schedule` in `referenceSchedule.ts`; fixtures `EVENTS_REFERENCE`, `eventsReferenceSchedule()`.

- [ ] **Step 1: Create fixture** `REFERENCE_CASE_EVENTS.json`

```json
{
  "description": "Perfecte run met events (spec 2026-10-14). Precies één run haalt 87.",
  "initialMorale": 75,
  "capacityKw": 100,
  "schedule": [
    {"blockIndex": 0, "decorationsOff": [], "rinkPaused": false, "batteryDischarge": false, "chargersPaused": false, "extraCharging": true, "message": "precharge"},
    {"blockIndex": 1, "decorationsOff": [], "rinkPaused": false, "batteryDischarge": false, "chargersPaused": true, "extraCharging": false},
    {"blockIndex": 2, "decorationsOff": [], "rinkPaused": true, "batteryDischarge": true, "chargersPaused": false, "extraCharging": false},
    {"blockIndex": 3, "decorationsOff": ["seniors"], "rinkPaused": false, "batteryDischarge": true, "chargersPaused": true, "extraCharging": false},
    {"blockIndex": 4, "decorationsOff": ["homes", "seniors", "square"], "rinkPaused": false, "batteryDischarge": false, "chargersPaused": false, "extraCharging": false},
    {"blockIndex": 5, "decorationsOff": [], "rinkPaused": false, "batteryDischarge": false, "chargersPaused": false, "extraCharging": true}
  ],
  "expected": {
    "blockLoadsKw": [95, 95, 85, 100, 100, 85],
    "moraleAfterBlock": [78, 82, 86, 82, 80, 87],
    "batteryRemainingKwh": [100, 100, 50, 0, 0, 0],
    "newsPerBlock": [["early-birds"], ["snow", "santa-rumour"], ["santa"], [], [], []],
    "finalMorale": 87,
    "valid": true
  }
}
```

`tests/fixtures.ts` — append:

```ts
import eventsCase from '../REFERENCE_CASE_EVENTS.json';
export const EVENTS_REFERENCE = eventsCase;
export const eventsReferenceSchedule = (): Schedule =>
  eventsCase.schedule.map((a) => ({ ...a, decorationsOff: [...a.decorationsOff] }) as BlockAction);
```

- [ ] **Step 2: Write failing tests** (append to `tests/game.test.ts`)

```ts
import { hasValidCompletion } from '../src/domain/completion';
import { perfectEventsSchedule } from '../src/domain/referenceSchedule';
import { EVENTS_REFERENCE, eventsReferenceSchedule, withBlock } from './fixtures';

describe('events in de speelloop', () => {
  it('perfecte run: exacte loads, moraal, batterij en nieuws', () => {
    const s = playAll(createNewGame('run-e', 'Team Kerstman', { schedule: eventsReferenceSchedule() }));
    expect(s.executed.map((e) => e.loadKw)).toEqual(EVENTS_REFERENCE.expected.blockLoadsKw);
    expect(s.executed.map((e) => e.moraleAfter)).toEqual(EVENTS_REFERENCE.expected.moraleAfterBlock);
    expect(s.executed.map((e) => e.batteryAfterKwh)).toEqual(EVENTS_REFERENCE.expected.batteryRemainingKwh);
    expect(s.executed.map((e) => e.news.map((n) => n.eventId))).toEqual(EVENTS_REFERENCE.expected.newsPerBlock);
    expect(s.morale).toBe(87);
    expect(s.generatorUnlocked).toBe(false);
    expect(isCompletedValidRun(s)).toBe(true);
  });

  it('de organisatorendemo is de perfecte run', () => {
    expect(perfectEventsSchedule()).toEqual(eventsReferenceSchedule());
  });

  it('de v1.0-referentie loopt vast op de Kerstman en moet in blok 4 worden bijgestuurd', () => {
    let s = createNewGame('run-v1', 'Team Oud', { schedule: referenceSchedule() });
    for (let i = 0; i < 3; i++) s = continueAfterReview(playBlock(s));
    expect(() => executeNextBlock(s)).toThrow(/110 kW/);
    s = updatePlannedAction(s, { ...s.schedule[4]!, decorationsOff: ['homes', 'seniors', 'square'] });
    expect(playAll2(s).morale).toBe(87);
  });

  it('ontgrendelt het noodaggregaat als een event de avond onoplosbaar maakt', () => {
    const plan = [
      { blockIndex: 0, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: false },
      { blockIndex: 1, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: true, extraCharging: false },
      { blockIndex: 2, decorationsOff: ['homes', 'seniors'], rinkPaused: true, batteryDischarge: false, chargersPaused: false, extraCharging: false },
      { blockIndex: 3, decorationsOff: ['homes', 'seniors', 'hospital', 'square'], rinkPaused: false, batteryDischarge: true, chargersPaused: false, extraCharging: false },
      { blockIndex: 4, decorationsOff: [], rinkPaused: false, batteryDischarge: true, chargersPaused: false, extraCharging: false },
      { blockIndex: 5, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: true },
    ] as Schedule;
    let s = createNewGame('run-g', 'Team Klem', { schedule: plan });
    for (let i = 0; i < 3; i++) s = continueAfterReview(playBlock(s));
    expect(s.generatorUnlocked).toBe(true);
    expect(s.executed[2]!.news.map((n) => n.eventId)).toEqual(['exodus', 'santa', 'generator']);
    expect(hasValidCompletion(s.executed.map((e) => e.action))).toBe(false);
    // Vooraf geldig: blok 2 = 150 − 20 − 30 = 100. Na blok 2: blok 3 = 155 + 15 − 40 − 25 = 105 → met aggregaat 85.
    // Blok 4: 125 + 20 − 25 = 120 → woonwijk + senioren uit en aggregaat = 80.
    s = updatePlannedAction(s, { ...s.schedule[3]!, emergencyGenerator: true });
    s = updatePlannedAction(s, { ...s.schedule[4]!, decorationsOff: ['homes', 'seniors'], emergencyGenerator: true });
    s = playAll2(s);
    expect(s.phase).toBe('FINISHED');
    expect(s.executed[3]!.events.some((e) => e.eventId === 'generator-used')).toBe(true);
    expect(isCompletedValidRun(s)).toBe(true);
  });

  it('hasValidCompletion is waar voor een normaal begin', () => {
    expect(hasValidCompletion([])).toBe(true);
    expect(hasValidCompletion(eventsReferenceSchedule().slice(0, 3))).toBe(true);
  });
});
```

Add helper next to `playAll` in `tests/game.test.ts`:

```ts
/** Speelt alle resterende blokken. */
function playAll2(state: GameState): GameState {
  let s = state;
  while (s.executed.length < 6) s = continueAfterReview(playBlock(s));
  return s;
}
```

and `import type { GameState, Schedule } from '../src/domain/types';`.

- [ ] **Step 3: Run** `npx vitest run tests/game.test.ts` → FAIL.

- [ ] **Step 4: Implement**

`src/domain/completion.ts`:

```ts
import { calculateLoad } from './calculateLoad';
import { knownLoadAdjustments } from './events';
import { BATTERY, BLOCK_COUNT, CAPACITY_KW, CHARGERS, DECORATION_BLOCKS, DECORATION_IDS, RINK, createEmptyAction } from './scenario';
import type { BlockAction, DecorationId } from './types';

const DECORATION_SETS: readonly DecorationId[][] = Array.from({ length: 1 << DECORATION_IDS.length }, (_, mask) =>
  DECORATION_IDS.filter((_, bit) => mask & (1 << bit)),
);

/**
 * Bestaat er, met alles wat nu bekend is, nog een geldig vervolg zonder noodaggregaat?
 * Kleine uitputtende zoektocht over de resterende blokken; puur en deterministisch.
 */
export function hasValidCompletion(executed: readonly BlockAction[]): boolean {
  const adjustments = knownLoadAdjustments(executed);
  const count = (pick: (a: BlockAction) => boolean) => executed.filter(pick).length;
  const memo = new Map<string, boolean>();

  const search = (b: number, rink: number, battery: number, pauses: number, extras: number): boolean => {
    if (b === BLOCK_COUNT) return pauses === extras;
    const extraSlotsLeft = CHARGERS.extraBlocks.filter((x) => x >= b).length;
    if (pauses > extras + extraSlotsLeft) return false;
    const key = `${b}|${rink}|${battery}|${pauses}|${extras}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let found = false;
    for (const action of candidateActions(b, rink, battery, pauses)) {
      if (calculateLoad(b, action, adjustments[b] ?? 0) > CAPACITY_KW) continue;
      if (search(b + 1, rink + Number(action.rinkPaused), battery + Number(action.batteryDischarge), pauses + Number(action.chargersPaused), extras + Number(action.extraCharging))) {
        found = true;
        break;
      }
    }
    memo.set(key, found);
    return found;
  };

  return search(
    executed.length,
    count((a) => a.rinkPaused),
    count((a) => a.batteryDischarge),
    count((a) => a.chargersPaused),
    count((a) => a.extraCharging),
  );
}

function* candidateActions(b: number, rink: number, battery: number, pauses: number): Generator<BlockAction> {
  const base = createEmptyAction(b);
  const decorationSets = DECORATION_BLOCKS.includes(b) ? DECORATION_SETS : [[]];
  const rinkOptions = RINK.allowedBlocks.includes(b) && rink < RINK.maxUses ? [false, true] : [false];
  const batteryOptions = BATTERY.allowedBlocks.includes(b) && battery < BATTERY.maxUses ? [false, true] : [false];
  const pauseOptions = CHARGERS.pauseBlocks.includes(b) && pauses < CHARGERS.maxPauses ? [false, true] : [false];
  const extraOptions = CHARGERS.extraBlocks.includes(b) ? [false, true] : [false];
  for (const decorationsOff of decorationSets)
    for (const rinkPaused of rinkOptions)
      for (const batteryDischarge of batteryOptions)
        for (const chargersPaused of pauseOptions)
          for (const extraCharging of extraOptions)
            yield { ...base, decorationsOff, rinkPaused, batteryDischarge, chargersPaused, extraCharging };
}
```

`src/domain/game.ts` — `executeNextBlock` becomes:

```ts
export function executeNextBlock(state: GameState): GameState {
  if (state.phase !== 'PLANNING') throw new GameRuleError('Er kan alleen vanuit de planning een blok worden gestart.');
  const blockIndex = state.executed.length;
  if (blockIndex >= BLOCK_COUNT) throw new GameRuleError('Alle tijdsblokken zijn al uitgevoerd.');

  const history = executedActions(state);
  const issues = validateSchedule(state.schedule, history, { generatorUnlocked: state.generatorUnlocked });
  if (issues.length > 0) {
    throw new GameRuleError(`Het programma is nog niet geldig: ${issues.map((i) => i.message).join(' ')}`);
  }

  const action = cloneAction(state.schedule[blockIndex]!);
  const previousBattery = state.executed.at(-1)?.batteryAfterKwh ?? BATTERY.capacityKwh;
  const morale = calculateRoundMorale(blockIndex, action, history);
  const moraleAfter = applyMoraleDelta(state.morale, morale.delta);

  // Wat dit blok onthult, en of het dorp daardoor klem zit.
  const after = [...history, action];
  const news = revealedEvents(after).filter((e) => e.revealedAfterBlock === blockIndex);
  const stuck = !state.generatorUnlocked && blockIndex < BLOCK_COUNT - 1 && !hasValidCompletion(after);
  if (stuck) news.push(generatorUnlockedNews(blockIndex));

  const executedBlock: ExecutedBlock = {
    action,
    loadKw: calculateLoad(blockIndex, action, knownLoadAdjustments(history)[blockIndex] ?? 0),
    batteryAfterKwh: previousBattery - (action.batteryDischarge ? BATTERY.energyPerBlockKwh : 0),
    moraleBefore: state.morale,
    moraleAfter,
    delta: moraleAfter - state.morale,
    events: morale.events,
    news,
  };

  return {
    ...state,
    phase: 'ROUND_RUNNING',
    morale: moraleAfter,
    executed: [...state.executed, executedBlock],
    generatorUnlocked: state.generatorUnlocked || stuck,
  };
}
```

`cloneAction` stays (spread copies the optional fields). `isCompletedValidRun`:

```ts
  const actions = executedActions(state);
  return (
    state.phase === 'FINISHED' &&
    state.executed.length === BLOCK_COUNT &&
    validateSchedule(actions, actions, { generatorUnlocked: state.generatorUnlocked }).length === 0
  );
```

`src/domain/referenceSchedule.ts` — add (keep `referenceDemoSchedule`):

```ts
/** De enige run die met events 87 haalt (REFERENCE_CASE_EVENTS.json), voor de organisatorendemo. */
export function perfectEventsSchedule(): Schedule {
  return [
    { blockIndex: 0, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: true, message: 'precharge' },
    { blockIndex: 1, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: true, extraCharging: false },
    { blockIndex: 2, decorationsOff: [], rinkPaused: true, batteryDischarge: true, chargersPaused: false, extraCharging: false },
    { blockIndex: 3, decorationsOff: ['seniors'], rinkPaused: false, batteryDischarge: true, chargersPaused: true, extraCharging: false },
    { blockIndex: 4, decorationsOff: ['homes', 'seniors', 'square'], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: false },
    { blockIndex: 5, decorationsOff: [], rinkPaused: false, batteryDischarge: false, chargersPaused: false, extraCharging: true },
  ];
}
```

- [ ] **Step 5: Migrate existing game-loop tests.** In `tests/game.test.ts` and `tests/gameStore.test.ts`, every test that plays the full v1.0 reference through `executeNextBlock`/store now uses `eventsReferenceSchedule()` and the expected values from `EVENTS_REFERENCE.expected` (morale `[78, 82, 86, 82, 80, 87]`, loads `[95, 95, 85, 100, 100, 85]`). Tests that only play blocks 0-2 of the v1.0 reference may keep it. The "7. blok 2 uitvoeren" test: replace its block-4 patch with `decorationsOff: ['homes', 'seniors', 'square']` on the events reference. Scene test 11: expectations for block 4 become `homes: false` as well.

- [ ] **Step 6: Run** `npx vitest run` and `npm run typecheck` → all PASS (component tests may still fail until Task 7/8 if they play full runs; if so, migrate the full-loop App test in `tests/components.test.ts` the same way now: use `perfectEventsSchedule()` and final morale 87).

- [ ] **Step 7: Commit** `git add -A && git commit -m "Run events through the game loop with generator safety valve and new reference"`

---

### Task 6: Balanstest (uitputtend)

**Files:**
- Create: `tests/balance.test.ts`

**Interfaces:**
- Consumes: `calculateLoad`, `knownLoadAdjustments`, `calculateRoundMorale(b, a, history)`, `applyMoraleDelta`, scenario constants.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { calculateLoad } from '../src/domain/calculateLoad';
import { applyMoraleDelta, calculateRoundMorale } from '../src/domain/calculateMorale';
import { knownLoadAdjustments } from '../src/domain/events';
import { BATTERY, CAPACITY_KW, CHARGERS, DECORATION_IDS, INITIAL_MORALE, RINK, createEmptyAction } from '../src/domain/scenario';
import type { BlockAction, CommsMessage, DecorationId } from '../src/domain/types';
import { eventsReferenceSchedule } from './fixtures';

const SETS: DecorationId[][] = Array.from({ length: 16 }, (_, m) => DECORATION_IDS.filter((_, b) => m & (1 << b)));

function options(b: number): BlockAction[] {
  const base = createEmptyAction(b);
  if (b === 0) return (['none', 'precharge', 'notice'] as CommsMessage[]).map((message) => ({ ...base, message, extraCharging: message === 'precharge' }));
  if (b === 5) return [base, { ...base, extraCharging: true }];
  const out: BlockAction[] = [];
  for (const decorationsOff of SETS)
    for (const rinkPaused of RINK.allowedBlocks.includes(b) ? [false, true] : [false])
      for (const batteryDischarge of [false, true])
        for (const chargersPaused of [false, true]) out.push({ ...base, decorationsOff, rinkPaused, batteryDischarge, chargersPaused });
  return out;
}

/** Hoogste eindmoraal over alle complete, geldige avonden (met volledige kennis; zonder noodaggregaat). */
function searchOptimum() {
  let best = -1;
  let bestRuns: BlockAction[][] = [];
  const walk = (history: BlockAction[], morale: number) => {
    const b = history.length;
    if (b === 6) {
      const pauses = history.filter((a) => a.chargersPaused).length;
      if (pauses !== history.filter((a) => a.extraCharging).length) return;
      if (morale > best) [best, bestRuns] = [morale, [history]];
      else if (morale === best) bestRuns.push(history);
      return;
    }
    const adjustment = knownLoadAdjustments(history)[b] ?? 0;
    for (const a of options(b)) {
      const next = [...history, a];
      if (next.filter((x) => x.rinkPaused).length > RINK.maxUses) continue;
      if (next.filter((x) => x.batteryDischarge).length > BATTERY.maxUses) continue;
      const pauses = next.filter((x) => x.chargersPaused).length;
      if (pauses > CHARGERS.maxPauses || pauses > next.filter((x) => x.extraCharging).length + (b < 5 ? 1 : 0)) continue;
      if (calculateLoad(b, a, adjustment) > CAPACITY_KW) continue;
      walk(next, applyMoraleDelta(morale, calculateRoundMorale(b, a, history).delta));
    }
  };
  walk([], INITIAL_MORALE);
  return { best, bestRuns };
}

describe('balans met events', () => {
  it('maximale eindmoraal is 87, met precies één perfecte run', () => {
    const { best, bestRuns } = searchOptimum();
    expect(best).toBe(87);
    expect(bestRuns).toHaveLength(1);
    expect(bestRuns[0]).toEqual(eventsReferenceSchedule().map((a) => ({ ...createEmptyAction(a.blockIndex), ...a })));
  }, 300_000);
});
```

Note: `knownLoadAdjustments(history)` uses only executed history, which equals "full knowledge" for block `b` because every load effect on block `b` is revealed after a block `< b`.

- [ ] **Step 2: Run** `npx vitest run tests/balance.test.ts` → PASS (expect up to a minute). If the fixture comparison fails only because of `message: undefined` vs missing key, normalise both sides with `JSON.parse(JSON.stringify(...))`.

- [ ] **Step 3: Commit** `git add tests/balance.test.ts && git commit -m "Pin event balance: max 87 with one perfect run"`

---

### Task 7: Store-versie, App-koppeling en planner

**Files:**
- Modify: `src/state/gameStore.ts` (`STORAGE_VERSION = 2`)
- Modify: `src/App.vue`
- Modify: `src/components/PlanningBoard.vue`
- Test: `tests/components.test.ts`, `tests/gameStore.test.ts`

**Interfaces:**
- Consumes: `revealedEvents`, `eventLoadAdjustments`, `knownLoadAdjustments`, `EVENT_ICONS`, `GENERATOR`, `messageOf`, `validateSchedule(…, { generatorUnlocked })`.
- Produces: `PlanningBoard` prop `generatorUnlocked?: boolean`.

- [ ] **Step 1: Write failing tests**

`tests/gameStore.test.ts`:

```ts
  it('negeert een opgeslagen spel van versie 1', () => {
    const storage = memoryStorageForTest();
    storage.setItem('merry-gridmas:game', JSON.stringify({ version: 1, game: { phase: 'PLANNING' }, hardwareMode: 'mock' }));
    expect(createGameStore({ storage }).state.game).toBeNull();
  });
```

(Use the same in-memory storage helper the existing "negeert opgeslagen data van een andere versie" test uses.)

`tests/components.test.ts`: extend `FORBIDDEN_IMPORTS` with `'eventMorale'`, and add:

```ts
describe('PlanningBoard met events', () => {
  const executed = perfectEventsSchedule().slice(0, 3);

  it('toont onthulde eventbelasting in de kolomkop en rekent ermee', () => {
    const wrapper = mount(PlanningBoard, { props: { schedule: referenceSchedule(), executedActions: executed } });
    const head4 = wrapper.findAll('.block-head')[4]!;
    expect(head4.text()).toContain('🎅 +20 kW');
    expect(head4.text()).toContain('🚗 −10 kW');
    expect(wrapper.text()).toContain('110 kW');
    expect(wrapper.find('button.play').attributes('disabled')).toBeDefined();
  });

  it('toont geen moraal in eventnieuws', () => {
    const wrapper = mount(PlanningBoard, { props: { schedule: perfectEventsSchedule(), executedActions: executed } });
    expect(wrapper.html().toLowerCase()).not.toMatch(/moraal|penalty|morale/);
    expect(wrapper.text()).toContain('De Kerstman komt zijn slee laden');
  });

  it('communicatieblok: kiezen voor aankondiging zet extra laden uit', async () => {
    const wrapper = mount(PlanningBoard, { props: { schedule: perfectEventsSchedule(), executedActions: [] } });
    await wrapper.find('[data-message="notice"]').trigger('click');
    const emitted = wrapper.emitted('update')!.at(-1)![0] as BlockAction;
    expect(emitted).toMatchObject({ blockIndex: 0, message: 'notice', extraCharging: false });
  });

  it('toont het noodaggregaat alleen als het ontgrendeld is', () => {
    const locked = mount(PlanningBoard, { props: { schedule: perfectEventsSchedule(), executedActions: [] } });
    expect(locked.find('[data-asset="generator"]').exists()).toBe(false);
    const open = mount(PlanningBoard, { props: { schedule: perfectEventsSchedule(), executedActions: [], generatorUnlocked: true } });
    expect(open.find('[data-asset="generator"]').exists()).toBe(true);
  });
});
```

(imports: `perfectEventsSchedule` from `../src/domain/referenceSchedule`, `type BlockAction` from `../src/domain/types`.)

- [ ] **Step 2: Run** `npx vitest run tests/components.test.ts tests/gameStore.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/state/gameStore.ts`: `const STORAGE_VERSION = 2;` (comment: `// 2: events, communicatieblok en noodaggregaat`).

`src/App.vue`:
- import `knownLoadAdjustments` from `./domain/events`.
- `shownLoad`: `calculateLoad(shownIndex.value, g.schedule[shownIndex.value]!, knownLoadAdjustments(executedActions.value)[shownIndex.value] ?? 0)`.
- Pass `:generator-unlocked="game.generatorUnlocked"` to `<PlanningBoard>`.

`src/components/PlanningBoard.vue` script:

```ts
import { eventLoadAdjustments, revealedEvents } from '../domain/events';
import { EVENT_ICONS } from '../domain/eventNews';
import { BATTERY, BLOCKS, CAPACITY_KW, CHARGERS, DECORATIONS, DECORATION_BLOCKS, GENERATOR, RINK, messageOf } from '../domain/scenario';
import type { AssetId, BlockAction, CommsMessage, DecorationId, Schedule } from '../domain/types';

const props = defineProps<{
  selectedBlock?: number;
  schedule: Schedule;
  executedActions: BlockAction[];
  generatorUnlocked?: boolean;
  error?: string | null;
}>();

const news = computed(() => revealedEvents(props.executedActions));
const adjustments = computed(() => eventLoadAdjustments(news.value));
const loads = computed(() => calculateLoads(props.schedule, adjustments.value));
const issues = computed(() => validateSchedule(props.schedule, props.executedActions, { generatorUnlocked: props.generatorUnlocked }));
const message = computed(() => messageOf(props.schedule[0]));

const MESSAGES: { id: CommsMessage; label: string; hint: string }[] = [
  { id: 'none', label: 'Niets', hint: 'Geen bericht. Het dorp merkt vanzelf wat er gebeurt.' },
  { id: 'precharge', label: 'Laad alvast op', hint: `+${CHARGERS.extraKw} kW nu, en ruimte voor een extra laadpauze later.` },
  { id: 'notice', label: 'Aankondiging', hint: 'We vertellen wat we vanavond dimmen. Minder verrassingen in het dorp.' },
];

function setMessage(m: CommsMessage): void {
  patch(0, { message: m, extraCharging: m === 'precharge' }, 'chargers');
}

/** Belastingseffecten van onthulde events per blok, voor de kolomkop. */
function eventChips(i: number): { key: string; label: string; title: string }[] {
  return news.value.flatMap((e) =>
    e.loadEffects
      .filter((effect) => effect.blockIndex === i)
      .map((effect) => ({
        key: `${e.eventId}-${e.revealedAfterBlock}`,
        label: `${EVENT_ICONS[e.eventId]} ${effect.deltaKw > 0 ? '+' : '−'}${Math.abs(effect.deltaKw)} kW`,
        title: e.headline,
      })),
  );
}
```

`toggleSelected` chargers branch: `else if (id === 'chargers') { if (i === 0) setMessage(message.value === 'precharge' ? 'none' : 'precharge'); else patch(i, CHARGERS.extraBlocks.includes(i) ? { extraCharging: !a.extraCharging } : { chargersPaused: !a.chargersPaused }); }`

Template changes:
1. In each `.block-head` after `.phase`: `<span v-for="chip in eventChips(block.index)" :key="chip.key" class="event-chip" :title="chip.title">{{ chip.label }}</span>`.
2. New row before "Feestverlichting" with `data-asset="message"` label "Bericht aan het dorp" / muted "Eén bericht om 14:00". Block 0 cell: segmented control

```html
<div class="cell comms" :class="{ locked: isLocked(0) }">
  <div role="radiogroup" aria-label="Bericht aan het dorp, 14:00-16:00" class="segmented">
    <button v-for="m in MESSAGES" :key="m.id" type="button" role="radio" :data-message="m.id"
      :aria-checked="message === m.id" :class="{ active: message === m.id }" :title="m.hint"
      :disabled="isLocked(0)" @click="setMessage(m.id)">{{ m.label }}</button>
  </div>
  <span class="muted hint">{{ MESSAGES.find((m) => m.id === message)!.hint }}</span>
</div>
```

Blocks 1-5: `<span class="na" aria-label="geen bericht mogelijk">–</span>`.
3. Laadplein row, block 0 (the `v-else` extra-charging button): only for `block.index === 5` keep the toggle. For block 0 render a read-only status `<span class="toggle is-readonly">{{ message === 'precharge' ? 'Extra laden (bericht)' : 'Stand-by' }}<span v-if="message === 'precharge'" class="kw-tag">+{{ CHARGERS.extraKw }} kW</span></span>`.
4. Generator row after Batterij, `v-if="generatorUnlocked"`: label button `data-asset="generator"` "Noodaggregaat" / muted `Alleen in nood: −{{ GENERATOR.reductionKw }} kW`; cells for `GENERATOR.allowedBlocks` with toggle `aria-pressed`, text `Aan`/`Uit`, kw-tag `−20 kW`, click `patch(block.index, { emergencyGenerator: !schedule[block.index]!.emergencyGenerator })`; other blocks `–`.
5. Equation row: replace the span with `{{ block.baselineLoadKw }}<template v-if="adjustments[block.index]"> {{ adjustments[block.index]! > 0 ? '+' : '−' }} {{ Math.abs(adjustments[block.index]!) }}</template> − {{ reductionFor(block.index) }} + {{ extraFor(block.index) }}` with helpers

```ts
const extraFor = (i: number) => (props.schedule[i]!.extraCharging ? CHARGERS.extraKw : 0);
const reductionFor = (i: number) => BLOCKS[i]!.baselineLoadKw + adjustments.value[i]! + extraFor(i) - loads.value[i]!;
```

and change the row-label muted text to "Basis ± nieuws − inzet + extra".
6. Side panel: below "Klopt het programma?" heading add

```html
<section v-if="news.length" class="known-news" aria-label="Nieuws dat de planning raakt">
  <h4>Wat het dorp weet</h4>
  <ul><li v-for="e in news" :key="`${e.eventId}-${e.revealedAfterBlock}`">{{ EVENT_ICONS[e.eventId] }} <strong>{{ e.headline }}</strong><span v-if="e.kind === 'rumour'" class="muted"> (gerucht)</span></li></ul>
</section>
```

Styles (scoped, matching existing tokens): `.event-chip { font-size: .7rem; padding: .1rem .35rem; border-radius: 999px; background: var(--night-raised); border: 1px solid var(--line); }`, `.segmented { display: flex; gap: .25rem; flex-wrap: wrap; } .segmented button { font-size: .75rem; padding: .25rem .5rem; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: inherit; } .segmented button.active { background: var(--green, #2f7d4f); color: #fff; }`, `.known-news ul { list-style: none; padding: 0; display: grid; gap: .3rem; font-size: .85rem; }`. Use existing CSS variables from `src/styles.css`; check names there before writing.

- [ ] **Step 4: Run** `npx vitest run` and `npm run typecheck` → PASS.

- [ ] **Step 5: Commit** `git add -A && git commit -m "Show events, comms block and generator in the planner"`

---

### Task 8: Bulletin, tijdlijn, eindscherm, geluid en demo

**Files:**
- Modify: `src/components/RoundReview.vue`, `src/components/HistoryTimeline.vue`, `src/components/FinalScreen.vue`, `src/components/OrganizerControls.vue`, `src/audio/soundscape.ts`
- Test: `tests/components.test.ts`, `tests/fun.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/components.test.ts`:

```ts
import RoundReview from '../src/components/RoundReview.vue';
import { generatorUnlockedNews, revealedEvents } from '../src/domain/events';

describe('RoundReview met events', () => {
  it('toont breaking news met concrete kW-regels en markeert geruchten', () => {
    const actions = perfectEventsSchedule().slice(0, 2);
    const executed = {
      action: actions[1]!, loadKw: 95, batteryAfterKwh: 100, moraleBefore: 78, moraleAfter: 82, delta: 4,
      events: [{ assetId: 'atmosphere' as const, blockIndex: 1, delta: 5, headline: 'x', text: 'y' }],
      news: revealedEvents(actions).filter((e) => e.revealedAfterBlock === 1),
    };
    const wrapper = mount(RoundReview, { props: { executed, isLast: false } });
    const breaking = wrapper.find('.breaking-news');
    expect(breaking.text()).toContain('Sneeuwbui boven Gridmas');
    expect(breaking.text()).toContain('18:00-20:00: −10 kW');
    expect(breaking.text()).toContain('Gerucht');
  });

  it('meldt het noodaggregaat', () => {
    const a = perfectEventsSchedule()[2]!;
    const executed = { action: a, loadKw: 100, batteryAfterKwh: 50, moraleBefore: 80, moraleAfter: 82, delta: 2, events: [], news: [generatorUnlockedNews(2)] };
    expect(mount(RoundReview, { props: { executed, isLast: false } }).text()).toContain('Noodaggregaat ontgrendeld');
  });
});
```

`tests/fun.test.ts` (soundscape describe):

```ts
  it('geeft eventreacties een eigen klank', () => {
    const executed = { ...someExecutedBlock, events: [atmosphereEvent, { assetId: 'event', eventId: 'stargazers', blockIndex: 4, delta: 3, headline: '', text: '' }] };
    expect(buildNewsSoundscape(executed as ExecutedBlock).map((c) => c.kind)).toContain('sparkle');
  });
```

(Reuse whatever executed-block fixture the existing soundscape tests build; add `news: []` to it.)

- [ ] **Step 2: Run** `npx vitest run tests/components.test.ts tests/fun.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`RoundReview.vue`: import `EVENT_ICONS` from `../domain/eventNews`; add helper `const kw = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);`. Above `<ol class="events">`:

```html
<section v-if="executed.news.length" class="breaking-news" aria-label="Breaking news">
  <h3>Breaking news</h3>
  <article v-for="n in executed.news" :key="`${n.eventId}-${n.revealedAfterBlock}`" :class="n.kind">
    <span class="icon" aria-hidden="true">{{ EVENT_ICONS[n.eventId] }}</span>
    <div>
      <p v-if="n.kind === 'rumour'" class="eyebrow">Gerucht</p>
      <h4>{{ n.headline }}</h4>
      <p>{{ n.text }}</p>
      <p v-for="effect in n.loadEffects" :key="effect.blockIndex" class="effect">
        {{ BLOCKS[effect.blockIndex]!.label }}: {{ kw(effect.deltaKw) }} kW
      </p>
    </div>
  </article>
  <p v-if="executed.news.some((n) => n.loadEffects.length)" class="muted">Check de planning: de belasting van komende blokken is veranderd.</p>
</section>
```

Event morale lines: in the `<li>` for events, add class `event: event.assetId === 'event'`. In "score-arithmetic" keep sums as is (they already include all deltas).

`HistoryTimeline.vue`: inside each `<ul>` add `<li v-for="n in e.news" :key="`n-${n.eventId}`" class="news">{{ EVENT_ICONS[n.eventId] }} {{ n.headline }}</li>` (import `EVENT_ICONS`).

`FinalScreen.vue`:
- `const evening = computed(() => props.game.executed.flatMap((e) => e.news).filter((n) => n.kind === 'news'));`
- New section after highlights: `<section v-if="evening.length" class="evening-events"><h3>Gebeurtenissen van de avond</h3><ul><li v-for="n in evening" :key="`${n.eventId}-${n.revealedAfterBlock}`">{{ EVENT_ICONS[n.eventId] }} {{ BLOCKS[n.revealedAfterBlock]!.label }} · {{ n.headline }}</li></ul></section>`
- highlights `:key` becomes `` `${event.assetId}-${event.eventId ?? ''}-${event.blockIndex}` ``.
- `actionSummary`: add `if (a.message === 'notice') parts.push('aankondiging');` and `if (a.emergencyGenerator) parts.push('noodaggregaat');`.

`OrganizerControls.vue`: import and use `perfectEventsSchedule()` instead of `referenceDemoSchedule()`; adjust any demo label text that mentions the reference to "perfecte run".

`soundscape.ts` penalty loop: first branch `if (event.assetId === 'event') add(event.delta > 0 ? 'sparkle' : 'groan', Math.abs(event.delta) / 10); else if (...)`.

- [ ] **Step 4: Run** `npx vitest run` and `npm run typecheck` → PASS.

- [ ] **Step 5: Commit** `git add -A && git commit -m "Show events in bulletin, timeline and final screen"`

---

### Task 9: SPEC.md, hostkaart en eindverificatie

**Files:**
- Modify: `SPEC.md`, `docs/HOSTKAART.md`, `CLAUDE.md` (regressie-fixture regel)

- [ ] **Step 1: Update SPEC.md**
  - §1 Bewuste beperkingen: replace "onverwachte willekeurige events" by "willekeurige events (events zijn deterministisch en volgen uit uitgevoerde keuzes, zie §2.6)".
  - §2 tabel: blok 0 fase "communicatie". Add §2.0-paragraph "Communicatieblok" with the rules from the design spec.
  - New §2.6 "Gebeurtenissen" with the event table, timing, and the Noodaggregaat rules; formula extension.
  - §3.1: add event morale table (sterrenkijkers +3, zusterkoor +3, toeteren −4, appgroep −3, Gouden Ster chagrijnig −3, noodaggregaat −10) and note that `calculateRoundMorale` zonder historie v1.0 is.
  - §4.1 punt 5: bulletin toont "Breaking news" met onthulde events.
  - §8: keep v1.0 table as "functietest zonder events"; add the events reference table from the design spec, stating max 87 with exactly one perfect run.
- [ ] **Step 2: Update `docs/HOSTKAART.md`** with a short "Gebeurtenissen" section for hosts (Kerstman-val, communicatieblok, noodaggregaat; never reveal morale numbers).
- [ ] **Step 3: Update `CLAUDE.md`**: regressie-fixtures `REFERENCE_CASE.json` (v1.0, functieniveau, 87) en `REFERENCE_CASE_EVENTS.json` (speelloop met events, 87).
- [ ] **Step 4: Verify** `npm run typecheck && npm test && npm run build` → all succeed.
- [ ] **Step 5: Commit** `git add -A && git commit -m "Document events in SPEC, host card and project instructions"`
