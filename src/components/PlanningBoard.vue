<script setup lang="ts">
import { computed } from 'vue';
import { batteryRemainingAfterEachBlock, calculateLoads, chargingNetKwh } from '../domain/calculateLoad';
import { BATTERY, BLOCKS, CAPACITY_KW, CHARGERS, DECORATIONS, DECORATION_BLOCKS, RINK } from '../domain/scenario';
import type { BlockAction, DecorationId, Schedule } from '../domain/types';
import { validateSchedule } from '../domain/validateSchedule';
import LoadChart from './LoadChart.vue';

/*
 * Bewust alleen technische data als invoer: deze component krijgt nooit moraal- of strafinformatie.
 */
const props = defineProps<{
  schedule: Schedule;
  executedActions: BlockAction[];
  error?: string | null;
}>();

const emit = defineEmits<{
  update: [action: BlockAction];
  play: [];
  dismissError: [];
}>();

const lockedCount = computed(() => props.executedActions.length);
const nextIndex = computed(() => lockedCount.value);
const loads = computed(() => calculateLoads(props.schedule));
const battery = computed(() => batteryRemainingAfterEachBlock(props.schedule));
const issues = computed(() => validateSchedule(props.schedule, props.executedActions));
const isValid = computed(() => issues.value.length === 0);
const isFirstRound = computed(() => lockedCount.value === 0);

const blockIssues = (i: number) => issues.value.filter((issue) => issue.blockIndex === i);
const globalIssues = computed(() => issues.value.filter((issue) => issue.blockIndex === undefined));

const rinkBlock = computed(() => props.schedule.findIndex((a) => a.rinkPaused));
const batteryBlocks = computed(() => props.schedule.filter((a) => a.batteryDischarge).length);
const pauses = computed(() => props.schedule.filter((a) => a.chargersPaused).length);
const extras = computed(() => props.schedule.filter((a) => a.extraCharging).length);
const netKwh = computed(() => chargingNetKwh(props.schedule));

const playLabel = computed(() =>
  isFirstRound.value ? 'Start kerstavond' : `Speel tijdsblok ${BLOCKS[nextIndex.value]?.label ?? ''}`,
);

function columnStatus(i: number): 'done' | 'next' | 'planned' {
  if (i < lockedCount.value) return 'done';
  return i === nextIndex.value ? 'next' : 'planned';
}

function isLocked(i: number): boolean {
  return i < lockedCount.value;
}

function patch(i: number, change: Partial<BlockAction>): void {
  if (isLocked(i)) return;
  const current = props.schedule[i]!;
  emit('update', { ...current, decorationsOff: [...current.decorationsOff], ...change });
}

function toggleDecoration(i: number, id: DecorationId): void {
  const off = props.schedule[i]!.decorationsOff;
  patch(i, { decorationsOff: off.includes(id) ? off.filter((d) => d !== id) : [...off, id] });
}
</script>

