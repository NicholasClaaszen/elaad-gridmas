<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FinalScreen from './components/FinalScreen.vue';
import HistoryTimeline from './components/HistoryTimeline.vue';
import LocationPrintCards from './components/LocationPrintCards.vue';
import OrganizerControls from './components/OrganizerControls.vue';
import PlanningBoard from './components/PlanningBoard.vue';
import RoundReview from './components/RoundReview.vue';
import RoundRunning from './components/RoundRunning.vue';
import ScenePreview from './components/ScenePreview.vue';
import WelcomeScreen from './components/WelcomeScreen.vue';
import { BATTERY, BLOCK_COUNT, BLOCKS, CAPACITY_KW } from './domain/scenario';
import { calculateLoad, batteryRemainingAfterEachBlock } from './domain/calculateLoad';
import { knownLoadAdjustments } from './domain/events';
import { useGameStore } from './state/injection';
import { createSoundPlayer } from './audio/soundPlayer';
import { buildFinaleSoundscape, buildNewsSoundscape } from './audio/soundscape';

const store = useGameStore();
const { state } = store;
const screen = store.screen;
const showOrganizer = ref(false);
const showCards = ref(false);
const selectedBlock = ref(0);
watch(() => state.game?.executed.length, (count) => { selectedBlock.value = Math.min(count ?? 0, BLOCK_COUNT - 1); }, { immediate: true });
const phaseLabel = computed(() => ({ WELCOME: 'Voorbereiding', PLANNING: 'Programmeren', ROUND_RUNNING: 'Uitvoering', ROUND_REVIEW: 'Nieuws uit het dorp', FINISHED: 'Eindresultaat' })[screen.value]);
const shownIndex = computed(() => screen.value === 'PLANNING' ? selectedBlock.value : (lastExecuted.value?.action.blockIndex ?? 0));
const shownLoad = computed(() => {
  const g = state.game;
  if (!g) return BLOCKS[0]!.baselineLoadKw;
  return screen.value === 'PLANNING' ? calculateLoad(shownIndex.value, g.schedule[shownIndex.value]!, knownLoadAdjustments(executedActions.value)[shownIndex.value] ?? 0) : (lastExecuted.value?.loadKw ?? BLOCKS[0]!.baselineLoadKw);
});
const shownBattery = computed(() => {
  const g = state.game;
  if (!g) return BATTERY.capacityKwh;
  return screen.value === 'PLANNING' ? batteryRemainingAfterEachBlock(g.schedule)[shownIndex.value] : (lastExecuted.value?.batteryAfterKwh ?? BATTERY.capacityKwh);
});

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
// Geluid mag pas na een klik; elke klik in de app ontgrendelt het. Daarna klinkt het nieuws vanzelf.
const sound = createSoundPlayer();
watch(screen, (now, before) => {
  const last = state.game?.executed.at(-1);
  if (!state.soundOn || !last) return;
  if (now === 'ROUND_REVIEW' && before === 'ROUND_RUNNING') sound.play(buildNewsSoundscape(last));
  if (now === 'FINISHED' && before === 'ROUND_REVIEW') sound.play(buildFinaleSoundscape(state.game!.morale));
});
const runningLabel = computed(() => BLOCKS[(lastExecuted.value?.action.blockIndex ?? 0)]!.label);
</script>

