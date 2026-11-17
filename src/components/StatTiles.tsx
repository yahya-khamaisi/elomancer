import { NumberTicker } from "@/components/ui/number-ticker";
import type { MatchRow } from "@/types";
import { currentStreak, summary } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Panel, ResultPill } from "./kit";

/** Headline numbers for the filtered games, each compared with the season. */
export function StatTiles({ games, season }: { games: MatchRow[]; season: MatchRow[] }) {
  const s = summary(games);
  const all = summary(season);
  const filtered = games.length !== season.length;
  const deaths = s.kda.d;
  const streak = currentStreak(games);

  const tiles = [
    { label: "Win rate", value: s.winRate * 100, decimals: 0, suffix: "%", note: `${s.wins}W ${s.losses}L`,
      delta: filtered ? (s.winRate - all.winRate) * 100 : null, unit: " pts", higherIsBetter: true },
    { label: "KDA", value: s.kda.ratio, decimals: 2, suffix: "",
      note: `${s.kda.k.toFixed(1)} / ${s.kda.d.toFixed(1)} / ${s.kda.a.toFixed(1)}`,
      delta: filtered ? s.kda.ratio - all.kda.ratio : null, unit: "", higherIsBetter: true },
    { label: "Deaths / game", value: deaths, decimals: 1, suffix: "", note: `${Math.round(s.killParticipation * 100)}% kill participation`,
      delta: filtered ? deaths - all.kda.d : null, unit: "", higherIsBetter: false },
    { label: "CS / min", value: s.csPerMin, decimals: 1, suffix: "", note: `${s.visionPerMin.toFixed(2)} vision / min`,
      delta: filtered ? s.csPerMin - all.csPerMin : null, unit: "", higherIsBetter: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {tiles.map((t, i) => (
        <Panel key={t.label} delay={0.1 + i * 0.05}>
          <div className="text-[13px] text-muted-foreground">{t.label}</div>
          <div className="mt-1 font-display text-3xl font-bold tracking-tight tabular">
            <NumberTicker value={Math.round(t.value * 10 ** t.decimals) / 10 ** t.decimals} decimalPlaces={t.decimals} />
            {t.suffix}
          </div>
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1 text-xs text-muted-foreground tabular">
            <span>{t.note}</span>
            {t.delta !== null && Math.abs(t.delta) >= 0.05 && <Delta value={t.delta} unit={t.unit} good={t.higherIsBetter ? t.delta > 0 : t.delta < 0} decimals={t.decimals} />}
          </div>
        </Panel>
      ))}
      <Panel delay={0.3} className="col-span-2 lg:col-span-1">
        <div className="text-[13px] text-muted-foreground">Form</div>
        <div className="mt-1 font-display text-3xl font-bold tracking-tight">
          {streak.length}
          <span className={cn("ml-0.5", streak.win ? "text-win-ink" : "text-loss-ink")}>{streak.win ? "W" : "L"}</span>
          <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">streak</span>
        </div>
        <div className="mt-auto flex flex-wrap gap-1 pt-2" aria-label="Last 10 games, newest first">
          {games.slice(0, 10).map((m) => <ResultPill key={m.id} win={m.win} className="h-5 min-w-5 text-[10px]" />)}
        </div>
      </Panel>
    </div>
  );
}

function Delta({ value, unit, good, decimals }: { value: number; unit: string; good: boolean; decimals: number }) {
  const shown = Math.abs(value).toFixed(decimals === 0 ? 0 : decimals === 2 ? 2 : 1);
  return (
    <span className={cn("font-medium", good ? "text-win-ink" : "text-loss-ink")}>
      {value > 0 ? "▲" : "▼"} {shown}{unit} <span className="font-normal text-muted-foreground">vs season</span>
    </span>
  );
}
