export type DecorationId = 'homes' | 'seniors' | 'hospital' | 'square';
export type AssetId = DecorationId | 'rink' | 'battery' | 'chargers';

/** De geplande of uitgevoerde acties binnen één tijdsblok van 2 uur. */
export interface BlockAction {
  blockIndex: number;
  decorationsOff: DecorationId[];
  rinkPaused: boolean;
  batteryDischarge: boolean;
  chargersPaused: boolean;
  extraCharging: boolean;
}

/** Een volledig programma: precies 6 blokken, index 0 t/m 5. */
export type Schedule = BlockAction[];

export interface ScenarioBlock {
  index: number;
  label: string;
  baselineLoadKw: number;
  baseMoraleBonus: number;
  phase: string;
}

export type ValidationCode =
  | 'schedule-length'
  | 'block-index'
  | 'overload'
  | 'decoration-block'
  | 'decoration-duplicate'
  | 'rink-block'
  | 'rink-count'
  | 'battery-block'
  | 'battery-count'
  | 'chargers-pause-block'
  | 'chargers-pause-count'
  | 'extra-charging-block'
  | 'chargers-pause-and-extra'
  | 'charging-not-neutral'
  | 'history-modified';

export interface ValidationIssue {
  code: ValidationCode;
  /** Ontbreekt bij issues die over het hele programma gaan. */
  blockIndex?: number;
  message: string;
}

export interface MoraleEvent {
  assetId: AssetId | 'atmosphere';
  blockIndex: number;
  delta: number;
  headline: string;
  text: string;
}

export interface MoraleResult {
  blockIndex: number;
  delta: number;
  events: MoraleEvent[];
}

export interface ExecutedBlock {
  action: BlockAction;
  loadKw: number;
  batteryAfterKwh: number;
  moraleBefore: number;
  moraleAfter: number;
  delta: number;
  events: MoraleEvent[];
}

export type GamePhase = 'WELCOME' | 'PLANNING' | 'ROUND_RUNNING' | 'ROUND_REVIEW' | 'FINISHED';

export interface GameState {
  runId: string;
  teamName: string;
  phase: GamePhase;
  morale: number;
  /** Volledige planning; de eerste `executed.length` blokken zijn vergrendeld. */
  schedule: Schedule;
  /** Gezaghebbende historie; wordt nooit herberekend of overschreven. */
  executed: ExecutedBlock[];
  /** Demo-runs van de organisator tellen niet mee voor het scorebord. */
  isDemo: boolean;
}
