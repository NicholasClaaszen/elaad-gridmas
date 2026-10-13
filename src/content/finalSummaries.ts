import { summaryKey, summaryTraits } from '../domain/finalSummary';
import type { BlockAction } from '../domain/types';
import data from './finalSummaries.json';

const SUMMARIES = new Map(data.entries.filter((e) => e.summary.trim()).map((e) => [e.key, e.summary.trim()]));

/** Vooraf geschreven eindsamenvatting voor dit verloop, of null als die (nog) niet is ingevuld. */
export function finalSummaryFor(actions: readonly BlockAction[], finalMorale: number): string | null {
  return SUMMARIES.get(summaryKey(summaryTraits(actions, finalMorale))) ?? null;
}
