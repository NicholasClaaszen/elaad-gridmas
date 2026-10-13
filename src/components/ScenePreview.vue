<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Scene } from '../domain/scene';
import { BLOCKS } from '../domain/scenario';
import type { AssetId } from '../domain/types';
import { LOCATIONS } from '../ui/locations';
import VillageMap from './VillageMap.vue';
import LocationDetail from './LocationDetail.vue';
const props = defineProps<{ scene: Scene }>();
const selected = ref<AssetId>();
const location = computed(() => LOCATIONS.find(l => l.id === selected.value));
const blockLabel = computed(() => BLOCKS[props.scene.blockIndex]?.label);
</script>

<template>
  <section class="live-village" aria-label="Uitgevoerde toestand van Gridmas">
    <header><p class="eyebrow">Zo staat het dorp erbij</p><h3>{{ blockLabel ?? 'De avond moet nog beginnen' }}</h3><p class="muted">{{ blockLabel ? 'Vastgelegd na dit blok' : 'Alle locaties klaar voor kerstavond' }}</p></header>
    <VillageMap :scene="scene" :selected="selected" @select="selected = selected === $event ? undefined : $event" />
    <LocationDetail v-if="location" :location="location" :scene="scene" :block-label="blockLabel" />
  </section>
</template>

<style scoped>
.live-village { display: grid; gap: 1rem; padding: 1.25rem; background: var(--night-deep); border: 1px solid var(--line); border-radius: 14px; }
header { display: grid; gap: .3rem; }
header p.muted { font-size: .75rem; }
</style>
