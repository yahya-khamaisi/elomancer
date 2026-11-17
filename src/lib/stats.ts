import type { MatchRow, Role } from "../types.ts";

export const ROLE_LABEL: Record<Role, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

export const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function kda(ms: MatchRow[]) {
  const k = mean(ms.map((m) => m.kills));
  const d = mean(ms.map((m) => m.deaths));
  const a = mean(ms.map((m) => m.assists));
  return { k, d, a, ratio: (k + a) / Math.max(d, 1) };
}

export function summary(ms: MatchRow[]) {
  const wins = ms.filter((m) => m.win).length;
  return {
    games: ms.length,
    wins,
    losses: ms.length - wins,
    winRate: ms.length ? wins / ms.length : 0,
    kda: kda(ms),
    csPerMin: mean(ms.map((m) => m.csPerMin)),
    killParticipation: mean(ms.map((m) => m.killParticipation)),
    visionPerMin: mean(ms.map((m) => m.visionPerMin)),
  };
}

/** Rolling win rate over `window` games, oldest game first. */
export function rollingWinRate(ms: MatchRow[], window = 10) {
  const chrono = [...ms].reverse();
  return chrono.map((m, i) => {
    const slice = chrono.slice(Math.max(0, i - window + 1), i + 1);
    return {
      game: i + 1,
      date: m.date,
      champion: m.champion,
      win: m.win,
      winRate: slice.filter((g) => g.win).length / slice.length,
      sampleSize: slice.length,
    };
  });
}

export interface ChampionRow {
  champion: string;
  games: number;
  winRate: number;
  kda: number;
  csPerMin: number;
  damagePerMin: number;
}

export function byChampion(ms: MatchRow[]): ChampionRow[] {
  const groups = new Map<string, MatchRow[]>();
  for (const m of ms) groups.set(m.champion, [...(groups.get(m.champion) ?? []), m]);
  return [...groups.entries()]
    .map(([champion, g]) => ({
      champion,
      games: g.length,
      winRate: g.filter((m) => m.win).length / g.length,
      kda: kda(g).ratio,
      csPerMin: mean(g.map((m) => m.csPerMin)),
      damagePerMin: mean(g.map((m) => m.damagePerMin)),
    }))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

export function byRole(ms: MatchRow[]) {
  const roles: Role[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
  return roles
    .map((role) => {
      const g = ms.filter((m) => m.role === role);
      return { role, games: g.length, winRate: g.length ? g.filter((m) => m.win).length / g.length : 0 };
    })
    .filter((r) => r.games > 0)
    .sort((a, b) => b.games - a.games);
}

/**
 * "What wins you games": for each metric, how much better your average is in
 * wins than in losses. Positive = you're better in wins. Deaths are inverted so
 * "fewer deaths" also reads as positive.
 */
export interface WinFactor {
  key: string;
  label: string;
  inWins: number;
  inLosses: number;
  /** Relative difference, e.g. 0.18 = 18% better in wins. */
  delta: number;
  format: (n: number) => string;
}

export function winFactors(ms: MatchRow[]): WinFactor[] {
  const w = ms.filter((m) => m.win);
  const l = ms.filter((m) => !m.win);
  if (w.length < 3 || l.length < 3) return [];

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const metrics: {
    key: string; label: string; get: (m: MatchRow) => number | null;
    lowerIsBetter?: boolean; format: (n: number) => string;
  }[] = [
    { key: "deaths", label: "Fewer deaths", get: (m) => m.deaths, lowerIsBetter: true, format: (n) => n.toFixed(1) },
    { key: "gold", label: "Gold / min", get: (m) => m.goldPerMin, format: (n) => n.toFixed(0) },
    { key: "damage", label: "Damage / min", get: (m) => m.damagePerMin, format: (n) => n.toFixed(0) },
    { key: "kp", label: "Kill participation", get: (m) => m.killParticipation, format: pct },
    { key: "cs", label: "CS / min", get: (m) => m.csPerMin, format: (n) => n.toFixed(1) },
    { key: "cs10", label: "CS at 10 min", get: (m) => (m.role === "JUNGLE" || m.role === "UTILITY" ? null : m.csAt10), format: (n) => n.toFixed(0) },
    { key: "share", label: "Damage share", get: (m) => m.damageShare, format: pct },
    { key: "vision", label: "Vision / min", get: (m) => m.visionPerMin, format: (n) => n.toFixed(2) },
    { key: "wards", label: "Control wards", get: (m) => m.controlWards ?? null, format: (n) => n.toFixed(1) },
    { key: "dragons", label: "Dragon takedowns", get: (m) => m.dragons ?? null, format: (n) => n.toFixed(1) },
    { key: "invade", label: "Enemy jungle camps", get: (m) => (m.role === "JUNGLE" ? (m.enemyJungleCamps ?? null) : null), format: (n) => n.toFixed(1) },
  ];

  return metrics
    .map((x) => {
      const wv = w.map(x.get).filter((v): v is number => v !== null);
      const lv = l.map(x.get).filter((v): v is number => v !== null);
      if (wv.length < 3 || lv.length < 3) return null;
      const inWins = mean(wv);
      const inLosses = mean(lv);
      const raw = inLosses === 0 ? 0 : (inWins - inLosses) / inLosses;
      return {
        key: x.key, label: x.label, inWins, inLosses,
        delta: x.lowerIsBetter ? -raw : raw,
        format: x.format,
      };
    })
    .filter((f): f is WinFactor => f !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Longest current streak, from the newest game. */
export function currentStreak(ms: MatchRow[]) {
  if (!ms.length) return { win: true, length: 0 };
  const first = ms[0].win;
  let n = 0;
  while (n < ms.length && ms[n].win === first) n++;
  return { win: first, length: n };
}

export const championIcon = (version: string, id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

export const profileIcon = (version: string, id: number) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${id}.png`;

/** Data Dragon ids are squashed ("LeeSin", "JarvanIV"); make them readable. */
export function championName(id: string) {
  const special: Record<string, string> = {
    JarvanIV: "Jarvan IV", MonkeyKing: "Wukong", Nunu: "Nunu & Willump",
    KSante: "K'Sante", Khazix: "Kha'Zix", Chogath: "Cho'Gath", Velkoz: "Vel'Koz",
    KogMaw: "Kog'Maw", RekSai: "Rek'Sai", Kaisa: "Kai'Sa", Belveth: "Bel'Veth",
    AurelionSol: "Aurelion Sol", TahmKench: "Tahm Kench", TwistedFate: "Twisted Fate",
    XinZhao: "Xin Zhao", MasterYi: "Master Yi", MissFortune: "Miss Fortune",
    DrMundo: "Dr. Mundo", LeeSin: "Lee Sin", RenataGlasc: "Renata Glasc",
  };
  return special[id] ?? id;
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;
