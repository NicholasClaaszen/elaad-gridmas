<script setup lang="ts">
import { computed, ref } from 'vue';
import { batteryRemainingAfterEachBlock, calculateLoads, chargingNetKwh } from '../domain/calculateLoad';
import { BATTERY, BLOCKS, CAPACITY_KW, CHARGERS, DECORATIONS, DECORATION_BLOCKS, RINK } from '../domain/scenario';
import type { AssetId, BlockAction, DecorationId, Schedule } from '../domain/types';
import { validateSchedule } from '../domain/validateSchedule';
import LoadChart from './LoadChart.vue';
import VillageView from './VillageView.vue';
import LocationDetail from './LocationDetail.vue';
import { availableInBlock, LOCATIONS, projectPlanningScene } from '../ui/locations';

/*
 * Bewust alleen technische data als invoer: deze component krijgt nooit moraal- of strafinformatie.
 */
const props = defineProps<{
  selectedBlock?: number;
  schedule: Schedule;
  executedActions: BlockAction[];
  error?: string | null;
}>();

const emit = defineEmits<{
  selectBlock: [index: number];
  update: [action: BlockAction];
  play: [];
  dismissError: [];
}>();

const selectedAsset = ref<AssetId>('homes');
const selectedIndex = computed(() => props.selectedBlock ?? 0);
const selectedLocation = computed(() => LOCATIONS.find(l => l.id === selectedAsset.value)!);
const selectedAction = computed(() => props.schedule[selectedIndex.value]!);
const selectedScene = computed(() => projectPlanningScene(selectedAction.value, battery.value[selectedIndex.value]!, loads.value[selectedIndex.value]!));
const restriction = computed(() => {
  const id = selectedAsset.value;
  const a = selectedAction.value;
  if (isLocked(selectedIndex.value)) return 'Dit blok is gespeeld. De keuzes liggen vast.';
  if (!availableInBlock(id, selectedIndex.value)) return 'Deze maatregel is in dit blok niet beschikbaar.';
  if (id === 'rink' && !a.rinkPaused && props.schedule.filter(b => b.rinkPaused).length >= RINK.maxUses) return 'De ijsbaan kan maar één keer dicht. Maak eerst het andere geplande blok vrij.';
  if (id === 'battery' && !a.batteryDischarge && batteryBlocks.value >= BATTERY.maxUses) return 'De batterij is al volledig ingepland. Maak eerst een ander gepland batterijblok vrij.';
  if (id === 'chargers' && CHARGERS.pauseBlocks.includes(selectedIndex.value) && !a.chargersPaused && pauses.value >= CHARGERS.maxPauses) return 'Er zijn al twee laadpauzes gepland. Haal eerst een andere geplande pauze weg.';
  return '';
});

function toggleSelected(): void {
  if (restriction.value) return;
  const i = selectedIndex.value;
  const a = selectedAction.value;
  const id = selectedAsset.value;
  if (id === 'rink') patch(i, { rinkPaused: !a.rinkPaused });
  else if (id === 'battery') patch(i, { batteryDischarge: !a.batteryDischarge });
  else if (id === 'chargers') patch(i, CHARGERS.extraBlocks.includes(i) ? { extraCharging: !a.extraCharging } : { chargersPaused: !a.chargersPaused });
  else toggleDecoration(i, id);
}

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

function patch(i: number, change: Partial<BlockAction>, assetId?: AssetId): void {
  if (isLocked(i)) return;
  if (assetId) selectedAsset.value = assetId;
  emit('selectBlock', i);
  const current = props.schedule[i]!;
  emit('update', { ...current, decorationsOff: [...current.decorationsOff], ...change });
}

function toggleDecoration(i: number, id: DecorationId): void {
  const off = props.schedule[i]!.decorationsOff;
  patch(i, { decorationsOff: off.includes(id) ? off.filter((d) => d !== id) : [...off, id] }, id);
}
</script>

