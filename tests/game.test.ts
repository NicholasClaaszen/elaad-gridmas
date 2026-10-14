import { describe, expect, it } from 'vitest';
import { projectToEducationalOpenAdr, OPENADR_DISCLAIMER } from '../src/domain/educationalOpenAdr';
import {
  GameRuleError,
  completeRound,
  continueAfterReview,
  createNewGame,
  executeNextBlock,
  isCompletedValidRun,
  updatePlannedAction,
} from '../src/domain/game';
import { addLeaderboardEntry, parseLeaderboardJson, rankLeaderboard, serializeLeaderboard } from '../src/domain/leaderboard';
import { buildScene } from '../src/domain/scene';
import { hasValidCompletion } from '../src/domain/completion';
import { perfectEventsSchedule } from '../src/domain/referenceSchedule';
import type { GameState, Schedule } from '../src/domain/types';
import { EVENTS_REFERENCE, eventsReferenceSchedule, referenceSchedule } from './fixtures';

function playBlock(state: GameState): GameState {
  return completeRound(executeNextBlock(state));
}

/** Speelt alle resterende blokken. */
function playRest(state: GameState): GameState {
  let s = state;
  while (s.executed.length < 6) s = continueAfterReview(playBlock(s));
  return s;
}

function playAll(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 6; i++) s = continueAfterReview(playBlock(s));
  return s;
}

describe('state machine', () => {
  it('doorloopt PLANNING -> ROUND_RUNNING -> ROUND_REVIEW -> PLANNING ... -> FINISHED', () => {
    let s = createNewGame('run-1', 'Team Rendier', { schedule: eventsReferenceSchedule() });
    expect(s.phase).toBe('PLANNING');
    s = executeNextBlock(s);
    expect(s.phase).toBe('ROUND_RUNNING');
    s = completeRound(s);
    expect(s.phase).toBe('ROUND_REVIEW');
    s = continueAfterReview(s);
    expect(s.phase).toBe('PLANNING');
    s = playAll({ ...s, executed: [], morale: 75 });
    expect(s.phase).toBe('FINISHED');
    expect(s.morale).toBe(87);
    expect(s.executed.map((e) => e.moraleAfter)).toEqual([78, 82, 86, 82, 80, 87]);
    expect(s.executed.map((e) => e.batteryAfterKwh)).toEqual([100, 100, 50, 0, 0, 0]);
    expect(isCompletedValidRun(s)).toBe(true);
  });

  it('6. overbelasting blokkeert starten', () => {
    const s = createNewGame('run-1', 'Team Leeg');
    expect(() => executeNextBlock(s)).toThrow(GameRuleError);
  });

  it('7. blok 2 uitvoeren vergrendelt 0-2 en behoudt eerdere events', () => {
    let s = createNewGame('run-1', 'Team Slee', { schedule: referenceSchedule() });
    for (let i = 0; i < 3; i++) s = continueAfterReview(playBlock(s));
    const historyBefore = structuredClone(s.executed);

    for (const locked of [0, 1, 2]) {
      expect(() => updatePlannedAction(s, { ...s.schedule[locked]!, decorationsOff: ['homes'] })).toThrow(GameRuleError);
    }
    // Toekomst blijft aanpasbaar
    s = updatePlannedAction(s, { ...s.schedule[4]!, decorationsOff: ['seniors', 'square', 'homes'] });
    s = continueAfterReview(playBlock(s));
    expect(s.executed.slice(0, 3)).toEqual(historyBefore);
  });

  it('kan geen geplande planning wijzigen tijdens een lopende ronde', () => {
    const s = executeNextBlock(createNewGame('run-1', 'Team', { schedule: referenceSchedule() }));
    expect(() => updatePlannedAction(s, s.schedule[3]!)).toThrow(GameRuleError);
  });

  it('weigert een toekomst die de historie ongeldig maakt (laadneutraliteit)', () => {
    let s = createNewGame('run-1', 'Team', { schedule: referenceSchedule() });
    s = continueAfterReview(playBlock(s)); // blok 0: vooruitladen is definitief
    s = updatePlannedAction(s, { ...s.schedule[1]!, chargersPaused: false, decorationsOff: ['homes', 'hospital'] });
    s = updatePlannedAction(s, { ...s.schedule[5]!, extraCharging: false });
    s = updatePlannedAction(s, { ...s.schedule[3]!, chargersPaused: false, decorationsOff: ['seniors', 'square', 'hospital'] });
    // Nu: 1 extra sessie (blok 0, al uitgevoerd), 0 pauzes -> niet neutraal
    expect(() => executeNextBlock(s)).toThrow(/^Het programma is nog niet geldig: Er wordt 40 kWh extra geladen zonder bijbehorende pauze/);
  });

  it('9. twee identieke runs geven identieke feedback en score', () => {
    const a = playAll(createNewGame('run-a', 'Team', { schedule: eventsReferenceSchedule() }));
    const b = playAll(createNewGame('run-b', 'Team', { schedule: eventsReferenceSchedule() }));
    expect(a.executed).toEqual(b.executed);
  });
});

