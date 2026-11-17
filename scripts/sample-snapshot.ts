// Writes deterministic demo data to public/data/snapshot.json so the app runs
// without a Riot key. The page labels it "Sample data". The CI job replaces it
// with real games on every deploy when the RIOT_API_KEY secret is set.

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
const pickFrom = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

// A jungle main with a support secondary, weighted like a real champion pool.
const POOL: { champion: string; role: Role; weight: number; skill: number }[] = [
  { champion: "Shyvana", role: "JUNGLE", weight: 26, skill: 0.07 },
  { champion: "MonkeyKing", role: "JUNGLE", weight: 15, skill: -0.04 },
  { champion: "Rammus", role: "JUNGLE", weight: 9, skill: 0.12 },
  { champion: "JarvanIV", role: "JUNGLE", weight: 7, skill: 0.0 },
  { champion: "Briar", role: "JUNGLE", weight: 6, skill: -0.05 },
  { champion: "Lillia", role: "JUNGLE", weight: 4, skill: 0.0 },
  { champion: "Kayn", role: "JUNGLE", weight: 3, skill: -0.2 },
  { champion: "Nautilus", role: "UTILITY", weight: 6, skill: -0.03 },
  { champion: "Lux", role: "UTILITY", weight: 3, skill: 0.03 },
  { champion: "Yuumi", role: "UTILITY", weight: 3, skill: 0.03 },
];
const ENEMY_JUNGLERS = ["LeeSin", "Viego", "Graves", "Kindred", "Nidalee", "Vi", "XinZhao", "Hecarim", "Ekko", "Khazix", "Elise", "Diana"];
const ENEMY_SUPPORTS = ["Thresh", "Leona", "Nami", "Lulu", "Rakan", "Karma", "Blitzcrank", "Pyke"];

function pick() {
  const total = POOL.reduce((s, c) => s + c.weight, 0);
  let r = rand() * total;
  for (const c of POOL) if ((r -= c.weight) <= 0) return c;
  return POOL[0];
}

const GAMES = 160;
const end = new Date("2026-11-16T00:00:00Z").getTime();
const matches: MatchRow[] = [];
let day = end;
let lossesToday = 0;

for (let i = 0; i < GAMES; i++) {
  // Sessions of 1-5 games; walk back 0-3 days between them.
  const newDay = rand() < 0.32;
  if (newDay) { day -= Math.ceil(between(0.5, 3)) * 86_400_000; lossesToday = 0; }
  const c = pick();
  const jungle = c.role === "JUNGLE";
  const support = c.role === "UTILITY";
  const opponent = jungle ? pickFrom(ENEMY_JUNGLERS) : pickFrom(ENEMY_SUPPORTS);
  const tough = ["LeeSin", "Viego", "Graves", "Pyke"].includes(opponent) ? -0.08 : 0;

  // Tilt: playing on after losses in a session hurts.
  const tilt = lossesToday >= 2 ? -0.12 : 0;
  const lane = gauss() * 0.9 + c.skill * 4 + tilt * 3 + tough * 3;
  const win = rand() < 0.5 + lane * 0.13 + c.skill + tilt + tough;
  // Newest-first list: a loss here happened *after* the games generated next.
  lossesToday = win ? 0 : lossesToday + 1;

  const minutes = between(19, 40);
  const csPerMin = support ? between(0.6, 1.6) : 5.9 + lane * 0.5 + (win ? 0.3 : -0.1);
  const deaths = Math.max(0, Math.round((win ? 4.6 : 7.4) - lane * 0.8 + gauss() * 1.7));
  const kp = Math.min(0.9, Math.max(0.25, (win ? 0.52 : 0.47) + gauss() * 0.08));
  const teamKills = Math.round((win ? 30 : 21) * (minutes / 30) + gauss() * 3);
  const involvement = Math.round(teamKills * kp);
  const kills = Math.round(involvement * (support ? 0.18 : between(0.35, 0.55)));
  const objectiveEdge = (win ? 1 : 0) + lane * 0.3;

  matches.push({
    id: `EUW1_SAMPLE${String(7000 + GAMES - i)}`,
    date: new Date(day).toISOString().slice(0, 10),
    durationMin: Math.round(minutes * 10) / 10,
    win,
    champion: c.champion,
    role: c.role,
    kills,
    deaths,
    assists: Math.max(0, involvement - kills),
    cs: Math.round(csPerMin * minutes),
    csPerMin: Math.round(csPerMin * 100) / 100,
    goldPerMin: Math.round((win ? 430 : 375) + lane * 25 + gauss() * 20 - (support ? 100 : 0)),
    damagePerMin: Math.round((support ? 380 : 680) + lane * 60 + (win ? 60 : -20) + gauss() * 60),
    visionPerMin: Math.round(((support ? 2.1 : 1.15) + (win ? 0.14 : 0) + gauss() * 0.15) * 100) / 100,
    killParticipation: Math.round(kp * 1000) / 1000,
    damageShare: Math.round(Math.min(0.4, Math.max(0.08, (support ? 0.1 : 0.2) + lane * 0.02 + gauss() * 0.03)) * 1000) / 1000,
    csAt10: null,
    opponent,
    dragons: Math.max(0, Math.round((jungle ? 1.6 : 1.1) + objectiveEdge * 0.9 + gauss() * 0.8)),
    heralds: Math.max(0, Math.min(2, Math.round((jungle ? 0.6 : 0.3) + objectiveEdge * 0.3 + gauss() * 0.4))),
    barons: Math.max(0, Math.min(2, Math.round(objectiveEdge * 0.5 + (minutes > 25 ? 0.2 : -0.5) + gauss() * 0.3))),
    enemyJungleCamps: support ? 0 : Math.max(0, Math.round(6 + lane * 4 + gauss() * 4)),
    controlWards: Math.max(0, Math.round((support ? 4 : 1.6) + (win ? 0.6 : 0) + gauss() * 1.1)),
    firstBlood: rand() < (jungle ? 0.28 : 0.22) + lane * 0.05,
  });
}

const wins = matches.filter((m) => m.win).length;
const snapshot: Snapshot = {
  generatedAt: new Date(end).toISOString(),
  sample: true,
  ddragonVersion: "14.24.1",
  player: { gameName: "khamayseh", tagLine: "456", platform: "euw1", profileIconId: 29, summonerLevel: 264 },
  ranked: { tier: "EMERALD", rank: "III", lp: 85, wins, losses: GAMES - wins },
  matches,
};

const out = new URL("../public/data/snapshot.json", import.meta.url);
await mkdir(new URL(".", out), { recursive: true });
await writeFile(out, JSON.stringify(snapshot, null, 1) + "\n");
console.log(`Wrote ${GAMES} sample games (${wins} wins) to public/data/snapshot.json`);