<template>
  <section class="planning" aria-labelledby="planning-title">
    <div class="main">
      <header class="intro">
        <h2 id="planning-title">Plan de kerstavond</h2>
        <p v-if="isFirstRound" class="muted">
          Zorg dat geen enkel blok boven de {{ CAPACITY_KW }} kW uitkomt. Pas als alle zes blokken passen, kan de avond beginnen.
        </p>
        <p v-else class="muted">
          Uitgevoerde blokken liggen vast. Je kunt alleen de blokken die nog komen aanpassen.
        </p>
      </header>


      <div class="board" role="group" aria-label="Planning per tijdsblok">
        <div class="corner" />
        <div
          v-for="block in BLOCKS"
          :key="block.index"
          class="block-head"
          :class="[columnStatus(block.index), { invalid: blockIssues(block.index).length > 0 }]"
        >
          <span class="time">{{ block.label }}</span>
          <span class="phase muted">{{ block.phase }}</span>
          <span class="status">
            <template v-if="columnStatus(block.index) === 'done'">Uitgevoerd</template>
            <template v-else-if="columnStatus(block.index) === 'next'">Volgende</template>
            <template v-else>Gepland</template>
          </span>
        </div>

        <div class="row-label chart-label">
          <span class="name">Netbelasting</span>
          <span class="muted">Limiet 100 kW per blok</span>
        </div>
        <LoadChart class="chart-cell" :loads="loads" :locked-count="lockedCount" />

        <!-- Feestverlichting -->
        <template v-for="decoration in DECORATIONS" :key="decoration.id">
          <div class="row-label">
            <span class="name">{{ decoration.name }}</span>
            <span class="muted">Feestverlichting uit: −{{ decoration.reductionKw }} kW</span>
          </div>
          <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index) }">
            <button
              v-if="DECORATION_BLOCKS.includes(block.index)"
              type="button"
              class="toggle"
              :class="schedule[block.index]!.decorationsOff.includes(decoration.id) ? 'is-off' : 'is-on'"
              :aria-pressed="schedule[block.index]!.decorationsOff.includes(decoration.id)"
              :aria-label="`${decoration.name}, ${block.label}: feestverlichting ${schedule[block.index]!.decorationsOff.includes(decoration.id) ? 'uit' : 'aan'}`"
              :disabled="isLocked(block.index)"
              @click="toggleDecoration(block.index, decoration.id)"
            >
              <span class="bulb-icon" aria-hidden="true" />
              <span>{{ schedule[block.index]!.decorationsOff.includes(decoration.id) ? 'Uit' : 'Aan' }}</span>
              <span v-if="schedule[block.index]!.decorationsOff.includes(decoration.id)" class="kw-tag">−{{ decoration.reductionKw }} kW</span>
            </button>
            <span v-else class="na" aria-label="niet schakelbaar">–</span>
          </div>
        </template>

        <!-- IJsbaan -->
        <div class="row-label">
          <span class="name">{{ RINK.name }}</span>
          <span class="muted">Eén keer dicht: −{{ RINK.reductionKw }} kW</span>
        </div>
        <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index) }">
          <button
            v-if="RINK.allowedBlocks.includes(block.index)"
            type="button"
            class="toggle"
            :class="schedule[block.index]!.rinkPaused ? 'is-active' : 'is-idle'"
            :aria-pressed="schedule[block.index]!.rinkPaused"
            :aria-label="`IJsbaan, ${block.label}: ${schedule[block.index]!.rinkPaused ? 'dicht' : 'open'}`"
            :disabled="isLocked(block.index)"
            @click="patch(block.index, { rinkPaused: !schedule[block.index]!.rinkPaused })"
          >
            <span>{{ schedule[block.index]!.rinkPaused ? 'Dicht' : 'Open' }}</span>
            <span v-if="schedule[block.index]!.rinkPaused" class="kw-tag">−{{ RINK.reductionKw }} kW</span>
          </button>
          <span v-else class="na" aria-label="niet beschikbaar">–</span>
        </div>

        <!-- Batterij -->
        <div class="row-label">
          <span class="name">{{ BATTERY.name }}</span>
          <span class="muted">Ontladen: −{{ BATTERY.dischargeKw }} kW, kost {{ BATTERY.energyPerBlockKwh }} kWh</span>
        </div>
        <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index) }">
          <button
            v-if="BATTERY.allowedBlocks.includes(block.index)"
            type="button"
            class="toggle"
            :class="schedule[block.index]!.batteryDischarge ? 'is-active' : 'is-idle'"
            :aria-pressed="schedule[block.index]!.batteryDischarge"
            :aria-label="`Buurtbatterij, ${block.label}: ${schedule[block.index]!.batteryDischarge ? 'ontladen' : 'stand-by'}`"
            :disabled="isLocked(block.index)"
            @click="patch(block.index, { batteryDischarge: !schedule[block.index]!.batteryDischarge })"
          >
            <span>{{ schedule[block.index]!.batteryDischarge ? 'Ontladen' : 'Stand-by' }}</span>
            <span v-if="schedule[block.index]!.batteryDischarge" class="kw-tag">−{{ BATTERY.dischargeKw }} kW</span>
          </button>
          <span v-else class="na" aria-label="niet beschikbaar">–</span>
          <span class="energy muted" :class="{ negative: battery[block.index]! < 0 }">{{ battery[block.index] }} kWh</span>
        </div>

        <!-- Laadplein -->
        <div class="row-label">
          <span class="name">{{ CHARGERS.name }}</span>
          <span class="muted">Pauze −{{ CHARGERS.pauseKw }} kW, extra laden +{{ CHARGERS.extraKw }} kW</span>
        </div>
        <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index) }">
          <button
            v-if="CHARGERS.pauseBlocks.includes(block.index)"
            type="button"
            class="toggle"
            :class="schedule[block.index]!.chargersPaused ? 'is-active' : 'is-idle'"
            :aria-pressed="schedule[block.index]!.chargersPaused"
            :aria-label="`Laadplein, ${block.label}: ${schedule[block.index]!.chargersPaused ? 'pauze' : 'actief'}`"
            :disabled="isLocked(block.index)"
            @click="patch(block.index, { chargersPaused: !schedule[block.index]!.chargersPaused })"
          >
            <span>{{ schedule[block.index]!.chargersPaused ? 'Pauze' : 'Actief' }}</span>
            <span v-if="schedule[block.index]!.chargersPaused" class="kw-tag">−{{ CHARGERS.pauseKw }} kW</span>
          </button>
          <button
            v-else
            type="button"
            class="toggle"
            :class="schedule[block.index]!.extraCharging ? 'is-charge' : 'is-idle'"
            :aria-pressed="schedule[block.index]!.extraCharging"
            :aria-label="`Laadplein, ${block.label}: ${schedule[block.index]!.extraCharging ? 'extra laden' : 'stand-by'}`"
            :disabled="isLocked(block.index)"
            @click="patch(block.index, { extraCharging: !schedule[block.index]!.extraCharging })"
          >
            <span>{{ schedule[block.index]!.extraCharging ? 'Extra laden' : 'Stand-by' }}</span>
            <span v-if="schedule[block.index]!.extraCharging" class="kw-tag">+{{ CHARGERS.extraKw }} kW</span>
          </button>
        </div>
      </div>
    </div>

    <aside class="side" aria-label="Controle van het programma">
      <section v-if="isFirstRound" class="guide" aria-label="Uitleg eerste blok">
        <h3>Zo begint het</h3>
        <p>
          Om 14:00 is het nog rustig: 75 kW, dus 25 kW ruimte. Die ruimte kun je gebruiken om het laadplein alvast
          <strong>vooruit te laden</strong>. Daarmee verdien je één laadpauze later op de avond. Je mag ook wachten en
          pas na middernacht inhalen. Elke pauze vraagt precies één extra laadsessie.
        </p>
        <p>
          Na elk gespeeld blok lees je in het nieuwsbulletin hoe Gridmas op jullie keuzes reageerde.
        </p>
      </section>
      <h3>Klopt het programma?</h3>

      <dl class="resources">
        <div :class="{ bad: batteryBlocks > BATTERY.maxUses }">
          <dt>Buurtbatterij</dt>
          <dd>
            {{ batteryBlocks }} van {{ BATTERY.maxUses }} blokken ingezet,
            {{ battery.at(-1) }} kWh over aan het eind
          </dd>
        </div>
        <div :class="{ bad: schedule.filter((a) => a.rinkPaused).length > RINK.maxUses }">
          <dt>IJsbaan</dt>
          <dd>
            <template v-if="rinkBlock < 0">Nog niet ingezet (1 keer mogelijk)</template>
            <template v-else>Dicht om {{ BLOCKS[rinkBlock]!.label }}</template>
          </dd>
        </div>
        <div :class="{ bad: pauses > CHARGERS.maxPauses || netKwh !== 0 }">
          <dt>Laadplein</dt>
          <dd>
            {{ pauses }} van {{ CHARGERS.maxPauses }} pauzes, {{ extras }} extra laadsessies.
            Laadbalans: {{ netKwh > 0 ? '+' : '' }}{{ netKwh }} kWh
            <span class="muted">(moet 0 zijn)</span>
          </dd>
        </div>
      </dl>

      <div class="issues" role="status" aria-live="polite">
        <p v-if="isValid" class="ok">Alle zes blokken passen binnen de regels.</p>
        <ul v-else>
          <li v-for="(issue, n) in issues" :key="n">{{ issue.message }}</li>
        </ul>
        <p v-if="globalIssues.length === 0 && !isValid" class="muted hint">Rood gemarkeerde blokken hebben nog werk nodig.</p>
      </div>

      <div v-if="error" class="error" role="alert">
        <p>{{ error }}</p>
        <button type="button" class="btn btn-quiet" @click="emit('dismissError')">Sluiten</button>
      </div>

      <button type="button" class="btn btn-primary play" :disabled="!isValid" @click="emit('play')">
        {{ playLabel }}
      </button>
      <p v-if="!isValid" class="muted hint">Los eerst de punten hierboven op.</p>
      <slot name="side" />
    </aside>
  </section>
