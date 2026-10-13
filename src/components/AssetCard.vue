<script setup lang="ts">
defineProps<{
  name: string;
  effect: string;
  story: string;
}>();
</script>

<template>
  <article class="asset">
    <h4>{{ name }}</h4>
    <p class="effect">{{ effect }}</p>
    <p class="story muted">{{ story }}</p>
  </article>
</template>

<style scoped>
.asset {
  padding: 0.75rem 0;
  border-top: 1px solid var(--line);
}

h4 {
  font-family: var(--font-display);
  font-size: var(--step-0);
  margin: 0;
}

.effect {
  color: var(--lamp);
  font-size: var(--step--1);
  font-weight: 700;
}

.story {
  font-size: var(--step--1);
  max-width: 55ch;
}
</style>
