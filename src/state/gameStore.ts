import { computed, reactive } from 'vue';
import {
  GameRuleError,
  completeRound,
  continueAfterReview,
  createNewGame,
  executeNextBlock,
  isCompletedValidRun,
  updatePlannedAction,
} from '../domain/game';
import {
  addLeaderboardEntry,
  mergeLeaderboards,
  parseLeaderboardJson,
  serializeLeaderboard,
  type LeaderboardEntry,
} from '../domain/leaderboard';
import { buildScene, idleScene, type Scene } from '../domain/scene';
import type { BlockAction, GamePhase, GameState, Schedule } from '../domain/types';
import { DummyEsp32Connector, type HardwareCall } from '../hardware/DummyEsp32Connector';
import type { HardwareAdapter } from '../hardware/HardwareAdapter';
import { MockHardwareAdapter } from '../hardware/MockHardwareAdapter';

export const GAME_STORAGE_KEY = 'merry-gridmas:game';
export const LEADERBOARD_STORAGE_KEY = 'merry-gridmas:leaderboard';
const STORAGE_VERSION = 1;
const HARDWARE_TIMEOUT_MS = 2000;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type HardwareMode = 'mock' | 'esp32-dummy';
export type Screen = 'WELCOME' | Exclude<GamePhase, 'WELCOME'>;

export interface GameStoreOptions {
  storage?: StorageLike;
  adapters?: Partial<Record<HardwareMode, HardwareAdapter>>;
  createRunId?: () => string;
  now?: () => Date;
}

interface PersistedGame {
  version: number;
  game: GameState | null;
  hardwareMode: HardwareMode;
}

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function readJson<T>(storage: StorageLike, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('De miniatuur reageert niet.')), ms);
    promise.then(
      () => (clearTimeout(timer), resolve()),
      (error: unknown) => (clearTimeout(timer), reject(error)),
    );
  });
}

