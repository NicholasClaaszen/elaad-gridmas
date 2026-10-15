<script setup lang="ts">
import { BATTERY, BLOCKS, CAPACITY_KW, CHARGERS, RINK } from '../domain/scenario';
import type { AssetId } from '../domain/types';
import { LOCATIONS, availableInBlock, type Location } from '../ui/locations';
import LocationIllustration from './LocationIllustration.vue';

defineEmits<{ close: [] }>();

/** Twee A4-vellen met elk vier A6-kaarten: eerst de doelkaart, dan de zeven locaties. */
const cards: (Location | 'goal')[] = ['goal', ...LOCATIONS];
const sheets = [cards.slice(0, 4), cards.slice(4, 8)];

const HOURS = ['14', '16', '18', '20', '22', '00'];

function accent(id: AssetId): string {
  if (id === 'rink') return 'ice';
  if (id === 'chargers') return 'charge';
  if (id === 'battery') return 'battery';
  return 'lights';
}

function cellLabel(id: AssetId, index: number): string {
  if (!availableInBlock(id, index)) return '–';
  if (id === 'chargers') return CHARGERS.extraBlocks.includes(index) ? 'extra' : 'pauze';
  if (id === 'rink') return 'dicht';
  if (id === 'battery') return 'inzet';
  return 'uit';
}

function stamp(id: AssetId): string | null {
  if (id === 'rink') return `max ${RINK.maxUses}×`;
  if (id === 'battery') return `max ${BATTERY.maxUses}×`;
  if (id === 'chargers') return `max ${CHARGERS.maxPauses} pauzes`;
  return null;
}

const bulbs = ['#d65b55', '#39a678', '#e9b65c', '#5a8fd6', '#d65b55', '#39a678', '#e9b65c', '#5a8fd6', '#d65b55'];

function print(): void {
  window.print();
}
</script>

<template>
  <div class="print-view">
    <div class="toolbar">
      <div>
        <h2>Locatiekaarten</h2>
        <p>Acht kaarten op A6: print op A4, staand, zonder schaal (100%) en met achtergrondafbeeldingen aan. Knip langs de stippellijnen.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="print">Printen</button>
      <button type="button" class="btn btn-quiet" @click="$emit('close')">Terug naar het spel</button>
    </div>

    <section v-for="(sheet, s) in sheets" :key="s" class="sheet" :aria-label="`Vel ${s + 1}`">
      <article
        v-for="card in sheet"
        :key="card === 'goal' ? 'goal' : card.id"
        class="print-card"
        :class="card === 'goal' ? 'goal' : accent(card.id)"
        :data-location="card === 'goal' ? undefined : card.id"
      >
        <svg class="garland" viewBox="0 0 300 26" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 4 Q37 22 75 8 T150 8 T225 8 T300 4" fill="none" stroke="#2c3e50" stroke-width="1.2" />
          <g v-for="(color, b) in bulbs" :key="b" :transform="`translate(${18 + b * 33} ${b % 2 ? 11 : 14})`">
            <rect x="-2" y="-3" width="4" height="3" fill="#2c3e50" />
            <ellipse cx="0" cy="4" rx="3.6" ry="5" :fill="color" />
          </g>
        </svg>

        <template v-if="card === 'goal'">
          <p class="eyebrow">Missie voor vanavond</p>
          <h3>Houd Gridmas onder {{ CAPACITY_KW }} kW</h3>
          <div class="goal-badge"><strong>{{ CAPACITY_KW }}</strong><span>kW</span><small>netcapaciteit</small></div>
          <p class="story">Het net van Gridmas kan maximaal {{ CAPACITY_KW }} kW aan. Zonder ingreep gaat het om 16:00 al mis. Kies per blok wat even kan wachten, zodat het licht overal blijft branden.</p>
          <ol class="blocks">
            <li v-for="block in BLOCKS" :key="block.index"><span>{{ block.label }}</span><span>{{ block.phase }}</span></li>
          </ol>
          <div class="message-box">
            <strong>Bericht aan het dorp</strong>
            <p>Om 14:00 mag je één bericht sturen: <em>Laad alvast op</em> of <em>Aankondiging</em>. Of je zegt niets.</p>
          </div>
          <p class="tip">Na elk blok lees je het dorpsnieuws. Daarna mag je de rest van de avond bijsturen.</p>
        </template>

        <template v-else>
          <div class="card-head">
            <div>
              <p class="eyebrow">{{ card.type }}</p>
              <h3>{{ card.name }}</h3>
            </div>
            <div class="kw"><strong>{{ card.powerKw }}</strong><span>kW</span></div>
          </div>
          <div class="porthole">
            <span class="stars" aria-hidden="true">✦ · ✧ · ✦</span>
            <LocationIllustration :id="card.id" :active="true" :battery-percent="100" />
            <span v-if="stamp(card.id)" class="stamp">{{ stamp(card.id) }}</span>
          </div>
          <p class="story">{{ card.story }}</p>
          <p class="activity"><strong>Vanavond:</strong> {{ card.activity }}</p>
          <ul class="rules"><li v-for="rule in card.rules" :key="rule">{{ rule }}</li></ul>
          <ol class="strip" :aria-label="`Wanneer ${card.shortName} kan helpen`">
            <li v-for="(hour, i) in HOURS" :key="hour" :class="{ usable: availableInBlock(card.id, i) }">
              <span class="hour">{{ hour }}</span><span class="what">{{ cellLabel(card.id, i) }}</span>
            </li>
          </ol>
        </template>

        <footer>Merry Gridmas <span aria-hidden="true">✦</span> Keep the lights on!</footer>
      </article>
    </section>
  </div>
</template>

<style>
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  body * { visibility: hidden; }
  .print-view, .print-view * { visibility: visible; }
  .print-view { position: absolute; inset: 0 auto auto 0; }
}
</style>

