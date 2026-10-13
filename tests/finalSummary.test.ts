import { describe, expect, it } from 'vitest';
import data from '../src/content/finalSummaries.json';
import { finalSummaryFor } from '../src/content/finalSummaries';
import { describeTraits, enumerateReachableSummaries, moraleBand, summaryKey, summaryTraits } from '../src/domain/finalSummary';
import { referenceSchedule } from './fixtures';

const reachable = enumerateReachableSummaries();

describe('verhaalsleutels voor eindsamenvattingen', () => {
  it('dekt elk geldig programma precies één keer', () => {
    expect(reachable.reduce((n, r) => n + r.programmes, 0)).toBe(2_571_480);
    expect(new Set(reachable.map((r) => r.key)).size).toBe(reachable.length);
  });

  it('geeft de referentierun de verwachte sleutel', () => {
    expect(summaryKey(summaryTraits(referenceSchedule(), 87))).toBe(
      'ijsbaan-1820|koor-licht|senioren-uit|woonwijk-aan|ziekenhuis-aan|pauzes-2|moraal-85-100',
    );
    expect(reachable.map((r) => r.key)).toContain(summaryKey(summaryTraits(referenceSchedule(), 87)));
  });

  it('gebruikt dezelfde moraalgrenzen als het eindscherm', () => {
    expect([87, 85, 84, 78, 77, 70, 69, 0].map(moraleBand)).toEqual([
      '85-100', '85-100', '78-84', '78-84', '70-77', '70-77', '0-69', '0-69',
    ]);
  });
});

describe('src/content/finalSummaries.json', () => {
  it('bevat precies de bereikbare sleutels met actuele feiten (anders: npm run content:summaries)', () => {
    expect(data.entries.map((e) => e.key)).toEqual(reachable.map((r) => r.key));
    for (const [i, entry] of data.entries.entries()) {
      expect(entry.facts).toBe(describeTraits(reachable[i]!.traits));
      expect(entry.traits).toEqual(reachable[i]!.traits);
    }
  });

  it('ingevulde samenvattingen volgen de schrijfregels', () => {
    for (const entry of data.entries) {
      expect(typeof entry.summary).toBe('string');
      if (!entry.summary) continue;
      expect(entry.summary.length, entry.key).toBeLessThanOrEqual(350);
      expect(entry.summary.length, entry.key).toBeGreaterThanOrEqual(40);
      // Geen moraalgetallen of de maximale score in de tekst.
      expect(entry.summary, entry.key).not.toMatch(/\b(87|moraal\s*\d+|\d+\s*punten)\b/i);
    }
  });

  it('valt terug op null zolang een samenvatting leeg is', () => {
    const filled = data.entries.find((e) => e.summary);
    const key = summaryKey(summaryTraits(referenceSchedule(), 87));
    const entry = data.entries.find((e) => e.key === key)!;
    expect(finalSummaryFor(referenceSchedule(), 87)).toBe(entry.summary.trim() || null);
    if (!filled) expect(finalSummaryFor(referenceSchedule(), 87)).toBeNull();
  });
});
