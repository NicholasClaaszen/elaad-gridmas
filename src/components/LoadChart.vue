<script setup lang="ts">
import { computed } from 'vue';
import { BLOCKS, CAPACITY_KW } from '../domain/scenario';

const props = defineProps<{
  loads: number[];
  lockedCount: number;
}>();

/** Schaal van de grafiek; ruim boven de hoogste basisbelasting (155 kW). */
const SCALE_KW = 170;
const BAR_AREA_PX = 115;
const pct = (kw: number) => `${(Math.max(0, kw) / SCALE_KW) * 100}%`;
const wireBottom = `${(CAPACITY_KW / SCALE_KW) * BAR_AREA_PX}px`;

const columns = computed(() =>
  BLOCKS.map((block, i) => {
    const load = props.loads[i] ?? block.baselineLoadKw;
    return {
      block,
      load,
      over: load > CAPACITY_KW,
      excess: load - CAPACITY_KW,
      locked: i < props.lockedCount,
    };
  }),
);

const summary = computed(() =>
  columns.value
    .map((c) => `${c.block.label}: ${c.load} kW${c.over ? `, ${c.excess} kW te veel` : ''}`)
    .join('; '),
);
</script>

<template>
  <figure class="chart" :aria-label="`Netbelasting per tijdsblok, limiet ${CAPACITY_KW} kW. ${summary}`">
    <div class="plot">
      <div v-for="c in columns" :key="c.block.index" class="col" :class="{ locked: c.locked, over: c.over }">
        <div class="numbers">
          <p class="value">
            <span class="kw">{{ c.load }}</span><span class="unit"> kW</span>
          </p>
          <p v-if="c.over" class="excess">{{ c.excess }} kW te veel</p>
          <p v-else class="headroom muted">{{ CAPACITY_KW - c.load }} kW ruimte</p>
        </div>
        <div class="bars" :style="{ height: `${BAR_AREA_PX}px` }" aria-hidden="true">
          <div class="baseline" :style="{ height: pct(c.block.baselineLoadKw) }" />
          <div class="bar" :style="{ height: pct(Math.min(c.load, CAPACITY_KW)) }" />
          <div
            v-if="c.over"
            class="bar bar-over"
            :style="{ bottom: pct(CAPACITY_KW), height: pct(c.excess) }"
          />
        </div>
      </div>

      <div class="garland" :style="{ bottom: wireBottom }" aria-hidden="true">
        <svg viewBox="0 0 600 24" preserveAspectRatio="none">
          <path
            v-for="c in columns"
            :key="c.block.index"
            :d="`M ${c.block.index * 100} 3 Q ${c.block.index * 100 + 50} 21 ${(c.block.index + 1) * 100} 3`"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <span
          v-for="c in columns"
          :key="c.block.index"
          class="bulb"
          :class="{ off: c.over }"
          :style="{ left: `${((c.block.index + 0.5) / columns.length) * 100}%` }"
        />
        <span class="limit-label">limiet {{ CAPACITY_KW }} kW</span>
      </div>
    </div>
    <figcaption class="legend muted">
      <span><i class="swatch swatch-baseline" /> verwachte basisbelasting</span>
      <span><i class="swatch swatch-bar" /> belasting met jullie plan</span>
      <span><i class="swatch swatch-over" /> boven de limiet</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
}

.plot {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--board-gap, 6px);
  align-items: end;
}

.col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.numbers {
  text-align: center;
  min-height: 3.6rem;
}

.value {
  font-family: var(--font-display);
  line-height: 1;
  position: relative;
  z-index: 2;
}

.kw {
  font-size: var(--step-3);
  font-weight: 700;
}

.unit {
  font-size: var(--step--1);
  color: var(--snow-muted);
}

.over .kw {
  color: var(--holly);
}

.excess,
.headroom {
  font-size: var(--step--1);
  position: relative;
  z-index: 2;
}

.excess {
  color: var(--holly);
  font-weight: 700;
}

.bars {
  position: relative;
  width: 100%;
}

.baseline,
.bar {
  position: absolute;
  bottom: 0;
  left: 22%;
  right: 22%;
  border-radius: 4px 4px 0 0;
}

.baseline {
  border: 1px dashed var(--frost);
  opacity: 0.45;
}

.bar {
  background: linear-gradient(to top, #2c6f55, var(--pine));
  opacity: 0.85;
  transition: height .25s ease, bottom .25s ease;
}

.bar-over {
  border-radius: 4px 4px 0 0;
  background: repeating-linear-gradient(45deg, var(--holly) 0 6px, #a8293b 6px 12px);
  opacity: 1;
}

.locked .bar {
  background: linear-gradient(to top, #3e5378, #6c86ad);
}

.garland {
  position: absolute;
  left: 0;
  right: 0;
  height: 24px;
  transform: translateY(50%);
  z-index: 1;
  pointer-events: none;
}

.garland svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.garland path {
  fill: none;
  stroke: var(--frost);
  stroke-width: 2;
}

.bulb {
  position: absolute;
  top: 8px;
  width: 12px;
  height: 16px;
  margin-left: -6px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: var(--lamp);
  box-shadow: 0 0 12px var(--lamp), 0 0 2px #fff inset;
}

.bulb.off {
  background: #4a5670;
  box-shadow: none;
}

.limit-label {
  position: absolute;
  right: 0;
  top: -1.2rem;
  font-size: var(--step--1);
  color: var(--frost);
}

.legend {
  display: flex;
  gap: .4rem 1rem;
  flex-wrap: wrap;
  font-size: .75rem;
  margin-top: 0.5rem;
}

.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  vertical-align: -1px;
  border-radius: 2px;
}

.swatch-baseline {
  border: 1px dashed var(--frost);
}

.swatch-bar {
  background: var(--pine);
}

.swatch-over {
  background: repeating-linear-gradient(45deg, var(--holly) 0 3px, #a8293b 3px 6px);
}
</style>
