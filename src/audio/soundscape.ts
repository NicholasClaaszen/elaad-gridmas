import type { ExecutedBlock } from '../domain/types';

export type CueKind =
  | 'jingle'
  | 'lights-off'
  | 'rink-closed'
  | 'chargers-paused'
  | 'battery'
  | 'extra-charging'
  | 'sparkle'
  | 'groan'
  | 'finale';

export interface SoundCue {
  kind: CueKind;
  /** Starttijd na het begin van het nieuwsbulletin. */
  atMs: number;
  /** 0 t/m 1: bepaalt volume en lengte. */
  intensity: number;
}

const GAP_MS = 550;
/** Zwaarste straf in het spel (dorpsplein 20:00-22:00); schaalt de intensiteit. */
const HEAVIEST_PENALTY = 18;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Mixt de geluiden voor een nieuwsbulletin uit wat het team koos en hoe het dorp reageerde:
 * eerst de kerstsfeer, dan per keuze en per strafbericht een eigen geluid, tot slot een eindoordeel.
 * Puur en deterministisch: dezelfde ronde klinkt altijd hetzelfde.
 */
export function buildNewsSoundscape(executed: ExecutedBlock): SoundCue[] {
  const cues: SoundCue[] = [];
  let at = 0;
  const add = (kind: CueKind, intensity: number) => {
    cues.push({ kind, atMs: at, intensity: clamp01(intensity) });
    at += GAP_MS;
  };

  const [atmosphere, ...penalties] = executed.events;
  add('jingle', 0.5 + (atmosphere?.delta ?? 0) / 16);

  // Keuzes zonder moraalstraf krijgen toch een eigen geluid.
  if (executed.action.batteryDischarge) add('battery', 0.6);
  if (executed.action.extraCharging) add('extra-charging', 0.6);

  for (const event of penalties) {
    const intensity = Math.abs(event.delta) / HEAVIEST_PENALTY;
    if (event.assetId === 'rink') add('rink-closed', intensity);
    else if (event.assetId === 'chargers') add('chargers-paused', intensity);
    else add('lights-off', intensity);
  }

  if (executed.delta >= 3) add('sparkle', executed.delta / 8);
  else if (executed.delta <= -5) add('groan', -executed.delta / 20);

  return cues;
}

/** Slotakkoord op het eindscherm: altijd feestelijk, iets uitbundiger bij een hogere moraal. */
export function buildFinaleSoundscape(finalMorale: number): SoundCue[] {
  return [{ kind: 'finale', atMs: 0, intensity: clamp01(finalMorale / 100) }];
}
