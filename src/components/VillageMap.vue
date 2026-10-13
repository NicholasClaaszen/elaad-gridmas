<script setup lang="ts">
import type { Scene } from '../domain/scene';
import type { AssetId } from '../domain/types';
import { LOCATIONS, locationActive, locationStatus } from '../ui/locations';
import LocationIllustration from './LocationIllustration.vue';
defineProps<{ scene: Scene; selected?: AssetId }>();
defineEmits<{ select: [id: AssetId] }>();
</script>

<template>
  <div class="village-map" aria-label="De miniatuur van Gridmas">
    <svg viewBox="0 0 800 460" preserveAspectRatio="none" class="landscape" aria-hidden="true">
      <path d="M-30 220Q100 270 230 215T500 235T850 210" fill="none" stroke="#223a4c" stroke-width="64" />
      <path d="M180 480Q270 330 415 260T660 -20" fill="none" stroke="#223a4c" stroke-width="50" />
      <path d="M-30 220Q100 270 230 215T500 235T850 210 M180 480Q270 330 415 260T660 -20" fill="none" stroke="#688190" stroke-width="2" stroke-dasharray="5 9" opacity=".6" />
      <ellipse cx="388" cy="249" rx="50" ry="30" fill="#38515a" />
      <g fill="#b8cdd5" opacity=".2"><circle cx="62" cy="83" r="2" /><circle cx="233" cy="42" r="3" /><circle cx="519" cy="62" r="2" /><circle cx="722" cy="340" r="3" /><circle cx="76" cy="386" r="3" /><circle cx="484" cy="408" r="2" /></g>
      <g fill="#31584b"><path d="M35 130L20 168H50Z M758 52L742 95H774Z M549 330L534 370H564Z M86 268L71 304H101Z" /></g>
    </svg>
    <button v-for="location in LOCATIONS" :key="location.id" class="map-location" :class="[location.id, { chosen: selected === location.id }]" type="button" :aria-pressed="selected === location.id" :aria-label="`${location.name}: ${locationStatus(location.id, scene)}. Bekijk locatie`" @click="$emit('select', location.id)">
      <LocationIllustration :id="location.id" :active="locationActive(location.id, scene)" :battery-percent="scene.batteryPercent" />
      <span class="map-name">{{ location.shortName }}</span>
      <span class="map-status" :class="{ inactive: !locationActive(location.id, scene) }">{{ locationStatus(location.id, scene) }}</span>
    </button>
  </div>
</template>

<style scoped>
.village-map { position: relative; width: 100%; aspect-ratio: 1.65; min-height: 330px; border: 1px solid var(--line); border-radius: 16px; background: radial-gradient(ellipse at 48% 53%, #263e46, #152938 75%); overflow: hidden; }
.landscape { position: absolute; inset: 0; width: 100%; height: 100%; }
.map-location { position: absolute; transform: translate(-50%, -50%); width: 24%; min-height: 44px; border: 1px solid transparent; border-radius: 10px; display: grid; justify-items: center; padding: .25rem; background: transparent; cursor: pointer; color: var(--snow); transition: background .2s, border-color .2s; }
.map-location:hover, .map-location.chosen { background: #0b1b2990; border-color: var(--lamp); }
.map-location svg { max-height: 115px; }
.map-name { font-family: var(--font-display); font-size: .8rem; font-weight: 700; }
.map-status { font-size: .65rem; color: #80d4ad; }
.map-status.inactive { color: var(--snow-muted); }
.homes { left: 15%; top: 38%; }
.seniors { left: 40%; top: 20%; }
.hospital { left: 68%; top: 20%; }
.square { left: 48%; top: 53%; }
.rink { left: 20%; top: 79%; }
.chargers { left: 75%; top: 78%; }
.battery { left: 87%; top: 46%; }
@media (min-width: 1100px) { .village-map { max-height: 480px; } }
@media (max-width: 500px) { .map-location { width: 28%; } .map-name { font-size: .7rem; } .map-status { font-size: .6rem; } }
</style>
