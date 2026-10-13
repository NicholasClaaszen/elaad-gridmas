import { flushPromises, mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import App from '../src/App.vue';
import LoadChart from '../src/components/LoadChart.vue';
import PlanningBoard from '../src/components/PlanningBoard.vue';
import { referenceDemoSchedule } from '../src/domain/referenceSchedule';
import { createEmptySchedule } from '../src/domain/scenario';
import { MockHardwareAdapter } from '../src/hardware/MockHardwareAdapter';
import { createGameStore } from '../src/state/gameStore';
import { GAME_STORE_KEY } from '../src/state/injection';
import { referenceSchedule } from './fixtures';

const PLANNING_COMPONENTS = ['PlanningBoard.vue', 'LoadChart.vue'];
const FORBIDDEN_IMPORTS = ['calculateMorale', 'feedbackContent', 'domain/game', 'MoraleEvent', 'ExecutedBlock', 'GameState'];

describe('8. de planning toont geen moraal of straffen', () => {
  it('planningscomponenten importeren niets uit de moraalengine', () => {
    for (const file of PLANNING_COMPONENTS) {
      const source = readFileSync(resolve(__dirname, '../src/components', file), 'utf-8');
      for (const forbidden of FORBIDDEN_IMPORTS) expect(source, `${file} mag ${forbidden} niet gebruiken`).not.toContain(forbidden);
    }
  });

  it('gerenderde planning bevat geen moraalscores of strafteksten', () => {
    const wrapper = mount(PlanningBoard, {
      props: { schedule: referenceSchedule(), executedActions: referenceSchedule().slice(0, 3) },
    });
    const text = wrapper.text().toLowerCase();
    expect(text).not.toMatch(/moraal/);
    expect(text).not.toMatch(/straf/);
    // Geen enkele feedbackkop of verhaal-uitkomst
    expect(text).not.toContain('sabotage');
    expect(text).not.toContain('glowsticks');
    // Toegankelijkheidsteksten ook niet
    expect(wrapper.html().toLowerCase()).not.toMatch(/moraal|penalty|morale/);
  });
});

describe('PlanningBoard', () => {
  it('vergrendelt uitgevoerde blokken en emit wijzigingen voor de toekomst', async () => {
    const wrapper = mount(PlanningBoard, {
      props: { schedule: referenceSchedule(), executedActions: referenceSchedule().slice(0, 3) },
    });
    const homesBlock1 = wrapper.get('[aria-label="Woonwijk, 16:00-18:00: feestverlichting aan"]');
    expect(homesBlock1.attributes('disabled')).toBeDefined();

    await wrapper.get('[aria-label="Woonwijk, 22:00-00:00: feestverlichting aan"]').trigger('click');
    expect(wrapper.emitted('update')![0]![0]).toMatchObject({ blockIndex: 4, decorationsOff: ['seniors', 'square', 'homes'] });
    expect(wrapper.text()).toContain('Speel tijdsblok 20:00-22:00');
  });

  it('blokkeert starten bij een ongeldig programma', () => {
    const wrapper = mount(PlanningBoard, { props: { schedule: createEmptySchedule(), executedActions: [] } });
    const play = wrapper.findAll('button').find((b) => b.text() === 'Start kerstavond')!;
    expect(play.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Overbelasting in 16:00-18:00');
  });
});

describe('LoadChart', () => {
  it('toont belasting en overschrijding als tekst, niet alleen als kleur', () => {
    const wrapper = mount(LoadChart, { props: { loads: [95, 115, 150, 155, 125, 65], lockedCount: 0 } });
    expect(wrapper.text()).toContain('15 kW te veel');
    expect(wrapper.text()).toContain('35 kW ruimte');
  });
});

describe('referentiedemo', () => {
  it('is identiek aan REFERENCE_CASE.json', () => {
    expect(referenceDemoSchedule()).toEqual(referenceSchedule());
  });
});

describe('App: volledige speelloop', () => {
  it('speelt het referentieschema van welkom tot scorebord', async () => {
    const mock = new MockHardwareAdapter();
    const store = createGameStore({ adapters: { mock } });
    const wrapper = mount(App, { global: { provide: { [GAME_STORE_KEY as symbol]: store } } });

    await wrapper.get('#team-name').setValue('Team Test');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.text()).toContain('Plan de kerstavond');

    for (const action of referenceSchedule()) store.setAction(action);
    await flushPromises();

    for (let i = 0; i < 6; i++) {
      const moraleBefore = store.state.game!.morale;
      const play = wrapper.findAll('button').find((b) => /Start kerstavond|Speel tijdsblok/.test(b.text()))!;
      await play.trigger('click');
      await flushPromises();
      // Tijdens de animatie toont de kop nog de oude moraal; pas het nieuws onthult de nieuwe.
      expect(wrapper.get('.topbar .morale strong').text()).toBe(String(moraleBefore));
      // Lopende ronde overslaan
      await wrapper.findAll('button').find((b) => b.text() === 'Direct naar het nieuws')!.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('De Gridmas Courant');
      const next = wrapper.findAll('button').find((b) => /Verder naar volgende ronde|Naar de uitslag/.test(b.text()))!;
      await next.trigger('click');
      await flushPromises();
    }

    expect(wrapper.text()).toContain('kerstmoraal');
    expect(wrapper.text()).toContain('Team Test');
    expect(wrapper.text()).toContain('OpenADR 3.1 conceptweergave - niet conformiteit-gevalideerde API-payload');
    expect(store.state.leaderboard).toHaveLength(1);
    expect(mock.scenes).toHaveLength(6);

    await wrapper.findAll('button').find((b) => b.text() === 'Volgend team')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Start planning');
  });
});
