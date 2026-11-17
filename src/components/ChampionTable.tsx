import type { MatchRow } from "@/types";
import { byChampion, championName, pct } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { ChampIcon, Meter, Panel } from "./kit";

/** Champion pool. Clicking a row filters the whole page to that champion. */
export function ChampionTable({
  matches, version, selected, onSelect,
}: {
  matches: MatchRow[];
  version: string;
  selected: string | null;
  onSelect: (champion: string | null) => void;
}) {
  const rows = byChampion(matches).slice(0, 10);
  return (
    <Panel title="Champion pool" description="Click a champion to focus the whole page on it" delay={0.1}>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 pb-2 font-medium">Champion</th>
              <th className="px-2 pb-2 text-right font-medium">Games</th>
              <th className="px-2 pb-2 text-right font-medium">Win rate</th>
              <th className="px-2 pb-2 text-right font-medium">KDA</th>
              <th className="hidden px-2 pb-2 text-right font-medium sm:table-cell">CS/min</th>
              <th className="hidden px-2 pb-2 text-right font-medium sm:table-cell">Dmg/min</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = selected === r.champion;
              return (
                <tr
                  key={r.champion}
                  onClick={() => onSelect(active ? null : r.champion)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(active ? null : r.champion))}
                  tabIndex={0}
                  aria-pressed={active}
                  className={cn(
                    "cursor-pointer border-t transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                    active && "bg-primary/10 hover:bg-primary/15",
                  )}
                >
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2.5">
                      <ChampIcon version={version} id={r.champion} size={30} />
                      <span className="truncate font-medium">{championName(r.champion)}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{r.games}</td>
                  <td className="px-2 py-2">
                    <span className="flex items-center justify-end gap-2">
                      <b className="font-display">{pct(r.winRate)}</b>
                      <Meter value={r.winRate} className="hidden h-1.5 w-14 sm:block" />
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{r.kda.toFixed(2)}</td>
                  <td className="hidden px-2 py-2 text-right sm:table-cell">{r.csPerMin.toFixed(1)}</td>
                  <td className="hidden px-2 py-2 text-right sm:table-cell">{Math.round(r.damagePerMin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
