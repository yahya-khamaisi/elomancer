// Coaching logic: turns raw match rows into findings a player can act on.
// Every number here is computed from the same snapshot the page shows.

import type { MatchRow } from "../types.ts";
import { championName, mean, pct } from "./stats.ts";

const wr = (ms: MatchRow[]) => (ms.length ? ms.filter((m) => m.win).length / ms.length : 0);

/**
 * Tilt: how you do in the next game of the same day after losing.
 * The list is newest-first, so the game *before* matches[i] is matches[i + 1].
 */
export function tilt(ms: MatchRow[]) {
  const afterWin: MatchRow[] = [];
  const afterLoss: MatchRow[] = [];
  const afterTwoLosses: MatchRow[] = [];
  for (let i = 0; i < ms.length - 1; i++) {
    const prev = ms[i + 1];
    if (prev.date !== ms[i].date) continue; // new session
    (prev.win ? afterWin : afterLoss).push(ms[i]);
    const prev2 = ms[i + 2];
    if (!prev.win && prev2 && prev2.date === ms[i].date && !prev2.win) afterTwoLosses.push(ms[i]);
  }
  return {
    afterWin: { games: afterWin.length, winRate: wr(afterWin) },
    afterLoss: { games: afterLoss.length, winRate: wr(afterLoss) },
    afterTwoLosses: { games: afterTwoLosses.length, winRate: wr(afterTwoLosses) },
    overall: wr(ms),
  };
}

export const LENGTH_BUCKETS = [
  { key: "early", label: "Under 25 min", test: (m: number) => m < 25 },
  { key: "mid", label: "25–32 min", test: (m: number) => m >= 25 && m < 32 },
  { key: "late", label: "32+ min", test: (m: number) => m >= 32 },
] as const;

export function byGameLength(ms: MatchRow[]) {
  return LENGTH_BUCKETS.map((b) => {
    const g = ms.filter((m) => b.test(m.durationMin));
    return { key: b.key, label: b.label, games: g.length, winRate: wr(g) };
  });
}

export interface Matchup { opponent: string; games: number; winRate: number; kda: number }

