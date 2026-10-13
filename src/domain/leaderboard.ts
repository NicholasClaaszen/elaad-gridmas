export interface LeaderboardEntry {
  runId: string;
  teamName: string;
  finalMorale: number;
  completedAt: string;
  status: 'valid';
}

export interface RankedEntry extends LeaderboardEntry {
  /** Gedeelde plaats bij gelijke score (1, 1, 3, ...). Geen geheime tie-breaker. */
  rank: number;
}

/** Voegt een run toe; een bestaande runId wordt nooit dubbel ingevoegd. */
export function addLeaderboardEntry(entries: readonly LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
  if (entries.some((e) => e.runId === entry.runId)) return [...entries];
  return [...entries, entry];
}

export function rankLeaderboard(entries: readonly LeaderboardEntry[]): RankedEntry[] {
  // Stabiele sortering op score; volgorde binnen gelijke score is alleen weergave, geen rangverschil.
  const sorted = [...entries].sort((a, b) => b.finalMorale - a.finalMorale);
  return sorted.map((entry) => ({
    ...entry,
    rank: 1 + sorted.filter((other) => other.finalMorale > entry.finalMorale).length,
  }));
}

function isEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.runId === 'string' &&
    typeof v.teamName === 'string' &&
    typeof v.finalMorale === 'number' &&
    Number.isInteger(v.finalMorale) &&
    v.finalMorale >= 0 &&
    v.finalMorale <= 100 &&
    typeof v.completedAt === 'string' &&
    v.status === 'valid'
  );
}

/** Leest een geëxporteerd scorebord; gooit een fout bij ongeldige inhoud. */
export function parseLeaderboardJson(json: string): LeaderboardEntry[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Dit bestand bevat geen geldige JSON.');
  }
  const list = Array.isArray(data) ? data : (data as { entries?: unknown })?.entries;
  if (!Array.isArray(list) || !list.every(isEntry)) {
    throw new Error('Dit is geen geldig Merry Gridmas-scorebord.');
  }
  return list.map((e) => ({
    runId: e.runId,
    teamName: e.teamName,
    finalMorale: e.finalMorale,
    completedAt: e.completedAt,
    status: 'valid',
  }));
}

export function mergeLeaderboards(current: readonly LeaderboardEntry[], imported: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return imported.reduce<LeaderboardEntry[]>((acc, entry) => addLeaderboardEntry(acc, entry), [...current]);
}

export function serializeLeaderboard(entries: readonly LeaderboardEntry[]): string {
  return JSON.stringify({ format: 'merry-gridmas-leaderboard', version: 1, entries }, null, 2);
}
