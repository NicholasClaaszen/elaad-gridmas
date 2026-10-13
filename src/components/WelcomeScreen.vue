<script setup lang="ts">
import { ref } from 'vue';
import type { LeaderboardEntry } from '../domain/leaderboard';
import { BATTERY, CAPACITY_KW, CHARGERS, DECORATIONS, RINK } from '../domain/scenario';
import AssetCard from './AssetCard.vue';
import Scoreboard from './Scoreboard.vue';

defineProps<{
  leaderboard: LeaderboardEntry[];
  error?: string | null;
}>();

const emit = defineEmits<{ start: [teamName: string] }>();

const teamName = ref('');

const assets = [
  ...DECORATIONS.map((d) => ({ name: d.name, effect: `Feestverlichting uit: −${d.reductionKw} kW`, story: d.story })),
  { name: RINK.name, effect: `Eén keer twee uur dicht: −${RINK.reductionKw} kW`, story: RINK.story },
  { name: BATTERY.name, effect: `Max. twee keer ontladen: −${BATTERY.dischargeKw} kW`, story: BATTERY.story },
  { name: CHARGERS.name, effect: `Max. twee pauzes: −${CHARGERS.pauseKw} kW`, story: CHARGERS.story },
];
</script>

<template>
  <section class="welcome">
    <div class="hero">
      <h1>
        <span class="merry">Merry Gridmas</span>
        <span class="tagline">Keep the lights on!</span>
      </h1>
      <p class="lede">
        Het is 24 december in het dorp Gridmas. Iedereen wil kerst vieren, maar het lokale net kan maximaal
        <strong>{{ CAPACITY_KW }} kW</strong> aan. Tussen 14:00 en 02:00 lopen jullie de avond door in zes blokken van
        twee uur. Plan vooraf welke flexibiliteit je inzet zodat het net nergens overbelast raakt.
      </p>
      <p class="muted">
        Speelduur ongeveer 20 minuten. Wat het dorp van jullie keuzes vindt, hoor je pas als een blok is gespeeld. Het
        team met de hoogste kerstmoraal wint.
      </p>

      <form class="start" @submit.prevent="emit('start', teamName)">
        <label for="team-name">Teamnaam</label>
        <div class="row">
          <input id="team-name" v-model="teamName" maxlength="40" autocomplete="off" placeholder="Bijvoorbeeld: De Nette Rendieren" />
          <button type="submit" class="btn btn-primary" :disabled="!teamName.trim()">Start planning</button>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </form>
    </div>

    <div class="side">
      <section aria-labelledby="assets-title">
        <h3 id="assets-title">Wat kunnen jullie inzetten?</h3>
        <AssetCard v-for="a in assets" :key="a.name" v-bind="a" />
      </section>
      <Scoreboard :entries="leaderboard" :limit="8" />
    </div>
  </section>
</template>

<style scoped>
.welcome {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 3rem;
  align-items: start;
}

.hero {
  display: grid;
  gap: 1.25rem;
  padding-top: 2rem;
}

h1 {
  display: grid;
}

.merry {
  font-size: clamp(3rem, 8vw, 6.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 0.95;
  color: var(--snow);
  text-shadow:
    0 0 1px var(--snow),
    0 0 40px #ffc65c55;
}

.tagline {
  font-size: var(--step-2);
  font-weight: 500;
  color: var(--lamp);
  margin-top: 0.5rem;
}

.lede {
  font-size: var(--step-1);
  max-width: 60ch;
}

.start {
  display: grid;
  gap: 0.4rem;
  margin-top: 1rem;
  max-width: 34rem;
}

label {
  font-weight: 700;
}

.row {
  display: flex;
  gap: 0.75rem;
}

input {
  flex: 1;
  min-height: 48px;
  padding: 0 0.9rem;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--night-deep);
}

.error {
  color: var(--holly);
}

.side {
  display: grid;
  gap: 2rem;
}

.side h3 {
  font-size: var(--step-1);
  margin-bottom: 0.25rem;
}

@media (max-width: 900px) {
  .welcome {
    grid-template-columns: 1fr;
  }
}
</style>
