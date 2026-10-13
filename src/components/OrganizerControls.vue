<script setup lang="ts">
import { ref } from 'vue';
import { referenceDemoSchedule } from '../domain/referenceSchedule';
import type { HardwareMode } from '../state/gameStore';
import { useGameStore } from '../state/injection';

const emit = defineEmits<{ close: [] }>();
const store = useGameStore();

const confirmClear = ref(false);
const confirmReset = ref(false);
const message = ref<string | null>(null);
const offline = ref(false);

async function reset(): Promise<void> {
  await store.resetGame();
  confirmReset.value = false;
  message.value = 'Spel gereset.';
}

function startDemo(): void {
  store.startDemo(referenceDemoSchedule());
  emit('close');
}

function clearLeaderboard(): void {
  store.clearLeaderboard();
  confirmClear.value = false;
  message.value = 'Scorebord gewist.';
}

function exportLeaderboard(): void {
  const blob = new Blob([store.exportLeaderboard()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'merry-gridmas-scorebord.json';
  link.click();
  URL.revokeObjectURL(url);
}

async function importLeaderboard(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const added = store.importLeaderboard(await file.text());
    message.value = `${added} nieuwe run(s) geïmporteerd.`;
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
  } finally {
    input.value = '';
  }
}

async function setMode(event: Event): Promise<void> {
  await store.setHardwareMode((event.target as HTMLSelectElement).value as HardwareMode);
}

function toggleOffline(): void {
  store.setDummyOffline(offline.value);
}
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <section class="panel" role="dialog" aria-modal="true" aria-labelledby="org-title">
      <header>
        <h2 id="org-title">Organisatorenpaneel</h2>
        <button type="button" class="btn btn-quiet" @click="emit('close')">Sluiten</button>
      </header>

      <p v-if="message" class="message" role="status">{{ message }}</p>

      <div class="group">
        <h3>Spel</h3>
        <div class="actions">
          <template v-if="!confirmReset">
            <button type="button" class="btn" @click="confirmReset = true">Huidig spel resetten</button>
          </template>
          <template v-else>
            <span>Voortgang van dit team gaat verloren.</span>
            <button type="button" class="btn danger" @click="reset">Ja, resetten</button>
            <button type="button" class="btn btn-quiet" @click="confirmReset = false">Annuleren</button>
          </template>
          <button type="button" class="btn" @click="startDemo">Demo met referentieschema</button>
        </div>
        <p class="muted small">De demo-run telt niet mee voor het scorebord.</p>
      </div>

      <div class="group">
        <h3>Scorebord</h3>
        <div class="actions">
          <button type="button" class="btn" @click="exportLeaderboard">Exporteren als JSON</button>
          <label class="btn file">
            Importeren
            <input type="file" accept="application/json,.json" @change="importLeaderboard" />
          </label>
          <template v-if="!confirmClear">
            <button type="button" class="btn" @click="confirmClear = true">Scorebord wissen</button>
          </template>
          <template v-else>
            <span>Alle {{ store.state.leaderboard.length }} runs verdwijnen.</span>
            <button type="button" class="btn danger" @click="clearLeaderboard">Ja, wissen</button>
            <button type="button" class="btn btn-quiet" @click="confirmClear = false">Annuleren</button>
          </template>
        </div>
      </div>

      <div class="group">
        <h3>Hardware</h3>
        <label class="field">
          Aansturing
          <select :value="store.state.hardwareMode" @change="setMode">
            <option value="mock">Gesimuleerde miniatuur (geen hardware)</option>
            <option value="esp32-dummy">ESP32 dummy-connector (logt aanroepen)</option>
          </select>
        </label>
        <label v-if="store.state.hardwareMode === 'esp32-dummy'" class="check">
          <input v-model="offline" type="checkbox" @change="toggleOffline" />
          Simuleer verbindingsverlies
        </label>
        <p v-if="store.state.hardwareWarning" class="warning">{{ store.state.hardwareWarning }}</p>

        <div v-if="store.state.hardwareMode === 'esp32-dummy'" class="log">
          <h4>Laatste hardware-aanroepen</h4>
          <p v-if="store.state.hardwareCalls.length === 0" class="muted small">Nog geen aanroepen.</p>
          <ol v-else reversed>
            <li v-for="call in store.state.hardwareCalls.slice(-8).reverse()" :key="call.sequence">
              <code>{{ call.method }} {{ call.url }}</code>
              <span :class="call.outcome === 'simulated-ok' ? 'ok' : 'fail'">
                {{ call.outcome === 'simulated-ok' ? 'ok (gesimuleerd)' : 'offline (gesimuleerd)' }}
              </span>
              <pre>{{ JSON.stringify(call.body) }}</pre>
            </li>
          </ol>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: #0008;
  display: flex;
  justify-content: flex-end;
  z-index: 10;
}

.panel {
  width: min(520px, 100%);
  height: 100%;
  overflow-y: auto;
  background: var(--night-deep);
  border-left: 1px solid var(--line);
  padding: 1.5rem;
  display: grid;
  align-content: start;
  gap: 1.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  font-size: var(--step-2);
}

h3 {
  font-size: var(--step-1);
  margin-bottom: 0.5rem;
}

h4 {
  margin: 0.75rem 0 0.25rem;
  font-size: var(--step-0);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.danger {
  border-color: var(--holly);
  background: var(--holly-soft);
}

.file input {
  display: none;
}

.field {
  display: grid;
  gap: 0.25rem;
}

select {
  min-height: 44px;
  background: var(--night);
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  padding: 0 0.5rem;
}

.check {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
}

.small {
  font-size: var(--step--1);
}

.message {
  color: var(--lamp);
}

.warning {
  color: var(--holly);
  font-size: var(--step--1);
  margin-top: 0.5rem;
}

.log ol {
  padding-left: 1.5rem;
  display: grid;
  gap: 0.5rem;
  font-size: var(--step--1);
}

.log pre {
  margin: 0.2rem 0 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.75rem;
  color: var(--snow-muted);
}

.ok {
  color: var(--pine);
  margin-left: 0.5rem;
}

.fail {
  color: var(--holly);
  margin-left: 0.5rem;
}
</style>
