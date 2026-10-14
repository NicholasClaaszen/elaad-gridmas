import { describe, expect, it } from 'vitest';
import { DummyEsp32Connector } from '../src/hardware/DummyEsp32Connector';
import { MockHardwareAdapter } from '../src/hardware/MockHardwareAdapter';
import { toSceneMessage } from '../src/hardware/protocol';
import { createGameStore, type StorageLike } from '../src/state/gameStore';
import { eventsReferenceSchedule } from './fixtures';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

let counter = 0;
const ids = () => `run-${++counter}`;

async function playThroughReference(store: ReturnType<typeof createGameStore>, rounds = 6) {
  for (const action of eventsReferenceSchedule()) store.setAction(action);
  for (let i = 0; i < rounds; i++) {
    expect(await store.playNextBlock()).toBe(true);
    store.finishRunningRound();
    store.continueAfterReview();
  }
}

describe('gameStore', () => {
  it('speelt een volledige run en zet hem eenmaal op het scorebord', async () => {
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids });
    store.startGame('Team Rendier');
    expect(store.screen.value).toBe('PLANNING');
    await playThroughReference(store);
    expect(store.screen.value).toBe('FINISHED');
    expect(store.state.leaderboard).toEqual([expect.objectContaining({ teamName: 'Team Rendier', finalMorale: 87, status: 'valid' })]);
  });

  it('10. een onvoltooide run komt niet op het scorebord', async () => {
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids });
    store.startGame('Team Halverwege');
    await playThroughReference(store, 3);
    expect(store.state.leaderboard).toEqual([]);
    await store.resetGame();
    expect(store.state.leaderboard).toEqual([]);
  });

  it('10b. een demo-run telt niet mee', async () => {
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids });
    store.startDemo(eventsReferenceSchedule());
    await playThroughReference(store);
    expect(store.screen.value).toBe('FINISHED');
    expect(store.state.leaderboard).toEqual([]);
  });

  it('6. overbelasting blokkeert de uitvoering met een melding', async () => {
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids });
    store.startGame('Team Overload');
    expect(await store.playNextBlock()).toBe(false);
    expect(store.state.error).toMatch(/Overbelasting/);
    expect(store.screen.value).toBe('PLANNING');
  });

  it('11. MockHardwareAdapter ontvangt de juiste scenes in uitgevoerde volgorde', async () => {
    const mock = new MockHardwareAdapter();
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids, adapters: { mock } });
    store.startGame('Team Lampje');
    await playThroughReference(store);
    expect(mock.scenes.map((s) => s.blockIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(mock.scenes.map((s) => s.batteryPercent)).toEqual([100, 100, 50, 0, 0, 0]);
    expect(mock.scenes.map((s) => s.zoneLightsOn.seniors)).toEqual([true, true, true, false, false, true]);
    expect(mock.scenes.map((s) => s.zoneLightsOn.square)).toEqual([true, true, true, true, false, true]);
    expect(mock.scenes.map((s) => s.chargers)).toEqual(['extra-charging', 'paused', 'charging', 'paused', 'charging', 'extra-charging']);
  });

  it('stuurt geen scenes bij ongecommitte planningswijzigingen', () => {
    const mock = new MockHardwareAdapter();
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids, adapters: { mock } });
    store.startGame('Team Klikker');
    for (const action of eventsReferenceSchedule()) store.setAction(action);
    expect(mock.scenes).toEqual([]);
  });

  it('dummy ESP32-connector legt de hardware-aanroepen vast', async () => {
    const dummy = new DummyEsp32Connector({ baseUrl: 'http://esp.test' });
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids, adapters: { 'esp32-dummy': dummy } });
    await store.setHardwareMode('esp32-dummy');
    store.startGame('Team Draad');
    await playThroughReference(store, 4);
    const sceneCalls = dummy.calls.filter((c) => c.url === 'http://esp.test/api/scene');
    expect(sceneCalls).toHaveLength(5); // 1 bij moduswissel + 4 blokken
    expect(sceneCalls.at(-1)!.body).toEqual({ v: 1, cmd: 'scene', b: 3, z: [1, 0, 1, 1], r: 1, c: 'p', bat: 0, net: 's' });
    expect(store.state.hardwareCalls).toHaveLength(dummy.calls.length);
    await store.resetGame();
    expect(dummy.calls.at(-1)!.url).toBe('http://esp.test/api/reset');
  });

  it('verbindingsverlies geeft een melding maar het spel gaat door', async () => {
    const dummy = new DummyEsp32Connector();
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids, adapters: { 'esp32-dummy': dummy } });
    await store.setHardwareMode('esp32-dummy');
    store.setDummyOffline(true);
    store.startGame('Team Kabelbreuk');
    await playThroughReference(store);
    expect(store.state.hardwareWarning).toMatch(/niet bereikbaar/);
    expect(store.state.leaderboard[0]!.finalMorale).toBe(87);
  });

  it('12. herladen herstelt een voltooide score zonder dubbele insert', async () => {
    const storage = memoryStorage();
    const first = createGameStore({ storage, createRunId: ids });
    first.startGame('Team Refresh');
    await playThroughReference(first);
    expect(first.state.leaderboard).toHaveLength(1);

    const second = createGameStore({ storage, createRunId: ids });
    const third = createGameStore({ storage, createRunId: ids });
    expect(second.screen.value).toBe('FINISHED');
    expect(third.state.leaderboard).toHaveLength(1);
    expect(third.state.game!.morale).toBe(87);
  });

  it('herladen tijdens een lopende ronde gaat door naar het nieuwsbulletin zonder herberekening', async () => {
    const storage = memoryStorage();
    const first = createGameStore({ storage, createRunId: ids });
    first.startGame('Team Midden');
    for (const action of eventsReferenceSchedule()) first.setAction(action);
    await first.playNextBlock();
    const reloaded = createGameStore({ storage, createRunId: ids });
    expect(reloaded.screen.value).toBe('ROUND_REVIEW');
    expect(reloaded.state.game!.executed).toEqual(first.state.game!.executed);
  });

  it('negeert opgeslagen data van een andere versie', () => {
    const storage = memoryStorage();
    storage.setItem('merry-gridmas:game', JSON.stringify({ version: 99, game: { phase: 'FINISHED' } }));
    expect(createGameStore({ storage }).screen.value).toBe('WELCOME');
  });

  it('negeert een opgeslagen spel van versie 1 (van vóór de events)', () => {
    const storage = memoryStorage();
    storage.setItem('merry-gridmas:game', JSON.stringify({ version: 1, game: { phase: 'PLANNING' }, hardwareMode: 'mock' }));
    expect(createGameStore({ storage }).state.game).toBeNull();
  });

  it('importeert een scorebord zonder dubbele runs', async () => {
    const store = createGameStore({ storage: memoryStorage(), createRunId: ids });
    store.startGame('Team Export');
    await playThroughReference(store);
    const exported = store.exportLeaderboard();
    expect(store.importLeaderboard(exported)).toBe(0);
    store.clearLeaderboard();
    expect(store.importLeaderboard(exported)).toBe(1);
  });

  it('protocol: compact scenebericht', () => {
    expect(
      toSceneMessage({
        blockIndex: 4,
        zoneLightsOn: { homes: true, seniors: false, hospital: true, square: false },
        rinkOpen: true,
        chargers: 'charging',
        batteryPercent: 0,
        netStatus: 'safe',
      }),
    ).toEqual({ v: 1, cmd: 'scene', b: 4, z: [1, 0, 1, 0], r: 1, c: 'c', bat: 0, net: 's' });
  });
});
