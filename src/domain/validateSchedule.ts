import { batteryRemainingAfterEachBlock, calculateLoad } from './calculateLoad';
import { BATTERY, BLOCKS, BLOCK_COUNT, CAPACITY_KW, CHARGERS, DECORATION_BLOCKS, RINK } from './scenario';
import type { BlockAction, Schedule, ValidationIssue } from './types';

function sameAction(a: BlockAction, b: BlockAction): boolean {
  return (
    a.blockIndex === b.blockIndex &&
    a.rinkPaused === b.rinkPaused &&
    a.batteryDischarge === b.batteryDischarge &&
    a.chargersPaused === b.chargersPaused &&
    a.extraCharging === b.extraCharging &&
    a.decorationsOff.length === b.decorationsOff.length &&
    a.decorationsOff.every((d) => b.decorationsOff.includes(d))
  );
}

/**
 * Controleert een volledig programma (verleden + toekomst) op alle technische regels.
 * Geeft een lege lijst terug als het programma geldig is. Bevat bewust geen moraalinformatie.
 */
export function validateSchedule(schedule: Schedule, executedPrefix: readonly BlockAction[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (schedule.length !== BLOCK_COUNT) {
    return [{ code: 'schedule-length', message: `Een programma heeft precies ${BLOCK_COUNT} tijdsblokken.` }];
  }

  executedPrefix.forEach((done, i) => {
    if (!sameAction(done, schedule[i]!)) {
      issues.push({
        code: 'history-modified',
        blockIndex: i,
        message: `Blok ${BLOCKS[i]!.label} is al uitgevoerd en kan niet meer worden veranderd.`,
      });
    }
  });

  let rinkUses = 0;
  let batteryUses = 0;
  let pauses = 0;
  let extraSessions = 0;

  schedule.forEach((action, i) => {
    const label = BLOCKS[i]!.label;
    if (action.blockIndex !== i) {
      issues.push({ code: 'block-index', blockIndex: i, message: `Blok op positie ${i} heeft index ${action.blockIndex}.` });
    }

    if (action.decorationsOff.length > 0 && !DECORATION_BLOCKS.includes(i)) {
      issues.push({
        code: 'decoration-block',
        blockIndex: i,
        message: `Feestverlichting is alleen schakelbaar van 16:00 tot 00:00, niet in ${label}.`,
      });
    }
    if (new Set(action.decorationsOff).size !== action.decorationsOff.length) {
      issues.push({ code: 'decoration-duplicate', blockIndex: i, message: `Een locatie staat dubbel uit in ${label}.` });
    }

    if (action.rinkPaused) {
      rinkUses++;
      if (!RINK.allowedBlocks.includes(i)) {
        issues.push({
          code: 'rink-block',
          blockIndex: i,
          message: `De ijsbaan kan alleen tussen 16:00 en 22:00 dicht, niet in ${label}.`,
        });
      }
    }

    if (action.batteryDischarge) {
      batteryUses++;
      if (!BATTERY.allowedBlocks.includes(i)) {
        issues.push({
          code: 'battery-block',
          blockIndex: i,
          message: `De buurtbatterij kan alleen tussen 16:00 en 00:00 ontladen, niet in ${label}.`,
        });
      }
    }

    if (action.chargersPaused) {
      pauses++;
      if (!CHARGERS.pauseBlocks.includes(i)) {
        issues.push({
          code: 'chargers-pause-block',
          blockIndex: i,
          message: `Het laadplein kan alleen tussen 16:00 en 00:00 pauzeren, niet in ${label}.`,
        });
      }
    }

    if (action.extraCharging) {
      extraSessions++;
      if (!CHARGERS.extraBlocks.includes(i)) {
        issues.push({
          code: 'extra-charging-block',
          blockIndex: i,
          message: `Extra laden kan alleen om 14:00-16:00 (vooruit) of 00:00-02:00 (inhalen), niet in ${label}.`,
        });
      }
    }
    if (action.extraCharging && action.chargersPaused) {
      issues.push({
        code: 'chargers-pause-and-extra',
        blockIndex: i,
        message: `Het laadplein kan in ${label} niet tegelijk pauzeren en extra laden.`,
      });
    }

    const load = calculateLoad(i, action);
    if (load > CAPACITY_KW) {
      issues.push({
        code: 'overload',
        blockIndex: i,
        message: `Overbelasting in ${label}: ${load} kW is ${load - CAPACITY_KW} kW boven de limiet van ${CAPACITY_KW} kW.`,
      });
    }
  });

  if (rinkUses > RINK.maxUses) {
    issues.push({ code: 'rink-count', message: `De ijsbaan kan maar één keer dicht; nu ${rinkUses} keer gepland.` });
  }

  if (batteryUses > BATTERY.maxUses) {
    const missingKwh = -Math.min(...batteryRemainingAfterEachBlock(schedule));
    issues.push({
      code: 'battery-count',
      message: `De batterij is te vaak ingepland: ${batteryUses} blokken, maximaal ${BATTERY.maxUses}. Er ontbreekt ${missingKwh} kWh. Haal een batterij-inzet weg.`,
    });
  }

  if (pauses > CHARGERS.maxPauses) {
    issues.push({
      code: 'chargers-pause-count',
      message: `Het laadplein mag maximaal ${CHARGERS.maxPauses} keer pauzeren; nu ${pauses} keer gepland.`,
    });
  }

  if (pauses !== extraSessions) {
    const net = (extraSessions - pauses) * CHARGERS.energyPerBlockKwh;
    issues.push({
      code: 'charging-not-neutral',
      message:
        pauses > extraSessions
          ? `Er moet nog ${-net} kWh laden worden ingehaald. Plan per pauze één extra laadsessie om 14:00 of 00:00.`
          : `Er wordt ${net} kWh extra geladen zonder bijbehorende pauze. Elke extra laadsessie hoort bij precies één pauze.`,
    });
  }

  return issues;
}

export function isScheduleValid(schedule: Schedule, executedPrefix: readonly BlockAction[] = []): boolean {
  return validateSchedule(schedule, executedPrefix).length === 0;
}
