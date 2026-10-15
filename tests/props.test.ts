import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LocationPrintCards from '../src/components/LocationPrintCards.vue';
import OrganizerControls from '../src/components/OrganizerControls.vue';
import PlanningBoard from '../src/components/PlanningBoard.vue';
import WelcomeScreen from '../src/components/WelcomeScreen.vue';
import { EVENT_NEWS } from '../src/domain/eventNews';
import { createEmptySchedule } from '../src/domain/scenario';
import { createGameStore, type StorageLike } from '../src/state/gameStore';
import { GAME_STORE_KEY } from '../src/state/injection';
import { LOCATIONS } from '../src/ui/locations';

function mapStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

describe('fysieke rekwisieten: instelling', () => {
  it('staat standaard uit en wordt samen met het geluid per station bewaard', () => {
    const storage = mapStorage();
    const first = createGameStore({ storage });
    expect(first.state.propsMode).toBe(false);
    first.setPropsMode(true);
    first.setSoundOn(false);
    const second = createGameStore({ storage });
    expect(second.state.propsMode).toBe(true);
    expect(second.state.soundOn).toBe(false);
  });

  it('is in het organisatorenpaneel aan te zetten en opent de printweergave', async () => {
    const store = createGameStore();
    const wrapper = mount(OrganizerControls, { global: { provide: { [GAME_STORE_KEY as symbol]: store } } });
    await wrapper.get('[data-setting="props-mode"]').setValue(true);
    expect(store.state.propsMode).toBe(true);
    await wrapper.findAll('button').find((b) => b.text().includes('Locatiekaarten'))!.trigger('click');
    expect(wrapper.emitted('printCards')).toHaveLength(1);
  });
});

describe('fysieke rekwisieten: ontruimde schermen', () => {
  const planner = (propsMode: boolean) => mount(PlanningBoard, {
    props: { schedule: createEmptySchedule(), executedActions: [], propsMode },
  });

  it('de planner verbergt locatiekaarten en -details, maar houdt schema, grafiek en bericht', () => {
    const wrapper = planner(true);
    expect(wrapper.find('.location-card').exists()).toBe(false);
    expect(wrapper.find('.location-detail').exists()).toBe(false);
    expect(wrapper.find('.board').exists()).toBe(true);
    expect(wrapper.find('.chart-cell').exists()).toBe(true);
    expect(wrapper.find('.comms-panel').exists()).toBe(true);
    expect(wrapper.text()).toContain('Klopt het programma?');
  });

  it('zonder rekwisieten blijft alles zoals het was', () => {
    const wrapper = planner(false);
    expect(wrapper.find('.location-card').exists()).toBe(true);
    expect(wrapper.find('.location-detail').exists()).toBe(true);
  });

  it('het welkomstscherm toont geen locatiekaarten', () => {
    const wrapper = mount(WelcomeScreen, { props: { leaderboard: [], propsMode: true } });
    expect(wrapper.find('.location-card').exists()).toBe(false);
    expect(wrapper.text()).toContain('locatiekaarten');
  });
});

describe('printbare locatiekaarten (A6)', () => {
  const wrapper = mount(LocationPrintCards);

  it('zet zeven locaties en een doelkaart op twee A4-vellen', () => {
    expect(wrapper.findAll('.sheet')).toHaveLength(2);
    expect(wrapper.findAll('.print-card')).toHaveLength(8);
    expect(wrapper.findAll('.print-card.goal')).toHaveLength(1);
  });

  it('elke locatiekaart heeft naam, kW, regels en een tijdstrook', () => {
    for (const location of LOCATIONS) {
      const card = wrapper.get(`[data-location="${location.id}"]`);
      expect(card.text()).toContain(location.name);
      expect(card.get('.kw').text()).toContain(String(location.powerKw));
      for (const rule of location.rules) expect(card.text()).toContain(rule);
      expect(card.findAll('.strip li')).toHaveLength(6);
    }
  });

  it('de tijdstrook markeert wanneer een locatie inzetbaar is', () => {
    const usable = (id: string) => wrapper.get(`[data-location="${id}"]`).findAll('.strip li').map((li) => li.classes('usable'));
    expect(usable('rink')).toEqual([false, true, true, true, false, false]);
    expect(usable('homes')).toEqual([false, true, true, true, true, false]);
    expect(usable('chargers')).toEqual([true, true, true, true, true, true]);
  });

  it('de doelkaart noemt de netgrens en het bericht aan het dorp', () => {
    const goal = wrapper.get('.print-card.goal').text();
    expect(goal).toContain('100 kW');
    expect(goal).toContain('Bericht aan het dorp');
  });

  it('verraadt geen moraal en geen gebeurtenissen', () => {
    const text = wrapper.text().toLowerCase();
    expect(text).not.toContain('moraal');
    for (const news of Object.values(EVENT_NEWS)) expect(wrapper.text()).not.toContain(news.headline);
  });
});

describe('fysieke rekwisieten in de app', () => {
  it('de planner in de app volgt de instelling, en het paneel opent de printweergave', async () => {
    const { default: App } = await import('../src/App.vue');
    const { flushPromises } = await import('@vue/test-utils');
    const store = createGameStore();
    store.setPropsMode(true);
    await store.startGame('De Nette Rendieren');
    const wrapper = mount(App, { global: { provide: { [GAME_STORE_KEY as symbol]: store } } });
    await flushPromises();
    expect(wrapper.find('.board').exists()).toBe(true);
    expect(wrapper.find('.location-card').exists()).toBe(false);

    await wrapper.get('button.organizer').trigger('click');
    await wrapper.findAll('button').find((b) => b.text().includes('Locatiekaarten'))!.trigger('click');
    expect(wrapper.findAll('.print-card')).toHaveLength(8);
    expect(wrapper.find('.board').exists()).toBe(false);
    await wrapper.findAll('button').find((b) => b.text().includes('Terug naar het spel'))!.trigger('click');
    expect(wrapper.find('.board').exists()).toBe(true);
    wrapper.unmount();
  });
});
