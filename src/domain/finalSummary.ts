import { calculateLoad } from './calculateLoad';
import { applyMoraleDelta, calculateRoundMorale } from './calculateMorale';
import { BATTERY, BLOCKS, CAPACITY_KW, CHARGERS, DECORATION_IDS, INITIAL_MORALE, RINK, createEmptyAction } from './scenario';
import type { BlockAction, DecorationId } from './types';

/**
 * Eindsamenvattingen worden vooraf geschreven (bijv. met AI) en per "verhaalsleutel" opgeslagen.
 * Een volledig programma heeft te veel varianten; de sleutel bevat alleen wat het verhaal bepaalt.
 */
export type MoraleBand = '85-100' | '78-84' | '70-77' | '0-69';

export interface SummaryTraits {
  /** Tijdsblok waarin de ijsbaan dicht was, of null. */
  rinkClosedAt: string | null;
  squareDarkDuringChoir: boolean;
  seniorsDark: boolean;
  homesDark: boolean;
  hospitalDark: boolean;
  chargerPauses: number;
  moraleBand: MoraleBand;
}

const CHOIR_BLOCK = 3;

const BAND_DESCRIPTIONS: Record<MoraleBand, string> = {
  '85-100': 'uitstekend, bijna iedereen had een prachtige avond',
  '78-84': 'goed, met hier en daar wat gemopper',
  '70-77': 'matig, het dorp heeft het duidelijk gemerkt',
  '0-69': 'zwaar, veel bewoners zijn boos, al bleef het net heel',
};

export function moraleBand(morale: number): MoraleBand {
  if (morale >= 85) return '85-100';
  if (morale >= 78) return '78-84';
  if (morale >= 70) return '70-77';
  return '0-69';
}

export function summaryTraits(actions: readonly BlockAction[], finalMorale: number): SummaryTraits {
  const dark = (id: DecorationId) => actions.some((a) => a.decorationsOff.includes(id));
  const rinkIndex = actions.findIndex((a) => a.rinkPaused);
  return {
    rinkClosedAt: rinkIndex >= 0 ? BLOCKS[rinkIndex]!.label : null,
    squareDarkDuringChoir: actions[CHOIR_BLOCK]?.decorationsOff.includes('square') ?? false,
    seniorsDark: dark('seniors'),
    homesDark: dark('homes'),
    hospitalDark: dark('hospital'),
    chargerPauses: actions.filter((a) => a.chargersPaused).length,
    moraleBand: moraleBand(finalMorale),
  };
}

export function summaryKey(t: SummaryTraits): string {
  const onOff = (dark: boolean) => (dark ? 'uit' : 'aan');
  return [
    `ijsbaan-${t.rinkClosedAt ? t.rinkClosedAt.replace(/:00/g, '').replace('-', '') : 'open'}`,
    `koor-${t.squareDarkDuringChoir ? 'donker' : 'licht'}`,
    `senioren-${onOff(t.seniorsDark)}`,
    `woonwijk-${onOff(t.homesDark)}`,
    `ziekenhuis-${onOff(t.hospitalDark)}`,
    `pauzes-${t.chargerPauses}`,
    `moraal-${t.moraleBand}`,
  ].join('|');
}

/** Feiten in gewone taal voor wie de samenvatting schrijft. */
export function describeTraits(t: SummaryTraits): string {
  const lines = [
    t.rinkClosedAt
      ? `De ijsbaan was dicht van ${t.rinkClosedAt.replace('-', ' tot ')} (${BLOCKS.find((b) => b.label === t.rinkClosedAt)!.phase}).`
      : 'De ijsbaan bleef de hele avond open, ook tijdens de kerstdisco.',
    t.squareDarkDuringChoir
      ? 'Tijdens het kerstkoor (20:00-22:00) ging de grote boom op het dorpsplein uit.'
      : 'Tijdens het kerstkoor (20:00-22:00) bleef de grote boom op het dorpsplein branden.',
    t.seniorsDark
      ? 'De feestverlichting bij seniorencomplex De Gouden Ster ging minstens één blok uit.'
      : 'De Gouden Ster hield de hele avond zijn feestverlichting.',
    t.homesDark ? 'De woonwijk zat minstens één blok zonder tuinverlichting.' : 'De woonwijk bleef de hele avond verlicht.',
    t.hospitalDark
      ? 'De feestverlichting bij het ziekenhuis ging minstens één blok uit (de zorg zelf liep gewoon door).'
      : 'De kerstboom bij het ziekenhuis bleef de hele avond aan.',
    t.chargerPauses === 0
      ? 'Het laadplein laadde de hele avond normaal door.'
      : `Het laadplein pauzeerde ${t.chargerPauses === 1 ? 'één keer' : 'twee keer'}; dat laden werd vooraf of na middernacht ingehaald.`,
    `Eindstemming in het dorp: ${BAND_DESCRIPTIONS[t.moraleBand]}.`,
  ];
  return lines.join(' ');
}

