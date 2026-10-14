<script setup lang="ts">
import { EVENT_ICONS } from '../domain/eventNews';
import { computed } from 'vue';
import { chargingNetKwh } from '../domain/calculateLoad';
import type { LeaderboardEntry } from '../domain/leaderboard';
import { BATTERY, BLOCKS, CHARGERS, INITIAL_MORALE } from '../domain/scenario';
import type { DecorationId, GameState } from '../domain/types';
import OpenAdrView from './OpenAdrView.vue';
import MoraleMeter from './MoraleMeter.vue';
import LocationIllustration from './LocationIllustration.vue';
import Scoreboard from './Scoreboard.vue';
import { teamTitles } from '../domain/teamTitles';
import { finalSummaryFor } from '../content/finalSummaries';

const props = defineProps<{
  game: GameState;
  leaderboard: LeaderboardEntry[];
}>();

const emit = defineEmits<{ nextTeam: [] }>();

const actions = computed(() => props.game.executed.map((e) => e.action));
const batteryUsed = computed(() => BATTERY.capacityKwh - (props.game.executed.at(-1)?.batteryAfterKwh ?? BATTERY.capacityKwh));
const measures = computed(() => actions.value.reduce((n, a) => n + a.decorationsOff.length + Number(a.rinkPaused) + Number(a.batteryDischarge) + Number(a.chargersPaused) + Number(a.extraCharging), 0));
const shiftedKwh = computed(() => actions.value.filter(a => a.chargersPaused).length * CHARGERS.energyPerBlockKwh);
const peakKw = computed(() => Math.max(...props.game.executed.map(e => e.loadKw)));
const highlights = computed(() => {
  const events = props.game.executed.flatMap(e => e.events);
  const best = [...events].sort((a, b) => b.delta - a.delta)[0];
  const worst = [...events].filter(e => e.delta < 0).sort((a, b) => a.delta - b.delta)[0];
  return [best, worst].filter((e): e is NonNullable<typeof e> => !!e);
});
const qualification = computed(() => props.game.morale >= 85 ? 'Kersthelden van Gridmas' : props.game.morale >= 78 ? 'Een dorp met wat te bespreken' : props.game.morale >= 70 ? 'De burgemeester wil jullie spreken' : 'Net gered. Buurtapp ontploft.');
const titles = computed(() => teamTitles(actions.value));
/** Echte gebeurtenissen; geruchten tellen niet mee. */
const evening = computed(() => props.game.executed.flatMap((e) => e.news).filter((n) => n.kind === 'news'));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const SHORT_NAMES: Record<DecorationId, string> = {
  homes: 'woonwijk',
  seniors: 'De Gouden Ster',
  hospital: 'ziekenhuis',
  square: 'dorpsplein',
};

/** Vooraf geschreven samenvatting voor dit verloop; anders een vaste tekst op basis van de eindmoraal. */
const summary = computed(() => finalSummaryFor(actions.value, props.game.morale) ?? fallbackSummary(props.game.morale));

function fallbackSummary(m: number): string {
  if (m >= 85) return 'Het net bleef heel en Gridmas had een mooie avond. De burgemeester vraagt of jullie volgend jaar weer kunnen.';
  if (m >= 78) return 'Het net bleef binnen de limiet. De meeste bewoners zijn tevreden; een paar hebben alvast punten voor de evaluatie.';
  if (m >= 70) return 'De stroomvoorziening is gered. In de buurtapp zijn ze nog niet klaar met jullie keuzes. Zet de meldingen voorlopig maar uit.';
  return 'Technisch klopt het plan. Voor de uitnodiging van volgend jaar zou het helpen als jullie zelf een doos kerstkransjes meenemen.';
}

function actionSummary(i: number): string {
  const a = actions.value[i]!;
  const parts: string[] = [];
  for (const id of a.decorationsOff) parts.push(`${SHORT_NAMES[id]} lichtjes uit`);
  if (a.rinkPaused) parts.push('ijsbaan dicht');
  if (a.batteryDischarge) parts.push('batterij');
  if (a.chargersPaused) parts.push('laadpauze');
  if (a.extraCharging) parts.push('extra laden');
  if (a.message === 'notice') parts.push('aankondiging');
  if (a.emergencyGenerator) parts.push('noodaggregaat');
  return parts.join(', ') || 'geen ingrepen';
}
</script>

