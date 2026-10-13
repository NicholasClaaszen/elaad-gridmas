<script setup lang="ts">
import type { Scene } from '../domain/scene';
import type { AssetId } from '../domain/types';
import { LOCATIONS } from '../ui/locations';
import LocationCard from './LocationCard.vue';
defineProps<{ scene: Scene; selected?: AssetId; compact?: boolean }>();
defineEmits<{ select: [id: AssetId] }>();
</script>

<template>
  <div class="village" :class="{ compact }" aria-label="Locaties in Gridmas">
    <div v-for="category in ['dorp', 'flex'] as const" :key="category" class="district">
      <p class="district-label">{{ category === 'dorp' ? 'Het kerstdorp' : 'Stroom voor de piekuren' }}</p>
      <div class="locations" :class="category">
        <LocationCard v-for="location in LOCATIONS.filter(l => l.category === category)" :key="location.id" :location="location" :scene="scene" :selected="selected === location.id" @select="$emit('select', location.id)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.village { display: grid; grid-template-columns: 4fr 3fr; gap: 1rem; }
.district-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .13em; color: var(--snow-muted); margin-bottom: .55rem; }
.locations { display: grid; gap: .5rem; }
.dorp { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.flex { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.compact { grid-template-columns: 1fr; }
.compact .dorp, .compact .flex { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (max-width: 1050px) { .village { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .dorp, .flex { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