<template>
  <section class="planning" aria-labelledby="planning-title">
    <div class="village-section">
      <div class="village-heading">
        <div><p class="eyebrow">Jullie controlecentrum</p><h2 id="planning-title">Plan de kerstavond</h2><p class="muted">Selecteer een tijdsblok en bekijk een locatie.</p></div>
        <div class="play-control"><span :class="isValid ? 'delta-up' : 'muted'">{{ isValid ? 'Het hele programma klopt' : `${issues.length} punten om op te lossen` }}</span><button type="button" class="btn btn-primary play" :disabled="!isValid" @click="emit('play')">{{ playLabel }}</button></div>
      </div>
      <VillageView :scene="selectedScene" :selected="selectedAsset" @select="selectedAsset = $event" />
      <p class="preview-caption muted">Planningsbeeld · {{ BLOCKS[selectedIndex]!.label }} · batterij na dit blok. Dit is jullie plan; het dorp voert het pas uit als jullie spelen.</p>
    </div>
    <div class="main">
      <header class="intro">
        <h3>Jullie OpenADR-programma</h3>
        <p v-if="isFirstRound" class="muted">
          Houd elk blok op maximaal {{ CAPACITY_KW }} kW. Klik op een tijd bovenaan of schakel direct in het schema.
        </p>
        <p v-else class="muted">
          Gespeelde blokken liggen vast. De rest van de avond kun je nog aanpassen.
        </p>
      </header>


      <div class="board" role="group" aria-label="Planning per tijdsblok">
        <div class="corner" />
        <button
          v-for="block in BLOCKS"
          :key="block.index"
          type="button"
          class="block-head"
          :aria-pressed="selectedIndex === block.index"
          :aria-label="`Selecteer ${block.label}`"
          :class="[columnStatus(block.index), { invalid: blockIssues(block.index).length > 0, selected: selectedIndex === block.index }]"
          @click="emit('selectBlock', block.index)"
        >
          <span class="time">{{ block.label }}</span>
          <span class="phase muted">{{ block.phase }}</span>
          <span class="status">
            <template v-if="columnStatus(block.index) === 'done'">Uitgevoerd</template>
            <template v-else-if="columnStatus(block.index) === 'next'">Volgende</template>
            <template v-else>Gepland</template>
          </span>
        </button>

        <div class="row-label chart-label">
          <span class="name">Netbelasting</span>
          <span class="muted">Limiet 100 kW per blok</span>
        </div>
        <LoadChart class="chart-cell" :loads="loads" :locked-count="lockedCount" />

        <!-- Feestverlichting -->
        <template v-for="decoration in DECORATIONS" :key="decoration.id">
          <button type="button" class="row-label location-row" :class="{ highlighted: selectedAsset === decoration.id }" :data-asset="decoration.id" @click="selectedAsset = decoration.id">
            <span class="name">{{ LOCATIONS.find(l => l.id === decoration.id)!.shortName }}</span>
            <span class="muted">Feestverlichting uit: −{{ decoration.reductionKw }} kW</span>
          </button>
          <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index), highlighted: selectedAsset === decoration.id }">
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
        <button type="button" class="row-label location-row" :class="{ highlighted: selectedAsset === 'rink' }" data-asset="rink" @click="selectedAsset = 'rink'">
          <span class="name">{{ LOCATIONS.find(l => l.id === 'rink')!.shortName }}</span>
          <span class="muted">Eén keer dicht: −{{ RINK.reductionKw }} kW</span>
        </button>
        <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index), highlighted: selectedAsset === 'rink' }">
          <button
            v-if="RINK.allowedBlocks.includes(block.index)"
            type="button"
            class="toggle"
            :class="schedule[block.index]!.rinkPaused ? 'is-active' : 'is-idle'"
            :aria-pressed="schedule[block.index]!.rinkPaused"
            :aria-label="`IJsbaan, ${block.label}: ${schedule[block.index]!.rinkPaused ? 'dicht' : 'open'}`"
            :disabled="isLocked(block.index)"
            @click="patch(block.index, { rinkPaused: !schedule[block.index]!.rinkPaused }, 'rink')"
          >
            <span>{{ schedule[block.index]!.rinkPaused ? 'Dicht' : 'Open' }}</span>
            <span v-if="schedule[block.index]!.rinkPaused" class="kw-tag">−{{ RINK.reductionKw }} kW</span>
          </button>
          <span v-else class="na" aria-label="niet beschikbaar">–</span>
        </div>

        <!-- Laadplein -->
        <button type="button" class="row-label location-row" :class="{ highlighted: selectedAsset === 'chargers' }" data-asset="chargers" @click="selectedAsset = 'chargers'">
          <span class="name">{{ LOCATIONS.find(l => l.id === 'chargers')!.shortName }}</span>
          <span class="muted">Pauze −{{ CHARGERS.pauseKw }} kW, extra laden +{{ CHARGERS.extraKw }} kW</span>
        </button>
        <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index), highlighted: selectedAsset === 'chargers' }">
          <button
            v-if="CHARGERS.pauseBlocks.includes(block.index)"
            type="button"
            class="toggle"
            :class="schedule[block.index]!.chargersPaused ? 'is-active' : 'is-idle'"
            :aria-pressed="schedule[block.index]!.chargersPaused"
            :aria-label="`Laadplein, ${block.label}: ${schedule[block.index]!.chargersPaused ? 'pauze' : 'actief'}`"
            :disabled="isLocked(block.index)"
            @click="patch(block.index, { chargersPaused: !schedule[block.index]!.chargersPaused }, 'chargers')"
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
            @click="patch(block.index, { extraCharging: !schedule[block.index]!.extraCharging }, 'chargers')"
          >
            <span>{{ schedule[block.index]!.extraCharging ? 'Extra laden' : 'Stand-by' }}</span>
            <span v-if="schedule[block.index]!.extraCharging" class="kw-tag">+{{ CHARGERS.extraKw }} kW</span>
          </button>
        </div>

        <!-- Batterij -->
        <button type="button" class="row-label location-row" :class="{ highlighted: selectedAsset === 'battery' }" data-asset="battery" @click="selectedAsset = 'battery'">
          <span class="name">{{ LOCATIONS.find(l => l.id === 'battery')!.shortName }}</span>
          <span class="muted">Ontladen: −{{ BATTERY.dischargeKw }} kW, kost {{ BATTERY.energyPerBlockKwh }} kWh</span>
        </button>
        <div v-for="block in BLOCKS" :key="block.index" class="cell" :class="{ locked: isLocked(block.index), highlighted: selectedAsset === 'battery' }">
          <button
            v-if="BATTERY.allowedBlocks.includes(block.index)"
            type="button"
            class="toggle"
            :class="schedule[block.index]!.batteryDischarge ? 'is-active' : 'is-idle'"
            :aria-pressed="schedule[block.index]!.batteryDischarge"
            :aria-label="`Buurtbatterij, ${block.label}: ${schedule[block.index]!.batteryDischarge ? 'ontladen' : 'stand-by'}`"
            :disabled="isLocked(block.index)"
            @click="patch(block.index, { batteryDischarge: !schedule[block.index]!.batteryDischarge }, 'battery')"
          >
            <span>{{ schedule[block.index]!.batteryDischarge ? 'Ontladen' : 'Stand-by' }}</span>
            <span v-if="schedule[block.index]!.batteryDischarge" class="kw-tag">−{{ BATTERY.dischargeKw }} kW</span>
          </button>
          <span v-else class="na" aria-label="niet beschikbaar">–</span>
          <span class="energy muted" :class="{ negative: battery[block.index]! < 0 }">{{ battery[block.index] }} kWh</span>
        </div>


        <div class="row-label"><span class="name">Zo telt het op</span><span class="muted">Basis − inzet + extra</span></div>
        <div v-for="block in BLOCKS" :key="`sum-${block.index}`" class="load-equation" :class="{ congested: loads[block.index]! > CAPACITY_KW }">
          <span>{{ block.baselineLoadKw }} − {{ block.baselineLoadKw + (schedule[block.index]!.extraCharging ? CHARGERS.extraKw : 0) - loads[block.index]! }} + {{ schedule[block.index]!.extraCharging ? CHARGERS.extraKw : 0 }}</span>
          <strong>= {{ loads[block.index] }} kW</strong>
          <span>{{ loads[block.index]! > CAPACITY_KW ? `${loads[block.index]! - CAPACITY_KW} kW te veel` : 'Binnen de limiet' }}</span>
        </div>
      </div>
    </div>

    <aside class="side" aria-label="Controle van het programma">
      <LocationDetail :location="selectedLocation" :scene="selectedScene" editable :battery-discharging="selectedAction.batteryDischarge" :block-label="BLOCKS[selectedIndex]!.label" :restriction="restriction" @toggle="toggleSelected" />
      <div class="side-divider" />
      <details v-if="isFirstRound" class="guide">
        <summary>Tip: begin met het laadplein</summary>
        <p>
          Om 14:00 is er ruimte om alvast extra te laden. Dat geeft ruimte voor een laadpauze later.
          Inhalen kan ook na middernacht. Plan voor elke pauze één extra laadsessie.
        </p>
        <p>
          Na elk gespeeld blok lees je in het nieuwsbulletin hoe Gridmas op jullie keuzes reageerde.
        </p>
      </details>
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
            <template v-if="rinkBlock < 0">Nog niet ingepland (één keer mogelijk)</template>
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
        <p v-if="isValid" class="ok">Het plan klopt. Gridmas kan beginnen.</p>
        <ul v-else>
          <li v-for="(issue, n) in issues" :key="n">{{ issue.message }}</li>
        </ul>
        <p v-if="globalIssues.length === 0 && !isValid" class="muted hint">In de rode blokken vraagt het dorp nog te veel stroom.</p>
      </div>

      <div v-if="error" class="error" role="alert">
        <p>{{ error }}</p>
        <button type="button" class="btn btn-quiet" @click="emit('dismissError')">Sluiten</button>
      </div>


    </aside>
  </section>
