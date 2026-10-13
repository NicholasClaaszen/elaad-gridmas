import { inject, type InjectionKey } from 'vue';
import type { GameStore } from './gameStore';

export const GAME_STORE_KEY: InjectionKey<GameStore> = Symbol('gameStore');

export function useGameStore(): GameStore {
  const store = inject(GAME_STORE_KEY);
  if (!store) throw new Error('Game store ontbreekt; is hij in main.ts met provide() geregistreerd?');
  return store;
}
