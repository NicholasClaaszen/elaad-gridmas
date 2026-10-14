import { describe, expect, it } from 'vitest';
import { buildFinaleSoundscape, buildNewsSoundscape } from '../src/audio/soundscape';
import { continueAfterReview, completeRound, createNewGame, executeNextBlock } from '../src/domain/game';
import { teamTitles } from '../src/domain/teamTitles';
import type { GameState } from '../src/domain/types';
import { createGameStore, type StorageLike } from '../src/state/gameStore';
import { eventsReferenceSchedule, referenceSchedule, withBlock } from './fixtures';

function playAll(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 6; i++) s = continueAfterReview(completeRound(executeNextBlock(s)));
  return s;
}

describe('teamTitles', () => {
  it('geeft het referentieteam titels op basis van hun keuzes', () => {
    expect(teamTitles(referenceSchedule()).map((t) => t.id)).toEqual(['disco-savers', 'choir-guards', 'battery-bosses']);
  });

  it('beloont veel donkere locaties met de Donkere Dennen', () => {
    const dark = withBlock(withBlock(referenceSchedule(), 1, { decorationsOff: ['homes', 'hospital', 'square'] }), 4, {
      decorationsOff: ['seniors', 'square', 'homes'],
    });
    expect(teamTitles(dark)[0]!.id).toBe('dark-pines');
  });

  it('kijkt niet naar de score en geeft altijd minstens één titel', () => {
    expect(teamTitles([])).toHaveLength(3);
    expect(teamTitles(referenceSchedule(), 1)).toHaveLength(1);
  });
});

describe('soundscape', () => {
  const run = playAll(createNewGame('r', 'Team', { schedule: eventsReferenceSchedule() }));

  it('mixt keuzes en nieuws van een blok tot een vaste reeks geluiden', () => {
    // 20:00-22:00: batterij, senioren uit (-7), laadpauze (-5), ronde -4
    expect(buildNewsSoundscape(run.executed[3]!).map((c) => c.kind)).toEqual([
      'jingle',
      'battery',
      'lights-off',
      'chargers-paused',
    ]);
    // 18:00-20:00: batterij, ijsbaan (-4), ronde +4
    expect(buildNewsSoundscape(run.executed[2]!).map((c) => c.kind)).toEqual(['jingle', 'battery', 'rink-closed', 'sparkle']);
    expect(buildNewsSoundscape(run.executed[0]!).map((c) => c.kind)).toEqual(['jingle', 'extra-charging', 'sparkle']);
  });

  it('laat zware straffen harder klinken en eindigt met gemopper bij een slechte ronde', () => {
    let s = createNewGame('r', 'Team', {
      schedule: withBlock(eventsReferenceSchedule(), 3, { decorationsOff: ['seniors', 'square', 'hospital'] }),
    });
    s = playAll(s);
    const cues = buildNewsSoundscape(s.executed[3]!);
    const lights = cues.filter((c) => c.kind === 'lights-off');
    expect(lights[1]!.intensity).toBe(1); // dorpsplein tijdens het koor: -18
    expect(lights[0]!.intensity).toBeLessThan(lights[1]!.intensity);
    expect(cues.at(-1)!.kind).toBe('groan');
  });

  it('is deterministisch en blijft binnen 0-1', () => {
    for (const e of run.executed) {
      expect(buildNewsSoundscape(e)).toEqual(buildNewsSoundscape(e));
      for (const c of buildNewsSoundscape(e)) expect(c.intensity).toBeGreaterThanOrEqual(0);
    }
    expect(buildFinaleSoundscape(87)).toEqual([{ kind: 'finale', atMs: 0, intensity: 0.87 }]);
  });
});

describe('geluidsinstelling', () => {
  it('staat standaard aan en wordt per station bewaard', () => {
    const data = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
    const first = createGameStore({ storage });
    expect(first.state.soundOn).toBe(true);
    first.setSoundOn(false);
    expect(createGameStore({ storage }).state.soundOn).toBe(false);
  });
});