export function createGameStore(options: GameStoreOptions = {}) {
  const storage = options.storage ?? memoryStorage();
  const createRunId = options.createRunId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date());
  const adapters: Record<HardwareMode, HardwareAdapter> = {
    mock: options.adapters?.mock ?? new MockHardwareAdapter(),
    'esp32-dummy': options.adapters?.['esp32-dummy'] ?? new DummyEsp32Connector(),
  };

  const persisted = readJson<PersistedGame>(storage, GAME_STORAGE_KEY);
  const restoredGame = persisted?.version === STORAGE_VERSION ? persisted.game : null;

  const state = reactive({
    game: restoredGame as GameState | null,
    leaderboard: parseStoredLeaderboard(),
    hardwareMode: (persisted?.hardwareMode ?? 'mock') as HardwareMode,
    hardwareWarning: null as string | null,
    hardwareCalls: [] as HardwareCall[],
    scene: idleScene() as Scene,
    error: null as string | null,
  });

  function parseStoredLeaderboard(): LeaderboardEntry[] {
    const raw = storage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    try {
      return parseLeaderboardJson(raw);
    } catch {
      return [];
    }
  }

  function persist(): void {
    const data: PersistedGame = { version: STORAGE_VERSION, game: state.game, hardwareMode: state.hardwareMode };
    storage.setItem(GAME_STORAGE_KEY, JSON.stringify(data));
  }

  function persistLeaderboard(): void {
    storage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(state.leaderboard));
  }

  function setGame(game: GameState | null): void {
    state.game = game;
    state.error = null;
    persist();
  }

  /** Idempotent: een afgeronde run staat hooguit één keer op het scorebord. */
  function recordFinishedRun(): void {
    const game = state.game;
    if (!game || game.isDemo || !isCompletedValidRun(game)) return;
    const before = state.leaderboard.length;
    state.leaderboard = addLeaderboardEntry(state.leaderboard, {
      runId: game.runId,
      teamName: game.teamName,
      finalMorale: game.morale,
      completedAt: now().toISOString(),
      status: 'valid',
    });
    if (state.leaderboard.length !== before) persistLeaderboard();
  }

  function syncHardwareLog(): void {
    const dummy = adapters['esp32-dummy'];
    state.hardwareCalls = dummy instanceof DummyEsp32Connector ? [...dummy.calls] : [];
  }

  async function sendToHardware(send: (adapter: HardwareAdapter) => Promise<void>): Promise<void> {
    try {
      await withTimeout(send(adapters[state.hardwareMode]), HARDWARE_TIMEOUT_MS);
      state.hardwareWarning = null;
    } catch (error) {
      // Defecte lampjes mogen het spel nooit blokkeren of de score beïnvloeden.
      state.hardwareWarning = `Miniatuur niet bereikbaar: ${error instanceof Error ? error.message : String(error)} Het spel gaat gewoon door.`;
    } finally {
      syncHardwareLog();
    }
  }

  function sceneForCurrentGame(): Scene {
    const last = state.game?.executed.at(-1);
    return last ? buildScene(last) : idleScene();
  }

  function guarded<T>(fn: () => T): T | undefined {
    try {
      return fn();
    } catch (error) {
      if (error instanceof GameRuleError) {
        state.error = error.message;
        return undefined;
      }
      throw error;
    }
  }

  // Herstel na een refresh: een lopende ronde is al vastgelegd, dus direct door naar het nieuws.
  if (state.game?.phase === 'ROUND_RUNNING') state.game = completeRound(state.game);
  if (state.game?.phase === 'FINISHED') recordFinishedRun();
  state.scene = sceneForCurrentGame();

  const store = {
    state,
    screen: computed<Screen>(() => {
      const phase = state.game?.phase;
      return !phase || phase === 'WELCOME' ? 'WELCOME' : phase;
    }),

    startGame(teamName: string): void {
      const name = teamName.trim();
      if (!name) {
        state.error = 'Vul eerst een teamnaam in.';
        return;
      }
      setGame(createNewGame(createRunId(), name));
    },

    /** Organisator: demo met het referentieschema. Telt niet mee voor het scorebord. */
    startDemo(schedule: Schedule): void {
      setGame(createNewGame(createRunId(), 'Demo (organisator)', { isDemo: true, schedule }));
    },

    setAction(action: BlockAction): void {
      if (!state.game) return;
      const game = state.game;
      const next = guarded(() => updatePlannedAction(game, action));
      if (next) setGame(next);
    },

    /** Speel het eerstvolgende blok: vastleggen, uitrekenen en de miniatuur aansturen. */
    async playNextBlock(): Promise<boolean> {
      if (!state.game) return false;
      const game = state.game;
      const next = guarded(() => executeNextBlock(game));
      if (!next) return false;
      setGame(next);
      const scene = sceneForCurrentGame();
      state.scene = scene;
      await sendToHardware((adapter) => adapter.setScene(scene));
      return true;
    },

    finishRunningRound(): void {
      if (state.game?.phase !== 'ROUND_RUNNING') return;
      setGame(completeRound(state.game));
    },

    continueAfterReview(): void {
      if (state.game?.phase !== 'ROUND_REVIEW') return;
      setGame(continueAfterReview(state.game));
      recordFinishedRun();
    },

    async resetGame(): Promise<void> {
      setGame(null);
      state.scene = idleScene();
      await sendToHardware((adapter) => adapter.reset());
    },

    clearLeaderboard(): void {
      state.leaderboard = [];
      persistLeaderboard();
    },

    exportLeaderboard(): string {
      return serializeLeaderboard(state.leaderboard);
    },

    /** Voegt een geëxporteerd scorebord samen met het huidige; geeft het aantal nieuwe runs terug. */
    importLeaderboard(json: string): number {
      const imported = parseLeaderboardJson(json);
      const before = state.leaderboard.length;
      state.leaderboard = mergeLeaderboards(state.leaderboard, imported);
      persistLeaderboard();
      return state.leaderboard.length - before;
    },

    async setHardwareMode(mode: HardwareMode): Promise<void> {
      state.hardwareMode = mode;
      persist();
      const scene = sceneForCurrentGame();
      await sendToHardware((adapter) => adapter.setScene(scene));
    },

    setDummyOffline(offline: boolean): void {
      const dummy = adapters['esp32-dummy'];
      if (dummy instanceof DummyEsp32Connector) dummy.offline = offline;
    },

    dismissError(): void {
      state.error = null;
    },
  };

  return store;
}

export type GameStore = ReturnType<typeof createGameStore>;
