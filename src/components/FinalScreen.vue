<script setup lang="ts">
import { computed } from 'vue';
import { chargingNetKwh } from '../domain/calculateLoad';
import type { LeaderboardEntry } from '../domain/leaderboard';
import { BATTERY, BLOCKS, INITIAL_MORALE } from '../domain/scenario';
import type { DecorationId, GameState } from '../domain/types';
import OpenAdrView from './OpenAdrView.vue';
import Scoreboard from './Scoreboard.vue';

const props = defineProps<{
  game: GameState;
  leaderboard: LeaderboardEntry[];
}>();

const emit = defineEmits<{ nextTeam: [] }>();

const actions = computed(() => props.game.executed.map((e) => e.action));
const batteryUsed = computed(() => BATTERY.capacityKwh - (props.game.executed.at(-1)?.batteryAfterKwh ?? BATTERY.capacityKwh));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const SHORT_NAMES: Record<DecorationId, string> = {
  homes: 'woonwijk',
  seniors: 'De Gouden Ster',
  hospital: 'ziekenhuis',
  square: 'dorpsplein',
};

/** Vaste, deterministische samenvatting op basis van de eindmoraal. */
const summary = computed(() => {
  const m = props.game.morale;
  if (m >= 85) return 'Een legendarische kerstavond. Het net hield stand en bijna niemand merkte dat er iets werd geschoven.';
  if (m >= 78) return 'Gridmas bleef overeind en de meeste lichtjes brandden. Hier en daar wordt nog nagepraat over dat ene donkere moment.';
  if (m >= 70) return 'Het net hield het, maar het dorp heeft het gemerkt. De bewonerscommissie wil volgend jaar graag meedenken.';
  return 'Het licht bleef aan waar het moest, maar de kerstsfeer kreeg flinke klappen. Gelukkig is er volgend jaar weer een kerstavond.';
});

function actionSummary(i: number): string {
  const a = actions.value[i]!;
  const parts: string[] = [];
  for (const id of a.decorationsOff) parts.push(`${SHORT_NAMES[id]} donker`);
  if (a.rinkPaused) parts.push('ijsbaan dicht');
  if (a.batteryDischarge) parts.push('batterij');
  if (a.chargersPaused) parts.push('laadpauze');
  if (a.extraCharging) parts.push('extra laden');
  return parts.join(', ') || 'geen ingrepen';
}
</script>

<template>
  <section class="final" aria-labelledby="final-title">
    <div class="hero">
      <p class="muted">{{ game.teamName }} heeft Gridmas door de kerstnacht geloodst</p>
      <h2 id="final-title">
        <span class="value">{{ game.morale }}</span>
        <span class="label">kerstmoraal</span>
      </h2>
      <p class="summary">{{ summary }}</p>
      <p v-if="game.isDemo" class="muted">Demo-run van de organisator: telt niet mee voor het scorebord.</p>
    </div>

    <div class="columns">
      <div>
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

        <p class="energy muted">
          Energiebalans: de batterij leverde {{ batteryUsed }} kWh. Laadplein netto {{ chargingNetKwh(actions) }} kWh: elke
          uitgestelde laadbeurt is ingehaald.
        </p>

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
