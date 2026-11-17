// Writes deterministic demo data to public/data/snapshot.json so the app runs
// without a Riot key. The page labels it "Sample data". Real data replaces it
// the first time `npm run snapshot` (or the CI job) runs.

import { mkdir, writeFile } from "node:fs/promises";
import type { MatchRow, Role, Snapshot } from "../src/types.ts";

// Mulberry32: small seeded PRNG so the sample is identical on every run.
let seed = 456;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a: number, b: number) => a + rand() * (b - a);
const gauss = () => (rand() + rand() + rand() - 1.5) / 0.5; // ~N(0,1)

// A mid-lane main with a jungle secondary, weighted like a real champion pool.
const POOL: { champion: string; role: Role; weight: number; skill: number }[] = [
  { champion: "Ahri", role: "MIDDLE", weight: 22, skill: 0.08 },
  { champion: "Viktor", role: "MIDDLE", weight: 15, skill: 0.04 },
  { champion: "Sylas", role: "MIDDLE", weight: 11, skill: 0.0 },
  { champion: "Orianna", role: "MIDDLE", weight: 8, skill: -0.02 },
  { champion: "Syndra", role: "MIDDLE", weight: 6, skill: -0.06 },
  { champion: "Vi", role: "JUNGLE", weight: 7, skill: 0.03 },
  { champion: "LeeSin", role: "JUNGLE", weight: 5, skill: -0.08 },
  { champion: "Jarvan", role: "JUNGLE", weight: 4, skill: 0.02 },
  { champion: "Lux", role: "UTILITY", weight: 3, skill: 0.0 },
  { champion: "Ezreal", role: "BOTTOM", weight: 2, skill: -0.1 },
];
// Data Dragon ids for champions whose display name differs.
const DDRAGON: Record<string, string> = { Jarvan: "JarvanIV" };

function pick() {
  const total = POOL.reduce((s, c) => s + c.weight, 0);
  let r = rand() * total;
  for (const c of POOL) if ((r -= c.weight) <= 0) return c;
  return POOL[0];
}

const GAMES = 84;
const end = new Date("2026-11-16T00:00:00Z").getTime();
const matches: MatchRow[] = [];
let day = end;

for (let i = 0; i < GAMES; i++) {
  if (rand() < 0.45) day -= Math.ceil(between(0, 3)) * 86_400_000;
  const c = pick();
  // "Form" drifts upward over the season so the trend chart has a story.
  const form = (GAMES - i) / GAMES - 0.5; // -0.5 (old) .. +0.5 (recent)
  const lane = gauss() * 0.9 + c.skill * 4 + form * 0.4; // laning quality
  const win = rand() < 0.5 + lane * 0.13 + c.skill;

  const jungle = c.role === "JUNGLE";
  const support = c.role === "UTILITY";
  const minutes = between(21, 38);
  const csPerMin = support ? between(0.8, 1.6) : (jungle ? 5.6 : 7.1) + lane * 0.55 + (win ? 0.25 : -0.1);
  const deaths = Math.max(0, Math.round((win ? 3.6 : 6.1) - lane * 0.8 + gauss() * 1.6));
  const kp = Math.min(0.92, Math.max(0.25, (win ? 0.6 : 0.49) + gauss() * 0.08 + (jungle ? 0.05 : 0)));
  const teamKills = Math.round((win ? 28 : 19) * (minutes / 30) + gauss() * 3);
  const involvement = Math.round(teamKills * kp);
  const kills = Math.round(involvement * (support ? 0.2 : between(0.38, 0.55)));

  matches.push({
    id: `EUW1_SAMPLE${String(7000 + GAMES - i)}`,
    date: new Date(day).toISOString().slice(0, 10),
    durationMin: Math.round(minutes * 10) / 10,
    win,
    champion: DDRAGON[c.champion] ?? c.champion,
    role: c.role,
    kills,
    deaths,
    assists: Math.max(0, involvement - kills),
    cs: Math.round(csPerMin * minutes),
    csPerMin: Math.round(csPerMin * 100) / 100,
    goldPerMin: Math.round((win ? 440 : 370) + lane * 28 + gauss() * 20 - (support ? 90 : 0)),
    damagePerMin: Math.round((support ? 420 : jungle ? 560 : 760) + lane * 70 + (win ? 70 : -20) + gauss() * 60),
    visionPerMin: Math.round(((support ? 2.1 : jungle ? 1.3 : 0.75) + (win ? 0.1 : 0) + gauss() * 0.12) * 100) / 100,
    killParticipation: Math.round(kp * 1000) / 1000,
    damageShare: Math.round(Math.min(0.42, Math.max(0.1, (support ? 0.12 : 0.27) + lane * 0.025 + gauss() * 0.03)) * 1000) / 1000,
    csAt10: support || jungle ? null : Math.max(40, Math.round(70 + lane * 8 + gauss() * 4)),
  });
}

const wins = matches.filter((m) => m.win).length;
const snapshot: Snapshot = {
  generatedAt: new Date(end).toISOString(),
  sample: true,
  ddragonVersion: "14.24.1",
  player: { gameName: "khamayseh", tagLine: "456", platform: "euw1", profileIconId: 29, summonerLevel: 312 },
  ranked: { tier: "PLATINUM", rank: "II", lp: 47, wins: wins + 31, losses: GAMES - wins + 29 },
  matches,
};

const out = new URL("../public/data/snapshot.json", import.meta.url);
await mkdir(new URL(".", out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot, null, 1) + "\n");
console.log(`Wrote ${GAMES} sample games (${wins} wins) to public/data/snapshot.json`);