<template>
  <section class="final" aria-labelledby="final-title">
    <div class="hero">
      <p class="eyebrow">Kerstavond in Gridmas is voorbij!</p>
      <div class="final-heading"><div><p class="muted">{{ game.teamName }}</p><h2>{{ qualification }}</h2></div><LocationIllustration id="square" /></div>
      <h2 id="final-title">
        <span class="value">{{ game.morale }}</span>
        <span class="label">kerstmoraal</span>
      </h2>
      <p class="summary">{{ summary }}</p>
      <MoraleMeter :value="game.morale" />
      <section class="titles" aria-labelledby="titles-title">
        <h3 id="titles-title">Jullie verdiende titels</h3>
        <ul>
          <li v-for="(t, n) in titles" :key="t.id" :class="{ main: n === 0 }">
            <strong>{{ t.title }}</strong>
            <span class="muted">{{ t.reason }}</span>
          </li>
        </ul>
      </section>
      <dl class="final-stats"><div><dt>Hoogste belasting</dt><dd>{{ peakKw }} <small>kW</small></dd></div><div><dt>Maatregelen</dt><dd>{{ measures }}</dd></div><div><dt>Laden verschoven</dt><dd>{{ shiftedKwh }} <small>kWh</small></dd></div><div><dt>Batterij geleverd</dt><dd>{{ batteryUsed }} <small>kWh</small></dd></div></dl>
      <p v-if="game.isDemo" class="muted">Demo-run van de organisator: telt niet mee voor het scorebord.</p>
    </div>

    <div class="columns">
      <div>
        <div class="results-scroll" tabindex="0" role="region" aria-label="Resultaten per tijdsblok">
        <table class="results">
          <caption class="visually-hidden">Resultaat per tijdsblok</caption>
          <thead>
            <tr>
              <th scope="col">Blok</th>
              <th scope="col">Ingrepen</th>
              <th scope="col" class="num">Belasting</th>
              <th scope="col" class="num">Moraal</th>
              <th scope="col" class="num">Batterij</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Start</td>
              <td class="muted">–</td>
              <td class="num">–</td>
              <td class="num">{{ INITIAL_MORALE }}</td>
              <td class="num">{{ BATTERY.capacityKwh }} kWh</td>
            </tr>
            <tr v-for="(e, i) in game.executed" :key="i">
              <td>{{ BLOCKS[i]!.label }}</td>
              <td class="muted">{{ actionSummary(i) }}</td>
              <td class="num">{{ e.loadKw }} kW</td>
              <td class="num">
                {{ e.moraleAfter }}
                <span :class="e.delta >= 0 ? 'delta-up' : 'delta-down'">({{ signed(e.delta) }})</span>
              </td>
              <td class="num">{{ e.batteryAfterKwh }} kWh</td>
            </tr>
          </tbody>
        </table>
        </div>

        <p class="energy muted">
          Energiebalans: de batterij leverde {{ batteryUsed }} kWh. Laadplein netto {{ chargingNetKwh(actions) }} kWh: elke
          uitgestelde laadbeurt is ingehaald.
        </p>

        <section class="highlights"><h3>Dit blijft hangen in Gridmas</h3><article v-for="event in highlights" :key="`${event.assetId}-${event.eventId ?? ''}-${event.blockIndex}`"><span :class="event.delta >= 0 ? 'delta-up' : 'delta-down'">{{ signed(event.delta) }} · {{ BLOCKS[event.blockIndex]!.label }}</span><h4>{{ event.headline }}</h4><p class="muted">{{ event.text }}</p></article></section><section v-if="evening.length" class="evening-events"><h3>Gebeurtenissen van de avond</h3><ul><li v-for="n in evening" :key="`${n.eventId}-${n.revealedAfterBlock}`"><span aria-hidden="true">{{ EVENT_ICONS[n.eventId] }}</span> {{ BLOCKS[n.revealedAfterBlock]!.label }} · {{ n.headline }}</li></ul></section>
        <OpenAdrView :schedule="actions" />
      </div>

      <div class="side">
        <Scoreboard :entries="leaderboard" :highlight-run-id="game.runId" />
        <button type="button" class="btn btn-primary" @click="emit('nextTeam')">Volgend team</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.evening-events ul { list-style: none; padding: 0; display: grid; gap: .35rem; }
.results-scroll { overflow-x: auto; }
.titles h3 { font-size: 1.1rem; margin: .75rem 0 .5rem; }
.titles ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .75rem; max-width: 900px; }
.titles li { display: grid; gap: .25rem; padding: .8rem 1rem; border: 1px solid var(--line); border-radius: 10px; font-size: .875rem; }
.titles li strong { font-family: var(--font-display); font-size: 1.1rem; color: var(--snow); }
.titles li.main { border-color: var(--lamp); background: var(--lamp-soft); }
.titles li.main strong { color: var(--lamp); }
.results { min-width: 520px; }
.final-heading { display: flex; gap: 1rem; align-items: center; justify-content: space-between; }
.final-heading h2 { margin-top: .4rem; font-size: 2.5rem; max-width: 25ch; }
.final-heading svg { max-width: 200px; }
.hero > .morale-meter { max-width: 650px; }
.final-stats { margin: .5rem 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.final-stats > div { padding: 1rem; border: 1px solid var(--line); background: var(--night-raised); border-radius: 12px; }
.final-stats dt { color: var(--snow-muted); font-size: .8rem; }
.final-stats dd { font-family: var(--font-display); font-size: 2rem; margin: .35rem 0 0; color: var(--lamp); }
.final-stats small { font-size: 1rem; }
.highlights { display: grid; gap: .8rem; margin: 1.5rem 0; }
.highlights article { padding: 1rem; border-left: 2px solid var(--lamp); background: var(--night-raised); border-radius: 0 8px 8px 0; font-size: .875rem; }
.highlights h4 { margin: .35rem 0; font-size: 1.1rem; }
@media (max-width: 700px) { .final-stats { grid-template-columns: repeat(2, 1fr); } .final-heading svg { max-width: 100px; } .results { font-size: .8rem; } }

.final {
  display: grid;
  gap: 2rem;
}

.hero {
  display: grid;
  gap: 0.5rem;
}

h2 {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

h2 .value {
  font-size: 6rem;
  line-height: 0.9;
  color: var(--lamp);
  font-weight: 800;
  text-shadow: 0 0 40px var(--lamp-soft);
}

h2 .label {
  font-size: var(--step-2);
}

.summary {
  font-size: var(--step-1);
  max-width: 60ch;
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 2rem;
  align-items: start;
}

.results {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.results th,
.results td {
  text-align: left;
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid var(--line);
}

.results th {
  font-weight: 400;
  color: var(--snow-muted);
  font-size: var(--step--1);
}

.num {
  text-align: right !important;
  white-space: nowrap;
}

.energy {
  margin-bottom: 1rem;
  font-size: var(--step--1);
}

.side {
  display: grid;
  gap: 1.25rem;
}

@media (max-width: 1000px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
</style>
