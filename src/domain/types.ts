export type DecorationId = 'homes' | 'seniors' | 'hospital' | 'square';
export type AssetId = DecorationId | 'rink' | 'battery' | 'chargers';

/** Bericht aan het dorp in het communicatieblok (blok 0). */
export type CommsMessage = 'none' | 'precharge' | 'notice';

/** De geplande of uitgevoerde acties binnen één tijdsblok van 2 uur. */
export interface BlockAction {
  blockIndex: number;
  decorationsOff: DecorationId[];
  rinkPaused: boolean;
  batteryDischarge: boolean;
  chargersPaused: boolean;
  extraCharging: boolean;
  /** Alleen blok 0. Ontbreekt bij v1.0-data: dan volgt het uit extraCharging. */
  message?: CommsMessage;
  /** Noodaggregaat; alleen toegestaan nadat de engine het heeft ontgrendeld. */
  emergencyGenerator?: boolean;
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
  | 'history-modified'
  | 'message-block'
  | 'message-conflict'
  | 'generator-block'
  | 'generator-locked';

export interface ValidationIssue {
  code: ValidationCode;
  /** Ontbreekt bij issues die over het hele programma gaan. */
  blockIndex?: number;
  message: string;
}

/** Nieuws dat belasting verandert of iets aankondigt. Bevat nooit moraal. */
export type NewsEventId =
  | 'snow'
  | 'santa-rumour'
  | 'santa'
  | 'exodus'
  | 'seniors-outing'
  | 'disco-move'
  | 'self-dimmers'
  | 'early-birds'
  | 'generator';

/** Verborgen moraalreacties op events; alleen zichtbaar in het bulletin. */
export type MoraleEventId = 'seniors-grumpy' | 'stargazers' | 'nurse-choir' | 'honking' | 'app-storm' | 'generator-used';

export interface LoadEffect {
  blockIndex: number;
  deltaKw: number;
}

export interface EventOccurrence {
  eventId: NewsEventId;
  kind: 'rumour' | 'news';
  /** Verschijnt in het bulletin van dit blok en telt daarna mee in planning en validatie. */
  revealedAfterBlock: number;
  loadEffects: LoadEffect[];
  headline: string;
  text: string;
}

export interface MoraleEvent {
  assetId: AssetId | 'atmosphere' | 'event';
  eventId?: MoraleEventId;
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
  /** Nieuw onthulde events/geruchten in dit blok. */
  news: EventOccurrence[];
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
  /** Wordt waar zodra een event de avond onoplosbaar maakte; blijft daarna waar. */
  generatorUnlocked: boolean;
}
