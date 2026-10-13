<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

const props = defineProps<{ blockLabel: string; durationMs?: number }>();
const emit = defineEmits<{ done: [] }>();

let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  timer = setTimeout(() => emit('done'), props.durationMs ?? 1800);
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
    <h2>{{ blockLabel }} loopt…</h2>
    <p class="muted">Gridmas voert jullie plan uit. Het nieuws komt zo binnen.</p>
    <button type="button" class="btn" @click="skip">Direct naar het nieuws</button>
  </section>
</template>

<style scoped>
.running {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 5rem 1rem;
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
