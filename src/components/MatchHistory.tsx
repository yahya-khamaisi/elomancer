import { useState } from "react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchRow } from "@/types";
import { championName, ROLE_LABEL } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { ChampIcon, Panel } from "./kit";

const PAGE = 10;

/** 31.5 -> "31:30" */
function clock(minutes: number) {
  const s = Math.round(minutes * 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MatchHistory({ games, version }: { games: MatchRow[]; version: string }) {
  const [shown, setShown] = useState(PAGE);
  const list = games.slice(0, shown);

  return (
    <Panel title="Match history" description="Newest first" delay={0.1}>
      <ul className="grid gap-1.5">
        {list.map((m) => {
          const kda = (m.kills + m.assists) / Math.max(1, m.deaths);
          return (
            <li
              key={m.id}
              className={cn(
                "relative grid grid-cols-[auto_1fr_auto] items-center gap-3 overflow-hidden rounded-xl border bg-background/40 py-2 pr-3 pl-4",
                "before:absolute before:inset-y-0 before:left-0 before:w-1",
                m.win ? "before:bg-win" : "before:bg-loss",
              )}
            >
              <div className="flex items-center gap-1.5">
                <ChampIcon version={version} id={m.champion} size={38} />
                {m.opponent && (
                  <>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">vs</span>
                    <ChampIcon version={version} id={m.opponent} size={26} className="opacity-80" />
                  </>
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm">
                  <b className={cn("font-display", m.win ? "text-win-ink" : "text-loss-ink")}>{m.win ? "Victory" : "Defeat"}</b>
                  <span className="text-muted-foreground"> · {championName(m.champion)} · {ROLE_LABEL[m.role]}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground tabular">
                  {m.date} · {clock(m.durationMin)}
                  {m.firstBlood && <span className="ml-1.5 rounded bg-primary/10 px-1 text-primary">First blood</span>}
                  {(m.dragons ?? 0) > 0 && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5" title="Dragon takedowns">
                      <Flame className="size-3" aria-hidden />{m.dragons}
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right tabular">
                <p className="font-display text-[15px] font-semibold">
                  {m.kills}<span className="text-muted-foreground">/</span>
                  <span className="text-loss-ink">{m.deaths}</span><span className="text-muted-foreground">/</span>{m.assists}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kda.toFixed(1)} KDA<span className="hidden sm:inline"> · {m.csPerMin.toFixed(1)} CS/m</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {shown < games.length && (
        <Button variant="outline" size="sm" className="mt-3 self-center" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, games.length - shown)} more
        </Button>
      )}
    </Panel>
  );
}
