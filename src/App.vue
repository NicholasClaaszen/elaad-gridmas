<script setup lang="ts">
import { computed, ref } from 'vue';
import FinalScreen from './components/FinalScreen.vue';
import HistoryTimeline from './components/HistoryTimeline.vue';
import OrganizerControls from './components/OrganizerControls.vue';
import PlanningBoard from './components/PlanningBoard.vue';
import RoundReview from './components/RoundReview.vue';
import RoundRunning from './components/RoundRunning.vue';
import ScenePreview from './components/ScenePreview.vue';
import WelcomeScreen from './components/WelcomeScreen.vue';
import { BLOCK_COUNT, BLOCKS } from './domain/scenario';
import { useGameStore } from './state/injection';

const store = useGameStore();
const { state } = store;
const screen = store.screen;
const showOrganizer = ref(false);

const game = computed(() => state.game);
const lastExecuted = computed(() => state.game?.executed.at(-1));
const executedActions = computed(() => state.game?.executed.map((e) => e.action) ?? []);
// Tijdens de animatie nog de oude stand tonen: het nieuwsbulletin onthult de nieuwe moraal.
const revealed = computed(() => {
  const g = state.game;
  if (!g) return null;
  const hidden = g.phase === 'ROUND_RUNNING' ? 1 : 0;
  const shown = g.executed.length - hidden;
  return { morale: hidden ? g.executed.at(-1)!.moraleBefore : g.morale, blocks: shown };
});
const runningLabel = computed(() => BLOCKS[(lastExecuted.value?.action.blockIndex ?? 0)]!.label);
const adapterName = computed(() =>
  state.hardwareMode === 'mock' ? 'gesimuleerd, geen hardware' : 'ESP32 dummy-connector',
);
</script>

<template>
  <div class="app">
    <header v-if="screen !== 'WELCOME'" class="topbar">
      <p class="brand">Merry Gridmas</p>
      <p v-if="game" class="team">{{ game.teamName }}</p>
      <p v-if="revealed" class="morale">
        Kerstmoraal <strong>{{ revealed.morale }}</strong>
        <span class="muted">na {{ revealed.blocks }} van {{ BLOCK_COUNT }} blokken</span>
      </p>
    </header>

    <p v-if="state.hardwareWarning" class="hw-warning" role="status">{{ state.hardwareWarning }}</p>

    <main>
      <WelcomeScreen
        v-if="screen === 'WELCOME'"
        :leaderboard="state.leaderboard"
        :error="state.error"
        @start="store.startGame"
      />

      <template v-else-if="screen === 'PLANNING' && game">
        <PlanningBoard
          :schedule="game.schedule"
          :executed-actions="executedActions"
          :error="state.error"
          @update="store.setAction"
          @play="store.playNextBlock"
          @dismiss-error="store.dismissError"
        >
          <template #side>
            <ScenePreview :scene="state.scene" :adapter-name="adapterName" />
          </template>
        </PlanningBoard>
        <HistoryTimeline :executed="game.executed" />
      </template>

      <RoundRunning
        v-else-if="screen === 'ROUND_RUNNING'"
        :block-label="runningLabel"
        @done="store.finishRunningRound"
      />

      <div v-else-if="screen === 'ROUND_REVIEW' && lastExecuted" class="review-layout">
        <RoundReview
          :executed="lastExecuted"
          :is-last="game!.executed.length === BLOCK_COUNT"
          @continue="store.continueAfterReview"
        />
        <ScenePreview :scene="state.scene" :adapter-name="adapterName" />
      </div>

      <FinalScreen
        v-else-if="screen === 'FINISHED' && game"
        :game="game"
        :leaderboard="state.leaderboard"
        @next-team="store.resetGame"
      />
    </main>

    <footer>
      <button type="button" class="btn btn-quiet organizer" @click="showOrganizer = true">Organisator</button>
    </footer>

    <OrganizerControls v-if="showOrganizer" @close="showOrganizer = false" />
  </div>
</template>

<style scoped>
.app {
  max-width: 1440px;
  margin: 0 auto;
  padding: 1rem 1.5rem 0.5rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.topbar {
  display: flex;
  align-items: baseline;
  gap: 1.5rem;
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.brand {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--step-1);
}

.team {
  color: var(--snow-muted);
}

.morale {
  margin-left: auto;
  font-family: var(--font-display);
}

.morale strong {
  font-size: var(--step-2);
  color: var(--lamp);
  margin: 0 0.25rem;
}

.morale .muted {
  font-family: var(--font-body);
  font-size: var(--step--1);
}

.hw-warning {
  font-size: var(--step--1);
  border: 1px solid var(--holly);
  background: var(--holly-soft);
  border-radius: var(--radius-control);
  padding: 0.4rem 0.75rem;
  margin-bottom: 1rem;
}

.review-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 2rem;
  align-items: start;
}

footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

.organizer {
  font-size: var(--step--1);
  min-height: 32px;
  padding: 0.25rem 0.5rem;
}

@media (max-width: 1100px) {
  .review-layout {
    grid-template-columns: 1fr;
  }
}
</style>
