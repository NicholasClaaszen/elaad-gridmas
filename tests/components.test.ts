import { flushPromises, mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import App from '../src/App.vue';
import LoadChart from '../src/components/LoadChart.vue';
import OrganizerControls from '../src/components/OrganizerControls.vue';
import PlanningBoard from '../src/components/PlanningBoard.vue';
import RoundReview from '../src/components/RoundReview.vue';
import { generatorUnlockedNews, revealedEvents } from '../src/domain/events';
import { perfectEventsSchedule, referenceDemoSchedule } from '../src/domain/referenceSchedule';
import type { BlockAction } from '../src/domain/types';
import { BLOCKS, DECORATIONS, createEmptySchedule } from '../src/domain/scenario';
import { MockHardwareAdapter } from '../src/hardware/MockHardwareAdapter';
import { createGameStore } from '../src/state/gameStore';
import { GAME_STORE_KEY } from '../src/state/injection';
import { referenceSchedule } from './fixtures';

const PLANNING_COMPONENTS = ['PlanningBoard.vue', 'LoadChart.vue', 'LocationCard.vue', 'LocationDetail.vue', 'VillageView.vue', 'VillageMap.vue', 'LocationIllustration.vue'];
const FORBIDDEN_IMPORTS = ['calculateMorale', 'feedbackContent', 'eventMorale', 'domain/game', 'MoraleEvent', 'ExecutedBlock', 'GameState'];

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

    // Build the entire plan through the visible controls, not store shortcuts.
    await wrapper.get('[data-message="precharge"]').trigger('click');
    for (const action of perfectEventsSchedule()) {
      const label = BLOCKS[action.blockIndex]!.label;
      for (const id of action.decorationsOff) {
        const name = DECORATIONS.find(d => d.id === id)!.name;
        await wrapper.get(`[aria-label="${name}, ${label}: feestverlichting aan"]`).trigger('click');
      }
      if (action.rinkPaused) await wrapper.get(`[aria-label="IJsbaan, ${label}: open"]`).trigger('click');
      if (action.batteryDischarge) await wrapper.get(`[aria-label="Buurtbatterij, ${label}: stand-by"]`).trigger('click');
      if (action.chargersPaused) await wrapper.get(`[aria-label="Laadplein, ${label}: actief"]`).trigger('click');
      if (action.extraCharging && action.blockIndex !== 0) await wrapper.get(`[aria-label="Laadplein, ${label}: stand-by"]`).trigger('click');
    }
    expect(store.state.game!.schedule).toEqual(perfectEventsSchedule());
    await flushPromises();

    for (let i = 0; i < 6; i++) {
      const moraleBefore = store.state.game!.morale;
      const play = wrapper.findAll('button').find((b) => /Start kerstavond|Speel tijdsblok/.test(b.text()))!;
      await play.trigger('click');
      await flushPromises();
      // Tijdens de animatie toont de kop nog de oude moraal; pas het nieuws onthult de nieuwe.
      if (i === 0) {
        expect(wrapper.get('.topbar .morale').text()).toContain('Nog niet bekend');
        expect(wrapper.find('.topbar .morale strong').exists()).toBe(false);
      } else {
        expect(wrapper.get('.topbar .morale strong').text()).toBe(String(moraleBefore));
      }
      expect(wrapper.findAll('.map-location')).toHaveLength(7);
      const batteryPercent = [100, 100, 50, 0, 0, 0][i];
      expect(wrapper.get('.map-location.battery').text()).toContain(`Batterij ${batteryPercent}%`);
      // Lopende ronde overslaan
      await wrapper.findAll('button').find((b) => b.text() === 'Direct naar het nieuws')!.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('De Gridmas Courant');
      expect(wrapper.get('[role="meter"]').attributes('aria-valuenow')).toBe(String(store.state.game!.morale));
      const next = wrapper.findAll('button').find((b) => /Verder naar volgende ronde|Naar de uitslag/.test(b.text()))!;
      await next.trigger('click');
      await flushPromises();
    }

    expect(wrapper.text()).toContain('kerstmoraal');
    expect(wrapper.text()).toContain('Team Test');
    expect(wrapper.text()).toContain('Kersthelden van Gridmas');
    expect(wrapper.get('.final-stats').text()).toContain('80 kWh');
    expect(wrapper.text()).toContain('OpenADR 3.1 conceptweergave - niet conformiteit-gevalideerde API-payload');
    expect(store.state.leaderboard).toHaveLength(1);
    expect(mock.scenes).toHaveLength(6);

    await wrapper.findAll('button').find((b) => b.text() === 'Volgend team')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Start planning');
    expect(wrapper.get('.scoreboard').text()).toContain('Team Test');
    await wrapper.get('#team-name').setValue('Het volgende team');
    await wrapper.get('form').trigger('submit');
    expect(store.state.game!.teamName).toBe('Het volgende team');
    expect(store.state.leaderboard).toHaveLength(1);
    wrapper.unmount();
  });
});


