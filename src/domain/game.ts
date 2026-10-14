import { batteryRemainingAfterEachBlock, calculateLoad } from './calculateLoad';
import { applyMoraleDelta, calculateRoundMorale } from './calculateMorale';
import { hasValidCompletion } from './completion';
import { generatorUnlockedNews, knownLoadAdjustments, revealedEvents } from './events';
import { BATTERY, BLOCK_COUNT, INITIAL_MORALE, createEmptySchedule } from './scenario';
import type { BlockAction, ExecutedBlock, GameState, Schedule } from './types';
import { validateSchedule } from './validateSchedule';

export class GameRuleError extends Error {}

export function cloneAction(action: BlockAction): BlockAction {
  return { ...action, decorationsOff: [...action.decorationsOff] };
}

export function cloneSchedule(schedule: Schedule): Schedule {
  return schedule.map(cloneAction);
}

export function createNewGame(runId: string, teamName: string, options: { isDemo?: boolean; schedule?: Schedule } = {}): GameState {
  return {
    runId,
    teamName: teamName.trim(),
    phase: 'PLANNING',
    morale: INITIAL_MORALE,
    schedule: options.schedule ? cloneSchedule(options.schedule) : createEmptySchedule(),
    executed: [],
    isDemo: options.isDemo ?? false,
    generatorUnlocked: false,
  };
}

/** Aantal vergrendelde (al uitgevoerde) blokken. */
export function lockedBlockCount(state: GameState): number {
  return state.executed.length;
}

export function isBlockLocked(state: GameState, blockIndex: number): boolean {
  return blockIndex < state.executed.length;
}

export function executedActions(state: GameState): BlockAction[] {
  return state.executed.map((e) => e.action);
}

/** Wijzig een toekomstig blok. Uitgevoerde blokken zijn onveranderlijk. */
export function updatePlannedAction(state: GameState, action: BlockAction): GameState {
  if (state.phase !== 'PLANNING') throw new GameRuleError('Plannen kan alleen in de planningsfase.');
  if (action.blockIndex < 0 || action.blockIndex >= BLOCK_COUNT) {
    throw new GameRuleError(`Onbekend tijdsblok ${action.blockIndex}.`);
  }
  if (isBlockLocked(state, action.blockIndex)) {
    throw new GameRuleError('Dit tijdsblok is al uitgevoerd en vergrendeld.');
  }
  const schedule = state.schedule.map((a, i) => (i === action.blockIndex ? cloneAction(action) : cloneAction(a)));
  return { ...state, schedule };
}

/**
 * Voert het eerstvolgende blok uit: valideert het volledige programma (historie + toekomst),
 * legt een snapshot vast en berekent belasting, batterij en moraal. Resultaat: ROUND_RUNNING.
 */
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

export function completeRound(state: GameState): GameState {
  if (state.phase !== 'ROUND_RUNNING') throw new GameRuleError('Er loopt geen tijdsblok.');
  return { ...state, phase: 'ROUND_REVIEW' };
}

export function continueAfterReview(state: GameState): GameState {
  if (state.phase !== 'ROUND_REVIEW') throw new GameRuleError('Er is geen nieuwsbulletin om af te sluiten.');
  return { ...state, phase: state.executed.length >= BLOCK_COUNT ? 'FINISHED' : 'PLANNING' };
}

/** Projectie van de batterij voor de planning: feitelijk voor uitgevoerde blokken, verwacht voor de toekomst. */
export function batteryProjection(state: GameState): number[] {
  return batteryRemainingAfterEachBlock(state.schedule);
}

/** Een run telt alleen mee als hij volledig is uitgevoerd en geldig is. */
export function isCompletedValidRun(state: GameState): boolean {
  const actions = executedActions(state);
  return (
    state.phase === 'FINISHED' &&
    state.executed.length === BLOCK_COUNT &&
    validateSchedule(actions, actions, { generatorUnlocked: state.generatorUnlocked }).length === 0
  );
}
