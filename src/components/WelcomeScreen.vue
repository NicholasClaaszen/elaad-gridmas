<script setup lang="ts">
import { computed, ref } from 'vue';
import type { LeaderboardEntry } from '../domain/leaderboard';
import { CAPACITY_KW } from '../domain/scenario';
import { idleScene } from '../domain/scene';
import type { AssetId } from '../domain/types';
import { LOCATIONS } from '../ui/locations';
import VillageView from './VillageView.vue';
import LocationDetail from './LocationDetail.vue';
import Scoreboard from './Scoreboard.vue';

defineProps<{ leaderboard: LeaderboardEntry[]; error?: string | null; propsMode?: boolean }>();
const emit = defineEmits<{ start: [teamName: string] }>();
const teamName = ref('');
const selected = ref<AssetId>();
const location = computed(() => LOCATIONS.find(l => l.id === selected.value));
const scene = idleScene();
</script>

<template>
  <section class="welcome">
    <div class="hero">
      <p class="eyebrow">24 december · Gridmas · Jullie hebben de knoppen</p>
      <h1><span class="merry">Merry<br />Gridmas<span class="star" aria-hidden="true">✦</span></span><span class="tagline">Keep the lights on!</span></h1>
      <p class="mission">Red kerstavond. Voorkom netcongestie.<br />Houd het dorp tevreden.</p>
      <p class="lede">De ovens staan aan, de ijsdisco begint straks en iedereen wil een volle auto.
        Het net kan maar <strong>{{ CAPACITY_KW }} kW</strong> aan. Jullie bepalen wat even kan wachten.</p>
      <form class="start" @submit.prevent="emit('start', teamName)">
        <label for="team-name">Hoe heet jullie team?</label>
        <div class="row"><input id="team-name" v-model="teamName" maxlength="40" autocomplete="off" placeholder="Bijvoorbeeld: De Nette Rendieren" /><button type="submit" class="btn btn-primary" :disabled="!teamName.trim()">Start planning <span aria-hidden="true">→</span></button></div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </form>
      <p class="session muted">5–6 spelers · ongeveer 20 minuten · één dorp om tevreden te houden</p>
    </div>
    <div class="briefing">
      <p class="eyebrow">De avond in drie stappen</p>
      <ol class="steps">
        <li><span>01</span><div><h3>Maak ruimte op het net</h3><p>Zes blokken van twee uur, van 14:00 tot 02:00. Schuif met laden, gebruik de batterij of zet iets tijdelijk uit.</p></div></li>
        <li><span>02</span><div><h3>Lees het dorpsnieuws</h3><p>Speel een blok en hoor wat de bewoners ervan vonden. Je kunt daarna de rest van de avond bijsturen.</p></div></li>
        <li><span>03</span><div><h3>Haal de hoogste kerstmoraal</h3><p>Een geldig plan houdt het net heel. Een slim plan houdt ook Gridmas gezellig.</p></div></li>
      </ol>
      <Scoreboard :entries="leaderboard" :limit="5" />
    </div>
    <div class="meet-village">
      <div v-if="propsMode" class="village-title"><h2>Dit is Gridmas</h2><p class="muted">Pak de locatiekaarten erbij. Iedereen heeft zo zijn plannen voor vanavond.</p></div>
      <template v-else>
      <div class="village-title"><h2>Dit is Gridmas</h2><p class="muted">Klik op een locatie. Iedereen heeft zo zijn plannen voor vanavond.</p></div>
      <VillageView :scene="scene" :selected="selected" @select="selected = selected === $event ? undefined : $event" />
      <div v-if="location" class="welcome-detail"><LocationDetail :location="location" :scene="scene" /><button class="btn btn-quiet" type="button" @click="selected = undefined">Details sluiten</button></div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.welcome { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, .85fr); gap: 2rem 4rem; }
.hero { display: grid; gap: 1rem; align-content: start; padding: 1.5rem 0; }
h1 { display: grid; }
.merry { font-size: clamp(3.5rem, 7vw, 6.5rem); font-weight: 800; letter-spacing: -.045em; line-height: .9; }
.star { color: var(--lamp); display: inline-block; font-size: .65em; vertical-align: top; margin: .15em 0 0 .12em; }
.tagline { color: var(--lamp); font-size: 1.4rem; margin-top: .75rem; }
.mission { font-family: var(--font-display); font-size: 1.25rem; line-height: 1.35; }
.lede { max-width: 53ch; color: var(--snow-muted); }
.lede strong { color: var(--snow); }
.start { display: grid; gap: .4rem; max-width: 40rem; margin-top: .25rem; }
label { font-size: .875rem; font-weight: 700; }
.row { display: flex; gap: .5rem; }
input { min-width: 0; flex: 1; border: 1px solid var(--line); border-radius: 6px; background: var(--night-deep); padding: .7rem; }
.row button { white-space: nowrap; font-size: 1rem; }
.session { font-size: .75rem; }
.error { color: var(--holly); }
.briefing { margin-top: 1.5rem; display: grid; align-content: start; gap: 1.2rem; padding: 1.5rem; border: 1px solid var(--line); border-radius: 16px; background: linear-gradient(150deg, #20354a, #16293a); }
.steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.35rem; }
.steps li { display: flex; gap: .9rem; }
.steps li > span { color: var(--lamp); font-family: var(--font-display); font-size: 1.2rem; }
.steps h3 { font-size: 1.1rem; margin-bottom: .4rem; }
.steps p { font-size: .875rem; color: var(--snow-muted); max-width: 46ch; }
.meet-village { grid-column: 1 / -1; border-top: 1px solid var(--line); padding-top: 1.2rem; }
.village-title { display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; margin-bottom: 1.2rem; }
.village-title h2 { font-size: 1.5rem; }
.village-title p { font-size: .875rem; }
.welcome-detail { margin-top: 1rem; padding: 1.25rem; border: 1px solid var(--line); background: var(--night-raised); border-radius: 12px; max-width: 700px; }
@media (max-width: 850px) { .welcome { grid-template-columns: 1fr; gap: 1rem; } .hero { padding-top: .5rem; } .briefing { margin-top: 0; } .village-title { flex-direction: column; gap: .4rem; } }
@media (max-width: 500px) { .row { flex-direction: column; } }
</style>