describe('locaties en geselecteerde planning', () => {
  it('verbindt locatiekaarten, tijdselectie en de detailbediening met het schema', async () => {
    const store = createGameStore();
    const wrapper = mount(App, { global: { provide: { [GAME_STORE_KEY as symbol]: store } } });
    await wrapper.get('#team-name').setValue('Team Locaties');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.findAll('.location-card')).toHaveLength(7);
    await wrapper.get('[aria-label="Selecteer 18:00-20:00"]').trigger('click');
    await wrapper.get('.location-card[aria-label^="Ziekenhuis Sint Licht"]').trigger('click');
    expect(wrapper.get('[data-asset="hospital"]').classes()).toContain('highlighted');
    expect(wrapper.get('.location-detail').text()).toContain('18:00-20:00');
    expect(wrapper.get('.location-detail').text()).toContain('zorg en basisverlichting blijven aan');
    await wrapper.get('.detail-action').trigger('click');
    expect(store.state.game!.schedule[2]!.decorationsOff).toEqual(['hospital']);
    expect(wrapper.find('[aria-label="Ziekenhuis (alleen feestverlichting), 18:00-20:00: feestverlichting uit"]').exists()).toBe(true);
    expect(wrapper.get('.header-metrics').text()).toContain('145');
    expect(wrapper.get('.location-detail').text()).toContain('Verlichting uit');
    expect(wrapper.get('.planning').html().toLowerCase()).not.toMatch(/moraal|penalty|morale/);
    expect(wrapper.get('.topbar .morale').text()).toContain('Nog niet bekend');
    for (const card of wrapper.findAll('.location-card')) {
      await card.trigger('click');
      expect(wrapper.get('.planning').html().toLowerCase()).not.toMatch(/moraal|penalty|morale/);
    }
    wrapper.unmount();
  });

  it('legt beperkingen uit en voorkomt detailwijzigingen in gespeelde blokken', async () => {
    const wrapper = mount(PlanningBoard, { props: { schedule: referenceSchedule(), executedActions: referenceSchedule().slice(0, 3), selectedBlock: 2 } });
    await wrapper.get('.location-card[aria-label^="Buurtbatterij"]').trigger('click');
    expect(wrapper.get('.detail-action').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.restriction').text()).toContain('Dit blok is gespeeld');
    await wrapper.get('.detail-action').trigger('click');
    expect(wrapper.emitted('update')).toBeUndefined();
    await wrapper.setProps({ selectedBlock: 4 });
    expect(wrapper.get('.restriction').text()).toContain('volledig ingepland');
    await wrapper.setProps({ selectedBlock: 3 });
    expect(wrapper.find('.restriction').exists()).toBe(false);
    await wrapper.get('.detail-action').trigger('click');
    expect(wrapper.emitted('update')![0]![0]).toMatchObject({ blockIndex: 3, batteryDischarge: false });
    await wrapper.setProps({ selectedBlock: 5 });
    expect(wrapper.get('.restriction').text()).toContain('niet beschikbaar');
    wrapper.unmount();
  });
});


describe('App: hervatten', () => {
  it('selecteert na opnieuw openen het eerstvolgende ongespeelde blok', async () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
    const original = createGameStore({ storage });
    original.startGame('Team Hervat');
    for (const action of referenceSchedule()) original.setAction(action);
    for (let i = 0; i < 3; i++) {
      await original.playNextBlock();
      original.finishRunningRound();
      original.continueAfterReview();
    }
    const restored = createGameStore({ storage });
    const wrapper = mount(App, { global: { provide: { [GAME_STORE_KEY as symbol]: restored } } });
    expect(wrapper.get('[aria-label="Selecteer 20:00-22:00"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('.topbar .morale strong').text()).toBe('86');
    expect(wrapper.get('[aria-label="Woonwijk, 18:00-20:00: feestverlichting aan"]').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });
});

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

describe('eindscherm en tijdlijn met events', () => {
  it('toont de gebeurtenissen van de avond en de tijdlijn toont nieuws', async () => {
    const store = createGameStore();
    store.startDemo(perfectEventsSchedule());
    for (let i = 0; i < 6; i++) {
      await store.playNextBlock();
      store.finishRunningRound();
      if (i === 2) {
        const wrapper = mount(App, { global: { provide: { [GAME_STORE_KEY as symbol]: store } } });
        store.continueAfterReview();
        await flushPromises();
        expect(wrapper.get('.timeline').text()).toContain('De Kerstman komt zijn slee laden');
        wrapper.unmount();
        continue;
      }
      store.continueAfterReview();
    }
    const wrapper = mount(App, { global: { provide: { [GAME_STORE_KEY as symbol]: store } } });
    await flushPromises();
    const evening = wrapper.get('.evening-events').text();
    expect(evening).toContain('De Kerstman komt zijn slee laden');
    expect(evening).toContain('Sneeuwbui boven Gridmas');
    expect(evening).not.toContain('Gerucht');
    wrapper.unmount();
  });

  it('de organisatorendemo speelt de perfecte run', async () => {
    const store = createGameStore();
    const wrapper = mount(OrganizerControls, { global: { provide: { [GAME_STORE_KEY as symbol]: store } } });
    await wrapper.findAll('button').find((b) => b.text().startsWith('Demo met'))!.trigger('click');
    expect(store.state.game!.schedule).toEqual(perfectEventsSchedule());
  });
});
