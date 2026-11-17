import type { MatchRow } from "@/types";
import { byGameLength, tilt } from "@/lib/insights";
import { pct } from "@/lib/stats";
import { Meter, Panel } from "./kit";

/** Tilt meter: win rate in the next game of the same day, by what came before. */
export function TiltCard({ games }: { games: MatchRow[] }) {
  const t = tilt(games);
  const rows = [
    { label: "After a win", ...t.afterWin },
    { label: "After a loss", ...t.afterLoss },
    { label: "After 2 losses", ...t.afterTwoLosses },
  ];
  const drop = t.afterTwoLosses.games >= 5 ? t.overall - t.afterTwoLosses.winRate : 0;

  return (
    <Panel title="Tilt meter" description="Next game the same day, by what happened before" delay={0.1}>
      <Rows rows={rows} reference={t.overall} />
      <p className="mt-auto border-t pt-3 text-[13px] text-muted-foreground">
        {t.afterTwoLosses.games < 5
          ? "Not enough back-to-back losses in these games to judge tilt."
          : drop > 0.05
            ? <>After two losses you drop <b className="text-foreground">{Math.round(drop * 100)} points</b> below your {pct(t.overall)} average. Take a break.</>
            : <>Losses don't drag down your next game. You reset well.</>}
      </p>
    </Panel>
  );
}

/** Win rate by game length: do you close early or scale? */
export function GameLengthCard({ games }: { games: MatchRow[] }) {
  const buckets = byGameLength(games);
  const overall = games.length ? games.filter((m) => m.win).length / games.length : 0;
  const best = [...buckets].filter((b) => b.games >= 5).sort((a, b) => b.winRate - a.winRate)[0];

  return (
    <Panel title="Game length" description="Win rate by how long the game lasted" delay={0.15}>
      <Rows rows={buckets} reference={overall} />
      <p className="mt-auto border-t pt-3 text-[13px] text-muted-foreground">
        {best
          ? <>You're strongest in games <b className="text-foreground">{best.label.toLowerCase()}</b> ({pct(best.winRate)}).</>
          : "Not enough games to compare lengths."}
      </p>
    </Panel>
  );
}

function Rows({ rows, reference }: { rows: { label: string; games: number; winRate: number }[]; reference: number }) {
  return (
    <div className="mb-4 grid gap-3.5">
      {rows.map((r) => (
        <div key={r.label} title={`${r.label}: ${pct(r.winRate)} over ${r.games} games`}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span>{r.label}</span>
            <span className="tabular text-muted-foreground">
              <b className="font-display text-base text-foreground">{r.games ? pct(r.winRate) : "–"}</b>{" "}
              <span className="text-xs">{r.games} games</span>
            </span>
          </div>
          <Meter value={r.games ? r.winRate : 0} reference={reference} />
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">Tick = your average across these games</p>
    </div>
  );
}