describe('scene', () => {
  it('vertaalt een uitgevoerd blok naar de fysieke toestand', () => {
    const s = playAll(createNewGame('run-1', 'Team', { schedule: eventsReferenceSchedule() }));
    expect(buildScene(s.executed[3]!)).toEqual({
      blockIndex: 3,
      zoneLightsOn: { homes: true, seniors: false, hospital: true, square: true },
      rinkOpen: true,
      chargers: 'paused',
      batteryPercent: 0,
      netStatus: 'safe',
    });
    expect(buildScene(s.executed[0]!).chargers).toBe('extra-charging');
    expect(buildScene(s.executed[2]!)).toMatchObject({ rinkOpen: false, batteryPercent: 50 });
  });
});

describe('leaderboard', () => {
  const entry = (runId: string, finalMorale: number) => ({
    runId, teamName: runId, finalMorale, completedAt: '2026-12-24T12:00:00.000Z', status: 'valid' as const,
  });

  it('deelt plaatsen bij gelijke score', () => {
    const ranked = rankLeaderboard([entry('a', 80), entry('b', 87), entry('c', 80), entry('d', 60)]);
    expect(ranked.map((r) => [r.runId, r.rank])).toEqual([['b', 1], ['a', 2], ['c', 2], ['d', 4]]);
  });

  it('voegt dezelfde run nooit dubbel toe', () => {
    expect(addLeaderboardEntry([entry('a', 80)], entry('a', 80))).toHaveLength(1);
  });

  it('exporteert en importeert JSON', () => {
    const json = serializeLeaderboard([entry('a', 80)]);
    expect(parseLeaderboardJson(json)).toEqual([entry('a', 80)]);
    expect(() => parseLeaderboardJson('{"entries":[{"runId":1}]}')).toThrow();
    expect(() => parseLeaderboardJson('geen json')).toThrow();
  });
});

describe('educatieve OpenADR-projectie', () => {
  it('maakt per assetactie een event met PT2H en draagt het disclaimer-label', () => {
    const program = projectToEducationalOpenAdr(referenceSchedule());
    expect(program.label).toBe(OPENADR_DISCLAIMER);
    expect(program.program.programName).toBe('GRIDMAS-CHRISTMAS-EVE');
    // 0: extra, 1: pauze, 2: ijsbaan+batterij, 3: senioren+batterij+pauze, 4: senioren+plein, 5: extra
    expect(program.events).toHaveLength(1 + 1 + 2 + 3 + 2 + 1);
    expect(program.events.every((e) => e.intervalPeriod.duration === 'PT2H')).toBe(true);
    expect(program.events.at(-1)!.intervalPeriod.start).toBe('2026-12-25T00:00:00');
    expect(program.events[0]!.intervalPeriod.start).toBe('2026-12-24T14:00:00');
  });
});

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
    expect(playRest(s).morale).toBe(87);
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
    s = playRest(s);
    expect(s.phase).toBe('FINISHED');
    expect(s.executed[3]!.events.some((e) => e.eventId === 'generator-used')).toBe(true);
    expect(isCompletedValidRun(s)).toBe(true);
  });

  it('hasValidCompletion is waar voor een normaal begin', () => {
    expect(hasValidCompletion([])).toBe(true);
    expect(hasValidCompletion(eventsReferenceSchedule().slice(0, 3))).toBe(true);
  });
});
