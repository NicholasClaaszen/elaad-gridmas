import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';
import { createApp } from 'vue';
import App from './App.vue';
import { createGameStore } from './state/gameStore';
import { GAME_STORE_KEY } from './state/injection';

const store = createGameStore({ storage: window.localStorage });

createApp(App).provide(GAME_STORE_KEY, store).mount('#app');
