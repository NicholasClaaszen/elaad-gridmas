<script setup lang="ts">
import type { Scene } from '../domain/scene';
import { CHARGERS } from '../domain/scenario';
import { locationActive, locationStatus, type Location } from '../ui/locations';
import LocationIllustration from './LocationIllustration.vue';
const props = defineProps<{ location: Location; scene: Scene; editable?: boolean; restriction?: string; blockLabel?: string; batteryDischarging?: boolean }>();
defineEmits<{ toggle: [] }>();
function actionLabel(location: Location, scene: Scene): string {
  if (location.id === 'battery') return props.batteryDischarging ? 'Laat de batterij stand-by' : 'Gebruik de batterij';
  if (location.id === 'rink') return scene.rinkOpen ? 'Sluit de ijsbaan' : 'Open de ijsbaan';
  if (location.id === 'chargers') {
    if (CHARGERS.extraBlocks.includes(scene.blockIndex)) return scene.chargers === 'extra-charging' ? 'Geen extra laden' : 'Laad alvast / haal laden in';
    return scene.chargers === 'paused' ? 'Hervat laden' : 'Pauzeer laden';
  }
  return scene.zoneLightsOn[location.id] ? 'Zet feestverlichting uit' : 'Zet feestverlichting aan';
}
</script>

<template>
  <section class="location-detail" aria-label="Locatiedetails">
    <div class="detail-heading">
      <LocationIllustration :id="location.id" :active="locationActive(location.id, scene)" :battery-percent="scene.batteryPercent" />
      <div><p class="eyebrow">{{ location.type }}</p><h3>{{ location.name }}</h3><p class="detail-power">{{ location.powerKw }} kW beschikbaar</p></div>
    </div>
    <p>{{ location.story }}</p>
    <p class="activity">{{ location.activity }}</p>
    <ul><li v-for="rule in location.rules" :key="rule">{{ rule }}</li></ul>
    <div v-if="blockLabel" class="detail-state">
      <span class="muted">{{ editable ? 'Planning' : 'Vastgelegd' }} · {{ blockLabel }}</span>
      <strong>{{ locationStatus(location.id, scene) }}</strong>
    </div>
    <p v-if="restriction" class="restriction" role="status">{{ restriction }}</p>
    <button v-if="editable" type="button" class="btn btn-primary detail-action" :disabled="!!restriction" @click="$emit('toggle')">{{ actionLabel(location, scene) }}</button>
  </section>
</template>

<style scoped>
.location-detail { display: grid; gap: .8rem; font-size: .875rem; }
.detail-heading { display: flex; gap: .65rem; align-items: center; }
.detail-heading svg { width: 95px; flex-shrink: 0; }
.detail-heading h3 { font-size: 1.2rem; }
.detail-power { color: var(--lamp); margin-top: .4rem; font-weight: 700; }
.activity { padding: .7rem; background: #ffffff05; border-left: 2px solid var(--lamp); }
ul { margin: 0; padding-left: 1.1rem; color: var(--snow-muted); display: grid; gap: .35rem; }
.detail-state { border-top: 1px solid var(--line); padding-top: .7rem; display: grid; gap: .2rem; }
.restriction { color: #f2c08b; }
.detail-action { font-size: 1rem; padding-inline: .7rem; }
</style>
