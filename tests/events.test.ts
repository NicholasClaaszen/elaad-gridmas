import { describe, expect, it } from 'vitest';
import { calculateRoundMorale } from '../src/domain/calculateMorale';
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
    const h = empty(5);
    h[2] = dark(2, 'hospital');
    expect(lines(5, act(5), h)).toEqual([]);
  });

  it('toeterende ooms bij twee laadpauzes op rij', () => {
    const h = empty(2);
    h[1] = act(1, { chargersPaused: true });
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
