/**
 * Schrijft src/content/finalSummaries.json met alle bereikbare verhaalsleutels.
 * Bestaande samenvattingen blijven behouden; alleen sleutels/feiten worden bijgewerkt.
 * Gebruik: npm run content:summaries
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeTraits, enumerateReachableSummaries } from '../src/domain/finalSummary';

const FILE = resolve(import.meta.dirname, '../src/content/finalSummaries.json');

interface Entry { key: string; summary: string }
const existing = new Map<string, string>();
if (existsSync(FILE)) {
  const data = JSON.parse(readFileSync(FILE, 'utf-8')) as { entries: Entry[] };
  for (const e of data.entries) if (e.summary) existing.set(e.key, e.summary);
}

const entries = enumerateReachableSummaries().map((r) => ({
  key: r.key,
  facts: describeTraits(r.traits),
  traits: r.traits,
  summary: existing.get(r.key) ?? '',
}));

const output = {
  format: 'merry-gridmas-final-summaries',
  version: 1,
  instructions: [
    'Vul per entry alleen het veld "summary". Wijzig key, facts en traits niet; die komen uit de spelengine.',
    'Taal: Nederlands. Lengte: 2 of 3 zinnen, maximaal 350 tekens.',
    'Toon (SPEC §3.2): kort, speels, kerstsfeer, licht absurd, maar duidelijk causaal. Het is een terugblik op de hele kerstavond in Gridmas.',
    'Gebruik alleen wat in "facts" staat. Verzin geen extra tijdstippen of maatregelen; noem de buurtbatterij en extra laden niet specifiek.',
    'Noem geen getallen voor moraal, strafpunten of de hoogst haalbare score. De stemming volgt uit de laatste zin van "facts".',
    'Ziekenhuis: alleen de feestverlichting ging uit; suggereer nooit dat zorg of apparatuur uitviel.',
    'Terugkerende personages mogen: mevrouw De Vries (De Gouden Ster), meneer Jansen, de ijsmeester, de DJ, de dirigent van het kerstkoor, de burgemeester.',
    'Controleer na het invullen met: npm test',
  ],
  entries,
};

writeFileSync(FILE, `${JSON.stringify(output, null, 2)}\n`);
console.log(`${entries.length} verhaalsleutels geschreven (${existing.size} bestaande samenvattingen behouden) naar ${FILE}`);
