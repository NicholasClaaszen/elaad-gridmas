<script setup lang="ts">
import { computed } from 'vue';
import { projectToEducationalOpenAdr } from '../domain/educationalOpenAdr';
import type { Schedule } from '../domain/types';

const props = defineProps<{ schedule: Schedule }>();

const program = computed(() => projectToEducationalOpenAdr(props.schedule));
const json = computed(() => JSON.stringify(program.value, null, 2));
</script>

<template>
  <details class="openadr">
    <summary>Bekijk jullie avond als OpenADR-programma</summary>
    <p class="disclaimer">{{ program.label }}</p>
    <p class="muted">
      In OpenADR verstuurt een netbeheerder (VTN) een <em>Program</em> met <em>Events</em> naar apparaten (VEN's).
      Elk event hieronder is één aansturing van twee uur (PT2H) uit jullie plan, voor programma
      {{ program.program.programName }}.
    </p>
    <ol class="events">
      <li v-for="event in program.events" :key="event.eventName">
        <span class="when">{{ event.intervalPeriod.start.replace('T', ' ').slice(0, 16) }}</span>
        {{ event.description }}
      </li>
    </ol>
    <details>
      <summary>Ruwe JSON</summary>
      <pre>{{ json }}</pre>
    </details>
  </details>
</template>

<style scoped>
.openadr {
  border: 1px solid var(--line);
  border-radius: var(--radius-panel);
  padding: 0.75rem 1rem;
  background: var(--night-deep);
}

summary {
  cursor: pointer;
  font-weight: 700;
}

.disclaimer {
  margin: 0.75rem 0 0.5rem;
  color: var(--lamp);
  font-size: var(--step--1);
}

.events {
  padding-left: 1.2rem;
  display: grid;
  gap: 0.25rem;
  font-size: var(--step--1);
}

.when {
  color: var(--frost);
  margin-right: 0.5rem;
}

pre {
  max-height: 320px;
  overflow: auto;
  font-size: 0.75rem;
  background: var(--night);
  padding: 0.75rem;
  border-radius: var(--radius-control);
}
</style>