</template>

<style scoped>
.village-section { grid-column: 1 / -1; }
.village-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.village-heading h2 { font-size: 1.8rem; }
.village-heading p.muted, .preview-caption { font-size: .8rem; }
.preview-caption { margin-top: .6rem; }
.play-control { display: grid; justify-items: end; gap: .4rem; flex-shrink: 0; font-size: .8rem; }
.location-row { text-align: left; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; color: inherit; }
.location-row:hover { background: #ffffff08; }
.highlighted { background: #e9b65c0b; border-color: #e9b65c55; }
.block-head { cursor: pointer; color: inherit; text-align: left; border: 1px solid var(--line); }
.block-head.selected { box-shadow: inset 0 0 0 1px var(--lamp); border-color: var(--lamp); }
.load-equation { display: grid; gap: .1rem; padding: .5rem .15rem; border-top: 1px solid var(--line); text-align: center; font-size: .7rem; color: var(--snow-muted); }
.load-equation strong { font-size: 1rem; color: var(--pine); }
.load-equation.congested strong { color: var(--holly); }
.side-divider { border-top: 1px solid var(--line); }
@media (max-width: 700px) { .village-heading { align-items: stretch; flex-direction: column; } .play-control { justify-items: stretch; } }

.planning {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 1.5rem;
  align-items: start;
}

.intro {
  margin-bottom: 0.75rem;
}

.intro h3 {
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

.guide summary {
  font-size: var(--step-0);
}

.board {
  --board-gap: 6px;
  display: grid;
  grid-template-columns: 10rem repeat(6, minmax(0, 1fr));
  gap: var(--board-gap);
}

.block-head {
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0.3rem;
  border-radius: var(--radius-control);
  border-top: 3px solid var(--line);
  line-height: 1.3;
  background: var(--night-deep);
}

.block-head .time {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .875rem;
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

@media (max-width: 900px) {
  .board {
    overflow-x: auto;
    grid-template-columns: 9rem repeat(6, 7rem);
  }
}
</style>
