<script setup lang="ts">
import { computed } from 'vue';
import { BLOCKS, CAPACITY_KW } from '../domain/scenario';
import type { ExecutedBlock } from '../domain/types';

const props = defineProps<{
  executed: ExecutedBlock;
  isLast: boolean;
}>();

const emit = defineEmits<{ continue: [] }>();

const block = computed(() => BLOCKS[props.executed.action.blockIndex]!);
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<template>
  <section class="review" aria-labelledby="review-title">
    <header>
      <p class="muted">Nieuwsbulletin {{ block.label }}, {{ block.phase }}</p>
      <h2 id="review-title">De Gridmas Courant</h2>
    </header>

    <div class="score" role="status">
      <p class="morale">
        <span class="label">Kerstmoraal</span>
        <span class="value">{{ executed.moraleAfter }}</span>
        <span class="of muted">/ 100</span>
      </p>
      <p class="delta" :class="executed.delta >= 0 ? 'delta-up' : 'delta-down'">
        {{ signed(executed.delta) }} dit blok
        <span class="muted">(was {{ executed.moraleBefore }})</span>
      </p>
      <p class="facts muted">
        Netbelasting {{ executed.loadKw }} kW van {{ CAPACITY_KW }} kW, batterij nog {{ executed.batteryAfterKwh }} kWh
      </p>
    </div>

    <ol class="events">
      <li v-for="(event, n) in executed.events" :key="n" :class="{ atmosphere: event.assetId === 'atmosphere' }">
        <span class="event-delta" :class="event.delta >= 0 ? 'delta-up' : 'delta-down'">{{ signed(event.delta) }}</span>
        <div>
          <h3>{{ event.headline }}</h3>
          <p>{{ event.text }}</p>
        </div>
      </li>
    </ol>

    <aside v-if="executed.action.blockIndex === 0" class="first-round">
      <h3>Zo werkt het verder</h3>
      <p>
        Na elk blok lees je hier hoe het dorp reageerde. De gevolgen van keuzes zie je pas als een blok is gespeeld.
        Gespeelde blokken liggen vast; alles wat nog komt mag je blijven aanpassen.
      </p>
    </aside>

    <button type="button" class="btn btn-primary" @click="emit('continue')">
      {{ isLast ? 'Naar de uitslag' : 'Verder naar volgende ronde' }}
    </button>
  </section>
</template>

<style scoped>
.review {
  max-width: 760px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;
}

h2 {
  font-size: var(--step-3);
}

.score {
  display: grid;
  gap: 0.25rem;
}

.morale {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  font-family: var(--font-display);
}

.morale .label {
  font-size: var(--step-1);
}

.morale .value {
  font-size: var(--step-4);
  font-weight: 800;
  color: var(--lamp);
  line-height: 1;
}

.delta {
  font-family: var(--font-display);
  font-size: var(--step-2);
  font-weight: 700;
}

.facts {
  font-size: var(--step--1);
}

.events {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.events li {
  display: grid;
  grid-template-columns: 3.5rem 1fr;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--line);
}

.events h3 {
  font-size: var(--step-1);
  margin-bottom: 0.25rem;
}

.events p {
  max-width: 65ch;
}

.event-delta {
  font-family: var(--font-display);
  font-size: var(--step-2);
  font-weight: 800;
}

.first-round {
  border-left: 3px solid var(--lamp);
  padding: 0.5rem 1rem;
  display: grid;
  gap: 0.3rem;
}

.first-round h3 {
  font-size: var(--step-1);
}

.btn-primary {
  justify-self: start;
}
</style>
