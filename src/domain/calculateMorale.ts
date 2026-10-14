import { eventMoraleEvents } from './eventMorale';
import { ACTION_FEEDBACK, ATMOSPHERE_FEEDBACK, type PenaltyAssetId } from './feedbackContent';
import { BLOCKS, MAX_MORALE } from './scenario';
import type { BlockAction, MoraleEvent, MoraleResult } from './types';

/**
 * Verborgen strafpunten per uitgevoerd blok (SPEC §3.1), per blockIndex.
 * Nooit importeren in planningscomponenten.
 */
const PENALTIES: Record<PenaltyAssetId, Partial<Record<number, number>>> = {
  homes: { 1: -3, 2: -8, 3: -9, 4: -3 },
  seniors: { 1: -8, 2: -12, 3: -7, 4: -1 },
  hospital: { 1: -6, 2: -7, 3: -8, 4: -6 },
  square: { 1: -9, 2: -15, 3: -18, 4: -2 },
  rink: { 1: -9, 2: -4, 3: -14 },
  chargers: { 1: -1, 2: -3, 3: -5, 4: -11 },
};

function penaltyEvent(assetId: PenaltyAssetId, blockIndex: number): MoraleEvent {
  const delta = PENALTIES[assetId][blockIndex];
  const feedback = ACTION_FEEDBACK[assetId][blockIndex];
  if (delta === undefined || !feedback) {
    throw new Error(`Geen moraalregel voor ${assetId} in blok ${blockIndex}`);
  }
  return { assetId, blockIndex, delta, ...feedback };
}

/**
 * Moraalreactie op één uitgevoerd blok: altijd een positief sfeerbericht plus één bericht per strafgevende actie.
 * Met `history` (de eerder uitgevoerde acties) komen daar de eventreacties bij; zonder history is dit exact SPEC v1.0.
 */
export function calculateRoundMorale(blockIndex: number, committedAction: BlockAction, history?: readonly BlockAction[]): MoraleResult {
  const block = BLOCKS[blockIndex];
  const atmosphere = ATMOSPHERE_FEEDBACK[blockIndex];
  if (!block || !atmosphere) throw new RangeError(`Onbekend tijdsblok ${blockIndex}`);

  const events: MoraleEvent[] = [{ assetId: 'atmosphere', blockIndex, delta: block.baseMoraleBonus, ...atmosphere }];
  for (const decoration of committedAction.decorationsOff) events.push(penaltyEvent(decoration, blockIndex));
  if (committedAction.rinkPaused) events.push(penaltyEvent('rink', blockIndex));
  if (committedAction.chargersPaused) events.push(penaltyEvent('chargers', blockIndex));
  // Batterij ontladen en extra laden kosten geen moraal.
  if (history) events.push(...eventMoraleEvents(blockIndex, committedAction, history));

  return { blockIndex, delta: events.reduce((sum, e) => sum + e.delta, 0), events };
}

export function applyMoraleDelta(previousMorale: number, delta: number): number {
  return Math.min(MAX_MORALE, Math.max(0, previousMorale + delta));
}
