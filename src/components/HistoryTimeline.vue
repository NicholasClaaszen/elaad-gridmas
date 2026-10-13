<script setup lang="ts">
import { BLOCKS } from '../domain/scenario';
import type { ExecutedBlock } from '../domain/types';

/** Alleen al uitgevoerde blokken: historische moraalwijzigingen mogen zichtbaar blijven. */
defineProps<{ executed: ExecutedBlock[] }>();

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<template>
  <section v-if="executed.length" class="timeline" aria-label="Gespeelde blokken">
    <h3>Tot nu toe</h3>
    <ol>
      <li v-for="e in executed" :key="e.action.blockIndex">
        <details>
          <summary>
            <span class="time">{{ BLOCKS[e.action.blockIndex]!.label }}</span>
            <span :class="e.delta >= 0 ? 'delta-up' : 'delta-down'">{{ signed(e.delta) }}</span>
            <span class="muted">naar {{ e.moraleAfter }}</span>
          </summary>
          <ul>
            <li v-for="(ev, n) in e.events" :key="n">{{ ev.headline }} ({{ signed(ev.delta) }})</li>
          </ul>
        </details>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.timeline {
  margin-top: 1.5rem;
}

h3 {
  font-size: var(--step-1);
  margin-bottom: 0.5rem;
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

details {
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  padding: 0.4rem 0.7rem;
  background: var(--night-deep);
  font-size: var(--step--1);
}

summary {
  cursor: pointer;
  display: flex;
  gap: 0.5rem;
}

.time {
  font-weight: 700;
}

ul {
  margin: 0.4rem 0 0;
  padding-left: 1rem;
}
</style>
