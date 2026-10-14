<script setup lang="ts">
import { computed } from 'vue';
import { EVENT_ICONS } from '../domain/eventNews';
import { BLOCKS, CAPACITY_KW } from '../domain/scenario';
import MoraleMeter from './MoraleMeter.vue';
import type { ExecutedBlock } from '../domain/types';

const props = defineProps<{
  executed: ExecutedBlock;
  isLast: boolean;
}>();

const emit = defineEmits<{ continue: [] }>();

const block = computed(() => BLOCKS[props.executed.action.blockIndex]!);
const positive = computed(() => props.executed.events.reduce((sum, e) => sum + Math.max(0, e.delta), 0));
const negative = computed(() => props.executed.events.reduce((sum, e) => sum + Math.min(0, e.delta), 0));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const kw = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
</script>

<template>
  <section class="review" aria-labelledby="review-title">
    <header class="newspaper-head">
      <p class="eyebrow">24 december · Extra editie</p>
      <p class="muted">Nieuwsbulletin {{ block.label }}, {{ block.phase }}</p>
      <h2 id="review-title">De Gridmas Courant</h2>
    </header>

    <div class="score" role="status">
      <div class="score-arithmetic"><span>Vorige stand <strong>{{ executed.moraleBefore }}</strong></span><span class="delta-up">Kerst in het dorp <strong>+{{ positive }}</strong></span><span class="delta-down">Reacties op jullie keuzes <strong>{{ negative }}</strong></span></div>
      <p class="morale">
        <span class="label">Kerstmoraal</span>
        <span class="value">{{ executed.moraleAfter }}</span>
        <span class="of muted">/ 100</span>
      </p>
      <p class="delta" :class="executed.delta >= 0 ? 'delta-up' : 'delta-down'">
        {{ signed(executed.delta) }} dit blok
        <span class="muted">(was {{ executed.moraleBefore }})</span>
      </p>
      <MoraleMeter :value="executed.moraleAfter" :before="executed.moraleBefore" />
      <p v-if="executed.moraleBefore + executed.delta !== executed.moraleAfter" class="muted">De score blijft tussen 0 en 100.</p>
      <p class="facts muted">
        Netbelasting {{ executed.loadKw }} kW van {{ CAPACITY_KW }} kW, batterij nog {{ executed.batteryAfterKwh }} kWh
      </p>
    </div>

    <section v-if="executed.news.length" class="breaking-news" aria-label="Breaking news">
      <h3>Breaking news</h3>
      <article v-for="n in executed.news" :key="`${n.eventId}-${n.revealedAfterBlock}`" :class="n.kind">
        <span class="icon" aria-hidden="true">{{ EVENT_ICONS[n.eventId] }}</span>
        <div>
          <p v-if="n.kind === 'rumour'" class="eyebrow">Gerucht</p>
          <h4>{{ n.headline }}</h4>
          <p>{{ n.text }}</p>
          <p v-for="effect in n.loadEffects" :key="effect.blockIndex" class="effect">
            {{ BLOCKS[effect.blockIndex]!.label }}: {{ kw(effect.deltaKw) }} kW
          </p>
        </div>
      </article>
      <p v-if="executed.news.some((n) => n.loadEffects.length)" class="muted">Check de planning: de belasting van komende blokken is veranderd.</p>
    </section>

    <ol class="events">
      <li v-for="(event, n) in executed.events" :key="n" :class="{ atmosphere: event.assetId === 'atmosphere', event: event.assetId === 'event' }">
        <span class="event-delta" :class="event.delta >= 0 ? 'delta-up' : 'delta-down'">{{ signed(event.delta) }}</span>
        <div>
          <h3>{{ event.headline }}</h3>
          <p>{{ event.text }}</p>
        </div>
      </li>
    </ol>

    <aside v-if="executed.action.blockIndex === 0" class="first-round">
      <h3>Zo werkt het verder</h3>
      <p>
        Dit blok ligt vast. Terug naar de planning? Dan kun je alles wat nog komt aanpassen.
        De Courant meldt zich na het volgende blok weer.
      </p>
    </aside>

    <button type="button" class="btn btn-primary" @click="emit('continue')">
      {{ isLast ? 'Naar de uitslag' : 'Verder naar volgende ronde' }}
    </button>
  </section>
</template>

<style scoped>
.breaking-news { margin: 1.2rem 0; padding: 1rem; border: 2px solid var(--lamp); border-radius: var(--radius-panel); background: var(--lamp-soft); display: grid; gap: .8rem; }
.breaking-news h3 { font-size: 1rem; text-transform: uppercase; letter-spacing: .08em; color: var(--lamp); }
.breaking-news article { display: grid; grid-template-columns: 2rem 1fr; gap: .6rem; }
.breaking-news .icon { font-size: 1.5rem; line-height: 1; }
.breaking-news h4 { font-size: 1.05rem; margin-bottom: .2rem; }
.breaking-news .effect { font-weight: 700; color: var(--snow); margin-top: .3rem; }
.breaking-news .rumour h4 { font-style: italic; }
.newspaper-head { padding-bottom: 1rem; border-bottom: 3px double var(--line); display: grid; gap: .5rem; }
.newspaper-head h2 { font-size: clamp(2rem, 3.3vw, 3rem); letter-spacing: -.035em; }
.score-arithmetic { display: flex; justify-content: space-between; gap: .75rem; margin-bottom: .7rem; }
.score-arithmetic > span { display: flex; flex-direction: column; font-size: .75rem; }
.score-arithmetic strong { font-family: var(--font-display); font-size: 1.5rem; }
.review { background: var(--night-raised); padding: 1.5rem; border: 1px solid var(--line); border-radius: 14px; width: 100%; }
.score .morale-meter { margin: .8rem 0; }

.review {
  max-width: 760px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;
}

h2 {
  font-size: var(--step-3);
}

.score {
  display: grid;
  gap: 0.25rem;
}

.morale {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  font-family: var(--font-display);
}

.morale .label {
  font-size: var(--step-1);
}

.morale .value {
  font-size: var(--step-4);
  font-weight: 800;
  color: var(--lamp);
  line-height: 1;
}

.delta {
  font-family: var(--font-display);
  font-size: var(--step-2);
  font-weight: 700;
}

.facts {
  font-size: var(--step--1);
}

.events {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.events li {
  display: grid;
  grid-template-columns: 3.5rem 1fr;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--line);
}

.events h3 {
  font-size: var(--step-1);
  margin-bottom: 0.25rem;
}

.events p {
  max-width: 65ch;
}

.event-delta {
  font-family: var(--font-display);
  font-size: var(--step-2);
  font-weight: 800;
}

.first-round {
  border-left: 3px solid var(--lamp);
  padding: 0.5rem 1rem;
  display: grid;
  gap: 0.3rem;
}

.first-round h3 {
  font-size: var(--step-1);
}

.btn-primary {
  justify-self: start;
}
</style>
