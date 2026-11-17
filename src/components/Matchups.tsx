import type { MatchRow, Role } from "@/types";
import { matchups, type Matchup } from "@/lib/insights";
import { championName, pct } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { ChampIcon, Panel } from "./kit";

/** Best and worst enemy champions in your position (jungler vs jungler). */
export function Matchups({ games, version, role }: { games: MatchRow[]; version: string; role: Role | "ALL" }) {
  const all = matchups(games, 3);
  const best = all.filter((m) => m.winRate >= 0.5).slice(0, 4);
  const worst = [...all].reverse().filter((m) => m.winRate < 0.5).slice(0, 4);
  const who = role === "UTILITY" ? "enemy support" : role === "JUNGLE" ? "enemy jungler" : "your direct opponent";

  return (
    <Panel title="Matchups" description={`Win rate vs ${who}, 3+ games`} delay={0.2}>
      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">No opponent has shown up 3+ times in these games yet.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <List title="You farm" items={best} version={version} good />
          <List title="Watch out" items={worst} version={version} />
        </div>
      )}
    </Panel>
  );
}

function List({ title, items, version, good }: { title: string; items: Matchup[]; version: string; good?: boolean }) {
  return (
    <div>
      <p className={cn("mb-2 font-display text-xs font-semibold tracking-widest uppercase", good ? "text-win-ink" : "text-loss-ink")}>{title}</p>
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">None yet.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((m) => (
            <li key={m.opponent} className="flex items-center gap-2.5 text-sm">
              <ChampIcon version={version} id={m.opponent} size={30} ring={good ? "win" : "loss"} />
              <span className="min-w-0 flex-1 truncate">{championName(m.opponent)}</span>
              <span className="tabular text-muted-foreground">
                <b className="font-display text-foreground">{pct(m.winRate)}</b> <span className="text-xs">· {m.games}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
