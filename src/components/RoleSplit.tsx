import type { MatchRow } from "../types.ts";
import { byChampion, byRole, championName, pct, ROLE_LABEL } from "../lib/stats.ts";

export function RoleSplit({ matches }: { matches: MatchRow[] }) {
  const roles = byRole(matches);
  const max = Math.max(...roles.map((r) => r.games), 1);
  // Best and worst picks with enough games to mean something.
  const champs = byChampion(matches).filter((c) => c.games >= 5);
  const best = [...champs].sort((a, b) => b.winRate - a.winRate)[0];
  const worst = [...champs].sort((a, b) => a.winRate - b.winRate)[0];
  return (
    <div className="card span-5">
      <h2>Roles</h2>
      <p className="sub">Games played per role, with win rate</p>
      <div className="roles">
        {roles.map((r) => (
          <div key={r.role} className="role-row" title={`${ROLE_LABEL[r.role]}: ${r.games} games, ${pct(r.winRate)} win rate`}>
            <span>{ROLE_LABEL[r.role]}</span>
            <span className="meter" style={{ width: `${(r.games / max) * 100}%` }} />
            <span className="num">{r.games} · {pct(r.winRate)}</span>
          </div>
        ))}
      </div>
      {best && worst && best !== worst && (
        <p className="insight">
          Best pick: <b>{championName(best.champion)}</b> at {pct(best.winRate)} over {best.games} games.{" "}
          {worst.winRate >= 0.5 ? (
            <>Every champion you've played 5+ times is at 50% or better; the lowest is{" "}
              <b>{championName(worst.champion)}</b> at {pct(worst.winRate)}.</>
          ) : (
            <>Weakest: <b>{championName(worst.champion)}</b> at {pct(worst.winRate)} over {worst.games} games.</>
          )}
        </p>
      )}
    </div>
  );
}
