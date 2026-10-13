<script setup lang="ts">
import type { Scene } from '../domain/scene';
import { locationActive, locationStatus, type Location } from '../ui/locations';
import LocationIllustration from './LocationIllustration.vue';
const props = defineProps<{ location: Location; scene: Scene; selected?: boolean }>();
defineEmits<{ select: [] }>();
const active = () => locationActive(props.location.id, props.scene);
</script>

<template>
  <button type="button" class="location-card" :class="{ selected, quiet: !active() }" :aria-pressed="!!selected" :aria-label="`${location.name}: ${locationStatus(location.id, scene)}. Bekijk locatie`" @click="$emit('select')">
    <span class="power">{{ location.powerKw }} <small>kW</small></span>
    <LocationIllustration :id="location.id" :active="active()" :battery-percent="scene.batteryPercent" />
    <span class="location-name">{{ location.shortName }}</span>
    <span class="location-type">{{ location.type }}</span>
    <span class="location-status"><span class="dot" />{{ locationStatus(location.id, scene) }}</span>
    <span class="inspect">{{ selected ? 'Geselecteerd' : 'Bekijk locatie' }} <span aria-hidden="true">↗</span></span>
  </button>
</template>

<style scoped>
.location-card { width: 100%; position: relative; display: flex; flex-direction: column; align-items: stretch; text-align: left; border: 1px solid #395065; border-radius: 12px; background: #1b2c40; padding: .65rem .8rem; cursor: pointer; transition: border-color .18s, background .18s; min-width: 0; }
.location-card:hover { border-color: var(--lamp); background: #22374b; }
.location-card.selected { border-color: var(--lamp); box-shadow: inset 0 0 0 1px var(--lamp); background: #283849; }
.building { height: 88px; }
.power { align-self: flex-end; font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--lamp); }
.power small { font-size: .7rem; }
.location-name { font-family: var(--font-display); font-weight: 700; font-size: 1rem; }
.location-type, .inspect { font-size: .75rem; color: var(--snow-muted); }
.location-status { font-size: .78rem; margin-top: .5rem; display: flex; gap: .4rem; align-items: center; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pine); flex-shrink: 0; }
.quiet .dot { background: var(--snow-muted); }
.inspect { margin-top: .55rem; padding-top: .4rem; border-top: 1px solid #ffffff12; display: flex; justify-content: space-between; }
</style>
