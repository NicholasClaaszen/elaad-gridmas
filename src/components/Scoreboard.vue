<script setup lang="ts">
import { computed } from 'vue';
import { rankLeaderboard, type LeaderboardEntry } from '../domain/leaderboard';

const props = defineProps<{
  entries: LeaderboardEntry[];
  highlightRunId?: string;
  limit?: number;
}>();

const ranked = computed(() => rankLeaderboard(props.entries).slice(0, props.limit ?? Infinity));
</script>

<template>
  <section class="scoreboard" aria-labelledby="scoreboard-title">
    <h3 id="scoreboard-title">Scorebord</h3>
    <p v-if="ranked.length === 0" class="muted">Nog geen teams. Jullie kunnen de eerste zijn.</p>
    <table v-else>
      <thead>
        <tr>
          <th scope="col">Plek</th>
          <th scope="col">Team</th>
          <th scope="col" class="num">Moraal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in ranked" :key="entry.runId" :class="{ current: entry.runId === highlightRunId }">
          <td>{{ entry.rank }}</td>
          <td>
            {{ entry.teamName }}
            <span v-if="entry.runId === highlightRunId" class="you">(jullie)</span>
          </td>
          <td class="num">{{ entry.finalMorale }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
h3 {
  font-size: var(--step-1);
  margin-bottom: 0.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--line);
}

th {
  font-size: var(--step--1);
  color: var(--snow-muted);
  font-weight: 400;
}

.num {
  text-align: right;
  font-family: var(--font-display);
  font-weight: 700;
}

tr.current td {
  background: var(--lamp-soft);
}

.you {
  color: var(--lamp);
  font-size: var(--step--1);
}
</style>
