// Shape of public/data/snapshot.json. Written by scripts/fetch-snapshot.ts
// (real data) or scripts/sample-snapshot.ts (demo data), read by the app.
// Deliberately contains no PUUIDs and no time of day: only what the page shows.

export type Role = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";

export interface MatchRow {
  id: string;
  /** Calendar day the game was played, YYYY-MM-DD. */
  date: string;
  durationMin: number;
  win: boolean;
  /** Data Dragon champion id, e.g. "Ahri" (used for the icon URL). */
  champion: string;
  role: Role;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  csPerMin: number;
  goldPerMin: number;
  damagePerMin: number;
  visionPerMin: number;
  /** 0..1 */
  killParticipation: number;
  /** 0..1, share of the team's champion damage. */
  damageShare: number;
  /** Lane minions by 10:00. Null for jungle/support or when Riot didn't report it. */
  csAt10: number | null;
  /** Enemy champion in the same position (your lane or jungle opponent). */
  opponent: string | null;
  /** Your takedowns on epic monsters; null when Riot didn't report them. */
  dragons: number | null;
  heralds: number | null;
  barons: number | null;
  /** Camps taken from the enemy jungle. */
  enemyJungleCamps: number | null;
  controlWards: number | null;
  /** You got the first kill of the game, or assisted it. */
  firstBlood: boolean;
}

export interface Snapshot {
  generatedAt: string;
  /** True when the data is generated demo data, not a real account. */
  sample: boolean;
  ddragonVersion: string;
  player: {
    gameName: string;
    tagLine: string;
    platform: string;
    profileIconId: number;
    summonerLevel: number;
  };
  ranked: {
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
  } | null;
  /** Ranked solo/duo games, newest first. Remakes are excluded. */
  matches: MatchRow[];
}