export interface ReachableSummary {
  key: string;
  traits: SummaryTraits;
  /** Aantal geldige programma's met deze sleutel (controlegetal; geen maat voor hoe vaak teams het spelen). */
  programmes: number;
}

/**
 * Somt alle verhaalsleutels op die in een geldig spel kunnen voorkomen, met de echte engine.
 * Blokken 0 en 5 doen alleen extra laden (+20 kW past altijd); dat bepaalt alleen het aantal varianten.
 */
export function enumerateReachableSummaries(): ReachableSummary[] {
  interface Option { action: BlockAction; delta: number }
  const optionsPerBlock: Option[][] = [1, 2, 3, 4].map((blockIndex) => {
    const options: Option[] = [];
    for (let mask = 0; mask < 1 << DECORATION_IDS.length; mask++) {
      for (const rinkPaused of [false, true]) {
        if (rinkPaused && !RINK.allowedBlocks.includes(blockIndex)) continue;
        for (const batteryDischarge of [false, true]) {
          for (const chargersPaused of [false, true]) {
            const action: BlockAction = {
              blockIndex,
              decorationsOff: DECORATION_IDS.filter((_, i) => mask & (1 << i)),
              rinkPaused,
              batteryDischarge,
              chargersPaused,
              extraCharging: false,
            };
            if (calculateLoad(blockIndex, action) > CAPACITY_KW) continue;
            options.push({ action, delta: calculateRoundMorale(blockIndex, action).delta });
          }
        }
      }
    }
    return options;
  });

  const firstBonus = BLOCKS[0]!.baseMoraleBonus;
  const lastBonus = BLOCKS[BLOCKS.length - 1]!.baseMoraleBonus;
  // Aantal manieren om p pauzes te compenseren met extra laden in blok 0 en/of 5.
  const compensations = [1, 2, 1];
  const found = new Map<string, ReachableSummary>();

  const walk = (depth: number, chosen: BlockAction[], morale: number, rink: number, battery: number, pauses: number): void => {
    if (depth === optionsPerBlock.length) {
      const final = applyMoraleDelta(morale, lastBonus);
      // Index = blokindex; blok 0 en 5 dragen niets bij aan het verhaal.
      const traits = summaryTraits([createEmptyAction(0), ...chosen], final);
      const key = summaryKey(traits);
      const entry = found.get(key) ?? { key, traits, programmes: 0 };
      entry.programmes += compensations[pauses]!;
      found.set(key, entry);
      return;
    }
    for (const option of optionsPerBlock[depth]!) {
      const a = option.action;
      if (a.rinkPaused && rink >= RINK.maxUses) continue;
      if (a.batteryDischarge && battery >= BATTERY.maxUses) continue;
      if (a.chargersPaused && pauses >= CHARGERS.maxPauses) continue;
      walk(
        depth + 1,
        [...chosen, a],
        applyMoraleDelta(morale, option.delta),
        rink + Number(a.rinkPaused),
        battery + Number(a.batteryDischarge),
        pauses + Number(a.chargersPaused),
      );
    }
  };

  walk(0, [], applyMoraleDelta(INITIAL_MORALE, firstBonus), 0, 0, 0);
  return [...found.values()].sort((a, b) => a.key.localeCompare(b.key));
}
