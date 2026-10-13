<script setup lang="ts">
import { MAX_MORALE } from '../domain/scenario';
defineProps<{ value: number; before?: number }>();
</script>

<template>
  <div class="morale-meter">
    <div class="meter-label"><span>{{ before === undefined ? 'Kerstmoraal' : `Van ${before} naar ${value}` }}</span><strong>{{ value }} / {{ MAX_MORALE }}</strong></div>
    <div class="track" role="meter" aria-label="Kerstmoraal" :aria-valuenow="value" :aria-valuemin="0" :aria-valuemax="MAX_MORALE">
      <span class="fill" :style="{ '--score': `${value / MAX_MORALE * 100}%` }" />
      <span v-if="before !== undefined" class="previous" :style="{ left: `${before / MAX_MORALE * 100}%` }" aria-hidden="true" />
    </div>
    <p v-if="before !== undefined" class="muted">Het streepje geeft de vorige stand aan.</p>
  </div>
</template>

<style scoped>
.morale-meter { display: grid; gap: .4rem; width: 100%; }
.meter-label { display: flex; justify-content: space-between; gap: 1rem; font-size: .875rem; }
.track { height: 12px; border-radius: 8px; background: #ffffff12; position: relative; }
.fill { display: block; height: 100%; width: var(--score); border-radius: 8px; background: var(--lamp); animation: reveal .65s ease-out; }
.previous { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--snow); }
p { font-size: .75rem; }
@keyframes reveal { from { width: 0; } to { width: var(--score); } }
</style>