</template>

<style scoped>
.planning {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 1.5rem;
  align-items: start;
}

.intro {
  margin-bottom: 0.75rem;
}

.intro h2 {
  font-size: var(--step-2);
  margin-bottom: 0.25rem;
}

.guide {
  border-left: 3px solid var(--lamp);
  padding: 0.25rem 0 0.25rem 0.9rem;
  display: grid;
  gap: 0.4rem;
  font-size: var(--step--1);
}

.guide h3 {
  font-size: var(--step-0);
}

.board {
  --board-gap: 6px;
  display: grid;
  grid-template-columns: 13.5rem repeat(6, minmax(0, 1fr));
  gap: var(--board-gap);
}

.block-head {
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-control);
  border-top: 3px solid var(--line);
  line-height: 1.3;
  background: var(--night-deep);
}

.block-head .time {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--step-0);
  white-space: nowrap;
}

.block-head .phase,
.block-head .status {
  font-size: var(--step--1);
}

.block-head.next {
  border-top-color: var(--lamp);
}

.block-head.next .status {
  color: var(--lamp);
  font-weight: 700;
}

.block-head.done {
  background: repeating-linear-gradient(135deg, #1a2a4a 0 8px, #1e3054 8px 16px);
  border-top-color: var(--frost);
}

.block-head.invalid {
  border-top-color: var(--holly);
  box-shadow: inset 0 0 0 1px var(--holly);
}

.row-label {
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: var(--step--1);
  padding-right: 0.5rem;
}

.row-label .name {
  font-weight: 700;
  font-size: var(--step-0);
  line-height: 1.2;
}

.chart-label {
  justify-content: flex-end;
  padding-bottom: 2rem;
}

.chart-cell {
  grid-column: 2 / -1;
  padding: 0.75rem 0 0.25rem;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 2px;
  min-height: 48px;
}

.cell.locked {
  opacity: 0.75;
}

.na {
  text-align: center;
  color: var(--line);
}

.toggle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  column-gap: 0.4rem;
  row-gap: 0;
  line-height: 1.2;
  min-height: 44px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--night-deep);
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  font-size: var(--step--1);
}