/** Win rate against each enemy champion in your position (min `minGames`). */
export function matchups(ms: MatchRow[], minGames = 3): Matchup[] {
  const groups = new Map<string, MatchRow[]>();
  for (const m of ms) if (m.opponent) groups.set(m.opponent, [...(groups.get(m.opponent) ?? []), m]);
  return [...groups.entries()]
    .filter(([, g]) => g.length >= minGames)
    .map(([opponent, g]) => ({
      opponent,
      games: g.length,
      winRate: wr(g),
      kda: (mean(g.map((m) => m.kills)) + mean(g.map((m) => m.assists))) / Math.max(1, mean(g.map((m) => m.deaths))),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games);
}

export interface Tip {
  id: string;
  /** Short imperative, e.g. "Cap your deaths at 5". */
  title: string;
  /** The evidence behind it, in one sentence. */
  detail: string;
  /** Percentage-point swing in win rate; used to rank tips. */
  impact: number;
  kind: "deaths" | "pool" | "tilt" | "vision" | "objectives" | "length" | "matchup";
}

/** Down-weights findings from small samples: full weight at 20+ games. */
const confidence = (games: number) => Math.min(1, Math.sqrt(games / 20));

/** Win-rate split on a numeric threshold: games at/under vs over. */
function split(ms: MatchRow[], get: (m: MatchRow) => number | null, t: number) {
  const vals = ms.filter((m) => get(m) !== null);
  const low = vals.filter((m) => (get(m) as number) <= t);
  const high = vals.filter((m) => (get(m) as number) > t);
  return { low, high };
}

/** The 3–4 changes most likely to win you more games, strongest first. */
export function coachingTips(ms: MatchRow[]): Tip[] {
  if (ms.length < 10) return [];
  const tips: Tip[] = [];
  const base = wr(ms);

  // 1. Deaths: find the cap that best separates wins from losses.
  const winsDeaths = Math.round(mean(ms.filter((m) => m.win).map((m) => m.deaths)));
  const cap = Math.max(2, winsDeaths);
  const d = split(ms, (m) => m.deaths, cap);
  if (d.low.length >= 5 && d.high.length >= 5) {
    const swing = wr(d.low) - wr(d.high);
    if (swing > 0.08) {
      tips.push({
        id: "deaths", kind: "deaths", impact: swing * confidence(Math.min(d.low.length, d.high.length)),
        title: `Cap your deaths at ${cap}`,
        detail: `You win ${pct(wr(d.low))} of games with ${cap} or fewer deaths and ${pct(wr(d.high))} when you die more.`,
      });
    }
  }

  // 2. Tilt: next game after two straight losses on the same day.
  const t = tilt(ms);
  if (t.afterTwoLosses.games >= 5 && t.afterTwoLosses.winRate < base - 0.05) {
    tips.push({
      id: "tilt", kind: "tilt", impact: (base - t.afterTwoLosses.winRate) * confidence(t.afterTwoLosses.games),
      title: "Stop queuing after two losses",
      detail: `After two losses in a row you win only ${pct(t.afterTwoLosses.winRate)} of the next game (${t.afterTwoLosses.games} games), vs ${pct(base)} overall.`,
    });
  }

  // 3. Champion pool: lean on the best pick, bench the worst.
  const champs = new Map<string, MatchRow[]>();
  for (const m of ms) champs.set(m.champion, [...(champs.get(m.champion) ?? []), m]);
  const rated = [...champs.entries()].map(([c, g]) => ({ c, g: g.length, w: wr(g) }));
  const best = rated.filter((r) => r.g >= 8).sort((a, b) => b.w - a.w)[0];
  const worst = rated.filter((r) => r.g >= 5 && r.w < 0.45).sort((a, b) => a.w - b.w)[0];
  if (best && best.w > base + 0.05) {
    tips.push({
      id: "pool-best", kind: "pool", impact: (best.w - base) * confidence(best.g),
      title: `Climb on ${championName(best.c)}`,
      detail: `${pct(best.w)} win rate over ${best.g} games, ${Math.round((best.w - base) * 100)} points above your average.`,
    });
  }
  if (worst) {
    tips.push({
      id: "pool-worst", kind: "pool", impact: (base - worst.w) * confidence(worst.g),
      title: `Bench ${championName(worst.c)} in ranked`,
      detail: `${pct(worst.w)} win rate over ${worst.g} games. Practise it in normals first.`,
    });
  }

  // 4. Control wards.
  const cw = split(ms, (m) => m.controlWards ?? null, 1);
  if (cw.low.length >= 8 && cw.high.length >= 8) {
    const swing = wr(cw.high) - wr(cw.low);
    if (swing > 0.06) {
      tips.push({
        id: "wards", kind: "vision", impact: swing * confidence(Math.min(cw.low.length, cw.high.length)),
        title: "Buy two control wards every game",
        detail: `You win ${pct(wr(cw.high))} when you place 2+ control wards and ${pct(wr(cw.low))} when you place 0–1.`,
      });
    }
  }

  // 5. Dragons (mostly a jungle stat).
  const dr = split(ms, (m) => m.dragons ?? null, 1);
  if (dr.low.length >= 8 && dr.high.length >= 8) {
    const swing = wr(dr.high) - wr(dr.low);
    if (swing > 0.1) {
      tips.push({
        id: "dragons", kind: "objectives", impact: swing * 0.8 * confidence(Math.min(dr.low.length, dr.high.length)), // partly a symptom of winning
        title: "Show up for dragons",
        detail: `With 2+ dragon takedowns you win ${pct(wr(dr.high))}; with 0–1 it's ${pct(wr(dr.low))}. Track the spawn timer and reset early.`,
      });
    }
  }

  // 6. Game length.
  const lengths = byGameLength(ms).filter((b) => b.games >= 8);
  const strongest = [...lengths].sort((a, b) => b.winRate - a.winRate)[0];
  const weakest = [...lengths].sort((a, b) => a.winRate - b.winRate)[0];
  if (strongest && weakest && strongest.winRate - weakest.winRate > 0.12) {
    const late = strongest.key === "late";
    tips.push({
      id: "length", kind: "length", impact: (strongest.winRate - weakest.winRate) * 0.6,
      title: late ? "Don't force early fights; you scale" : "Close games out early",
      detail: `You win ${pct(strongest.winRate)} of games ${strongest.label.toLowerCase()} and ${pct(weakest.winRate)} of games ${weakest.label.toLowerCase()}.`,
    });
  }

  // 7. Worst matchup.
  const mu = matchups(ms, 4);
  const hardest = mu[mu.length - 1];
  if (hardest && hardest.winRate <= 0.35) {
    tips.push({
      id: "matchup", kind: "matchup", impact: (base - hardest.winRate) * 0.5 * confidence(hardest.games),
      title: `Ban or track ${championName(hardest.opponent)}`,
      detail: `You've won ${pct(hardest.winRate)} of ${hardest.games} games against ${championName(hardest.opponent)}.`,
    });
  }

  return tips.sort((a, b) => b.impact - a.impact).slice(0, 4);
}
