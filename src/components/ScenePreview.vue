<script setup lang="ts">
import { computed } from 'vue';
import type { Scene } from '../domain/scene';
import { BLOCKS } from '../domain/scenario';

const props = defineProps<{
  scene: Scene;
  adapterName: string;
}>();

const blockLabel = computed(() => BLOCKS[props.scene.blockIndex]?.label ?? 'Nog niet begonnen');

const chargerText = computed(
  () => ({ charging: 'laadt normaal', paused: 'gepauzeerd', 'extra-charging': 'extra laden' })[props.scene.chargers],
);

const description = computed(() => {
  const z = props.scene.zoneLightsOn;
  const onOff = (on: boolean) => (on ? 'aan' : 'uit');
  return [
    `Miniatuur na ${blockLabel.value}.`,
    `Woonwijk ${onOff(z.homes)}, De Gouden Ster ${onOff(z.seniors)}, ziekenhuis ${onOff(z.hospital)}, dorpsplein ${onOff(z.square)}.`,
    `IJsbaan ${props.scene.rinkOpen ? 'open' : 'dicht'}, laadplein ${chargerText.value}, batterij ${props.scene.batteryPercent}%.`,
  ].join(' ');
});

/** Lampjes langs een lijn, voor de lichtsnoeren in de miniatuur. */
function lights(x1: number, y1: number, x2: number, y2: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t + (i % 2 ? 2 : 0) };
  });
}
</script>

<template>
  <figure class="preview">
    <figcaption>
      <span class="title">Miniatuur Gridmas</span>
      <span class="muted">{{ blockLabel }}, {{ adapterName }}</span>
    </figcaption>
    <svg viewBox="0 0 320 190" role="img" :aria-label="description">
      <!-- sneeuw -->
      <rect x="0" y="150" width="320" height="40" fill="#e6edf6" opacity="0.12" />

      <!-- Woonwijk -->
      <g>
        <polygon v-for="x in [8, 36]" :key="x" :points="`${x},120 ${x + 13},104 ${x + 26},120`" fill="#2a3d63" />
        <rect v-for="x in [8, 36]" :key="`h${x}`" :x="x + 2" y="120" width="22" height="30" fill="#24365a" />
        <circle
          v-for="(p, i) in lights(8, 121, 62, 121, 8)"
          :key="`hl${i}`"
          :cx="p.x" :cy="p.y" r="2.4"
          :class="scene.zoneLightsOn.homes ? 'lit' : 'unlit'"
        />
        <text x="35" y="166" class="label">Wijk</text>
      </g>

      <!-- De Gouden Ster -->
      <g>
        <rect x="80" y="92" width="44" height="58" fill="#24365a" />
        <polygon points="102,72 105,80 113,80 106,85 109,93 102,88 95,93 98,85 91,80 99,80"
          :class="scene.zoneLightsOn.seniors ? 'lit' : 'unlit'" />
        <circle
          v-for="(p, i) in lights(80, 94, 124, 94, 7)"
          :key="`sl${i}`"
          :cx="p.x" :cy="p.y" r="2.4"
          :class="scene.zoneLightsOn.seniors ? 'lit' : 'unlit'"
        />
        <text x="98" y="166" class="label">Gouden Ster</text>
      </g>

      <!-- Ziekenhuis: alleen de feestverlichting schakelt -->
      <g>
        <rect x="140" y="100" width="44" height="50" fill="#24365a" />
        <rect x="158" y="106" width="8" height="20" fill="#eef2f7" opacity="0.8" />
        <rect x="152" y="112" width="20" height="8" fill="#eef2f7" opacity="0.8" />
        <circle
          v-for="(p, i) in lights(140, 140, 184, 140, 7)"
          :key="`zl${i}`"
          :cx="p.x" :cy="p.y" r="2.4"
          :class="scene.zoneLightsOn.hospital ? 'lit' : 'unlit'"
        />
        <text x="166" y="166" class="label">Ziekenhuis</text>
      </g>

      <!-- Dorpsplein met grote boom -->
      <g>
        <polygon points="228,62 252,150 204,150" fill="#1f5a43" />
        <circle
          v-for="(p, i) in [...lights(218, 100, 238, 96, 4), ...lights(212, 122, 244, 118, 5), ...lights(208, 142, 248, 138, 6)]"
          :key="`pl${i}`"
          :cx="p.x" :cy="p.y" r="2.6"
          :class="scene.zoneLightsOn.square ? 'lit' : 'unlit'"
        />
        <text x="228" y="166" class="label">Plein</text>
      </g>

      <!-- IJsbaan -->
      <g>
        <ellipse cx="286" cy="138" rx="30" ry="11" :fill="scene.rinkOpen ? '#9dd3f0' : '#4a5670'" opacity="0.8" />
        <text x="286" y="141" class="tiny">{{ scene.rinkOpen ? 'open' : 'dicht' }}</text>
        <text x="286" y="166" class="label">IJsbaan</text>
      </g>

      <!-- Laadplein -->
      <g>
        <rect v-for="x in [262, 278, 294]" :key="x" :x="x" y="50" width="10" height="22" rx="2" fill="#2a3d63" />
        <circle
          v-for="x in [267, 283, 299]"
          :key="`c${x}`"
          :cx="x" cy="56" r="3"
          :class="scene.chargers === 'paused' ? 'unlit' : scene.chargers === 'extra-charging' ? 'lit' : 'green'"
        />
        <text x="283" y="84" class="label">Laadplein</text>
        <text x="283" y="96" class="label">{{ chargerText }}</text>
      </g>

      <!-- Batterij -->
      <g>
        <rect x="14" y="40" width="54" height="26" rx="3" fill="none" stroke="#9db8d9" stroke-width="2" />
        <rect x="68" y="47" width="4" height="12" fill="#9db8d9" />
        <rect x="17" y="43" :width="48 * (scene.batteryPercent / 100)" height="20" fill="#3fa977" />
        <text x="43" y="82" class="label">Batterij {{ scene.batteryPercent }}%</text>
      </g>

      <!-- Netstatus -->
      <text x="160" y="30" class="status" :class="scene.netStatus">
        {{ scene.netStatus === 'safe' ? 'Net veilig' : 'Net overbelast' }}
      </text>
    </svg>
  </figure>
</template>

<style scoped>
.preview {
  margin: 0;
  padding: 0.9rem;
  border-radius: var(--radius-panel);
  background: var(--night-deep);
  border: 1px solid var(--line);
}

figcaption {
  display: flex;
  flex-direction: column;
  font-size: var(--step--1);
  margin-bottom: 0.4rem;
}

.title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--step-0);
}

svg {
  width: 100%;
  height: auto;
  display: block;
}

.lit {
  fill: var(--lamp);
  filter: drop-shadow(0 0 3px var(--lamp));
  transition: fill 0.4s;
}

.unlit {
  fill: #4a5670;
  transition: fill 0.4s;
}

.green {
  fill: var(--pine);
}

.label {
  fill: var(--snow-muted);
  font-size: 10px;
  text-anchor: middle;
}

.tiny {
  fill: var(--night-deep);
  font-size: 10px;
  text-anchor: middle;
  font-weight: 700;
}

.status {
  font-size: 14px;
  text-anchor: middle;
  font-weight: 700;
}

.status.safe {
  fill: var(--pine);
}

.status.overload {
  fill: var(--holly);
}
</style>