.toggle:hover:not(:disabled) {
  border-color: var(--frost);
}

.toggle:disabled {
  cursor: not-allowed;
}

.toggle > span {
  white-space: nowrap;
}

.kw-tag {
  font-weight: 700;
}

.bulb-icon {
  width: 10px;
  height: 13px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: #4a5670;
}

.toggle.is-on .bulb-icon {
  background: var(--lamp);
  box-shadow: 0 0 8px var(--lamp);
}

.toggle.is-off,
.toggle.is-active {
  background: #2a3a5e;
  border-color: var(--frost);
}

.toggle.is-charge {
  background: #3a3220;
  border-color: var(--lamp);
}

.energy {
  font-size: 0.75rem;
  text-align: center;
}

.energy.negative {
  color: var(--holly);
  font-weight: 700;
}

.side {
  position: sticky;
  top: 1rem;
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--radius-panel);
  background: var(--night-deep);
  border: 1px solid var(--line);
}

.side h3 {
  font-size: var(--step-1);
}

.resources {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.resources dt {
  font-weight: 700;
}

.resources dd {
  margin: 0;
  font-size: var(--step--1);
}

.resources .bad dt::after {
  content: ' (klopt niet)';
  color: var(--holly);
}

.issues ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.4rem;
  font-size: var(--step--1);
  color: #ffd2d8;
}

.ok {
  color: var(--pine);
  font-weight: 700;
}

.ok::before {
  content: '✓ ';
}

.hint {
  font-size: var(--step--1);
}

.error {
  border: 1px solid var(--holly);
  background: var(--holly-soft);
  border-radius: var(--radius-control);
  padding: 0.5rem 0.75rem;
  font-size: var(--step--1);
}

.play {
  width: 100%;
}

@media (max-width: 1100px) {
  .planning {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
  }
}

@media (max-width: 760px) {
  .board {
    overflow-x: auto;
    grid-template-columns: 9rem repeat(6, 7rem);
  }
}
</style>
