<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import type { Scene } from '../domain/scene';
import { CAPACITY_KW } from '../domain/scenario';
import VillageMap from './VillageMap.vue';
import LocationDetail from './LocationDetail.vue';
import { LOCATIONS } from '../ui/locations';
import type { AssetId } from '../domain/types';
const props = defineProps<{ blockLabel: string; durationMs?: number; scene?: Scene; loadKw?: number; previousLoadKw?: number }>();
const selected = ref<AssetId>();
const emit = defineEmits<{ done: [] }>();

let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  timer = setTimeout(() => emit('done'), props.durationMs ?? 3000);
});

onBeforeUnmount(() => clearTimeout(timer));

function skip(): void {
  clearTimeout(timer);
  emit('done');
}
</script>

<template>
  <section class="running" aria-live="polite">
    <div class="string" aria-hidden="true">
      <span v-for="n in 12" :key="n" class="light" :style="{ animationDelay: `${n * 90}ms` }" />
    </div>
    <p class="eyebrow">Kerstavond loopt</p><h2>{{ blockLabel }}</h2>
    <p class="muted">De schakelaars gaan om. De redactie van de Gridmas Courant belt de buurt na.</p>
    <div v-if="loadKw !== undefined" class="live-load" role="status">
      <div><span class="muted">Netbelasting</span><strong>{{ loadKw }} <small>kW</small></strong><span>{{ loadKw <= CAPACITY_KW ? 'Binnen de netcapaciteit' : 'Net overbelast' }} · limiet {{ CAPACITY_KW }} kW</span></div>
      <div class="load-track"><span :style="{ '--from': `${(previousLoadKw ?? loadKw) / CAPACITY_KW * 100}%`, '--to': `${loadKw / CAPACITY_KW * 100}%` }" /></div>
    </div>
    <VillageMap v-if="scene" :scene="scene" :selected="selected" @select="selected = $event" />
    <LocationDetail v-if="scene && selected" :location="LOCATIONS.find(l => l.id === selected)!" :scene="scene" :block-label="blockLabel" />
    <button type="button" class="btn" @click="skip">Direct naar het nieuws</button>
  </section>
</template>

<style scoped>
.live-load { padding: 1rem 1.5rem; border: 1px solid var(--line); border-radius: 12px; text-align: left; width: min(100%, 650px); }
.live-load > div:first-child { display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
.live-load strong { font-family: var(--font-display); font-size: 2rem; color: var(--pine); }
.live-load small { font-size: 1rem; }
.live-load span { font-size: .875rem; }
.load-track { margin-top: .7rem; height: 8px; overflow: hidden; background: #ffffff12; border-radius: 6px; }
.load-track > span { display: block; background: var(--pine); height: 100%; width: var(--to); animation: load .8s ease-out; }
@keyframes load { from { width: var(--from); } to { width: var(--to); } }
.running > .village-map { width: 100%; max-width: 1000px; text-align: left; }

.running {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 1.5rem 0;
  text-align: center;
}

h2 {
  font-size: var(--step-3);
}

.string {
  display: flex;
  gap: 1.4rem;
}

.light {
  width: 16px;
  height: 22px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: #4a5670;
  animation: glow 1.4s ease-in-out both;
}

@keyframes glow {
  to {
    background: var(--lamp);
    box-shadow: 0 0 16px var(--lamp);
  }
}
</style>