<style scoped>
.print-view { display: grid; justify-items: center; gap: 1.5rem; padding-bottom: 2rem; }
.toolbar { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; width: 210mm; max-width: 100%; }
.toolbar div { flex: 1 1 18rem; }
.toolbar h2 { font-size: var(--step-2); }
.toolbar p { font-size: var(--step--1); color: var(--snow-muted); }

.sheet {
  width: 210mm; height: 297mm; display: grid; grid-template-columns: repeat(2, 105mm); grid-template-rows: repeat(2, 148.5mm);
  background: #fff; box-shadow: 0 6px 30px #0006; overflow: hidden;
  print-color-adjust: exact; -webkit-print-color-adjust: exact;
}

.print-card {
  --accent: #d65b55; --accent-soft: #fbe7e5;
  position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 2mm;
  padding: 7mm 7mm 5mm; color: #1d2b3a; background: #fffdf8;
  border: .3mm dashed #b9c2cc; font-family: var(--font-body); font-size: 9pt; line-height: 1.35;
}
.print-card.lights { --accent: #d65b55; --accent-soft: #fbe7e5; }
.print-card.ice { --accent: #3f8fb5; --accent-soft: #e2f1f7; }
.print-card.charge { --accent: #2f9467; --accent-soft: #e1f3ea; }
.print-card.battery { --accent: #c8901f; --accent-soft: #fbf0d9; }
.print-card.goal { --accent: #1d3a52; --accent-soft: #e6edf3; }
.print-card::before { content: ''; position: absolute; top: -9mm; right: -9mm; width: 24mm; height: 24mm; transform: rotate(45deg); background: var(--accent); opacity: .9; }

.garland { position: absolute; top: 0; left: 0; width: 100%; height: 6mm; }

.eyebrow { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .14em; color: var(--accent); font-weight: 700; margin-top: 2mm; }
h3 { font-family: var(--font-display); font-size: 14pt; line-height: 1.1; color: #10202f; }

.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 3mm; }
.kw { flex-shrink: 0; width: 15mm; height: 15mm; margin-top: 3mm; border-radius: 50%; display: grid; place-content: center; text-align: center; background: var(--accent); color: #fff; border: .6mm solid #fff; box-shadow: 0 0 0 .4mm var(--accent); position: relative; z-index: 1; }
.kw strong { font-family: var(--font-display); font-size: 13pt; line-height: 1; }
.kw span { font-size: 6.5pt; }

.porthole { position: relative; height: 31mm; border-radius: 4mm; background: radial-gradient(ellipse at 50% 120%, #2a4a5c, #101d2d 70%); display: grid; place-items: center; padding: 1mm 8mm 0; }
.porthole :deep(svg) { height: 28mm; width: auto; max-height: none; }
.stars { position: absolute; top: 1.5mm; left: 3mm; color: #e9b65c; font-size: 7pt; letter-spacing: .1em; }
.stamp { position: absolute; right: 2mm; bottom: 2mm; transform: rotate(-8deg); border: .5mm solid #fff; color: #fff; background: var(--accent); border-radius: 1.5mm; padding: .4mm 1.6mm; font-family: var(--font-display); font-weight: 800; font-size: 7.5pt; text-transform: uppercase; }

.story { color: #34475a; }
.activity { background: var(--accent-soft); border-left: .8mm solid var(--accent); padding: 1.2mm 2mm; }
.rules { list-style: none; padding: 0; margin: 0; display: grid; gap: .6mm; }
.rules li { padding-left: 3.5mm; position: relative; }
.rules li::before { content: '✦'; position: absolute; left: 0; color: var(--accent); }

.strip { list-style: none; padding: 0; margin: auto 0 0; display: grid; grid-template-columns: repeat(6, 1fr); gap: .8mm; }
.strip li { display: grid; text-align: center; border-radius: 1.2mm; padding: .8mm 0; background: #eef1f4; color: #9aa6b2; }
.strip li.usable { background: var(--accent); color: #fff; }
.strip .hour { font-family: var(--font-display); font-weight: 700; font-size: 8pt; }
.strip .what { font-size: 6pt; }

.goal-badge { align-self: center; width: 30mm; height: 30mm; border-radius: 50%; display: grid; place-content: center; text-align: center; background: #10202f; color: #f6c973; border: 1mm solid #f6c973; box-shadow: 0 0 0 .6mm #10202f; }
.goal-badge strong { font-family: var(--font-display); font-size: 22pt; line-height: 1; }
.goal-badge span { font-size: 9pt; font-weight: 700; }
.goal-badge small { font-size: 5.5pt; color: #f5f2e9; text-transform: uppercase; letter-spacing: .1em; }
.blocks { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: .8mm 2mm; }
.blocks li { display: grid; padding: .8mm 1.5mm; border-radius: 1.2mm; background: var(--accent-soft); }
.blocks li span:first-child { font-family: var(--font-display); font-weight: 700; }
.blocks li span:last-child { font-size: 6.5pt; color: #5a6b7c; }
.message-box { border: .4mm solid #d65b55; border-radius: 2mm; padding: 1.5mm 2mm; background: #fbe7e5; }
.message-box p { margin: .5mm 0 0; }
.tip { color: #5a6b7c; font-style: italic; }

footer { margin-top: 1mm; padding-top: 1.5mm; border-top: .3mm solid #e3e7ec; font-size: 6pt; letter-spacing: .12em; text-transform: uppercase; color: #8c99a6; text-align: center; }
.goal footer { margin-top: auto; }

@media print {
  .print-view { padding: 0; gap: 0; }
  .toolbar { display: none; }
  .sheet { box-shadow: none; break-after: page; }
}
</style>