<template>
  <LocationPrintCards v-if="showCards" @close="showCards = false" />
  <div v-else class="app" @pointerdown.capture="sound.unlock()" @keydown.capture="sound.unlock()">
    <header class="topbar">
      <div class="brand-block"><p class="brand">Merry Gridmas<span class="brand-star" aria-hidden="true">✦</span></p><p class="brand-sub">Keep the lights on!</p></div>
      <div class="phase"><span class="eyebrow">{{ phaseLabel }}</span><span v-if="game" class="team">{{ game.teamName }}</span><span v-else class="team">ElaadNL · Kerstavond 2026</span></div>
      <div class="header-metrics">
        <p v-if="game"><span class="muted">{{ screen === 'PLANNING' ? 'Geselecteerd blok' : 'Tijdsblok' }}</span><strong>{{ BLOCKS[shownIndex]!.label }}</strong></p>
        <p><span class="muted">Netcapaciteit</span><strong>{{ CAPACITY_KW }} <small>kW</small></strong></p>
        <p v-if="game" :class="{ danger: shownLoad > CAPACITY_KW }"><span class="muted">{{ screen === 'PLANNING' ? 'Gepland verbruik' : 'Netbelasting' }}</span><strong>{{ shownLoad }} <small>kW</small></strong></p>
        <p v-if="game"><span class="muted">{{ screen === 'PLANNING' ? 'Batterij na dit blok' : 'Batterij over' }}</span><strong>{{ shownBattery }} <small>kWh</small></strong></p>
        <p v-if="revealed" class="morale"><span class="muted">Kerstmoraal</span><template v-if="revealed.blocks > 0"><strong>{{ revealed.morale }}</strong><span class="muted">na {{ revealed.blocks }} van {{ BLOCK_COUNT }} blokken</span></template><span v-else class="unrevealed">Nog niet bekend</span></p>
      </div>
    </header>

    <p v-if="state.hardwareWarning" class="hw-warning" role="status">{{ state.hardwareWarning }}</p>

    <main>
      <WelcomeScreen
        v-if="screen === 'WELCOME'"
        :leaderboard="state.leaderboard"
        :error="state.error"
        :props-mode="state.propsMode"
        @start="store.startGame"
      />

      <template v-else-if="screen === 'PLANNING' && game">
        <PlanningBoard
          :schedule="game.schedule"
          :selected-block="selectedBlock"
          @select-block="selectedBlock = $event"
          :executed-actions="executedActions"
          :generator-unlocked="game.generatorUnlocked"
          :props-mode="state.propsMode"
          :error="state.error"
          @update="store.setAction"
          @play="store.playNextBlock"
          @dismiss-error="store.dismissError"
        />
        <HistoryTimeline :executed="game.executed" />
      </template>

      <RoundRunning
        v-else-if="screen === 'ROUND_RUNNING'"
        :block-label="runningLabel"
        :scene="state.scene"
        :load-kw="lastExecuted?.loadKw ?? 0"
        :previous-load-kw="game?.executed.at(-2)?.loadKw ?? BLOCKS[0]!.baselineLoadKw"
        @done="store.finishRunningRound"
      />

      <div v-else-if="screen === 'ROUND_REVIEW' && lastExecuted" class="review-layout">
        <RoundReview
          :executed="lastExecuted"
          :is-last="game!.executed.length === BLOCK_COUNT"
          @continue="store.continueAfterReview"
        />
        <ScenePreview :scene="state.scene" />
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

    <OrganizerControls v-if="showOrganizer" @close="showOrganizer = false" @print-cards="showOrganizer = false; showCards = true" @test-sound="sound.play(buildFinaleSoundscape(87))" />
  </div>
</template>

<style scoped>
.brand-block { flex-shrink: 0; }
.brand-star { color: var(--lamp); margin-left: .4rem; }
.brand-sub { font-size: .7rem; color: var(--lamp); }
.phase { display: grid; gap: .25rem; }
.header-metrics { display: flex; gap: 1.4rem; margin-left: auto; }
.header-metrics > p { display: flex; flex-direction: column; font-size: .7rem; }
.header-metrics strong { font-family: var(--font-display); font-size: 1.15rem; }
.header-metrics small { font-size: .75rem; font-weight: 400; }
.header-metrics .danger strong { color: var(--holly); }
.unrevealed { font-size: .8rem; padding-top: .3rem; }
@media (max-width: 1250px) { .topbar { flex-wrap: wrap; } .header-metrics { flex-basis: 100%; margin-left: 0; gap: 1.2rem; flex-wrap: wrap; } }

.app {
  max-width: 1760px;
  margin: 0 auto;
  padding: .5rem 1.5rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--night);
  padding-top: .5rem;
  display: flex;
  align-items: center;
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
  grid-template-columns: minmax(0, 1.4fr) minmax(340px, 1fr);
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

@media (max-width: 600px) { .app { padding: .5rem .75rem; } .topbar { position: static; } }
@media (max-width: 1100px) {
  .review-layout {
    grid-template-columns: 1fr;
  }
}
</style>
