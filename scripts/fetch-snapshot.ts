// Fetches ranked solo/duo history from the Riot API and writes
// public/data/snapshot.json. Runs in CI (GitHub Actions secret RIOT_API_KEY)
// or locally:  RIOT_API_KEY=... npm run snapshot
//
// The key never reaches the browser: the site only ever reads the JSON file.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { MatchRow, Role, Snapshot } from "../src/types.ts";

await loadDotEnv();

const KEY = required("RIOT_API_KEY");
const [GAME_NAME, TAG_LINE] = (process.env.RIOT_ID ?? "khamayseh#456").split("#");
const PLATFORM = process.env.PLATFORM ?? "euw1";
const REGION = process.env.REGION ?? "europe";
const MATCH_COUNT = Math.min(Number(process.env.MATCH_COUNT ?? 100), 300);
const SEASON_START = process.env.SEASON_START
  ? Math.floor(new Date(process.env.SEASON_START).getTime() / 1000)
  : undefined;
const OUT = new URL("../public/data/snapshot.json", import.meta.url);

// Development keys allow 20 requests/second and 100 per 2 minutes.
// 1.25s between calls stays under both without bookkeeping.
const GAP_MS = 1250;
let lastCall = 0;

async function riot<T>(host: string, path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();

    const res = await fetch(`https://${host}.api.riotgames.com${path}`, {
      headers: { "X-Riot-Token": KEY },
    });
    if (res.ok) return (await res.json()) as T;

    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const retryAfter = Number(res.headers.get("retry-after") ?? 5);
      console.warn(`  ${res.status} on ${path}, retrying in ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Riot API returned ${res.status}. The key is missing, wrong or expired ` +
          `(development keys last 24 hours).`,
      );
    }
    throw new Error(`Riot API ${res.status} on ${path}: ${await res.text()}`);
  }
}

// --- Riot response shapes (only the fields we read) ---
interface Account { puuid: string; gameName: string; tagLine: string }
interface Summoner { profileIconId: number; summonerLevel: number }
interface LeagueEntry {
  queueType: string; tier: string; rank: string;
  leaguePoints: number; wins: number; losses: number;
}
interface Participant {
  puuid: string; championName: string; teamPosition: string; win: boolean;
  kills: number; deaths: number; assists: number;
  totalMinionsKilled: number; neutralMinionsKilled: number;
  goldEarned: number; totalDamageDealtToChampions: number; visionScore: number;
  gameEndedInEarlySurrender: boolean;
  challenges?: {
    killParticipation?: number;
    teamDamagePercentage?: number;
    laneMinionsFirst10Minutes?: number;
  };
}
interface Match {
  metadata: { matchId: string };
  info: { gameCreation: number; gameDuration: number; participants: Participant[] };
}

const ROLES: Role[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
// Match-v5 champion names that differ from Data Dragon ids.
const DDRAGON_ID: Record<string, string> = { FiddleSticks: "Fiddlesticks" };

console.log(`Fetching ${GAME_NAME}#${TAG_LINE} on ${PLATFORM}`);

const account = await riot<Account>(
  REGION,
  `/riot/account/v1/accounts/by-riot-id/${enc(GAME_NAME)}/${enc(TAG_LINE)}`,
);
const summoner = await riot<Summoner>(
  PLATFORM,
  `/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
);
const entries = await riot<LeagueEntry[]>(
  PLATFORM,
  `/lol/league/v4/entries/by-puuid/${account.puuid}`,
);
const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");

const ids: string[] = [];
while (ids.length < MATCH_COUNT) {
  const count = Math.min(100, MATCH_COUNT - ids.length);
  const qs = new URLSearchParams({ queue: "420", start: String(ids.length), count: String(count) });
  if (SEASON_START) qs.set("startTime", String(SEASON_START));
  const page = await riot<string[]>(REGION, `/lol/match/v5/matches/by-puuid/${account.puuid}/ids?${qs}`);
  ids.push(...page);
  if (page.length < count) break;
}
console.log(`Found ${ids.length} ranked games`);

const matches: MatchRow[] = [];
for (const [i, id] of ids.entries()) {
  process.stdout.write(`  ${i + 1}/${ids.length} ${id}\r`);
  const m = await riot<Match>(REGION, `/lol/match/v5/matches/${id}`);
  const me = m.info.participants.find((p) => p.puuid === account.puuid);
  if (!me || me.gameEndedInEarlySurrender) continue; // remake

  const minutes = m.info.gameDuration / 60;
  const cs = me.totalMinionsKilled + me.neutralMinionsKilled;
  matches.push({
    id: m.metadata.matchId,
    date: new Date(m.info.gameCreation).toISOString().slice(0, 10),
    durationMin: round(minutes, 1),
    win: me.win,
    champion: DDRAGON_ID[me.championName] ?? me.championName,
    role: (ROLES as string[]).includes(me.teamPosition) ? (me.teamPosition as Role) : "MIDDLE",
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    cs,
    csPerMin: round(cs / minutes, 2),
    goldPerMin: round(me.goldEarned / minutes, 0),
    damagePerMin: round(me.totalDamageDealtToChampions / minutes, 0),
    visionPerMin: round(me.visionScore / minutes, 2),
    killParticipation: round(me.challenges?.killParticipation ?? 0, 3),
    damageShare: round(me.challenges?.teamDamagePercentage ?? 0, 3),
    csAt10: me.challenges?.laneMinionsFirst10Minutes ?? null,
  });
}
process.stdout.write("\n");

const versions = (await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json()) as string[];

const snapshot: Snapshot = {
  generatedAt: new Date().toISOString(),
  sample: false,
  ddragonVersion: versions[0],
  player: {
    gameName: account.gameName,
    tagLine: account.tagLine,
    platform: PLATFORM,
    profileIconId: summoner.profileIconId,
    summonerLevel: summoner.summonerLevel,
  },
  ranked: solo
    ? { tier: solo.tier, rank: solo.rank, lp: solo.leaguePoints, wins: solo.wins, losses: solo.losses }
    : null,
  matches,
};

await mkdir(new URL(".", OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot, null, 1) + "\n");
console.log(`Wrote ${matches.length} games to public/data/snapshot.json`);

// --- helpers ---
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is not set. Copy .env.example to .env and add your key.`);
    process.exit(1);
  }
  return v;
}
function enc(s: string) { return encodeURIComponent(s); }
function round(n: number, dp: number) { const f = 10 ** dp; return Math.round(n * f) / f; }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
async function loadDotEnv() {
  try {
    const text = await readFile(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch { /* no .env file: rely on the environment */ }
}
